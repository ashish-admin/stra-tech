#!/usr/bin/env python3
"""
Database Analysis Script for LokDarpan Data Loss Investigation

This script connects directly to the PostgreSQL database to analyze:
1. Current data state across all tables
2. Migration history and potential data loss events
3. Recovery recommendations
"""

import psycopg2
import sys
from datetime import datetime, timedelta
import os

# Database connection settings
DATABASE_URL = "postgresql://postgres:amuktha@localhost/lokdarpan_db"

def connect_to_database():
    """Connect to the PostgreSQL database"""
    try:
        conn = psycopg2.connect(DATABASE_URL)
        return conn
    except psycopg2.Error as e:
        print(f"Error connecting to database: {e}")
        return None

def analyze_table_data(conn):
    """Analyze data presence in key tables"""
    cursor = conn.cursor()
    
    print("=== DATABASE DATA ANALYSIS ===")
    print(f"Analysis performed on: {datetime.now()}")
    print()
    
    # Get all tables
    cursor.execute("""
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        ORDER BY table_name
    """)
    all_tables = [row[0] for row in cursor.fetchall()]
    print(f"Available tables ({len(all_tables)}): {', '.join(sorted(all_tables))}")
    print()
    
    # Key tables that should contain the 6-month enriched data
    key_tables = [
        'epaper', 'post', 'author', 'embedding_store', 'ward_profile', 
        'ward_demographics', 'alert', 'user', 'geopolitical_report',
        'ai_model_execution', 'budget_tracker'
    ]
    
    print("=== ROW COUNTS FOR KEY TABLES ===")
    table_data = {}
    for table in key_tables:
        if table in all_tables:
            try:
                cursor.execute(f"SELECT COUNT(*) FROM {table}")
                count = cursor.fetchone()[0]
                print(f"{table:20}: {count:,} rows")
                table_data[table] = count
                
                # Get date range if table has created_at or similar date column
                date_columns = ['created_at', 'publication_date', 'date_created', 'timestamp']
                for date_col in date_columns:
                    try:
                        cursor.execute(f"""
                            SELECT column_name 
                            FROM information_schema.columns 
                            WHERE table_name = '{table}' AND column_name = '{date_col}'
                        """)
                        if cursor.fetchone():
                            cursor.execute(f"""
                                SELECT MIN({date_col}), MAX({date_col}), COUNT(*) 
                                FROM {table} 
                                WHERE {date_col} IS NOT NULL
                            """)
                            result = cursor.fetchone()
                            if result[2] > 0:
                                print(f"  └─ Date range ({date_col}): {result[0]} to {result[1]} ({result[2]} records with dates)")
                            break
                    except:
                        continue
                        
            except Exception as e:
                print(f"{table:20}: ERROR - {str(e)}")
                table_data[table] = -1
        else:
            print(f"{table:20}: TABLE NOT FOUND")
            table_data[table] = -1
    
    return table_data, all_tables

def analyze_migration_history(conn):
    """Check Alembic migration history for potential issues"""
    cursor = conn.cursor()
    
    print("\n=== MIGRATION HISTORY ANALYSIS ===")
    
    try:
        cursor.execute("""
            SELECT version_num, CASE WHEN version_num IS NOT NULL THEN 'Applied' ELSE 'Missing' END as status
            FROM alembic_version 
            ORDER BY version_num DESC 
            LIMIT 20
        """)
        
        migrations = cursor.fetchall()
        if migrations:
            print("Recent migrations:")
            for migration in migrations:
                print(f"  {migration[0]} - {migration[1]}")
        else:
            print("No migration records found")
            
    except Exception as e:
        print(f"Error checking migrations: {e}")

def check_for_data_loss_indicators(conn, table_data):
    """Look for indicators of recent data loss"""
    cursor = conn.cursor()
    
    print("\n=== DATA LOSS INDICATORS ===")
    
    # Check for empty or nearly empty critical tables
    critical_tables = ['epaper', 'post', 'author']
    empty_critical = []
    
    for table in critical_tables:
        if table in table_data:
            if table_data[table] == 0:
                empty_critical.append(table)
            elif table_data[table] < 10:  # Very low data
                print(f"⚠️  WARNING: {table} has only {table_data[table]} rows (unexpectedly low)")
    
    if empty_critical:
        print(f"🚨 CRITICAL: Empty critical tables: {', '.join(empty_critical)}")
    
    # Check for recent data gaps in post table if it exists
    if 'post' in table_data and table_data['post'] > 0:
        try:
            cursor.execute("""
                SELECT DATE(created_at) as date, COUNT(*) as count
                FROM post 
                WHERE created_at > CURRENT_DATE - INTERVAL '30 days'
                GROUP BY DATE(created_at)
                ORDER BY date DESC
                LIMIT 10
            """)
            
            recent_posts = cursor.fetchall()
            if recent_posts:
                print("\nRecent post activity (last 30 days):")
                for date, count in recent_posts:
                    print(f"  {date}: {count} posts")
            else:
                print("🚨 CRITICAL: No posts found in the last 30 days")
                
        except Exception as e:
            print(f"Could not analyze recent post activity: {e}")

def check_backup_and_recovery_options(conn):
    """Check for backup files and recovery options"""
    print("\n=== RECOVERY OPTIONS ANALYSIS ===")
    
    # Check for data seeding scripts
    seed_scripts = [
        'C:\\Users\\amukt\\Projects\\LokDarpan\\backend\\scripts\\reseed_demo_data.py',
        'C:\\Users\\amukt\\Projects\\LokDarpan\\backend\\scripts\\seed_minimal_ward.py',
        'C:\\Users\\amukt\\Projects\\LokDarpan\\backend\\scripts\\seed_comprehensive_political_data.py'
    ]
    
    print("Available data seeding scripts:")
    for script in seed_scripts:
        if os.path.exists(script):
            print(f"  ✅ {script}")
        else:
            print(f"  ❌ {script}")
    
    # Check for epaper data files
    epaper_dirs = [
        'C:\\Users\\amukt\\Projects\\LokDarpan\\backend\\data\\epaper\\inbox',
        'C:\\Users\\amukt\\Projects\\LokDarpan\\backend\\data\\epaper\\processed'
    ]
    
    print("\nEpaper data directories:")
    for dir_path in epaper_dirs:
        if os.path.exists(dir_path):
            files = os.listdir(dir_path)
            print(f"  ✅ {dir_path}: {len(files)} files")
            for file in files[:5]:  # Show first 5 files
                print(f"    - {file}")
            if len(files) > 5:
                print(f"    ... and {len(files) - 5} more files")
        else:
            print(f"  ❌ {dir_path}")

def generate_recovery_recommendations(table_data):
    """Generate recovery recommendations based on analysis"""
    print("\n=== RECOVERY RECOMMENDATIONS ===")
    
    # Determine severity of data loss
    critical_empty = sum(1 for table in ['epaper', 'post', 'author'] if table_data.get(table, 0) == 0)
    
    if critical_empty > 0:
        print("🚨 CRITICAL DATA LOSS DETECTED")
        print("Immediate actions required:")
        print("1. Stop all data ingestion processes immediately")
        print("2. Check for database backup files")
        print("3. Investigate recent migration or deployment changes")
        print("4. Contact system administrator for backup restoration")
    elif sum(table_data.get(table, 0) for table in ['epaper', 'post', 'author']) < 100:
        print("⚠️  SIGNIFICANT DATA REDUCTION DETECTED")
        print("Recommended actions:")
        print("1. Verify this is expected (e.g., data archival process)")
        print("2. Check recent migration logs for destructive operations")
        print("3. Run data seeding scripts to restore demo/test data")
    else:
        print("✅ Data levels appear normal")
        print("Recommended maintenance:")
        print("1. Run regular data integrity checks")
        print("2. Ensure backup procedures are working")
        print("3. Monitor data growth trends")
    
    print("\nStep-by-step recovery plan:")
    print("1. Run data seeding script:")
    print("   cd backend && python scripts/reseed_demo_data.py")
    print("2. If seeding fails, check migrations:")
    print("   flask db current")
    print("   flask db upgrade")
    print("3. Re-run data enrichment tasks:")
    print("   celery -A celery_worker.celery call app.tasks.ingest_epaper_jsonl")
    print("4. Verify data recovery:")
    print("   python database_analysis.py")

def main():
    """Main analysis function"""
    print("LokDarpan Database Analysis Tool")
    print("=" * 50)
    
    conn = connect_to_database()
    if not conn:
        sys.exit(1)
    
    try:
        # Analyze current data state
        table_data, all_tables = analyze_table_data(conn)
        
        # Check migration history
        analyze_migration_history(conn)
        
        # Look for data loss indicators
        check_for_data_loss_indicators(conn, table_data)
        
        # Check recovery options
        check_backup_and_recovery_options(conn)
        
        # Generate recommendations
        generate_recovery_recommendations(table_data)
        
    finally:
        conn.close()
    
    print(f"\nAnalysis completed at: {datetime.now()}")
    print("=" * 50)

if __name__ == "__main__":
    main()