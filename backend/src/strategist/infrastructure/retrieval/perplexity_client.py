"""
Perplexity Intelligence Retriever

Executes planner-authored queries using Perplexity AI for real-time intelligence gathering.
Prioritizes sources related to political sentiment, opponent activities, and emerging issues.
"""

import os
import json
import logging
import asyncio
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional

import requests

logger = logging.getLogger(__name__)

PERPLEXITY_API_URL = "https://api.perplexity.ai/chat/completions"


class PerplexityRetriever:
    """
    Perplexity AI-powered intelligence retrieval system.
    
    Executes strategic queries to gather real-time political intelligence
    with focus on credible sources and citation threading.
    """
    
    def __init__(self):
        self.api_key = os.getenv('PERPLEXITY_API_KEY')
        self.session = requests.Session()
        if self.api_key:
            self.session.headers.update({
                'Authorization': f'Bearer {self.api_key}',
                'Content-Type': 'application/json'
            })
            logger.info("Perplexity client initialized")
        else:
            logger.warning("PERPLEXITY_API_KEY not set - using fallback mode")
    
    async def gather_intelligence(self, queries: List[str]) -> Dict[str, Any]:
        """
        Execute multiple intelligence queries and aggregate results.
        
        Args:
            queries: List of search queries for intelligence gathering
            
        Returns:
            Aggregated intelligence data with citations
        """
        if not self.api_key:
            return self._fallback_intelligence(queries)
        
        try:
            # Execute queries in parallel for efficiency
            tasks = [self._execute_query(query) for query in queries[:5]]  # Limit to 5 queries
            results = await asyncio.gather(*tasks, return_exceptions=True)
            
            # Aggregate and structure results
            intelligence = {
                "queries_executed": len(queries),
                "successful_queries": sum(1 for r in results if not isinstance(r, Exception)),
                "intelligence_items": [],
                "citations": [],
                "retrieved_at": datetime.now(timezone.utc).isoformat()
            }
            
            for i, result in enumerate(results):
                if isinstance(result, Exception):
                    logger.error(f"Query {i} failed: {result}")
                    continue
                    
                if result and 'content' in result:
                    intelligence['intelligence_items'].append({
                        "query": queries[i],
                        "content": result['content'],
                        "sources": result.get('sources', []),
                        "confidence": result.get('confidence', 0.5),
                        "relevance": result.get('relevance', 0.7)
                    })
                    
                    # Collect citations
                    intelligence['citations'].extend(result.get('citations', []))
            
            logger.info(f"Gathered {len(intelligence['intelligence_items'])} intelligence items")
            return intelligence
            
        except Exception as e:
            logger.error(f"Error gathering intelligence: {e}", exc_info=True)
            return self._fallback_intelligence(queries)
    
    async def _execute_query(self, query: str) -> Optional[Dict[str, Any]]:
        """
        Execute single intelligence query via Perplexity API.
        
        Args:
            query: Search query string
            
        Returns:
            Query result with content and citations
        """
        try:
            # Enhanced prompt for political intelligence
            enhanced_prompt = f"""
            You are a political intelligence analyst researching: {query}
            
            Focus on:
            1. Recent political developments and trends
            2. Key stakeholders and their positions
            3. Public sentiment and reactions
            4. Opposition activities and statements
            5. Emerging issues or opportunities
            
            Provide factual, well-sourced information with clear citations.
            Prioritize credible news sources, official statements, and verified social media.
            """
            
            payload = {
                "model": "llama-3.1-sonar-large-128k-online",
                "messages": [
                    {
                        "role": "system",
                        "content": "You are a political intelligence analyst focused on providing factual, well-sourced information about Indian politics, particularly Hyderabad and Telangana state."
                    },
                    {
                        "role": "user", 
                        "content": enhanced_prompt
                    }
                ],
                "temperature": 0.2,
                "max_tokens": 1024,
                "return_citations": True,
                "search_domain_filter": ["news"],
                "search_recency_filter": "week"
            }
            
            response = self.session.post(
                PERPLEXITY_API_URL,
                json=payload,
                timeout=30
            )
            response.raise_for_status()
            
            data = response.json()
            content = data['choices'][0]['message']['content']
            
            # Extract citations if available
            citations = []
            if 'citations' in data:
                citations = [
                    {
                        "title": cite.get('title', ''),
                        "url": cite.get('url', ''),
                        "source": cite.get('source', ''),
                        "date": cite.get('date', ''),
                        "relevance": cite.get('relevance', 0.7)
                    }
                    for cite in data['citations'][:5]  # Limit citations
                ]
            
            return {
                "query": query,
                "content": content,
                "citations": citations,
                "sources": [cite['source'] for cite in citations],
                "confidence": min(1.0, len(citations) * 0.2 + 0.3),  # Confidence based on citation count
                "relevance": 0.8,  # Base relevance for Perplexity results
                "retrieved_at": datetime.now(timezone.utc).isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error executing query '{query}': {e}")
            return None
    
    def _fallback_intelligence(self, queries: List[str]) -> Dict[str, Any]:
        """Fallback intelligence when Perplexity is unavailable."""
        return {
            "queries_executed": len(queries),
            "successful_queries": 0,
            "intelligence_items": [
                {
                    "query": query,
                    "content": f"Intelligence monitoring for: {query}",
                    "sources": ["fallback"],
                    "confidence": 0.3,
                    "relevance": 0.5,
                    "fallback_mode": True
                }
                for query in queries[:3]  # Limit fallback items
            ],
            "citations": [],
            "fallback_mode": True,
            "retrieved_at": datetime.now(timezone.utc).isoformat(),
            "note": "Perplexity API unavailable - using fallback intelligence"
        }
    
    async def search_specific(
        self, 
        query: str, 
        domain_filter: Optional[List[str]] = None,
        recency: str = "week"
    ) -> Dict[str, Any]:
        """
        Execute specific targeted search query.
        
        Args:
            query: Specific search query
            domain_filter: Optional domain restrictions
            recency: Time filter (day/week/month)
            
        Returns:
            Detailed search results
        """
        if not self.api_key:
            return {"error": "Perplexity API not available", "fallback_mode": True}
        
        try:
            result = await self._execute_query(query)
            if result:
                result["search_parameters"] = {
                    "domain_filter": domain_filter,
                    "recency": recency,
                    "executed_at": datetime.now(timezone.utc).isoformat()
                }
            return result or {"error": "Search failed", "query": query}
            
        except Exception as e:
            logger.error(f"Error in specific search: {e}")
            return {"error": str(e), "query": query}