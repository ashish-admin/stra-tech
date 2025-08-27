#!/usr/bin/env python3
"""
Final verification that the LokDarpan system is delivering real AI-powered political intelligence.
"""

import os
import asyncio
import json
from datetime import datetime

# Set environment variables
os.environ['PERPLEXITY_API_KEY'] = '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'
os.environ['DATABASE_URL'] = 'postgresql://postgres:amuktha@localhost/lokdarpan_db'

# Import our enhanced coordinator directly
from strategist.reasoner.enhanced_multi_model import EnhancedMultiModelCoordinator


async def verify_ai_intelligence():
    """Verify that we're getting real AI-powered political intelligence."""
    
    print("=" * 80)
    print("VERIFYING AI-POWERED POLITICAL INTELLIGENCE")
    print("=" * 80)
    
    coordinator = EnhancedMultiModelCoordinator()
    
    # Check available models
    print(f"\n✅ Available AI Models: {[m.name for m in coordinator.active_models]}")
    
    # Test with a real political query
    print("\n📊 Executing Strategic Analysis for Jubilee Hills Ward...")
    
    result = await coordinator.coordinate_analysis(
        query="What are the key political issues, voter sentiments, and strategic opportunities in Jubilee Hills?",
        ward="Jubilee Hills",
        depth="standard",
        context={
            "recent_events": "By-elections announced",
            "parties": ["Congress", "BRS", "BJP", "AIMIM"]
        }
    )
    
    print("\n" + "=" * 40)
    print("INTELLIGENCE REPORT")
    print("=" * 40)
    
    # Check if we got real intelligence
    if result.get('real_time_intelligence'):
        print("\n🎯 REAL-TIME POLITICAL INTELLIGENCE ACTIVE!")
        print("-" * 40)
        print("Intelligence Preview:")
        print(result['real_time_intelligence'][:500])
        print("...")
        
        print(f"\n📈 Confidence Score: {result.get('confidence_score', 0):.2%}")
        print(f"🤖 AI Models Used: {', '.join(result.get('models_consulted', []))}")
        print(f"✅ Multi-Model Consensus: {result.get('multi_model_consensus', 0):.2%}")
        
        if result.get('strategic_summary'):
            print("\n📋 Strategic Summary:")
            print(result['strategic_summary'][:400])
        
        if result.get('key_findings'):
            print(f"\n🔍 Key Findings ({len(result.get('key_findings', []))} insights):")
            for i, finding in enumerate(result.get('key_findings', [])[:3], 1):
                print(f"   {i}. {finding}")
        
        if result.get('opportunities'):
            print(f"\n💡 Strategic Opportunities ({len(result.get('opportunities', []))} identified):")
            for i, opp in enumerate(result.get('opportunities', [])[:3], 1):
                print(f"   {i}. {opp}")
        
        if result.get('threats'):
            print(f"\n⚠️ Threats & Risks ({len(result.get('threats', []))} identified):")
            for i, threat in enumerate(result.get('threats', [])[:3], 1):
                print(f"   {i}. {threat}")
        
        if result.get('recommended_actions'):
            print(f"\n🎯 Recommended Actions ({len(result.get('recommended_actions', []))} actions):")
            for i, action in enumerate(result.get('recommended_actions', [])[:3], 1):
                if isinstance(action, dict):
                    print(f"   {i}. {action.get('action', action)}")
                else:
                    print(f"   {i}. {action}")
        
        print("\n" + "=" * 80)
        print("✅ SUCCESS: LokDarpan is delivering REAL AI-powered political intelligence!")
        print("The system is now harnessing the full power of multi-model AI orchestration.")
        print("=" * 80)
        
        return True
    
    elif result.get('status') == 'fallback_mode':
        print("\n⚠️ FALLBACK MODE ACTIVE")
        print("The system is using templates, not real AI intelligence.")
        print(f"Reason: {result.get('fallback_notice', 'Unknown')}")
        return False
    
    else:
        print("\n❌ PARTIAL SUCCESS")
        print(f"Status: {result.get('status', 'unknown')}")
        print(f"Models Consulted: {result.get('models_consulted', [])}")
        if result.get('strategic_summary'):
            print(f"Summary Available: {result['strategic_summary'][:200]}...")
        return False


if __name__ == "__main__":
    print(f"\n🕐 Test Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    # Run the verification
    success = asyncio.run(verify_ai_intelligence())
    
    if success:
        print("\n🎉 Verification Complete: AI Intelligence System OPERATIONAL")
    else:
        print("\n⚠️ Verification Complete: System needs attention")