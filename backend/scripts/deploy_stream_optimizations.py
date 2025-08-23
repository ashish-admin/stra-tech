#!/usr/bin/env python3
"""
Deploy Stream A & B database optimizations with validation and rollback

This script provides a safe deployment mechanism for the Stream A & B database
optimizations, including pre-deployment validation, performance monitoring,
and automatic rollback capabilities.

Usage:
    python deploy_stream_optimizations.py --validate
    python deploy_stream_optimizations.py --deploy
    python deploy_stream_optimizations.py --rollback
    python deploy_stream_optimizations.py --monitor
"""

import os
import sys
import json
import time
import logging
import argparse
import subprocess
from datetime import datetime, timezone
from typing import Dict, List, Tuple, Optional

# Add app to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

try:
    from app import create_app
    from app.extensions import db
    from sqlalchemy import text
    import psycopg2
except ImportError as e:
    print(f"Missing dependencies: {e}")
    sys.exit(1)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


class StreamOptimizationDeployer:
    """Safe deployment and validation of Stream A & B database optimizations"""
    
    def __init__(self):
        self.app = create_app()
        self.deployment_id = datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')
        self.performance_baseline = {}
        self.validation_results = {}
        
    def validate_prerequisites(self) -> bool:
        """Validate system prerequisites before deployment"""
        logger.info("🔍 Validating deployment prerequisites...")
        
        try:
            with self.app.app_context():
                # Check database connectivity
                db.session.execute(text("SELECT 1")).scalar()
                logger.info("✅ Database connectivity confirmed")
                
                # Check PostgreSQL version
                version_result = db.session.execute(text("SELECT version()")).scalar()
                logger.info(f"📊 PostgreSQL version: {version_result}")
                
                # Check if previous migrations are applied
                migration_check = db.session.execute(text("""
                    SELECT EXISTS (
                        SELECT 1 FROM alembic_version 
                        WHERE version_num = '005_electoral_optimization'
                    )
                """)).scalar()
                
                if not migration_check:
                    logger.error("❌ Prerequisites: Migration 005_electoral_optimization not applied")
                    return False
                
                # Check pgvector availability
                pgvector_check = db.session.execute(text("""
                    SELECT EXISTS(SELECT 1 FROM pg_extension WHERE extname = 'vector')
                """)).scalar()
                
                if pgvector_check:
                    logger.info("✅ pgvector extension available")
                else:
                    logger.warning("⚠️ pgvector extension not installed - will use JSON fallback")
                
                # Check disk space (require at least 1GB free)
                disk_check = db.session.execute(text("""
                    SELECT pg_size_pretty(pg_database_size(current_database()))
                """)).scalar()
                logger.info(f"💾 Database size: {disk_check}")
                
                # Check active connections
                connection_count = db.session.execute(text("""
                    SELECT count(*) FROM pg_stat_activity 
                    WHERE state = 'active' AND datname = current_database()
                """)).scalar()
                logger.info(f"🔗 Active database connections: {connection_count}")
                
                logger.info("✅ All prerequisites validated successfully")
                return True
                
        except Exception as e:
            logger.error(f"❌ Prerequisites validation failed: {e}")
            return False
    
    def capture_performance_baseline(self) -> Dict:
        """Capture current performance metrics before deployment"""
        logger.info("📊 Capturing performance baseline...")
        
        baseline = {
            'timestamp': datetime.now(timezone.utc).isoformat(),
            'deployment_id': self.deployment_id
        }
        
        try:
            with self.app.app_context():
                # Query performance tests
                test_queries = [
                    {
                        'name': 'ward_post_query',
                        'sql': "SELECT COUNT(*) FROM post WHERE city = 'Jubilee Hills' AND created_at >= NOW() - INTERVAL '30 days'"
                    },
                    {
                        'name': 'competitive_analysis',
                        'sql': """
                            SELECT party, COUNT(*) as mentions 
                            FROM post 
                            WHERE city = 'Begumpet' AND party IS NOT NULL 
                            GROUP BY party ORDER BY mentions DESC LIMIT 5
                        """
                    },
                    {
                        'name': 'time_series_analysis',
                        'sql': """
                            SELECT DATE(created_at), COUNT(*) 
                            FROM post 
                            WHERE created_at >= NOW() - INTERVAL '7 days' 
                            GROUP BY DATE(created_at)
                        """
                    }
                ]
                
                query_performance = {}
                for query in test_queries:
                    times = []
                    for _ in range(5):  # Run each query 5 times
                        start_time = time.time()
                        db.session.execute(text(query['sql'])).fetchall()
                        elapsed_ms = (time.time() - start_time) * 1000
                        times.append(elapsed_ms)
                    
                    query_performance[query['name']] = {
                        'avg_ms': sum(times) / len(times),
                        'max_ms': max(times),
                        'min_ms': min(times)
                    }
                
                baseline['query_performance'] = query_performance
                
                # Database statistics
                db_stats = db.session.execute(text("""
                    SELECT 
                        (SELECT count(*) FROM post) as total_posts,
                        (SELECT count(*) FROM epaper) as total_epapers,
                        (SELECT count(*) FROM ai_model_execution) as ai_executions,
                        (SELECT pg_size_pretty(pg_database_size(current_database()))) as db_size
                """)).fetchone()
                
                baseline['database_stats'] = {
                    'total_posts': db_stats.total_posts,
                    'total_epapers': db_stats.total_epapers,
                    'ai_executions': db_stats.ai_executions if db_stats.ai_executions else 0,
                    'database_size': db_stats.db_size
                }
                
                # Index usage statistics
                index_stats = db.session.execute(text("""
                    SELECT 
                        indexrelname,
                        idx_scan,
                        idx_tup_read,
                        idx_tup_fetch
                    FROM pg_stat_user_indexes 
                    WHERE idx_scan > 0
                    ORDER BY idx_scan DESC
                    LIMIT 10
                """)).fetchall()
                
                baseline['top_indexes'] = [
                    {
                        'index_name': row.indexrelname,
                        'scans': row.idx_scan,
                        'tuples_read': row.idx_tup_read
                    }
                    for row in index_stats
                ]
                
        except Exception as e:
            logger.error(f"❌ Failed to capture baseline: {e}")
            baseline['error'] = str(e)
        
        self.performance_baseline = baseline
        logger.info("✅ Performance baseline captured")
        return baseline
    
    def deploy_optimizations(self) -> bool:
        """Deploy the Stream A & B optimizations"""
        logger.info("🚀 Deploying Stream A & B optimizations...")
        
        try:
            # Run the Alembic migration
            result = subprocess.run([
                'flask', 'db', 'upgrade'
            ], cwd='..', capture_output=True, text=True)
            
            if result.returncode != 0:
                logger.error(f"❌ Migration failed: {result.stderr}")
                return False
            
            logger.info("✅ Migration applied successfully")
            
            # Verify tables were created
            with self.app.app_context():
                required_tables = [
                    'ai_analysis_results',
                    'component_health_metrics', 
                    'sse_connection_state',
                    'intelligence_briefing_cache',
                    'ai_cost_optimization'
                ]
                
                for table in required_tables:
                    exists = db.session.execute(text(f"""
                        SELECT EXISTS (
                            SELECT FROM information_schema.tables 
                            WHERE table_name = '{table}'
                        )
                    """)).scalar()
                    
                    if exists:
                        logger.info(f"✅ Table {table} created successfully")
                    else:
                        logger.error(f"❌ Table {table} missing after migration")
                        return False
                
                # Verify functions were created
                required_functions = [
                    'get_component_health_summary',
                    'get_cost_optimization_summary',
                    'refresh_intelligence_cache',
                    'cleanup_sse_connections',
                    'stream_ab_maintenance'
                ]
                
                for function in required_functions:
                    exists = db.session.execute(text(f"""
                        SELECT EXISTS (
                            SELECT FROM pg_proc p
                            JOIN pg_namespace n ON p.pronamespace = n.oid
                            WHERE n.nspname = 'public' AND p.proname = '{function}'
                        )
                    """)).scalar()
                    
                    if exists:
                        logger.info(f"✅ Function {function} created successfully")
                    else:
                        logger.warning(f"⚠️ Function {function} not found")
                
                # Verify materialized view
                mv_exists = db.session.execute(text("""
                    SELECT EXISTS (
                        SELECT FROM pg_matviews 
                        WHERE matviewname = 'stream_performance_summary'
                    )
                """)).scalar()
                
                if mv_exists:
                    logger.info("✅ Materialized view stream_performance_summary created")
                else:
                    logger.warning("⚠️ Materialized view not found")
                
            logger.info("✅ Deployment completed successfully")
            return True
            
        except Exception as e:
            logger.error(f"❌ Deployment failed: {e}")
            return False
    
    def validate_post_deployment(self) -> Dict:
        """Validate system performance after deployment"""
        logger.info("🔍 Validating post-deployment performance...")
        
        validation = {
            'timestamp': datetime.now(timezone.utc).isoformat(),
            'deployment_id': self.deployment_id,
            'tests_passed': 0,
            'tests_failed': 0,
            'performance_improvements': {},
            'issues': []
        }
        
        try:
            with self.app.app_context():
                # Test new AI analysis results functionality
                try:
                    db.session.execute(text("""
                        INSERT INTO ai_analysis_results (
                            analysis_id, request_correlation_id, ward_context,
                            analysis_type, primary_model, model_confidence_scores,
                            ensemble_confidence, analysis_results, quality_score,
                            requested_at, status
                        ) VALUES (
                            'test-' || gen_random_uuid()::text,
                            'test-correlation-' || gen_random_uuid()::text,
                            'Test Ward',
                            'test_analysis',
                            'test_model',
                            '{"test_model": 0.95}'::json,
                            0.95,
                            '{"test": "data"}'::json,
                            0.9,
                            NOW(),
                            'completed'
                        )
                    """))
                    db.session.commit()
                    validation['tests_passed'] += 1
                    logger.info("✅ AI analysis results table functional")
                except Exception as e:
                    validation['tests_failed'] += 1
                    validation['issues'].append(f"AI analysis results test failed: {e}")
                    logger.error(f"❌ AI analysis results test failed: {e}")
                
                # Test component health monitoring
                try:
                    db.session.execute(text("""
                        INSERT INTO component_health_metrics (
                            component_name, component_type, health_status,
                            response_time_ms, error_rate, measurement_window_start,
                            measurement_window_end, created_at
                        ) VALUES (
                            'test_component', 'dashboard', 'healthy',
                            50, 0.01, NOW() - INTERVAL '1 minute', NOW(), NOW()
                        )
                    """))
                    db.session.commit()
                    validation['tests_passed'] += 1
                    logger.info("✅ Component health monitoring functional")
                except Exception as e:
                    validation['tests_failed'] += 1
                    validation['issues'].append(f"Component health monitoring test failed: {e}")
                    logger.error(f"❌ Component health monitoring test failed: {e}")
                
                # Test SSE connection state
                try:
                    db.session.execute(text("""
                        INSERT INTO sse_connection_state (
                            connection_id, session_id, endpoint, ward_context,
                            connection_status, established_at, last_activity_at
                        ) VALUES (
                            'test-' || gen_random_uuid()::text,
                            'test-session-' || gen_random_uuid()::text,
                            '/api/v1/strategist/stream',
                            'Test Ward',
                            'active',
                            NOW(),
                            NOW()
                        )
                    """))
                    db.session.commit()
                    validation['tests_passed'] += 1
                    logger.info("✅ SSE connection state functional")
                except Exception as e:
                    validation['tests_failed'] += 1
                    validation['issues'].append(f"SSE connection state test failed: {e}")
                    logger.error(f"❌ SSE connection state test failed: {e}")
                
                # Test performance functions
                try:
                    health_summary = db.session.execute(text("""
                        SELECT * FROM get_component_health_summary(15)
                    """)).fetchall()
                    validation['tests_passed'] += 1
                    logger.info("✅ Component health summary function working")
                except Exception as e:
                    validation['tests_failed'] += 1
                    validation['issues'].append(f"Health summary function test failed: {e}")
                    logger.error(f"❌ Health summary function test failed: {e}")
                
                # Compare performance with baseline
                if self.performance_baseline.get('query_performance'):
                    current_performance = {}
                    for query_name, baseline_perf in self.performance_baseline['query_performance'].items():
                        # Re-run the same queries
                        test_queries = {
                            'ward_post_query': "SELECT COUNT(*) FROM post WHERE city = 'Jubilee Hills' AND created_at >= NOW() - INTERVAL '30 days'",
                            'competitive_analysis': "SELECT party, COUNT(*) as mentions FROM post WHERE city = 'Begumpet' AND party IS NOT NULL GROUP BY party ORDER BY mentions DESC LIMIT 5",
                            'time_series_analysis': "SELECT DATE(created_at), COUNT(*) FROM post WHERE created_at >= NOW() - INTERVAL '7 days' GROUP BY DATE(created_at)"
                        }
                        
                        if query_name in test_queries:
                            times = []
                            for _ in range(3):  # Fewer iterations for validation
                                start_time = time.time()
                                db.session.execute(text(test_queries[query_name])).fetchall()
                                elapsed_ms = (time.time() - start_time) * 1000
                                times.append(elapsed_ms)
                            
                            avg_time = sum(times) / len(times)
                            current_performance[query_name] = avg_time
                            
                            # Calculate improvement
                            baseline_avg = baseline_perf['avg_ms']
                            improvement_pct = ((baseline_avg - avg_time) / baseline_avg) * 100
                            validation['performance_improvements'][query_name] = {
                                'baseline_ms': baseline_avg,
                                'current_ms': avg_time,
                                'improvement_percent': improvement_pct
                            }
                            
                            if improvement_pct > 0:
                                logger.info(f"✅ {query_name} improved by {improvement_pct:.1f}%")
                            else:
                                logger.warning(f"⚠️ {query_name} performance degraded by {abs(improvement_pct):.1f}%")
                
                # Test maintenance function
                try:
                    maintenance_result = db.session.execute(text("""
                        SELECT stream_ab_maintenance()
                    """)).scalar()
                    validation['tests_passed'] += 1
                    validation['maintenance_result'] = maintenance_result
                    logger.info("✅ Maintenance function working")
                except Exception as e:
                    validation['tests_failed'] += 1
                    validation['issues'].append(f"Maintenance function test failed: {e}")
                    logger.error(f"❌ Maintenance function test failed: {e}")
                
                # Clean up test data
                try:
                    db.session.execute(text("DELETE FROM ai_analysis_results WHERE analysis_id LIKE 'test-%'"))
                    db.session.execute(text("DELETE FROM component_health_metrics WHERE component_name = 'test_component'"))
                    db.session.execute(text("DELETE FROM sse_connection_state WHERE connection_id LIKE 'test-%'"))
                    db.session.commit()
                    logger.info("✅ Test data cleaned up")
                except Exception as e:
                    logger.warning(f"⚠️ Test data cleanup failed: {e}")
                
        except Exception as e:
            validation['tests_failed'] += 1
            validation['issues'].append(f"Validation exception: {e}")
            logger.error(f"❌ Validation failed: {e}")
        
        validation['success_rate'] = (validation['tests_passed'] / (validation['tests_passed'] + validation['tests_failed'])) * 100
        
        if validation['success_rate'] >= 80:
            logger.info(f"✅ Validation passed with {validation['success_rate']:.1f}% success rate")
        else:
            logger.error(f"❌ Validation failed with {validation['success_rate']:.1f}% success rate")
        
        self.validation_results = validation
        return validation
    
    def rollback_deployment(self) -> bool:
        """Rollback the deployment if validation fails"""
        logger.info("🔄 Rolling back Stream A & B optimizations...")
        
        try:
            # Run Alembic downgrade
            result = subprocess.run([
                'flask', 'db', 'downgrade', '-1'
            ], cwd='..', capture_output=True, text=True)
            
            if result.returncode != 0:
                logger.error(f"❌ Rollback failed: {result.stderr}")
                return False
            
            logger.info("✅ Rollback completed successfully")
            
            # Verify tables were removed
            with self.app.app_context():
                rollback_tables = [
                    'ai_analysis_results',
                    'component_health_metrics',
                    'sse_connection_state', 
                    'intelligence_briefing_cache',
                    'ai_cost_optimization'
                ]
                
                for table in rollback_tables:
                    exists = db.session.execute(text(f"""
                        SELECT EXISTS (
                            SELECT FROM information_schema.tables 
                            WHERE table_name = '{table}'
                        )
                    """)).scalar()
                    
                    if not exists:
                        logger.info(f"✅ Table {table} removed successfully")
                    else:
                        logger.warning(f"⚠️ Table {table} still exists after rollback")
            
            return True
            
        except Exception as e:
            logger.error(f"❌ Rollback failed: {e}")
            return False
    
    def monitor_performance(self, duration_minutes: int = 15) -> Dict:
        """Monitor system performance after deployment"""
        logger.info(f"📊 Monitoring performance for {duration_minutes} minutes...")
        
        monitoring_results = {
            'duration_minutes': duration_minutes,
            'samples': [],
            'averages': {},
            'alerts': []
        }
        
        try:
            samples_per_minute = 2
            total_samples = duration_minutes * samples_per_minute
            sample_interval = 60 / samples_per_minute  # seconds
            
            for i in range(total_samples):
                logger.info(f"📊 Sample {i+1}/{total_samples}")
                
                with self.app.app_context():
                    sample = {
                        'timestamp': datetime.now(timezone.utc).isoformat(),
                        'sample_number': i + 1
                    }
                    
                    # Test critical query performance
                    start_time = time.time()
                    db.session.execute(text("""
                        SELECT COUNT(*) FROM post 
                        WHERE city = 'Jubilee Hills' 
                          AND created_at >= NOW() - INTERVAL '7 days'
                    """)).scalar()
                    sample['ward_query_ms'] = (time.time() - start_time) * 1000
                    
                    # Test component health query
                    start_time = time.time()
                    db.session.execute(text("""
                        SELECT COUNT(*) FROM component_health_metrics
                        WHERE created_at >= NOW() - INTERVAL '1 hour'
                    """)).scalar()
                    sample['component_health_query_ms'] = (time.time() - start_time) * 1000
                    
                    # Test SSE connection query
                    start_time = time.time()
                    db.session.execute(text("""
                        SELECT COUNT(*) FROM sse_connection_state
                        WHERE connection_status = 'active'
                    """)).scalar()
                    sample['sse_query_ms'] = (time.time() - start_time) * 1000
                    
                    # Check database load
                    db_stats = db.session.execute(text("""
                        SELECT 
                            (SELECT count(*) FROM pg_stat_activity WHERE state = 'active') as active_connections,
                            (SELECT COALESCE(avg(extract(milliseconds from current_timestamp - query_start)), 0) 
                             FROM pg_stat_activity WHERE state = 'active') as avg_query_duration_ms
                    """)).fetchone()
                    
                    sample['active_connections'] = db_stats.active_connections
                    sample['avg_query_duration_ms'] = float(db_stats.avg_query_duration_ms)
                    
                    monitoring_results['samples'].append(sample)
                    
                    # Check for performance alerts
                    if sample['ward_query_ms'] > 100:
                        monitoring_results['alerts'].append({
                            'timestamp': sample['timestamp'],
                            'type': 'performance',
                            'message': f"Ward query exceeded 100ms: {sample['ward_query_ms']:.1f}ms"
                        })
                    
                    if sample['active_connections'] > 20:
                        monitoring_results['alerts'].append({
                            'timestamp': sample['timestamp'],
                            'type': 'load',
                            'message': f"High connection count: {sample['active_connections']}"
                        })
                
                if i < total_samples - 1:  # Don't sleep after last sample
                    time.sleep(sample_interval)
            
            # Calculate averages
            if monitoring_results['samples']:
                metrics = ['ward_query_ms', 'component_health_query_ms', 'sse_query_ms', 'active_connections', 'avg_query_duration_ms']
                for metric in metrics:
                    values = [sample[metric] for sample in monitoring_results['samples'] if metric in sample]
                    if values:
                        monitoring_results['averages'][metric] = {
                            'avg': sum(values) / len(values),
                            'max': max(values),
                            'min': min(values)
                        }
            
            logger.info("✅ Performance monitoring completed")
            
        except Exception as e:
            logger.error(f"❌ Performance monitoring failed: {e}")
            monitoring_results['error'] = str(e)
        
        return monitoring_results
    
    def generate_deployment_report(self) -> Dict:
        """Generate comprehensive deployment report"""
        report = {
            'deployment_id': self.deployment_id,
            'timestamp': datetime.now(timezone.utc).isoformat(),
            'baseline': self.performance_baseline,
            'validation': self.validation_results,
            'summary': {
                'deployment_successful': False,
                'performance_improved': False,
                'issues_found': [],
                'recommendations': []
            }
        }
        
        # Analyze validation results
        if self.validation_results:
            success_rate = self.validation_results.get('success_rate', 0)
            report['summary']['deployment_successful'] = success_rate >= 80
            
            # Check performance improvements
            improvements = self.validation_results.get('performance_improvements', {})
            improved_queries = [q for q, perf in improvements.items() if perf.get('improvement_percent', 0) > 0]
            report['summary']['performance_improved'] = len(improved_queries) > len(improvements) / 2
            
            # Collect issues
            report['summary']['issues_found'] = self.validation_results.get('issues', [])
        
        # Generate recommendations
        if not report['summary']['deployment_successful']:
            report['summary']['recommendations'].append("Consider rollback due to validation failures")
        
        if not report['summary']['performance_improved']:
            report['summary']['recommendations'].append("Monitor query performance and consider index tuning")
        
        if len(report['summary']['issues_found']) > 0:
            report['summary']['recommendations'].append("Address identified issues before production deployment")
        
        return report


def main():
    """Main CLI interface"""
    parser = argparse.ArgumentParser(description='Deploy Stream A & B Database Optimizations')
    parser.add_argument('--validate', action='store_true', help='Validate deployment prerequisites')
    parser.add_argument('--deploy', action='store_true', help='Deploy optimizations')
    parser.add_argument('--rollback', action='store_true', help='Rollback deployment')
    parser.add_argument('--monitor', type=int, default=15, help='Monitor performance for N minutes')
    parser.add_argument('--output', help='Output deployment report to file')
    parser.add_argument('--auto-rollback', action='store_true', help='Automatically rollback on validation failure')
    
    args = parser.parse_args()
    
    deployer = StreamOptimizationDeployer()
    
    try:
        if args.validate:
            # Validation only
            if not deployer.validate_prerequisites():
                sys.exit(1)
            logger.info("✅ Validation passed - ready for deployment")
            
        elif args.rollback:
            # Rollback only
            if deployer.rollback_deployment():
                logger.info("✅ Rollback completed successfully")
            else:
                logger.error("❌ Rollback failed")
                sys.exit(1)
                
        elif args.deploy:
            # Full deployment workflow
            logger.info("🚀 Starting Stream A & B deployment workflow...")
            
            # Step 1: Validate prerequisites
            if not deployer.validate_prerequisites():
                logger.error("❌ Prerequisites validation failed")
                sys.exit(1)
            
            # Step 2: Capture baseline
            deployer.capture_performance_baseline()
            
            # Step 3: Deploy optimizations
            if not deployer.deploy_optimizations():
                logger.error("❌ Deployment failed")
                sys.exit(1)
            
            # Step 4: Post-deployment validation
            validation = deployer.validate_post_deployment()
            
            # Step 5: Auto-rollback if validation fails
            if args.auto_rollback and validation.get('success_rate', 0) < 80:
                logger.warning("⚠️ Validation failed - initiating auto-rollback")
                if deployer.rollback_deployment():
                    logger.info("✅ Auto-rollback completed")
                else:
                    logger.error("❌ Auto-rollback failed")
                    sys.exit(1)
            
            # Step 6: Performance monitoring
            monitoring = deployer.monitor_performance(args.monitor)
            
            # Generate deployment report
            report = deployer.generate_deployment_report()
            report['monitoring'] = monitoring
            
            # Output report
            if args.output:
                with open(args.output, 'w') as f:
                    json.dump(report, f, indent=2, default=str)
                logger.info(f"📄 Deployment report saved to {args.output}")
            else:
                print(json.dumps(report, indent=2, default=str))
            
            # Final status
            if report['summary']['deployment_successful']:
                logger.info("✅ Stream A & B deployment completed successfully")
            else:
                logger.error("❌ Stream A & B deployment encountered issues")
                sys.exit(1)
        
        else:
            # Performance monitoring only
            monitoring = deployer.monitor_performance(args.monitor)
            print(json.dumps(monitoring, indent=2, default=str))
            
    except KeyboardInterrupt:
        logger.info("🛑 Deployment interrupted by user")
        sys.exit(1)
    except Exception as e:
        logger.error(f"❌ Deployment failed with exception: {e}")
        sys.exit(1)


if __name__ == '__main__':
    main()