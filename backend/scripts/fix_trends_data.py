#!/usr/bin/env python3
"""
Fix Trends Data Script

Updates existing posts to have dates spread across the last 30 days
to enable proper time-series trend analysis.
"""

import os
import sys
import random
from datetime import datetime, timedelta, timezone

# Add the backend directory to the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from app import create_app
from app.models import db, Post

def fix_trends_data():
    """Update post dates to be spread across last 30 days."""
    
    print("🔧 Fixing trends data by spreading post dates...")
    
    # Get all posts
    posts = Post.query.all()
    print(f"Found {len(posts)} posts to update")
    
    # Calculate date range (last 30 days)
    end_date = datetime.now(timezone.utc)
    start_date = end_date - timedelta(days=30)
    
    print(f"Spreading posts across {start_date.date()} to {end_date.date()}")
    
    # Update posts with random dates in the range
    for i, post in enumerate(posts):
        # Generate random date within the range
        random_days = random.randint(0, 30)
        new_date = start_date + timedelta(days=random_days)
        
        # Add some random hours/minutes for more realistic distribution
        new_date += timedelta(
            hours=random.randint(0, 23),
            minutes=random.randint(0, 59)
        )
        
        # Update post date
        post.created_at = new_date
        
        if (i + 1) % 50 == 0:
            print(f"Updated {i + 1}/{len(posts)} posts...")
    
    # Commit changes
    print("Committing date updates...")
    db.session.commit()
    
    # Verify distribution
    print("\n📊 Date distribution verification:")
    
    # Count posts by date
    posts_by_date = {}
    for post in Post.query.all():
        date_str = post.created_at.date().isoformat()
        posts_by_date[date_str] = posts_by_date.get(date_str, 0) + 1
    
    # Show sample distribution
    sorted_dates = sorted(posts_by_date.items())
    print(f"Date range: {sorted_dates[0][0]} to {sorted_dates[-1][0]}")
    print(f"Total dates with posts: {len(sorted_dates)}")
    print(f"Average posts per day: {len(posts) / len(sorted_dates):.1f}")
    
    # Show first and last few days
    print("\nFirst 5 days:")
    for date, count in sorted_dates[:5]:
        print(f"  {date}: {count} posts")
    
    print("\nLast 5 days:")
    for date, count in sorted_dates[-5:]:
        print(f"  {date}: {count} posts")
    
    print("\n✅ Trends data fixed successfully!")
    print("📈 Time-series trends should now work properly")


if __name__ == '__main__':
    app = create_app()
    
    with app.app_context():
        fix_trends_data()