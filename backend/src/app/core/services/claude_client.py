"""
Claude AI Client for Political Intelligence Analysis

Integrates with Anthropic's Claude API for high-quality political analysis,
strategic synthesis, and comprehensive geopolitical intelligence generation.
Optimized for complex reasoning with prompt caching and cost management.
"""

import asyncio
import json
import logging
import time
import os
from typing import Dict, List, Optional, Any
from datetime import datetime, timezone

import anthropic
from anthropic import Anthropic

from .base_client import BaseAIClient, AIResponse, ModelProvider

logger = logging.getLogger(__name__)


class ClaudeClient(BaseAIClient):
    """
    Claude client optimized for political intelligence and strategic analysis.
    
    Features:
    - Prompt caching for system instructions (90% cost reduction)
    - Strategic analysis prompts for political intelligence
    - Multi-turn conversation support for complex queries
    - Cost tracking and budget management
    - Quality assessment and validation
    """
    
    def __init__(self):
        super().__init__()
        
        self.api_key = os.getenv('ANTHROPIC_API_KEY')
        if not self.api_key:
            raise ValueError("ANTHROPIC_API_KEY environment variable is required")
        
        self.client = Anthropic(api_key=self.api_key)
        
        # Claude-specific configuration
        self.config = {
            "model": "claude-3-5-sonnet-20241022",  # Latest Sonnet model
            "max_tokens": 4096,
            "temperature": 0.1,  # Low temperature for factual analysis
            "timeout": 120,
            "max_retries": 3,
            "enable_prompt_caching": True,
            "system_cache_ttl": 3600,  # 1 hour cache for system prompts
        }
        
        # Cost tracking (approximate rates as of Jan 2025)
        self.pricing = {
            "input_cost_per_token": 0.000003,   # $3/M input tokens
            "output_cost_per_token": 0.000015,  # $15/M output tokens  
            "cached_input_discount": 0.9,       # 90% discount for cached content
        }
        
        # System prompt for political intelligence (will be cached)
        self.system_prompt = self._build_system_prompt()

    def _build_system_prompt(self) -> str:
        """Build comprehensive system prompt for political intelligence analysis."""
        
        return """You are an expert political intelligence analyst specializing in Indian politics, particularly focused on Hyderabad and Telangana state dynamics. Your analysis should be:

**CORE PRINCIPLES:**
1. **Evidence-Based**: Every claim must be supported by verifiable sources
2. **Balanced Analysis**: Present multiple perspectives and avoid partisan bias  
3. **Strategic Focus**: Provide actionable insights for political campaigns
4. **Local Context**: Deep understanding of Hyderabad ward-level politics
5. **Real-Time Awareness**: Incorporate latest developments and trends

**ANALYSIS FRAMEWORK:**
- **Immediate Impact**: What's happening now and immediate implications
- **Strategic Implications**: Medium-term effects on political landscape
- **Competitive Dynamics**: How this affects major parties (BJP, INC, BRS, AIMIM)
- **Electoral Consequences**: Impact on upcoming elections and voter sentiment
- **Actionable Intelligence**: Specific recommendations for political actors

**OUTPUT STRUCTURE:**
1. **Executive Summary** (2-3 sentences of key findings)
2. **Key Developments** (Chronological timeline of events)
3. **Political Analysis** (Strategic implications and competitive dynamics)
4. **Stakeholder Impact** (Effects on different political actors)
5. **Strategic Recommendations** (Actionable insights for campaigns)
6. **Source Attribution** (Clear citations for all claims)

**QUALITY STANDARDS:**
- Use precise, professional language appropriate for senior political advisors
- Provide confidence levels for predictions (High/Medium/Low confidence)
- Include relevant historical context and precedents
- Highlight information gaps and areas of uncertainty
- Maintain strict factual accuracy and source verification

**CONTEXT AWARENESS:**
- Hyderabad's 150 wards with unique demographic and political characteristics
- State-level Telangana politics and BRS dominance patterns
- National political trends affecting local dynamics
- Historical electoral patterns and swing constituencies
- Regional political personalities and their influence networks

Respond with professional intelligence briefing format suitable for campaign strategy meetings."""

    async def generate_response(self, query: str, context: Dict[str, Any] = None, 
                               request_id: str = None) -> AIResponse:
        """
        Generate comprehensive political intelligence response using Claude.
        
        Args:
            query: User query for political analysis
            context: Additional context (ward, urgency, etc.)
            request_id: Unique request identifier for tracking
            
        Returns:
            AIResponse with political intelligence analysis
        """
        start_time = time.time()
        
        try:
            # Build context-aware user prompt
            user_prompt = self._build_user_prompt(query, context)
            
            # Prepare messages for Claude API
            messages = [
                {
                    "role": "user", 
                    "content": user_prompt
                }
            ]
            
            # Add prompt caching headers if enabled
            extra_headers = {}
            if self.config["enable_prompt_caching"]:
                extra_headers["anthropic-beta"] = "prompt-caching-2024-07-31"
            
            # Call Claude API with retry logic
            response = await self._call_with_retries(messages, extra_headers)
            
            # Process response and calculate metrics
            content = response.content[0].text if response.content else ""
            
            # Calculate token usage and costs
            input_tokens = response.usage.input_tokens
            output_tokens = response.usage.output_tokens
            cached_tokens = getattr(response.usage, 'cache_read_input_tokens', 0)
            
            # Calculate costs with caching discount
            cached_input_cost = cached_tokens * self.pricing["input_cost_per_token"] * (1 - self.pricing["cached_input_discount"])
            regular_input_cost = (input_tokens - cached_tokens) * self.pricing["input_cost_per_token"]
            output_cost = output_tokens * self.pricing["output_cost_per_token"]
            total_cost = cached_input_cost + regular_input_cost + output_cost
            
            latency_ms = int((time.time() - start_time) * 1000)
            
            # Assess response quality
            quality_score = self._assess_response_quality(content, query, context)
            
            # Build response metadata
            metadata = {
                "model_version": self.config["model"],
                "temperature": self.config["temperature"],
                "cached_tokens": cached_tokens,
                "cache_efficiency": cached_tokens / max(input_tokens, 1),
                "analysis_type": context.get("analysis_depth", "standard") if context else "standard",
                "ward_context": context.get("ward_context") if context else None,
                "confidence_level": self._extract_confidence_level(content),
                "source_count": self._count_sources(content),
                "request_id": request_id
            }
            
            logger.info(f"Claude response generated: {output_tokens} tokens, ${total_cost:.4f}, {latency_ms}ms")
            
            return AIResponse(
                content=content,
                model_used=self.config["model"],
                provider=ModelProvider.CLAUDE,
                tokens_used={
                    "input": input_tokens,
                    "output": output_tokens,
                    "cached": cached_tokens,
                    "total": input_tokens + output_tokens
                },
                cost_usd=round(total_cost, 6),
                latency_ms=latency_ms,
                quality_score=quality_score,
                metadata=metadata
            )
            
        except Exception as e:
            logger.error(f"Claude API error: {e}")
            
            # Return error response
            return AIResponse(
                content="",
                model_used=self.config["model"],
                provider=ModelProvider.CLAUDE,
                tokens_used={"input": 0, "output": 0, "cached": 0, "total": 0},
                cost_usd=0.0,
                latency_ms=int((time.time() - start_time) * 1000),
                quality_score=0.0,
                metadata={"error": str(e), "request_id": request_id},
                error=str(e)
            )

    def _build_user_prompt(self, query: str, context: Dict[str, Any] = None) -> str:
        """Build context-aware user prompt for political intelligence query."""
        
        prompt_parts = []
        
        # Add context information if available
        if context:
            if context.get("ward_context"):
                prompt_parts.append(f"**Ward Context**: {context['ward_context']}")
            
            if context.get("region_context"):
                prompt_parts.append(f"**Region**: {context['region_context']}")
            
            if context.get("analysis_depth"):
                depth_map = {
                    "quick": "Provide a concise 2-3 paragraph analysis focusing on key points",
                    "standard": "Provide comprehensive analysis with detailed strategic implications", 
                    "deep": "Provide exhaustive analysis with historical context, multiple scenarios, and detailed recommendations"
                }
                prompt_parts.append(f"**Analysis Depth**: {depth_map.get(context['analysis_depth'], 'standard')}")
            
            if context.get("strategic_context"):
                strategy_map = {
                    "defensive": "Focus on threat mitigation and defensive strategies",
                    "neutral": "Provide balanced analysis of opportunities and threats",
                    "offensive": "Focus on competitive advantages and offensive strategies"
                }
                prompt_parts.append(f"**Strategic Context**: {strategy_map.get(context['strategic_context'], 'neutral')}")
            
            if context.get("urgency"):
                prompt_parts.append(f"**Urgency Level**: {context['urgency']} - prioritize time-sensitive insights")
        
        # Add temporal context
        current_time = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
        prompt_parts.append(f"**Current Time**: {current_time}")
        
        # Add the main query
        prompt_parts.append(f"**Query**: {query}")
        
        # Add specific instructions based on query type
        if any(term in query.lower() for term in ['compare', 'versus', 'difference']):
            prompt_parts.append("**Focus**: Provide detailed comparative analysis with pros/cons for each option")
        elif any(term in query.lower() for term in ['predict', 'forecast', 'outcome']):
            prompt_parts.append("**Focus**: Provide scenario analysis with probability assessments and confidence levels")
        elif any(term in query.lower() for term in ['strategy', 'recommend', 'should']):
            prompt_parts.append("**Focus**: Provide actionable strategic recommendations with implementation guidance")
        
        # Request structured output
        prompt_parts.append("""
**Required Output Format**:
1. **Executive Summary** (2-3 key findings)
2. **Detailed Analysis** (comprehensive assessment)
3. **Strategic Implications** (political consequences) 
4. **Recommendations** (actionable insights)
5. **Confidence Assessment** (High/Medium/Low for key claims)
6. **Sources** (cite all factual claims)""")
        
        return "\n\n".join(prompt_parts)

    async def _call_with_retries(self, messages: List[Dict], extra_headers: Dict) -> Any:
        """Call Claude API with retry logic and error handling."""
        
        last_error = None
        
        for attempt in range(self.config["max_retries"]):
            try:
                # Add exponential backoff for retries
                if attempt > 0:
                    await asyncio.sleep(2 ** attempt)
                
                response = self.client.messages.create(
                    model=self.config["model"],
                    max_tokens=self.config["max_tokens"],
                    temperature=self.config["temperature"],
                    system=[{
                        "type": "text",
                        "text": self.system_prompt,
                        "cache_control": {"type": "ephemeral"} if self.config["enable_prompt_caching"] else None
                    }],
                    messages=messages,
                    extra_headers=extra_headers
                )
                
                return response
                
            except anthropic.RateLimitError as e:
                logger.warning(f"Claude rate limit hit, attempt {attempt + 1}: {e}")
                last_error = e
                if attempt < self.config["max_retries"] - 1:
                    await asyncio.sleep(60)  # Wait 1 minute for rate limit
                    
            except anthropic.APITimeoutError as e:
                logger.warning(f"Claude timeout, attempt {attempt + 1}: {e}")
                last_error = e
                
            except anthropic.APIError as e:
                logger.error(f"Claude API error, attempt {attempt + 1}: {e}")
                last_error = e
                if e.status_code in [500, 502, 503, 504]:  # Server errors, retry
                    continue
                else:  # Client errors, don't retry
                    break
                    
            except Exception as e:
                logger.error(f"Unexpected error calling Claude: {e}")
                last_error = e
                break
        
        # All retries failed
        raise Exception(f"Claude API failed after {self.config['max_retries']} attempts: {last_error}")

    def _assess_response_quality(self, content: str, query: str, context: Dict[str, Any]) -> float:
        """Assess the quality of Claude's response for political intelligence."""
        
        quality_score = 0.0
        
        # Length and structure assessment (0.0-0.3)
        word_count = len(content.split())
        if word_count >= 200:
            quality_score += 0.3
        elif word_count >= 100:
            quality_score += 0.2
        elif word_count >= 50:
            quality_score += 0.1
        
        # Content structure assessment (0.0-0.2)
        if "Executive Summary" in content or "Key Findings" in content:
            quality_score += 0.1
        if "Recommendations" in content or "Strategic" in content:
            quality_score += 0.1
        
        # Source citation assessment (0.0-0.2)
        source_indicators = ["Source:", "According to", "Reports indicate", "Data shows"]
        citation_count = sum(1 for indicator in source_indicators if indicator in content)
        quality_score += min(0.2, citation_count * 0.05)
        
        # Political relevance assessment (0.0-0.2)
        political_terms = ["party", "election", "campaign", "voter", "constituency", "BJP", "Congress", "BRS", "AIMIM"]
        relevance_count = sum(1 for term in political_terms if term.lower() in content.lower())
        quality_score += min(0.2, relevance_count * 0.02)
        
        # Confidence and uncertainty handling (0.0-0.1)
        if any(term in content for term in ["confidence", "likely", "uncertain", "estimate"]):
            quality_score += 0.1
        
        return min(1.0, quality_score)

    def _extract_confidence_level(self, content: str) -> str:
        """Extract confidence level indicators from response."""
        
        if "high confidence" in content.lower() or "very likely" in content.lower():
            return "high"
        elif "medium confidence" in content.lower() or "likely" in content.lower():
            return "medium"
        elif "low confidence" in content.lower() or "uncertain" in content.lower():
            return "low"
        else:
            return "not_specified"

    def _count_sources(self, content: str) -> int:
        """Count the number of sources cited in the response."""
        
        source_patterns = [
            "according to", "reports indicate", "source:", "cited by",
            "data from", "survey shows", "poll indicates"
        ]
        
        source_count = 0
        content_lower = content.lower()
        
        for pattern in source_patterns:
            source_count += content_lower.count(pattern)
        
        return min(source_count, 20)  # Cap at reasonable maximum

    async def get_model_info(self) -> Dict[str, Any]:
        """Get current model configuration and capabilities."""
        
        return {
            "provider": "anthropic",
            "model": self.config["model"],
            "capabilities": [
                "political_analysis",
                "strategic_planning", 
                "competitive_intelligence",
                "scenario_analysis",
                "policy_analysis"
            ],
            "strengths": [
                "Complex reasoning",
                "Long-form analysis", 
                "Balanced perspectives",
                "Source attribution",
                "Strategic thinking"
            ],
            "limitations": [
                "Real-time data access",
                "Local news coverage",
                "Recent developments"
            ],
            "cost_structure": {
                "input_cost_per_1k_tokens": round(self.pricing["input_cost_per_token"] * 1000, 4),
                "output_cost_per_1k_tokens": round(self.pricing["output_cost_per_token"] * 1000, 4),
                "caching_discount": f"{int(self.pricing['cached_input_discount'] * 100)}%"
            },
            "configuration": {
                "max_tokens": self.config["max_tokens"],
                "temperature": self.config["temperature"],
                "prompt_caching": self.config["enable_prompt_caching"],
                "timeout_seconds": self.config["timeout"]
            }
        }