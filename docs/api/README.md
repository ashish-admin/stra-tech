# LokDarpan Multi-Model AI API Documentation

## Overview

LokDarpan's Multi-Model AI system provides intelligent orchestration across Claude, Perplexity, OpenAI, and local Llama 4 models to deliver comprehensive political intelligence analysis within budget constraints.

## Documentation Structure

### API Reference
- **[Multi-Model AI API](multimodel-api.md)** - Complete API reference for the multi-model system
- **[Political Strategist API](strategist-api.md)** - Enhanced strategist endpoints with AI integration
- **[OpenAPI Specification](../openapi.yaml)** - Machine-readable API specification
- **[Interactive Examples](interactive-examples.md)** - Live API examples and testing interface

### Integration Guides
- **[Quick Start Guide](quickstart.md)** - Get started in 5 minutes
- **[Authentication Guide](authentication.md)** - Session-based auth and API keys
- **[Rate Limiting & Quotas](rate-limiting.md)** - Request limits and budget management
- **[Error Handling](error-handling.md)** - Comprehensive error response guide

### Advanced Topics
- **[Real-time SSE Integration](sse-integration.md)** - Server-Sent Events for live updates
- **[Cost Optimization](cost-optimization.md)** - Managing A$500/month budget effectively
- **[Quality Validation](quality-validation.md)** - Understanding AI response quality metrics
- **[Caching Strategies](caching.md)** - Intelligent caching for performance and cost savings

## Quick Navigation

### Core Endpoints

| Endpoint | Purpose | Documentation |
|----------|---------|---------------|
| `POST /api/v1/multimodel/analyze` | Multi-model political analysis | [Multi-Model API](multimodel-api.md#analyze) |
| `GET /api/v1/strategist/{ward}` | Ward-specific strategic briefing | [Strategist API](strategist-api.md#ward-analysis) |
| `GET /api/v1/strategist/feed` | Real-time intelligence stream | [SSE Integration](sse-integration.md) |
| `GET /api/v1/multimodel/status` | System health and budget monitoring | [Multi-Model API](multimodel-api.md#status) |

### Response Types

- **Strategic Analysis**: Comprehensive political intelligence reports
- **Real-time Updates**: SSE streams for live intelligence
- **Quality Metrics**: AI confidence and validation scores
- **Cost Tracking**: Token usage and budget monitoring

## Authentication

All API endpoints require session-based authentication:

```http
POST /api/v1/login HTTP/1.1
Content-Type: application/json

{
  "username": "campaign_manager",
  "password": "secure_password"
}
```

## Rate Limits

- **Standard requests**: 1000/hour per user
- **AI analysis requests**: 100/hour per user
- **Real-time streams**: 5 concurrent per user
- **Budget protection**: Automatic throttling at 90% monthly spend

## Cost Management

The system operates within a A$500/month budget:

- **Claude**: $15/M output tokens (complex analysis)
- **Perplexity**: $1/M tokens (real-time data)
- **OpenAI**: $20/M tokens (embeddings)
- **Llama Local**: $0 (fallback processing)

## Quality Standards

All AI responses include quality metrics:

- **Confidence Score**: 0.0-1.0 reliability indicator
- **Source Citations**: Verifiable information sources
- **Political Relevance**: 0.0-1.0 relevance to electoral context
- **Processing Time**: Response generation latency

## Support

- **Technical Issues**: [Troubleshooting Guide](../technical/troubleshooting.md)
- **Integration Help**: [Developer Support](developer-support.md)
- **Cost Questions**: [Budget Management](cost-optimization.md)
- **Quality Issues**: [Quality Validation](quality-validation.md)

---

**Next Steps**: Start with the [Quick Start Guide](quickstart.md) to make your first API call, or explore the [Interactive Examples](interactive-examples.md) for hands-on testing.