#!/usr/bin/env python3
"""
Test script for enhanced multi-model AI orchestration.
Tests Claude, OpenAI, Perplexity, and Gemini integration.
"""

import os
import asyncio
import json
from datetime import datetime

# Set up environment variables for testing
os.environ['CLAUDE_API_KEY'] = os.getenv('CLAUDE_API_KEY', '')
os.environ['ANTHROPIC_API_KEY'] = os.getenv('ANTHROPIC_API_KEY', os.getenv('CLAUDE_API_KEY', ''))
os.environ['OPENAI_API_KEY'] = os.getenv('OPENAI_API_KEY', os.getenv('CHATGPT_API_KEY', ''))
os.environ['PERPLEXITY_API_KEY'] = os.getenv('PERPLEXITY_API_KEY', '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')
os.environ['GEMINI_API_KEY'] = os.getenv('GEMINI_API_KEY', 'AIzaSyB8gGrXaJdQHSJgMfxkxRhzEHG8a5FoJoM')

# Import the enhanced coordinator
from strategist.reasoner.enhanced_multi_model import EnhancedMultiModelCoordinator


async def test_individual_models():
    """Test each AI model individually."""
    coordinator = EnhancedMultiModelCoordinator()
    
    print("=" * 80)
    print("TESTING INDIVIDUAL AI MODELS")
    print("=" * 80)
    
    test_query = "What are the key political issues in Jubilee Hills ward?"
    test_ward = "Jubilee Hills"
    test_context = {
        "recent_events": "Infrastructure development, water supply issues",
        "parties": ["BRS", "BJP", "INC", "AIMIM"]
    }
    
    # Test Claude
    print("\n1. Testing Claude...")
    if 'claude' in coordinator.models and coordinator.models['claude'].available:
        result = await coordinator.analyze_with_claude(test_query, test_ward, test_context)
        if not result.get('fallback'):
            print("   ✅ Claude working!")
            print(f"   Response preview: {str(result.get('strategic_summary', ''))[:100]}...")
        else:
            print(f"   ❌ Claude failed: {result.get('error')}")
    else:
        print("   ⚠️ Claude not configured")
    
    # Test OpenAI
    print("\n2. Testing OpenAI/ChatGPT...")
    if 'openai' in coordinator.models and coordinator.models['openai'].available:
        result = await coordinator.analyze_with_openai(test_query, test_ward, test_context)
        if not result.get('fallback'):
            print("   ✅ OpenAI working!")
            print(f"   Response preview: {str(result.get('strategic_summary', ''))[:100]}...")
        else:
            print(f"   ❌ OpenAI failed: {result.get('error')}")
    else:
        print("   ⚠️ OpenAI not configured")
    
    # Test Perplexity
    print("\n3. Testing Perplexity...")
    if 'perplexity' in coordinator.models and coordinator.models['perplexity'].available:
        result = await coordinator.analyze_with_perplexity(test_query, test_ward)
        if not result.get('fallback'):
            print("   ✅ Perplexity working!")
            print(f"   Response preview: {str(result.get('intelligence', ''))[:100]}...")
        else:
            print(f"   ❌ Perplexity failed: {result.get('error')}")
    else:
        print("   ⚠️ Perplexity not configured")
    
    # Check Gemini status
    print("\n4. Checking Gemini...")
    if 'gemini' in coordinator.models:
        if coordinator.models['gemini'].available:
            print("   ✅ Gemini available")
        else:
            print("   ⚠️ Gemini rate limited or unavailable")
    else:
        print("   ⚠️ Gemini not configured")


async def test_multi_model_coordination():
    """Test coordinated multi-model analysis."""
    coordinator = EnhancedMultiModelCoordinator()
    
    print("\n" + "=" * 80)
    print("TESTING MULTI-MODEL COORDINATION")
    print("=" * 80)
    
    test_query = "Analyze the political landscape and provide strategic recommendations for winning Jubilee Hills ward"
    test_ward = "Jubilee Hills"
    
    print(f"\nQuery: {test_query}")
    print(f"Ward: {test_ward}")
    print("\nExecuting coordinated analysis...")
    
    result = await coordinator.coordinate_analysis(
        query=test_query,
        ward=test_ward,
        depth="standard",
        context={
            "current_party": "INC",
            "key_issues": ["infrastructure", "water supply", "traffic"],
            "opposition": ["BRS", "BJP", "AIMIM"]
        }
    )
    
    print("\n" + "-" * 40)
    print("RESULTS:")
    print("-" * 40)
    
    print(f"Status: {result.get('status')}")
    print(f"Models consulted: {result.get('models_consulted', [])}")
    print(f"Primary model: {result.get('model_used')}")
    print(f"Confidence score: {result.get('confidence_score', 0):.2f}")
    print(f"Multi-model consensus: {result.get('multi_model_consensus', 0):.2f}")
    
    if result.get('strategic_summary'):
        print(f"\nStrategic Summary:")
        print(f"  {result['strategic_summary'][:200]}...")
    
    if result.get('recommended_actions'):
        print(f"\nRecommended Actions: {len(result.get('recommended_actions', []))} actions")
        for i, action in enumerate(result.get('recommended_actions', [])[:3], 1):
            if isinstance(action, dict):
                print(f"  {i}. {action.get('action', action)}")
            else:
                print(f"  {i}. {action}")
    
    if result.get('real_time_intelligence'):
        print(f"\nReal-time Intelligence (Perplexity):")
        print(f"  {result['real_time_intelligence'][:200]}...")
    
    if result.get('fallback_notice'):
        print(f"\n⚠️ Notice: {result['fallback_notice']}")


async def test_api_authentication():
    """Test API authentication specifically."""
    print("\n" + "=" * 80)
    print("TESTING API AUTHENTICATION")
    print("=" * 80)
    
    # Test Perplexity with correct format
    perplexity_key = os.getenv('PERPLEXITY_API_KEY', '')
    if perplexity_key:
        # Ensure correct format
        if perplexity_key.startswith('pplx-'):
            formatted_key = perplexity_key
        else:
            formatted_key = f"pplx-{perplexity_key}"
        
        print(f"\nPerplexity API Key format: {formatted_key[:10]}...")
        
        import requests
        
        # Test Perplexity API directly
        test_payload = {
            "model": "llama-3.1-sonar-small-128k-online",
            "messages": [
                {"role": "user", "content": "Test query"}
            ],
            "temperature": 0.2,
            "max_tokens": 10
        }
        
        headers = {
            'Authorization': f'Bearer {formatted_key}',
            'Content-Type': 'application/json'
        }
        
        try:
            response = requests.post(
                'https://api.perplexity.ai/chat/completions',
                headers=headers,
                json=test_payload,
                timeout=10
            )
            
            if response.status_code == 200:
                print("   ✅ Perplexity authentication successful!")
            elif response.status_code == 401:
                print(f"   ❌ Perplexity authentication failed (401)")
                print(f"      Please check your API key")
            else:
                print(f"   ⚠️ Perplexity returned status: {response.status_code}")
        except Exception as e:
            print(f"   ❌ Perplexity connection failed: {e}")
    else:
        print("   ⚠️ No Perplexity API key configured")


async def main():
    """Run all tests."""
    print("\n" + "=" * 80)
    print("LOKDARPAN ENHANCED AI SYSTEM TEST")
    print(f"Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 80)
    
    # Check which API keys are available
    print("\nConfigured API Keys:")
    print(f"  Claude/Anthropic: {'✅' if os.getenv('CLAUDE_API_KEY') or os.getenv('ANTHROPIC_API_KEY') else '❌'}")
    print(f"  OpenAI/ChatGPT: {'✅' if os.getenv('OPENAI_API_KEY') or os.getenv('CHATGPT_API_KEY') else '❌'}")
    print(f"  Perplexity: {'✅' if os.getenv('PERPLEXITY_API_KEY') else '❌'}")
    print(f"  Gemini: {'✅' if os.getenv('GEMINI_API_KEY') else '❌'}")
    
    # Run tests
    await test_api_authentication()
    await test_individual_models()
    await test_multi_model_coordination()
    
    print("\n" + "=" * 80)
    print("TEST COMPLETE")
    print("=" * 80)


if __name__ == "__main__":
    asyncio.run(main())