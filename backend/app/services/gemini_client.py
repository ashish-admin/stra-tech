"""
Gemini 2.5 Pro Client for Advanced Political Analysis

Integrates with Google's Gemini 2.5 Pro model for comprehensive strategic analysis,
complex reasoning, and long-context political intelligence processing.
Optimized for deep analytical tasks with competitive cost efficiency.
"""

import asyncio
import json
import logging
import time
import os
from typing import Dict, List, Optional, Any
from datetime import datetime, timezone

import google.generativeai as genai
from google.generativeai.types import HarmCategory, HarmBlockThreshold

from .base_client import BaseAIClient, AIResponse, ModelProvider

logger = logging.getLogger(__name__)


class GeminiClient(BaseAIClient):
    """
    Gemini 2.5 Pro client optimized for advanced political analysis.
    
    Features:
    - High-context analysis (up to 2M tokens)
    - Advanced reasoning capabilities
    - Competitive pricing for complex analysis
    - Enhanced safety filtering for political content
    - Structured output support
    """
    
    def __init__(self):
        super().__init__()
        
        self.api_key = os.getenv('GEMINI_API_KEY')
        if not self.api_key:
            logger.warning("GEMINI_API_KEY not found, Gemini client will fail")
        
        # Configure Gemini API
        if self.api_key:
            genai.configure(api_key=self.api_key)
        
        # Gemini-specific configuration
        self.config = {
            "model": "gemini-2.5-pro",
            "temperature": 0.1,  # Low temperature for factual analysis
            "max_output_tokens": 8192,
            "timeout": 120,
            "max_retries": 3,
            "enable_candidate_count": 1,
            "enable_safety_settings": True,
        }
        
        # Cost tracking (Gemini 2.5 Pro pricing as of Jan 2025)
        self.pricing = {
            "input_cost_per_token": 0.00000125,   # $1.25/M input tokens
            "output_cost_per_token": 0.000005,    # $5/M output tokens
            "context_cache_discount": 0.875,      # 87.5% discount for cached content
        }
        
        # Safety settings for political content
        self.safety_settings = {
            HarmCategory.HARM_CATEGORY_HATE_SPEECH: HarmBlockThreshold.BLOCK_ONLY_HIGH,
            HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT: HarmBlockThreshold.BLOCK_ONLY_HIGH,
            HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
            HarmCategory.HARM_CATEGORY_HARASSMENT: HarmBlockThreshold.BLOCK_ONLY_HIGH,
        }
        
        # Initialize model
        self.model = None
        if self.api_key:
            try:
                self.model = genai.GenerativeModel(
                    model_name=self.config["model"],
                    safety_settings=self.safety_settings,
                    system_instruction=self._build_system_instruction()
                )
            except Exception as e:
                logger.error(f"Failed to initialize Gemini model: {e}")

    def _build_system_instruction(self) -> str:
        """Build system instruction for political intelligence analysis."""
        
        return """You are an expert geopolitical intelligence analyst specializing in Indian politics, with deep expertise in Hyderabad and Telangana political dynamics. Your analysis must be:

**ANALYTICAL FRAMEWORK:**
1. **Evidence-Based Analysis**: All claims supported by verifiable sources and data
2. **Multi-Perspective Assessment**: Consider all major stakeholder viewpoints objectively
3. **Strategic Intelligence Focus**: Provide actionable insights for political decision-making
4. **Local Context Integration**: Deep understanding of ward-level Hyderabad politics
5. **Temporal Analysis**: Connect historical patterns with current developments

**OUTPUT STANDARDS:**
- **Precision**: Use exact figures, dates, and source attributions
- **Objectivity**: Maintain analytical neutrality while identifying biases in sources
- **Completeness**: Address query comprehensively while noting information gaps
- **Strategic Value**: Emphasize actionable intelligence over descriptive content
- **Source Credibility**: Assess and weight source reliability in analysis

**POLITICAL CONTEXT:**
- Telangana state political landscape (BRS dominance, coalition dynamics)
- Hyderabad GHMC ward-level electoral patterns and demographic shifts
- National political trends affecting local dynamics (BJP expansion, Congress revival)
- Regional political personalities and their influence networks
- Electoral timing and cycle considerations

**ANALYSIS STRUCTURE:**
1. **Situation Assessment** (Current state with confidence levels)
2. **Stakeholder Analysis** (Impact on major political actors)
3. **Strategic Implications** (Medium-term political consequences)
4. **Risk Assessment** (Potential challenges and opportunities)
5. **Tactical Recommendations** (Specific actionable strategies)
6. **Source Evaluation** (Credibility assessment of information sources)

Provide analysis suitable for senior political strategists and campaign leadership."""

    async def generate_response(self, query: str, context: Dict[str, Any] = None, 
                               request_id: str = None) -> AIResponse:
        """
        Generate comprehensive political intelligence response using Gemini 2.5 Pro.
        
        Args:
            query: User query for political analysis
            context: Additional context (ward, urgency, depth)
            request_id: Unique request identifier
            
        Returns:
            AIResponse with comprehensive political intelligence analysis
        """
        start_time = self._start_request_timer()
        
        try:
            if not self.model:
                raise Exception("Gemini model not initialized - check API key")
            
            # Build context-aware prompt
            enhanced_prompt = self._build_enhanced_prompt(query, context)
            
            # Configure generation parameters
            generation_config = {
                "temperature": self.config["temperature"],
                "max_output_tokens": self.config["max_output_tokens"],
                "candidate_count": self.config["enable_candidate_count"],
            }
            
            # Generate response with retry logic
            response = await self._generate_with_retries(enhanced_prompt, generation_config)
            
            # Extract and process response content
            content = response.text if response else ""
            
            # Calculate token usage (approximate for Gemini)
            input_tokens = self._estimate_tokens(enhanced_prompt)
            output_tokens = self._estimate_tokens(content)
            
            # Calculate costs
            input_cost = input_tokens * self.pricing["input_cost_per_token"]
            output_cost = output_tokens * self.pricing["output_cost_per_token"]
            total_cost = input_cost + output_cost
            
            latency_ms = self._end_request_timer(start_time)
            
            # Assess response quality
            quality_score = self._assess_political_analysis_quality(content, query, context)
            
            # Extract analysis confidence
            confidence_level = self._extract_confidence_indicators(content)
            
            # Build comprehensive metadata
            metadata = {
                "model_version": self.config["model"],
                "generation_config": generation_config,
                "safety_ratings": self._extract_safety_ratings(response) if response else {},
                "analysis_depth": context.get("analysis_depth", "standard") if context else "standard",
                "ward_context": context.get("ward_context") if context else None,
                "confidence_level": confidence_level,
                "strategic_complexity": self._assess_strategic_complexity(content),
                "source_citations": self._count_source_citations(content),
                "request_id": request_id,
                "processing_mode": "high_context_analysis"
            }
            
            # Record successful metrics
            self._record_success(input_tokens + output_tokens, total_cost)
            
            logger.info(f"Gemini analysis completed: {output_tokens} tokens, ${total_cost:.4f}, {latency_ms}ms, quality: {quality_score:.2f}")
            
            return AIResponse(
                content=content,
                model_used=self.config["model"],
                provider=ModelProvider.GEMINI,
                tokens_used={
                    "input": input_tokens,
                    "output": output_tokens,
                    "total": input_tokens + output_tokens
                },
                cost_usd=round(total_cost, 6),
                latency_ms=latency_ms,
                quality_score=quality_score,
                metadata=metadata
            )
            
        except Exception as e:
            logger.error(f"Gemini API error: {e}")
            self._record_error(str(e))
            
            return self._build_error_response(str(e), query, request_id)

    def _build_enhanced_prompt(self, query: str, context: Dict[str, Any] = None) -> str:
        """Build enhanced prompt with context for Gemini analysis."""
        
        prompt_sections = []
        
        # Add contextual intelligence briefing header
        prompt_sections.append("**POLITICAL INTELLIGENCE ANALYSIS REQUEST**")
        
        # Add geographical context
        if context:
            if context.get("ward_context"):
                prompt_sections.append(f"**Geographic Focus**: {context['ward_context']}, Hyderabad, Telangana")
            elif context.get("region_context"):
                prompt_sections.append(f"**Regional Focus**: {context['region_context']}, India")
            
            # Add analysis depth instructions
            depth_instructions = {
                "quick": "Provide focused analysis with key insights and immediate implications (300-500 words)",
                "standard": "Provide comprehensive analysis with strategic implications and recommendations (800-1200 words)",
                "deep": "Provide exhaustive analysis with historical context, multiple scenarios, and detailed strategic planning (1500+ words)"
            }
            
            analysis_depth = context.get("analysis_depth", "standard")
            if analysis_depth in depth_instructions:
                prompt_sections.append(f"**Analysis Scope**: {depth_instructions[analysis_depth]}")
            
            # Add strategic context
            strategic_context_map = {
                "defensive": "Focus on threat mitigation, risk assessment, and defensive strategies",
                "neutral": "Provide balanced assessment of opportunities and threats with objective analysis",
                "offensive": "Focus on competitive advantages, opportunity identification, and proactive strategies"
            }
            
            strategic_context = context.get("strategic_context", "neutral")
            if strategic_context in strategic_context_map:
                prompt_sections.append(f"**Strategic Orientation**: {strategic_context_map[strategic_context]}")
            
            # Add urgency indicators
            if context.get("urgency") == "high":
                prompt_sections.append("**URGENT**: Time-sensitive analysis required - prioritize immediate actionable insights")
        
        # Add temporal context
        current_time = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
        prompt_sections.append(f"**Analysis Timestamp**: {current_time}")
        
        # Add the main analytical query
        prompt_sections.append(f"**QUERY FOR ANALYSIS**:\n{query}")
        
        # Add specific output structure requirements
        prompt_sections.append("""
**REQUIRED ANALYSIS STRUCTURE**:

1. **EXECUTIVE ASSESSMENT** (2-3 key findings with confidence levels)
2. **SITUATIONAL ANALYSIS** (Current state with supporting evidence)
3. **STAKEHOLDER IMPACT MATRIX** (Effects on BJP, Congress, BRS, AIMIM, local leaders)
4. **STRATEGIC IMPLICATIONS** (Political consequences and opportunities)
5. **RISK-OPPORTUNITY ANALYSIS** (Threats to mitigate, advantages to leverage)
6. **TACTICAL RECOMMENDATIONS** (Specific actionable strategies)
7. **INFORMATION ASSESSMENT** (Source credibility and information gaps)
8. **CONFIDENCE INDICATORS** (High/Medium/Low confidence for major claims)

**CRITICAL REQUIREMENTS**:
- Cite all factual claims with source assessment
- Provide confidence levels for predictions and assessments
- Include historical precedents where relevant
- Highlight areas of uncertainty or incomplete information
- Focus on actionable intelligence for political decision-makers""")
        
        return "\n\n".join(prompt_sections)

    async def _generate_with_retries(self, prompt: str, generation_config: Dict) -> Any:
        """Generate response with retry logic and error handling."""
        
        last_error = None
        
        for attempt in range(self.config["max_retries"]):
            try:
                if attempt > 0:
                    await asyncio.sleep(2 ** attempt)  # Exponential backoff
                
                # Generate content asynchronously
                response = await asyncio.wait_for(
                    asyncio.to_thread(
                        self.model.generate_content,
                        prompt,
                        generation_config=generation_config
                    ),
                    timeout=self.config["timeout"]
                )
                
                # Check if response was generated successfully
                if response and response.text:
                    return response
                else:
                    raise Exception("Empty response from Gemini")
                    
            except asyncio.TimeoutError:
                last_error = f"Timeout after {self.config['timeout']} seconds"
                logger.warning(f"Gemini timeout, attempt {attempt + 1}: {last_error}")
                
            except Exception as e:
                last_error = str(e)
                logger.warning(f"Gemini error, attempt {attempt + 1}: {last_error}")
                
                # Don't retry certain types of errors
                if "quota" in str(e).lower() or "billing" in str(e).lower():
                    break
        
        raise Exception(f"Gemini generation failed after {self.config['max_retries']} attempts: {last_error}")

    def _assess_political_analysis_quality(self, content: str, query: str, context: Dict[str, Any]) -> float:
        """Assess quality of Gemini political analysis response."""
        
        quality_score = 0.0
        
        # Content depth and structure (0.0-0.3)
        word_count = len(content.split())
        if word_count >= 800:
            quality_score += 0.3
        elif word_count >= 400:
            quality_score += 0.2
        elif word_count >= 200:
            quality_score += 0.1
        
        # Analytical structure (0.0-0.25)
        structure_indicators = [
            "Executive Assessment", "Situational Analysis", "Strategic Implications", 
            "Recommendations", "Stakeholder", "Risk"
        ]
        structure_count = sum(1 for indicator in structure_indicators if indicator in content)
        quality_score += min(0.25, structure_count * 0.04)
        
        # Source citation and evidence (0.0-0.2)
        citation_patterns = ["Source:", "According to", "Data from", "Reports indicate", "Survey shows"]
        citation_count = sum(1 for pattern in citation_patterns if pattern in content)
        quality_score += min(0.2, citation_count * 0.04)
        
        # Confidence level indicators (0.0-0.15)
        confidence_patterns = ["High confidence", "Medium confidence", "Low confidence", "Uncertain", "Likely"]
        confidence_count = sum(1 for pattern in confidence_patterns if pattern in content)
        quality_score += min(0.15, confidence_count * 0.03)
        
        # Political relevance and context (0.0-0.1)
        political_terms = ["BJP", "Congress", "BRS", "AIMIM", "election", "campaign", "voter", "ward", "constituency"]
        political_count = sum(1 for term in political_terms if term in content)
        quality_score += min(0.1, political_count * 0.01)
        
        return min(1.0, quality_score)

    def _extract_confidence_indicators(self, content: str) -> str:
        """Extract overall confidence level from analysis."""
        
        content_lower = content.lower()
        
        high_confidence_indicators = ["high confidence", "very likely", "certain", "definitive"]
        medium_confidence_indicators = ["medium confidence", "likely", "probable", "moderate confidence"]
        low_confidence_indicators = ["low confidence", "uncertain", "unclear", "limited information"]
        
        high_count = sum(1 for indicator in high_confidence_indicators if indicator in content_lower)
        medium_count = sum(1 for indicator in medium_confidence_indicators if indicator in content_lower)
        low_count = sum(1 for indicator in low_confidence_indicators if indicator in content_lower)
        
        if high_count >= medium_count and high_count >= low_count:
            return "high"
        elif low_count > high_count and low_count > medium_count:
            return "low"
        else:
            return "medium"

    def _assess_strategic_complexity(self, content: str) -> str:
        """Assess the strategic complexity of the analysis."""
        
        complexity_indicators = [
            "scenario", "multiple factors", "complex dynamics", "interconnected",
            "strategic implications", "long-term", "stakeholder", "trade-off"
        ]
        
        complexity_count = sum(1 for indicator in complexity_indicators if indicator.lower() in content.lower())
        
        if complexity_count >= 6:
            return "high"
        elif complexity_count >= 3:
            return "medium"
        else:
            return "low"

    def _count_source_citations(self, content: str) -> int:
        """Count source citations in the analysis."""
        
        citation_patterns = [
            "source:", "according to", "data from", "reports indicate", 
            "survey shows", "study finds", "research suggests"
        ]
        
        total_citations = 0
        content_lower = content.lower()
        
        for pattern in citation_patterns:
            total_citations += content_lower.count(pattern)
        
        return min(total_citations, 15)  # Cap at reasonable maximum

    def _extract_safety_ratings(self, response: Any) -> Dict[str, str]:
        """Extract safety ratings from Gemini response."""
        
        try:
            if hasattr(response, 'prompt_feedback') and response.prompt_feedback:
                safety_ratings = {}
                for rating in response.prompt_feedback.safety_ratings:
                    category = rating.category.name if hasattr(rating.category, 'name') else str(rating.category)
                    probability = rating.probability.name if hasattr(rating.probability, 'name') else str(rating.probability)
                    safety_ratings[category] = probability
                return safety_ratings
        except Exception as e:
            logger.warning(f"Could not extract safety ratings: {e}")
        
        return {}

    async def get_model_info(self) -> Dict[str, Any]:
        """Get Gemini model information and capabilities."""
        
        return {
            "provider": "google",
            "model": self.config["model"],
            "capabilities": [
                "long_context_analysis",
                "complex_reasoning",
                "political_intelligence",
                "strategic_analysis",
                "scenario_planning",
                "multi_perspective_analysis"
            ],
            "strengths": [
                "High-context understanding (2M tokens)",
                "Advanced reasoning capabilities",
                "Competitive pricing",
                "Comprehensive analysis",
                "Safety filtering"
            ],
            "limitations": [
                "No real-time web access",
                "Training data cutoff",
                "Requires structured prompting"
            ],
            "cost_structure": {
                "input_cost_per_1k_tokens": round(self.pricing["input_cost_per_token"] * 1000, 4),
                "output_cost_per_1k_tokens": round(self.pricing["output_cost_per_token"] * 1000, 4),
                "context_cache_discount": f"{int(self.pricing['context_cache_discount'] * 100)}%"
            },
            "configuration": {
                "max_output_tokens": self.config["max_output_tokens"],
                "temperature": self.config["temperature"],
                "safety_filtering": self.config["enable_safety_settings"],
                "timeout_seconds": self.config["timeout"]
            }
        }

    def _build_error_response(self, error: str, query: str = "", request_id: str = None) -> AIResponse:
        """Build standardized error response for Gemini."""
        
        return AIResponse(
            content="",
            model_used=self.config["model"],
            provider=ModelProvider.GEMINI,
            tokens_used={"input": 0, "output": 0, "total": 0},
            cost_usd=0.0,
            latency_ms=0,
            quality_score=0.0,
            metadata={
                "error": error,
                "request_id": request_id,
                "query_length": len(query) if query else 0,
                "provider": "google_gemini"
            },
            error=error
        )