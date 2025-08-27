#!/usr/bin/env python3
"""
LokDarpan Historical Data Infrastructure Preparation
Optimizes database and prepares system for bulk historical data operations
"""

import os
import sys
from datetime import datetime, timezone
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import create_app, db
from sqlalchemy import text, Index
from sqlalchemy.exc import ProgrammingError

class InfrastructureManager:
    """Manages database infrastructure for historical data operations"""
    
    def __init__(self):
        self.app = create_app()
        
    def create_indexes(self):
        """Create performance indexes for historical queries"""
        print("Creating performance indexes...")
        
        index_definitions = [
            # Post indexes for time-series queries
            "CREATE INDEX IF NOT EXISTS idx_post_created_at ON post(created_at DESC)",
            "CREATE INDEX IF NOT EXISTS idx_post_city_created ON post(city, created_at DESC)",
            "CREATE INDEX IF NOT EXISTS idx_post_party_created ON post(party, created_at DESC)",
            "CREATE INDEX IF NOT EXISTS idx_post_emotion_created ON post(emotion, created_at DESC)",
            
            # Alert indexes
            "CREATE INDEX IF NOT EXISTS idx_alert_created_at ON alert(created_at DESC)",
            "CREATE INDEX IF NOT EXISTS idx_alert_ward_created ON alert(ward, created_at DESC)",
            "CREATE INDEX IF NOT EXISTS idx_alert_severity ON alert(severity)",
            
            # Epaper indexes
            "CREATE INDEX IF NOT EXISTS idx_epaper_publication_date ON epaper(publication_date DESC)",
            "CREATE INDEX IF NOT EXISTS idx_epaper_sha256 ON epaper(sha256)",
            
            # Summary indexes
            "CREATE INDEX IF NOT EXISTS idx_summary_created_at ON summary(created_at DESC)",
            "CREATE INDEX IF NOT EXISTS idx_summary_ward_created ON summary(ward, created_at DESC)",
            
            # Composite indexes for common queries
            "CREATE INDEX IF NOT EXISTS idx_post_composite ON post(city, party, emotion, created_at DESC)"
        ]
        
        with self.app.app_context():
            for index_sql in index_definitions:
                try:
                    db.session.execute(text(index_sql))
                    print(f"✅ Created index: {index_sql.split('idx_')[1].split(' ')[0]}")
                except ProgrammingError as e:
                    if "already exists" in str(e):
                        print(f"⏭️  Index already exists: {index_sql.split('idx_')[1].split(' ')[0]}")
                    else:
                        print(f"❌ Error creating index: {e}")
            
            db.session.commit()
            print("Index creation complete.")
    
    def optimize_database_settings(self):
        """Optimize database settings for bulk operations"""
        print("Optimizing database settings...")
        
        optimization_queries = [
            # Increase work memory for sorting operations
            "SET work_mem = '256MB'",
            
            # Optimize for bulk inserts
            "SET maintenance_work_mem = '512MB'",
            
            # Adjust checkpoint settings for better write performance
            "SET checkpoint_completion_target = 0.9",
            
            # Enable parallel queries for better read performance
            "SET max_parallel_workers_per_gather = 4"
        ]
        
        with self.app.app_context():
            for query in optimization_queries:
                try:
                    db.session.execute(text(query))
                    print(f"✅ Applied: {query}")
                except Exception as e:
                    print(f"⚠️  Could not apply {query}: {e}")
            
            db.session.commit()
    
    def create_staging_tables(self):
        """Create staging tables for batch operations"""
        print("Creating staging tables...")
        
        staging_tables = [
            """
            CREATE TABLE IF NOT EXISTS post_staging (
                LIKE post INCLUDING ALL
            )
            """,
            """
            CREATE TABLE IF NOT EXISTS alert_staging (
                LIKE alert INCLUDING ALL
            )
            """,
            """
            CREATE TABLE IF NOT EXISTS epaper_staging (
                LIKE epaper INCLUDING ALL
            )
            """
        ]
        
        with self.app.app_context():
            for table_sql in staging_tables:
                try:
                    db.session.execute(text(table_sql))
                    table_name = table_sql.split('TABLE IF NOT EXISTS ')[1].split(' ')[0]
                    print(f"✅ Created staging table: {table_name}")
                except Exception as e:
                    print(f"⚠️  Error with staging table: {e}")
            
            db.session.commit()
    
    def analyze_current_data(self):
        """Analyze current data distribution"""
        print("\nAnalyzing current data distribution...")
        
        queries = {
            "Total Posts": "SELECT COUNT(*) FROM post",
            "Posts by Ward": "SELECT city, COUNT(*) as count FROM post GROUP BY city ORDER BY count DESC LIMIT 10",
            "Posts by Party": "SELECT party, COUNT(*) as count FROM post WHERE party IS NOT NULL GROUP BY party ORDER BY count DESC",
            "Posts by Emotion": "SELECT emotion, COUNT(*) as count FROM post WHERE emotion IS NOT NULL GROUP BY emotion ORDER BY count DESC",
            "Total Alerts": "SELECT COUNT(*) FROM alert",
            "Total Epapers": "SELECT COUNT(*) FROM epaper",
            "Date Range": "SELECT MIN(created_at) as earliest, MAX(created_at) as latest FROM post",
            "Posts per Day (avg)": """
                SELECT AVG(daily_count) as avg_posts_per_day FROM (
                    SELECT DATE(created_at) as day, COUNT(*) as daily_count 
                    FROM post 
                    GROUP BY DATE(created_at)
                ) as daily_counts
            """
        }
        
        with self.app.app_context():
            print("\n" + "="*50)
            for label, query in queries.items():
                try:
                    result = db.session.execute(text(query))
                    rows = result.fetchall()
                    
                    print(f"\n{label}:")
                    if len(rows) == 1 and len(rows[0]) == 1:
                        print(f"  {rows[0][0]}")
                    else:
                        for row in rows[:10]:  # Limit to first 10 rows
                            if len(row) == 2:
                                print(f"  {row[0]}: {row[1]}")
                            else:
                                print(f"  {row}")
                except Exception as e:
                    print(f"  Error: {e}")
            print("="*50)
    
    def create_backup_point(self):
        """Create a backup point before bulk operations"""
        print("\nCreating backup point...")
        
        timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
        backup_tables = ['post', 'alert', 'epaper', 'summary']
        
        with self.app.app_context():
            for table in backup_tables:
                backup_name = f"{table}_backup_{timestamp}"
                try:
                    # Create backup table
                    db.session.execute(text(f"""
                        CREATE TABLE {backup_name} AS 
                        SELECT * FROM {table}
                    """))
                    
                    # Count rows
                    result = db.session.execute(text(f"SELECT COUNT(*) FROM {backup_name}"))
                    count = result.scalar()
                    
                    print(f"✅ Backed up {table}: {count} rows to {backup_name}")
                except Exception as e:
                    print(f"⚠️  Could not backup {table}: {e}")
            
            db.session.commit()
    
    def prepare_for_historical_data(self):
        """Main method to prepare infrastructure"""
        print("="*60)
        print("LokDarpan Historical Data Infrastructure Preparation")
        print("="*60)
        
        # Analyze current state
        self.analyze_current_data()
        
        # Create backup
        self.create_backup_point()
        
        # Create indexes
        self.create_indexes()
        
        # Optimize settings
        self.optimize_database_settings()
        
        # Create staging tables
        self.create_staging_tables()
        
        print("\n✅ Infrastructure preparation complete!")
        print("The database is now optimized for historical data generation.")
        print("\nNext steps:")
        print("1. Run historical_data_master_generator.py to generate 6 months of data")
        print("2. Monitor system resources during generation")
        print("3. Run validate_historical_data_quality.py to verify data quality")


def main():
    """Main execution function"""
    manager = InfrastructureManager()
    manager.prepare_for_historical_data()


if __name__ == "__main__":
    main()