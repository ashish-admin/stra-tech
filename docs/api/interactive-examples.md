# Interactive API Examples

## Live API Testing Interface

Test LokDarpan's Multi-Model AI API with interactive examples. Each example includes sample requests, expected responses, and live testing capabilities.

> **Note**: Replace `YOUR_SESSION_TOKEN` with your actual session token. Get it by logging in and checking browser cookies.

## Getting Started

### Authentication Test

First, verify your authentication is working:

```bash
curl -X GET "http://localhost:5000/api/v1/multimodel/status" \
  -H "Cookie: lokdarpan_session=YOUR_SESSION_TOKEN" \
  -H "Accept: application/json"
```

**Expected Response** (Status 200):
```json
{
  "timestamp": "2025-08-21T10:30:00Z",
  "system_status": "healthy",
  "models": {
    "claude": { "available": true, "response_time_ms": 1200 },
    "perplexity": { "available": true, "response_time_ms": 800 },
    "openai": { "available": true, "response_time_ms": 600 },
    "llama_local": { "available": true, "response_time_ms": 2500 }
  }
}
```

## Core Examples

### Example 1: Simple Political Query

**Scenario**: Quick analysis of local political development

```bash
curl -X POST "http://localhost:5000/api/v1/multimodel/analyze" \
  -H "Cookie: lokdarpan_session=YOUR_SESSION_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "What are the key political issues currently affecting Jubilee Hills constituency?",
    "context": {
      "ward": "Jubilee Hills",
      "priority": "standard",
      "analysis_depth": "quick"
    },
    "options": {
      "max_cost_usd": 0.20,
      "quality_threshold": 0.7
    }
  }'
```

**Expected Response**:
```json
{
  "request_id": "a7b4c3d2-e1f0-9876-5432-1a2b3c4d5e6f",
  "analysis": {
    "executive_summary": "Jubilee Hills constituency faces three primary political challenges: infrastructure development delays, property tax concerns, and environmental issues related to urban development...",
    "key_insights": [
      {
        "category": "infrastructure",
        "insight": "Metro rail connectivity project delays causing voter frustration",
        "confidence": 0.85,
        "supporting_evidence": ["Local news reports", "Social media sentiment", "Municipal records"]
      },
      {
        "category": "taxation",
        "insight": "Property tax increases affecting middle-class voter base",
        "confidence": 0.78,
        "supporting_evidence": ["Municipal budget documents", "Taxpayer associations feedback"]
      }
    ],
    "recommended_actions": [
      {
        "category": "immediate",
        "action": "Address metro rail concerns in public statement",
        "priority": 1,
        "timeline": "within 48 hours",
        "success_metrics": ["Media coverage", "Social media engagement"]
      }
    ]
  },
  "metadata": {
    "model_used": "llama-3-8b",
    "provider": "llama_local",
    "processing_time_ms": 2400,
    "cost_usd": 0.00,
    "quality_score": 0.82
  }
}
```

### Example 2: Complex Strategic Analysis

**Scenario**: Comprehensive ward analysis with real-time data

```bash
curl -X POST "http://localhost:5000/api/v1/multimodel/analyze" \
  -H "Cookie: lokdarpan_session=YOUR_SESSION_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "Provide a comprehensive strategic analysis of the political landscape in Jubilee Hills, including electoral opportunities, threat assessment, and competitive positioning against major opposition parties.",
    "context": {
      "ward": "Jubilee Hills",
      "priority": "high",
      "analysis_depth": "comprehensive",
      "include_real_time": true,
      "budget_preference": "quality_first"
    },
    "options": {
      "max_cost_usd": 0.50,
      "timeout_seconds": 120,
      "quality_threshold": 0.85,
      "preferred_models": ["claude", "perplexity"]
    }
  }'
```

**Expected Response**:
```json
{
  "request_id": "b8c5d4e3-f2g1-8765-4321-2b3c4d5e6f7g",
  "analysis": {
    "executive_summary": "Jubilee Hills presents a competitive electoral landscape with incumbent advantages offset by emerging infrastructure and development concerns. Current polling suggests a tight race with opportunities for strategic positioning...",
    "key_insights": [
      {
        "category": "electoral_dynamics",
        "insight": "Incumbent party maintains 52% approval but declining 3% over past quarter",
        "confidence": 0.91,
        "supporting_evidence": ["Recent polling data", "Historical voting patterns", "Demographic analysis"]
      },
      {
        "category": "opposition_strategy",
        "insight": "Main opposition focusing on infrastructure development delays as primary attack vector",
        "confidence": 0.87,
        "supporting_evidence": ["Opposition public statements", "Media coverage analysis", "Campaign material review"]
      }
    ],
    "opportunities": [
      {
        "description": "Leverage upcoming metro station opening for positive narrative",
        "timeline": "2-3 months",
        "impact_potential": "high",
        "resource_requirements": {
          "personnel": 8,
          "budget_estimate": 150000
        },
        "success_probability": 0.78
      }
    ],
    "threats": [
      {
        "description": "Property development controversy could escalate",
        "severity": "medium",
        "mitigation_strategy": "Proactive community engagement and transparency initiatives",
        "monitoring_required": true,
        "probability": 0.65
      }
    ],
    "recommended_actions": [
      {
        "category": "strategic",
        "action": "Launch comprehensive infrastructure communication campaign",
        "priority": 1,
        "timeline": "2-4 weeks",
        "success_metrics": ["Polling improvement", "Media sentiment", "Community feedback"]
      }
    ]
  },
  "metadata": {
    "model_used": "claude-3-5-sonnet",
    "provider": "claude",
    "processing_time_ms": 8750,
    "cost_usd": 0.0342,
    "quality_score": 0.94,
    "political_relevance": 0.96
  },
  "sources": [
    {
      "type": "news_article",
      "title": "Jubilee Hills Metro Station Construction Progress Update",
      "url": "https://timesofindia.com/city/hyderabad/jubilee-hills-metro-progress",
      "date": "2025-08-20",
      "relevance": 0.89,
      "credibility_score": 0.85
    }
  ]
}
```

### Example 3: Real-time Intelligence Stream

**Scenario**: Set up live monitoring for political developments

```bash
curl -N -X GET "http://localhost:5000/api/v1/strategist/feed?ward=Jubilee%20Hills&priority=high" \
  -H "Cookie: lokdarpan_session=YOUR_SESSION_TOKEN" \
  -H "Accept: text/event-stream" \
  -H "Cache-Control: no-cache"
```

**Expected SSE Stream**:
```
event: connection
data: {"status": "connected", "ward": "Jubilee Hills", "filters": {"priority": "high"}}

event: political_development
data: {"type": "news_update", "priority": "high", "ward": "Jubilee Hills", "summary": "Opposition leader announces major policy position on infrastructure", "source": "Economic Times", "timestamp": "2025-08-21T11:15:00Z", "relevance": 0.92}

event: sentiment_shift
data: {"type": "sentiment_change", "ward": "Jubilee Hills", "metric": "infrastructure_satisfaction", "previous": 0.65, "current": 0.58, "change": -0.07, "significance": "moderate", "timestamp": "2025-08-21T11:20:00Z"}

event: opportunity_alert
data: {"type": "strategic_opportunity", "priority": "high", "description": "Community meeting scheduled - engagement opportunity", "timeline": "next 72 hours", "action_required": true, "timestamp": "2025-08-21T11:25:00Z"}
```

## Advanced Examples

### Example 4: Cost-Optimized Analysis

**Scenario**: Get quality analysis while minimizing costs

```bash
curl -X POST "http://localhost:5000/api/v1/multimodel/analyze" \
  -H "Cookie: lokdarpan_session=YOUR_SESSION_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "Summarize recent political developments in Jubilee Hills and their potential electoral impact",
    "context": {
      "ward": "Jubilee Hills",
      "budget_preference": "cost_effective"
    },
    "options": {
      "max_cost_usd": 0.10,
      "quality_threshold": 0.65,
      "preferred_models": ["llama_local", "openai"]
    }
  }'
```

### Example 5: Multi-Ward Comparative Analysis

**Scenario**: Compare political dynamics across multiple constituencies

```bash
curl -X POST "http://localhost:5000/api/v1/multimodel/analyze" \
  -H "Cookie: lokdarpan_session=YOUR_SESSION_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "Compare the political landscape and electoral prospects between Jubilee Hills, Banjara Hills, and Somajiguda constituencies, highlighting key differences and strategic implications",
    "context": {
      "analysis_depth": "comprehensive",
      "include_real_time": true
    },
    "options": {
      "max_cost_usd": 0.75,
      "timeout_seconds": 180,
      "quality_threshold": 0.85
    }
  }'
```

### Example 6: Crisis Response Analysis

**Scenario**: Rapid analysis for crisis communication

```bash
curl -X POST "http://localhost:5000/api/v1/multimodel/analyze" \
  -H "Cookie: lokdarpan_session=YOUR_SESSION_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "Urgent: Analyze the political implications of the water shortage crisis in Jubilee Hills and recommend immediate communication strategy",
    "context": {
      "ward": "Jubilee Hills",
      "priority": "urgent",
      "analysis_depth": "quick"
    },
    "options": {
      "max_cost_usd": 0.30,
      "timeout_seconds": 45,
      "preferred_models": ["claude", "llama_local"]
    }
  }'
```

## Testing Scenarios

### Budget Management Testing

**Test 1**: Verify budget protection
```bash
# Set very low budget limit to test protection
curl -X POST "http://localhost:5000/api/v1/multimodel/analyze" \
  -H "Cookie: lokdarpan_session=YOUR_SESSION_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "Complex analysis requiring expensive models",
    "options": {
      "max_cost_usd": 0.01
    }
  }'
```

**Expected Response** (Status 402):
```json
{
  "error": "budget_exceeded",
  "message": "Request exceeds specified budget limit",
  "details": {
    "estimated_cost": 0.25,
    "budget_limit": 0.01,
    "suggestion": "Increase budget or use cost_effective preference"
  }
}
```

### Quality Threshold Testing

**Test 2**: Quality threshold enforcement
```bash
curl -X POST "http://localhost:5000/api/v1/multimodel/analyze" \
  -H "Cookie: lokdarpan_session=YOUR_SESSION_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "Simple test query",
    "options": {
      "quality_threshold": 0.95,
      "preferred_models": ["llama_local"]
    }
  }'
```

### Error Handling Testing

**Test 3**: Invalid parameters
```bash
curl -X POST "http://localhost:5000/api/v1/multimodel/analyze" \
  -H "Cookie: lokdarpan_session=YOUR_SESSION_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "",
    "options": {
      "max_cost_usd": -1,
      "timeout_seconds": 1000
    }
  }'
```

**Expected Response** (Status 400):
```json
{
  "error": "validation_error",
  "message": "Invalid request parameters",
  "details": {
    "query": "Query cannot be empty",
    "options.max_cost_usd": "Must be positive",
    "options.timeout_seconds": "Must be between 30 and 300"
  }
}
```

## Performance Testing

### Load Testing Example

**Test multiple concurrent requests**:
```bash
# Test concurrent requests (run in parallel)
for i in {1..5}; do
  curl -X POST "http://localhost:5000/api/v1/multimodel/analyze" \
    -H "Cookie: lokdarpan_session=YOUR_SESSION_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"query\": \"Test query $i\", \"options\": {\"max_cost_usd\": 0.05}}" &
done
wait
```

### Latency Testing

**Measure response times**:
```bash
time curl -X POST "http://localhost:5000/api/v1/multimodel/analyze" \
  -H "Cookie: lokdarpan_session=YOUR_SESSION_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "Quick analysis test",
    "context": {"analysis_depth": "quick"},
    "options": {"preferred_models": ["llama_local"]}
  }'
```

## JavaScript/Frontend Integration

### Fetch API Example

```javascript
// Basic analysis request
async function analyzeContent(query, ward) {
  try {
    const response = await fetch('/api/v1/multimodel/analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include', // Include session cookie
      body: JSON.stringify({
        query: query,
        context: {
          ward: ward,
          analysis_depth: 'standard'
        },
        options: {
          max_cost_usd: 0.30,
          quality_threshold: 0.8
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Analysis failed: ${response.status}`);
    }

    const analysis = await response.json();
    return analysis;
  } catch (error) {
    console.error('Analysis error:', error);
    throw error;
  }
}

// Usage example
analyzeContent(
  'Analyze current political sentiment in Jubilee Hills',
  'Jubilee Hills'
).then(analysis => {
  console.log('Quality Score:', analysis.metadata.quality_score);
  console.log('Cost:', analysis.metadata.cost_usd);
  console.log('Insights:', analysis.analysis.key_insights);
}).catch(error => {
  console.error('Failed to get analysis:', error);
});
```

### SSE Stream Integration

```javascript
// Real-time intelligence stream
function setupIntelligenceStream(ward) {
  const eventSource = new EventSource(
    `/api/v1/strategist/feed?ward=${encodeURIComponent(ward)}&priority=high`
  );

  eventSource.onmessage = function(event) {
    const data = JSON.parse(event.data);
    console.log('Intelligence update:', data);
    
    // Handle different types of updates
    switch (data.type) {
      case 'political_development':
        handlePoliticalUpdate(data);
        break;
      case 'sentiment_shift':
        handleSentimentChange(data);
        break;
      case 'opportunity_alert':
        handleOpportunityAlert(data);
        break;
    }
  };

  eventSource.onerror = function(error) {
    console.error('SSE error:', error);
    // Implement reconnection logic
    setTimeout(() => setupIntelligenceStream(ward), 5000);
  };

  return eventSource;
}

// Usage
const stream = setupIntelligenceStream('Jubilee Hills');
```

## Python Integration

### Using requests library

```python
import requests
import json

class LokdarpanClient:
    def __init__(self, session_token, base_url="http://localhost:5000"):
        self.base_url = base_url
        self.session = requests.Session()
        self.session.cookies.set('lokdarpan_session', session_token)
    
    def analyze(self, query, ward=None, depth='standard', max_cost=0.30):
        payload = {
            "query": query,
            "context": {
                "analysis_depth": depth
            },
            "options": {
                "max_cost_usd": max_cost,
                "quality_threshold": 0.8
            }
        }
        
        if ward:
            payload["context"]["ward"] = ward
        
        response = self.session.post(
            f"{self.base_url}/api/v1/multimodel/analyze",
            json=payload
        )
        
        if response.status_code != 200:
            raise Exception(f"Analysis failed: {response.status_code} - {response.text}")
        
        return response.json()

# Usage example
client = LokdarpanClient("your_session_token")
analysis = client.analyze(
    "What are the key political issues in Jubilee Hills?",
    ward="Jubilee Hills",
    depth="comprehensive"
)

print(f"Quality: {analysis['metadata']['quality_score']}")
print(f"Cost: ${analysis['metadata']['cost_usd']}")
for insight in analysis['analysis']['key_insights']:
    print(f"- {insight['insight']} (confidence: {insight['confidence']})")
```

## Troubleshooting Examples

### Common Issues and Solutions

**Issue 1**: Authentication failure
```bash
# Check session token
curl -X GET "http://localhost:5000/api/v1/multimodel/status" \
  -H "Cookie: lokdarpan_session=INVALID_TOKEN" -v

# Expected: 401 Unauthorized
# Solution: Login again to get fresh session token
```

**Issue 2**: Budget exceeded
```bash
# Check budget status first
curl -X GET "http://localhost:5000/api/v1/multimodel/status" \
  -H "Cookie: lokdarpan_session=YOUR_SESSION_TOKEN" | jq '.budget_status'

# Adjust request if budget is low
curl -X POST "http://localhost:5000/api/v1/multimodel/analyze" \
  -H "Cookie: lokdarpan_session=YOUR_SESSION_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "Your query",
    "context": {"budget_preference": "cost_effective"},
    "options": {"max_cost_usd": 0.05}
  }'
```

---

## Next Steps

After testing these examples:

1. **[Review API Documentation](multimodel-api.md)** for complete parameter reference
2. **[Implement Error Handling](error-handling.md)** for production integration
3. **[Set up Cost Management](cost-optimization.md)** for budget optimization
4. **[Configure Real-time Streams](sse-integration.md)** for live intelligence

**Need Help?** Check the [Troubleshooting Guide](../technical/troubleshooting.md) or contact technical support with your test results.