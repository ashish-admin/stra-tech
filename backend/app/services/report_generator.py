"""
Geopolitical Intelligence Report Generation Pipeline

Orchestrates multi-model AI system to generate comprehensive political intelligence
reports with real-time data retrieval, RAG-enhanced analysis, and structured output.
Integrates Claude, Perplexity, OpenAI embeddings, and local fallback capabilities.
"""

import asyncio
import json
import logging
import uuid
from datetime import datetime, timezone, timedelta
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass
from enum import Enum

from sqlalchemy import desc, and_
from flask import current_app

from ..models import GeopoliticalReport, EmbeddingStore, AIModelExecution, db
from ..extensions import redis_client
from .ai_orchestrator import orchestrator, QueryComplexity
from .openai_client import OpenAIClient
from .budget_manager import budget_manager

logger = logging.getLogger(__name__)


class ReportStatus(Enum):
    """Report generation status."""
    QUEUED = "queued"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class ProcessingStage(Enum):
    """Report processing stages."""
    INITIALIZATION = "initialization"
    DATA_RETRIEVAL = "data_retrieval"
    RAG_SEARCH = "rag_search"
    ANALYSIS = "analysis"
    SYNTHESIS = "synthesis"
    VALIDATION = "validation"
    FINALIZATION = "finalization"


@dataclass
class ReportRequest:
    """Report generation request parameters."""
    query: str
    user_id: int
    ward_context: Optional[str] = None
    region_context: str = "hyderabad"
    analysis_depth: str = "standard"  # quick, standard, deep
    strategic_context: str = "neutral"  # defensive, neutral, offensive
    priority_level: str = "normal"  # urgent, high, normal, low
    include_sources: bool = True
    max_processing_time: int = 120  # seconds


class ReportGenerator:
    """
    Comprehensive geopolitical intelligence report generation system.
    
    Features:
    - Multi-stage processing pipeline with progress tracking
    - Real-time data retrieval via Perplexity integration
    - RAG-enhanced analysis using embedded knowledge base
    - Multi-model synthesis for comprehensive intelligence
    - Structured output with citations and confidence scores
    - Cost tracking and quality validation
    """
    
    def __init__(self):
        self.openai_client = OpenAIClient()
        
        # Configuration
        self.config = {
            "max_concurrent_reports": 3,
            "default_timeout": 120,
            "rag_top_k": 10,
            "min_confidence_score": 0.6,
            "max_source_age_days": 30,
            "quality_threshold": 0.7,
            "cache_ttl": 3600,  # 1 hour
        }
        
        # Processing stage timeouts
        self.stage_timeouts = {
            ProcessingStage.INITIALIZATION: 10,
            ProcessingStage.DATA_RETRIEVAL: 45,
            ProcessingStage.RAG_SEARCH: 15,
            ProcessingStage.ANALYSIS: 60,
            ProcessingStage.SYNTHESIS: 30,
            ProcessingStage.VALIDATION: 15,
            ProcessingStage.FINALIZATION: 10
        }

    async def generate_report(self, request: ReportRequest) -> str:
        """
        Generate comprehensive geopolitical intelligence report.
        
        Args:
            request: Report generation parameters
            
        Returns:
            Report UUID for tracking and retrieval
        """
        
        report_uuid = str(uuid.uuid4())
        start_time = datetime.now(timezone.utc)
        
        try:
            # Create report record
            report = GeopoliticalReport(
                report_uuid=report_uuid,
                user_id=request.user_id,
                query_text=request.query,
                ward_context=request.ward_context,
                region_context=request.region_context,
                analysis_depth=request.analysis_depth,
                strategic_context=request.strategic_context,
                status=ReportStatus.QUEUED.value,
                priority_level=request.priority_level,
                requested_at=start_time
            )
            
            db.session.add(report)
            db.session.commit()
            
            # Start async processing
            asyncio.create_task(self._process_report_async(report, request))
            
            logger.info(f"Report generation started: {report_uuid}")
            return report_uuid
            
        except Exception as e:
            logger.error(f"Error starting report generation: {e}")
            if 'report' in locals():
                report.status = ReportStatus.FAILED.value
                report.processing_stage = f"initialization_error: {str(e)}"
                db.session.commit()
            
            raise

    async def _process_report_async(self, report: GeopoliticalReport, request: ReportRequest):
        """Asynchronous report processing pipeline."""
        
        try:
            # Update status to processing
            report.status = ReportStatus.PROCESSING.value
            report.started_processing_at = datetime.now(timezone.utc)
            db.session.commit()
            
            # Execute processing pipeline
            await self._execute_processing_pipeline(report, request)
            
            # Finalize report
            report.status = ReportStatus.COMPLETED.value
            report.completed_at = datetime.now(timezone.utc)
            db.session.commit()
            
            logger.info(f"Report completed: {report.report_uuid}")
            
        except Exception as e:
            logger.error(f"Report processing failed: {report.report_uuid}: {e}")
            
            report.status = ReportStatus.FAILED.value
            report.processing_stage = f"error: {str(e)}"
            db.session.commit()

    async def _execute_processing_pipeline(self, report: GeopoliticalReport, request: ReportRequest):
        """Execute the complete report processing pipeline."""
        
        context = {
            "ward_context": request.ward_context,
            "region_context": request.region_context,
            "analysis_depth": request.analysis_depth,
            "strategic_context": request.strategic_context,
            "priority": request.priority_level
        }
        
        # Stage 1: Initialize and validate
        await self._update_stage(report, ProcessingStage.INITIALIZATION)
        initial_analysis = await orchestrator.analyze_query(request.query, context)
        
        # Stage 2: Retrieve real-time data
        await self._update_stage(report, ProcessingStage.DATA_RETRIEVAL)
        real_time_data = await self._retrieve_real_time_data(request.query, context)
        
        # Stage 3: RAG search for relevant context
        await self._update_stage(report, ProcessingStage.RAG_SEARCH)
        rag_context = await self._perform_rag_search(request.query, context)
        
        # Stage 4: Primary analysis
        await self._update_stage(report, ProcessingStage.ANALYSIS)
        primary_analysis = await self._generate_primary_analysis(
            request.query, real_time_data, rag_context, context
        )
        
        # Stage 5: Synthesis and validation
        await self._update_stage(report, ProcessingStage.SYNTHESIS)
        final_report = await self._synthesize_final_report(
            request.query, primary_analysis, real_time_data, rag_context, context
        )
        
        # Stage 6: Quality validation
        await self._update_stage(report, ProcessingStage.VALIDATION)
        quality_metrics = await self._validate_report_quality(final_report, request)
        
        # Stage 7: Finalization
        await self._update_stage(report, ProcessingStage.FINALIZATION)
        await self._finalize_report(report, final_report, quality_metrics)

    async def _retrieve_real_time_data(self, query: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """Retrieve real-time data using Perplexity integration."""
        
        try:
            # Enhance query for real-time search
            search_context = {**context, "urgency": "high" if "breaking" in query.lower() else "normal"}
            
            # Get real-time intelligence
            response = await orchestrator.perplexity_client.generate_response(
                query, search_context, f"rt_search_{uuid.uuid4()}"
            )
            
            if response.is_success:
                return {
                    "content": response.content,
                    "sources": response.metadata.get("citations", []),
                    "credibility_score": response.metadata.get("credibility_score", 0.0),
                    "source_count": response.metadata.get("source_count", 0),
                    "real_time": True,
                    "cost_usd": response.cost_usd
                }
            else:
                logger.warning(f"Real-time data retrieval failed: {response.error}")
                return {"content": "", "sources": [], "real_time": False, "error": response.error}
                
        except Exception as e:
            logger.error(f"Real-time data retrieval error: {e}")
            return {"content": "", "sources": [], "real_time": False, "error": str(e)}

    async def _perform_rag_search(self, query: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """Perform RAG search using embedded knowledge base."""
        
        try:
            # Generate query embedding
            embedding_response = await self.openai_client.generate_response(
                query,
                {"operation_type": "embedding"},
                f"rag_query_{uuid.uuid4()}"
            )
            
            if not embedding_response.is_success:
                logger.warning("Query embedding generation failed")
                return {"chunks": [], "total_chunks": 0}
            
            # Extract embedding from response
            embedding_data = json.loads(embedding_response.content)
            query_embedding = embedding_data["embedding"]
            
            # Search for relevant chunks in embedding store
            # This would use pgvector similarity search in production
            relevant_chunks = await self._vector_similarity_search(
                query_embedding, context, self.config["rag_top_k"]
            )
            
            # Filter by relevance and recency
            filtered_chunks = self._filter_chunks_by_quality(relevant_chunks, context)
            
            return {
                "chunks": filtered_chunks,
                "total_chunks": len(filtered_chunks),
                "query_embedding_cost": embedding_response.cost_usd,
                "embedding_dimensions": len(query_embedding)
            }
            
        except Exception as e:
            logger.error(f"RAG search error: {e}")
            return {"chunks": [], "total_chunks": 0, "error": str(e)}

    async def _vector_similarity_search(self, query_embedding: List[float], 
                                      context: Dict[str, Any], top_k: int) -> List[Dict[str, Any]]:
        """Perform vector similarity search (placeholder for pgvector integration)."""
        
        try:
            # In production, this would use pgvector with HNSW index
            # For now, return sample relevant chunks based on context
            
            sample_chunks = [
                {
                    "content": "Recent political developments in Hyderabad show increased activity...",
                    "ward_context": context.get("ward_context"),
                    "similarity_score": 0.85,
                    "source_type": "news",
                    "published_at": datetime.now(timezone.utc) - timedelta(days=2)
                },
                {
                    "content": "Electoral dynamics in Telangana indicate shifting voter preferences...",
                    "ward_context": context.get("ward_context"),
                    "similarity_score": 0.78,
                    "source_type": "analysis",
                    "published_at": datetime.now(timezone.utc) - timedelta(days=5)
                }
            ]
            
            return sample_chunks[:top_k]
            
        except Exception as e:
            logger.error(f"Vector similarity search error: {e}")
            return []

    def _filter_chunks_by_quality(self, chunks: List[Dict[str, Any]], 
                                 context: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Filter chunks by relevance, recency, and quality scores."""
        
        filtered = []
        max_age = timedelta(days=self.config["max_source_age_days"])
        now = datetime.now(timezone.utc)
        
        for chunk in chunks:
            # Check similarity threshold
            if chunk.get("similarity_score", 0) < self.config["min_confidence_score"]:
                continue
            
            # Check recency
            published_at = chunk.get("published_at")
            if published_at and (now - published_at) > max_age:
                continue
            
            # Check ward context relevance
            ward_context = context.get("ward_context")
            if ward_context and chunk.get("ward_context") != ward_context:
                # Still include but with lower priority
                chunk["context_match"] = False
            else:
                chunk["context_match"] = True
            
            filtered.append(chunk)
        
        # Sort by relevance and context match
        filtered.sort(key=lambda x: (x.get("context_match", False), x.get("similarity_score", 0)), reverse=True)
        
        return filtered

    async def _generate_primary_analysis(self, query: str, real_time_data: Dict[str, Any],
                                       rag_context: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
        """Generate primary analysis using Claude with enhanced context."""
        
        try:
            # Build enhanced context for Claude
            enhanced_context = {
                **context,
                "real_time_sources": real_time_data.get("source_count", 0),
                "historical_context_chunks": rag_context.get("total_chunks", 0),
                "analysis_type": "comprehensive_intelligence"
            }
            
            # Prepare context-enriched query
            enriched_query = self._build_enriched_query(query, real_time_data, rag_context)
            
            # Generate primary analysis
            analysis_response = await orchestrator.claude_client.generate_response(
                enriched_query, enhanced_context, f"primary_analysis_{uuid.uuid4()}"
            )
            
            if analysis_response.is_success:
                return {
                    "analysis": analysis_response.content,
                    "confidence_score": analysis_response.quality_score,
                    "model_used": analysis_response.model_used,
                    "cost_usd": analysis_response.cost_usd,
                    "processing_time_ms": analysis_response.latency_ms
                }
            else:
                logger.error(f"Primary analysis failed: {analysis_response.error}")
                return {"analysis": "", "error": analysis_response.error}
                
        except Exception as e:
            logger.error(f"Primary analysis error: {e}")
            return {"analysis": "", "error": str(e)}

    def _build_enriched_query(self, original_query: str, real_time_data: Dict[str, Any],
                             rag_context: Dict[str, Any]) -> str:
        """Build query enriched with real-time and historical context."""
        
        query_parts = [f"**Original Query**: {original_query}"]
        
        # Add real-time context
        if real_time_data.get("content"):
            query_parts.append("**Latest Developments**:")
            query_parts.append(real_time_data["content"][:1000])  # Truncate for token efficiency
            
            if real_time_data.get("sources"):
                query_parts.append(f"**Sources**: {len(real_time_data['sources'])} recent sources")
        
        # Add historical context
        if rag_context.get("chunks"):
            query_parts.append("**Historical Context**:")
            for i, chunk in enumerate(rag_context["chunks"][:3]):  # Top 3 chunks
                query_parts.append(f"{i+1}. {chunk['content'][:200]}...")
        
        # Add analysis instructions
        query_parts.append("""
**Analysis Requirements**:
1. Synthesize real-time developments with historical context
2. Identify key political implications and strategic considerations
3. Assess credibility and confidence levels for major claims
4. Provide actionable intelligence for political decision-makers
5. Cite specific sources and evidence for all major points""")
        
        return "\n\n".join(query_parts)

    async def _synthesize_final_report(self, query: str, primary_analysis: Dict[str, Any],
                                     real_time_data: Dict[str, Any], rag_context: Dict[str, Any],
                                     context: Dict[str, Any]) -> Dict[str, Any]:
        """Synthesize final comprehensive report."""
        
        try:
            # Build synthesis prompt
            synthesis_context = {
                **context,
                "operation_type": "final_synthesis",
                "include_executive_summary": True,
                "include_recommendations": True
            }
            
            synthesis_query = f"""
**FINAL INTELLIGENCE REPORT SYNTHESIS**

**Original Query**: {query}

**Primary Analysis**:
{primary_analysis.get('analysis', 'No primary analysis available')}

**Real-Time Intelligence**:
- Sources: {real_time_data.get('source_count', 0)}
- Credibility: {real_time_data.get('credibility_score', 0):.2f}
- Latest Developments: {real_time_data.get('content', 'No real-time data')[:500]}

**Historical Context**:
- Relevant Documents: {rag_context.get('total_chunks', 0)}
- Context Relevance: {len([c for c in rag_context.get('chunks', []) if c.get('context_match', False)])} highly relevant

**SYNTHESIS REQUIREMENTS**:
Create a comprehensive geopolitical intelligence report with:

1. **Executive Summary** (3-4 key findings)
2. **Situation Analysis** (current state and developments)
3. **Strategic Implications** (political consequences and opportunities)
4. **Key Players Impact** (effects on major political actors)
5. **Tactical Recommendations** (actionable next steps)
6. **Confidence Assessment** (reliability ratings for major conclusions)
7. **Source Attribution** (clear citation of evidence)

Format as professional intelligence briefing for senior political advisors.
"""
            
            # Generate final synthesis
            synthesis_response = await orchestrator.claude_client.generate_response(
                synthesis_query, synthesis_context, f"final_synthesis_{uuid.uuid4()}"
            )
            
            if synthesis_response.is_success:
                # Parse structured output
                structured_report = self._parse_report_structure(synthesis_response.content)
                
                return {
                    "full_report": synthesis_response.content,
                    "structured_sections": structured_report,
                    "confidence_score": synthesis_response.quality_score,
                    "total_cost_usd": (
                        primary_analysis.get("cost_usd", 0) +
                        real_time_data.get("cost_usd", 0) +
                        rag_context.get("query_embedding_cost", 0) +
                        synthesis_response.cost_usd
                    ),
                    "models_used": [
                        primary_analysis.get("model_used"),
                        real_time_data.get("model_used", "perplexity"),
                        synthesis_response.model_used
                    ]
                }
            else:
                logger.error(f"Final synthesis failed: {synthesis_response.error}")
                return {"full_report": "", "error": synthesis_response.error}
                
        except Exception as e:
            logger.error(f"Final synthesis error: {e}")
            return {"full_report": "", "error": str(e)}

    def _parse_report_structure(self, report_content: str) -> Dict[str, str]:
        """Parse report content into structured sections."""
        
        sections = {
            "executive_summary": "",
            "situation_analysis": "",
            "strategic_implications": "",
            "key_players_impact": "",
            "recommendations": "",
            "confidence_assessment": "",
            "sources": ""
        }
        
        # Simple parsing based on section headers
        current_section = None
        lines = report_content.split('\n')
        
        for line in lines:
            line_lower = line.lower().strip()
            
            if "executive summary" in line_lower:
                current_section = "executive_summary"
            elif "situation analysis" in line_lower:
                current_section = "situation_analysis"
            elif "strategic implications" in line_lower:
                current_section = "strategic_implications"
            elif "key players" in line_lower or "political actors" in line_lower:
                current_section = "key_players_impact"
            elif "recommendations" in line_lower or "tactical" in line_lower:
                current_section = "recommendations"
            elif "confidence" in line_lower:
                current_section = "confidence_assessment"
            elif "sources" in line_lower or "attribution" in line_lower:
                current_section = "sources"
            elif current_section and line.strip():
                sections[current_section] += line + "\n"
        
        return sections

    async def _validate_report_quality(self, final_report: Dict[str, Any], 
                                     request: ReportRequest) -> Dict[str, Any]:
        """Validate report quality and completeness."""
        
        quality_metrics = {
            "overall_score": 0.0,
            "completeness_score": 0.0,
            "confidence_score": final_report.get("confidence_score", 0.0),
            "source_quality": 0.0,
            "political_relevance": 0.0,
            "issues": []
        }
        
        try:
            report_text = final_report.get("full_report", "")
            
            # Completeness check
            required_sections = ["executive", "analysis", "implications", "recommendations"]
            present_sections = sum(1 for section in required_sections if section in report_text.lower())
            quality_metrics["completeness_score"] = present_sections / len(required_sections)
            
            # Source quality check
            if "source" in report_text.lower() or "according to" in report_text.lower():
                quality_metrics["source_quality"] = 0.8
            else:
                quality_metrics["source_quality"] = 0.3
                quality_metrics["issues"].append("Insufficient source attribution")
            
            # Political relevance check
            political_terms = ["party", "election", "political", "campaign", "voter", "governance"]
            relevance_count = sum(1 for term in political_terms if term in report_text.lower())
            quality_metrics["political_relevance"] = min(1.0, relevance_count / 10.0)
            
            # Length and depth check
            word_count = len(report_text.split())
            if word_count < 300:
                quality_metrics["issues"].append("Report too brief for comprehensive analysis")
            elif word_count > 2000:
                quality_metrics["issues"].append("Report may be too lengthy")
            
            # Calculate overall score
            quality_metrics["overall_score"] = (
                quality_metrics["completeness_score"] * 0.3 +
                quality_metrics["confidence_score"] * 0.25 +
                quality_metrics["source_quality"] * 0.25 +
                quality_metrics["political_relevance"] * 0.2
            )
            
            # Quality threshold check
            if quality_metrics["overall_score"] < self.config["quality_threshold"]:
                quality_metrics["issues"].append(f"Overall quality below threshold: {quality_metrics['overall_score']:.2f}")
            
            return quality_metrics
            
        except Exception as e:
            logger.error(f"Quality validation error: {e}")
            quality_metrics["issues"].append(f"Validation error: {str(e)}")
            return quality_metrics

    async def _finalize_report(self, report: GeopoliticalReport, final_report: Dict[str, Any],
                             quality_metrics: Dict[str, Any]):
        """Finalize report with all metadata and save to database."""
        
        try:
            # Update report with final content
            report.full_report_markdown = final_report.get("full_report", "")
            report.confidence_score = quality_metrics.get("overall_score", 0.0)
            report.total_cost_usd = final_report.get("total_cost_usd", 0.0)
            
            # Store structured sections
            structured_sections = final_report.get("structured_sections", {})
            report.executive_summary = structured_sections.get("executive_summary", "")
            report.key_findings = self._extract_key_findings(structured_sections)
            report.strategic_implications = self._extract_implications(structured_sections)
            report.recommendations = self._extract_recommendations(structured_sections)
            
            # Store metadata
            report.models_used = final_report.get("models_used", [])
            report.quality_indicators = quality_metrics
            report.validation_checks = {
                "completeness": quality_metrics.get("completeness_score", 0.0),
                "source_quality": quality_metrics.get("source_quality", 0.0),
                "issues": quality_metrics.get("issues", [])
            }
            
            # Processing time calculation
            if report.started_processing_at:
                processing_duration = datetime.now(timezone.utc) - report.started_processing_at
                report.processing_time_seconds = int(processing_duration.total_seconds())
            
            db.session.commit()
            
            logger.info(f"Report finalized: {report.report_uuid}, score: {report.confidence_score:.2f}")
            
        except Exception as e:
            logger.error(f"Report finalization error: {e}")
            raise

    def _extract_key_findings(self, sections: Dict[str, str]) -> List[str]:
        """Extract key findings from structured sections."""
        
        findings = []
        
        # Extract from executive summary
        exec_summary = sections.get("executive_summary", "")
        if exec_summary:
            # Simple extraction of bullet points or numbered items
            lines = exec_summary.split('\n')
            for line in lines:
                line = line.strip()
                if line and (line.startswith('-') or line.startswith('•') or any(char.isdigit() for char in line[:3])):
                    findings.append(line)
        
        return findings[:5]  # Limit to top 5 findings

    def _extract_implications(self, sections: Dict[str, str]) -> Dict[str, Any]:
        """Extract strategic implications."""
        
        implications_text = sections.get("strategic_implications", "")
        
        return {
            "summary": implications_text[:500] if implications_text else "",
            "key_impacts": self._extract_bullet_points(implications_text),
            "timeframe": "short_to_medium_term",  # Could be enhanced with NLP
            "confidence": "medium"  # Could be extracted from text
        }

    def _extract_recommendations(self, sections: Dict[str, str]) -> List[Dict[str, str]]:
        """Extract actionable recommendations."""
        
        rec_text = sections.get("recommendations", "")
        bullet_points = self._extract_bullet_points(rec_text)
        
        recommendations = []
        for point in bullet_points:
            recommendations.append({
                "recommendation": point,
                "priority": "medium",  # Could be enhanced with classification
                "timeframe": "immediate",
                "actionability": "high"
            })
        
        return recommendations

    def _extract_bullet_points(self, text: str) -> List[str]:
        """Extract bullet points from text."""
        
        points = []
        lines = text.split('\n')
        
        for line in lines:
            line = line.strip()
            if line and (line.startswith('-') or line.startswith('•') or 
                        any(char.isdigit() for char in line[:3])):
                # Clean up formatting
                clean_line = line.lstrip('-•123456789. ').strip()
                if clean_line:
                    points.append(clean_line)
        
        return points

    async def _update_stage(self, report: GeopoliticalReport, stage: ProcessingStage):
        """Update report processing stage."""
        
        try:
            report.processing_stage = stage.value
            db.session.commit()
            
            logger.debug(f"Report {report.report_uuid} stage: {stage.value}")
            
        except Exception as e:
            logger.error(f"Stage update error: {e}")

    async def get_report_status(self, report_uuid: str) -> Dict[str, Any]:
        """Get current status of report generation."""
        
        try:
            report = db.session.query(GeopoliticalReport)\
                .filter(GeopoliticalReport.report_uuid == report_uuid)\
                .first()
            
            if not report:
                return {"error": "Report not found"}
            
            return {
                "report_uuid": report.report_uuid,
                "status": report.status,
                "processing_stage": report.processing_stage,
                "requested_at": report.requested_at.isoformat(),
                "started_processing_at": report.started_processing_at.isoformat() if report.started_processing_at else None,
                "completed_at": report.completed_at.isoformat() if report.completed_at else None,
                "progress_percent": self._calculate_progress_percent(report),
                "estimated_completion": self._estimate_completion_time(report),
                "quality_score": report.confidence_score,
                "total_cost_usd": float(report.total_cost_usd or 0),
                "error": None
            }
            
        except Exception as e:
            logger.error(f"Status retrieval error: {e}")
            return {"error": str(e)}

    def _calculate_progress_percent(self, report: GeopoliticalReport) -> int:
        """Calculate processing progress percentage."""
        
        stage_progress = {
            "queued": 0,
            "initialization": 10,
            "data_retrieval": 25,
            "rag_search": 40,
            "analysis": 60,
            "synthesis": 80,
            "validation": 90,
            "finalization": 95,
            "completed": 100,
            "failed": 0
        }
        
        current_stage = report.processing_stage or "queued"
        
        # Handle error stages
        if "error" in current_stage:
            return 0
        
        # Find matching stage
        for stage, progress in stage_progress.items():
            if stage in current_stage:
                return progress
        
        return 50  # Default fallback

    def _estimate_completion_time(self, report: GeopoliticalReport) -> Optional[str]:
        """Estimate completion time for processing report."""
        
        if report.status == ReportStatus.COMPLETED.value:
            return None
        
        if report.status == ReportStatus.FAILED.value:
            return None
        
        if not report.started_processing_at:
            return "Starting soon"
        
        # Calculate elapsed time
        elapsed = datetime.now(timezone.utc) - report.started_processing_at
        elapsed_seconds = elapsed.total_seconds()
        
        # Estimate based on current stage and typical processing times
        current_stage = report.processing_stage or "queued"
        
        remaining_stages = []
        stage_found = False
        
        for stage in ProcessingStage:
            if stage.value in current_stage:
                stage_found = True
                continue
            if stage_found:
                remaining_stages.append(stage)
        
        # Calculate estimated remaining time
        remaining_time = sum(self.stage_timeouts.get(stage, 30) for stage in remaining_stages)
        
        if remaining_time > 0:
            return f"{remaining_time} seconds remaining"
        else:
            return "Completing soon"


# Global report generator instance - lazy initialization
report_generator = None

def get_report_generator():
    """Get the global report generator instance, creating it if needed."""
    global report_generator
    if report_generator is None:
        report_generator = ReportGenerator()
    return report_generator