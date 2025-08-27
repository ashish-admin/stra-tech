#!/usr/bin/env python3
"""
Minimal test to verify the API is working with just Perplexity.
"""

import os
import sys
import requests
import json

# Add paths
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

def test_minimal_endpoint():
    """Test a minimal endpoint to verify connectivity."""
    
    print("🔍 Testing Minimal API Connectivity")
    print("=" * 40)
    
    base_url = "http://localhost:5000"
    
    # Test basic status
    try:
        response = requests.get(f"{base_url}/api/v1/status", timeout=10)
        
        if response.status_code == 200:
            print("✅ Basic API connectivity working")
            data = response.json()
            print(f"📊 Status: {data.get('status', 'unknown')}")
            return True
        else:
            print(f"❌ Basic API error: {response.status_code}")
            print(f"Response: {response.text[:200]}")
            return False
            
    except Exception as e:
        print(f"❌ Connection error: {e}")
        return False

def test_direct_perplexity():
    """Test Perplexity directly without Flask."""
    
    print(f"\n🔍 Testing Direct Perplexity Integration")
    print("-" * 40)
    
    try:
        from strategist.reasoner.enhanced_multi_model import EnhancedMultiModelCoordinator
        import asyncio
        
        async def run_test():
            coordinator = EnhancedMultiModelCoordinator()
            
            print(f"Available models: {[m.name for m in coordinator.active_models]}")
            
            if not coordinator.active_models:
                print("❌ No active AI models")
                return False
            
            # Test Perplexity directly
            result = await coordinator.analyze_with_perplexity(
                "Political analysis for Jubilee Hills ward", 
                "Jubilee Hills"
            )
            
            if result and not result.get('fallback'):
                print("✅ Direct Perplexity test successful")
                print(f"📝 Strategic Summary: {result.get('strategic_summary', '')[:80]}...")
                return True
            else:
                print(f"❌ Direct Perplexity test failed")
                print(f"Error: {result.get('error', 'Unknown error')}")
                return False
        
        # Run async test
        return asyncio.run(run_test())
        
    except Exception as e:
        print(f"❌ Direct Perplexity error: {e}")
        return False

def main():
    print("🧪 LokDarpan Minimal API Test")
    print("=" * 30)
    
    # Test 1: Basic API connectivity
    api_working = test_minimal_endpoint()
    
    # Test 2: Direct Perplexity (bypass Flask)
    perplexity_working = test_direct_perplexity()
    
    print(f"\n📋 Test Results:")
    print(f"API Connectivity: {'✅ Working' if api_working else '❌ Failed'}")
    print(f"Perplexity Direct: {'✅ Working' if perplexity_working else '❌ Failed'}")
    
    if api_working and perplexity_working:
        print(f"\n✅ Both systems working - issue is in Flask integration")
    elif perplexity_working:
        print(f"\n⚠️  Perplexity works but API has Flask issues")
    else:
        print(f"\n❌ Fundamental issues need addressing")

if __name__ == "__main__":
    main()