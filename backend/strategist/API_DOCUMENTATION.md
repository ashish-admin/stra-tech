# Political Strategist API Documentation

## Overview
The Political Strategist API provides AI-powered political intelligence and strategic analysis for the LokDarpan platform. This document covers API endpoints, rate limiting, authentication, and usage patterns.

## Base URL
```
http://localhost:5000/api/v1/strategist
```

## Authentication
All endpoints require session-based authentication via Flask-Login. Authenticate using the main login endpoint:

```bash
curl -X POST http://localhost:5000/api/v1/login \
  -H "Content-Type: application/json" \
  -d '{"username":"ashish","password":"password"}' \
  -c cookies.txt
```

## Rate Limiting

### Service Limits
- **Gemini API**: 60 requests per minute
- **Perplexity API**: 20 requests per minute  
- **SSE Connections**: Maximum 100 concurrent connections
- **Analysis Requests**: 30 per minute per user

### Response Headers
Rate limit information is included in response headers:
```
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1693526400
```

## Core Endpoints

### 1. Ward Analysis
Get comprehensive strategic analysis for a specific ward.

**Endpoint**: `GET /api/v1/strategist/{ward}`

**Parameters**:
- `ward` (path): Ward name (required)
- `depth` (query): Analysis depth - `quick`, `standard`, `deep` (default: `standard`)
- `context` (query): Strategic context - `defensive`, `neutral`, `offensive` (default: `neutral`)

**Example Request**:
```bash
curl -X GET "http://localhost:5000/api/v1/strategist/Jubilee%20Hills?depth=standard&context=neutral" \
  -b cookies.txt
```

**Response**:
```json
{
  "ward": "Jubilee Hills",
  "analysis_depth": "standard",
  "strategic_context": "neutral",
  "timestamp": "2025-08-27T10:00:00Z",
  "status": "analysis_complete",
  "confidence_score": 0.85,
  "briefing": {
    "key_issue": "Infrastructure concerns dominate voter sentiment",
    "our_angle": "Position as infrastructure champion with track record",
    "opposition_weakness": "Inconsistent messaging on development",
    "strategic_recommendations": [
      {
        "action": "Community infrastructure tour",
        "timeline": "Within 72 hours",
        "priority": "high",
        "details": "Visit 3 key infrastructure projects"
      }
    ]
  },
  "intelligence": {
    "sentiment_analysis": {
      "overall_sentiment": "neutral_positive",
      "key_concerns": ["infrastructure", "traffic", "water"],
      "engagement_level": "moderate"
    }
  }
}
```

### 2. SSE Intelligence Feed
Real-time Server-Sent Events stream for intelligence updates.

**Endpoint**: `GET /api/v1/strategist/feed`

**Parameters**:
- `ward` (query): Ward to monitor (required)
- `priority` (query): Filter by priority - `all`, `high`, `critical` (default: `all`)
- `since` (query): ISO timestamp for updates since

**Example Request**:
```bash
curl -N -H "Accept: text/event-stream" \
  "http://localhost:5000/api/v1/strategist/feed?ward=Jubilee%20Hills&priority=high" \
  -b cookies.txt
```

**SSE Event Types**:
- `connection`: Initial connection confirmation
- `heartbeat`: Keep-alive signal (every 30 seconds)
- `intelligence`: New intelligence update
- `error`: Error notification
- `complete`: Stream completion

**Example SSE Stream**:
```
data: {"type":"connection","status":"connected","ward":"Jubilee Hills"}

data: {"type":"intelligence","data":{"id":"alert_123","priority":"high","title":"Opposition rally planned","content":"..."}}

data: {"type":"heartbeat","timestamp":1693526400,"connection_id":"jh_1693526400"}

data: {"type":"complete","reason":"feed_complete"}
```

### 3. Health Check
Monitor system health and component status.

**Endpoint**: `GET /api/v1/strategist/health`

**Example Request**:
```bash
curl -X GET http://localhost:5000/api/v1/strategist/health \
  -b cookies.txt
```

**Response**:
```json
{
  "status": "healthy",
  "timestamp": "2025-08-27T10:00:00Z",
  "check_duration_ms": 125.5,
  "components": [
    {
      "name": "database",
      "status": "up",
      "latency_ms": 2.5,
      "message": "Connected, 10 users"
    },
    {
      "name": "ai_services",
      "status": "up",
      "message": "All services operational: gemini, perplexity",
      "metadata": {
        "configured_services": {
          "gemini": true,
          "perplexity": true
        }
      }
    },
    {
      "name": "sse_system",
      "status": "up",
      "message": "Operational: 5/100 connections",
      "metadata": {
        "active_connections": 5,
        "load_percentage": 5.0
      }
    }
  ],
  "summary": {
    "total_components": 5,
    "healthy_components": 5,
    "health_percentage": 100.0
  }
}
```

### 4. Content Analysis
Analyze arbitrary text for political insights.

**Endpoint**: `POST /api/v1/strategist/analyze`

**Request Body**:
```json
{
  "text": "Content to analyze",
  "ward": "Ward context",
  "context": "Analysis context mode"
}
```

**Example Request**:
```bash
curl -X POST http://localhost:5000/api/v1/strategist/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Opposition party announced new infrastructure policy",
    "ward": "Jubilee Hills",
    "context": "proactive"
  }' \
  -b cookies.txt
```

### 5. Trigger Analysis
Manually trigger fresh analysis for a ward.

**Endpoint**: `POST /api/v1/strategist/trigger`

**Request Body**:
```json
{
  "ward": "Ward name",
  "depth": "Analysis depth",
  "priority": "Analysis priority"
}
```

**Example Request**:
```bash
curl -X POST http://localhost:5000/api/v1/strategist/trigger \
  -H "Content-Type: application/json" \
  -d '{
    "ward": "Jubilee Hills",
    "depth": "deep",
    "priority": "high"
  }' \
  -b cookies.txt
```

### 6. System Status
Get strategist system configuration and status.

**Endpoint**: `GET /api/v1/strategist/status`

**Response**:
```json
{
  "strategist_enabled": true,
  "strategist_mode": "production",
  "ai_services": {
    "gemini": true,
    "perplexity": true
  },
  "cache_enabled": true,
  "system_uptime": 3600.5,
  "performance_summary": {
    "total_requests": 1234,
    "average_response_time_ms": 250.5,
    "cache_hit_rate": 0.85
  }
}
```

## SSE Connection Best Practices

### Client Implementation
```javascript
// JavaScript SSE client example
class StrategistSSEClient {
  constructor(ward, priority = 'all') {
    this.ward = ward;
    this.priority = priority;
    this.reconnectDelay = 1000;
    this.maxReconnectDelay = 30000;
    this.reconnectAttempts = 0;
  }

  connect() {
    const url = `/api/v1/strategist/feed?ward=${this.ward}&priority=${this.priority}`;
    this.eventSource = new EventSource(url, { withCredentials: true });
    
    this.eventSource.onopen = () => {
      console.log('SSE connection established');
      this.reconnectAttempts = 0;
      this.reconnectDelay = 1000;
    };
    
    this.eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      this.handleEvent(data);
    };
    
    this.eventSource.onerror = (error) => {
      console.error('SSE error:', error);
      this.eventSource.close();
      this.scheduleReconnect();
    };
  }
  
  handleEvent(data) {
    switch(data.type) {
      case 'connection':
        console.log('Connected to strategist feed');
        break;
      case 'heartbeat':
        // Update last heartbeat time
        break;
      case 'intelligence':
        this.processIntelligence(data.data);
        break;
      case 'error':
        if (data.recoverable) {
          this.scheduleReconnect();
        }
        break;
      case 'complete':
        this.eventSource.close();
        break;
    }
  }
  
  scheduleReconnect() {
    setTimeout(() => {
      this.reconnectAttempts++;
      this.reconnectDelay = Math.min(
        this.reconnectDelay * 2,
        this.maxReconnectDelay
      );
      this.connect();
    }, this.reconnectDelay);
  }
  
  processIntelligence(data) {
    // Handle intelligence update
    console.log('New intelligence:', data);
  }
  
  disconnect() {
    if (this.eventSource) {
      this.eventSource.close();
    }
  }
}

// Usage
const client = new StrategistSSEClient('Jubilee Hills', 'high');
client.connect();
```

### Connection Management
1. **Heartbeat Monitoring**: Expect heartbeat every 30 seconds
2. **Automatic Reconnection**: Implement exponential backoff
3. **Connection Limits**: Maximum 100 concurrent connections
4. **Authentication**: Include session cookies with requests
5. **Error Handling**: Handle both recoverable and fatal errors

## Error Codes

### HTTP Status Codes
- `200`: Success
- `304`: Not Modified (cached response valid)
- `400`: Bad Request (invalid parameters)
- `401`: Unauthorized (authentication required)
- `402`: Payment Required (budget exceeded)
- `429`: Too Many Requests (rate limited)
- `500`: Internal Server Error
- `503`: Service Unavailable

### Application Error Codes
- `STRATEGIST_001`: AI service unavailable
- `STRATEGIST_002`: Analysis timeout
- `STRATEGIST_003`: Invalid ward parameter
- `STRATEGIST_004`: Rate limit exceeded
- `STRATEGIST_005`: Content filtering triggered
- `STRATEGIST_006`: Authentication required
- `STRATEGIST_007`: Cache operation failed
- `STRATEGIST_008`: SSE connection error

## Caching Strategy

### Cache Keys
- Ward analysis: `strategist:ward:{ward}:{depth}`
- Intelligence feed: `strategist:feed:{ward}:{priority}`
- Content analysis: `strategist:content:{hash}`

### TTL Values
- Quick analysis: 5 minutes
- Standard analysis: 15 minutes
- Deep analysis: 30 minutes
- Intelligence feed: 2 minutes

### Cache Headers
```
ETag: "686897696a7c876b7e"
Cache-Control: public, max-age=900
X-Cache-Hit: true
```

## Performance Optimization

### Connection Pooling
- Gemini: 3 concurrent connections
- Perplexity: 2 concurrent connections
- Database: 10 connection pool size
- Redis: 20 connection pool size

### Request Batching
Batch multiple ward analyses:
```bash
curl -X POST http://localhost:5000/api/v1/strategist/batch \
  -H "Content-Type: application/json" \
  -d '{
    "wards": ["Jubilee Hills", "Banjara Hills", "Madhapur"],
    "depth": "quick"
  }' \
  -b cookies.txt
```

### Async Processing
Long-running analyses return immediately with tracking ID:
```json
{
  "tracking_id": "analysis_12345",
  "status_url": "/api/v1/strategist/status/analysis_12345",
  "estimated_completion": "2-3 minutes"
}
```

## Testing

### Health Check
```bash
# Quick health check
curl http://localhost:5000/api/v1/strategist/health

# Readiness probe
curl http://localhost:5000/api/v1/strategist/ready

# Liveness probe  
curl http://localhost:5000/api/v1/strategist/alive
```

### SSE Testing
```bash
# Test SSE with timeout
timeout 10 curl -N -H "Accept: text/event-stream" \
  "http://localhost:5000/api/v1/strategist/feed?ward=Test" \
  -b cookies.txt
```

### Load Testing
```bash
# Using Apache Bench
ab -n 100 -c 10 -C "session=..." \
  http://localhost:5000/api/v1/strategist/Jubilee%20Hills

# Using curl in parallel
for i in {1..10}; do
  curl "http://localhost:5000/api/v1/strategist/Ward$i" -b cookies.txt &
done
```

## Monitoring

### Metrics Endpoints
- `/api/v1/strategist/metrics`: Prometheus metrics
- `/api/v1/strategist/cache/stats`: Cache statistics
- `/api/v1/strategist/connections`: SSE connection details

### Key Metrics to Monitor
1. **Response Times**: p50, p95, p99 latencies
2. **Error Rates**: 4xx and 5xx errors per minute
3. **AI Service Usage**: Requests and costs per service
4. **Cache Performance**: Hit rate, eviction rate
5. **SSE Connections**: Active connections, disconnection rate

## Security Considerations

### Authentication
- Session-based authentication required
- CORS headers configured for frontend origin
- Cookie security flags (HttpOnly, Secure in production)

### Input Validation
- Ward names limited to 100 characters
- Content analysis limited to 10,000 characters
- Depth and context parameters validated against whitelist

### Rate Limiting
- Per-user rate limits enforced
- AI service usage tracked and limited
- Connection limits prevent resource exhaustion

### Content Filtering
- Political content filtered for inappropriate material
- Guardrails prevent generation of harmful content
- Sensitive information redacted from responses