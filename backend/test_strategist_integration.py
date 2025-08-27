#!/usr/bin/env python3
"""Test Political Strategist Integration"""

import asyncio
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from strategist.reasoner.enhanced_multi_model import EnhancedMultiModelCoordinator

async def test_strategist():
    """Test the Political Strategist with actual Perplexity integration"""
    
    coordinator = EnhancedMultiModelCoordinator()
    
    print("Testing Political Strategist with Perplexity API...")
    print("-" * 50)
    
    # Test with Jubilee Hills ward
    ward = "Jubilee Hills"
    context = {
        "ward": ward,
        "current_events": [
            "Recent infrastructure development in Jubilee Hills",
            "Local elections approaching",
            "Traffic concerns raised by residents"
        ],
        "key_issues": [
            "Infrastructure",
            "Traffic management", 
            "Public safety"
        ]
    }
    
    try:
        # Build query from context
        query = f"Analyze political situation in {ward} considering: " + ", ".join(context['key_issues'])
        
        result = await coordinator.analyze_with_perplexity(
            query=query,
            ward=ward
        )
        
        print(f"✅ Analysis successful for {ward}!")
        print(f"AI Powered: {result.get('ai_powered', False)}")
        print(f"Confidence: {result.get('confidence_score', 0)}")
        print(f"\nStrategic Analysis:")
        print(f"  Summary: {result.get('summary', 'N/A')[:200]}...")
        
        if result.get('recommendations'):
            print(f"\nRecommendations:")
            for i, rec in enumerate(result['recommendations'][:3], 1):
                print(f"  {i}. {rec}")
        
        print(f"\nFull response structure keys: {list(result.keys())}")
        
        return True
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = asyncio.run(test_strategist())
    sys.exit(0 if success else 1)
