# Political Strategist API Reference v3.0

## Overview

The Political Strategist API provides comprehensive AI-powered political intelligence and strategic analysis capabilities for the LokDarpan platform. This module leverages multiple AI models (Gemini 2.0 Flash, Perplexity, OpenAI) to deliver real-time strategic insights.

**Base URL**: `/api/v1/strategist`  
**Authentication**: Required (session-based)  
**Version**: 3.0.0 (Phase 3 Complete)  
**Status**: Production-Ready

## Table of Contents

1. [Core Analysis Endpoints](#core-analysis-endpoints)
2. [Real-time Streaming (SSE)](#real-time-streaming-sse)
3. [Conversational AI](#conversational-ai)
4. [Strategic Playbooks](#strategic-playbooks)
5. [Scenario Simulation](#scenario-simulation)
6. [System Health & Monitoring](#system-health--monitoring)
7. [Error Codes](#error-codes)
8. [Rate Limiting](#rate-limiting)

## Core Analysis Endpoints

### GET /api/v1/strategist/{ward}

Get comprehensive strategic analysis for a specific ward.

**Parameters:**
- `ward` (path, required): Ward name or "All" for city-wide analysis
- `depth` (query, optional): Analysis depth [`quick`|`standard`|`deep`] (default: `standard`)
- `context` (query, optional): Strategic context [`defensive`|`neutral`|`offensive`] (default: `neutral`)
- `days` (query, optional): Historical data window in days (default: 30)
- `include_competitors` (query, optional): Include competitive analysis (default: true)

**Response (200 OK):**
```json
{
  "ward": "Jubilee Hills",
  "analysis_timestamp": "2025-08-26T18:30:00Z",
  "strategic_assessment": {
    "overall_sentiment": "cautiously_optimistic",
    "confidence_score": 0.78,
    "risk_level": "medium",
    "opportunities": [
      {
        "description": "Rising youth engagement on employment issues",
        "impact": "high",
        "actionability": 0.85
      }
    ],
    "threats": [
      {
        "description": "Opposition mobilization on infrastructure concerns",
        "severity": "medium",
        "timeline": "immediate"
      }
    ]
  },
  "sentiment_analysis": {
    "current": {
      "positive": 42,
      "negative": 28,
      "neutral": 30
    },
    "trend": "improving",
    "dominant_emotions": ["hopeful", "concerned", "engaged"]
  },
  "key_issues": [
    {
      "issue": "Water Supply",
      "mentions": 145,
      "sentiment": "negative",
      "trend": "escalating"
    }
  ],
  "recommended_actions": [
    {
      "priority": 1,
      "action": "Address water supply concerns immediately",
      "rationale": "High visibility issue affecting 60% of ward residents",
      "timeline": "24-48 hours"
    }
  ],
  "competitive_landscape": {
    "share_of_voice": {
      "our_party": 35,
      "BJP": 30,
      "BRS": 20,
      "INC": 15
    },
    "momentum": "gaining"
  },
  "metadata": {
    "analysis_id": "550e8400-e29b-41d4-a716-446655440000",
    "processing_time_ms": 2847,
    "data_sources": ["news", "social_media", "field_reports"],
    "model_used": "gemini-2.0-flash",
    "cache_hit": false
  }
}
```

### POST /api/v1/strategist/analyze

Analyze specific text content or situation for strategic insights.

**Request Body:**
```json
{
  "content": "Opposition party announces major rally in Jubilee Hills...",
  "context": {
    "ward": "Jubilee Hills",
    "urgency": "high",
    "response_type": "strategic"
  },
  "analysis_type": "threat_assessment"
}
```

**Response (200 OK):**
```json
{
  "analysis": {
    "threat_level": "medium-high",
    "estimated_impact": {
      "voter_sentiment": -5,
      "media_attention": 85,
      "mobilization_risk": "high"
    },
    "recommended_response": {
      "immediate": ["Issue press statement", "Mobilize ground team"],
      "short_term": ["Counter-programming with community event"],
      "messaging": "Focus on delivered promises, not rhetoric"
    }
  },
  "confidence": 0.82,
  "processing_time_ms": 1523
}
```

## Real-time Streaming (SSE)

### GET /api/v1/strategist/feed

Real-time intelligence feed with Server-Sent Events (SSE).

**Parameters:**
- `ward` (query, optional): Ward to monitor (default: "All")
- `priority` (query, optional): Priority filter [`all`|`critical`|`high`|`medium`|`low`]
- `include_progress` (query, optional): Include analysis progress events (default: false)

**Event Stream Format:**
```
id: event-123
event: alert
data: {"type":"alert","priority":"high","data":{...}}

id: progress-456
event: analysis_progress
data: {"type":"analysis_progress","percentage":45,"stage":"Analyzing patterns"}

id: hb-789
event: heartbeat
data: {"type":"heartbeat","timestamp":"2025-08-26T18:30:00Z"}
```

**Event Types:**
- `connection`: Initial connection established
- `alert`: New intelligence alert
- `intelligence`: Intelligence update
- `analysis_progress`: Analysis progress (when enabled)
- `heartbeat`: Keep-alive signal
- `error`: Recoverable error
- `reconnection`: Reconnection after error

### GET /api/v1/strategist/stream/test

Enhanced SSE streaming test endpoint with progress simulation.

**Parameters:**
- `ward` (query, optional): Ward name (default: "All")
- `priority` (query, optional): Priority filter
- `simulate_progress` (query, optional): Simulate analysis progress (default: true)

## Conversational AI

### POST /api/v1/strategist/conversation

Create a new conversation session for strategic queries.

**Request Body:**
```json
{
  "ward": "Jubilee Hills",
  "initial_query": "What's the current political temperature?",
  "context": {
    "role": "campaign_manager",
    "focus_areas": ["youth_engagement", "infrastructure"]
  }
}
```

**Response (200 OK):**
```json
{
  "conversation_id": "conv-550e8400-e29b",
  "response": {
    "content": "The political temperature in Jubilee Hills is moderately warm...",
    "confidence": 0.85,
    "supporting_data": [{...}]
  },
  "session_metadata": {
    "created_at": "2025-08-26T18:30:00Z",
    "expires_at": "2025-08-26T19:30:00Z"
  }
}
```

### POST /api/v1/strategist/conversation/{conversation_id}

Continue an existing conversation.

**Request Body:**
```json
{
  "query": "How should we respond to the water supply criticism?",
  "include_recommendations": true
}
```

### GET /api/v1/strategist/conversation/{conversation_id}/history

Retrieve conversation history.

## Strategic Playbooks

### POST /api/v1/strategist/playbook/generate

Generate strategic communication playbooks.

**Request Body:**
```json
{
  "playbook_type": "crisis_response",
  "ward": "Jubilee Hills",
  "context": {
    "issue": "water_supply_crisis",
    "severity": "high",
    "timeline": "immediate"
  },
  "language": "en",
  "target_audiences": ["residents", "media", "party_workers"]
}
```

**Playbook Types:**
- `crisis_response`: Crisis management playbook
- `policy_announcement`: New policy rollout
- `opposition_counter`: Counter-opposition messaging
- `achievement_showcase`: Highlight accomplishments
- `voter_mobilization`: GOTV campaigns
- `coalition_building`: Alliance messaging
- `development_announcement`: Infrastructure/development
- `festival_greeting`: Cultural/religious occasions

**Response (200 OK):**
```json
{
  "playbook": {
    "type": "crisis_response",
    "title": "Water Supply Crisis Response Plan",
    "executive_summary": "...",
    "key_messages": [
      {
        "audience": "residents",
        "message": "We acknowledge the water supply challenges...",
        "tone": "empathetic",
        "channels": ["WhatsApp", "door-to-door", "community_meetings"]
      }
    ],
    "talking_points": [...],
    "dos_and_donts": {
      "dos": ["Acknowledge the issue", "Share concrete timeline"],
      "donts": ["Blame previous administration", "Make unrealistic promises"]
    },
    "implementation_timeline": [...],
    "success_metrics": [...]
  },
  "generated_at": "2025-08-26T18:30:00Z",
  "validity_period": "48_hours"
}
```

## Scenario Simulation

### POST /api/v1/strategist/scenario/simulate

Simulate political scenarios for strategic planning.

**Request Body:**
```json
{
  "scenario": {
    "type": "opposition_move",
    "description": "Opposition announces free water tanker service",
    "ward": "Jubilee Hills",
    "timeline": "next_7_days"
  },
  "our_response_options": [
    "Counter with better water infrastructure plan",
    "Focus on other delivered services",
    "Challenge feasibility of opposition promise"
  ],
  "simulation_parameters": {
    "voter_segments": ["youth", "middle_class", "seniors"],
    "media_coverage": "high",
    "ground_sentiment": "mixed"
  }
}
```

**Response (200 OK):**
```json
{
  "simulation_results": {
    "scenarios": [
      {
        "response_option": "Counter with better water infrastructure plan",
        "projected_outcomes": {
          "voter_sentiment_change": +3,
          "credibility_impact": +5,
          "media_narrative": "positive",
          "risk_factors": ["execution_capability", "timeline_pressure"]
        },
        "confidence_interval": {
          "lower": 0.65,
          "upper": 0.85,
          "median": 0.75
        },
        "recommendation": "RECOMMENDED"
      }
    ],
    "best_response": {
      "option": "Counter with better water infrastructure plan",
      "reasoning": "Addresses root cause, demonstrates leadership",
      "implementation_guide": {...}
    }
  },
  "simulation_metadata": {
    "models_used": ["gemini", "perplexity"],
    "simulation_rounds": 100,
    "confidence_score": 0.78
  }
}
```

## System Health & Monitoring

### GET /api/v1/strategist/health

System health check and monitoring endpoint.

**Response (200 OK):**
```json
{
  "status": "healthy",
  "timestamp": "2025-08-26T18:30:00Z",
  "uptime_seconds": 8587,
  "components": {
    "cache": {
      "status": "healthy",
      "type": "redis",
      "hit_rate": 0.4957,
      "operations_per_second": 127
    },
    "ai_services": {
      "gemini": {
        "status": "operational",
        "latency_ms": 230,
        "quota_remaining": 98500
      },
      "perplexity": {
        "status": "operational",
        "latency_ms": 180,
        "requests_today": 1247
      },
      "openai": {
        "status": "operational",
        "fallback_ready": true
      }
    },
    "database": {
      "status": "healthy",
      "connection_pool": {
        "active": 5,
        "idle": 15,
        "max": 20
      }
    }
  },
  "recent_errors": [],
  "alerts": [],
  "performance_metrics": {
    "average_response_time_ms": 287,
    "requests_per_minute": 45,
    "cache_hit_rate": 0.4957,
    "error_rate": 0.002
  }
}
```

### GET /api/v1/strategist/metrics

Detailed performance metrics and analytics.

**Response (200 OK):**
```json
{
  "period": "last_hour",
  "metrics": {
    "api_calls": {
      "total": 2847,
      "by_endpoint": {...},
      "by_ward": {...}
    },
    "performance": {
      "p50_latency_ms": 245,
      "p95_latency_ms": 890,
      "p99_latency_ms": 2100
    },
    "ai_usage": {
      "gemini_calls": 847,
      "perplexity_calls": 623,
      "fallback_events": 3,
      "token_usage": {...}
    }
  }
}
```

## Error Codes

| Code | Description | Resolution |
|------|-------------|------------|
| `STRATEGIST_001` | AI service unavailable | Retry with exponential backoff |
| `STRATEGIST_002` | Analysis timeout | Reduce depth or retry |
| `STRATEGIST_003` | Invalid ward parameter | Check ward name spelling |
| `STRATEGIST_004` | Rate limit exceeded | Wait and retry after cooldown |
| `STRATEGIST_005` | Content filtering triggered | Review content for violations |
| `STRATEGIST_006` | Authentication required | Login and retry |
| `STRATEGIST_007` | Cache operation failed | System will auto-recover |
| `STRATEGIST_008` | SSE connection error | Check network and reconnect |

**Error Response Format:**
```json
{
  "error": {
    "code": "STRATEGIST_001",
    "message": "AI service temporarily unavailable",
    "details": "Gemini API timeout after 30s",
    "timestamp": "2025-08-26T18:30:00Z",
    "request_id": "req-550e8400",
    "retry_after": 60
  }
}
```

## Rate Limiting

| Endpoint | Rate Limit | Window |
|----------|------------|--------|
| Strategic Analysis | 60 requests | 1 minute |
| SSE Streams | 10 concurrent | Per user |
| Playbook Generation | 20 requests | 1 hour |
| Scenario Simulation | 10 requests | 1 hour |
| Conversation API | 100 messages | 1 hour |

**Rate Limit Headers:**
```
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1724696400
```

## WebSocket Support (Coming Soon)

Future enhancement for bidirectional real-time communication:
```javascript
const ws = new WebSocket('wss://api.lokdarpan.in/v1/strategist/ws');
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  // Handle real-time strategic updates
};
```

## SDK Support

### JavaScript/TypeScript
```javascript
import { StrategistClient } from '@lokdarpan/strategist-sdk';

const client = new StrategistClient({
  apiKey: 'your-api-key',
  baseURL: 'https://api.lokdarpan.in'
});

// Get strategic analysis
const analysis = await client.analyzeWard('Jubilee Hills', {
  depth: 'deep',
  includeCompetitors: true
});

// Stream real-time updates
const stream = client.streamIntelligence({
  ward: 'Jubilee Hills',
  priority: 'high'
});

stream.on('alert', (alert) => {
  console.log('New alert:', alert);
});
```

### Python
```python
from lokdarpan import StrategistClient

client = StrategistClient(
    api_key="your-api-key",
    base_url="https://api.lokdarpan.in"
)

# Get strategic analysis
analysis = client.analyze_ward(
    ward="Jubilee Hills",
    depth="deep",
    include_competitors=True
)

# Stream real-time updates
for event in client.stream_intelligence(ward="Jubilee Hills", priority="high"):
    if event.type == "alert":
        print(f"New alert: {event.data}")
```

## Change Log

### Version 3.0.0 (August 26, 2025)
- Multi-model AI orchestration (Gemini 2.0 Flash + Perplexity + OpenAI)
- Enhanced SSE streaming with progress tracking
- Redis cache integration with 49.57% hit rate
- 25+ endpoints for comprehensive analysis
- Production-ready error handling and monitoring

### Version 2.0.0
- Playbook generation for 8+ scenarios
- Conversation AI with context awareness
- Scenario simulation with confidence intervals

### Version 1.0.0
- Basic strategic analysis
- Simple alerting system
- Single AI model (Gemini)

## Support

For API support, bug reports, or feature requests:
- GitHub: https://github.com/lokdarpan/api-issues
- Email: api-support@lokdarpan.in
- Documentation: https://docs.lokdarpan.in/api/strategist