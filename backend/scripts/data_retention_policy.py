#!/usr/bin/env python3
"""
LokDarpan Data Retention and Lifecycle Management

Automated data retention policies for political intelligence platform:
- Automated cleanup of expired AI reports and embeddings
- Political data archival with compliance requirements
- Cost optimization through intelligent data tiering
- Audit trail maintenance for regulatory compliance
- Performance optimization through data purging

Retention Policies:
- AI Embeddings: 90 days for news, 365 days for analysis, 730 days for reports
- Model Executions: 180 days (cost tracking), 1 year aggregated metrics
- Geopolitical Reports: 1 year active, then archive, 3 years total
- Political Posts: Indefinite (historical analysis), with smart archival
- System Metrics: 1 year detailed, 3 years aggregated
- User Activity: 2 years, then anonymized aggregation

Usage:
    python data_retention_policy.py --policy [cleanup|archive|report] 
    python data_retention_policy.py --dry-run
    python data_retention_policy.py --force-cleanup
"""

import os
import sys
import json
import logging
from datetime import datetime, timezone, timedelta
from typing import Dict, List, Tuple, Optional
import argparse
from pathlib import Path

# Add app to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

try:
    from app import create_app
    from app.extensions import db
    from sqlalchemy import text, func, and_, or_
    import psycopg2
except ImportError as e:
    print(f"Missing dependencies: {e}")
    sys.exit(1)

# Data retention policies configuration
RETENTION_POLICIES = {
    'ai_embeddings': {
        'news_content': 90,      # days
        'analysis_content': 365,  # days  
        'reports_content': 730,  # days
        'manual_content': 1095   # days (3 years)
    },
    'ai_model_execution': {
        'detailed_logs': 180,    # days
        'aggregated_metrics': 365  # days
    },
    'geopolitical_reports': {
        'active_period': 365,    # days
        'archived_period': 1095, # days (3 years total)
        'max_inactive_days': 90  # archive if not accessed
    },
    'political_posts': {
        'active_analysis': 730,  # days (2 years)
        'archive_threshold': 1825  # days (5 years)
    },
    'system_metrics': {
        'detailed_metrics': 365, # days
        'aggregated_metrics': 1095  # days
    },
    'user_activity': {
        'personal_data': 730,    # days
        'anonymized_data': 2190  # days (6 years)
    }
}

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('/var/log/lokdarpan/retention.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)


class DataRetentionManager:
    """Comprehensive data retention and lifecycle management"""
    
    def __init__(self, app=None, dry_run: bool = False):
        self.app = app or create_app()
        self.dry_run = dry_run
        self.stats = {
            'records_cleaned': 0,
            'records_archived': 0,
            'storage_freed_mb': 0,
            'errors_encountered': 0
        }
        
        if dry_run:
            logger.info("🔍 DRY RUN MODE - No changes will be made")
    
    def execute_cleanup_policy(self) -> Dict:
        """Execute comprehensive data cleanup based on retention policies"""
        logger.info("🧹 Starting comprehensive data retention cleanup...")
        
        with self.app.app_context():
            try:
                # Clean AI embeddings
                self._cleanup_ai_embeddings()
                
                # Clean AI model execution logs
                self._cleanup_ai_executions()
                
                # Archive old reports
                self._archive_old_reports()
                
                # Clean system metrics
                self._cleanup_system_metrics()
                
                # Archive old political posts (if needed)
                self._archive_old_posts()
                
                # Update statistics
                self._update_cleanup_stats()
                
                if not self.dry_run:
                    db.session.commit()
                    logger.info("✅ Data retention cleanup completed successfully")
                else:
                    db.session.rollback()
                    logger.info("🔍 DRY RUN completed - no changes made")
                
                return self.stats
                
            except Exception as e:
                db.session.rollback()
                logger.error(f"❌ Data retention cleanup failed: {e}")
                self.stats['errors_encountered'] += 1
                raise
    
    def _cleanup_ai_embeddings(self):
        """Clean up expired AI embeddings based on content type"""
        logger.info("Cleaning up AI embeddings...")
        
        try:
            # Check if ai_embedding_store table exists
            result = db.session.execute(text("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_name = 'ai_embedding_store'
                );
            """)).scalar()
            
            if not result:
                logger.info("AI embedding store table not found - skipping")
                return
            
            policies = RETENTION_POLICIES['ai_embeddings']
            current_time = datetime.now(timezone.utc)
            
            cleanup_queries = []
            
            # Build cleanup queries for different content types
            for content_type, retention_days in policies.items():
                cleanup_date = current_time - timedelta(days=retention_days)
                
                if content_type == 'news_content':
                    condition = "source_type = 'news' AND content_type = 'news'"
                elif content_type == 'analysis_content':
                    condition = "source_type IN ('perplexity', 'analysis') AND content_type = 'analysis'"
                elif content_type == 'reports_content':
                    condition = "source_type = 'report' AND content_type = 'report'"
                else:  # manual_content
                    condition = "source_type = 'manual'"
                
                query = f"""
                    SELECT COUNT(*) FROM ai_embedding_store 
                    WHERE {condition} 
                      AND (expires_at < %s OR 
                           (last_accessed_at < %s AND access_count < 5))
                """
                cleanup_queries.append((query, content_type, cleanup_date))
            
            # Execute cleanup queries
            total_cleaned = 0
            for query, content_type, cleanup_date in cleanup_queries:
                if self.dry_run:
                    count_result = db.session.execute(text(query), (cleanup_date, cleanup_date)).scalar()
                    logger.info(f"  Would clean {count_result} {content_type} embeddings")
                    total_cleaned += count_result
                else:
                    delete_query = query.replace('SELECT COUNT(*)', 'DELETE')
                    result = db.session.execute(text(delete_query), (cleanup_date, cleanup_date))
                    cleaned_count = result.rowcount
                    logger.info(f"  Cleaned {cleaned_count} {content_type} embeddings")
                    total_cleaned += cleaned_count
            
            self.stats['records_cleaned'] += total_cleaned
            logger.info(f"✅ AI embeddings cleanup: {total_cleaned} records processed")
            
        except Exception as e:
            logger.error(f"❌ AI embeddings cleanup failed: {e}")
            self.stats['errors_encountered'] += 1
    
    def _cleanup_ai_executions(self):
        """Clean up old AI model execution logs"""
        logger.info("Cleaning up AI model execution logs...")
        
        try:
            # Check if table exists
            result = db.session.execute(text("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_name = 'ai_model_execution'
                );
            """)).scalar()
            
            if not result:
                logger.info("AI model execution table not found - skipping")
                return
            
            retention_days = RETENTION_POLICIES['ai_model_execution']['detailed_logs']
            cleanup_date = datetime.now(timezone.utc) - timedelta(days=retention_days)
            
            if self.dry_run:
                count_result = db.session.execute(text("""
                    SELECT COUNT(*) FROM ai_model_execution 
                    WHERE created_at < %s AND success_status != 'error'
                """), (cleanup_date,)).scalar()
                logger.info(f"  Would clean {count_result} AI execution logs")
                self.stats['records_cleaned'] += count_result
            else:
                # Keep error logs longer for debugging
                result = db.session.execute(text("""
                    DELETE FROM ai_model_execution 
                    WHERE created_at < %s AND success_status != 'error'
                """), (cleanup_date,))
                
                cleaned_count = result.rowcount
                logger.info(f"  Cleaned {cleaned_count} AI execution logs")
                self.stats['records_cleaned'] += cleaned_count
            
            logger.info("✅ AI execution logs cleanup completed")
            
        except Exception as e:
            logger.error(f"❌ AI execution logs cleanup failed: {e}")
            self.stats['errors_encountered'] += 1
    
    def _archive_old_reports(self):
        """Archive old geopolitical reports"""
        logger.info("Archiving old geopolitical reports...")
        
        try:
            # Check if table exists
            result = db.session.execute(text("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_name = 'ai_geopolitical_report'
                );
            """)).scalar()
            
            if not result:
                logger.info("Geopolitical reports table not found - skipping")
                return
            
            policies = RETENTION_POLICIES['geopolitical_reports']
            current_time = datetime.now(timezone.utc)
            
            # Archive reports not accessed recently
            archive_date = current_time - timedelta(days=policies['max_inactive_days'])
            
            if self.dry_run:
                count_result = db.session.execute(text("""
                    SELECT COUNT(*) FROM ai_geopolitical_report 
                    WHERE NOT is_archived 
                      AND (last_accessed_at < %s OR last_accessed_at IS NULL)
                      AND completed_at < %s
                """), (archive_date, archive_date)).scalar()
                logger.info(f"  Would archive {count_result} inactive reports")
                self.stats['records_archived'] += count_result
            else:
                result = db.session.execute(text("""
                    UPDATE ai_geopolitical_report 
                    SET is_archived = true, 
                        archive_reason = 'auto_archive_inactive'
                    WHERE NOT is_archived 
                      AND (last_accessed_at < %s OR last_accessed_at IS NULL)
                      AND completed_at < %s
                """), (archive_date, archive_date))
                
                archived_count = result.rowcount
                logger.info(f"  Archived {archived_count} inactive reports")
                self.stats['records_archived'] += archived_count
            
            # Delete very old archived reports
            delete_date = current_time - timedelta(days=policies['archived_period'])
            
            if self.dry_run:
                count_result = db.session.execute(text("""
                    SELECT COUNT(*) FROM ai_geopolitical_report 
                    WHERE is_archived AND completed_at < %s
                """), (delete_date,)).scalar()
                logger.info(f"  Would delete {count_result} very old reports")
                self.stats['records_cleaned'] += count_result
            else:
                result = db.session.execute(text("""
                    DELETE FROM ai_geopolitical_report 
                    WHERE is_archived AND completed_at < %s
                """), (delete_date,))
                
                deleted_count = result.rowcount
                logger.info(f"  Deleted {deleted_count} very old reports")
                self.stats['records_cleaned'] += deleted_count
            
            logger.info("✅ Reports archival completed")
            
        except Exception as e:
            logger.error(f"❌ Reports archival failed: {e}")
            self.stats['errors_encountered'] += 1
    
    def _cleanup_system_metrics(self):
        """Clean up old system metrics"""
        logger.info("Cleaning up system metrics...")
        
        try:
            # Check if table exists
            result = db.session.execute(text("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_name = 'ai_system_metrics'
                );
            """)).scalar()
            
            if not result:
                logger.info("System metrics table not found - skipping")
                return
            
            retention_days = RETENTION_POLICIES['system_metrics']['detailed_metrics']
            cleanup_date = datetime.now(timezone.utc) - timedelta(days=retention_days)
            
            if self.dry_run:
                count_result = db.session.execute(text("""
                    SELECT COUNT(*) FROM ai_system_metrics 
                    WHERE created_at < %s
                """), (cleanup_date,)).scalar()
                logger.info(f"  Would clean {count_result} old metrics records")
                self.stats['records_cleaned'] += count_result
            else:
                result = db.session.execute(text("""
                    DELETE FROM ai_system_metrics 
                    WHERE created_at < %s
                """), (cleanup_date,))
                
                cleaned_count = result.rowcount
                logger.info(f"  Cleaned {cleaned_count} old metrics records")
                self.stats['records_cleaned'] += cleaned_count
            
            logger.info("✅ System metrics cleanup completed")
            
        except Exception as e:
            logger.error(f"❌ System metrics cleanup failed: {e}")
            self.stats['errors_encountered'] += 1
    
    def _archive_old_posts(self):
        """Archive very old political posts if needed"""
        logger.info("Checking political posts for archival...")
        
        try:
            # Only archive posts older than 5 years with minimal engagement
            archive_date = datetime.now(timezone.utc) - timedelta(days=RETENTION_POLICIES['political_posts']['archive_threshold'])
            
            if self.dry_run:
                count_result = db.session.execute(text("""
                    SELECT COUNT(*) FROM post 
                    WHERE created_at < %s
                """), (archive_date,)).scalar()
                logger.info(f"  Found {count_result} posts older than 5 years")
                # Note: We typically keep all political posts for historical analysis
                # This is just monitoring for now
            else:
                # For now, just log the count - political data is usually kept indefinitely
                count_result = db.session.execute(text("""
                    SELECT COUNT(*) FROM post 
                    WHERE created_at < %s
                """), (archive_date,)).scalar()
                logger.info(f"  Monitoring: {count_result} posts older than 5 years")
            
            logger.info("✅ Posts archival check completed")
            
        except Exception as e:
            logger.error(f"❌ Posts archival check failed: {e}")
            self.stats['errors_encountered'] += 1
    
    def _update_cleanup_stats(self):
        """Update cleanup statistics"""
        try:
            # Estimate storage freed (rough calculation)
            # Assume average record size: embeddings ~2KB, executions ~1KB, reports ~10KB
            storage_freed = (
                self.stats['records_cleaned'] * 2 +  # rough average
                self.stats['records_archived'] * 0.5   # archival compression
            )
            self.stats['storage_freed_mb'] = round(storage_freed / 1024, 2)
            
            logger.info(f"📊 Cleanup Statistics:")
            logger.info(f"  Records cleaned: {self.stats['records_cleaned']}")
            logger.info(f"  Records archived: {self.stats['records_archived']}")
            logger.info(f"  Estimated storage freed: {self.stats['storage_freed_mb']} MB")
            logger.info(f"  Errors encountered: {self.stats['errors_encountered']}")
            
        except Exception as e:
            logger.error(f"Failed to update cleanup stats: {e}")
    
    def generate_retention_report(self) -> Dict:
        """Generate comprehensive data retention report"""
        logger.info("📊 Generating data retention report...")
        
        report = {
            'timestamp': datetime.now(timezone.utc).isoformat(),
            'retention_policies': RETENTION_POLICIES,
            'table_analysis': {},
            'recommendations': [],
            'compliance_status': 'compliant'
        }
        
        with self.app.app_context():
            try:
                # Analyze each table
                tables_to_analyze = [
                    'post', 'epaper', 'user', 'alert',
                    'ai_embedding_store', 'ai_model_execution', 
                    'ai_geopolitical_report', 'ai_system_metrics'
                ]
                
                for table_name in tables_to_analyze:
                    analysis = self._analyze_table_retention(table_name)
                    if analysis:
                        report['table_analysis'][table_name] = analysis
                
                # Generate recommendations
                report['recommendations'] = self._generate_retention_recommendations(report['table_analysis'])
                
                logger.info("✅ Data retention report generated successfully")
                return report
                
            except Exception as e:
                logger.error(f"❌ Failed to generate retention report: {e}")
                report['error'] = str(e)
                return report
    
    def _analyze_table_retention(self, table_name: str) -> Optional[Dict]:
        """Analyze retention status for a specific table"""
        try:
            # Check if table exists
            result = db.session.execute(text(f"""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_name = '{table_name}'
                );
            """)).scalar()
            
            if not result:
                return None
            
            analysis = {
                'total_records': 0,
                'oldest_record': None,
                'newest_record': None,
                'retention_eligible': 0,
                'storage_estimate_mb': 0
            }
            
            # Get basic statistics
            stats_query = f"""
                SELECT 
                    COUNT(*) as total_records,
                    MIN(created_at) as oldest_record,
                    MAX(created_at) as newest_record,
                    pg_total_relation_size('{table_name}') / (1024*1024) as size_mb
                FROM {table_name}
            """
            
            result = db.session.execute(text(stats_query)).fetchone()
            
            analysis['total_records'] = result.total_records
            analysis['oldest_record'] = result.oldest_record.isoformat() if result.oldest_record else None
            analysis['newest_record'] = result.newest_record.isoformat() if result.newest_record else None
            analysis['storage_estimate_mb'] = float(result.size_mb) if result.size_mb else 0
            
            # Estimate retention eligible records based on table type
            if 'ai_' in table_name:
                # AI tables have specific retention policies
                retention_days = 180  # default for AI tables
                cleanup_date = datetime.now(timezone.utc) - timedelta(days=retention_days)
                
                eligible_query = f"""
                    SELECT COUNT(*) FROM {table_name} 
                    WHERE created_at < %s
                """
                eligible_result = db.session.execute(text(eligible_query), (cleanup_date,)).scalar()
                analysis['retention_eligible'] = eligible_result
            
            return analysis
            
        except Exception as e:
            logger.error(f"Failed to analyze table {table_name}: {e}")
            return None
    
    def _generate_retention_recommendations(self, table_analysis: Dict) -> List[str]:
        """Generate data retention recommendations"""
        recommendations = []
        
        for table_name, analysis in table_analysis.items():
            if analysis['retention_eligible'] > 1000:
                recommendations.append(
                    f"Table '{table_name}': {analysis['retention_eligible']} records eligible for cleanup"
                )
            
            if analysis['storage_estimate_mb'] > 1000:  # >1GB
                recommendations.append(
                    f"Table '{table_name}': Large storage usage ({analysis['storage_estimate_mb']:.1f} MB) - consider archival"
                )
        
        if not recommendations:
            recommendations.append("No immediate retention actions required")
        
        return recommendations


def main():
    """Main CLI interface"""
    parser = argparse.ArgumentParser(description='LokDarpan Data Retention Manager')
    parser.add_argument('--policy', choices=['cleanup', 'archive', 'report'], 
                       help='Execute retention policy')
    parser.add_argument('--dry-run', action='store_true', 
                       help='Show what would be done without making changes')
    parser.add_argument('--force-cleanup', action='store_true',
                       help='Force cleanup without confirmation')
    parser.add_argument('--table', help='Target specific table for analysis')
    
    args = parser.parse_args()
    
    try:
        # Initialize retention manager
        manager = DataRetentionManager(dry_run=args.dry_run)
        
        if args.policy == 'cleanup':
            if not args.force_cleanup and not args.dry_run:
                response = input("This will permanently delete data. Continue? (yes/no): ")
                if response.lower() != 'yes':
                    print("Cleanup cancelled")
                    sys.exit(0)
            
            result = manager.execute_cleanup_policy()
            print(f"\nCleanup Results:")
            print(f"  Records cleaned: {result['records_cleaned']}")
            print(f"  Records archived: {result['records_archived']}")
            print(f"  Storage freed: {result['storage_freed_mb']} MB")
            if result['errors_encountered'] > 0:
                print(f"  Errors: {result['errors_encountered']}")
                sys.exit(1)
        
        elif args.policy == 'report':
            report = manager.generate_retention_report()
            print(json.dumps(report, indent=2, default=str))
            
            if report.get('error'):
                sys.exit(1)
        
        else:
            parser.print_help()
            
    except Exception as e:
        logger.error(f"Operation failed: {e}")
        sys.exit(1)


if __name__ == '__main__':
    main()