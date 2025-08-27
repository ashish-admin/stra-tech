#!/usr/bin/env python3
"""Direct test of strategist API to see actual errors"""

import sys
import os
import traceback
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Set environment variables
os.environ['FLASK_ENV'] = 'development'
os.environ['PERPLEXITY_API_KEY'] = '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'
os.environ['DATABASE_URL'] = 'postgresql://postgres:amuktha@localhost/lokdarpan_db'
os.environ['REDIS_URL'] = 'redis://localhost:6379/0'

from app import create_app
from flask import Flask

def test_strategist():
    """Test strategist API directly"""
    app = create_app()
    
    with app.test_client() as client:
        # Login first
        print("Logging in...")
        login_resp = client.post('/api/v1/login', json={
            'username': 'ashish',
            'password': 'password'
        })
        print(f"Login status: {login_resp.status_code}")
        
        # Test strategist API
        print("\nTesting Political Strategist API...")
        print("-" * 50)
        
        try:
            resp = client.get('/api/v1/strategist/Jubilee Hills', query_string={'depth': 'quick'})
            print(f"Status Code: {resp.status_code}")
            
            if resp.status_code == 200:
                data = resp.get_json()
                print(f"✅ Success!")
                print(f"AI Powered: {data.get('ai_powered', False)}")
                print(f"Model: {data.get('model_used', 'N/A')}")
                print(f"Confidence: {data.get('confidence_score', 0)}")
            else:
                print(f"❌ Failed with status {resp.status_code}")
                print(f"Response: {resp.get_json()}")
                
        except Exception as e:
            print(f"❌ Exception: {e}")
            traceback.print_exc()

if __name__ == "__main__":
    test_strategist()
