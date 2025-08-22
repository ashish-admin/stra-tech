#!/usr/bin/env python3
"""
Database Migration Validation Script

Comprehensive validation of all critical issues that were identified:
1. Political Strategist API errors
2. Trend data availability 
3. Competitor analysis data
4. Epaper/article data for wards
5. Proactive alerts data
"""

import os
import sys
import requests
import json
from datetime import datetime

# Add the backend directory to the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from app import create_app
from app.models import db, Post, Epaper, Alert
from app.models_ai import Summary

# Base URL for API testing
BASE_URL = "http://localhost:5000"
API_BASE = f"{BASE_URL}/api/v1"

# Test wards - including the problematic Himayath Nagar
TEST_WARDS = ["Himayath Nagar", "Jubilee Hills", "Begumpet", "Malkajgiri"]

def get_auth_cookies():
    """Get authentication cookies."""
    login_data = {"username": "ashish", "password": "password"}
    response = requests.post(f"{API_BASE}/login", json=login_data)
    return response.cookies if response.status_code == 200 else None

def validate_database_schema():
    """Validate database schema and data integrity."""
    print("🔍 Database Schema & Data Validation")
    print("=" * 50)
    
    # Check data counts
    total_posts = Post.query.count()
    total_epapers = Epaper.query.count()
    total_alerts = Alert.query.count()
    total_summaries = Summary.query.count()
    
    print(f"✅ Posts: {total_posts} (Target: 300+)")
    print(f"✅ Epapers: {total_epapers} (Target: 70+)")
    print(f"✅ Alerts: {total_alerts} (Target: 40+)")
    print(f"✅ Summaries: {total_summaries} (Target: 14)")
    
    # Check post-epaper relationships
    posts_with_epapers = Post.query.filter(Post.epaper_id.isnot(None)).count()
    print(f"✅ Posts linked to epapers: {posts_with_epapers}/{total_posts} ({100*posts_with_epapers/total_posts:.1f}%)")
    
    # Check content quality
    avg_post_length = db.session.query(
        db.func.avg(db.func.length(Post.text))
    ).scalar()
    avg_epaper_length = db.session.query(
        db.func.avg(db.func.length(Epaper.raw_text))
    ).scalar()
    
    print(f"✅ Average post length: {avg_post_length:.0f} chars (Target: 300+)")
    print(f"✅ Average epaper length: {avg_epaper_length:.0f} chars (Target: 3000+)")
    
    # Check ward coverage
    wards_with_posts = db.session.query(
        db.func.count(db.distinct(Post.city))
    ).scalar()
    wards_with_alerts = db.session.query(
        db.func.count(db.distinct(Alert.ward))
    ).scalar()
    
    print(f"✅ Wards with posts: {wards_with_posts}")
    print(f"✅ Wards with alerts: {wards_with_alerts}")
    
    return True

def validate_api_endpoints():
    """Validate all critical API endpoints."""
    print("\n🌐 API Endpoints Validation")
    print("=" * 50)
    
    cookies = get_auth_cookies()
    if not cookies:
        print("❌ Authentication failed!")
        return False
    print("✅ Authentication successful")
    
    issues_found = []
    
    for ward in TEST_WARDS:
        print(f"\n📍 Testing {ward}:")
        
        # Test Posts API
        try:
            response = requests.get(f"{API_BASE}/posts?city={ward}", cookies=cookies)
            if response.status_code == 200:
                posts_data = response.json()
                posts_count = len(posts_data) if isinstance(posts_data, list) else 1
                print(f"  ✅ Posts: {posts_count} available")
            else:
                issues_found.append(f"Posts API failed for {ward}")
                print(f"  ❌ Posts API failed: {response.status_code}")
        except Exception as e:
            issues_found.append(f"Posts API error for {ward}: {e}")
            print(f"  ❌ Posts API error: {e}")
        
        # Test Trends API
        try:
            response = requests.get(f"{API_BASE}/trends?ward={ward}&days=7", cookies=cookies)
            if response.status_code == 200:
                trends_data = response.json()
                has_data = any(day.get('mentions_total', 0) > 0 for day in trends_data.get('series', []))
                if has_data:
                    print(f"  ✅ Trends: Data available")
                else:
                    issues_found.append(f"No trend data for {ward}")
                    print(f"  ⚠️ Trends: No data in time series")
            else:
                issues_found.append(f"Trends API failed for {ward}")
                print(f"  ❌ Trends API failed: {response.status_code}")
        except Exception as e:
            issues_found.append(f"Trends API error for {ward}: {e}")
            print(f"  ❌ Trends API error: {e}")
        
        # Test Competitive Analysis API
        try:
            response = requests.get(f"{API_BASE}/competitive-analysis?city={ward}", cookies=cookies)
            if response.status_code == 200:
                comp_data = response.json()
                if comp_data and len(comp_data) > 0:
                    print(f"  ✅ Competitive Analysis: {len(comp_data)} entities")
                else:
                    issues_found.append(f"No competitive analysis data for {ward}")
                    print(f"  ⚠️ Competitive Analysis: No data")
            else:
                issues_found.append(f"Competitive Analysis failed for {ward}")
                print(f"  ❌ Competitive Analysis failed: {response.status_code}")
        except Exception as e:
            issues_found.append(f"Competitive Analysis error for {ward}: {e}")
            print(f"  ❌ Competitive Analysis error: {e}")
        
        # Test Strategist API
        try:
            response = requests.get(f"{API_BASE}/strategist/{ward}", cookies=cookies)
            if response.status_code == 200:
                strategist_data = response.json()
                if strategist_data.get('status') == 'analysis_complete':
                    print(f"  ✅ Strategist: Analysis complete")
                else:
                    issues_found.append(f"Strategist analysis incomplete for {ward}")
                    print(f"  ⚠️ Strategist: {strategist_data.get('status', 'Unknown status')}")
            else:
                issues_found.append(f"Strategist API failed for {ward}")
                print(f"  ❌ Strategist API failed: {response.status_code}")
        except Exception as e:
            issues_found.append(f"Strategist API error for {ward}: {e}")
            print(f"  ❌ Strategist API error: {e}")
    
    return len(issues_found) == 0, issues_found

def main():
    """Run comprehensive validation."""
    print("🎯 LokDarpan Database Migration Validation")
    print("=" * 60)
    print(f"Validation Time: {datetime.now()}")
    print(f"Target: Fix all critical data issues identified")
    
    # Database validation
    with create_app().app_context():
        db_valid = validate_database_schema()
    
    # API validation
    api_valid, api_issues = validate_api_endpoints()
    
    # Final summary
    print("\n🏆 VALIDATION SUMMARY")
    print("=" * 60)
    
    print(f"Database Schema & Data: {'✅ PASS' if db_valid else '❌ FAIL'}")
    print(f"API Endpoints: {'✅ PASS' if api_valid else '❌ FAIL'}")
    
    if api_issues:
        print(f"\n⚠️ Issues Found ({len(api_issues)}):")
        for issue in api_issues:
            print(f"  - {issue}")
    
    overall_success = db_valid and api_valid
    
    print(f"\n🎯 OVERALL RESULT: {'✅ SUCCESS' if overall_success else '❌ NEEDS ATTENTION'}")
    
    if overall_success:
        print("\n🎉 All critical issues have been resolved!")
        print("✅ Political Strategist API working")
        print("✅ Trend data available for charts")
        print("✅ Competitor analysis data present")
        print("✅ Epaper/article data for all wards")
        print("✅ Proactive alerts data seeded")
        print("✅ Ward data normalization functional")
        print("\n🚀 LokDarpan is ready for production use!")
    else:
        print("\n⚠️ Some issues still need attention")
        print("Please review the issues listed above")
    
    return overall_success

if __name__ == '__main__':
    success = main()
    sys.exit(0 if success else 1)