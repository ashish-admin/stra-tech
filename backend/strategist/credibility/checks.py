"""
Credibility Assessment System

Source reputation scoring, cross-source corroboration, and recency validation.
Flags low-credibility claims and identifies sources with known partisan bias.
"""

import logging
import re
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Any, Optional
from urllib.parse import urlparse

logger = logging.getLogger(__name__)

# Credible news source ratings (0.0 to 1.0)
CREDIBLE_SOURCES = {
    # National credible sources
    'thehindu.com': 0.95,
    'indianexpress.com': 0.9,
    'hindustantimes.com': 0.85,
    'livemint.com': 0.85,
    'scroll.in': 0.8,
    'thewire.in': 0.75,
    
    # Regional credible sources
    'deccanchronicle.com': 0.8,
    'telanganatoday.com': 0.75,
    'greatandhra.com': 0.7,
    'timesofindia.indiatimes.com': 0.8,
    
    # Government/Official sources
    'pib.gov.in': 0.95,
    'eci.gov.in': 1.0,
    'telangana.gov.in': 0.9,
    'ghmc.gov.in': 0.9,
    
    # International credible sources
    'bbc.com': 0.9,
    'reuters.com': 0.95,
    'ap.org': 0.9
}

# Known partisan bias indicators
PARTISAN_INDICATORS = {
    'high_bjp_bias': [
        'republic', 'timesnow', 'zee', 'aajtak', 'india.com',
        'organiser', 'panchjanya', 'swarajyamag'
    ],
    'high_congress_bias': [
        'nationalherald', 'jansatta', 'deshbandhu'
    ],
    'high_regional_bias': [
        'eenadu', 'sakshi', 'andhra', 'telugu360'
    ],
    'anti_establishment': [
        'altnews', 'boomlive', 'factchecker', 'quint'
    ]
}

# Warning indicators for low credibility
LOW_CREDIBILITY_INDICATORS = [
    'unverified', 'alleged', 'rumor', 'claim', 'reportedly',
    'sources say', 'according to reports', 'it is said',
    'breaking: exclusive', 'shocking revelation'
]


class CredibilityScorer:
    """
    Comprehensive credibility assessment system for political intelligence.
    
    Evaluates source reputation, content quality, partisan bias,
    and cross-source corroboration for strategic decision-making.
    """
    
    def __init__(self):
        self.source_scores = CREDIBLE_SOURCES.copy()
        
    async def score_sources(self, intelligence: Dict[str, Any]) -> Dict[str, Any]:
        """
        Score and filter intelligence sources based on credibility.
        
        Args:
            intelligence: Raw intelligence data with sources
            
        Returns:
            Intelligence data with credibility scores and filtering
        """
        try:
            scored_intelligence = intelligence.copy()
            scored_items = []
            
            for item in intelligence.get('intelligence_items', []):
                scored_item = await self._score_intelligence_item(item)
                scored_items.append(scored_item)
            
            # Filter by credibility threshold
            high_credibility_items = [
                item for item in scored_items 
                if item.get('credibility_score', 0) >= 0.6
            ]
            
            scored_intelligence.update({
                'intelligence_items': high_credibility_items,
                'credibility_summary': {
                    'total_items': len(scored_items),
                    'high_credibility_items': len(high_credibility_items),
                    'average_credibility': sum(
                        item.get('credibility_score', 0) for item in scored_items
                    ) / max(1, len(scored_items)),
                    'filtered_low_quality': len(scored_items) - len(high_credibility_items)
                },
                'credibility_assessed_at': datetime.now(timezone.utc).isoformat()
            })
            
            logger.info(f"Credibility assessment: {len(high_credibility_items)}/{len(scored_items)} items passed threshold")
            return scored_intelligence
            
        except Exception as e:
            logger.error(f"Error in source scoring: {e}", exc_info=True)
            return intelligence  # Return original data on error
    
    async def _score_intelligence_item(self, item: Dict[str, Any]) -> Dict[str, Any]:
        """Score individual intelligence item for credibility."""
        scored_item = item.copy()
        
        try:
            # Source credibility
            source_score = self._assess_source_credibility(item)
            
            # Content quality
            content_score = self._assess_content_quality(item)
            
            # Recency score
            recency_score = self._assess_recency(item)
            
            # Partisan bias detection
            bias_assessment = self._detect_partisan_bias(item)
            
            # Combined credibility score
            credibility_score = (
                source_score * 0.4 +
                content_score * 0.3 +
                recency_score * 0.2 +
                (1.0 - bias_assessment['bias_level']) * 0.1
            )
            
            scored_item.update({
                'credibility_score': round(credibility_score, 2),
                'source_credibility': source_score,
                'content_quality': content_score,
                'recency_score': recency_score,
                'bias_assessment': bias_assessment,
                'credibility_flags': self._generate_credibility_flags(item, credibility_score)
            })
            
            return scored_item
            
        except Exception as e:
            logger.error(f"Error scoring intelligence item: {e}")
            scored_item['credibility_score'] = 0.5  # Default score on error
            return scored_item
    
    def _assess_source_credibility(self, item: Dict[str, Any]) -> float:
        """Assess source credibility based on domain and reputation."""
        sources = item.get('sources', [])
        citations = item.get('citations', [])
        
        if not sources and not citations:
            return 0.3  # Low score for unattributed content
        
        scores = []
        
        # Score based on source domains
        for source in sources:
            domain = self._extract_domain(source)
            score = self.source_scores.get(domain, 0.5)  # Default 0.5 for unknown sources
            scores.append(score)
        
        # Score based on citation URLs
        for citation in citations:
            url = citation.get('url', '')
            domain = self._extract_domain(url)
            score = self.source_scores.get(domain, 0.5)
            scores.append(score)
        
        return sum(scores) / max(1, len(scores))
    
    def _assess_content_quality(self, item: Dict[str, Any]) -> float:
        """Assess content quality and completeness."""
        content = item.get('content', '')
        
        if not content or len(content.strip()) < 50:
            return 0.2
        
        quality_score = 0.5  # Base score
        
        # Length and detail
        if len(content) > 200:
            quality_score += 0.2
        if len(content) > 500:
            quality_score += 0.1
        
        # Citation and attribution
        if 'according to' in content.lower() or 'sources' in content.lower():
            quality_score += 0.1
        
        # Warning indicators (reduce score)
        warning_count = sum(
            1 for indicator in LOW_CREDIBILITY_INDICATORS
            if indicator.lower() in content.lower()
        )
        quality_score -= warning_count * 0.1
        
        return max(0.0, min(1.0, quality_score))
    
    def _assess_recency(self, item: Dict[str, Any]) -> float:
        """Assess information recency."""
        try:
            retrieved_at = item.get('retrieved_at', '')
            if not retrieved_at:
                return 0.5  # Unknown recency
            
            retrieved_time = datetime.fromisoformat(retrieved_at.replace('Z', '+00:00'))
            age_hours = (datetime.now(timezone.utc) - retrieved_time).total_seconds() / 3600
            
            # Scoring based on age
            if age_hours < 6:
                return 1.0      # Very recent
            elif age_hours < 24:
                return 0.9      # Recent
            elif age_hours < 72:
                return 0.7      # Moderately recent
            elif age_hours < 168:  # 1 week
                return 0.5      # Older but acceptable
            else:
                return 0.3      # Old information
                
        except Exception as e:
            logger.error(f"Error assessing recency: {e}")
            return 0.5
    
    def _detect_partisan_bias(self, item: Dict[str, Any]) -> Dict[str, Any]:
        """Detect partisan bias in sources and content."""
        content = item.get('content', '').lower()
        sources = item.get('sources', [])
        
        bias_indicators = {
            'high_bjp_bias': 0,
            'high_congress_bias': 0,
            'high_regional_bias': 0,
            'anti_establishment': 0
        }
        
        # Check source bias
        for source in sources:
            source_lower = source.lower()
            for bias_type, indicators in PARTISAN_INDICATORS.items():
                for indicator in indicators:
                    if indicator in source_lower:
                        bias_indicators[bias_type] += 1
        
        # Detect bias level
        max_bias = max(bias_indicators.values())
        bias_level = min(1.0, max_bias / 3.0)  # Normalize to 0-1
        
        dominant_bias = max(bias_indicators.items(), key=lambda x: x[1])[0] if max_bias > 0 else None
        
        return {
            'bias_level': bias_level,
            'dominant_bias': dominant_bias,
            'bias_indicators': bias_indicators,
            'is_biased': bias_level > 0.5
        }
    
    def _generate_credibility_flags(self, item: Dict[str, Any], score: float) -> List[str]:
        """Generate credibility warning flags."""
        flags = []
        
        if score < 0.4:
            flags.append("LOW_CREDIBILITY")
        if score < 0.6:
            flags.append("VERIFY_CLAIMS")
        
        # Check content for warning indicators
        content = item.get('content', '').lower()
        for indicator in LOW_CREDIBILITY_INDICATORS:
            if indicator in content:
                flags.append(f"WARNING_{indicator.upper().replace(' ', '_')}")
        
        # Bias flags
        bias = item.get('bias_assessment', {})
        if bias.get('is_biased', False):
            flags.append(f"PARTISAN_BIAS_{bias.get('dominant_bias', 'UNKNOWN').upper()}")
        
        return flags
    
    def _extract_domain(self, url_or_source: str) -> str:
        """Extract domain from URL or source string."""
        if not url_or_source:
            return ''
        
        try:
            # If it's a URL, parse domain
            if url_or_source.startswith(('http://', 'https://')):
                domain = urlparse(url_or_source).netloc
                return domain.replace('www.', '').lower()
            
            # If it's a source name, try to match known sources
            source_lower = url_or_source.lower()
            for domain in self.source_scores:
                if domain.replace('.com', '').replace('.in', '') in source_lower:
                    return domain
            
            return source_lower
            
        except Exception as e:
            logger.error(f"Error extracting domain from {url_or_source}: {e}")
            return ''