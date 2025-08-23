# Multi-Model Geopolitical AI System - Technical Architecture

## Executive Summary

This document defines the technical architecture for LokDarpan's Multi-Model Geopolitical Intelligence Engine, extending the existing Political Strategist module to orchestrate Claude, Perplexity Sonar, OpenAI embeddings, and local Llama 4 within a high-performance, cost-optimized framework capable of generating comprehensive geopolitical intelligence reports in under 2 minutes.

## System Overview

### Architecture Principles

**1. Multi-Model Orchestration First**
- Intelligent routing based on query complexity and cost optimization
- Graceful fallback chains ensuring high availability
- Parallel processing where possible for performance optimization

**2. Cost-Conscious Design**
- Smart caching reducing API calls by 40%+
- Local fallback (Llama 4) for cost-sensitive operations
- Real-time budget monitoring with automatic throttling

**3. Performance by Design**
- <2 minute report generation through optimized pipelines
- Vector similarity search with pgvector for sub-500ms responses
- Streaming output for real-time user feedback

**4. Production Resilience**
- Circuit breaker patterns for external API dependencies
- Comprehensive error handling with graceful degradation
- 99.2%+ uptime through redundancy and monitoring

---

## High-Level Architecture

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

---

## Core Components

### 1. Multi-Model AI Orchestration Engine

#### 1.1 AI Service Router
**Location:** `backend/app/strategist/orchestration/router.py`

```python
class AIServiceRouter:
    """Intelligent routing engine for multi-model AI orchestration"""
    
    def __init__(self):
        self.services = {
            'claude': ClaudeService(),
            'perplexity': PerplexityService(), 
            'openai': OpenAIService(),
            'llama': LlamaService()
        }
        self.circuit_breakers = CircuitBreakerManager()
        self.cost_tracker = CostTracker()
    
    async def route_request(self, query: GeopoliticalQuery) -> AIResponse:
        """Route request to optimal AI service based on complexity and cost"""
        # Classification logic
        complexity = self.classify_complexity(query)
        cost_sensitivity = self.assess_cost_sensitivity(query)
        
        # Service selection strategy
        if complexity == 'high' and not cost_sensitivity:
            return await self.execute_with_fallback('claude', query)
        elif query.type == 'factual':
            return await self.execute_with_fallback('perplexity', query)
        elif query.type == 'similarity':
            return await self.vector_search(query)
        else:
            return await self.execute_with_fallback('llama', query)
```

**Key Features:**
- **Complexity Classification:** Natural language processing to determine query complexity
- **Cost-Aware Routing:** Balance performance and cost based on query requirements
- **Circuit Breaker Integration:** Automatic failover when services are degraded
- **Parallel Processing:** Execute multiple AI calls simultaneously when beneficial

#### 1.2 Circuit Breaker Manager
**Location:** `backend/app/strategist/orchestration/circuit_breaker.py`

```python
class CircuitBreakerManager:
    """Manages circuit breakers for external AI services"""
    
    def __init__(self):
        self.breakers = {
            'claude': CircuitBreaker(failure_threshold=5, timeout=30),
            'perplexity': CircuitBreaker(failure_threshold=3, timeout=60),
            'openai': CircuitBreaker(failure_threshold=5, timeout=30),
        }
    
    async def execute_with_fallback(self, service: str, operation: callable):
        """Execute operation with circuit breaker protection and fallback"""
        try:
            if self.breakers[service].state == 'CLOSED':
                return await operation()
            else:
                return await self.execute_fallback(operation)
        except Exception as e:
            self.breakers[service].record_failure()
            return await self.execute_fallback(operation)
```

#### 1.3 Cost Management System
**Location:** `backend/app/strategist/orchestration/cost_tracker.py`

```python
class CostTracker:
    """Real-time cost tracking and budget management"""
    
    def __init__(self, monthly_budget: float = 500.0):
        self.monthly_budget = monthly_budget
        self.current_usage = 0.0
        self.cost_models = {
            'claude': {'input': 0.003, 'output': 0.015},  # per 1k tokens
            'perplexity': {'query': 5.0},  # per 1k queries
            'openai': {'embedding': 0.00002}  # per 1k tokens
        }
    
    async def track_usage(self, service: str, tokens: int, operation_type: str):
        """Track API usage and costs in real-time"""
        cost = self.calculate_cost(service, tokens, operation_type)
        self.current_usage += cost
        
        # Budget monitoring and alerts
        if self.current_usage > self.monthly_budget * 0.8:
            await self.send_budget_alert()
            
        if self.current_usage > self.monthly_budget * 0.9:
            await self.enable_cost_saving_mode()
            
        return cost
```

### 2. AI Service Implementations

#### 2.1 Claude Service
**Location:** `backend/app/strategist/services/claude_service.py`

```python
class ClaudeService:
    """Claude API integration for complex geopolitical analysis"""
    
    def __init__(self):
        self.client = anthropic.Anthropic(api_key=os.getenv('CLAUDE_API_KEY'))
        self.rate_limiter = RateLimiter(requests_per_minute=50)
    
    async def analyze_geopolitical_context(self, query: GeopoliticalQuery) -> AnalysisResult:
        """Perform comprehensive geopolitical analysis using Claude"""
        
        prompt = self.build_analysis_prompt(query)
        
        try:
            async with self.rate_limiter:
                response = await self.client.messages.create(
                    model="claude-3-5-sonnet-20241022",
                    max_tokens=4000,
                    temperature=0.2,
                    messages=[{"role": "user", "content": prompt}]
                )
                
            return self.parse_analysis_response(response.content[0].text)
            
        except Exception as e:
            logger.error(f"Claude API error: {e}")
            raise AIServiceException(f"Claude analysis failed: {e}")
    
    def build_analysis_prompt(self, query: GeopoliticalQuery) -> str:
        """Build structured prompt for geopolitical analysis"""
        return f"""
        Analyze the following geopolitical situation with focus on {query.region}:
        
        Context: {query.context}
        Timeframe: {query.timeframe}
        Specific Questions: {query.questions}
        
        Provide analysis in this structured format:
        1. Situation Assessment
        2. Key Stakeholders & Interests
        3. Risk Factors & Opportunities
        4. Strategic Implications
        5. Recommended Actions
        6. Confidence Assessment (1-100)
        """
```

#### 2.2 Perplexity Sonar Service  
**Location:** `backend/app/strategist/services/perplexity_service.py`

```python
class PerplexityService:
    """Perplexity Sonar API for real-time information retrieval"""
    
    def __init__(self):
        self.client = httpx.AsyncClient(
            headers={"Authorization": f"Bearer {os.getenv('PERPLEXITY_API_KEY')}"}
        )
        self.base_url = "https://api.perplexity.ai"
        
    async def search_recent_developments(self, query: GeopoliticalQuery) -> SearchResults:
        """Search for recent geopolitical developments"""
        
        search_query = self.build_search_query(query)
        
        try:
            response = await self.client.post(
                f"{self.base_url}/chat/completions",
                json={
                    "model": "llama-3.1-sonar-large-128k-online",
                    "messages": [
                        {
                            "role": "system", 
                            "content": "You are a geopolitical intelligence analyst. Provide factual, recent information with source citations."
                        },
                        {"role": "user", "content": search_query}
                    ],
                    "max_tokens": 2000,
                    "temperature": 0.1,
                    "return_citations": True
                }
            )
            
            result = response.json()
            return self.parse_search_results(result)
            
        except Exception as e:
            logger.error(f"Perplexity API error: {e}")
            raise AIServiceException(f"Perplexity search failed: {e}")
    
    def build_search_query(self, query: GeopoliticalQuery) -> str:
        """Build optimized search query for recent developments"""
        return f"""
        Find recent developments (last 72 hours) related to:
        Region: {query.region}
        Topics: {', '.join(query.topics)}
        Focus on: Political developments, economic changes, security issues, diplomatic activities
        
        Provide: Key events, source credibility assessment, timeline of developments
        """
```

#### 2.3 OpenAI Embeddings Service
**Location:** `backend/app/strategist/services/openai_service.py`

```python
class OpenAIService:
    """OpenAI API integration for embeddings and similarity search"""
    
    def __init__(self):
        self.client = openai.AsyncOpenAI(api_key=os.getenv('OPENAI_API_KEY'))
        self.model = "text-embedding-3-small"
        
    async def generate_embeddings(self, texts: List[str]) -> List[np.ndarray]:
        """Generate embeddings for batch of texts"""
        
        try:
            response = await self.client.embeddings.create(
                model=self.model,
                input=texts,
                encoding_format="float"
            )
            
            embeddings = [np.array(item.embedding) for item in response.data]
            return embeddings
            
        except Exception as e:
            logger.error(f"OpenAI embeddings error: {e}")
            raise AIServiceException(f"Embedding generation failed: {e}")
    
    async def find_similar_context(self, query_embedding: np.ndarray, limit: int = 10) -> List[SimilarDocument]:
        """Find similar historical context using vector similarity"""
        
        # Use pgvector for similarity search
        similarity_results = await self.vector_search(query_embedding, limit)
        
        return [
            SimilarDocument(
                content=result.content,
                similarity_score=result.similarity,
                metadata=result.metadata,
                timestamp=result.created_at
            )
            for result in similarity_results
        ]
```

#### 2.4 Local Llama 4 Service
**Location:** `backend/app/strategist/services/llama_service.py`

```python
class LlamaService:
    """Local Llama 4 service for cost-effective fallback operations"""
    
    def __init__(self):
        self.client = httpx.AsyncClient(
            base_url="http://localhost:11434",  # Ollama default
            timeout=60.0
        )
        self.model = "llama3:latest"
        
    async def generate_analysis(self, query: GeopoliticalQuery) -> AnalysisResult:
        """Generate analysis using local Llama 4 model"""
        
        prompt = self.build_local_prompt(query)
        
        try:
            response = await self.client.post(
                "/api/generate",
                json={
                    "model": self.model,
                    "prompt": prompt,
                    "stream": False,
                    "options": {
                        "temperature": 0.3,
                        "top_p": 0.9,
                        "num_predict": 2000
                    }
                }
            )
            
            result = response.json()
            return self.parse_local_response(result["response"])
            
        except Exception as e:
            logger.error(f"Local Llama error: {e}")
            raise AIServiceException(f"Local analysis failed: {e}")
    
    def build_local_prompt(self, query: GeopoliticalQuery) -> str:
        """Build prompt optimized for local Llama model"""
        return f"""
        As a geopolitical analyst, provide a structured analysis of:
        {query.context}
        
        Focus on: {', '.join(query.topics)}
        Region: {query.region}
        
        Structure your response as:
        1. Summary (2-3 sentences)
        2. Key factors (3-5 bullet points)  
        3. Implications (2-3 bullet points)
        4. Confidence level (High/Medium/Low)
        
        Be concise and factual.
        """
```

### 3. Intelligence Generation Pipeline

#### 3.1 Report Generation Engine
**Location:** `backend/app/strategist/reports/generator.py`

```python
class GeopoliticalReportGenerator:
    """Main report generation orchestrator"""
    
    def __init__(self):
        self.ai_router = AIServiceRouter()
        self.template_engine = ReportTemplateEngine()
        self.quality_validator = QualityValidator()
        self.cache_manager = CacheManager()
        
    async def generate_intelligence_report(self, request: ReportRequest) -> IntelligenceReport:
        """Generate comprehensive geopolitical intelligence report"""
        
        # Check cache for recent similar reports
        cached_report = await self.cache_manager.get_similar_report(request)
        if cached_report and not request.force_refresh:
            return cached_report
            
        # Parallel data collection phase (30 seconds target)
        async with asyncio.TaskGroup() as tg:
            # Real-time developments
            recent_task = tg.create_task(
                self.ai_router.route_request(
                    GeopoliticalQuery(
                        type='factual',
                        region=request.region,
                        topics=request.topics,
                        timeframe='72h'
                    )
                )
            )
            
            # Historical context
            context_task = tg.create_task(
                self.get_historical_context(request)
            )
            
            # Economic indicators
            economic_task = tg.create_task(
                self.get_economic_indicators(request.region)
            )
        
        # Analysis phase (60 seconds target)
        analysis = await self.ai_router.route_request(
            GeopoliticalQuery(
                type='analysis',
                region=request.region,
                topics=request.topics,
                context=self.combine_context(recent_task.result(), context_task.result()),
                economic_data=economic_task.result()
            )
        )
        
        # Synthesis phase (30 seconds target)
        report = await self.template_engine.generate_report(
            analysis=analysis,
            recent_developments=recent_task.result(),
            historical_context=context_task.result(),
            economic_indicators=economic_task.result(),
            template=request.template or 'comprehensive'
        )
        
        # Quality validation
        quality_score = await self.quality_validator.validate_report(report)
        report.quality_score = quality_score
        
        # Cache for future use
        await self.cache_manager.store_report(request, report)
        
        return report
```

#### 3.2 Template Engine
**Location:** `backend/app/strategist/reports/templates.py`

```python
class ReportTemplateEngine:
    """Handles report formatting and template management"""
    
    def __init__(self):
        self.templates = {
            'executive': ExecutiveSummaryTemplate(),
            'comprehensive': ComprehensiveAnalysisTemplate(),
            'tactical': TacticalBriefTemplate(),
            'strategic': StrategicAssessmentTemplate()
        }
    
    async def generate_report(self, **kwargs) -> IntelligenceReport:
        """Generate formatted report using specified template"""
        
        template_name = kwargs.get('template', 'comprehensive')
        template = self.templates[template_name]
        
        report = await template.generate(
            analysis=kwargs['analysis'],
            recent_developments=kwargs['recent_developments'],
            historical_context=kwargs['historical_context'],
            economic_indicators=kwargs['economic_indicators']
        )
        
        # Add metadata
        report.metadata = ReportMetadata(
            generated_at=datetime.utcnow(),
            template_used=template_name,
            data_sources=self.extract_sources(kwargs),
            confidence_score=self.calculate_confidence(kwargs),
            validity_period='72h'
        )
        
        return report

class ComprehensiveAnalysisTemplate:
    """Template for comprehensive geopolitical analysis reports"""
    
    async def generate(self, analysis, recent_developments, historical_context, economic_indicators) -> IntelligenceReport:
        """Generate comprehensive analysis report"""
        
        return IntelligenceReport(
            title=f"Geopolitical Intelligence Brief: {analysis.region}",
            executive_summary=self.generate_executive_summary(analysis),
            sections=[
                ReportSection(
                    title="Current Situation Assessment",
                    content=self.format_situation_assessment(analysis, recent_developments),
                    confidence=analysis.confidence_score
                ),
                ReportSection(
                    title="Key Stakeholders & Interests",
                    content=self.format_stakeholder_analysis(analysis),
                    confidence=analysis.confidence_score
                ),
                ReportSection(
                    title="Historical Context & Patterns",
                    content=self.format_historical_analysis(historical_context),
                    confidence=historical_context.confidence_score
                ),
                ReportSection(
                    title="Economic Factors & Implications", 
                    content=self.format_economic_analysis(economic_indicators),
                    confidence=economic_indicators.confidence_score
                ),
                ReportSection(
                    title="Risk Assessment & Opportunities",
                    content=self.format_risk_analysis(analysis),
                    confidence=analysis.confidence_score
                ),
                ReportSection(
                    title="Strategic Recommendations",
                    content=self.format_recommendations(analysis),
                    confidence=analysis.confidence_score
                ),
                ReportSection(
                    title="Monitoring & Next Steps",
                    content=self.format_monitoring_plan(analysis),
                    confidence=0.9  # High confidence in monitoring recommendations
                )
            ],
            appendices=[
                ReportAppendix(
                    title="Data Sources & Methodology",
                    content=self.format_methodology(analysis)
                ),
                ReportAppendix(
                    title="Confidence Assessment",
                    content=self.format_confidence_analysis(analysis)
                )
            ]
        )
```

### 4. Vector Search & Embeddings

#### 4.1 pgvector Integration
**Location:** `backend/app/strategist/embeddings/vector_store.py`

```python
class VectorStore:
    """pgvector-based vector storage and similarity search"""
    
    def __init__(self):
        self.db = get_db()
        self.openai_service = OpenAIService()
        
    async def store_document(self, document: Document) -> str:
        """Store document with generated embedding"""
        
        # Generate embedding
        embedding = await self.openai_service.generate_embeddings([document.content])
        
        # Store in database
        query = """
            INSERT INTO embeddings (id, content, embedding, metadata, created_at)
            VALUES (%(id)s, %(content)s, %(embedding)s, %(metadata)s, %(created_at)s)
        """
        
        doc_id = str(uuid.uuid4())
        await self.db.execute(query, {
            'id': doc_id,
            'content': document.content,
            'embedding': embedding[0].tolist(),
            'metadata': document.metadata,
            'created_at': datetime.utcnow()
        })
        
        return doc_id
    
    async def similarity_search(self, query_embedding: np.ndarray, limit: int = 10, threshold: float = 0.7) -> List[SimilarDocument]:
        """Perform similarity search using pgvector"""
        
        query = """
            SELECT id, content, metadata, created_at,
                   1 - (embedding <=> %(query_embedding)s) as similarity
            FROM embeddings 
            WHERE 1 - (embedding <=> %(query_embedding)s) > %(threshold)s
            ORDER BY embedding <=> %(query_embedding)s
            LIMIT %(limit)s
        """
        
        results = await self.db.fetch_all(query, {
            'query_embedding': query_embedding.tolist(),
            'threshold': threshold,
            'limit': limit
        })
        
        return [
            SimilarDocument(
                id=row['id'],
                content=row['content'],
                similarity_score=row['similarity'],
                metadata=row['metadata'],
                timestamp=row['created_at']
            )
            for row in results
        ]
```

#### 4.2 Embedding Pipeline
**Location:** `backend/app/strategist/embeddings/pipeline.py`

```python
class EmbeddingPipeline:
    """Automated embedding generation and management"""
    
    def __init__(self):
        self.vector_store = VectorStore()
        self.openai_service = OpenAIService()
        self.batch_size = 100
        
    async def process_batch(self, documents: List[Document]) -> Dict[str, str]:
        """Process batch of documents for embedding generation"""
        
        results = {}
        
        # Process in batches to optimize API usage
        for i in range(0, len(documents), self.batch_size):
            batch = documents[i:i + self.batch_size]
            
            # Generate embeddings for batch
            contents = [doc.content for doc in batch]
            embeddings = await self.openai_service.generate_embeddings(contents)
            
            # Store embeddings
            for doc, embedding in zip(batch, embeddings):
                doc_id = await self.vector_store.store_document_with_embedding(doc, embedding)
                results[doc.id] = doc_id
                
        return results
    
    async def update_embeddings(self, updated_documents: List[Document]) -> None:
        """Update embeddings for modified documents"""
        
        for document in updated_documents:
            # Check if embedding exists
            existing = await self.vector_store.get_embedding(document.id)
            
            if existing:
                # Update existing embedding
                new_embedding = await self.openai_service.generate_embeddings([document.content])
                await self.vector_store.update_embedding(document.id, new_embedding[0])
            else:
                # Create new embedding
                await self.vector_store.store_document(document)
```

### 5. Caching & Performance Optimization

#### 5.1 Intelligent Caching System
**Location:** `backend/app/strategist/caching/cache_manager.py`

```python
class CacheManager:
    """Redis-based intelligent caching for AI responses and reports"""
    
    def __init__(self):
        self.redis = redis.Redis.from_url(os.getenv('REDIS_URL'))
        self.default_ttl = 3600  # 1 hour
        self.cache_strategies = {
            'report': ReportCacheStrategy(),
            'analysis': AnalysisCacheStrategy(),
            'search': SearchCacheStrategy()
        }
    
    async def get_cached_response(self, cache_key: str, strategy: str = 'default') -> Optional[Any]:
        """Get cached response with intelligent key matching"""
        
        # Direct key lookup
        cached = await self.redis.get(cache_key)
        if cached:
            return pickle.loads(cached)
            
        # Fuzzy matching for similar queries
        if strategy in self.cache_strategies:
            similar_key = await self.cache_strategies[strategy].find_similar(cache_key)
            if similar_key:
                cached = await self.redis.get(similar_key)
                if cached:
                    return pickle.loads(cached)
                    
        return None
    
    async def store_response(self, cache_key: str, response: Any, ttl: Optional[int] = None) -> None:
        """Store response with appropriate TTL"""
        
        ttl = ttl or self.default_ttl
        serialized = pickle.dumps(response)
        
        await self.redis.setex(cache_key, ttl, serialized)
        
        # Update similarity index for fuzzy matching
        await self.update_similarity_index(cache_key, response)

class ReportCacheStrategy:
    """Caching strategy for intelligence reports"""
    
    def __init__(self):
        self.similarity_threshold = 0.8
        
    async def find_similar(self, cache_key: str) -> Optional[str]:
        """Find similar report cache keys"""
        
        # Parse query parameters from cache key
        query_params = self.parse_cache_key(cache_key)
        
        # Search for similar queries
        pattern = f"report:*:{query_params['region']}:*"
        similar_keys = await redis.keys(pattern)
        
        for key in similar_keys:
            similarity = self.calculate_similarity(cache_key, key)
            if similarity > self.similarity_threshold:
                return key
                
        return None
    
    def calculate_similarity(self, key1: str, key2: str) -> float:
        """Calculate similarity between cache keys"""
        
        params1 = self.parse_cache_key(key1)
        params2 = self.parse_cache_key(key2)
        
        # Region match (high weight)
        region_match = 1.0 if params1['region'] == params2['region'] else 0.0
        
        # Topic overlap
        topics1 = set(params1.get('topics', []))
        topics2 = set(params2.get('topics', []))
        topic_overlap = len(topics1 & topics2) / len(topics1 | topics2) if topics1 or topics2 else 1.0
        
        # Time proximity (reports are more similar if generated recently)
        time_diff = abs(params1.get('timestamp', 0) - params2.get('timestamp', 0))
        time_factor = max(0, 1 - time_diff / 3600)  # Decay over 1 hour
        
        # Weighted similarity
        similarity = (region_match * 0.5) + (topic_overlap * 0.3) + (time_factor * 0.2)
        return similarity
```

#### 5.2 Performance Monitoring
**Location:** `backend/app/strategist/monitoring/performance.py`

```python
class PerformanceMonitor:
    """Real-time performance monitoring and optimization"""
    
    def __init__(self):
        self.metrics = {}
        self.redis = redis.Redis.from_url(os.getenv('REDIS_URL'))
        
    async def track_request(self, request_id: str, operation: str) -> PerformanceContext:
        """Track request performance with context manager"""
        
        return PerformanceContext(
            request_id=request_id,
            operation=operation,
            monitor=self
        )
    
    async def record_metrics(self, request_id: str, metrics: Dict[str, Any]) -> None:
        """Record performance metrics"""
        
        # Store detailed metrics
        await self.redis.hset(f"metrics:{request_id}", mapping=metrics)
        await self.redis.expire(f"metrics:{request_id}", 86400)  # 24 hours
        
        # Update aggregate metrics
        await self.update_aggregates(metrics)
        
        # Check for performance issues
        await self.check_performance_thresholds(metrics)
    
    async def check_performance_thresholds(self, metrics: Dict[str, Any]) -> None:
        """Monitor for performance degradation"""
        
        # Response time alerts
        if metrics.get('total_time', 0) > 120:  # 2 minutes
            await self.send_alert(AlertLevel.WARNING, f"Slow response: {metrics['total_time']}s")
            
        # Error rate monitoring  
        if metrics.get('error_rate', 0) > 0.05:  # 5%
            await self.send_alert(AlertLevel.CRITICAL, f"High error rate: {metrics['error_rate']}")
            
        # Cost monitoring
        if metrics.get('cost', 0) > 1.0:  # $1 per request
            await self.send_alert(AlertLevel.WARNING, f"High cost request: ${metrics['cost']}")

class PerformanceContext:
    """Context manager for performance tracking"""
    
    def __init__(self, request_id: str, operation: str, monitor: PerformanceMonitor):
        self.request_id = request_id
        self.operation = operation
        self.monitor = monitor
        self.start_time = None
        self.metrics = {}
        
    async def __aenter__(self):
        self.start_time = time.time()
        return self
        
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        end_time = time.time()
        self.metrics['total_time'] = end_time - self.start_time
        self.metrics['operation'] = self.operation
        self.metrics['success'] = exc_type is None
        
        await self.monitor.record_metrics(self.request_id, self.metrics)
        
    def add_metric(self, key: str, value: Any):
        """Add custom metric to tracking"""
        self.metrics[key] = value
```

---

## Database Architecture

### Enhanced Schema Design

#### Core Extensions to Existing Schema
```sql
-- Vector storage for embeddings
CREATE TABLE embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content TEXT NOT NULL,
    embedding vector(1536),  -- OpenAI text-embedding-3-small dimension
    metadata JSONB,
    source_type VARCHAR(50),
    source_id VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for vector similarity search
CREATE INDEX ON embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX ON embeddings (source_type);
CREATE INDEX ON embeddings (created_at);

-- Geopolitical intelligence reports
CREATE TABLE intelligence_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(500) NOT NULL,
    region VARCHAR(100) NOT NULL,
    topics TEXT[] NOT NULL,
    report_type VARCHAR(50) NOT NULL,
    content JSONB NOT NULL,
    quality_score DECIMAL(3,2),
    confidence_score DECIMAL(3,2),
    generated_by VARCHAR(100),
    ai_models_used TEXT[],
    data_sources TEXT[],
    validity_period INTERVAL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE
);

-- AI service usage tracking
CREATE TABLE ai_service_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_name VARCHAR(50) NOT NULL,
    operation_type VARCHAR(50) NOT NULL,
    tokens_used INTEGER,
    cost_usd DECIMAL(10,4),
    request_id VARCHAR(255),
    response_time_ms INTEGER,
    success BOOLEAN,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Cache metadata for intelligent caching
CREATE TABLE cache_metadata (
    cache_key VARCHAR(500) PRIMARY KEY,
    content_hash VARCHAR(64),
    similarity_tags TEXT[],
    access_count INTEGER DEFAULT 0,
    last_accessed TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Data Flow Patterns

#### 1. Embedding Generation Flow
```
New Content → Content Processing → OpenAI Embeddings API → pgvector Storage → Similarity Index Update
```

#### 2. Report Generation Flow  
```
Request → Cache Check → Multi-AI Orchestration → Template Application → Quality Validation → Cache Storage → Response
```

#### 3. Real-time Update Flow
```
External Data → Change Detection → Embedding Update → Cache Invalidation → Alert Generation → User Notification
```

---

## Integration Patterns

### 1. Existing LokDarpan Integration

#### 1.1 Political Strategist Module Extension
```python
# Extend existing strategist service
class EnhancedPoliticalStrategist(PoliticalStrategist):
    """Enhanced strategist with multi-model AI capabilities"""
    
    def __init__(self):
        super().__init__()
        self.geopolitical_engine = GeopoliticalReportGenerator()
        self.multi_model_router = AIServiceRouter()
        
    async def generate_strategic_analysis(self, ward: str, context: str = 'neutral') -> StrategicAnalysis:
        """Enhanced analysis using multi-model AI"""
        
        # Use existing ward-specific logic
        base_analysis = await super().generate_strategic_analysis(ward, context)
        
        # Enhance with geopolitical intelligence
        geopolitical_context = await self.geopolitical_engine.generate_intelligence_report(
            ReportRequest(
                region=f"Hyderabad - {ward}",
                topics=['political_developments', 'electoral_trends', 'public_sentiment'],
                template='tactical'
            )
        )
        
        # Combine insights
        enhanced_analysis = self.combine_analyses(base_analysis, geopolitical_context)
        return enhanced_analysis
```

#### 1.2 API Endpoint Extensions
```python
# Add new endpoints to existing blueprint
@strategist_bp.route('/intelligence/<ward>')
async def get_ward_intelligence(ward: str):
    """Get comprehensive intelligence for specific ward"""
    
    depth = request.args.get('depth', 'standard')
    context = request.args.get('context', 'neutral')
    
    report = await enhanced_strategist.generate_strategic_analysis(
        ward=ward,
        context=context,
        depth=depth
    )
    
    return jsonify(report.to_dict())

@strategist_bp.route('/intelligence/stream/<ward>')
async def stream_intelligence_updates(ward: str):
    """SSE endpoint for real-time intelligence updates"""
    
    async def event_stream():
        async for update in enhanced_strategist.stream_updates(ward):
            yield f"data: {json.dumps(update.to_dict())}\n\n"
            
    return Response(event_stream(), mimetype='text/event-stream')
```

### 2. Frontend Integration Patterns

#### 2.1 SSE Client for Real-time Updates
```javascript
// Enhanced SSE client for intelligence updates
class IntelligenceStreamClient {
    constructor(ward, options = {}) {
        this.ward = ward;
        this.options = options;
        this.eventSource = null;
        this.listeners = new Map();
    }
    
    connect() {
        const url = `/api/v1/strategist/intelligence/stream/${encodeURIComponent(this.ward)}`;
        this.eventSource = new EventSource(url);
        
        this.eventSource.onmessage = (event) => {
            const data = JSON.parse(event.data);
            this.handleUpdate(data);
        };
        
        this.eventSource.onerror = (error) => {
            console.error('Intelligence stream error:', error);
            this.handleReconnection();
        };
    }
    
    handleUpdate(update) {
        const { type, data } = update;
        
        if (this.listeners.has(type)) {
            this.listeners.get(type).forEach(callback => callback(data));
        }
    }
    
    subscribe(eventType, callback) {
        if (!this.listeners.has(eventType)) {
            this.listeners.set(eventType, []);
        }
        this.listeners.get(eventType).push(callback);
    }
}
```

#### 2.2 React Components for Intelligence Display
```jsx
// Enhanced intelligence dashboard component
const IntelligenceDashboard = ({ ward }) => {
    const [intelligence, setIntelligence] = useState(null);
    const [streamClient, setStreamClient] = useState(null);
    const [updates, setUpdates] = useState([]);
    
    useEffect(() => {
        // Initialize intelligence stream
        const client = new IntelligenceStreamClient(ward);
        
        client.subscribe('intelligence_update', (data) => {
            setIntelligence(prevIntel => ({
                ...prevIntel,
                ...data
            }));
        });
        
        client.subscribe('alert', (alert) => {
            setUpdates(prev => [alert, ...prev.slice(0, 9)]);
        });
        
        client.connect();
        setStreamClient(client);
        
        return () => client.disconnect();
    }, [ward]);
    
    return (
        <div className="intelligence-dashboard">
            <IntelligenceHeader intelligence={intelligence} />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    <IntelligenceReport intelligence={intelligence} />
                    <RecentDevelopments updates={updates} />
                </div>
                <div>
                    <IntelligenceMetrics intelligence={intelligence} />
                    <ActionableInsights intelligence={intelligence} />
                </div>
            </div>
        </div>
    );
};
```

---

## Security Architecture

### 1. API Security

#### 1.1 Authentication & Authorization
```python
class APISecurityManager:
    """Security manager for AI service access"""
    
    def __init__(self):
        self.rate_limiters = {
            'intelligence': RateLimiter(requests_per_hour=100),
            'analysis': RateLimiter(requests_per_hour=200),
            'search': RateLimiter(requests_per_hour=500)
        }
        
    async def verify_request(self, request: Request, endpoint_type: str) -> bool:
        """Verify request authorization and rate limits"""
        
        # Authentication check
        user = await self.get_authenticated_user(request)
        if not user:
            raise UnauthorizedException("Authentication required")
            
        # Authorization check
        if not await self.check_permissions(user, endpoint_type):
            raise ForbiddenException("Insufficient permissions")
            
        # Rate limiting
        if not await self.rate_limiters[endpoint_type].check_limit(user.id):
            raise RateLimitExceededException("Rate limit exceeded")
            
        return True
```

#### 1.2 Data Privacy & Protection
```python
class DataPrivacyManager:
    """Manage data privacy and PII protection"""
    
    def __init__(self):
        self.pii_detector = PIIDetector()
        self.encryption_service = EncryptionService()
        
    async def sanitize_content(self, content: str) -> str:
        """Remove or mask PII from content"""
        
        # Detect PII
        pii_entities = await self.pii_detector.detect(content)
        
        # Mask detected PII
        sanitized = content
        for entity in pii_entities:
            sanitized = sanitized.replace(entity.text, entity.mask)
            
        return sanitized
    
    async def encrypt_sensitive_data(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Encrypt sensitive data fields"""
        
        sensitive_fields = ['api_keys', 'user_data', 'private_content']
        
        encrypted_data = data.copy()
        for field in sensitive_fields:
            if field in encrypted_data:
                encrypted_data[field] = await self.encryption_service.encrypt(
                    encrypted_data[field]
                )
                
        return encrypted_data
```

### 2. AI Service Security

#### 2.1 API Key Management
```python
class APIKeyManager:
    """Secure API key management and rotation"""
    
    def __init__(self):
        self.vault = VaultService()
        self.rotation_schedule = {
            'claude': timedelta(days=90),
            'perplexity': timedelta(days=90),
            'openai': timedelta(days=90)
        }
        
    async def get_api_key(self, service: str) -> str:
        """Get current API key for service"""
        
        key_data = await self.vault.get_secret(f"api_keys/{service}")
        
        # Check if rotation needed
        if await self.needs_rotation(service, key_data):
            await self.schedule_key_rotation(service)
            
        return key_data['current_key']
    
    async def rotate_api_key(self, service: str) -> None:
        """Rotate API key for service"""
        
        # Generate new key (service-specific process)
        new_key = await self.generate_new_key(service)
        
        # Store new key
        await self.vault.store_secret(f"api_keys/{service}", {
            'current_key': new_key,
            'previous_key': await self.get_api_key(service),
            'rotated_at': datetime.utcnow(),
            'expires_at': datetime.utcnow() + self.rotation_schedule[service]
        })
        
        # Update service configurations
        await self.update_service_config(service, new_key)
```

---

## Monitoring & Observability

### 1. Real-time Monitoring Dashboard

#### 1.1 System Health Monitoring
```python
class SystemHealthMonitor:
    """Comprehensive system health monitoring"""
    
    def __init__(self):
        self.metrics_collector = MetricsCollector()
        self.alert_manager = AlertManager()
        
    async def collect_health_metrics(self) -> HealthMetrics:
        """Collect comprehensive system health metrics"""
        
        return HealthMetrics(
            # AI service health
            ai_services=await self.check_ai_services(),
            
            # Database health
            database=await self.check_database_health(),
            
            # Cache health
            cache=await self.check_cache_health(),
            
            # Application performance
            performance=await self.collect_performance_metrics(),
            
            # Cost metrics
            costs=await self.collect_cost_metrics(),
            
            # Quality metrics
            quality=await self.collect_quality_metrics()
        )
    
    async def check_ai_services(self) -> Dict[str, ServiceHealth]:
        """Check health of all AI services"""
        
        services = ['claude', 'perplexity', 'openai', 'llama']
        health_checks = {}
        
        for service in services:
            try:
                start_time = time.time()
                response = await self.ping_service(service)
                response_time = time.time() - start_time
                
                health_checks[service] = ServiceHealth(
                    status='healthy',
                    response_time=response_time,
                    last_check=datetime.utcnow(),
                    error_rate=await self.get_error_rate(service)
                )
            except Exception as e:
                health_checks[service] = ServiceHealth(
                    status='unhealthy',
                    error=str(e),
                    last_check=datetime.utcnow()
                )
                
        return health_checks
```

#### 1.2 Cost Monitoring Dashboard
```python
class CostMonitoringDashboard:
    """Real-time cost monitoring and budget management"""
    
    def __init__(self):
        self.cost_tracker = CostTracker()
        self.budget_manager = BudgetManager()
        
    async def get_cost_overview(self) -> CostOverview:
        """Get comprehensive cost overview"""
        
        current_usage = await self.cost_tracker.get_current_usage()
        projections = await self.budget_manager.get_projections()
        
        return CostOverview(
            current_spend=current_usage.total,
            monthly_budget=500.0,
            projected_month_end=projections.month_end_projection,
            cost_by_service=current_usage.by_service,
            cost_trends=await self.get_cost_trends(),
            optimization_opportunities=await self.identify_optimizations()
        )
    
    async def identify_optimizations(self) -> List[CostOptimization]:
        """Identify cost optimization opportunities"""
        
        optimizations = []
        
        # Cache hit rate optimization
        cache_stats = await self.get_cache_statistics()
        if cache_stats.hit_rate < 0.8:
            optimizations.append(CostOptimization(
                type='caching',
                description='Improve cache hit rate',
                potential_savings=cache_stats.potential_savings,
                implementation_effort='medium'
            ))
            
        # API usage patterns
        usage_patterns = await self.analyze_usage_patterns()
        if usage_patterns.has_inefficiencies:
            optimizations.append(CostOptimization(
                type='usage_optimization',
                description='Optimize API usage patterns',
                potential_savings=usage_patterns.potential_savings,
                implementation_effort='low'
            ))
            
        return optimizations
```

### 2. Quality Assurance Monitoring

#### 2.1 Report Quality Tracking
```python
class QualityMonitor:
    """Monitor and track report quality metrics"""
    
    def __init__(self):
        self.fact_checker = FactChecker()
        self.bias_detector = BiasDetector()
        self.coherence_analyzer = CoherenceAnalyzer()
        
    async def assess_report_quality(self, report: IntelligenceReport) -> QualityAssessment:
        """Comprehensive quality assessment of intelligence report"""
        
        # Parallel quality checks
        async with asyncio.TaskGroup() as tg:
            fact_check_task = tg.create_task(
                self.fact_checker.verify_claims(report.content)
            )
            bias_check_task = tg.create_task(
                self.bias_detector.analyze_bias(report.content)
            )
            coherence_task = tg.create_task(
                self.coherence_analyzer.assess_coherence(report.content)
            )
            source_task = tg.create_task(
                self.assess_source_quality(report.data_sources)
            )
        
        return QualityAssessment(
            overall_score=self.calculate_overall_score(
                fact_check_task.result(),
                bias_check_task.result(),
                coherence_task.result(),
                source_task.result()
            ),
            fact_check_score=fact_check_task.result().score,
            bias_score=bias_check_task.result().score,
            coherence_score=coherence_task.result().score,
            source_quality_score=source_task.result().score,
            recommendations=self.generate_improvement_recommendations(
                fact_check_task.result(),
                bias_check_task.result(),
                coherence_task.result()
            )
        )
```

---

## Deployment Architecture

### 1. Production Environment

#### 1.1 Infrastructure Components
```yaml
# Docker Compose for production deployment
version: '3.8'
services:
  lokdarpan-api:
    build: ./backend
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=${REDIS_URL}
      - CLAUDE_API_KEY=${CLAUDE_API_KEY}
      - PERPLEXITY_API_KEY=${PERPLEXITY_API_KEY}
      - OPENAI_API_KEY=${OPENAI_API_KEY}
    depends_on:
      - postgres
      - redis
    ports:
      - "5000:5000"
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:5000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      
  lokdarpan-frontend:
    build: ./frontend
    ports:
      - "80:80"
    depends_on:
      - lokdarpan-api
      
  postgres:
    image: pgvector/pgvector:pg15
    environment:
      - POSTGRES_DB=lokdarpan_production
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
      
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
      
  celery-worker:
    build: ./backend
    command: celery -A celery_worker.celery worker --loglevel=info
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=${REDIS_URL}
    depends_on:
      - postgres
      - redis
      
  celery-beat:
    build: ./backend
    command: celery -A celery_worker.celery beat --loglevel=info
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=${REDIS_URL}
    depends_on:
      - postgres
      - redis
      
  ollama:
    image: ollama/ollama:latest
    ports:
      - "11434:11434"
    volumes:
      - ollama_data:/root/.ollama
    environment:
      - OLLAMA_HOST=0.0.0.0
      
volumes:
  postgres_data:
  redis_data:
  ollama_data:
```

#### 1.2 Kubernetes Deployment (Alternative)
```yaml
# Kubernetes deployment for scalable production
apiVersion: apps/v1
kind: Deployment
metadata:
  name: lokdarpan-api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: lokdarpan-api
  template:
    metadata:
      labels:
        app: lokdarpan-api
    spec:
      containers:
      - name: api
        image: lokdarpan/api:latest
        ports:
        - containerPort: 5000
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: lokdarpan-secrets
              key: database-url
        - name: REDIS_URL
          valueFrom:
            secretKeyRef:
              name: lokdarpan-secrets
              key: redis-url
        resources:
          requests:
            memory: "512Mi"
            cpu: "500m"
          limits:
            memory: "1Gi"
            cpu: "1000m"
        livenessProbe:
          httpGet:
            path: /health
            port: 5000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 5000
          initialDelaySeconds: 5
          periodSeconds: 5
```

### 2. Monitoring & Alerting

#### 2.1 Prometheus Monitoring
```yaml
# Prometheus configuration
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  - "lokdarpan_rules.yml"

alerting:
  alertmanagers:
    - static_configs:
        - targets:
          - alertmanager:9093

scrape_configs:
  - job_name: 'lokdarpan-api'
    static_configs:
      - targets: ['lokdarpan-api:5000']
    metrics_path: /metrics
    scrape_interval: 30s
    
  - job_name: 'postgres'
    static_configs:
      - targets: ['postgres-exporter:9187']
      
  - job_name: 'redis'
    static_configs:
      - targets: ['redis-exporter:9121']
```

#### 2.2 Alerting Rules
```yaml
# Alerting rules for LokDarpan
groups:
- name: lokdarpan_alerts
  rules:
  - alert: HighResponseTime
    expr: avg(http_request_duration_seconds) > 2
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "High response time detected"
      description: "Average response time is {{ $value }}s"
      
  - alert: HighErrorRate
    expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.1
    for: 2m
    labels:
      severity: critical
    annotations:
      summary: "High error rate detected"
      description: "Error rate is {{ $value }} errors/second"
      
  - alert: BudgetExceeded
    expr: monthly_ai_cost > 450
    for: 1m
    labels:
      severity: warning
    annotations:
      summary: "Monthly budget threshold exceeded"
      description: "Current spend: ${{ $value }}"
      
  - alert: AIServiceDown
    expr: ai_service_up == 0
    for: 1m
    labels:
      severity: critical
    annotations:
      summary: "AI service unavailable"
      description: "{{ $labels.service }} is down"
```

This comprehensive technical architecture provides a solid foundation for implementing the multi-model geopolitical AI system within the specified constraints and timeline. The modular design ensures scalability, maintainability, and cost efficiency while delivering the required performance and quality standards.