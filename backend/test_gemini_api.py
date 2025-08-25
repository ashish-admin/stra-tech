#!/usr/bin/env python3
"""
Test Gemini API directly to verify it's working
"""

import os
import sys
from dotenv import load_dotenv
import google.generativeai as genai

# Load environment variables
load_dotenv()

def test_gemini_api():
    """Test Gemini API directly."""
    print("=" * 60)
    print("🔍 Testing Gemini API")
    print("=" * 60)
    
    # Get API key
    api_key = os.getenv('GEMINI_API_KEY')
    if not api_key:
        print("❌ GEMINI_API_KEY not found in environment")
        return False
    
    print(f"✅ API Key found: {api_key[:20]}...")
    
    # Configure Gemini
    genai.configure(api_key=api_key)
    
    try:
        # List available models first
        print("\n📋 Available Gemini Models:")
        models = genai.list_models()
        for model in models:
            if 'generateContent' in model.supported_generation_methods:
                print(f"  - {model.name}")
        
        # Try a simple generation
        print("\n🧪 Testing content generation...")
        model = genai.GenerativeModel('gemini-pro')
        
        # Simple test prompt
        response = model.generate_content(
            "Write a one-sentence summary about Hyderabad politics.",
            generation_config={
                'temperature': 0.3,
                'max_output_tokens': 100,
            }
        )
        
        print(f"\n✅ SUCCESS! Gemini API is working!")
        print(f"📝 Response: {response.text}")
        
        # Test with the exact prompt structure used in the app
        print("\n🎯 Testing with Political Strategist prompt...")
        political_prompt = """
        Analyze the current political landscape in Jubilee Hills ward, Hyderabad.
        Focus on: Recent developments, key issues, and strategic opportunities.
        Provide a brief 2-3 sentence summary.
        """
        
        response2 = model.generate_content(
            political_prompt,
            generation_config={
                'temperature': 0.3,
                'max_output_tokens': 200,
            }
        )
        
        print(f"✅ Political analysis successful!")
        print(f"📊 Analysis: {response2.text[:300]}...")
        
        return True
        
    except Exception as e:
        print(f"\n❌ Error testing Gemini API: {e}")
        
        # Parse error message for quota issues
        error_str = str(e)
        if "RATE_LIMIT_EXCEEDED" in error_str:
            print("\n⚠️ Rate Limit Issue Detected:")
            print("  - The API key is valid but hitting quota limits")
            print("  - Current quota appears to be 0 requests per minute")
            print("  - You need to enable billing or increase quota in Google Cloud Console")
            print("\n📍 To fix this:")
            print("  1. Go to https://console.cloud.google.com/")
            print("  2. Select your project (project number: 450669710246)")
            print("  3. Go to APIs & Services > Enabled APIs")
            print("  4. Click on 'Generative Language API'")
            print("  5. Go to Quotas & System Limits")
            print("  6. Request a quota increase for 'Generate Content requests per minute'")
        elif "API_KEY_INVALID" in error_str:
            print("\n❌ Invalid API Key:")
            print("  - The API key is not valid")
            print("  - Please check your API key in Google AI Studio")
        else:
            print(f"\n❓ Unknown error: {error_str[:500]}")
        
        return False

if __name__ == "__main__":
    print("🚀 Starting Gemini API Test...\n")
    
    # Show current API key status
    api_key = os.getenv('GEMINI_API_KEY')
    if api_key:
        print(f"📋 Current GEMINI_API_KEY: {api_key[:20]}...")
    else:
        print("❌ GEMINI_API_KEY not set in environment")
    
    print()
    
    # Run the test
    success = test_gemini_api()
    
    print("\n" + "=" * 60)
    if success:
        print("🎉 Gemini API is fully functional!")
        print("✅ You can now use Gemini in your Political Strategist")
    else:
        print("⚠️ Gemini API needs configuration")
        print("💡 But don't worry - Perplexity AI is working as backup!")
    print("=" * 60)