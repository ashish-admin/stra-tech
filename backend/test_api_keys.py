#!/usr/bin/env python3
"""
Test if API keys are properly loaded in the environment
"""

import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

print("Checking API Keys Configuration:")
print("=" * 50)

# Check Gemini API Key
gemini_key = os.getenv('GEMINI_API_KEY')
if gemini_key:
    print(f"✅ GEMINI_API_KEY is set: {gemini_key[:15]}...")
else:
    print("❌ GEMINI_API_KEY is NOT set")

# Check Perplexity API Key
perplexity_key = os.getenv('PERPLEXITY_API_KEY')
if perplexity_key:
    print(f"✅ PERPLEXITY_API_KEY is set: {perplexity_key[:15]}...")
else:
    print("❌ PERPLEXITY_API_KEY is NOT set")

# Check OpenAI API Key
openai_key = os.getenv('OPENAI_API_KEY')
if openai_key:
    print(f"✅ OPENAI_API_KEY is set: {openai_key[:15]}...")
else:
    print("⚠️  OPENAI_API_KEY is NOT set (optional)")

# Check other required settings
print("\nOther Configuration:")
print("-" * 50)
database_url = os.getenv('DATABASE_URL')
if database_url:
    print(f"✅ DATABASE_URL is set")
else:
    print("❌ DATABASE_URL is NOT set")

redis_url = os.getenv('REDIS_URL')
if redis_url:
    print(f"✅ REDIS_URL is set")
else:
    print("⚠️  REDIS_URL is NOT set (optional)")

# Test Gemini API if key is available
if gemini_key:
    print("\nTesting Gemini API Connection:")
    print("-" * 50)
    try:
        import google.generativeai as genai
        genai.configure(api_key=gemini_key)
        model = genai.GenerativeModel('gemini-2.5-pro')
        response = model.generate_content("Say 'API connected' in 3 words")
        print(f"✅ Gemini API is working: {response.text[:50]}")
    except Exception as e:
        print(f"❌ Gemini API error: {e}")

# Test Perplexity API if key is available
if perplexity_key:
    print("\nTesting Perplexity API Connection:")
    print("-" * 50)
    try:
        import requests
        headers = {
            "Authorization": f"Bearer {perplexity_key}",
            "Content-Type": "application/json"
        }
        data = {
            "model": "sonar-small-online",
            "messages": [{"role": "user", "content": "Say 'API connected' in 3 words"}],
            "max_tokens": 10
        }
        response = requests.post(
            "https://api.perplexity.ai/chat/completions",
            headers=headers,
            json=data,
            timeout=10
        )
        if response.status_code == 200:
            print(f"✅ Perplexity API is working")
        else:
            print(f"❌ Perplexity API returned status: {response.status_code}")
    except Exception as e:
        print(f"❌ Perplexity API error: {e}")