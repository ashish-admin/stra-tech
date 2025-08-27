#!/usr/bin/env python3
"""Test the Enhanced Multi-Model Coordinator directly."""

import os
import sys
import asyncio
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from dotenv import load_dotenv
load_dotenv()

async def test_coordinator():
    """Test the coordinator directly."""
    
    print("🚀 Testing Enhanced Multi-Model Coordinator")
    print("=" * 50)
    
    try:
        from strategist.reasoner.enhanced_multi_model import EnhancedMultiModelCoordinator
        
        # Create coordinator
        coordinator = EnhancedMultiModelCoordinator()
        
        print(f"🤖 Active models: {[m.name for m in coordinator.active_models]}")
        print(f"📊 Total active models: {len(coordinator.active_models)}")
        
        if not coordinator.active_models:
            print("❌ CRITICAL: No active models available!")
            return False
        
        # Test coordinated analysis
        print(f"\n🎯 Testing Coordinated Analysis...")
        
        query = "Comprehensive political intelligence analysis for Jubilee Hills ward in Hyderabad"
        ward = "Jubilee Hills"
        
        result = await coordinator.coordinate_analysis(
            query=query,
            ward=ward,
            depth="standard",
            context={
                'strategic_context': 'neutral',
                'analysis_type': 'ward_intelligence',
                'region': 'hyderabad'
            }
        )
        
        print(f"📋 Analysis Results:")
        print(f"🔄 Status: {result.get('status', 'unknown')}")
        print(f"🤖 Model Used: {result.get('model_used', 'unknown')}")
        print(f"✅ AI Powered: {result.get('ai_powered', False)}")
        print(f"🎯 Confidence: {result.get('confidence_score', 0)}")
        print(f"❌ Fallback Mode: {result.get('fallback_mode', True)}")
        
        if result.get('ai_powered') and not result.get('fallback_mode'):
            print(f"\n🎉 SUCCESS: AI-powered analysis working!")
            print(f"📝 Strategic Summary: {result.get('strategic_summary', '')[:100]}...")
            
            intelligence = result.get('intelligence', '')
            if intelligence:
                print(f"📊 Intelligence: {intelligence[:150]}...")
            
            findings = result.get('key_findings', [])
            print(f"🔍 Key Findings: {len(findings)} insights")
            
            opportunities = result.get('opportunities', [])  
            print(f"🎯 Opportunities: {len(opportunities)} strategic opportunities")
            
            actions = result.get('recommended_actions', [])
            print(f"💡 Recommended Actions: {len(actions)} recommendations")
            
            return True
        else:
            print(f"\n❌ FAILURE: Analysis in fallback mode")
            if 'error' in result:
                print(f"Error: {result['error']}")
            return False
            
    except Exception as e:
        print(f"❌ CRITICAL ERROR: {e}")
        import traceback
        traceback.print_exc()
        return False

def main():
    success = asyncio.run(test_coordinator())
    
    if success:
        print(f"\n✅ COORDINATOR TEST PASSED!")
        print(f"🎯 Enhanced Multi-Model Coordinator is working with Perplexity")
        print(f"🔧 Ready to integrate with Flask API")
    else:
        print(f"\n❌ COORDINATOR TEST FAILED!")
        print(f"🔧 Need to troubleshoot coordinator issues")

if __name__ == "__main__":
    main()