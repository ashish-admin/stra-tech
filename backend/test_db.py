#!/usr/bin/env python
"""
Simple database connectivity and table analysis script
"""
import os
import sys

# Add the app directory to the path
sys.path.insert(0, os.path.abspath('.'))

from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from sqlalchemy import inspect, text
import logging

# Set up basic logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create a minimal Flask app for database testing
app = Flask(__name__)

# Database configuration
DATABASE_URL = os.getenv(
    'DATABASE_URL', 
    'postgresql://postgres:amuktha@localhost/lokdarpan_db'
)

app.config['SQLALCHEMY_DATABASE_URI'] = DATABASE_URL
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Initialize extensions
db = SQLAlchemy(app)
migrate = Migrate(app, db)

def test_database_connection():
    """Test basic database connectivity"""
    try:
        with app.app_context():
            # Test basic connection
            result = db.session.execute(text('SELECT version();')).fetchone()
            logger.info(f"PostgreSQL Version: {result[0]}")
            
            # Get table information
            inspector = inspect(db.engine)
            tables = inspector.get_table_names()
            logger.info(f"Total tables: {len(tables)}")
            logger.info(f"Tables: {sorted(tables)}")
            
            # Check for pgvector extension
            try:
                result = db.session.execute(text(
                    "SELECT * FROM pg_extension WHERE extname = 'vector';"
                )).fetchone()
                if result:
                    logger.info("✅ pgvector extension is installed")
                else:
                    logger.warning("❌ pgvector extension is NOT installed")
            except Exception as e:
                logger.warning(f"Could not check pgvector: {e}")
            
            # Check AI-related tables
            ai_tables = ['embedding_store', 'ai_model_execution', 
                        'geopolitical_report', 'budget_tracker']
            existing_ai_tables = [t for t in ai_tables if t in tables]
            logger.info(f"Existing AI tables: {existing_ai_tables}")
            
            # Check for indexes on key tables
            if 'post' in tables:
                indexes = inspector.get_indexes('post')
                logger.info(f"Post table indexes: {[idx['name'] for idx in indexes]}")
            
            if 'epaper' in tables:
                indexes = inspector.get_indexes('epaper')
                logger.info(f"Epaper table indexes: {[idx['name'] for idx in indexes]}")
            
            return True
            
    except Exception as e:
        logger.error(f"Database connection failed: {e}")
        return False

def analyze_ward_query_performance():
    """Analyze current ward-centric query patterns"""
    try:
        with app.app_context():
            # Check for ward-related indexes
            inspector = inspect(db.engine)
            tables = inspector.get_table_names()
            
            ward_related_tables = [t for t in tables if 'ward' in t.lower()]
            logger.info(f"Ward-related tables: {ward_related_tables}")
            
            # Check post table for city/ward queries
            if 'post' in tables:
                result = db.session.execute(text(
                    "SELECT city, COUNT(*) as count FROM post "
                    "WHERE city IS NOT NULL GROUP BY city LIMIT 10;"
                )).fetchall()
                logger.info("Top 10 cities in posts:")
                for row in result:
                    logger.info(f"  {row[0]}: {row[1]} posts")
            
            return True
            
    except Exception as e:
        logger.error(f"Ward analysis failed: {e}")
        return False

if __name__ == '__main__':
    logger.info("=== Database Analysis Started ===")
    
    # Test basic connection
    if test_database_connection():
        logger.info("✅ Database connection successful")
    else:
        logger.error("❌ Database connection failed")
        sys.exit(1)
    
    # Analyze ward performance
    if analyze_ward_query_performance():
        logger.info("✅ Ward analysis completed")
    else:
        logger.error("❌ Ward analysis failed")
    
    logger.info("=== Database Analysis Complete ===")