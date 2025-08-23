"""
Quality Validation Service for Multi-Model AI Responses

Provides comprehensive quality assessment for AI-generated content including
political intelligence reports, analysis responses, and strategic recommendations.
"""

import logging
import re
from typing import Dict, List, Optional, Any, Tuple
from datetime import datetime, timezone

logger = logging.getLogger(__name__)


class QualityValidator:
    """
    Comprehensive quality validation for AI-generated political intelligence.
    
    Features:
    - Content quality assessment across multiple dimensions
    - Political relevance and accuracy scoring
    - Source credibility validation
    - Bias detection and balance analysis
    - Completeness and structure evaluation
    """
    
    def __init__(self):
        # Quality assessment weights
        self.weights = {
            "content_quality": 0.25,      # Structure, clarity, depth
            "political_relevance": 0.25,  # Relevance to political analysis
            "factual_accuracy": 0.20,     # Source quality and fact checking
            "balance_objectivity": 0.15,  # Bias detection and balance
            "completeness": 0.15          # Coverage and comprehensiveness
        }
        
        # Political terms for relevance assessment
        self.political_terms = [
            "party", "election", "candidate", "voter", "campaign", "constituency",
            "bjp", "congress", "brs", "aimim", "governance", "policy", "mandate",
            "coalition", "alliance", "opposition", "incumbent", "ballot", "polling",
            "ward", "assembly", "parliament", "municipality", "panchayat", "civic"
        ]
        
        # Bias indicators
        self.bias_indicators = {
            "positive_bias": [
                "excellent", "outstanding", "brilliant", "perfect", "amazing",
                "revolutionary", "historic", "unprecedented", "phenomenal"
            ],
            "negative_bias": [
                "terrible", "disastrous", "catastrophic", "horrible", "awful",
                "devastating", "ruinous", "shameful", "pathetic", "disgusting"
            ],
            "partisan_language": [
                "anti-national", "traitor", "corrupt", "criminal", "dynasty",
                "communal", "fascist", "dictator", "puppet", "stooge"
            ]
        }
        
        # Quality structure indicators
        self.structure_indicators = [
            "executive summary", "key findings", "analysis", "implications",
            "recommendations", "conclusion", "sources", "methodology"
        ]

    async def assess_response(self, query: str, response_content: str, 
                            context: Dict[str, Any] = None) -> float:
        """
        Assess overall quality of AI response.
        
        Args:
            query: Original query/question
            response_content: AI-generated response
            context: Additional context for assessment
            
        Returns:
            Quality score from 0.0 to 1.0
        """
        
        try:
            # Individual quality assessments
            content_score = self._assess_content_quality(response_content, query)
            relevance_score = self._assess_political_relevance(response_content, query, context)
            accuracy_score = self._assess_factual_accuracy(response_content)
            balance_score = self._assess_balance_objectivity(response_content)
            completeness_score = self._assess_completeness(response_content, query, context)
            
            # Weighted overall score
            overall_score = (
                content_score * self.weights["content_quality"] +
                relevance_score * self.weights["political_relevance"] +
                accuracy_score * self.weights["factual_accuracy"] +
                balance_score * self.weights["balance_objectivity"] +
                completeness_score * self.weights["completeness"]
            )
            
            logger.debug(f"Quality assessment: content={content_score:.2f}, "
                        f"relevance={relevance_score:.2f}, accuracy={accuracy_score:.2f}, "
                        f"balance={balance_score:.2f}, completeness={completeness_score:.2f}, "
                        f"overall={overall_score:.2f}")
            
            return min(1.0, max(0.0, overall_score))
            
        except Exception as e:
            logger.error(f"Quality assessment error: {e}")
            return 0.5  # Default moderate score on error

    def _assess_content_quality(self, content: str, query: str) -> float:
        """Assess content structure, clarity, and depth."""
        
        score = 0.0
        
        # Length assessment (0.0-0.3)
        word_count = len(content.split())
        if word_count >= 300:
            score += 0.3
        elif word_count >= 150:
            score += 0.2
        elif word_count >= 75:
            score += 0.1
        
        # Structure assessment (0.0-0.3)
        structure_count = sum(1 for indicator in self.structure_indicators 
                            if indicator.lower() in content.lower())
        score += min(0.3, structure_count * 0.06)
        
        # Clarity indicators (0.0-0.2)
        clarity_indicators = [
            content.count('.') > 5,  # Multiple sentences
            content.count('\n') > 3,  # Paragraph structure
            len(re.findall(r'\b\d+\b', content)) > 0,  # Data/numbers present
            any(word in content.lower() for word in ['therefore', 'however', 'moreover', 'furthermore'])
        ]
        score += len([i for i in clarity_indicators if i]) * 0.05
        
        # Depth indicators (0.0-0.2)
        depth_words = [
            'analysis', 'implications', 'consequences', 'factors', 'aspects',
            'perspective', 'context', 'background', 'underlying', 'mechanism'
        ]
        depth_count = sum(1 for word in depth_words if word in content.lower())
        score += min(0.2, depth_count * 0.03)
        
        return min(1.0, score)

    def _assess_political_relevance(self, content: str, query: str, 
                                  context: Dict[str, Any] = None) -> float:
        """Assess relevance to political analysis and context."""
        
        score = 0.0
        content_lower = content.lower()
        query_lower = query.lower()
        
        # Political terminology usage (0.0-0.4)
        political_term_count = sum(1 for term in self.political_terms 
                                 if term in content_lower)
        score += min(0.4, political_term_count * 0.04)
        
        # Query relevance (0.0-0.3)
        query_words = set(query_lower.split())
        content_words = set(content_lower.split())
        overlap = len(query_words.intersection(content_words))
        overlap_ratio = overlap / len(query_words) if query_words else 0
        score += overlap_ratio * 0.3
        
        # Context relevance (0.0-0.2)
        if context:
            if context.get('ward_context'):
                ward = context['ward_context'].lower()
                if ward in content_lower:
                    score += 0.1
            
            if context.get('region_context'):
                region = context['region_context'].lower()
                if region in content_lower:
                    score += 0.05
            
            # Strategic context alignment
            strategic_indicators = {
                'defensive': ['risk', 'threat', 'protect', 'defend', 'mitigate'],
                'offensive': ['opportunity', 'advantage', 'expand', 'capture', 'growth'],
                'neutral': ['balance', 'assess', 'evaluate', 'consider', 'analyze']
            }
            
            strategy = context.get('strategic_context', 'neutral')
            if strategy in strategic_indicators:
                indicator_count = sum(1 for indicator in strategic_indicators[strategy]
                                    if indicator in content_lower)
                score += min(0.05, indicator_count * 0.01)
        
        # Indian political context (0.0-0.1)
        indian_terms = ['india', 'indian', 'hyderabad', 'telangana', 'ghmc', 'lok sabha', 'assembly']
        indian_count = sum(1 for term in indian_terms if term in content_lower)
        score += min(0.1, indian_count * 0.02)
        
        return min(1.0, score)

    def _assess_factual_accuracy(self, content: str) -> float:
        """Assess factual accuracy indicators and source quality."""
        
        score = 0.6  # Base score for coherent content
        
        # Source citation indicators (0.0-0.2)
        citation_patterns = [
            r'according to', r'source:', r'reported by', r'data shows',
            r'survey indicates', r'poll suggests', r'research reveals'
        ]
        citation_count = sum(1 for pattern in citation_patterns 
                           if re.search(pattern, content, re.IGNORECASE))
        score += min(0.2, citation_count * 0.04)
        
        # Specific data/numbers (0.0-0.1)
        number_patterns = r'\b\d+(?:\.\d+)?%?\b'
        number_count = len(re.findall(number_patterns, content))
        score += min(0.1, number_count * 0.01)
        
        # Uncertainty acknowledgment (0.0-0.1)
        uncertainty_indicators = [
            'likely', 'probably', 'appears', 'suggests', 'indicates',
            'uncertain', 'unclear', 'estimated', 'approximately'
        ]
        uncertainty_count = sum(1 for indicator in uncertainty_indicators 
                              if indicator in content.lower())
        score += min(0.1, uncertainty_count * 0.02)
        
        return min(1.0, score)

    def _assess_balance_objectivity(self, content: str) -> float:
        """Assess balance, objectivity, and bias detection."""
        
        score = 0.7  # Base score for balanced content
        content_lower = content.lower()
        
        # Bias detection penalties
        positive_bias_count = sum(1 for term in self.bias_indicators["positive_bias"]
                                if term in content_lower)
        negative_bias_count = sum(1 for term in self.bias_indicators["negative_bias"]
                                if term in content_lower)
        partisan_count = sum(1 for term in self.bias_indicators["partisan_language"]
                           if term in content_lower)
        
        # Penalize excessive bias
        total_bias = positive_bias_count + negative_bias_count + (partisan_count * 2)
        bias_penalty = min(0.3, total_bias * 0.05)
        score -= bias_penalty
        
        # Reward balanced perspective indicators (0.0-0.2)
        balance_indicators = [
            'however', 'on the other hand', 'alternatively', 'conversely',
            'despite', 'although', 'while', 'nevertheless', 'both sides'
        ]
        balance_count = sum(1 for indicator in balance_indicators 
                          if indicator in content_lower)
        score += min(0.2, balance_count * 0.04)
        
        # Multiple viewpoint indicators (0.0-0.1)
        viewpoint_indicators = [
            'perspective', 'viewpoint', 'opinion', 'argues', 'contends',
            'believes', 'suggests', 'proposes', 'critics', 'supporters'
        ]
        viewpoint_count = sum(1 for indicator in viewpoint_indicators 
                            if indicator in content_lower)
        score += min(0.1, viewpoint_count * 0.02)
        
        return min(1.0, max(0.0, score))

    def _assess_completeness(self, content: str, query: str, 
                           context: Dict[str, Any] = None) -> float:
        """Assess completeness and comprehensiveness of response."""
        
        score = 0.0
        
        # Query coverage assessment (0.0-0.4)
        query_keywords = self._extract_keywords(query)
        content_lower = content.lower()
        
        covered_keywords = sum(1 for keyword in query_keywords 
                             if keyword.lower() in content_lower)
        if query_keywords:
            coverage_ratio = covered_keywords / len(query_keywords)
            score += coverage_ratio * 0.4
        
        # Expected sections for political analysis (0.0-0.3)
        expected_sections = [
            'current situation', 'key players', 'implications', 'recommendations',
            'background', 'context', 'analysis', 'assessment'
        ]
        present_sections = sum(1 for section in expected_sections 
                             if any(word in section.split() for word in content_lower.split()))
        score += min(0.3, present_sections * 0.05)
        
        # Depth indicators (0.0-0.2)
        if context and context.get('analysis_depth'):
            depth = context['analysis_depth']
            min_length = {'quick': 100, 'standard': 200, 'deep': 400}
            actual_length = len(content.split())
            expected_length = min_length.get(depth, 200)
            
            if actual_length >= expected_length:
                score += 0.2
            elif actual_length >= expected_length * 0.7:
                score += 0.15
            elif actual_length >= expected_length * 0.5:
                score += 0.1
        
        # Actionability for strategic content (0.0-0.1)
        actionable_indicators = [
            'recommend', 'suggest', 'should', 'could', 'action',
            'step', 'strategy', 'approach', 'plan', 'implement'
        ]
        actionable_count = sum(1 for indicator in actionable_indicators 
                             if indicator in content_lower)
        score += min(0.1, actionable_count * 0.02)
        
        return min(1.0, score)

    def _extract_keywords(self, text: str) -> List[str]:
        """Extract meaningful keywords from text."""
        
        # Simple keyword extraction
        words = re.findall(r'\b\w+\b', text.lower())
        
        # Filter out common stop words
        stop_words = {
            'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to',
            'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be',
            'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will',
            'would', 'could', 'should', 'may', 'might', 'can', 'what',
            'how', 'when', 'where', 'why', 'who', 'which', 'this', 'that'
        }
        
        keywords = [word for word in words if len(word) > 3 and word not in stop_words]
        return list(set(keywords))  # Remove duplicates

    async def validate_report_structure(self, report_content: str) -> Dict[str, Any]:
        """Validate report structure and provide improvement suggestions."""
        
        validation_results = {
            "has_executive_summary": False,
            "has_analysis_section": False,
            "has_recommendations": False,
            "has_source_citations": False,
            "section_count": 0,
            "word_count": 0,
            "issues": [],
            "suggestions": [],
            "structure_score": 0.0
        }
        
        try:
            content_lower = report_content.lower()
            sections = content_lower.split('\n')
            
            # Count words
            validation_results["word_count"] = len(report_content.split())
            
            # Check for key sections
            if any('executive' in section and 'summary' in section for section in sections):
                validation_results["has_executive_summary"] = True
            
            if any('analysis' in section or 'assessment' in section for section in sections):
                validation_results["has_analysis_section"] = True
            
            if any('recommend' in section or 'suggestion' in section for section in sections):
                validation_results["has_recommendations"] = True
            
            if any('source' in section or 'citation' in section or 'according to' in content_lower for section in sections):
                validation_results["has_source_citations"] = True
            
            # Count meaningful sections
            section_headers = [s for s in sections if s.strip() and len(s.split()) <= 5]
            validation_results["section_count"] = len(section_headers)
            
            # Generate structure score
            structure_score = 0.0
            if validation_results["has_executive_summary"]:
                structure_score += 0.25
            if validation_results["has_analysis_section"]:
                structure_score += 0.25
            if validation_results["has_recommendations"]:
                structure_score += 0.25
            if validation_results["has_source_citations"]:
                structure_score += 0.25
            
            validation_results["structure_score"] = structure_score
            
            # Generate issues and suggestions
            if not validation_results["has_executive_summary"]:
                validation_results["issues"].append("Missing executive summary")
                validation_results["suggestions"].append("Add executive summary at the beginning")
            
            if not validation_results["has_analysis_section"]:
                validation_results["issues"].append("Missing analysis section")
                validation_results["suggestions"].append("Include detailed analysis section")
            
            if not validation_results["has_recommendations"]:
                validation_results["issues"].append("Missing recommendations")
                validation_results["suggestions"].append("Add actionable recommendations")
            
            if not validation_results["has_source_citations"]:
                validation_results["issues"].append("Missing source citations")
                validation_results["suggestions"].append("Include source citations for credibility")
            
            if validation_results["word_count"] < 200:
                validation_results["issues"].append("Report too brief")
                validation_results["suggestions"].append("Expand analysis with more detail")
            
            return validation_results
            
        except Exception as e:
            logger.error(f"Report structure validation error: {e}")
            validation_results["issues"].append(f"Validation error: {str(e)}")
            return validation_results

    async def assess_political_bias(self, content: str) -> Dict[str, Any]:
        """Comprehensive political bias assessment."""
        
        bias_assessment = {
            "overall_bias_score": 0.5,  # 0.0 = heavily biased, 1.0 = completely neutral
            "partisan_language_detected": False,
            "emotional_language_score": 0.5,
            "balance_indicators": 0,
            "bias_warnings": [],
            "neutrality_strengths": []
        }
        
        try:
            content_lower = content.lower()
            
            # Check for partisan language
            partisan_count = sum(1 for term in self.bias_indicators["partisan_language"]
                               if term in content_lower)
            
            if partisan_count > 0:
                bias_assessment["partisan_language_detected"] = True
                bias_assessment["bias_warnings"].append(f"Partisan language detected ({partisan_count} instances)")
                bias_assessment["overall_bias_score"] -= partisan_count * 0.1
            
            # Emotional language assessment
            positive_emotional = sum(1 for term in self.bias_indicators["positive_bias"]
                                   if term in content_lower)
            negative_emotional = sum(1 for term in self.bias_indicators["negative_bias"]
                                   if term in content_lower)
            
            total_emotional = positive_emotional + negative_emotional
            if total_emotional > 3:
                bias_assessment["emotional_language_score"] = max(0.0, 0.5 - (total_emotional - 3) * 0.05)
                bias_assessment["bias_warnings"].append("High emotional language usage")
            
            # Balance indicators
            balance_terms = ['however', 'alternatively', 'on the other hand', 'both', 'all sides']
            balance_count = sum(1 for term in balance_terms if term in content_lower)
            bias_assessment["balance_indicators"] = balance_count
            
            if balance_count >= 2:
                bias_assessment["neutrality_strengths"].append("Multiple perspectives presented")
                bias_assessment["overall_bias_score"] += 0.1
            
            # Final score adjustment
            bias_assessment["overall_bias_score"] = min(1.0, max(0.0, bias_assessment["overall_bias_score"]))
            
            return bias_assessment
            
        except Exception as e:
            logger.error(f"Political bias assessment error: {e}")
            bias_assessment["bias_warnings"].append(f"Assessment error: {str(e)}")
            return bias_assessment


# Global quality validator instance
quality_validator = QualityValidator()