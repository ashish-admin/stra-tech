#!/usr/bin/env python3
"""
Test script to validate the Political Strategist fix with Perplexity integration.
"""

import os
import sys
import asyncio
from datetime import datetime

# Add the backend directory to the path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Load environment variables
from dotenv import load_dotenv
load_dotenv()

async def test_political_strategist():
    """Test the updated Political Strategist service."""
    print("🚀 Testing Updated Political Strategist with Perplexity Integration")
    print("=" * 65)
    
    try:
        # Import the strategist components
        from strategist.service import PoliticalStrategist
        from strategist.reasoner.enhanced_multi_model import EnhancedMultiModelCoordinator
        
        # Test 1: Enhanced Multi-Model Coordinator
        print("\n🔍 Test 1: Enhanced Multi-Model Coordinator Initialization")
        coordinator = EnhancedMultiModelCoordinator()
        
        print(f"Available models: {[m.name for m in coordinator.active_models]}")
        print(f"Total active models: {len(coordinator.active_models)}")
        
        if len(coordinator.active_models) == 0:
            print("❌ FAIL: No AI models are available")
            return False
        
        # Test 2: Direct Perplexity Analysis
        print("\n🔍 Test 2: Direct Perplexity Analysis")
        test_query = "Political analysis for Jubilee Hills ward"
        test_ward = "Jubilee Hills"
        
        perplexity_result = await coordinator.analyze_with_perplexity(test_query, test_ward)
        
        if perplexity_result.get('fallback'):
            print(f"❌ FAIL: Perplexity analysis in fallback mode")
            print(f"Error: {perplexity_result.get('error', 'Unknown error')}")
            return False
        else:
            print("✅ SUCCESS: Perplexity analysis working")
            print(f"📝 Strategic Summary: {perplexity_result.get('strategic_summary', '')[:100]}...")
            print(f"📊 Key Findings: {len(perplexity_result.get('key_findings', []))} findings")
            print(f"🎯 Opportunities: {len(perplexity_result.get('opportunities', []))} opportunities")
            print(f"⚠️  Threats: {len(perplexity_result.get('threats', []))} threats")
            print(f"💡 Actions: {len(perplexity_result.get('recommended_actions', []))} recommendations")
        
        # Test 3: Coordinated Analysis
        print("\n🔍 Test 3: Coordinated Multi-Model Analysis")
        coordinated_result = await coordinator.coordinate_analysis(
            query=test_query,
            ward=test_ward,
            depth="standard"
        )
        
        if coordinated_result.get('fallback_mode'):
            print("❌ FAIL: Coordinated analysis in fallback mode")
            return False
        else:
            print("✅ SUCCESS: Coordinated analysis working")
            print(f"🤖 Model Used: {coordinated_result.get('model_used', 'unknown')}")
            print(f"🔗 Models Consulted: {coordinated_result.get('models_consulted', [])}")
            print(f"🎯 Confidence Score: {coordinated_result.get('confidence_score', 0)}")
            print(f"🚀 AI Powered: {coordinated_result.get('ai_powered', False)}")
        
        # Test 4: Full Political Strategist Service
        print("\n🔍 Test 4: Full Political Strategist Service")
        strategist = PoliticalStrategist(ward=test_ward, context_mode="neutral")
        
        full_result = await strategist.analyze_situation(depth="standard")
        
        if full_result.get('fallback_mode'):
            print("❌ FAIL: Full strategist in fallback mode")
            print(f"Error: {full_result.get('error', 'Unknown error')}")
            return False
        else:
            print("✅ SUCCESS: Full Political Strategist working!")
            print(f"🤖 AI Powered: {full_result.get('ai_powered', False)}")
            print(f"📊 Confidence: {full_result.get('confidence_score', 0)}")
            
            # Show sample of strategic briefing
            if 'briefing' in full_result:
                briefing = full_result['briefing']
                print(f"📋 Key Issue: {briefing.get('key_issue', 'N/A')[:80]}...")
                print(f"🎯 Our Angle: {briefing.get('our_angle', 'N/A')[:80]}...")
                print(f"⚡ Strategic Recommendations: {len(briefing.get('strategic_recommendations', []))}")
        
        print(f"\n✅ ALL TESTS PASSED!")
        print(f"🎉 Political Strategist is now fully operational with Perplexity AI")
        return True
        
    except Exception as e:
        print(f"❌ CRITICAL ERROR: {e}")
        import traceback
        traceback.print_exc()
        return False

async def test_api_endpoint():
    """Test the API endpoint directly."""
    print(f"\n🌐 Testing API Endpoint Integration")
    print("-" * 40)
    
    try:
        import requests
        import json
        
        # Test the strategist API endpoint
        url = "http://localhost:5000/api/v1/strategist/Jubilee%20Hills"
        params = {"depth": "standard", "context": "neutral"}
        
        print(f"📡 Making request to: {url}")
        
        # Note: This will only work if the Flask server is running
        response = requests.get(url, params=params, timeout=30)
        
        if response.status_code == 200:
            data = response.json()
            
            # Check if it's AI-powered or fallback
            if data.get('ai_powered') or data.get('model_used') == 'perplexity':
                print("✅ API SUCCESS: Returning AI-powered analysis")
                print(f"🤖 Model: {data.get('model_used', 'unknown')}")
                print(f"📊 Confidence: {data.get('confidence_score', 0)}")
            elif data.get('fallback_notice') or data.get('error'):
                print("⚠️  API WARNING: Still in fallback mode")
                print(f"Notice: {data.get('fallback_notice', data.get('error', 'Unknown issue'))}")
            else:
                print("✅ API SUCCESS: Analysis returned (checking content...)")
                print(f"Response keys: {list(data.keys())}")
        else:
            print(f"❌ API ERROR: {response.status_code}")
            print(f"Response: {response.text[:200]}")
            
    except requests.exceptions.ConnectionError:
        print("⚠️  API TEST SKIPPED: Flask server not running")
        print("   Start the server with: flask run")
    except Exception as e:
        print(f"❌ API TEST ERROR: {e}")

def main():
    print("🔧 LokDarpan Political Strategist Fix Validation")
    print("=" * 50)
    
    # Run async tests
    success = asyncio.run(test_political_strategist())
    
    if success:
        # Test API integration if successful
        asyncio.run(test_api_endpoint())
        
        print(f"\n🎯 SUMMARY")
        print(f"✅ Political Strategist service restored")
        print(f"✅ Perplexity AI integration working")
        print(f"✅ Real-time political intelligence available")
        print(f"✅ Comprehensive strategic analysis operational")
        
        print(f"\n🚀 Next Steps:")
        print(f"1. Start the Flask server: cd backend && flask run")
        print(f"2. Start the frontend: cd frontend && npm run dev")
        print(f"3. Test in browser: http://localhost:5173")
        print(f"4. Navigate to Political Strategist section")
        print(f"5. Verify AI-powered analysis is displayed")
    else:
        print(f"\n❌ FAILED: Issues remain with Political Strategist")
        print(f"Check the error messages above for troubleshooting")

if __name__ == "__main__":
    main()