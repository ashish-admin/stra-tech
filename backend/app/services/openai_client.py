"""
OpenAI Client for Embeddings and Moderate Complexity Analysis

Integrates with OpenAI API for text embeddings (RAG system) and moderate
complexity political analysis. Optimized for cost-effective text processing
with intelligent batching and embedding management.
"""

import asyncio
import json
import logging
import time
import os
from typing import Dict, List, Optional, Any, Tuple
from datetime import datetime, timezone

import openai
from openai import OpenAI, AsyncOpenAI

from .base_client import BaseAIClient, AIResponse, ModelProvider

logger = logging.getLogger(__name__)


class OpenAIClient(BaseAIClient):
    """
    OpenAI client optimized for embeddings and moderate complexity analysis.
    
    Features:
    - High-quality text embeddings for RAG system
    - Cost-effective GPT models for moderate analysis
    - Intelligent batching for embedding operations
    - Vector similarity search support
    - Embedding dimension management (1536/3072)
    """
    
    def __init__(self):
        super().__init__()
        
        self.api_key = os.getenv('OPENAI_API_KEY')
        if not self.api_key:
            logger.warning("OPENAI_API_KEY not found, OpenAI client will fail")
            self.client = None
            self.sync_client = None
        else:
            try:
                self.client = AsyncOpenAI(api_key=self.api_key)
                self.sync_client = OpenAI(api_key=self.api_key)
            except Exception as e:
                logger.error(f"Failed to initialize OpenAI client: {e}")
                self.client = None
                self.sync_client = None
        
        # OpenAI-specific configuration
        self.config = {
            "chat_model": "gpt-4o-mini",  # Cost-effective model for moderate analysis
            "embedding_model": "text-embedding-3-large",  # High-quality embeddings
            "embedding_dimensions": 3072,  # Large embeddings for better quality
            "temperature": 0.1,
            "max_tokens": 2048,
            "timeout": 90,
            "max_retries": 3,
            "batch_size": 100,  # Embedding batch size
            "enable_batching": True,
        }
        
        # Cost tracking (OpenAI pricing as of Jan 2025)
        self.pricing = {
            "gpt4o_mini_input": 0.00000015,   # $0.15/M input tokens
            "gpt4o_mini_output": 0.0000006,   # $0.60/M output tokens
            "embedding_large": 0.00000013,    # $0.13/M tokens
            "embedding_small": 0.00000002,    # $0.02/M tokens
        }
        
        # Model capabilities mapping
        self.model_info = {
            "gpt-4o-mini": {
                "context_window": 128000,
                "max_output": 16384,
                "strengths": ["cost_effective", "fast", "general_purpose"],
                "use_cases": ["moderate_analysis", "summarization", "classification"]
            },
            "text-embedding-3-large": {
                "dimensions": 3072,
                "max_input": 8191,
                "strengths": ["high_quality", "semantic_search", "clustering"],
                "use_cases": ["rag_system", "similarity_search", "content_matching"]
            }
        }

    async def generate_response(self, query: str, context: Dict[str, Any] = None, 
                               request_id: str = None) -> AIResponse:
        """
        Generate response using OpenAI models for moderate complexity analysis.
        
        Args:
            query: User query for analysis
            context: Additional context and configuration
            request_id: Unique request identifier
            
        Returns:
            AIResponse with analysis or embedding results
        """
        start_time = self._start_request_timer()
        
        try:
            # Check if this is an embedding request
            if context and context.get("operation_type") == "embedding":
                return await self._generate_embeddings(query, context, start_time, request_id)
            
            # Regular chat completion for analysis
            return await self._generate_chat_response(query, context, start_time, request_id)
            
        except Exception as e:
            logger.error(f"OpenAI API error: {e}")
            self._record_error(str(e))
            
            return self._build_error_response(str(e), query, request_id)

    async def _generate_chat_response(self, query: str, context: Dict[str, Any], 
                                    start_time: float, request_id: str) -> AIResponse:
        """Generate chat response for moderate complexity analysis."""
        
        # Check if client is initialized
        if not self.client:
            logger.warning("OpenAI client not initialized, returning error response")
            return self._build_error_response("OpenAI client not initialized", query, request_id)
        
        # Build system prompt for political analysis
        system_prompt = self._build_analysis_system_prompt(context)
        
        # Build user prompt with context
        user_prompt = self._build_user_prompt(query, context)
        
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ]
        
        try:
            # Call OpenAI API with retry logic
            response = await self._call_chat_api(messages)
            
            # Process response
            content = response.choices[0].message.content
            usage = response.usage
            
            # Calculate costs
            input_cost = usage.prompt_tokens * self.pricing["gpt4o_mini_input"]
            output_cost = usage.completion_tokens * self.pricing["gpt4o_mini_output"]
            total_cost = input_cost + output_cost
            
            latency_ms = self._end_request_timer(start_time)
            
            # Assess quality
            quality_score = self._assess_analysis_quality(content, query, context)
            
            # Record success
            self._record_success(usage.total_tokens, total_cost)
            
            # Build metadata
            metadata = {
                "model_version": self.config["chat_model"],
                "temperature": self.config["temperature"],
                "max_tokens": self.config["max_tokens"],
                "analysis_type": context.get("analysis_depth", "moderate") if context else "moderate",
                "political_focus": self._detect_political_focus(query),
                "request_id": request_id,
                "usage_breakdown": {
                    "prompt_tokens": usage.prompt_tokens,
                    "completion_tokens": usage.completion_tokens,
                    "total_tokens": usage.total_tokens
                }
            }
            
            logger.info(f"OpenAI chat response: {usage.completion_tokens} tokens, ${total_cost:.4f}, {latency_ms}ms")
            
            return AIResponse(
                content=content,
                model_used=self.config["chat_model"],
                provider=ModelProvider.OPENAI,
                tokens_used={
                    "input": usage.prompt_tokens,
                    "output": usage.completion_tokens,
                    "total": usage.total_tokens
                },
                cost_usd=round(total_cost, 6),
                latency_ms=latency_ms,
                quality_score=quality_score,
                metadata=metadata
            )
            
        except Exception as e:
            logger.error(f"OpenAI chat API error: {e}")
            raise

    async def _generate_embeddings(self, text: str, context: Dict[str, Any], 
                                 start_time: float, request_id: str) -> AIResponse:
        """Generate text embeddings for RAG system."""
        
        try:
            # Handle batch embedding if multiple texts provided
            if context.get("batch_texts"):
                return await self._generate_batch_embeddings(
                    context["batch_texts"], context, start_time, request_id
                )
            
            # Single text embedding
            response = await self.client.embeddings.create(
                model=self.config["embedding_model"],
                input=text,
                dimensions=self.config["embedding_dimensions"]
            )
            
            # Extract embedding and usage
            embedding = response.data[0].embedding
            usage = response.usage
            
            # Calculate cost
            total_cost = usage.total_tokens * self.pricing["embedding_large"]
            
            latency_ms = self._end_request_timer(start_time)
            
            # Record success
            self._record_success(usage.total_tokens, total_cost)
            
            # Build metadata
            metadata = {
                "model_version": self.config["embedding_model"],
                "dimensions": len(embedding),
                "text_length": len(text),
                "embedding_quality": self._assess_embedding_quality(text, embedding),
                "request_id": request_id,
                "operation_type": "single_embedding"
            }
            
            # Return embedding in content as JSON
            content = json.dumps({
                "embedding": embedding,
                "text": text[:100] + "..." if len(text) > 100 else text,
                "dimensions": len(embedding)
            })
            
            logger.info(f"OpenAI embedding generated: {len(embedding)} dims, ${total_cost:.4f}, {latency_ms}ms")
            
            return AIResponse(
                content=content,
                model_used=self.config["embedding_model"],
                provider=ModelProvider.OPENAI,
                tokens_used={
                    "input": usage.total_tokens,
                    "output": 0,
                    "total": usage.total_tokens
                },
                cost_usd=round(total_cost, 6),
                latency_ms=latency_ms,
                quality_score=0.9,  # High quality for embeddings
                metadata=metadata
            )
            
        except Exception as e:
            logger.error(f"OpenAI embedding error: {e}")
            raise

    async def _generate_batch_embeddings(self, texts: List[str], context: Dict[str, Any],
                                       start_time: float, request_id: str) -> AIResponse:
        """Generate embeddings for multiple texts efficiently."""
        
        try:
            # Process in batches to avoid API limits
            batch_size = min(self.config["batch_size"], len(texts))
            all_embeddings = []
            total_tokens = 0
            
            for i in range(0, len(texts), batch_size):
                batch = texts[i:i + batch_size]
                
                response = await self.client.embeddings.create(
                    model=self.config["embedding_model"],
                    input=batch,
                    dimensions=self.config["embedding_dimensions"]
                )
                
                batch_embeddings = [data.embedding for data in response.data]
                all_embeddings.extend(batch_embeddings)
                total_tokens += response.usage.total_tokens
                
                # Small delay between batches to avoid rate limits
                if i + batch_size < len(texts):
                    await asyncio.sleep(0.1)
            
            # Calculate total cost
            total_cost = total_tokens * self.pricing["embedding_large"]
            
            latency_ms = self._end_request_timer(start_time)
            
            # Record success
            self._record_success(total_tokens, total_cost)
            
            # Build metadata
            metadata = {
                "model_version": self.config["embedding_model"],
                "batch_size": len(texts),
                "dimensions": len(all_embeddings[0]) if all_embeddings else 0,
                "avg_text_length": sum(len(text) for text in texts) / len(texts),
                "batches_processed": (len(texts) + batch_size - 1) // batch_size,
                "request_id": request_id,
                "operation_type": "batch_embedding"
            }
            
            # Return embeddings summary in content
            content = json.dumps({
                "embeddings_count": len(all_embeddings),
                "dimensions": len(all_embeddings[0]) if all_embeddings else 0,
                "sample_texts": texts[:3],  # First 3 texts as sample
                "processing_summary": f"Generated {len(all_embeddings)} embeddings"
            })
            
            logger.info(f"OpenAI batch embeddings: {len(all_embeddings)} items, ${total_cost:.4f}, {latency_ms}ms")
            
            # Store embeddings in metadata for retrieval
            metadata["embeddings"] = all_embeddings
            
            return AIResponse(
                content=content,
                model_used=self.config["embedding_model"],
                provider=ModelProvider.OPENAI,
                tokens_used={
                    "input": total_tokens,
                    "output": 0,
                    "total": total_tokens
                },
                cost_usd=round(total_cost, 6),
                latency_ms=latency_ms,
                quality_score=0.9,
                metadata=metadata
            )
            
        except Exception as e:
            logger.error(f"OpenAI batch embedding error: {e}")
            raise

    def _build_analysis_system_prompt(self, context: Dict[str, Any] = None) -> str:
        """Build system prompt for political analysis."""
        
        base_prompt = """You are a political analyst specializing in Indian politics, particularly Hyderabad and Telangana state dynamics. 

Provide balanced, fact-based analysis focusing on:
- Political implications and strategic considerations
- Party dynamics and competitive landscape
- Electoral impact and voter sentiment
- Policy implications and governance effects

Guidelines:
- Use evidence-based reasoning
- Present multiple perspectives
- Avoid partisan bias
- Cite specific examples when possible
- Acknowledge uncertainty where appropriate"""
        
        if context:
            if context.get("analysis_depth") == "quick":
                base_prompt += "\n\nProvide concise analysis in 2-3 paragraphs focusing on key points only."
            elif context.get("analysis_depth") == "deep":
                base_prompt += "\n\nProvide comprehensive analysis with detailed context, multiple scenarios, and strategic recommendations."
            
            if context.get("ward_context"):
                base_prompt += f"\n\nFocus analysis on {context['ward_context']} ward dynamics and local political considerations."
        
        return base_prompt

    def _build_user_prompt(self, query: str, context: Dict[str, Any] = None) -> str:
        """Build user prompt with context."""
        
        prompt_parts = [query]
        
        if context:
            if context.get("ward_context"):
                prompt_parts.append(f"Ward Context: {context['ward_context']}")
            
            if context.get("region_context"):
                prompt_parts.append(f"Region: {context['region_context']}")
            
            if context.get("strategic_context"):
                strategy_map = {
                    "defensive": "Focus on risk mitigation and defensive strategies",
                    "offensive": "Focus on opportunities and competitive advantages",
                    "neutral": "Provide balanced analysis of all factors"
                }
                prompt_parts.append(strategy_map.get(context["strategic_context"], ""))
        
        return "\n\n".join(filter(None, prompt_parts))

    async def _call_chat_api(self, messages: List[Dict[str, str]]) -> Any:
        """Call OpenAI chat API with retry logic."""
        
        for attempt in range(self.config["max_retries"]):
            try:
                if attempt > 0:
                    await asyncio.sleep(2 ** attempt)  # Exponential backoff
                
                response = await self.client.chat.completions.create(
                    model=self.config["chat_model"],
                    messages=messages,
                    temperature=self.config["temperature"],
                    max_tokens=self.config["max_tokens"],
                    timeout=self.config["timeout"]
                )
                
                return response
                
            except openai.RateLimitError as e:
                logger.warning(f"OpenAI rate limit, attempt {attempt + 1}: {e}")
                if attempt < self.config["max_retries"] - 1:
                    await asyncio.sleep(60)  # Wait 1 minute
                else:
                    raise
                    
            except openai.APITimeoutError as e:
                logger.warning(f"OpenAI timeout, attempt {attempt + 1}: {e}")
                if attempt == self.config["max_retries"] - 1:
                    raise
                    
            except Exception as e:
                logger.error(f"OpenAI API error, attempt {attempt + 1}: {e}")
                if attempt == self.config["max_retries"] - 1:
                    raise

    def _assess_analysis_quality(self, content: str, query: str, context: Dict[str, Any]) -> float:
        """Assess quality of OpenAI analysis response."""
        
        quality_score = 0.0
        
        # Content length assessment (0.0-0.3)
        word_count = len(content.split())
        if word_count >= 150:
            quality_score += 0.3
        elif word_count >= 75:
            quality_score += 0.2
        elif word_count >= 30:
            quality_score += 0.1
        
        # Structure and organization (0.0-0.2)
        if any(indicator in content for indicator in ["Analysis:", "Implications:", "Key points:"]):
            quality_score += 0.1
        if any(indicator in content for indicator in ["However,", "On the other hand", "Alternatively"]):
            quality_score += 0.1  # Balanced perspective
        
        # Political relevance (0.0-0.2)
        political_terms = ["party", "election", "voter", "campaign", "policy", "governance"]
        relevance_count = sum(1 for term in political_terms if term.lower() in content.lower())
        quality_score += min(0.2, relevance_count * 0.03)
        
        # Context relevance (0.0-0.2)
        if context:
            if context.get("ward_context") and context["ward_context"].lower() in content.lower():
                quality_score += 0.1
            if context.get("region_context") and context["region_context"].lower() in content.lower():
                quality_score += 0.05
        
        # Evidence and specificity (0.0-0.1)
        evidence_indicators = ["data", "statistics", "research", "study", "report"]
        evidence_count = sum(1 for indicator in evidence_indicators if indicator.lower() in content.lower())
        quality_score += min(0.1, evidence_count * 0.02)
        
        return min(1.0, quality_score)

    def _assess_embedding_quality(self, text: str, embedding: List[float]) -> float:
        """Assess quality of generated embedding."""
        
        # Basic quality metrics for embeddings
        quality_score = 0.8  # Base score for successful embedding
        
        # Text length consideration
        if len(text) >= 50:
            quality_score += 0.1
        
        # Embedding vector properties
        if len(embedding) == self.config["embedding_dimensions"]:
            quality_score += 0.1
        
        return min(1.0, quality_score)

    def _detect_political_focus(self, query: str) -> str:
        """Detect the political focus area of the query."""
        
        query_lower = query.lower()
        
        if any(term in query_lower for term in ["election", "vote", "campaign"]):
            return "electoral"
        elif any(term in query_lower for term in ["policy", "governance", "administration"]):
            return "policy"
        elif any(term in query_lower for term in ["party", "leader", "politics"]):
            return "party_politics"
        elif any(term in query_lower for term in ["bjp", "congress", "brs", "aimim"]):
            return "party_specific"
        else:
            return "general"

    async def embed_texts_for_rag(self, texts: List[str], chunk_metadata: List[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
        """
        Generate embeddings specifically for RAG system integration.
        
        Args:
            texts: List of text chunks to embed
            chunk_metadata: Optional metadata for each chunk
            
        Returns:
            List of dictionaries with text, embedding, and metadata
        """
        
        try:
            # Generate batch embeddings
            response = await self._generate_embeddings(
                "", 
                {"operation_type": "embedding", "batch_texts": texts}, 
                time.time(), 
                "rag_embedding"
            )
            
            if response.is_success:
                embeddings = response.metadata.get("embeddings", [])
                
                # Combine texts, embeddings, and metadata
                results = []
                for i, (text, embedding) in enumerate(zip(texts, embeddings)):
                    result = {
                        "text": text,
                        "embedding": embedding,
                        "dimensions": len(embedding),
                        "metadata": chunk_metadata[i] if chunk_metadata and i < len(chunk_metadata) else {}
                    }
                    results.append(result)
                
                logger.info(f"Generated {len(results)} embeddings for RAG system")
                return results
            else:
                logger.error(f"Embedding generation failed: {response.error}")
                return []
                
        except Exception as e:
            logger.error(f"RAG embedding error: {e}")
            return []

    async def get_model_info(self) -> Dict[str, Any]:
        """Get OpenAI model information and capabilities."""
        
        return {
            "provider": "openai",
            "chat_model": self.config["chat_model"],
            "embedding_model": self.config["embedding_model"],
            "capabilities": [
                "moderate_analysis",
                "text_embeddings",
                "rag_support", 
                "semantic_search",
                "content_classification"
            ],
            "strengths": [
                "Cost effective",
                "High quality embeddings",
                "Fast processing",
                "Reliable API",
                "Good general knowledge"
            ],
            "limitations": [
                "Moderate analysis depth",
                "No real-time data",
                "Generic political knowledge"
            ],
            "cost_structure": {
                "chat_input_per_1k_tokens": round(self.pricing["gpt4o_mini_input"] * 1000, 4),
                "chat_output_per_1k_tokens": round(self.pricing["gpt4o_mini_output"] * 1000, 4),
                "embedding_per_1k_tokens": round(self.pricing["embedding_large"] * 1000, 4)
            },
            "configuration": {
                "chat_model": self.config["chat_model"],
                "embedding_model": self.config["embedding_model"],
                "embedding_dimensions": self.config["embedding_dimensions"],
                "max_tokens": self.config["max_tokens"],
                "batch_size": self.config["batch_size"],
                "timeout_seconds": self.config["timeout"]
            }
        }