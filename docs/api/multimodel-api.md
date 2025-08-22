# Multi-Model AI API Reference

## Overview

The Multi-Model AI API orchestrates Claude, Perplexity, OpenAI, and local Llama 4 models to provide intelligent political analysis within cost constraints. The system automatically routes queries to optimal models based on complexity, urgency, and budget availability.

## Base URL

- **Development**: `http://localhost:5000/api/v1`
- **Production**: `https://api.lokdarpan.com/api/v1`

## Authentication

All endpoints require session authentication:

```http
Cookie: lokdarpan_session=<session_token>
```

## Core Endpoints

### Analyze Political Content

Perform intelligent multi-model analysis of political content.

```http
POST /multimodel/analyze
```

#### Request Body

```json
{
  "query": "Analyze the political implications of the new infrastructure project in Jubilee Hills",
  "context": {
    "ward": "Jubilee Hills",
    "priority": "standard",
    "analysis_depth": "comprehensive",
    "include_real_time": true,
    "budget_preference": "balanced"
  },
  "options": {
    "max_cost_usd": 0.50,
    "timeout_seconds": 120,
    "quality_threshold": 0.8,
    "preferred_models": ["claude", "perplexity"]
  }
}
```

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `query` | string | ✅ | Analysis query (max 10,000 chars) |
| `context.ward` | string | ❌ | Ward context for local relevance |
| `context.priority` | enum | ❌ | `low`, `standard`, `high`, `urgent` |
| `context.analysis_depth` | enum | ❌ | `quick`, `standard`, `comprehensive` |
| `context.include_real_time` | boolean | ❌ | Include latest news/developments |
| `context.budget_preference` | enum | ❌ | `cost_effective`, `balanced`, `quality_first` |
| `options.max_cost_usd` | float | ❌ | Maximum cost for this request |
| `options.timeout_seconds` | integer | ❌ | Request timeout (30-300 seconds) |
| `options.quality_threshold` | float | ❌ | Minimum acceptable quality (0.0-1.0) |
| `options.preferred_models` | array | ❌ | Preferred AI models in order |

#### Response

```json
{
  "request_id": "uuid-v4",
  "analysis": {
    "executive_summary": "The new infrastructure project in Jubilee Hills presents significant political opportunities...",
    "key_insights": [
      {
        "category": "electoral_impact",
        "insight": "Project completion before elections could boost incumbent support by 15-20%",
        "confidence": 0.85,
        "supporting_evidence": ["Recent polling data", "Historical infrastructure impact analysis"]
      }
    ],
    "opportunities": [
      {
        "description": "Leverage project visibility for voter outreach",
        "timeline": "3-6 months",
        "impact_potential": "high",
        "resource_requirements": {
          "personnel": 5,
          "budget_estimate": 50000
        }
      }
    ],
    "threats": [
      {
        "description": "Opposition criticism of project delays",
        "severity": "medium",
        "mitigation_strategy": "Proactive communication about progress milestones",
        "monitoring_required": true
      }
    ],
    "recommended_actions": [
      {
        "category": "immediate",
        "action": "Schedule public inauguration event with media coverage",
        "priority": 1,
        "timeline": "within 2 weeks",
        "success_metrics": ["Media coverage", "Public attendance", "Social media engagement"]
      }
    ]
  },
  "metadata": {
    "model_used": "claude-3-5-sonnet",
    "provider": "claude",
    "fallback_used": false,
    "processing_time_ms": 8500,
    "tokens_used": {
      "input": 245,
      "output": 892
    },
    "cost_usd": 0.0134,
    "quality_score": 0.92,
    "political_relevance": 0.95,
    "confidence_overall": 0.87
  },
  "sources": [
    {
      "type": "news_article",
      "title": "Jubilee Hills Infrastructure Development Progresses",
      "url": "https://example.com/news/infrastructure",
      "date": "2025-08-20",
      "relevance": 0.89,
      "credibility_score": 0.85
    }
  ],
  "budget_impact": {
    "current_monthly_spend": 342.50,
    "remaining_budget": 157.50,
    "projected_month_end": 485.75
  },
  "generated_at": "2025-08-21T10:30:00Z",
  "cache_info": {
    "cache_hit": false,
    "cache_key": "hash_of_normalized_query",
    "expires_at": "2025-08-21T13:30:00Z"
  }
}
```

#### Error Responses

**Budget Exceeded (402)**
```json
{
  "error": "budget_exceeded",
  "message": "Monthly budget limit reached. Current spend: $498.50 of $500.00",
  "details": {
    "current_spend_usd": 498.50,
    "monthly_limit_usd": 500.00,
    "estimated_request_cost": 0.15,
    "next_reset": "2025-09-01T00:00:00Z"
  }
}
```

**Quality Threshold Not Met (422)**
```json
{
  "error": "quality_threshold_not_met",
  "message": "Analysis quality below threshold",
  "details": {
    "achieved_quality": 0.65,
    "required_threshold": 0.8,
    "recommendation": "Lower quality threshold or increase budget for premium models"
  }
}
```

### Get System Status

Monitor system health, model availability, and budget status.

```http
GET /multimodel/status
```

#### Response

```json
{
  "timestamp": "2025-08-21T10:30:00Z",
  "system_status": "healthy",
  "models": {
    "claude": {
      "available": true,
      "response_time_ms": 1200,
      "success_rate_24h": 0.98,
      "circuit_breaker_state": "closed"
    },
    "perplexity": {
      "available": true,
      "response_time_ms": 800,
      "success_rate_24h": 0.95,
      "circuit_breaker_state": "closed"
    },
    "openai": {
      "available": true,
      "response_time_ms": 600,
      "success_rate_24h": 0.99,
      "circuit_breaker_state": "closed"
    },
    "llama_local": {
      "available": true,
      "response_time_ms": 2500,
      "success_rate_24h": 1.00,
      "circuit_breaker_state": "closed"
    }
  },
  "performance_today": {
    "total_requests": 47,
    "successful_requests": 45,
    "average_latency_ms": 1850,
    "average_quality_score": 0.87
  },
  "budget_status": {
    "monthly_limit_usd": 500.00,
    "current_spend_usd": 342.50,
    "remaining_usd": 157.50,
    "projected_month_end_usd": 485.75,
    "days_remaining_in_month": 10,
    "average_daily_spend_usd": 11.42
  },
  "cost_breakdown": {
    "claude_usd": 198.75,
    "perplexity_usd": 89.25,
    "openai_usd": 54.50,
    "llama_local_usd": 0.00
  }
}
```

### Get Performance Analytics

Detailed performance analytics for optimization insights.

```http
GET /multimodel/analytics?period=7d&metrics=performance,cost,quality
```

#### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `period` | string | `1d`, `7d`, `30d` |
| `metrics` | string | Comma-separated: `performance`, `cost`, `quality`, `usage` |

#### Response

```json
{
  "period": "7d",
  "metrics": {
    "performance": {
      "average_latency_ms": 1750,
      "p95_latency_ms": 3200,
      "success_rate": 0.96,
      "timeout_rate": 0.01,
      "model_performance": {
        "claude": {"avg_latency": 1200, "success_rate": 0.98},
        "perplexity": {"avg_latency": 800, "success_rate": 0.95},
        "openai": {"avg_latency": 600, "success_rate": 0.99},
        "llama_local": {"avg_latency": 2500, "success_rate": 1.00}
      }
    },
    "cost": {
      "total_spend_usd": 89.75,
      "average_cost_per_request": 0.028,
      "cost_by_model": {
        "claude": 52.30,
        "perplexity": 23.45,
        "openai": 14.00,
        "llama_local": 0.00
      },
      "cost_trend": "decreasing"
    },
    "quality": {
      "average_quality_score": 0.87,
      "quality_distribution": {
        "excellent": 0.45,
        "good": 0.38,
        "acceptable": 0.15,
        "poor": 0.02
      },
      "quality_by_model": {
        "claude": 0.92,
        "perplexity": 0.84,
        "openai": 0.88,
        "llama_local": 0.75
      }
    }
  },
  "optimization_recommendations": [
    {
      "type": "cost_optimization",
      "description": "Increase use of local Llama model for simple queries",
      "potential_savings_usd": 15.50,
      "implementation_effort": "low"
    },
    {
      "type": "performance_optimization", 
      "description": "Cache similar analyses for 6 hours instead of 3",
      "potential_improvement": "25% latency reduction",
      "implementation_effort": "low"
    }
  ]
}
```

## Model Selection Logic

The system automatically selects optimal models based on:

### Query Complexity Analysis

| Complexity | Criteria | Preferred Model | Fallback |
|------------|----------|------------------|----------|
| **Simple** | Single fact, <20 words | Llama Local → OpenAI | Perplexity |
| **Moderate** | Analysis needed, 20-100 words | OpenAI → Claude | Llama Local |
| **Complex** | Strategic analysis, >100 words | Claude → Llama Local | OpenAI |
| **Urgent** | Time-sensitive requests | Fastest available | All others |

### Real-time Requirements

- **Recent developments needed**: Perplexity (primary) → Claude
- **Historical analysis**: Claude → OpenAI → Llama Local
- **Factual verification**: Perplexity → OpenAI

### Budget Optimization

| Budget Preference | Model Priority | Cost Control |
|-------------------|----------------|--------------|
| `cost_effective` | Llama → OpenAI → Perplexity → Claude | Max $0.05/request |
| `balanced` | OpenAI → Claude → Perplexity → Llama | Max $0.25/request |
| `quality_first` | Claude → OpenAI → Perplexity → Llama | Max $0.50/request |

## Rate Limiting

| Endpoint | Limit | Window | Overage |
|----------|-------|---------|----------|
| `/analyze` | 100 requests | 1 hour | 429 error |
| `/status` | 1000 requests | 1 hour | 429 error |
| `/analytics` | 100 requests | 1 hour | 429 error |

## Webhooks (Coming Soon)

Register webhook endpoints for proactive notifications:

- **Budget alerts**: 80%, 90%, 95% thresholds
- **Quality degradation**: Average quality below 0.7
- **System issues**: Model unavailability, high latency
- **Analysis complete**: Async analysis completion

## SDKs and Libraries

### Python SDK
```bash
pip install lokdarpan-sdk
```

```python
from lokdarpan import LokdarpanClient

client = LokdarpanClient(session_token="your_session_token")
result = await client.analyze("Political implications of new policy", 
                            ward="Jubilee Hills",
                            depth="comprehensive")
print(f"Quality: {result.quality_score}, Cost: ${result.cost_usd}")
```

### JavaScript SDK
```bash
npm install @lokdarpan/api-client
```

```javascript
import { LokdarpanClient } from '@lokdarpan/api-client';

const client = new LokdarpanClient({ sessionToken: 'your_session_token' });
const analysis = await client.multimodel.analyze({
  query: 'Analyze voter sentiment trends',
  context: { ward: 'Jubilee Hills', priority: 'high' }
});
console.log(`Analysis complete: ${analysis.metadata.processing_time_ms}ms`);
```

## Best Practices

### Cost Management
1. **Use caching**: Similar queries cached for 3 hours
2. **Optimize complexity**: Use `quick` depth for simple questions
3. **Batch requests**: Multiple queries in single context
4. **Monitor budget**: Check `/status` endpoint regularly

### Quality Optimization
1. **Provide context**: Ward and situational context improves relevance
2. **Specify depth**: Match analysis depth to use case
3. **Review sources**: Validate cited information
4. **Track quality**: Monitor quality scores over time

### Performance Optimization
1. **Use SSE streams**: For real-time updates
2. **Implement timeouts**: Handle long-running requests gracefully
3. **Cache responses**: Store results for repeated queries
4. **Parallel requests**: Multiple independent analyses simultaneously

---

**Next**: Explore [Interactive Examples](interactive-examples.md) for hands-on API testing or review [Error Handling](error-handling.md) for robust integration.