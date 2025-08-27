#!/usr/bin/env python3
"""
Test script to validate AI service connectivity and diagnose Political Strategist issues.
"""

import os
import json
import requests
import asyncio
from datetime import datetime

# Load environment variables
from dotenv import load_dotenv
load_dotenv()

class AIServiceTester:
    def __init__(self):
        self.gemini_key = os.getenv('GEMINI_API_KEY')
        self.openai_key = os.getenv('OPENAI_API_KEY')
        self.perplexity_key = os.getenv('PERPLEXITY_API_KEY')
        self.anthropic_key = os.getenv('ANTHROPIC_API_KEY')
        
    def test_openai_api(self):
        """Test OpenAI API connectivity with cost-optimized model."""
        print("🔍 Testing OpenAI API...")
        
        if not self.openai_key or self.openai_key.startswith('placeholder'):
            print("❌ OpenAI API key not available")
            return False
            
        try:
            url = "https://api.openai.com/v1/chat/completions"
            headers = {
                "Authorization": f"Bearer {self.openai_key}",
                "Content-Type": "application/json"
            }
            payload = {
                "model": "gpt-3.5-turbo",  # Cost-optimized model
                "messages": [
                    {"role": "system", "content": "You are a political analyst."},
                    {"role": "user", "content": "Provide a brief political analysis for Jubilee Hills ward in Hyderabad."}
                ],
                "max_tokens": 200,
                "temperature": 0.3
            }
            
            response = requests.post(url, headers=headers, json=payload, timeout=30)
            
            if response.status_code == 200:
                data = response.json()
                content = data['choices'][0]['message']['content']
                print(f"✅ OpenAI API working! Response length: {len(content)} chars")
                print(f"📝 Sample: {content[:100]}...")
                return True
            else:
                print(f"❌ OpenAI API error: {response.status_code}")
                print(f"📄 Error: {response.text[:200]}")
                return False
                
        except Exception as e:
            print(f"❌ OpenAI API exception: {e}")
            return False
    
    def test_perplexity_api(self):
        """Test Perplexity API connectivity."""
        print("\n🔍 Testing Perplexity API...")
        
        if not self.perplexity_key:
            print("❌ Perplexity API key not available")
            return False
            
        try:
            # Ensure proper key format
            key = self.perplexity_key
            if not key.startswith('pplx-'):
                key = f'pplx-{key}'
                
            url = "https://api.perplexity.ai/chat/completions"
            headers = {
                "Authorization": f"Bearer {key}",
                "Content-Type": "application/json"
            }
            payload = {
                "model": "sonar",
                "messages": [
                    {
                        "role": "system", 
                        "content": "You are a political intelligence analyst focused on Indian politics."
                    },
                    {
                        "role": "user", 
                        "content": "Latest political developments in Hyderabad, Jubilee Hills ward"
                    }
                ],
                "temperature": 0.2,
                "max_tokens": 200
            }
            
            response = requests.post(url, headers=headers, json=payload, timeout=30)
            
            if response.status_code == 200:
                data = response.json()
                content = data['choices'][0]['message']['content']
                print(f"✅ Perplexity API working! Response length: {len(content)} chars")
                print(f"📝 Sample: {content[:100]}...")
                return True
            else:
                print(f"❌ Perplexity API error: {response.status_code}")
                print(f"📄 Error: {response.text[:200]}")
                return False
                
        except Exception as e:
            print(f"❌ Perplexity API exception: {e}")
            return False
    
    def test_gemini_api(self):
        """Test Gemini API connectivity."""
        print("\n🔍 Testing Gemini API...")
        
        if not self.gemini_key:
            print("❌ Gemini API key not available")
            return False
            
        try:
            # First check quota
            url = f"https://generativelanguage.googleapis.com/v1beta/models?key={self.gemini_key}"
            response = requests.get(url, timeout=10)
            
            if response.status_code == 429:
                print("❌ Gemini API is rate limited / quota exceeded")
                return False
            elif response.status_code != 200:
                print(f"❌ Gemini API models endpoint error: {response.status_code}")
                return False
            
            # Test actual generation
            gen_url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key={self.gemini_key}"
            payload = {
                "contents": [{
                    "parts": [{
                        "text": "Provide a brief political analysis for Jubilee Hills ward in Hyderabad."
                    }]
                }],
                "generationConfig": {
                    "temperature": 0.3,
                    "maxOutputTokens": 200
                }
            }
            
            response = requests.post(gen_url, json=payload, timeout=30)
            
            if response.status_code == 200:
                data = response.json()
                if 'candidates' in data and len(data['candidates']) > 0:
                    content = data['candidates'][0]['content']['parts'][0]['text']
                    print(f"✅ Gemini API working! Response length: {len(content)} chars")
                    print(f"📝 Sample: {content[:100]}...")
                    return True
                else:
                    print("❌ Gemini API returned no candidates")
                    return False
            else:
                print(f"❌ Gemini API error: {response.status_code}")
                print(f"📄 Error: {response.text[:200]}")
                return False
                
        except Exception as e:
            print(f"❌ Gemini API exception: {e}")
            return False
    
    def test_all_services(self):
        """Test all available AI services."""
        print("🚀 LokDarpan AI Services Connectivity Test")
        print("=" * 50)
        
        results = {}
        results['openai'] = self.test_openai_api()
        results['perplexity'] = self.test_perplexity_api() 
        results['gemini'] = self.test_gemini_api()
        
        print(f"\n📊 Test Results Summary:")
        print(f"OpenAI (ChatGPT): {'✅ Working' if results['openai'] else '❌ Failed'}")
        print(f"Perplexity: {'✅ Working' if results['perplexity'] else '❌ Failed'}")
        print(f"Gemini: {'✅ Working' if results['gemini'] else '❌ Failed'}")
        
        working_count = sum(results.values())
        print(f"\n🎯 Total working services: {working_count}/3")
        
        if working_count == 0:
            print("\n🚨 CRITICAL: No AI services are working!")
            print("The Political Strategist will be in fallback mode.")
        elif working_count >= 1:
            print(f"\n✅ SUCCESS: {working_count} AI service(s) available for Political Strategist")
            
        return results


def main():
    tester = AIServiceTester()
    results = tester.test_all_services()
    
    print(f"\n🔧 Next Steps:")
    if results['openai']:
        print("✅ Use OpenAI (GPT-3.5-turbo) as primary AI service - cost-optimized")
    elif results['perplexity']:
        print("✅ Use Perplexity as primary AI service - real-time intelligence")  
    elif results['gemini']:
        print("✅ Use Gemini as primary AI service")
    else:
        print("❌ Fix API connectivity issues before Political Strategist will work")

if __name__ == "__main__":
    main()