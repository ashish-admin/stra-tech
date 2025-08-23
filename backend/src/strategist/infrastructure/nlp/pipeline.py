"""
NLP Processing Pipeline

Multilingual sentiment analysis, topic modeling, and political context analysis.
Includes sentiment analysis with political context and opponent mentions.
"""

import os
import json
import logging
import re
from datetime import datetime, timezone
from typing import Dict, List, Any, Optional
from collections import Counter

import google.generativeai as genai

logger = logging.getLogger(__name__)

# Political entities and keywords for context
POLITICAL_PARTIES = {
    'bjp': ['BJP', 'Bharatiya Janata Party', 'lotus', 'saffron'],
    'congress': ['Congress', 'INC', 'hand', 'Rahul Gandhi'],
    'brs': ['BRS', 'TRS', 'KCR', 'KTR', 'car', 'Telangana Rashtra Samithi'],
    'aimim': ['AIMIM', 'MIM', 'Owaisi', 'kite'],
    'aap': ['AAP', 'Aam Aadmi Party', 'broom', 'Kejriwal']
}

POLITICAL_KEYWORDS = [
    'election', 'vote', 'campaign', 'rally', 'candidate', 'party', 'politics',
    'government', 'opposition', 'coalition', 'manifesto', 'promise', 'development',
    'corruption', 'scam', 'investigation', 'allegation', 'minister', 'MLA', 'MP'
]

HYDERABAD_CONTEXT = [
    'GHMC', 'Hyderabad', 'Secunderabad', 'Cyberabad', 'Old City', 'Jubilee Hills',
    'Banjara Hills', 'Gachibowli', 'Kondapur', 'Metro', 'ORR', 'HMDA'
]


class NLPProcessor:
    """
    Multilingual NLP processing pipeline for political intelligence.
    
    Handles sentiment analysis, topic modeling, named entity recognition,
    and political context tagging across Hindi, Telugu, Bengali, and English.
    """
    
    def __init__(self):
        self.model = self._initialize_model()
        
    def _initialize_model(self):
        """Initialize Gemini model for NLP tasks."""
        try:
            api_key = os.environ.get("GEMINI_API_KEY")
            if api_key:
                genai.configure(api_key=api_key)
                return genai.GenerativeModel('gemini-1.5-flash')
            else:
                logger.warning("GEMINI_API_KEY not available for NLP processing")
                return None
        except Exception as e:
            logger.error(f"Error initializing NLP model: {e}")
            return None
    
    async def analyze_corpus(
        self,
        data: Dict[str, Any],
        ward: str,
        depth: str,
        context_mode: str
    ) -> Dict[str, Any]:
        """
        Analyze corpus of intelligence data for political insights.
        
        Args:
            data: Intelligence data with sources and content
            ward: Ward context for analysis
            depth: Analysis depth level
            context_mode: Strategic context mode
            
        Returns:
            Processed NLP analysis results
        """
        try:
            # Extract text content from intelligence data
            texts = self._extract_texts(data)
            
            if not texts:
                return self._empty_analysis(ward)
            
            # Perform multilingual analysis
            sentiment_analysis = await self._analyze_sentiment(texts, ward)
            topic_analysis = await self._extract_topics(texts, ward)
            entity_analysis = await self._extract_entities(texts, ward)
            political_context = await self._analyze_political_context(texts, ward)
            
            # Synthesize results
            analysis = {
                "ward": ward,
                "context_mode": context_mode,
                "depth": depth,
                "text_count": len(texts),
                "sentiment": sentiment_analysis,
                "topics": topic_analysis,
                "entities": entity_analysis,
                "political_context": political_context,
                "processed_at": datetime.now(timezone.utc).isoformat()
            }
            
            logger.info(f"NLP analysis completed for {ward}: {len(texts)} texts processed")
            return analysis
            
        except Exception as e:
            logger.error(f"Error in corpus analysis: {e}", exc_info=True)
            return self._empty_analysis(ward)
    
    def _extract_texts(self, data: Dict[str, Any]) -> List[str]:
        """Extract text content from intelligence data."""
        texts = []
        
        # Extract from intelligence items
        for item in data.get('intelligence_items', []):
            content = item.get('content', '')
            if content and len(content.strip()) > 20:
                texts.append(content)
        
        # Extract from citations if available
        for citation in data.get('citations', []):
            title = citation.get('title', '')
            if title and len(title.strip()) > 10:
                texts.append(title)
        
        return texts[:50]  # Limit for processing efficiency
    
    async def _analyze_sentiment(self, texts: List[str], ward: str) -> Dict[str, Any]:
        """Analyze sentiment with political context."""
        if not self.model or not texts:
            return self._fallback_sentiment()
        
        try:
            combined_text = " ".join(texts[:10])  # Limit for API efficiency
            
            prompt = f"""
            Analyze the sentiment of the following political content from {ward} ward, Hyderabad:
            
            Text: {combined_text}
            
            Provide analysis as JSON:
            {{
                "overall_sentiment": "positive|negative|neutral",
                "sentiment_score": 0.75,
                "political_sentiment": {{
                    "towards_bjp": "positive|negative|neutral",
                    "towards_opposition": "positive|negative|neutral",
                    "towards_government": "positive|negative|neutral"
                }},
                "key_emotions": ["emotion1", "emotion2"],
                "sentiment_drivers": ["driver1", "driver2"],
                "confidence": 0.85
            }}
            
            Consider political context and party mentions.
            """
            
            response = self.model.generate_content(prompt)
            result = json.loads(response.text.strip().replace('```json', '').replace('```', ''))
            
            return result
            
        except Exception as e:
            logger.error(f"Error in sentiment analysis: {e}")
            return self._fallback_sentiment()
    
    async def _extract_topics(self, texts: List[str], ward: str) -> Dict[str, Any]:
        """Extract key topics and themes."""
        if not texts:
            return {"topics": [], "themes": []}
        
        try:
            # Simple keyword-based topic extraction as baseline
            all_text = " ".join(texts).lower()
            
            # Count political keywords
            political_counts = Counter()
            for category, keywords in POLITICAL_PARTIES.items():
                for keyword in keywords:
                    count = len(re.findall(r'\b' + re.escape(keyword.lower()) + r'\b', all_text))
                    if count > 0:
                        political_counts[category] += count
            
            # Count issue keywords
            issue_keywords = [
                'infrastructure', 'roads', 'water', 'electricity', 'drainage', 'garbage',
                'development', 'corruption', 'employment', 'education', 'healthcare'
            ]
            issue_counts = Counter()
            for keyword in issue_keywords:
                count = len(re.findall(r'\b' + keyword + r'\b', all_text))
                if count > 0:
                    issue_counts[keyword] = count
            
            return {
                "topics": [
                    {"topic": topic, "frequency": count, "category": "political"}
                    for topic, count in political_counts.most_common(5)
                ],
                "themes": [
                    {"theme": theme, "frequency": count, "category": "issues"}
                    for theme, count in issue_counts.most_common(5)
                ],
                "dominant_parties": list(political_counts.keys())[:3],
                "key_issues": list(issue_counts.keys())[:3]
            }
            
        except Exception as e:
            logger.error(f"Error in topic extraction: {e}")
            return {"topics": [], "themes": []}
    
    async def _extract_entities(self, texts: List[str], ward: str) -> Dict[str, Any]:
        """Extract named entities with political context."""
        if not self.model or not texts:
            return self._fallback_entities()
        
        try:
            sample_text = " ".join(texts[:5])  # Sample for entity extraction
            
            prompt = f"""
            Extract named entities from this political content from {ward}, Hyderabad:
            
            Text: {sample_text}
            
            Provide as JSON:
            {{
                "persons": ["Person 1", "Person 2"],
                "organizations": ["Org 1", "Org 2"], 
                "locations": ["Location 1", "Location 2"],
                "political_entities": {{
                    "parties": ["Party 1", "Party 2"],
                    "leaders": ["Leader 1", "Leader 2"],
                    "institutions": ["Institution 1", "Institution 2"]
                }},
                "confidence": 0.8
            }}
            
            Focus on political entities relevant to Hyderabad/Telangana politics.
            """
            
            response = self.model.generate_content(prompt)
            result = json.loads(response.text.strip().replace('```json', '').replace('```', ''))
            
            return result
            
        except Exception as e:
            logger.error(f"Error in entity extraction: {e}")
            return self._fallback_entities()
    
    async def _analyze_political_context(self, texts: List[str], ward: str) -> Dict[str, Any]:
        """Analyze political context and strategic implications."""
        try:
            # Detect political context using keyword analysis
            all_text = " ".join(texts).lower()
            
            # Political party mentions
            party_mentions = {}
            for party, keywords in POLITICAL_PARTIES.items():
                mentions = sum(
                    len(re.findall(r'\b' + re.escape(kw.lower()) + r'\b', all_text))
                    for kw in keywords
                )
                if mentions > 0:
                    party_mentions[party] = mentions
            
            # Local context detection
            local_mentions = sum(
                len(re.findall(r'\b' + re.escape(loc.lower()) + r'\b', all_text))
                for loc in HYDERABAD_CONTEXT
            )
            
            # Political keyword density
            political_density = sum(
                len(re.findall(r'\b' + keyword + r'\b', all_text))
                for keyword in POLITICAL_KEYWORDS
            ) / max(1, len(all_text.split()))
            
            return {
                "political_relevance": min(1.0, political_density * 10),
                "party_mentions": party_mentions,
                "local_context_strength": min(1.0, local_mentions / 10),
                "dominant_party_narrative": max(party_mentions.items(), key=lambda x: x[1])[0] if party_mentions else None,
                "context_indicators": {
                    "election_period": "election" in all_text,
                    "development_focus": any(word in all_text for word in ["development", "infrastructure", "project"]),
                    "controversy_detected": any(word in all_text for word in ["corruption", "scam", "allegation", "investigation"])
                }
            }
            
        except Exception as e:
            logger.error(f"Error analyzing political context: {e}")
            return {"political_relevance": 0.5, "context_indicators": {}}
    
    def _fallback_sentiment(self) -> Dict[str, Any]:
        """Fallback sentiment analysis."""
        return {
            "overall_sentiment": "neutral",
            "sentiment_score": 0.5,
            "political_sentiment": {
                "towards_bjp": "neutral",
                "towards_opposition": "neutral", 
                "towards_government": "neutral"
            },
            "key_emotions": ["neutral"],
            "sentiment_drivers": ["general_political_content"],
            "confidence": 0.3,
            "fallback_mode": True
        }
    
    def _fallback_entities(self) -> Dict[str, Any]:
        """Fallback entity extraction."""
        return {
            "persons": [],
            "organizations": [],
            "locations": [],
            "political_entities": {
                "parties": [],
                "leaders": [],
                "institutions": []
            },
            "confidence": 0.3,
            "fallback_mode": True
        }
    
    def _empty_analysis(self, ward: str) -> Dict[str, Any]:
        """Empty analysis result when no data available."""
        return {
            "ward": ward,
            "text_count": 0,
            "sentiment": self._fallback_sentiment(),
            "topics": {"topics": [], "themes": []},
            "entities": self._fallback_entities(),
            "political_context": {"political_relevance": 0.0},
            "processed_at": datetime.now(timezone.utc).isoformat(),
            "note": "No text data available for analysis"
        }