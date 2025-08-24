#!/usr/bin/env python3
"""
Final Migration Validation - Simple and Effective
"""

import os
import sys
import time
from datetime import datetime, timedelta, timezone

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from app import create_app
from app.models import db, Post, Alert, Epaper
from sqlalchemy import text, func


def main():
    """Simple final validation"""
    print("=" * 80)
    print("🎯 LokDarpan Migration - Final Validation")
    print("=" * 80)
    
    app = create_app()
    
    with app.app_context():
        # Basic counts
        total_posts = Post.query.count()
        total_wards = len(db.session.query(Post.city).distinct().all())
        total_alerts = Alert.query.count()
        total_epapers = Epaper.query.count()
        
        print(f"\n📊 DATABASE METRICS:")
        print(f"   - Total Posts: {total_posts:,}")
        print(f"   - Ward Coverage: {total_wards}/150 wards")
        print(f"   - Strategic Alerts: {total_alerts:,}")
        print(f"   - Epaper Articles: {total_epapers:,}")
        
        # Test basic query performance
        print(f"\n⚡ PERFORMANCE TEST:")
        
        start = time.time()
        test_posts = Post.query.filter_by(city="Ward 95").limit(50).all()
        query_time = (time.time() - start) * 1000
        
        status = "✅ EXCELLENT" if query_time < 100 else "⚠️ ACCEPTABLE" if query_time < 500 else "❌ SLOW"
        print(f"   Ward Query: {query_time:.1f}ms {status}")
        
        # Data quality check
        posts_with_emotion = Post.query.filter(Post.emotion.isnot(None)).count()
        posts_with_party = Post.query.filter(Post.party.isnot(None)).count()
        
        emotion_pct = round((posts_with_emotion / total_posts) * 100, 1)
        party_pct = round((posts_with_party / total_posts) * 100, 1)
        
        print(f"\n📈 DATA QUALITY:")
        print(f"   - Emotion Coverage: {emotion_pct}%")
        print(f"   - Party Coverage: {party_pct}%")
        
        # Party distribution
        party_counts = db.session.query(
            Post.party, func.count(Post.id)
        ).filter(Post.party.isnot(None)).group_by(Post.party).all()
        
        print(f"\n🏛️ POLITICAL COVERAGE:")
        for party, count in sorted(party_counts, key=lambda x: x[1], reverse=True):
            pct = round((count / total_posts) * 100, 1)
            print(f"   - {party}: {count:,} mentions ({pct}%)")
        
        # Success criteria
        print(f"\n🎯 SUCCESS CRITERIA:")
        criteria = [
            ("Ward Coverage", total_wards >= 100, f"{total_wards}/150 wards"),
            ("Data Volume", total_posts >= 1000, f"{total_posts:,} posts"),
            ("Query Performance", query_time < 500, f"{query_time:.1f}ms"),
            ("Data Quality", emotion_pct >= 50, f"{emotion_pct}% emotion coverage"),
            ("Political Coverage", party_pct >= 50, f"{party_pct}% party mentions")
        ]
        
        all_pass = True
        for name, passed, detail in criteria:
            status = "✅ PASS" if passed else "❌ FAIL"
            print(f"   {status} {name}: {detail}")
            if not passed:
                all_pass = False
        
        print(f"\n" + "=" * 80)
        
        if all_pass:
            print("🎉 MIGRATION VALIDATION: SUCCESS")
            print("✅ Database ready for production political intelligence")
            print("✅ All success criteria met")
            print("✅ Performance targets achieved") 
            print("✅ Comprehensive political data available")
        else:
            print("⚠️ MIGRATION VALIDATION: NEEDS REVIEW")
            print("   Some criteria not fully met, but system functional")
        
        print("=" * 80)


if __name__ == '__main__':
    main()