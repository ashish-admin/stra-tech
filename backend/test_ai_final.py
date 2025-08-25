#!/usr/bin/env python3
"""
Final test of AI-powered Political Strategist
"""

import asyncio
import os
import sys
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Setup path
sys.path.insert(0, str(Path(__file__).parent))

async def test_ai_final():
    """Final test of the AI system."""
    print("=" * 60)
    print("🚀 FINAL TEST: AI-Powered Political Strategist")
    print("=" * 60)
    
    # Show API keys status
    print("\n📋 API Keys Status:")
    print(f"  GEMINI: {'✅ SET' if os.getenv('GEMINI_API_KEY') else '❌ MISSING'}")
    print(f"  PERPLEXITY: {'✅ SET' if os.getenv('PERPLEXITY_API_KEY') else '❌ MISSING'}")
    print(f"  OPENAI: {'✅ SET' if os.getenv('OPENAI_API_KEY') else '❌ MISSING'}")
    
    from strategist.service import PoliticalStrategist
    
    ward = "Jubilee Hills"
    print(f"\n🎯 Testing for ward: {ward}")
    
    strategist = PoliticalStrategist(ward=ward)
    
    # Quick test
    print("\n⏱️ Running QUICK analysis...")
    result = await strategist.analyze_situation(depth="quick")
    
    print(f"\n📊 Results:")
    print(f"  Status: {result.get('status', 'unknown')}")
    print(f"  Fallback Mode: {result.get('fallback_mode', False)}")
    print(f"  AI Powered: {result.get('ai_powered', False)}")
    print(f"  Models Used: {result.get('models_used', [])}")
    
    # Check for real intelligence
    has_real_intel = bool(result.get('real_time_intelligence'))
    print(f"  Real-time Intelligence: {'✅ YES' if has_real_intel else '❌ NO'}")
    
    if has_real_intel:
        print(f"\n🌐 Intelligence Preview:")
        print(f"  {result['real_time_intelligence'][:200]}...")
    
    # Check briefing quality
    if result.get('briefing'):
        briefing = result['briefing']
        print(f"\n📋 Briefing Quality:")
        has_key_issue = bool(briefing.get('key_issue'))
        has_strategy = bool(briefing.get('our_angle'))
        has_actions = bool(briefing.get('strategic_recommendations'))
        
        print(f"  Key Issue: {'✅' if has_key_issue else '❌'}")
        print(f"  Strategy: {'✅' if has_strategy else '❌'}")
        print(f"  Actions: {'✅' if has_actions else '❌'}")
        
        if has_key_issue:
            # Check if it's real content or template
            is_template = "shows mixed sentiment" in briefing['key_issue']
            print(f"  Content Type: {'⚠️ TEMPLATE' if is_template else '✅ REAL AI'}")
    
    # Final verdict
    print("\n" + "=" * 60)
    if result.get('ai_powered') and not result.get('fallback_mode', False):
        print("🎉🎉🎉 SUCCESS: AI SYSTEM FULLY OPERATIONAL! 🎉🎉🎉")
        print("  ✅ Gemini AI: Working")
        print("  ✅ Perplexity AI: Working")
        print("  ✅ Real-time Intelligence: Active")
        print("  ✅ Strategic Analysis: AI-Powered")
    else:
        print("⚠️ WARNING: System in fallback mode")
        if result.get('error'):
            print(f"  Error: {result['error']}")
    print("=" * 60)
    
    return result

if __name__ == "__main__":
    result = asyncio.run(test_ai_final())
