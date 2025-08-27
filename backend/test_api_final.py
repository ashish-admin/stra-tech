#!/usr/bin/env python3
"""Test Political Strategist API endpoint directly"""

import requests
import json
import sys

def test_strategist_api():
    """Test the Political Strategist API endpoint"""
    
    # First login to get session
    print("Logging in...")
    login_data = {
        "username": "ashish",
        "password": "password"
    }
    
    session = requests.Session()
    login_resp = session.post(
        "http://localhost:5000/api/v1/login",
        json=login_data
    )
    
    if login_resp.status_code != 200:
        print(f"❌ Login failed: {login_resp.status_code}")
        return False
    
    print("✅ Logged in successfully")
    
    # Now test strategist endpoint
    print("\nTesting Political Strategist API...")
    print("-" * 50)
    
    ward = "Jubilee Hills"
    url = f"http://localhost:5000/api/v1/strategist/{ward}"
    params = {"depth": "quick"}
    
    resp = session.get(url, params=params)
    
    print(f"Status Code: {resp.status_code}")
    
    if resp.status_code == 200:
        data = resp.json()
        print(f"✅ API Response successful!")
        print(f"AI Powered: {data.get('ai_powered', False)}")
        print(f"Model Used: {data.get('model_used', 'N/A')}")
        print(f"Confidence: {data.get('confidence_score', 0)}")
        print(f"Status: {data.get('status', 'N/A')}")
        
        if data.get('briefing'):
            print(f"\nBriefing:")
            print(f"  Key Issue: {data['briefing'].get('key_issue', 'N/A')[:100]}...")
            
        if data.get('intelligence'):
            print(f"\nIntelligence:")
            print(f"  Summary: {data['intelligence'].get('strategic_summary', 'N/A')[:100]}...")
            
        print(f"\nFull response keys: {list(data.keys())}")
        return True
    else:
        print(f"❌ API failed with status {resp.status_code}")
        print(f"Response: {resp.text[:500]}")
        return False

if __name__ == "__main__":
    success = test_strategist_api()
    sys.exit(0 if success else 1)