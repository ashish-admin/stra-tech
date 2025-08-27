#!/usr/bin/env python3
"""
Direct API test to diagnose the strategist API issues.
"""

import requests
import json
import time

def test_strategist_api():
    """Test the strategist API endpoint with proper authentication."""
    
    print("🔍 Testing LokDarpan Political Strategist API")
    print("=" * 50)
    
    base_url = "http://localhost:5000"
    
    # Step 1: Login
    print("📧 Step 1: Authentication")
    login_data = {"username": "ashish", "password": "password"}
    
    session = requests.Session()
    
    try:
        login_response = session.post(f"{base_url}/api/v1/login", json=login_data)
        
        if login_response.status_code == 200:
            print("✅ Login successful")
            user_data = login_response.json()
            print(f"👤 User: {user_data.get('user', {}).get('username', 'unknown')}")
        else:
            print(f"❌ Login failed: {login_response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ Login error: {e}")
        return False
    
    # Step 2: Test status endpoint first
    print(f"\n🔍 Step 2: Testing Status Endpoint")
    try:
        status_response = session.get(f"{base_url}/api/v1/strategist/status")
        if status_response.status_code == 200:
            status_data = status_response.json()
            print(f"✅ Status: {status_data.get('status', 'unknown')}")
            print(f"🔧 Mode: {status_data.get('mode', 'unknown')}")
        else:
            print(f"❌ Status failed: {status_response.status_code}")
            
    except Exception as e:
        print(f"❌ Status error: {e}")
    
    # Step 3: Test strategist analysis endpoint
    print(f"\n🎯 Step 3: Testing Political Strategist Analysis")
    
    wards_to_test = ["Jubilee Hills", "Banjara Hills", "Madhapur"]
    
    for ward in wards_to_test:
        print(f"\n📊 Testing ward: {ward}")
        
        try:
            strategist_url = f"{base_url}/api/v1/strategist/{ward}"
            params = {"depth": "standard", "context": "neutral"}
            
            print(f"🌐 URL: {strategist_url}")
            print(f"📋 Params: {params}")
            
            start_time = time.time()
            response = session.get(strategist_url, params=params, timeout=120)
            duration = time.time() - start_time
            
            print(f"⏱️  Response time: {duration:.2f}s")
            print(f"📈 Status code: {response.status_code}")
            
            if response.status_code == 200:
                try:
                    data = response.json()
                    
                    # Check key indicators of success
                    ai_powered = data.get('ai_powered', False)
                    model_used = data.get('model_used', 'unknown')
                    confidence = data.get('confidence_score', 0)
                    status = data.get('status', 'unknown')
                    
                    print(f"🤖 AI Powered: {ai_powered}")
                    print(f"🧠 Model Used: {model_used}")
                    print(f"📊 Confidence: {confidence}")
                    print(f"✅ Status: {status}")
                    
                    if ai_powered and model_used != 'unknown':
                        print(f"🎉 SUCCESS: {ward} analysis working with AI!")
                        
                        # Show sample of analysis
                        briefing = data.get('briefing', {})
                        if briefing:
                            print(f"🗂️  Key Issue: {briefing.get('key_issue', 'N/A')[:80]}...")
                            
                        intelligence = data.get('intelligence', {})
                        if intelligence:
                            findings = intelligence.get('key_findings', [])
                            print(f"🔍 Findings: {len(findings)} key insights")
                            opportunities = intelligence.get('opportunities', [])
                            print(f"🎯 Opportunities: {len(opportunities)} strategic opportunities")
                            
                        return True
                    else:
                        print(f"⚠️  WARNING: {ward} returned non-AI analysis")
                        if 'error' in data:
                            print(f"❌ Error: {data['error']}")
                        if 'fallback_notice' in data:
                            print(f"📝 Notice: {data['fallback_notice']}")
                            
                except json.JSONDecodeError:
                    print(f"❌ Invalid JSON response")
                    print(f"📄 Raw response: {response.text[:200]}...")
                    
            else:
                print(f"❌ API error: {response.status_code}")
                print(f"📄 Response: {response.text[:200]}...")
                
        except Exception as e:
            print(f"❌ Request error for {ward}: {e}")
            
    return False

def main():
    success = test_strategist_api()
    
    if success:
        print(f"\n🎉 OVERALL SUCCESS")
        print(f"✅ Political Strategist API is working with AI!")
        print(f"✅ Real-time political intelligence available") 
        print(f"✅ Frontend can now display AI-powered analysis")
    else:
        print(f"\n❌ OVERALL FAILURE")
        print(f"❌ Political Strategist API needs troubleshooting")
        print(f"💡 Check server logs for detailed error messages")

if __name__ == "__main__":
    main()