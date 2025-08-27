#!/usr/bin/env python3
"""
Simple Historical Data Quality Validation
"""

import os
import sys
from datetime import datetime, timezone

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import create_app, db
from sqlalchemy import text

def validate_historical_data():
    """Simple validation of historical data"""
    app = create_app()
    
    print("="*60)
    print("LokDarpan Historical Data Quality Validation")
    print("="*60)
    
    with app.app_context():
        validation_results = {}
        
        # 1. Record Counts
        print("\n📊 RECORD COUNTS")
        tables = ['epaper', 'post', 'alert', 'leader', 'leader_mention', 'issue_cluster']
        for table in tables:
            try:
                result = db.session.execute(text(f"SELECT COUNT(*) FROM {table}"))
                count = result.scalar()
                validation_results[f"{table}_count"] = count
                print(f"  {table}: {count:,} records")
            except Exception as e:
                print(f"  {table}: Error - {e}")
        
        # 2. Date Range Analysis
        print("\n📅 DATE RANGE ANALYSIS")
        
        # Posts date range
        try:
            result = db.session.execute(text("""
                SELECT 
                    MIN(created_at) as earliest,
                    MAX(created_at) as latest,
                    COUNT(DISTINCT DATE(created_at)) as unique_days
                FROM post
            """))
            row = result.fetchone()
            
            if row[0] and row[1]:
                earliest = row[0]
                latest = row[1]
                unique_days = row[2]
                expected_days = (latest - earliest).days + 1
                coverage = (unique_days / expected_days) * 100 if expected_days > 0 else 0
                
                print(f"  Posts Date Range: {earliest.date()} to {latest.date()}")
                print(f"  Daily Coverage: {unique_days}/{expected_days} days ({coverage:.1f}%)")
                
                validation_results['date_range'] = f"{earliest.date()} to {latest.date()}"
                validation_results['coverage_percentage'] = coverage
        except Exception as e:
            print(f"  Date range analysis error: {e}")
        
        # 3. Ward Distribution
        print("\n🗺️  WARD DISTRIBUTION")
        try:
            result = db.session.execute(text("""
                SELECT city as ward, COUNT(*) as count 
                FROM post 
                WHERE city IS NOT NULL 
                GROUP BY city 
                ORDER BY count DESC 
                LIMIT 10
            """))
            rows = result.fetchall()
            
            total_ward_posts = sum(row[1] for row in rows)
            unique_wards = len(rows)
            
            print(f"  Top 10 Wards by Post Count:")
            for ward, count in rows:
                percentage = (count / total_ward_posts) * 100 if total_ward_posts > 0 else 0
                print(f"    {ward}: {count:,} posts ({percentage:.1f}%)")
            
            validation_results['unique_wards'] = unique_wards
            validation_results['top_ward'] = rows[0][0] if rows else None
        except Exception as e:
            print(f"  Ward distribution error: {e}")
        
        # 4. Party Distribution
        print("\n🏛️  PARTY DISTRIBUTION")
        try:
            result = db.session.execute(text("""
                SELECT party, COUNT(*) as count 
                FROM post 
                WHERE party IS NOT NULL 
                GROUP BY party 
                ORDER BY count DESC
            """))
            rows = result.fetchall()
            
            total_party_posts = sum(row[1] for row in rows)
            
            print(f"  Party Distribution:")
            for party, count in rows:
                percentage = (count / total_party_posts) * 100 if total_party_posts > 0 else 0
                print(f"    {party}: {count:,} posts ({percentage:.1f}%)")
            
            validation_results['unique_parties'] = len(rows)
        except Exception as e:
            print(f"  Party distribution error: {e}")
        
        # 5. Emotion Distribution  
        print("\n😊 EMOTION DISTRIBUTION")
        try:
            result = db.session.execute(text("""
                SELECT emotion, COUNT(*) as count 
                FROM post 
                WHERE emotion IS NOT NULL 
                GROUP BY emotion 
                ORDER BY count DESC
            """))
            rows = result.fetchall()
            
            total_emotion_posts = sum(row[1] for row in rows)
            
            print(f"  Emotion Distribution:")
            for emotion, count in rows:
                percentage = (count / total_emotion_posts) * 100 if total_emotion_posts > 0 else 0
                print(f"    {emotion}: {count:,} posts ({percentage:.1f}%)")
            
            validation_results['unique_emotions'] = len(rows)
        except Exception as e:
            print(f"  Emotion distribution error: {e}")
        
        # 6. Data Integrity
        print("\n🔍 DATA INTEGRITY CHECKS")
        
        # Check for null values
        integrity_checks = {
            "posts_with_null_text": "SELECT COUNT(*) FROM post WHERE text IS NULL OR text = ''",
            "posts_with_null_created_at": "SELECT COUNT(*) FROM post WHERE created_at IS NULL",
            "epapers_with_null_content": "SELECT COUNT(*) FROM epaper WHERE raw_text IS NULL OR raw_text = ''",
            "duplicate_epaper_sha256": "SELECT COUNT(*) - COUNT(DISTINCT sha256) FROM epaper",
            "posts_without_epaper_link": "SELECT COUNT(*) FROM post WHERE epaper_id IS NULL"
        }
        
        for check_name, query in integrity_checks.items():
            try:
                result = db.session.execute(text(query))
                count = result.scalar()
                validation_results[check_name] = count
                status = "✅ OK" if count == 0 else f"⚠️  {count:,} issues"
                print(f"  {check_name}: {status}")
            except Exception as e:
                print(f"  {check_name}: Error - {e}")
        
        # 7. Performance Metrics
        print("\n⚡ PERFORMANCE METRICS")
        try:
            # Test query performance
            import time
            
            start_time = time.time()
            result = db.session.execute(text("""
                SELECT city, COUNT(*) 
                FROM post 
                WHERE created_at >= '2025-02-01' 
                GROUP BY city 
                ORDER BY COUNT(*) DESC 
                LIMIT 10
            """))
            rows = result.fetchall()
            end_time = time.time()
            
            query_time = (end_time - start_time) * 1000
            validation_results['query_performance_ms'] = query_time
            
            print(f"  Ward aggregation query: {query_time:.1f}ms")
            if query_time < 100:
                print("  ✅ Query performance: Excellent (<100ms)")
            elif query_time < 500:
                print("  ✅ Query performance: Good (<500ms)")
            else:
                print("  ⚠️  Query performance: Needs optimization (>500ms)")
        except Exception as e:
            print(f"  Performance test error: {e}")
        
        # 8. Summary Report
        print("\n📋 VALIDATION SUMMARY")
        print("="*40)
        
        # Overall score calculation
        score_components = []
        
        # Coverage score (0-25 points)
        coverage = validation_results.get('coverage_percentage', 0)
        coverage_score = min(25, coverage * 0.25)
        score_components.append(('Temporal Coverage', coverage_score, 25))
        
        # Data volume score (0-25 points) 
        post_count = validation_results.get('post_count', 0)
        volume_score = min(25, (post_count / 5000) * 25)  # Target: 5000+ posts
        score_components.append(('Data Volume', volume_score, 25))
        
        # Diversity score (0-25 points)
        ward_count = validation_results.get('unique_wards', 0)
        party_count = validation_results.get('unique_parties', 0) 
        diversity_score = min(25, ((ward_count + party_count) / 20) * 25)
        score_components.append(('Data Diversity', diversity_score, 25))
        
        # Integrity score (0-25 points)
        null_issues = validation_results.get('posts_with_null_text', 0)
        integrity_score = max(0, 25 - (null_issues * 0.1))
        score_components.append(('Data Integrity', integrity_score, 25))
        
        total_score = sum(score for _, score, _ in score_components)
        max_score = sum(max_score for _, _, max_score in score_components)
        
        print(f"Score Breakdown:")
        for component, score, max_score in score_components:
            print(f"  {component}: {score:.1f}/{max_score} ({score/max_score*100:.1f}%)")
        
        print(f"\nOVERALL QUALITY SCORE: {total_score:.1f}/{max_score} ({total_score/max_score*100:.1f}%)")
        
        if total_score >= 80:
            print("🎉 EXCELLENT: Historical data quality meets high standards!")
        elif total_score >= 60:
            print("✅ GOOD: Historical data quality is acceptable with minor issues")
        elif total_score >= 40:
            print("⚠️  FAIR: Historical data has some quality concerns") 
        else:
            print("❌ POOR: Historical data requires significant improvements")
        
        validation_results['overall_score'] = total_score
        validation_results['max_score'] = max_score
        validation_results['score_percentage'] = (total_score / max_score) * 100
        
        return validation_results

if __name__ == "__main__":
    results = validate_historical_data()
    print(f"\n✅ Validation complete. Overall score: {results.get('score_percentage', 0):.1f}%")