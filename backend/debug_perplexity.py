#!/usr/bin/env python3
"""Debug Perplexity availability check."""

import os
import sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from dotenv import load_dotenv
load_dotenv()

def debug_perplexity_check():
    """Debug the Perplexity availability check."""
    
    print("🔍 Debugging Perplexity Availability Check")
    print("=" * 50)
    
    # Check environment
    perplexity_key = os.getenv('PERPLEXITY_API_KEY')
    print(f"📋 PERPLEXITY_API_KEY exists: {'✅' if perplexity_key else '❌'}")
    if perplexity_key:
        print(f"🔑 Key format: {perplexity_key[:15]}...{perplexity_key[-5:]}")
    
    # Test the check function
    try:
        from strategist.reasoner.enhanced_multi_model import EnhancedMultiModelCoordinator
        
        coordinator = EnhancedMultiModelCoordinator()
        
        if perplexity_key:
            print(f"\n🧪 Testing _check_perplexity_status directly...")
            
            is_working = coordinator._check_perplexity_status(perplexity_key)
            
            print(f"📊 Perplexity status check result: {'✅ Working' if is_working else '❌ Failed'}")
            
            # Check the models dict
            if 'perplexity' in coordinator.models:
                model_config = coordinator.models['perplexity']
                print(f"📝 Model available: {model_config.available}")
                print(f"🔧 Model name: {model_config.name}")
                print(f"🌐 Endpoint: {model_config.endpoint}")
                print(f"🔑 API key format: {model_config.api_key[:15]}...{model_config.api_key[-5:] if model_config.api_key else 'None'}")
            else:
                print("❌ Perplexity model not in models dict")
                
            print(f"🎯 Active models: {[m.name for m in coordinator.active_models]}")
            
        else:
            print("❌ No Perplexity API key available")
            
    except Exception as e:
        print(f"❌ Debug error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    debug_perplexity_check()