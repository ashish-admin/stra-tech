"""
Enhanced Multi-Model AI Coordinator with Claude Integration

Coordinates between Claude, Gemini, OpenAI, and Perplexity for comprehensive strategic analysis.
Implements intelligent fallback and model selection based on availability and performance.
"""

import os
import json
import logging
import asyncio
import requests
from datetime import datetime, timezone
from typing import Dict, List, Any, Optional
from dataclasses import dataclass

logger = logging.getLogger(__name__)


@dataclass
class ModelConfig:
    """Configuration for AI model endpoints and parameters."""
    name: str
    available: bool
    api_key: str
    endpoint: str
    headers: Dict[str, str]
    max_tokens: int = 2048
    temperature: float = 0.3


class EnhancedMultiModelCoordinator:
    """
    Enhanced multi-model orchestration with Claude, Gemini, OpenAI, and Perplexity.
    Provides intelligent fallback and optimal model selection.
    """
    
    def __init__(self):
        # Initialize all available models
        self.models = self._initialize_models()
        self.active_models = [m for m in self.models.values() if m.available]
        
        if not self.active_models:
            logger.warning("No AI models available - using fallback mode")
        else:
            logger.info(f"Active AI models: {[m.name for m in self.active_models]}")
    
    def _initialize_models(self) -> Dict[str, ModelConfig]:
        """Initialize all available AI models with their configurations."""
        models = {}
        
        # Fixed Perplexity Configuration - PRIMARY SERVICE
        perplexity_key = os.getenv('PERPLEXITY_API_KEY')
        if perplexity_key:
            # Test Perplexity availability
            is_perplexity_working = self._check_perplexity_status(perplexity_key)
            
            models['perplexity'] = ModelConfig(
                name='sonar',  # Correct model name for Perplexity
                available=is_perplexity_working,
                api_key=perplexity_key,
                endpoint='https://api.perplexity.ai/chat/completions',
                headers={
                    'Authorization': f'Bearer {perplexity_key}',
                    'Content-Type': 'application/json'
                },
                max_tokens=2048,  # Increased for better analysis
                temperature=0.2
            )
        
        # OpenAI/ChatGPT Configuration - SECONDARY (check quota)
        openai_key = os.getenv('OPENAI_API_KEY', os.getenv('CHATGPT_API_KEY'))
        if openai_key and not openai_key.startswith('placeholder'):
            # Check OpenAI quota status
            is_openai_available = self._check_openai_quota(openai_key)
            
            models['openai'] = ModelConfig(
                name='gpt-3.5-turbo',  # Cost-optimized model
                available=is_openai_available,
                api_key=openai_key,
                endpoint='https://api.openai.com/v1/chat/completions',
                headers={
                    'Authorization': f'Bearer {openai_key}',
                    'Content-Type': 'application/json'
                },
                max_tokens=2048,
                temperature=0.3
            )
        
        # Gemini Configuration - TERTIARY (check quota)
        gemini_key = os.getenv('GEMINI_API_KEY')
        if gemini_key:
            # Check if Gemini is rate limited
            is_rate_limited = self._check_gemini_status(gemini_key)
            models['gemini'] = ModelConfig(
                name='gemini-pro',
                available=not is_rate_limited,
                api_key=gemini_key,
                endpoint='https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent',
                headers={
                    'Content-Type': 'application/json'
                },
                max_tokens=2048,
                temperature=0.3
            )
        
        # Claude Configuration - FALLBACK (usually placeholder key)
        claude_key = os.getenv('CLAUDE_API_KEY', os.getenv('ANTHROPIC_API_KEY'))
        if claude_key and not claude_key.startswith('placeholder'):
            models['claude'] = ModelConfig(
                name='claude-3-sonnet',
                available=True,
                api_key=claude_key,
                endpoint='https://api.anthropic.com/v1/messages',
                headers={
                    'x-api-key': claude_key,
                    'anthropic-version': '2023-06-01',
                    'content-type': 'application/json'
                },
                max_tokens=4096,
                temperature=0.3
            )
        
        return models
    
    def _check_perplexity_status(self, api_key: str) -> bool:
        """Check if Perplexity API is working."""
        try:
            # Test Perplexity with a simple query
            url = "https://api.perplexity.ai/chat/completions"
            headers = {
                'Authorization': f'Bearer {api_key}',
                'Content-Type': 'application/json'
            }
            payload = {
                "model": "sonar",
                "messages": [{"role": "user", "content": "Test"}],
                "temperature": 0.1,
                "max_tokens": 50
            }
            
            response = requests.post(url, headers=headers, json=payload, timeout=10)
            is_working = response.status_code == 200
            
            if is_working:
                logger.info("Perplexity API is available and working")
            else:
                logger.warning(f"Perplexity API test failed: {response.status_code}")
            
            return is_working
        except Exception as e:
            logger.warning(f"Perplexity API test failed: {e}")
            return False
    
    def _check_openai_quota(self, api_key: str) -> bool:
        """Check if OpenAI API has available quota."""
        try:
            # Quick test call to check quota
            url = "https://api.openai.com/v1/chat/completions"
            headers = {
                'Authorization': f'Bearer {api_key}',
                'Content-Type': 'application/json'
            }
            payload = {
                "model": "gpt-3.5-turbo",
                "messages": [{"role": "user", "content": "Test"}],
                "max_tokens": 10
            }
            
            response = requests.post(url, headers=headers, json=payload, timeout=10)
            
            if response.status_code == 429:
                logger.warning("OpenAI API quota exceeded")
                return False
            elif response.status_code == 200:
                logger.info("OpenAI API is available")
                return True
            else:
                logger.warning(f"OpenAI API test failed: {response.status_code}")
                return False
                
        except Exception as e:
            logger.warning(f"OpenAI API test failed: {e}")
            return False
    
    def _check_gemini_status(self, api_key: str) -> bool:
        """Check if Gemini API is rate limited."""
        try:
            # Quick test call to check quota
            test_url = f"https://generativelanguage.googleapis.com/v1beta/models?key={api_key}"
            response = requests.get(test_url, timeout=5)
            if response.status_code == 429:
                logger.warning("Gemini API is rate limited")
                return True
            return False
        except:
            return False
    
    async def analyze_with_claude(self, query: str, ward: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """Execute strategic analysis using Claude."""
        if 'claude' not in self.models or not self.models['claude'].available:
            return {"error": "Claude not available", "fallback": True}
        
        try:
            config = self.models['claude']
            
            prompt = f"""You are a political strategist analyzing {ward} ward in Hyderabad.

Query: {query}
Context: {json.dumps(context, indent=2) if context else 'No additional context'}

Provide strategic analysis focusing on:
1. Current political landscape and sentiment
2. Key opportunities and threats
3. Actionable recommendations
4. Evidence-based insights

Format your response as structured JSON with keys:
- strategic_summary
- key_findings
- opportunities
- threats
- recommended_actions
- confidence_score (0-1)"""

            payload = {
                "model": "claude-3-sonnet-20240229",
                "messages": [
                    {"role": "user", "content": prompt}
                ],
                "max_tokens": config.max_tokens,
                "temperature": config.temperature
            }
            
            response = requests.post(
                config.endpoint,
                headers=config.headers,
                json=payload,
                timeout=60
            )
            
            if response.status_code == 200:
                data = response.json()
                content = data['content'][0]['text']
                
                # Try to parse as JSON, fallback to text
                try:
                    result = json.loads(content)
                except:
                    result = {
                        "strategic_summary": content,
                        "confidence_score": 0.75
                    }
                
                result.update({
                    "model": "claude",
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "status": "success"
                })
                return result
            else:
                logger.error(f"Claude API error: {response.status_code} - {response.text}")
                return {"error": f"Claude API error: {response.status_code}", "fallback": True}
                
        except Exception as e:
            logger.error(f"Claude analysis failed: {e}")
            return {"error": str(e), "model": "claude", "fallback": True}
    
    async def analyze_with_openai(self, query: str, ward: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """Execute strategic analysis using OpenAI/ChatGPT."""
        if 'openai' not in self.models or not self.models['openai'].available:
            return {"error": "OpenAI not available", "fallback": True}
        
        try:
            config = self.models['openai']
            
            prompt = f"""As a political strategist, analyze {ward} ward in Hyderabad.

Query: {query}
Context: {json.dumps(context, indent=2) if context else 'No additional context'}

Provide comprehensive strategic analysis in JSON format with:
- strategic_summary: Key strategic insights
- key_findings: Evidence-based findings
- opportunities: Political opportunities
- threats: Potential threats
- recommended_actions: Specific actionable recommendations
- confidence_score: Confidence level (0-1)"""

            payload = {
                "model": "gpt-4-turbo-preview",
                "messages": [
                    {"role": "system", "content": "You are a political strategist providing evidence-based analysis for Indian electoral politics."},
                    {"role": "user", "content": prompt}
                ],
                "max_tokens": config.max_tokens,
                "temperature": config.temperature,
                "response_format": {"type": "json_object"}
            }
            
            response = requests.post(
                config.endpoint,
                headers=config.headers,
                json=payload,
                timeout=60
            )
            
            if response.status_code == 200:
                data = response.json()
                result = json.loads(data['choices'][0]['message']['content'])
                result.update({
                    "model": "openai-gpt4",
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "status": "success"
                })
                return result
            else:
                logger.error(f"OpenAI API error: {response.status_code}")
                return {"error": f"OpenAI API error: {response.status_code}", "fallback": True}
                
        except Exception as e:
            logger.error(f"OpenAI analysis failed: {e}")
            return {"error": str(e), "model": "openai", "fallback": True}
    
    async def analyze_with_gemini(self, query: str, ward: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """Execute strategic analysis using Gemini."""
        if 'gemini' not in self.models or not self.models['gemini'].available:
            return {"error": "Gemini not available", "fallback": True}
        
        try:
            config = self.models['gemini']
            
            prompt = f"""You are a political strategist analyzing {ward} ward in Hyderabad.

Query: {query}
Context: {json.dumps(context, indent=2) if context else 'No additional context'}

Provide strategic analysis focusing on:
1. Current political landscape and sentiment
2. Key opportunities and threats  
3. Actionable recommendations
4. Evidence-based insights

Format your response with clear sections for strategic summary, key findings, opportunities, threats, and recommended actions."""

            url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key={config.api_key}"
            payload = {
                "contents": [{
                    "parts": [{"text": prompt}]
                }],
                "generationConfig": {
                    "temperature": config.temperature,
                    "maxOutputTokens": config.max_tokens
                }
            }
            
            response = requests.post(url, json=payload, timeout=60)
            
            if response.status_code == 200:
                data = response.json()
                if 'candidates' in data and len(data['candidates']) > 0:
                    content = data['candidates'][0]['content']['parts'][0]['text']
                    
                    return {
                        "strategic_summary": content[:300],
                        "intelligence": content,
                        "model": "gemini",
                        "timestamp": datetime.now(timezone.utc).isoformat(),
                        "status": "success",
                        "confidence_score": 0.75
                    }
                else:
                    return {"error": "Gemini returned no content", "fallback": True}
            else:
                logger.error(f"Gemini API error: {response.status_code}")
                return {"error": f"Gemini API error: {response.status_code}", "fallback": True}
                
        except Exception as e:
            logger.error(f"Gemini analysis failed: {e}")
            return {"error": str(e), "model": "gemini", "fallback": True}
    
    async def analyze_with_perplexity(self, query: str, ward: str) -> Dict[str, Any]:
        """Execute comprehensive political strategic analysis using Perplexity API."""
        if 'perplexity' not in self.models or not self.models['perplexity'].available:
            return {"error": "Perplexity not available", "fallback": True}
        
        try:
            config = self.models['perplexity']
            
            # Enhanced strategic prompt for comprehensive political analysis
            strategic_prompt = f"""
            You are a political strategist analyzing {ward} ward in Hyderabad for campaign intelligence.
            
            Analysis Query: {query}
            
            Provide a comprehensive strategic analysis in the following structured format:
            
            1. STRATEGIC SUMMARY (2-3 sentences)
            2. KEY POLITICAL FINDINGS (3-4 bullet points)
            3. OPPORTUNITIES (2-3 strategic opportunities)
            4. THREATS (2-3 potential threats)
            5. RECOMMENDED ACTIONS (3-4 specific actionable recommendations with timelines)
            
            Focus on:
            - Recent political developments in {ward} and Hyderabad
            - Current sentiment and public opinion
            - Opposition activities and weaknesses
            - Local issues and concerns
            - Electoral dynamics and voting patterns
            - Media coverage and narrative opportunities
            
            Provide factual, evidence-based insights with credible sources where possible.
            Be specific about {ward} ward context within Hyderabad's political landscape.
            """
            
            payload = {
                "model": "sonar",  # Correct model name
                "messages": [
                    {
                        "role": "system",
                        "content": "You are an expert political strategist and intelligence analyst specialized in Indian electoral politics, particularly Hyderabad and Telangana state. Provide comprehensive, actionable strategic analysis based on current information and trends."
                    },
                    {
                        "role": "user",
                        "content": strategic_prompt
                    }
                ],
                "temperature": config.temperature,
                "max_tokens": config.max_tokens
            }
            
            response = requests.post(
                config.endpoint,
                headers=config.headers,
                json=payload,
                timeout=60
            )
            
            if response.status_code == 200:
                data = response.json()
                content = data['choices'][0]['message']['content']
                
                # Parse the structured response into organized sections
                parsed_analysis = self._parse_perplexity_analysis(content)
                
                return {
                    "strategic_summary": parsed_analysis.get('strategic_summary', content[:200]),
                    "key_findings": parsed_analysis.get('key_findings', []),
                    "opportunities": parsed_analysis.get('opportunities', []),
                    "threats": parsed_analysis.get('threats', []),
                    "recommended_actions": parsed_analysis.get('recommended_actions', []),
                    "intelligence": content,  # Full raw analysis
                    "model": "perplexity",
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "real_time": True,
                    "status": "success",
                    "confidence_score": 0.85,  # High confidence for real-time intelligence
                    "ai_powered": True  # Mark as AI-powered for frontend
                }
            else:
                logger.error(f"Perplexity API error: {response.status_code} - {response.text[:200]}")
                return {"error": f"Perplexity API error: {response.status_code}", "fallback": True}
                
        except Exception as e:
            logger.error(f"Perplexity analysis failed: {e}")
            return {"error": str(e), "model": "perplexity", "fallback": True}
    
    def _parse_perplexity_analysis(self, content: str) -> Dict[str, Any]:
        """Parse structured Perplexity analysis into organized sections."""
        parsed = {}
        
        try:
            # Extract strategic summary
            if "STRATEGIC SUMMARY" in content:
                start = content.find("STRATEGIC SUMMARY")
                end = content.find("KEY POLITICAL FINDINGS", start)
                if end == -1:
                    end = content.find("2.", start)
                if end != -1:
                    parsed['strategic_summary'] = content[start:end].replace("STRATEGIC SUMMARY", "").strip()
            
            # Extract key findings
            findings = []
            if "KEY POLITICAL FINDINGS" in content or "KEY FINDINGS" in content:
                section = content[content.find("KEY"):content.find("OPPORTUNITIES") if "OPPORTUNITIES" in content else len(content)]
                for line in section.split('\n'):
                    if line.strip().startswith(('•', '-', '*')) or (line.strip() and line.strip()[0].isdigit()):
                        findings.append(line.strip().lstrip('•-*0123456789. '))
            parsed['key_findings'] = findings[:4]
            
            # Extract opportunities
            opportunities = []
            if "OPPORTUNITIES" in content:
                section = content[content.find("OPPORTUNITIES"):content.find("THREATS") if "THREATS" in content else len(content)]
                for line in section.split('\n'):
                    if line.strip().startswith(('•', '-', '*')) or (line.strip() and line.strip()[0].isdigit()):
                        opportunities.append(line.strip().lstrip('•-*0123456789. '))
            parsed['opportunities'] = opportunities[:3]
            
            # Extract threats
            threats = []
            if "THREATS" in content:
                section = content[content.find("THREATS"):content.find("RECOMMENDED ACTIONS") if "RECOMMENDED ACTIONS" in content else len(content)]
                for line in section.split('\n'):
                    if line.strip().startswith(('•', '-', '*')) or (line.strip() and line.strip()[0].isdigit()):
                        threats.append(line.strip().lstrip('•-*0123456789. '))
            parsed['threats'] = threats[:3]
            
            # Extract recommended actions
            actions = []
            if "RECOMMENDED ACTIONS" in content:
                section = content[content.find("RECOMMENDED ACTIONS"):]
                for line in section.split('\n'):
                    if line.strip().startswith(('•', '-', '*')) or (line.strip() and line.strip()[0].isdigit()):
                        action_text = line.strip().lstrip('•-*0123456789. ')
                        if len(action_text) > 10:  # Filter out short/empty lines
                            actions.append({
                                "action": action_text,
                                "priority": "high" if "immediate" in action_text.lower() or "urgent" in action_text.lower() else "medium",
                                "timeline": "immediate" if "immediate" in action_text.lower() else "1-2 weeks"
                            })
            parsed['recommended_actions'] = actions[:4]
            
        except Exception as e:
            logger.warning(f"Error parsing Perplexity analysis: {e}")
        
        return parsed
    
    async def coordinate_analysis(
        self, 
        query: str, 
        ward: str, 
        depth: str = "standard",
        context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Coordinate analysis across all available models.
        
        NEW Priority order (based on availability):
        1. Perplexity (primary - real-time intelligence)
        2. OpenAI/ChatGPT (if quota available)
        3. Gemini (if not rate limited)
        4. Claude (if properly configured)
        """
        results = {}
        
        # Execute available models in priority order
        tasks = []
        
        # Priority 1: Perplexity (primary service for real-time intelligence)
        if 'perplexity' in self.models and self.models['perplexity'].available:
            tasks.append(('perplexity', self.analyze_with_perplexity(query, ward)))
        
        # Priority 2: OpenAI (if quota available)
        if 'openai' in self.models and self.models['openai'].available:
            tasks.append(('openai', self.analyze_with_openai(query, ward, context or {})))
        
        # Priority 3: Gemini (if not rate limited)
        if 'gemini' in self.models and self.models['gemini'].available:
            tasks.append(('gemini', self.analyze_with_gemini(query, ward, context or {})))
        
        # Priority 4: Claude (if available)
        if 'claude' in self.models and self.models['claude'].available:
            tasks.append(('claude', self.analyze_with_claude(query, ward, context or {})))
        
        if not tasks:
            logger.warning("No AI models available, using fallback")
            return self._generate_fallback_response(query, ward)
        
        # Execute all tasks in parallel
        task_results = await asyncio.gather(*[task for _, task in tasks], return_exceptions=True)
        
        # Process results
        for i, (model_name, _) in enumerate(tasks):
            if isinstance(task_results[i], Exception):
                logger.error(f"{model_name} failed: {task_results[i]}")
                results[model_name] = {"error": str(task_results[i]), "fallback": True}
            else:
                results[model_name] = task_results[i]
        
        # Synthesize results from all models
        return self._synthesize_multi_model_results(results, query, ward)
    
    def _synthesize_multi_model_results(
        self, 
        results: Dict[str, Dict[str, Any]], 
        query: str, 
        ward: str
    ) -> Dict[str, Any]:
        """Synthesize results from multiple AI models into a unified response."""
        
        # NEW Priority order: Perplexity > OpenAI > Gemini > Claude
        primary_analysis = None
        for model in ['perplexity', 'openai', 'gemini', 'claude']:
            if model in results and not results[model].get('fallback'):
                primary_analysis = results[model]
                logger.info(f"Using {model} as primary analysis engine")
                break
        
        if not primary_analysis:
            logger.warning("No working AI models found, using fallback")
            return self._generate_fallback_response(query, ward)
        
        # Get additional intelligence from other working models
        supplementary_intel = []
        for model_name, result in results.items():
            if model_name != primary_analysis.get('model') and not result.get('fallback'):
                if 'intelligence' in result:
                    supplementary_intel.append(f"Additional insight from {model_name}: {result['intelligence'][:100]}...")
        
        # Combine insights with Perplexity-first approach
        synthesized = {
            "ward": ward,
            "query": query,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "status": "analysis_complete",
            "model_used": primary_analysis.get('model', 'multi-model'),
            "models_consulted": [m for m in results.keys() if not results[m].get('fallback')],
            "strategic_summary": primary_analysis.get('strategic_summary', primary_analysis.get('intelligence', '')[:300]),
            "key_findings": primary_analysis.get('key_findings', self._extract_findings_from_text(primary_analysis.get('intelligence', ''))),
            "opportunities": primary_analysis.get('opportunities', self._extract_opportunities_from_text(primary_analysis.get('intelligence', ''))),
            "threats": primary_analysis.get('threats', self._extract_threats_from_text(primary_analysis.get('intelligence', ''))),
            "recommended_actions": primary_analysis.get('recommended_actions', self._extract_actions_from_text(primary_analysis.get('intelligence', ''))),
            "confidence_score": primary_analysis.get('confidence_score', 0.8),
            "real_time_intelligence": primary_analysis.get('intelligence', ''),
            "multi_model_consensus": self._calculate_consensus(results),
            "supplementary_intelligence": supplementary_intel,
            "fallback_mode": False,  # Explicitly mark as not in fallback mode
            "ai_powered": True,  # Mark as AI-powered for frontend detection
            "provider": f"{primary_analysis.get('model', 'unknown')}_intelligence_engine"
        }
        
        return synthesized
    
    def _extract_findings_from_text(self, text: str) -> List[str]:
        """Extract key findings from unstructured text."""
        findings = []
        if not text:
            return findings
            
        # Look for numbered or bulleted lists
        lines = text.split('\n')
        for line in lines:
            line = line.strip()
            if line.startswith(('•', '-', '*', '1.', '2.', '3.', '4.')):
                finding = line.lstrip('•-*0123456789. ')
                if len(finding) > 15:  # Filter meaningful findings
                    findings.append(finding)
                    
        # If no structured findings, extract key sentences
        if not findings:
            sentences = text.split('. ')
            for sentence in sentences[:4]:
                if len(sentence.strip()) > 30:
                    findings.append(sentence.strip() + '.')
                    
        return findings[:4]
    
    def _extract_opportunities_from_text(self, text: str) -> List[str]:
        """Extract opportunities from unstructured text."""
        opportunities = []
        
        # Look for opportunity keywords
        opportunity_indicators = ['opportunity', 'advantage', 'leverage', 'capitalize', 'benefit']
        lines = text.split('\n')
        
        for line in lines:
            line_lower = line.lower()
            if any(indicator in line_lower for indicator in opportunity_indicators):
                clean_line = line.strip().lstrip('•-*0123456789. ')
                if len(clean_line) > 15:
                    opportunities.append(clean_line)
                    
        return opportunities[:3]
    
    def _extract_threats_from_text(self, text: str) -> List[str]:
        """Extract threats from unstructured text."""
        threats = []
        
        # Look for threat keywords
        threat_indicators = ['threat', 'risk', 'challenge', 'opposition', 'concern', 'weakness']
        lines = text.split('\n')
        
        for line in lines:
            line_lower = line.lower()
            if any(indicator in line_lower for indicator in threat_indicators):
                clean_line = line.strip().lstrip('•-*0123456789. ')
                if len(clean_line) > 15:
                    threats.append(clean_line)
                    
        return threats[:3]
    
    def _extract_actions_from_text(self, text: str) -> List[Dict[str, str]]:
        """Extract recommended actions from unstructured text."""
        actions = []
        
        # Look for action keywords
        action_indicators = ['recommend', 'should', 'must', 'action', 'strategy', 'plan']
        lines = text.split('\n')
        
        for line in lines:
            line_lower = line.lower()
            if any(indicator in line_lower for indicator in action_indicators):
                clean_line = line.strip().lstrip('•-*0123456789. ')
                if len(clean_line) > 20:
                    actions.append({
                        "action": clean_line,
                        "priority": "high" if "urgent" in line_lower else "medium",
                        "timeline": "immediate" if "immediate" in line_lower else "1-2 weeks"
                    })
                    
        return actions[:4]
    
    def _calculate_consensus(self, results: Dict[str, Dict[str, Any]]) -> float:
        """Calculate consensus score across multiple models."""
        valid_scores = [
            r.get('confidence_score', 0.5) 
            for r in results.values() 
            if not r.get('fallback')
        ]
        
        if not valid_scores:
            return 0.0
        
        return sum(valid_scores) / len(valid_scores)
    
    def _generate_fallback_response(self, query: str, ward: str) -> Dict[str, Any]:
        """Generate fallback response when no AI models are available."""
        return {
            "ward": ward,
            "query": query,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "status": "fallback_mode",
            "fallback_mode": True,  # Explicitly mark as fallback mode
            "fallback_notice": "AI services temporarily unavailable. Using template-based analysis.",
            "strategic_summary": f"Analysis for {ward}: {query}",
            "key_findings": [
                "Monitor local sentiment trends",
                "Track opposition activities",
                "Identify emerging issues"
            ],
            "recommended_actions": [
                {
                    "action": "Conduct ground-level assessment",
                    "priority": "high",
                    "timeline": "immediate"
                }
            ],
            "confidence_score": 0.3
        }