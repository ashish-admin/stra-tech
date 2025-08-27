#!/usr/bin/env python3
"""
LokDarpan Historical Data Quality Validation
Comprehensive validation of generated historical data
"""

import os
import sys
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Any
import json
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import create_app, db
from sqlalchemy import text, func
from app.models import Post, Alert, Epaper, Summary

class DataQualityValidator:
    """Validates quality of generated historical data"""
    
    def __init__(self):
        self.app = create_app()
        self.validation_results = {}
        
    def validate_temporal_distribution(self) -> Dict[str, Any]:
        """Validate temporal distribution of data"""
        print("\n📊 Validating Temporal Distribution...")
        
        with self.app.app_context():
            # Check date range
            result = db.session.execute(text("""
                SELECT 
                    MIN(created_at) as earliest,
                    MAX(created_at) as latest,
                    COUNT(DISTINCT DATE(created_at)) as unique_days
                FROM post
            """))
            row = result.fetchone()
            
            # Calculate expected days
            if row.earliest and row.latest:
                expected_days = (row.latest - row.earliest).days + 1
                coverage = (row.unique_days / expected_days) * 100 if expected_days > 0 else 0
            else:
                expected_days = 0
                coverage = 0
            
            # Check daily distribution
            daily_stats = db.session.execute(text("""
                SELECT 
                    AVG(daily_count) as avg_posts,
                    MIN(daily_count) as min_posts,
                    MAX(daily_count) as max_posts,
                    STDDEV(daily_count) as stddev_posts
                FROM (
                    SELECT DATE(created_at) as day, COUNT(*) as daily_count
                    FROM post
                    GROUP BY DATE(created_at)
                ) as daily
            """)).fetchone()
            
            # Check weekly patterns
            weekly_pattern = db.session.execute(text("""
                SELECT 
                    EXTRACT(DOW FROM created_at) as day_of_week,
                    COUNT(*) as count
                FROM post
                GROUP BY EXTRACT(DOW FROM created_at)
                ORDER BY day_of_week
            """)).fetchall()
            
            validation = {
                "date_range": {
                    "earliest": str(row.earliest) if row.earliest else None,
                    "latest": str(row.latest) if row.latest else None,
                    "total_days": expected_days,
                    "days_with_data": row.unique_days,
                    "coverage_percentage": round(coverage, 2)
                },
                "daily_distribution": {
                    "average_posts_per_day": round(daily_stats.avg_posts, 2) if daily_stats.avg_posts else 0,
                    "min_posts_per_day": daily_stats.min_posts,
                    "max_posts_per_day": daily_stats.max_posts,
                    "standard_deviation": round(daily_stats.stddev_posts, 2) if daily_stats.stddev_posts else 0
                },
                "weekly_pattern": {str(int(day)): count for day, count in weekly_pattern},
                "validation_status": "✅ PASS" if coverage > 95 else "⚠️ WARNING" if coverage > 80 else "❌ FAIL"
            }
            
            return validation
    
    def validate_geographic_coverage(self) -> Dict[str, Any]:
        """Validate ward coverage"""
        print("\n🗺️ Validating Geographic Coverage...")
        
        with self.app.app_context():
            # Ward distribution
            ward_stats = db.session.execute(text("""
                SELECT 
                    COUNT(DISTINCT city) as unique_wards,
                    COUNT(*) as total_posts
                FROM post
                WHERE city IS NOT NULL
            """)).fetchone()
            
            # Top and bottom wards
            ward_distribution = db.session.execute(text("""
                SELECT city, COUNT(*) as count
                FROM post
                WHERE city IS NOT NULL
                GROUP BY city
                ORDER BY count DESC
            """)).fetchall()
            
            # Calculate distribution metrics
            if ward_distribution:
                counts = [row.count for row in ward_distribution]
                avg_posts = sum(counts) / len(counts)
                max_posts = max(counts)
                min_posts = min(counts)
                
                # Check for balance
                imbalance_ratio = max_posts / min_posts if min_posts > 0 else float('inf')
            else:
                avg_posts = max_posts = min_posts = imbalance_ratio = 0
            
            validation = {
                "coverage": {
                    "total_wards": ward_stats.unique_wards,
                    "total_posts": ward_stats.total_posts,
                    "average_posts_per_ward": round(avg_posts, 2),
                    "max_posts_ward": max_posts,
                    "min_posts_ward": min_posts,
                    "imbalance_ratio": round(imbalance_ratio, 2)
                },
                "top_5_wards": [
                    {"ward": row.city, "posts": row.count} 
                    for row in ward_distribution[:5]
                ],
                "bottom_5_wards": [
                    {"ward": row.city, "posts": row.count} 
                    for row in ward_distribution[-5:]
                ],
                "validation_status": "✅ PASS" if ward_stats.unique_wards >= 100 and imbalance_ratio < 10 else "⚠️ WARNING"
            }
            
            return validation
    
    def validate_political_diversity(self) -> Dict[str, Any]:
        """Validate party and sentiment diversity"""
        print("\n🎭 Validating Political Diversity...")
        
        with self.app.app_context():
            # Party distribution
            party_stats = db.session.execute(text("""
                SELECT party, COUNT(*) as count
                FROM post
                WHERE party IS NOT NULL
                GROUP BY party
                ORDER BY count DESC
            """)).fetchall()
            
            # Emotion distribution
            emotion_stats = db.session.execute(text("""
                SELECT emotion, COUNT(*) as count
                FROM post
                WHERE emotion IS NOT NULL
                GROUP BY emotion
                ORDER BY count DESC
            """)).fetchall()
            
            # Alert types distribution
            alert_stats = db.session.execute(text("""
                SELECT type, severity, COUNT(*) as count
                FROM alert
                GROUP BY type, severity
                ORDER BY count DESC
            """)).fetchall()
            
            validation = {
                "party_distribution": [
                    {"party": row.party, "posts": row.count, 
                     "percentage": round((row.count / sum(r.count for r in party_stats)) * 100, 2)}
                    for row in party_stats
                ],
                "emotion_distribution": [
                    {"emotion": row.emotion, "posts": row.count,
                     "percentage": round((row.count / sum(r.count for r in emotion_stats)) * 100, 2)}
                    for row in emotion_stats
                ],
                "alert_distribution": [
                    {"type": row.type, "severity": row.severity, "count": row.count}
                    for row in alert_stats[:10]
                ],
                "diversity_metrics": {
                    "unique_parties": len(party_stats),
                    "unique_emotions": len(emotion_stats),
                    "party_balance": "✅ Balanced" if len(party_stats) >= 5 else "⚠️ Limited",
                    "emotion_balance": "✅ Balanced" if len(emotion_stats) >= 5 else "⚠️ Limited"
                },
                "validation_status": "✅ PASS" if len(party_stats) >= 5 and len(emotion_stats) >= 5 else "⚠️ WARNING"
            }
            
            return validation
    
    def validate_data_relationships(self) -> Dict[str, Any]:
        """Validate referential integrity and relationships"""
        print("\n🔗 Validating Data Relationships...")
        
        with self.app.app_context():
            # Posts with epaper references
            epaper_links = db.session.execute(text("""
                SELECT 
                    COUNT(*) as total_posts,
                    COUNT(epaper_id) as posts_with_epaper,
                    COUNT(author_id) as posts_with_author
                FROM post
            """)).fetchone()
            
            # Orphaned records check
            orphaned_posts = db.session.execute(text("""
                SELECT COUNT(*) as count
                FROM post p
                LEFT JOIN epaper e ON p.epaper_id = e.id
                WHERE p.epaper_id IS NOT NULL AND e.id IS NULL
            """)).scalar()
            
            # Summary coverage
            summary_stats = db.session.execute(text("""
                SELECT 
                    COUNT(DISTINCT ward) as wards_with_summaries,
                    COUNT(*) as total_summaries,
                    MIN(date) as earliest_summary,
                    MAX(date) as latest_summary
                FROM summary
            """)).fetchone()
            
            validation = {
                "post_relationships": {
                    "total_posts": epaper_links.total_posts,
                    "posts_with_epaper": epaper_links.posts_with_epaper,
                    "posts_with_author": epaper_links.posts_with_author,
                    "epaper_linkage_rate": round((epaper_links.posts_with_epaper / epaper_links.total_posts) * 100, 2) if epaper_links.total_posts > 0 else 0,
                    "author_attribution_rate": round((epaper_links.posts_with_author / epaper_links.total_posts) * 100, 2) if epaper_links.total_posts > 0 else 0
                },
                "integrity_checks": {
                    "orphaned_posts": orphaned_posts,
                    "integrity_status": "✅ PASS" if orphaned_posts == 0 else "❌ FAIL"
                },
                "summary_coverage": {
                    "wards_covered": summary_stats.wards_with_summaries,
                    "total_summaries": summary_stats.total_summaries,
                    "date_range": f"{summary_stats.earliest_summary} to {summary_stats.latest_summary}"
                },
                "validation_status": "✅ PASS" if orphaned_posts == 0 else "❌ FAIL"
            }
            
            return validation
    
    def validate_content_quality(self) -> Dict[str, Any]:
        """Validate content quality and uniqueness"""
        print("\n📝 Validating Content Quality...")
        
        with self.app.app_context():
            # Check for duplicates
            duplicate_titles = db.session.execute(text("""
                SELECT title, COUNT(*) as count
                FROM post
                GROUP BY title
                HAVING COUNT(*) > 1
                ORDER BY count DESC
                LIMIT 5
            """)).fetchall()
            
            # Content length statistics
            content_stats = db.session.execute(text("""
                SELECT 
                    AVG(LENGTH(text)) as avg_length,
                    MIN(LENGTH(text)) as min_length,
                    MAX(LENGTH(text)) as max_length,
                    COUNT(CASE WHEN text IS NULL OR text = '' THEN 1 END) as empty_content
                FROM post
            """)).fetchone()
            
            # Check epaper deduplication
            epaper_duplicates = db.session.execute(text("""
                SELECT sha256, COUNT(*) as count
                FROM epaper
                GROUP BY sha256
                HAVING COUNT(*) > 1
            """)).fetchall()
            
            validation = {
                "content_metrics": {
                    "average_post_length": round(content_stats.avg_length, 2) if content_stats.avg_length else 0,
                    "min_post_length": content_stats.min_length,
                    "max_post_length": content_stats.max_length,
                    "empty_content_count": content_stats.empty_content
                },
                "uniqueness_checks": {
                    "duplicate_titles_found": len(duplicate_titles),
                    "top_duplicates": [
                        {"title": row.title[:50] + "...", "count": row.count}
                        for row in duplicate_titles
                    ],
                    "epaper_duplicates": len(epaper_duplicates)
                },
                "quality_score": {
                    "content_quality": "✅ Good" if content_stats.avg_length > 100 and content_stats.empty_content == 0 else "⚠️ Needs Review",
                    "uniqueness": "✅ Good" if len(duplicate_titles) < 10 else "⚠️ Many Duplicates"
                },
                "validation_status": "✅ PASS" if len(duplicate_titles) < 10 and content_stats.empty_content == 0 else "⚠️ WARNING"
            }
            
            return validation
    
    def validate_api_performance(self) -> Dict[str, Any]:
        """Validate API query performance with historical data"""
        print("\n⚡ Validating API Performance...")
        
        performance_tests = []
        
        with self.app.app_context():
            # Test 1: Trends API query
            start_time = datetime.now()
            result = db.session.execute(text("""
                SELECT 
                    DATE(created_at) as date,
                    emotion,
                    COUNT(*) as count
                FROM post
                WHERE created_at >= NOW() - INTERVAL '30 days'
                GROUP BY DATE(created_at), emotion
                ORDER BY date DESC
            """))
            result.fetchall()
            trends_time = (datetime.now() - start_time).total_seconds()
            
            # Test 2: Ward-specific query
            start_time = datetime.now()
            result = db.session.execute(text("""
                SELECT * FROM post
                WHERE city = 'Jubilee Hills'
                AND created_at >= NOW() - INTERVAL '7 days'
                ORDER BY created_at DESC
                LIMIT 100
            """))
            result.fetchall()
            ward_time = (datetime.now() - start_time).total_seconds()
            
            # Test 3: Competitive analysis query
            start_time = datetime.now()
            result = db.session.execute(text("""
                SELECT 
                    party,
                    COUNT(*) as mentions,
                    AVG(CASE WHEN emotion = 'hopeful' THEN 1 ELSE 0 END) as positive_rate
                FROM post
                WHERE created_at >= NOW() - INTERVAL '30 days'
                AND party IS NOT NULL
                GROUP BY party
            """))
            result.fetchall()
            competitive_time = (datetime.now() - start_time).total_seconds()
            
            validation = {
                "query_performance": {
                    "trends_api": f"{trends_time:.3f} seconds",
                    "ward_query": f"{ward_time:.3f} seconds",
                    "competitive_analysis": f"{competitive_time:.3f} seconds"
                },
                "performance_assessment": {
                    "trends": "✅ Fast" if trends_time < 1 else "⚠️ Slow" if trends_time < 3 else "❌ Very Slow",
                    "ward": "✅ Fast" if ward_time < 0.5 else "⚠️ Slow" if ward_time < 2 else "❌ Very Slow",
                    "competitive": "✅ Fast" if competitive_time < 1 else "⚠️ Slow" if competitive_time < 3 else "❌ Very Slow"
                },
                "validation_status": "✅ PASS" if trends_time < 2 and ward_time < 1 and competitive_time < 2 else "⚠️ WARNING"
            }
            
            return validation
    
    def generate_validation_report(self):
        """Generate comprehensive validation report"""
        print("\n" + "="*60)
        print("🔍 LokDarpan Historical Data Quality Validation Report")
        print("="*60)
        
        # Run all validations
        validations = {
            "temporal_distribution": self.validate_temporal_distribution(),
            "geographic_coverage": self.validate_geographic_coverage(),
            "political_diversity": self.validate_political_diversity(),
            "data_relationships": self.validate_data_relationships(),
            "content_quality": self.validate_content_quality(),
            "api_performance": self.validate_api_performance()
        }
        
        # Calculate overall score
        passed = sum(1 for v in validations.values() if "PASS" in v.get("validation_status", ""))
        warnings = sum(1 for v in validations.values() if "WARNING" in v.get("validation_status", ""))
        failed = sum(1 for v in validations.values() if "FAIL" in v.get("validation_status", ""))
        
        overall_score = (passed * 100 + warnings * 50) / len(validations)
        
        # Print summary
        print("\n📊 VALIDATION SUMMARY")
        print("-" * 40)
        for category, result in validations.items():
            status = result.get("validation_status", "Unknown")
            print(f"{category.replace('_', ' ').title()}: {status}")
        
        print("\n📈 OVERALL METRICS")
        print("-" * 40)
        print(f"Tests Passed: {passed}/{len(validations)}")
        print(f"Warnings: {warnings}")
        print(f"Failures: {failed}")
        print(f"Overall Score: {overall_score:.1f}%")
        
        if overall_score >= 90:
            print("\n✅ EXCELLENT: Historical data meets all quality standards!")
        elif overall_score >= 70:
            print("\n⚠️ GOOD: Historical data is usable with minor issues.")
        else:
            print("\n❌ NEEDS IMPROVEMENT: Historical data has significant issues.")
        
        # Save detailed report
        report_file = Path(__file__).parent / "historical_validation_report.json"
        with open(report_file, 'w') as f:
            json.dump({
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "overall_score": overall_score,
                "summary": {
                    "passed": passed,
                    "warnings": warnings,
                    "failed": failed
                },
                "detailed_results": validations
            }, f, indent=2, default=str)
        
        print(f"\n📄 Detailed report saved to: {report_file}")
        
        return validations


def main():
    """Main execution function"""
    validator = DataQualityValidator()
    validator.generate_validation_report()


if __name__ == "__main__":
    main()