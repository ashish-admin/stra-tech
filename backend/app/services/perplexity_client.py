"""
Perplexity AI Client for Real-Time Intelligence Retrieval

Integrates with Perplexity Sonar API for real-time web search and factual grounding.
Optimized for breaking news, latest developments, and credible source retrieval
with cost-effective search strategies and intelligent caching.
"""

import asyncio
import json
import logging
import time
import os
from typing import Dict, List, Optional, Any
from datetime import datetime, timezone, timedelta

import aiohttp
import hashlib

from .base_client import BaseAIClient, AIResponse, ModelProvider
from ..extensions import redis_client

logger = logging.getLogger(__name__)


class PerplexityClient(BaseAIClient):
    """
    Perplexity client optimized for real-time intelligence gathering.
    
    Features:
    - Real-time web search with credible source filtering
    - Intelligent caching to reduce API costs (3-hour TTL)
    - Domain filtering for reliable news sources
    - Breaking news detection and prioritization
    - Citation extraction and source credibility scoring
    """
    
    def __init__(self):
        super().__init__()
        
        self.api_key = os.getenv('PERPLEXITY_API_KEY')
        if not self.api_key:
            logger.warning("PERPLEXITY_API_KEY not found, Perplexity client will fail")
        
        self.base_url = "https://api.perplexity.ai/chat/completions"
        
        # Perplexity-specific configuration
        self.config = {
            "model": "sonar",  # Standard Sonar model for cost efficiency
            "temperature": 0.1,  # Low temperature for factual accuracy
            "timeout": 60,
            "max_retries": 3,
            "cache_ttl": 10800,  # 3 hours cache as per spec
            "max_search_results": 10,
            "enable_caching": True,
        }
        
        # Cost tracking (Perplexity pricing as of Jan 2025)
        self.pricing = {
            "search_request_fee": 0.005,    # $5/1000 requests
            "input_cost_per_token": 0.000001,   # $1/M input tokens
            "output_cost_per_token": 0.000001,  # $1/M output tokens
        }
        
        # High-credibility domains for political news
        self.credible_domains = [
            "reuters.com",
            "apnews.com", 
            "bbc.com",
            "thehindu.com",
            "indianexpress.com",
            "timesofindia.indiatimes.com",
            "hindustantimes.com",
            "ndtv.com",
            "news18.com",
            "firstpost.com",
            "thewire.in",
            "scroll.in",
            "livemint.com",
            "moneycontrol.com",
            "deccanherald.com"
        ]
        
        # Regional domains for Hyderabad/Telangana focus
        self.regional_domains = [
            "telanganatoday.com",
            "thehansindia.com", 
            "greatandhra.com",
            "sakshi.com",
            "eenadu.net",
            "gulte.com",
            "thenewsminute.com"
        ]

    async def generate_response(self, query: str, context: Dict[str, Any] = None, 
                               request_id: str = None) -> AIResponse:
        """
        Generate real-time intelligence response using Perplexity Sonar.
        
        Args:
            query: Search query for real-time information
            context: Additional context (ward, urgency, timeframe)
            request_id: Unique request identifier
            
        Returns:
            AIResponse with real-time search results and analysis
        """
        start_time = self._start_request_timer()
        
        try:
            # Check cache first if enabled
            if self.config["enable_caching"]:
                cached_response = await self._get_cached_response(query, context)
                if cached_response:
                    logger.info(f"Returning cached Perplexity response for query: {query[:50]}")
                    return cached_response
            
            # Build search-optimized prompt
            search_prompt = self._build_search_prompt(query, context)
            
            # Configure search parameters
            search_config = self._get_search_config(context)
            
            # Execute search with Perplexity API
            response_data = await self._search_with_perplexity(search_prompt, search_config)
            
            # Process and analyze results
            ai_response = await self._process_search_results(
                response_data, query, context, start_time, request_id
            )
            
            # Cache successful responses
            if ai_response.is_success and self.config["enable_caching"]:
                await self._cache_response(query, context, ai_response)
            
            return ai_response
            
        except Exception as e:
            logger.error(f"Perplexity API error: {e}")
            self._record_error(str(e))
            
            return self._build_error_response(str(e), query, request_id)

    def _build_search_prompt(self, query: str, context: Dict[str, Any] = None) -> str:
        """Build optimized search prompt for Perplexity Sonar."""
        
        prompt_parts = []
        
        # Add temporal context for breaking news
        if context and context.get("urgency") == "high":
            prompt_parts.append("BREAKING NEWS SEARCH:")
        elif self._has_temporal_indicators(query):
            prompt_parts.append("LATEST DEVELOPMENTS:")
        
        # Add geographic context if available
        if context and context.get("ward_context"):
            ward = context["ward_context"]
            prompt_parts.append(f"Focus on {ward}, Hyderabad, Telangana, India")
        elif context and context.get("region_context"):
            region = context["region_context"]
            prompt_parts.append(f"Focus on {region}, India")
        
        # Add main query with search optimization
        search_query = self._optimize_query_for_search(query)
        prompt_parts.append(search_query)
        
        # Add search instructions
        prompt_parts.append("""
Return 8-12 recent, high-credibility sources with:
1. Exact headline/title
2. Publication name and date
3. Key facts with direct quotes
4. Source URLs for verification
5. Credibility assessment of each source

Focus on primary reporting from established news outlets.
Avoid opinion pieces or unverified social media posts.
Include timestamp for each piece of information.""")
        
        return "\n\n".join(prompt_parts)

    def _optimize_query_for_search(self, query: str) -> str:
        """Optimize query for better search results."""
        
        # Add political context keywords if relevant
        political_indicators = ["party", "election", "candidate", "bjp", "congress", "brs", "aimim"]
        if any(term in query.lower() for term in political_indicators):
            if "hyderabad" not in query.lower() and "telangana" not in query.lower():
                query += " Hyderabad Telangana politics"
        
        # Add temporal indicators if missing but implied
        temporal_terms = ["latest", "recent", "today", "breaking", "current"]
        if not any(term in query.lower() for term in temporal_terms):
            if "?" in query:  # Question format
                query = f"Latest updates: {query}"
        
        return query

    def _has_temporal_indicators(self, query: str) -> bool:
        """Check if query has temporal indicators requiring real-time data."""
        
        temporal_terms = [
            "latest", "recent", "today", "breaking", "current", "now",
            "this week", "this month", "yesterday", "developments"
        ]
        
        return any(term in query.lower() for term in temporal_terms)

    def _get_search_config(self, context: Dict[str, Any] = None) -> Dict[str, Any]:
        """Get search configuration based on context."""
        
        config = {
            "search_context_size": "low",  # Cost optimization
            "search_domain_filter": self.credible_domains.copy(),
            "search_recency_filter": "month",  # Default to past month
        }
        
        # Adjust based on context
        if context:
            # Urgency-based adjustments
            if context.get("urgency") == "high":
                config["search_recency_filter"] = "day"
                config["search_context_size"] = "medium"  # Higher quality for urgent queries
            
            # Analysis depth adjustments
            analysis_depth = context.get("analysis_depth", "standard")
            if analysis_depth == "deep":
                config["search_context_size"] = "medium"
                config["search_domain_filter"].extend(self.regional_domains)
            
            # Regional focus
            if context.get("ward_context") or context.get("region_context"):
                config["search_domain_filter"].extend(self.regional_domains)
            
            # Time-sensitive queries
            if self._has_temporal_indicators(context.get("original_query", "")):
                config["search_recency_filter"] = "week"
        
        return config

    async def _search_with_perplexity(self, prompt: str, config: Dict[str, Any]) -> Dict[str, Any]:
        """Execute search using Perplexity API."""
        
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "model": self.config["model"],
            "messages": [
                {
                    "role": "system",
                    "content": "You are a real-time news intelligence analyst. Return factual information with exact citations and source verification."
                },
                {
                    "role": "user", 
                    "content": prompt
                }
            ],
            "temperature": self.config["temperature"],
            "search_domain_filter": config["search_domain_filter"],
            "search_recency_filter": config["search_recency_filter"]
        }
        
        # Add search context size if not using default
        if config.get("search_context_size") != "low":
            payload["search_context_size"] = config["search_context_size"]
        
        async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=self.config["timeout"])) as session:
            for attempt in range(self.config["max_retries"]):
                try:
                    if attempt > 0:
                        await asyncio.sleep(2 ** attempt)  # Exponential backoff
                    
                    async with session.post(self.base_url, headers=headers, json=payload) as response:
                        if response.status == 200:
                            return await response.json()
                        elif response.status == 429:  # Rate limit
                            logger.warning("Perplexity rate limit hit")
                            if attempt < self.config["max_retries"] - 1:
                                await asyncio.sleep(60)  # Wait 1 minute
                                continue
                        elif response.status >= 500:  # Server error
                            logger.warning(f"Perplexity server error: {response.status}")
                            if attempt < self.config["max_retries"] - 1:
                                continue
                        
                        # Client error or final attempt
                        error_text = await response.text()
                        raise Exception(f"Perplexity API error {response.status}: {error_text}")
                        
                except asyncio.TimeoutError:
                    logger.warning(f"Perplexity timeout, attempt {attempt + 1}")
                    if attempt == self.config["max_retries"] - 1:
                        raise Exception("Perplexity API timeout after retries")
                    
                except Exception as e:
                    if attempt == self.config["max_retries"] - 1:
                        raise
                    logger.warning(f"Perplexity error attempt {attempt + 1}: {e}")

    async def _process_search_results(self, response_data: Dict[str, Any], query: str,
                                    context: Dict[str, Any], start_time: float, 
                                    request_id: str) -> AIResponse:
        """Process Perplexity search results into structured response."""
        
        try:
            # Extract content and usage information
            content = response_data["choices"][0]["message"]["content"]
            usage = response_data.get("usage", {})
            
            # Calculate token usage and costs
            input_tokens = usage.get("prompt_tokens", 0)
            output_tokens = usage.get("completion_tokens", 0)
            total_tokens = usage.get("total_tokens", input_tokens + output_tokens)
            
            # Calculate total cost (request fee + token costs)
            request_cost = self.pricing["search_request_fee"]
            token_cost = (input_tokens * self.pricing["input_cost_per_token"] + 
                         output_tokens * self.pricing["output_cost_per_token"])
            total_cost = request_cost + token_cost
            
            latency_ms = self._end_request_timer(start_time)
            
            # Assess response quality
            quality_score = self._assess_search_quality(content, query, context)
            
            # Extract citations and sources
            citations = self._extract_citations(content)
            source_count = len(citations)
            credibility_score = self._assess_source_credibility(citations)
            
            # Record success metrics
            self._record_success(total_tokens, total_cost)
            
            # Build metadata
            metadata = {
                "model_version": self.config["model"],
                "search_type": "sonar",
                "source_count": source_count,
                "credibility_score": credibility_score,
                "search_recency": context.get("search_recency_filter", "month") if context else "month",
                "domain_filter_count": len(self.credible_domains + self.regional_domains),
                "request_id": request_id,
                "citations": citations[:5],  # Store top 5 citations
                "real_time_search": True,
                "cache_eligible": True
            }
            
            logger.info(f"Perplexity search completed: {source_count} sources, {quality_score:.2f} quality, {latency_ms}ms")
            
            return AIResponse(
                content=content,
                model_used=self.config["model"],
                provider=ModelProvider.PERPLEXITY,
                tokens_used={
                    "input": input_tokens,
                    "output": output_tokens,
                    "total": total_tokens
                },
                cost_usd=round(total_cost, 6),
                latency_ms=latency_ms,
                quality_score=quality_score,
                metadata=metadata
            )
            
        except Exception as e:
            logger.error(f"Error processing Perplexity results: {e}")
            return self._build_error_response(f"Result processing error: {e}", query, request_id)

    def _assess_search_quality(self, content: str, query: str, context: Dict[str, Any]) -> float:
        """Assess quality of Perplexity search results."""
        
        quality_score = 0.0
        
        # Content length and structure (0.0-0.3)
        if len(content) >= 500:
            quality_score += 0.3
        elif len(content) >= 250:
            quality_score += 0.2
        elif len(content) >= 100:
            quality_score += 0.1
        
        # Source citation quality (0.0-0.3)
        citation_indicators = ["according to", "source:", "reported by", "published", "reuters", "ap news"]
        citation_count = sum(1 for indicator in citation_indicators if indicator.lower() in content.lower())
        quality_score += min(0.3, citation_count * 0.05)
        
        # Temporal relevance (0.0-0.2)
        temporal_indicators = ["today", "yesterday", "this week", "recently", "latest", "breaking"]
        temporal_count = sum(1 for indicator in temporal_indicators if indicator.lower() in content.lower())
        quality_score += min(0.2, temporal_count * 0.04)
        
        # Geographic relevance (0.0-0.1)
        if context and (context.get("ward_context") or context.get("region_context")):
            location_terms = ["hyderabad", "telangana", "ghmc", "ward"]
            location_count = sum(1 for term in location_terms if term.lower() in content.lower())
            quality_score += min(0.1, location_count * 0.025)
        
        # Fact density (0.0-0.1)
        fact_indicators = ["data", "statistics", "poll", "survey", "report", "study"]
        fact_count = sum(1 for indicator in fact_indicators if indicator.lower() in content.lower())
        quality_score += min(0.1, fact_count * 0.02)
        
        return min(1.0, quality_score)

    def _extract_citations(self, content: str) -> List[Dict[str, str]]:
        """Extract citations and sources from Perplexity response."""
        
        citations = []
        
        # Simple citation extraction patterns
        lines = content.split('\n')
        for line in lines:
            line = line.strip()
            
            # Look for URL patterns or source attributions
            if any(domain in line.lower() for domain in self.credible_domains + self.regional_domains):
                citations.append({
                    "text": line[:200],  # Truncate for storage
                    "type": "domain_match",
                    "credible": True
                })
            elif "source:" in line.lower() or "according to" in line.lower():
                citations.append({
                    "text": line[:200],
                    "type": "attribution",
                    "credible": "unknown"
                })
        
        return citations[:10]  # Limit to top 10 citations

    def _assess_source_credibility(self, citations: List[Dict[str, str]]) -> float:
        """Assess overall credibility of sources used."""
        
        if not citations:
            return 0.0
        
        credible_count = sum(1 for citation in citations if citation.get("credible") is True)
        return credible_count / len(citations)

    async def _get_cached_response(self, query: str, context: Dict[str, Any] = None) -> Optional[AIResponse]:
        """Get cached response if available and valid."""
        
        try:
            cache_key = self._build_cache_key(query, context)
            cached_data = await redis_client.get(cache_key)
            
            if cached_data:
                data = json.loads(cached_data)
                
                # Rebuild AIResponse from cached data
                return AIResponse(
                    content=data["content"],
                    model_used=data["model_used"],
                    provider=ModelProvider.PERPLEXITY,
                    tokens_used=data["tokens_used"],
                    cost_usd=data["cost_usd"],
                    latency_ms=50,  # Fast cache retrieval
                    quality_score=data["quality_score"],
                    metadata={**data["metadata"], "cached": True, "cache_hit": True}
                )
                
        except Exception as e:
            logger.warning(f"Cache retrieval error: {e}")
        
        return None

    async def _cache_response(self, query: str, context: Dict[str, Any], response: AIResponse):
        """Cache successful response for future use."""
        
        try:
            cache_key = self._build_cache_key(query, context)
            
            cache_data = {
                "content": response.content,
                "model_used": response.model_used,
                "tokens_used": response.tokens_used,
                "cost_usd": response.cost_usd,
                "quality_score": response.quality_score,
                "metadata": {k: v for k, v in response.metadata.items() if k != "request_id"},
                "cached_at": datetime.now(timezone.utc).isoformat()
            }
            
            await redis_client.setex(
                cache_key, 
                self.config["cache_ttl"], 
                json.dumps(cache_data)
            )
            
            logger.debug(f"Cached Perplexity response: {cache_key}")
            
        except Exception as e:
            logger.warning(f"Cache storage error: {e}")

    def _build_cache_key(self, query: str, context: Dict[str, Any] = None) -> str:
        """Build cache key for query and context."""
        
        # Normalize query for caching
        normalized_query = query.lower().strip()
        
        # Include relevant context in cache key
        context_parts = []
        if context:
            if context.get("ward_context"):
                context_parts.append(f"ward:{context['ward_context']}")
            if context.get("region_context"):
                context_parts.append(f"region:{context['region_context']}")
            if context.get("urgency"):
                context_parts.append(f"urgency:{context['urgency']}")
        
        cache_input = f"perplexity:{normalized_query}:{':'.join(sorted(context_parts))}"
        return f"cache:perplexity:{hashlib.md5(cache_input.encode()).hexdigest()}"

    async def get_model_info(self) -> Dict[str, Any]:
        """Get Perplexity model information and capabilities."""
        
        return {
            "provider": "perplexity",
            "model": self.config["model"],
            "capabilities": [
                "real_time_search",
                "breaking_news",
                "fact_verification",
                "source_attribution",
                "temporal_analysis"
            ],
            "strengths": [
                "Real-time web data",
                "Credible source filtering",
                "Fast retrieval",
                "Cost effective",
                "Citation extraction"
            ],
            "limitations": [
                "Search-based only",
                "Limited analysis depth",
                "Dependent on source quality"
            ],
            "cost_structure": {
                "search_request_fee": self.pricing["search_request_fee"],
                "input_cost_per_1k_tokens": round(self.pricing["input_cost_per_token"] * 1000, 4),
                "output_cost_per_1k_tokens": round(self.pricing["output_cost_per_token"] * 1000, 4)
            },
            "configuration": {
                "model": self.config["model"],
                "cache_ttl_hours": self.config["cache_ttl"] // 3600,
                "credible_domains": len(self.credible_domains),
                "regional_domains": len(self.regional_domains),
                "timeout_seconds": self.config["timeout"]
            }
        }