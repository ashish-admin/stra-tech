# LokDarpan API Fix Recommendations

## Critical Issues Found

### 1. ❌ Gemini API Key Has Zero Quota
**Problem**: The Gemini API key (AIzaSyBheq3J1cP...) has a quota limit of 0 requests per minute.
```
quota_limit_value: "0"
quota_metric: generativelanguage.googleapis.com/generate_content_requests
```

**Solution**: 
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to APIs & Services → Quotas
3. Search for "Generative Language API"
4. Request quota increase or create a new API key with proper billing enabled

### 2. ❌ Perplexity API Key Invalid
**Problem**: The Perplexity API key returns 400 Bad Request

**Solution**:
1. Verify the API key format (should start with `pplx-`)
2. Check if the key is active in [Perplexity API Dashboard](https://www.perplexity.ai/settings/api)
3. Update the key in `.env` file

### 3. ✅ Async Execution Fixed
**Problem**: Flask doesn't handle `asyncio.run()` well in request context

**Solution Implemented**: Created `async_helper.py` that runs async code in separate thread pool
```python
from .async_helper import run_async
result = run_async(adapter.analyze_political_situation(...))
```

## Immediate Actions Required

### Step 1: Fix API Keys

**Option A: Use Free Gemini API Key with Quota**
```bash
# Create new Gemini API key at https://makersuite.google.com/app/apikey
# Update .env file:
GEMINI_API_KEY="your-new-key-with-quota"
```

**Option B: Switch to OpenAI (Your key is configured)**
```python
# In ai_orchestrator.py, change the default model preference:
model_preferences=["gpt-4o-mini", "gpt-3.5-turbo"]  # Instead of gemini
```

### Step 2: Restart Backend with Fixed Configuration

```bash
# 1. Stop current Flask server (Ctrl+C)

# 2. Update .env with working API keys
nano .env

# 3. Restart Flask with the async fix applied
cd backend
source venv/bin/activate
flask run
```

### Step 3: Test the Fixed System

```bash
# Run the test suite
python test_multimodel_integration.py

# Or test manually:
curl -X POST http://localhost:5000/api/v1/login \
  -H "Content-Type: application/json" \
  -d '{"username":"ashish","password":"password"}' \
  -c cookies.txt

curl -b cookies.txt \
  "http://localhost:5000/api/v1/strategist/Jubilee%20Hills?depth=quick"
```

## Alternative Quick Fix: Use Mock AI for Testing

If you need the system working immediately without fixing API keys:

### Create Mock AI Service
```python
# backend/app/services/mock_ai_client.py
class MockAIClient:
    """Mock AI client for testing without API keys"""
    
    async def generate_response(self, query, context, request_id):
        # Generate realistic-looking political analysis
        ward = context.get('ward_context', 'Unknown')
        
        analysis = f"""
        ## Political Intelligence Analysis for {ward}
        
        ### Current Situation
        Based on recent developments in {ward}, we observe:
        - Increasing voter engagement around infrastructure issues
        - Growing youth participation in local politics
        - Opposition parties struggling with unified messaging
        
        ### Strategic Recommendations
        1. **Immediate Action**: Conduct ward walks focusing on drainage problems
        2. **Media Strategy**: Highlight recent infrastructure wins via social media
        3. **Coalition Building**: Engage with resident welfare associations
        
        ### Risk Assessment
        - Primary risk: Opposition mobilization around water shortage
        - Mitigation: Preemptive water tanker deployment and communication
        
        ### Confidence Level: 0.78
        This analysis is based on 127 recent posts and 15 news articles.
        """
        
        return AIResponse(
            content=analysis,
            model_used="mock-political-ai",
            provider=ModelProvider.LLAMA_LOCAL,
            tokens_used={"input": 100, "output": 200},
            cost_usd=0.0,
            latency_ms=250,
            quality_score=0.75,
            metadata={"mock": True, "ward": ward}
        )
```

### Update Orchestrator to Use Mock
```python
# In ai_orchestrator.py, add mock as fallback:
if not self.gemini_client.api_key:
    logger.warning("No API keys configured, using mock AI")
    return await MockAIClient().generate_response(query, context, request_id)
```

## Long-term Recommendations

### 1. Implement Proper API Key Management
```python
# backend/app/services/api_key_manager.py
class APIKeyManager:
    """Centralized API key management with rotation and fallback"""
    
    def __init__(self):
        self.keys = {
            'gemini': self._load_keys('GEMINI_API_KEY'),
            'openai': self._load_keys('OPENAI_API_KEY'),
            'perplexity': self._load_keys('PERPLEXITY_API_KEY')
        }
        self.usage_tracker = {}
    
    def get_active_key(self, provider):
        """Get least-used valid API key for provider"""
        # Implement round-robin or usage-based selection
        pass
    
    def mark_key_failed(self, provider, key):
        """Mark a key as failed and rotate to next"""
        pass
```

### 2. Add Real Data Ingestion
```python
# backend/app/tasks/news_ingestion.py
@celery.task
def ingest_real_news():
    """Ingest real news from multiple sources"""
    sources = [
        fetch_rss_feeds(),
        fetch_twitter_data(),
        fetch_google_news(),
        scrape_local_newspapers()
    ]
    
    for article in sources:
        process_and_store_article(article)
```

### 3. Implement Caching Layer
```python
# backend/app/services/cache_manager.py
from flask_caching import Cache

cache = Cache(config={'CACHE_TYPE': 'redis'})

@cache.memoize(timeout=300)
def get_cached_analysis(ward, depth):
    """Cache AI analysis for 5 minutes"""
    return generate_analysis(ward, depth)
```

### 4. Add Health Monitoring
```python
# backend/app/monitoring.py
@app.route('/health/ai')
def ai_health_check():
    """Check health of all AI services"""
    health = {
        'gemini': check_gemini_api(),
        'perplexity': check_perplexity_api(),
        'openai': check_openai_api(),
        'database': check_database(),
        'cache': check_redis()
    }
    
    status_code = 200 if all(health.values()) else 503
    return jsonify(health), status_code
```

## Testing Checklist

After implementing fixes:

- [ ] API keys are valid and have quota
- [ ] Backend restarts without errors
- [ ] `/api/v1/strategist/<ward>` returns real AI analysis (not templates)
- [ ] Confidence scores are dynamic (not fixed 0.65)
- [ ] Response includes `provider: "gemini"` or `"openai"` (not "fallback")
- [ ] SSE endpoint `/api/v1/strategist/feed` streams real updates
- [ ] Analysis includes specific ward details, not placeholders
- [ ] Error rate < 1% over 100 requests

## Expected Successful Response

When properly configured, the API should return:

```json
{
  "ward": "Jubilee Hills",
  "analysis": "[Detailed 500+ word political analysis with specific insights]",
  "confidence_score": 0.89,
  "provider": "gemini",
  "model_used": "gemini-2.5-pro",
  "processing_time_ms": 1847,
  "cost_usd": 0.0023,
  "strategic_recommendations": [
    {
      "action": "Engage with RWA on water crisis",
      "timeline": "48 hours",
      "expected_impact": "high"
    }
  ],
  "evidence": [
    "Based on 47 recent posts about water shortage",
    "Opposition MLA statement on Aug 23",
    "Municipal corporation budget allocation data"
  ]
}
```

## Contact for Support

If issues persist after following these recommendations:

1. Check Flask logs: `tail -f app.log`
2. Verify network connectivity to AI services
3. Ensure Redis is running for caching: `redis-cli ping`
4. Test with simplified direct API calls first
5. Use mock AI service as temporary fallback

The system architecture is solid - it just needs valid API keys to unlock its full potential.