# Multi-Model AI System Architecture

## Executive Summary

LokDarpan's Multi-Model AI System orchestrates Claude, Perplexity, OpenAI, and local Llama 4 models to deliver comprehensive political intelligence analysis within a A$500/month budget. The system achieves sub-2-minute report generation through intelligent routing, parallel processing, and cost-optimized caching.

## Architecture Overview

### High-Level System Design

```
┌─────────────────────────────────────────────────────────────────┐
│                    Frontend Layer (React + SSE)                 │
├─────────────────────────────────────────────────────────────────┤
│                     API Gateway & Security                      │
├─────────────────────────────────────────────────────────────────┤
│              Multi-Model AI Orchestration Engine               │
│  ┌─────────────┬─────────────┬─────────────┬─────────────────┐ │
│  │   Claude    │ Perplexity  │   OpenAI    │    Llama 4      │ │
│  │  (Analysis) │  (Retrieval)│ (Embeddings)│   (Fallback)    │ │
│  └─────────────┴─────────────┴─────────────┴─────────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│                Intelligence Generation Pipeline                 │
│  ┌─────────────┬─────────────┬─────────────┬─────────────────┐ │
│  │   Report    │  Quality    │   Vector    │    Real-time    │ │
│  │ Generation  │ Assurance   │   Search    │   Processing    │ │
│  └─────────────┴─────────────┴─────────────┴─────────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│                      Data & Caching Layer                      │
│  ┌─────────────┬─────────────┬─────────────┬─────────────────┐ │
│  │ PostgreSQL  │    Redis    │  pgvector   │     Celery      │ │
│  │ (Primary)   │  (Cache)    │ (Vectors)   │  (Background)   │ │
│  └─────────────┴─────────────┴─────────────┴─────────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│                    Monitoring & Observability                  │
└─────────────────────────────────────────────────────────────────┘
```

## Core Components

### 1. AI Orchestration Engine

**Location**: `backend/app/services/ai_orchestrator.py`

The central coordination system that intelligently routes queries to optimal AI models based on complexity, cost, and quality requirements.

#### Key Features
- **Intelligent Routing**: Query complexity analysis and optimal model selection
- **Circuit Breaker Pattern**: Automatic failover when services are degraded
- **Cost Management**: Real-time budget tracking and spend optimization
- **Quality Validation**: Response quality assessment and threshold enforcement

#### Query Analysis Pipeline

```python
class QueryAnalysis:
    complexity: QueryComplexity  # SIMPLE, MODERATE, COMPLEX, URGENT
    estimated_cost_usd: float   # Predicted request cost
    recommended_models: List[ModelProvider]  # Optimal model sequence
    political_relevance: float  # 0.0-1.0 electoral relevance
    processing_time_estimate: int  # Expected seconds
```

#### Routing Decision Matrix

| Query Type | Complexity | Primary Model | Fallback Chain | Cost Range |
|------------|------------|---------------|----------------|------------|
| **Factual Questions** | Simple | Llama Local | OpenAI → Perplexity | $0.00-0.05 |
| **News Analysis** | Simple-Moderate | Perplexity | Claude → Llama | $0.05-0.15 |
| **Strategic Analysis** | Complex | Claude | Llama → OpenAI | $0.25-0.50 |
| **Crisis Response** | Urgent | Fastest Available | All Others | Variable |
| **Comparative Analysis** | Complex | Claude + Perplexity | Parallel Processing | $0.35-0.75 |

### 2. AI Service Implementations

#### 2.1 Claude Integration (`claude_client.py`)

**Purpose**: Complex strategic analysis and nuanced political reasoning

```python
class ClaudeClient:
    def __init__(self):
        self.client = anthropic.Anthropic(api_key=os.getenv('CLAUDE_API_KEY'))
        self.rate_limiter = RateLimiter(requests_per_minute=50)
        self.cost_tracker = CostTracker()
    
    async def generate_response(self, query: str, context: Dict, request_id: str) -> AIResponse:
        # Strategic analysis with political context awareness
        prompt = self._build_political_analysis_prompt(query, context)
        
        response = await self.client.messages.create(
            model="claude-3-5-sonnet-20241022",
            max_tokens=4000,
            temperature=0.2,
            messages=[{"role": "user", "content": prompt}]
        )
        
        return self._parse_structured_response(response)
```

**Optimizations**:
- Context-aware prompt engineering for political analysis
- Structured output parsing for consistent response format
- Token usage optimization through prompt compression
- Response caching for similar strategic queries

#### 2.2 Perplexity Integration (`perplexity_client.py`)

**Purpose**: Real-time information retrieval and current events analysis

```python
class PerplexityClient:
    def __init__(self):
        self.client = httpx.AsyncClient()
        self.base_url = "https://api.perplexity.ai"
        self.model = "llama-3.1-sonar-large-128k-online"
    
    async def generate_response(self, query: str, context: Dict, request_id: str) -> AIResponse:
        # Real-time political intelligence gathering
        search_optimized_query = self._optimize_for_current_events(query, context)
        
        response = await self.client.post(
            f"{self.base_url}/chat/completions",
            json={
                "model": self.model,
                "messages": [
                    {"role": "system", "content": self._get_political_system_prompt()},
                    {"role": "user", "content": search_optimized_query}
                ],
                "return_citations": True,
                "search_domain_filter": ["timesofindia.com", "thehindu.com", "ndtv.com"]
            }
        )
        
        return self._extract_citations_and_content(response.json())
```

**Features**:
- Real-time web search integration
- Domain filtering for credible news sources
- Citation extraction and verification
- Temporal query optimization for recent events

#### 2.3 OpenAI Integration (`openai_client.py`)

**Purpose**: Vector embeddings for similarity search and semantic analysis

```python
class OpenAIClient:
    def __init__(self):
        self.client = openai.AsyncOpenAI(api_key=os.getenv('OPENAI_API_KEY'))
        self.embedding_model = "text-embedding-3-small"
        self.vector_store = VectorStore()
    
    async def generate_embeddings(self, texts: List[str]) -> List[np.ndarray]:
        # Batch embedding generation for cost efficiency
        response = await self.client.embeddings.create(
            model=self.embedding_model,
            input=texts[:100],  # Batch limit
            encoding_format="float"
        )
        
        return [np.array(item.embedding) for item in response.data]
    
    async def semantic_search(self, query: str, context: Dict) -> List[SimilarDocument]:
        # Political context-aware semantic search
        query_embedding = await self.generate_embeddings([query])
        
        similar_docs = await self.vector_store.similarity_search(
            query_embedding[0],
            filter_metadata={"ward": context.get("ward"), "political_relevance": ">0.7"}
        )
        
        return similar_docs
```

#### 2.4 Local Llama Integration (`llama_client.py`)

**Purpose**: Cost-effective fallback processing and simple query handling

```python
class LlamaClient:
    def __init__(self):
        self.client = httpx.AsyncClient(base_url="http://localhost:11434")
        self.model = "llama3:latest"
        self.local_cache = LocalCache()
    
    async def generate_response(self, query: str, context: Dict, request_id: str) -> AIResponse:
        # Local processing with cost optimization
        cached_response = await self.local_cache.get(query)
        if cached_response:
            return cached_response
        
        response = await self.client.post("/api/generate", json={
            "model": self.model,
            "prompt": self._build_efficient_prompt(query, context),
            "stream": False,
            "options": {
                "temperature": 0.3,
                "num_predict": 1500,  # Optimized for speed
                "stop": ["###", "---"]  # Early stopping tokens
            }
        })
        
        parsed_response = self._parse_local_response(response.json())
        await self.local_cache.set(query, parsed_response, ttl=3600)
        
        return parsed_response
```

### 3. Intelligence Generation Pipeline

#### 3.1 Report Generation Workflow

```python
async def generate_intelligence_report(self, request: ReportRequest) -> IntelligenceReport:
    # Phase 1: Parallel Data Collection (30 seconds target)
    async with asyncio.TaskGroup() as data_collection:
        recent_developments = data_collection.create_task(
            self._get_recent_political_developments(request)
        )
        historical_context = data_collection.create_task(
            self._get_historical_political_context(request)
        )
        sentiment_analysis = data_collection.create_task(
            self._get_current_sentiment_trends(request)
        )
    
    # Phase 2: AI Analysis (60 seconds target)
    analysis_context = self._combine_intelligence_data(
        recent_developments.result(),
        historical_context.result(),
        sentiment_analysis.result()
    )
    
    ai_analysis = await self.ai_orchestrator.generate_response(
        query=self._build_comprehensive_analysis_query(request),
        context=analysis_context
    )
    
    # Phase 3: Report Synthesis (30 seconds target)
    structured_report = await self._synthesize_intelligence_report(
        ai_analysis=ai_analysis,
        supporting_data=analysis_context,
        template=request.report_template
    )
    
    # Phase 4: Quality Validation and Caching
    quality_score = await self.quality_validator.assess_report(structured_report)
    await self._cache_intelligence_report(request, structured_report)
    
    return structured_report
```

#### 3.2 Quality Validation Framework

```python
class QualityValidator:
    async def assess_response(self, query: str, content: str, context: Dict) -> float:
        # Multi-dimensional quality assessment
        scores = await asyncio.gather(
            self._assess_factual_accuracy(content),
            self._assess_political_relevance(content, context),
            self._assess_source_credibility(content),
            self._assess_actionability(content, context),
            self._assess_coherence_and_clarity(content)
        )
        
        # Weighted quality score
        weights = [0.25, 0.25, 0.20, 0.15, 0.15]
        quality_score = sum(score * weight for score, weight in zip(scores, weights))
        
        return min(1.0, max(0.0, quality_score))
    
    async def _assess_political_relevance(self, content: str, context: Dict) -> float:
        # Political context relevance scoring
        ward_mentions = self._count_ward_references(content, context.get("ward"))
        political_terms = self._count_political_terminology(content)
        electoral_relevance = self._assess_electoral_context(content)
        
        return (ward_mentions * 0.4 + political_terms * 0.3 + electoral_relevance * 0.3)
```

### 4. Vector Search and Embeddings Architecture

#### 4.1 pgvector Integration

```sql
-- Vector storage schema
CREATE TABLE embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content TEXT NOT NULL,
    embedding vector(1536),  -- OpenAI text-embedding-3-small
    metadata JSONB NOT NULL,
    ward_context VARCHAR(100),
    political_relevance DECIMAL(3,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Optimized indexes for political intelligence
CREATE INDEX ON embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX ON embeddings (ward_context) WHERE ward_context IS NOT NULL;
CREATE INDEX ON embeddings (political_relevance) WHERE political_relevance > 0.7;
CREATE INDEX ON embeddings USING gin (metadata);
```

#### 4.2 Intelligent Embedding Pipeline

```python
class EmbeddingPipeline:
    async def process_political_content(self, content: PoliticalContent) -> str:
        # Enhanced content preprocessing for political context
        preprocessed = self._enhance_political_context(content)
        
        # Generate embedding with political awareness
        embedding = await self.openai_client.generate_embeddings([preprocessed])
        
        # Store with rich metadata
        await self.vector_store.store_document({
            "content": content.text,
            "embedding": embedding[0],
            "metadata": {
                "source_type": content.source_type,
                "ward_context": content.ward,
                "political_parties_mentioned": content.parties,
                "issue_categories": content.issues,
                "sentiment_score": content.sentiment,
                "credibility_score": content.credibility,
                "electoral_relevance": content.electoral_relevance
            }
        })
```

### 5. Caching and Performance Optimization

#### 5.1 Multi-Layer Caching Strategy

```python
class IntelligentCacheManager:
    def __init__(self):
        self.redis_client = redis.Redis.from_url(os.getenv('REDIS_URL'))
        self.cache_strategies = {
            "political_analysis": PoliticalAnalysisCacheStrategy(),
            "real_time_data": RealTimeDataCacheStrategy(),
            "embeddings": EmbeddingCacheStrategy()
        }
    
    async def get_cached_analysis(self, query: str, context: Dict) -> Optional[AIResponse]:
        # Hierarchical cache lookup
        cache_key = self._generate_contextual_cache_key(query, context)
        
        # L1: Exact match cache (Redis)
        exact_match = await self.redis_client.get(cache_key)
        if exact_match:
            return pickle.loads(exact_match)
        
        # L2: Similarity-based cache lookup
        similar_analyses = await self._find_similar_cached_analyses(query, context)
        if similar_analyses:
            best_match = self._select_best_cache_match(similar_analyses, context)
            if best_match.similarity_score > 0.85:
                return self._adapt_cached_response(best_match, context)
        
        return None
    
    async def store_analysis(self, query: str, context: Dict, response: AIResponse):
        # Intelligent cache storage with metadata
        cache_key = self._generate_contextual_cache_key(query, context)
        
        # Determine cache TTL based on content type
        ttl = self._calculate_cache_ttl(response, context)
        
        # Store with enriched metadata for similarity matching
        cache_entry = {
            "response": response,
            "query_metadata": self._extract_query_features(query),
            "context_metadata": context,
            "political_entities": self._extract_political_entities(response.content),
            "cached_at": datetime.utcnow(),
            "cache_version": "v1.2"
        }
        
        await self.redis_client.setex(
            cache_key,
            ttl,
            pickle.dumps(cache_entry)
        )
```

#### 5.2 Cache Performance Optimization

- **Hit Rate Target**: 75%+ for similar political queries
- **Storage Efficiency**: Compressed storage with 60% size reduction
- **TTL Strategy**: Dynamic expiration based on content volatility
- **Invalidation**: Smart invalidation on political development updates

### 6. Real-time Processing Architecture

#### 6.1 Server-Sent Events (SSE) Implementation

```python
class PoliticalIntelligenceStream:
    def __init__(self):
        self.redis_pubsub = redis.Redis().pubsub()
        self.active_streams = {}
    
    async def create_intelligence_stream(self, ward: str, user_id: str) -> AsyncGenerator:
        stream_id = f"stream:{ward}:{user_id}"
        
        # Subscribe to relevant political events
        channels = [
            f"political_developments:{ward}",
            f"sentiment_changes:{ward}",
            f"news_updates:{ward}",
            "national_political_events"
        ]
        
        await self.redis_pubsub.subscribe(*channels)
        
        try:
            async for message in self.redis_pubsub.listen():
                if message['type'] == 'message':
                    political_event = self._parse_political_event(message)
                    
                    # Filter and enrich event for user context
                    if self._should_notify_user(political_event, ward, user_id):
                        enriched_event = await self._enrich_political_event(political_event)
                        yield f"data: {json.dumps(enriched_event)}\n\n"
                        
        finally:
            await self.redis_pubsub.unsubscribe(*channels)
```

#### 6.2 Background Processing with Celery

```python
@celery.task(bind=True, max_retries=3)
def process_political_intelligence_update(self, content_data: Dict):
    try:
        # Multi-stage processing pipeline
        
        # Stage 1: Content analysis and classification
        classified_content = analyze_political_content(content_data)
        
        # Stage 2: Impact assessment
        impact_analysis = assess_political_impact(classified_content)
        
        # Stage 3: Stakeholder notification
        if impact_analysis.significance > 0.7:
            notify_relevant_users(impact_analysis)
        
        # Stage 4: Knowledge base update
        update_political_knowledge_base(classified_content, impact_analysis)
        
        return {
            "status": "success",
            "processed_content_id": classified_content.id,
            "impact_score": impact_analysis.significance
        }
        
    except Exception as exc:
        logger.error(f"Political intelligence processing failed: {exc}")
        raise self.retry(countdown=60, exc=exc)
```

## Performance Specifications

### Response Time Targets

| Operation Type | Target Time | Maximum Time | Success Rate |
|----------------|-------------|---------------|--------------|
| Simple Analysis | 15 seconds | 30 seconds | 99.5% |
| Standard Analysis | 45 seconds | 90 seconds | 98.0% |
| Complex Analysis | 90 seconds | 120 seconds | 95.0% |
| Real-time Stream | 500ms latency | 2s latency | 99.9% |

### Cost Management

| Model Provider | Cost per 1K Tokens | Usage Allocation | Monthly Budget |
|----------------|-------------------|------------------|----------------|
| Claude | $0.015 (output) | 35% ($175) | Complex analysis |
| Perplexity | $0.001 | 25% ($125) | Real-time data |
| OpenAI | $0.00002 (embed) | 20% ($100) | Embeddings |
| Llama Local | $0.00 | 20% ($100 saved) | Simple queries |

### Quality Metrics

- **Minimum Quality Score**: 0.7 for production responses
- **Political Relevance**: 0.8+ for constituency-specific analysis
- **Source Credibility**: 0.75+ average across citations
- **Response Coherence**: 0.85+ for user comprehension

## Security and Privacy

### Data Protection

```python
class PoliticalDataProtection:
    def __init__(self):
        self.pii_detector = PIIDetector()
        self.encryption_service = AESEncryption()
        self.audit_logger = SecurityAuditLogger()
    
    async def sanitize_political_content(self, content: str) -> str:
        # Remove PII while preserving political context
        sanitized = await self.pii_detector.sanitize(content)
        
        # Log data handling for audit
        await self.audit_logger.log_data_processing({
            "operation": "sanitization",
            "content_length": len(content),
            "pii_entities_removed": len(self.pii_detector.detected_entities),
            "timestamp": datetime.utcnow()
        })
        
        return sanitized
```

### Access Control

- **Role-based Access**: Campaign team role-based permissions
- **Ward-level Security**: Users can only access assigned constituencies
- **API Rate Limiting**: Tiered rate limits based on user role and subscription
- **Audit Logging**: Comprehensive activity logging for security monitoring

## Monitoring and Observability

### Key Performance Indicators (KPIs)

1. **System Performance**
   - Average response time by query complexity
   - Model availability and circuit breaker states
   - Cache hit rates and storage efficiency
   - API error rates and timeout frequencies

2. **AI Quality Metrics**
   - Response quality scores by model and query type
   - Political relevance accuracy
   - Source citation credibility
   - User satisfaction ratings

3. **Cost Efficiency**
   - Cost per query by model
   - Monthly budget utilization
   - Cost optimization opportunities
   - ROI on different analysis types

4. **User Experience**
   - Feature adoption rates
   - Session duration and engagement
   - Support ticket volume and resolution time
   - Campaign outcome correlation

### Alerting and Notifications

```python
class SystemMonitoring:
    async def check_system_health(self):
        health_metrics = {
            "ai_models": await self._check_ai_model_health(),
            "database": await self._check_database_health(),
            "cache": await self._check_cache_health(),
            "budget": await self._check_budget_status()
        }
        
        # Trigger alerts for critical issues
        for component, status in health_metrics.items():
            if status.severity >= AlertSeverity.CRITICAL:
                await self._trigger_alert(component, status)
        
        return health_metrics
```

## Deployment Architecture

### Production Environment

```yaml
# docker-compose.yml for production
version: '3.8'
services:
  lokdarpan-api:
    image: lokdarpan/api:latest
    environment:
      - DATABASE_URL=postgresql://user:pass@postgres:5432/lokdarpan_prod
      - REDIS_URL=redis://redis:6379/0
      - CLAUDE_API_KEY=${CLAUDE_API_KEY}
      - PERPLEXITY_API_KEY=${PERPLEXITY_API_KEY}
      - OPENAI_API_KEY=${OPENAI_API_KEY}
    depends_on: [postgres, redis, ollama]
    
  postgres:
    image: pgvector/pgvector:pg15
    environment:
      - POSTGRES_DB=lokdarpan_prod
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      
  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data
      
  ollama:
    image: ollama/ollama:latest
    volumes:
      - ollama_data:/root/.ollama
```

## Future Enhancements

### Planned Improvements

1. **Advanced AI Features**
   - Multi-modal analysis (image, video content)
   - Predictive modeling for electoral outcomes
   - Automated report generation templates
   - Voice-to-text political speech analysis

2. **Performance Optimizations**
   - GraphQL API for flexible data querying
   - CDN integration for static content delivery
   - Database read replicas for query performance
   - Advanced caching with edge computing

3. **Intelligence Capabilities**
   - Social media sentiment analysis integration
   - Automated fact-checking and verification
   - Cross-constituency comparative analytics
   - Real-time polling data integration

---

This architecture provides a robust, scalable, and cost-effective foundation for political intelligence analysis while maintaining high quality standards and operational efficiency within budget constraints.