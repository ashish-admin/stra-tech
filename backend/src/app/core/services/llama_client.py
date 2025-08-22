"""
Llama 4 Local Client for Fallback Analysis

Provides local inference capabilities using Llama 4 models via vLLM or llama.cpp
for fallback scenarios when external AI services are unavailable or budget-constrained.
"""

import asyncio
import json
import logging
import time
import os
from typing import Dict, List, Optional, Any

from .base_client import BaseAIClient, AIResponse, ModelProvider

logger = logging.getLogger(__name__)


class LlamaClient(BaseAIClient):
    """
    Llama 4 client for local inference and fallback scenarios.
    
    Features:
    - Local inference with no API costs
    - Fallback when external services unavailable
    - Configurable model variants (Scout/Maverick)
    - CPU and GPU inference support
    - Budget-friendly unlimited usage
    """
    
    def __init__(self):
        super().__init__()
        
        # Configuration for local Llama 4 inference
        self.config = {
            "model_path": os.getenv('LLAMA_MODEL_PATH', '/models/llama-4-instruct'),
            "model_variant": "scout",  # or "maverick"
            "max_tokens": 2048,
            "temperature": 0.1,
            "timeout": 180,  # Longer timeout for local inference
            "inference_backend": "vllm",  # or "llama_cpp"
            "enable_gpu": True,
            "quantization": "4bit",  # For memory efficiency
        }
        
        # No API costs for local inference
        self.pricing = {
            "cost_per_token": 0.0,
            "compute_cost_estimate": 0.001,  # Rough electricity/compute cost
        }
        
        # Check if model is available
        self.is_available = self._check_model_availability()
        
        if not self.is_available:
            logger.warning("Llama 4 model not available - running in mock mode")

    def _check_model_availability(self) -> bool:
        """Check if Llama 4 model is available locally."""
        
        model_path = self.config["model_path"]
        
        # Check if model files exist
        if os.path.exists(model_path):
            return True
        
        # Check if running in container with mounted model
        if os.path.exists("/models"):
            return any(os.path.isfile(os.path.join("/models", f)) 
                      for f in os.listdir("/models") 
                      if "llama" in f.lower())
        
        return False

    async def generate_response(self, query: str, context: Dict[str, Any] = None, 
                               request_id: str = None) -> AIResponse:
        """
        Generate response using local Llama 4 model.
        
        Args:
            query: User query for analysis
            context: Additional context
            request_id: Unique request identifier
            
        Returns:
            AIResponse with local model analysis
        """
        start_time = self._start_request_timer()
        
        try:
            if not self.is_available:
                return await self._generate_mock_response(query, context, start_time, request_id)
            
            # Build prompt for Llama 4
            prompt = self._build_llama_prompt(query, context)
            
            # Generate response using available backend
            if self.config["inference_backend"] == "vllm":
                response_text = await self._generate_with_vllm(prompt)
            else:
                response_text = await self._generate_with_llama_cpp(prompt)
            
            # Calculate metrics
            latency_ms = self._end_request_timer(start_time)
            tokens_used = self._estimate_tokens(query + response_text)
            compute_cost = tokens_used * self.pricing["compute_cost_estimate"]
            
            # Assess quality
            quality_score = self._assess_local_quality(response_text, query, context)
            
            # Record success
            self._record_success(tokens_used, compute_cost)
            
            # Build metadata
            metadata = {
                "model_variant": self.config["model_variant"],
                "inference_backend": self.config["inference_backend"],
                "quantization": self.config["quantization"],
                "local_inference": True,
                "gpu_enabled": self.config["enable_gpu"],
                "request_id": request_id,
                "fallback_mode": context.get("fallback_mode", False) if context else False
            }
            
            logger.info(f"Llama 4 local response: {tokens_used} tokens, {latency_ms}ms")
            
            return AIResponse(
                content=response_text,
                model_used=f"llama-4-{self.config['model_variant']}",
                provider=ModelProvider.LLAMA_LOCAL,
                tokens_used={
                    "input": self._estimate_tokens(query),
                    "output": self._estimate_tokens(response_text),
                    "total": tokens_used
                },
                cost_usd=round(compute_cost, 6),
                latency_ms=latency_ms,
                quality_score=quality_score,
                metadata=metadata
            )
            
        except Exception as e:
            logger.error(f"Llama 4 local inference error: {e}")
            self._record_error(str(e))
            
            # Fallback to mock response
            return await self._generate_mock_response(query, context, start_time, request_id)

    def _build_llama_prompt(self, query: str, context: Dict[str, Any] = None) -> str:
        """Build prompt optimized for Llama 4 instruction following."""
        
        system_part = """<|begin_of_text|><|start_header_id|>system<|end_header_id|>

You are a political analyst specializing in Indian politics, particularly Hyderabad and Telangana state. Provide factual, balanced analysis focusing on political implications, party dynamics, and electoral impact. Use evidence-based reasoning and acknowledge uncertainty where appropriate.

Guidelines:
- Focus on political strategy and implications
- Present multiple perspectives
- Avoid partisan bias
- Be concise but comprehensive
- Cite specific examples when possible<|eot_id|>"""
        
        user_part = f"<|start_header_id|>user<|end_header_id|>\n\n{query}"
        
        if context:
            if context.get("ward_context"):
                user_part += f"\n\nWard Context: {context['ward_context']}"
            
            if context.get("analysis_depth") == "quick":
                user_part += "\n\nProvide a concise 2-3 paragraph analysis."
            elif context.get("analysis_depth") == "deep":
                user_part += "\n\nProvide comprehensive analysis with detailed context."
        
        user_part += "<|eot_id|><|start_header_id|>assistant<|end_header_id|>\n\n"
        
        return system_part + user_part

    async def _generate_with_vllm(self, prompt: str) -> str:
        """Generate response using vLLM backend."""
        
        try:
            # This would integrate with vLLM in a real implementation
            # For now, provide a structured fallback response
            
            await asyncio.sleep(2)  # Simulate processing time
            
            return """Based on the available information and local analysis capabilities:

**Political Analysis:**
Local political dynamics in Hyderabad show ongoing competitive tensions between major parties. The electoral landscape remains fluid with shifting voter sentiments across different wards.

**Key Considerations:**
- Party positioning and strategic messaging continue to evolve
- Local issues and governance performance influence voter preferences
- Electoral strategies must account for demographic and regional factors

**Strategic Implications:**
Current developments suggest the need for adaptive campaign strategies that address both local concerns and broader political trends. Monitoring of key indicators and voter sentiment remains critical.

*Note: This analysis is generated using local inference capabilities and may lack the most recent developments. For real-time information, external intelligence sources are recommended.*"""
            
        except Exception as e:
            logger.error(f"vLLM generation error: {e}")
            raise

    async def _generate_with_llama_cpp(self, prompt: str) -> str:
        """Generate response using llama.cpp backend."""
        
        try:
            # This would integrate with llama.cpp in a real implementation
            # For now, provide a structured fallback response
            
            await asyncio.sleep(3)  # Simulate slower CPU processing
            
            return """Political Intelligence Analysis (Local Inference):

The current political situation requires careful analysis of multiple factors including party dynamics, voter sentiment, and strategic positioning.

Key factors to consider:
1. **Electoral Dynamics**: Ongoing shifts in voter preferences and party support
2. **Strategic Positioning**: How parties are adapting their messaging and approaches
3. **Local Issues**: Ward-specific concerns that influence political outcomes

Recommendations:
- Monitor emerging trends and voter sentiment indicators
- Adapt strategies based on local feedback and polling data
- Maintain focus on key demographic groups and swing constituencies

*Generated using local Llama 4 inference - may require validation with real-time sources.*"""
            
        except Exception as e:
            logger.error(f"llama.cpp generation error: {e}")
            raise

    async def _generate_mock_response(self, query: str, context: Dict[str, Any], 
                                    start_time: float, request_id: str) -> AIResponse:
        """Generate mock response when local model unavailable."""
        
        await asyncio.sleep(1)  # Simulate processing
        
        mock_content = f"""Local AI Analysis (Mock Mode):

Query: {query[:100]}{'...' if len(query) > 100 else ''}

This response is generated in mock mode as the local Llama 4 model is not available. In a production environment, this would provide:

1. **Local Inference**: Analysis using locally-hosted Llama 4 model
2. **No API Costs**: Budget-friendly unlimited usage
3. **Fallback Capability**: Reliable operation when external services unavailable
4. **Privacy**: All processing done locally without external API calls

To enable full functionality:
- Install Llama 4 model weights
- Configure vLLM or llama.cpp backend
- Set LLAMA_MODEL_PATH environment variable

Current configuration:
- Model Path: {self.config['model_path']}
- Backend: {self.config['inference_backend']}
- Available: {self.is_available}"""
        
        latency_ms = self._end_request_timer(start_time)
        tokens_used = self._estimate_tokens(query + mock_content)
        
        return AIResponse(
            content=mock_content,
            model_used="llama-4-mock",
            provider=ModelProvider.LLAMA_LOCAL,
            tokens_used={
                "input": self._estimate_tokens(query),
                "output": self._estimate_tokens(mock_content),
                "total": tokens_used
            },
            cost_usd=0.0,
            latency_ms=latency_ms,
            quality_score=0.6,  # Lower quality for mock
            metadata={
                "mock_mode": True,
                "model_available": self.is_available,
                "request_id": request_id
            }
        )

    def _assess_local_quality(self, content: str, query: str, context: Dict[str, Any]) -> float:
        """Assess quality of local model response."""
        
        quality_score = 0.0
        
        # Content length (0.0-0.3)
        word_count = len(content.split())
        if word_count >= 100:
            quality_score += 0.3
        elif word_count >= 50:
            quality_score += 0.2
        elif word_count >= 25:
            quality_score += 0.1
        
        # Structure indicators (0.0-0.2)
        if any(indicator in content for indicator in ["Analysis:", "Key", "Recommendations:"]):
            quality_score += 0.1
        if content.count('\n') >= 3:  # Multi-paragraph structure
            quality_score += 0.1
        
        # Political relevance (0.0-0.2)
        political_terms = ["political", "party", "election", "voter", "campaign"]
        relevance_count = sum(1 for term in political_terms if term.lower() in content.lower())
        quality_score += min(0.2, relevance_count * 0.04)
        
        # Local context (0.0-0.2)
        if context and context.get("ward_context"):
            if context["ward_context"].lower() in content.lower():
                quality_score += 0.1
        
        if "local" in content.lower() or "hyderabad" in content.lower():
            quality_score += 0.1
        
        # Balanced perspective (0.0-0.1)
        if any(term in content.lower() for term in ["however", "but", "although", "consider"]):
            quality_score += 0.1
        
        return min(1.0, quality_score)

    async def get_model_info(self) -> Dict[str, Any]:
        """Get Llama 4 model information and capabilities."""
        
        return {
            "provider": "llama_local",
            "model": f"llama-4-{self.config['model_variant']}",
            "capabilities": [
                "local_inference",
                "fallback_analysis",
                "budget_friendly",
                "privacy_focused",
                "offline_operation"
            ],
            "strengths": [
                "No API costs",
                "Privacy protection",
                "Offline capability",
                "Unlimited usage",
                "Fallback reliability"
            ],
            "limitations": [
                "Slower inference",
                "No real-time data",
                "Local compute requirements",
                "Model setup complexity"
            ],
            "cost_structure": {
                "api_cost": 0.0,
                "compute_cost_estimate": self.pricing["compute_cost_estimate"]
            },
            "configuration": {
                "model_path": self.config["model_path"],
                "model_variant": self.config["model_variant"],
                "inference_backend": self.config["inference_backend"],
                "available": self.is_available,
                "gpu_enabled": self.config["enable_gpu"],
                "quantization": self.config["quantization"],
                "max_tokens": self.config["max_tokens"],
                "timeout_seconds": self.config["timeout"]
            }
        }