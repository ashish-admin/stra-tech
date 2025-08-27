#!/usr/bin/env python3
"""Test Enhanced AI Integration directly"""

import asyncio
import os
import sys
from pathlib import Path

# Add backend to path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

# Set API key
os.environ['PERPLEXITY_API_KEY'] = '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'

from strategist.reasoner.enhanced_multi_model import EnhancedMultiModelCoordinator

async def test_direct():
    """Test the coordinator directly"""
    print("Testing Enhanced Multi-Model Coordinator...")
    print("-" * 50)
    
    coordinator = EnhancedMultiModelCoordinator()
    
    ward = "Jubilee Hills"
    query = f"Provide political strategic analysis for {ward} ward in Hyderabad"
    
    try:
        # Call the main coordinate_analysis method
        result = await coordinator.coordinate_analysis(
            query=query,
            ward=ward,
            context={"depth": "quick"}
        )
        
        print(f"✅ Analysis successful!")
        print(f"AI Powered: {result.get('ai_powered', False)}")
        print(f"Model Used: {result.get('model_used', 'N/A')}")
        print(f"Confidence: {result.get('confidence_score', 0)}")
        print(f"Status: {result.get('status', 'N/A')}")
        
        print(f"\nStrategic Summary:")
        print(f"  {result.get('strategic_summary', 'N/A')[:200]}...")
        
        print(f"\nKey Findings:")
        for finding in result.get('key_findings', [])[:3]:
            print(f"  • {finding}")
            
        print(f"\nRecommended Actions:")
        for action in result.get('recommended_actions', [])[:2]:
            if isinstance(action, dict):
                print(f"  • {action.get('action', action)}")
            else:
                print(f"  • {action}")
        
        print(f"\nFull response keys: {list(result.keys())}")
        return True
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = asyncio.run(test_direct())
    sys.exit(0 if success else 1)
