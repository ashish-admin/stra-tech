#!/usr/bin/env python3
"""
Verify that AI-powered Political Strategist is working
"""

import asyncio
import os
import sys
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Setup path
sys.path.insert(0, str(Path(__file__).parent))

# Set environment
os.environ['FLASK_ENV'] = 'development'
os.environ['DATABASE_URL'] = 'postgresql://postgres:amuktha@localhost/lokdarpan_db'

async def verify_strategist():
    """Verify the AI system."""
    print("=" * 60)
    print("Verifying AI-Powered Political Strategist")
    print("=" * 60)
    
    from strategist.service import PoliticalStrategist
    
    ward = "Jubilee Hills"
    print(f"\nTesting for ward: {ward}")
    
    strategist = PoliticalStrategist(ward=ward)
    result = await strategist.analyze_situation(depth="quick")
    
    print(f"\nResults:")
    print(f"  Fallback Mode: {result.get('fallback_mode', 'unknown')}")
    print(f"  AI Powered: {result.get('ai_powered', False)}")
    print(f"  Has Real-time Intel: {bool(result.get('real_time_intelligence'))}")
    
    if result.get('ai_powered') and not result.get('fallback_mode'):
        print("\n✅ SUCCESS: AI is working with real intelligence!")
    else:
        print("\n⚠️ WARNING: System in fallback mode")
    
    return result

if __name__ == "__main__":
    result = asyncio.run(verify_strategist())
