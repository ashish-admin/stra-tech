"""
Multi-Model AI API Blueprint

Provides REST API endpoints for the multi-model geopolitical intelligence system.
Integrates with existing Political Strategist module while adding new capabilities
for report generation, cost tracking, and multi-model orchestration.
"""

import asyncio
import json
import logging
from datetime import datetime, timezone
from typing import Dict, Any, Optional

from flask import Blueprint, request, jsonify, Response, current_app
from flask_login import login_required, current_user

from .models import GeopoliticalReport, AIModelExecution, BudgetTracker, db
from .services.ai_orchestrator import get_orchestrator
from .services.report_generator import get_report_generator, ReportRequest
from .services.budget_manager import get_budget_manager
from .services.strategist_integration import get_strategist_adapter

logger = logging.getLogger(__name__)

multimodel_bp = Blueprint('multimodel', __name__, url_prefix='/api/v1/multimodel')


@multimodel_bp.before_request
def check_multimodel_enabled():
    """Check if multi-model AI system is enabled."""
    if not current_app.config.get('MULTIMODEL_ENABLED', True):
        return jsonify({
            "error": "Multi-model AI system is currently disabled",
            "status": "service_unavailable"
        }), 503


@multimodel_bp.route('/reports', methods=['POST'])
@login_required
def create_report():
    """
    Generate comprehensive geopolitical intelligence report.
    
    Request Body:
    {
        "query": "Analysis question or topic",
        "ward_context": "Specific ward (optional)",
        "region_context": "Region focus (default: hyderabad)",
        "analysis_depth": "quick|standard|deep",
        "strategic_context": "defensive|neutral|offensive",
        "priority_level": "urgent|high|normal|low"
    }
    
    Returns:
        Report UUID for tracking and status monitoring
    """
    try:
        data = request.get_json() or {}
        
        # Validate required fields
        query = data.get('query', '').strip()
        if not query:
            return jsonify({"error": "Query is required"}), 400
        
        if len(query) < 10:
            return jsonify({"error": "Query too short for meaningful analysis"}), 400
        
        if len(query) > 5000:
            return jsonify({"error": "Query too long - maximum 5,000 characters"}), 400
        
        # Validate parameters
        analysis_depth = data.get('analysis_depth', 'standard')
        if analysis_depth not in ['quick', 'standard', 'deep']:
            analysis_depth = 'standard'
        
        strategic_context = data.get('strategic_context', 'neutral')
        if strategic_context not in ['defensive', 'neutral', 'offensive']:
            strategic_context = 'neutral'
        
        priority_level = data.get('priority_level', 'normal')
        if priority_level not in ['urgent', 'high', 'normal', 'low']:
            priority_level = 'normal'
        
        # Create report request
        report_request = ReportRequest(
            query=query,
            user_id=current_user.id,
            ward_context=data.get('ward_context'),
            region_context=data.get('region_context', 'hyderabad'),
            analysis_depth=analysis_depth,
            strategic_context=strategic_context,
            priority_level=priority_level,
            include_sources=data.get('include_sources', True),
            max_processing_time=data.get('max_processing_time', 120)
        )
        
        # Check budget before processing
        estimated_cost = _estimate_report_cost(analysis_depth, strategic_context)
        if not asyncio.run(get_budget_manager().can_afford_request(estimated_cost)):
            return jsonify({
                "error": "Insufficient budget for request",
                "estimated_cost_usd": estimated_cost,
                "budget_status": asyncio.run(get_budget_manager().get_current_status())
            }), 402  # Payment Required
        
        # Generate report
        report_uuid = asyncio.run(get_report_generator().generate_report(report_request))
        
        logger.info(f"Report generation started by user {current_user.id}: {report_uuid}")
        
        return jsonify({
            "report_uuid": report_uuid,
            "status": "queued",
            "estimated_completion_time": "2-3 minutes",
            "query": query[:100] + "..." if len(query) > 100 else query,
            "analysis_depth": analysis_depth,
            "strategic_context": strategic_context,
            "priority_level": priority_level,
            "created_at": datetime.now(timezone.utc).isoformat()
        }), 202  # Accepted
        
    except Exception as e:
        logger.error(f"Error creating report: {e}")
        return jsonify({
            "error": "Failed to create report",
            "details": str(e),
            "timestamp": datetime.now(timezone.utc).isoformat()
        }), 500


@multimodel_bp.route('/reports/<report_uuid>', methods=['GET'])
@login_required
def get_report(report_uuid):
    """
    Get report status and content.
    
    Returns:
        Report data including status, progress, and content (if completed)
    """
    try:
        # Get report from database
        report = db.session.query(GeopoliticalReport)\
            .filter(GeopoliticalReport.report_uuid == report_uuid)\
            .first()
        
        if not report:
            return jsonify({"error": "Report not found"}), 404
        
        # Check user permissions
        if report.user_id != current_user.id:
            return jsonify({"error": "Access denied"}), 403
        
        # Update access tracking
        report.access_count = (report.access_count or 0) + 1
        report.last_accessed_at = datetime.now(timezone.utc)
        db.session.commit()
        
        # Build response
        response_data = {
            "report_uuid": report.report_uuid,
            "status": report.status,
            "processing_stage": report.processing_stage,
            "query": report.query_text,
            "ward_context": report.ward_context,
            "region_context": report.region_context,
            "analysis_depth": report.analysis_depth,
            "strategic_context": report.strategic_context,
            "priority_level": report.priority_level,
            "requested_at": report.requested_at.isoformat(),
            "started_processing_at": report.started_processing_at.isoformat() if report.started_processing_at else None,
            "completed_at": report.completed_at.isoformat() if report.completed_at else None,
            "processing_time_seconds": report.processing_time_seconds,
            "confidence_score": report.confidence_score,
            "total_cost_usd": float(report.total_cost_usd or 0),
            "access_count": report.access_count
        }
        
        # Include content if completed
        if report.status == "completed":
            response_data.update({
                "executive_summary": report.executive_summary,
                "key_findings": report.key_findings,
                "strategic_implications": report.strategic_implications,
                "recommendations": report.recommendations,
                "full_report_markdown": report.full_report_markdown,
                "models_used": report.models_used,
                "quality_indicators": report.quality_indicators,
                "validation_checks": report.validation_checks
            })
        elif report.status == "processing":
            # Get real-time status
            status = asyncio.run(get_report_generator().get_report_status(report_uuid))
            response_data.update({
                "progress_percent": status.get("progress_percent", 0),
                "estimated_completion": status.get("estimated_completion")
            })
        
        return jsonify(response_data)
        
    except Exception as e:
        logger.error(f"Error retrieving report {report_uuid}: {e}")
        return jsonify({
            "error": "Failed to retrieve report",
            "timestamp": datetime.now(timezone.utc).isoformat()
        }), 500


@multimodel_bp.route('/reports/<report_uuid>/download', methods=['GET'])
@login_required
def download_report(report_uuid):
    """Download report as markdown file."""
    try:
        report = db.session.query(GeopoliticalReport)\
            .filter(GeopoliticalReport.report_uuid == report_uuid)\
            .first()
        
        if not report:
            return jsonify({"error": "Report not found"}), 404
        
        if report.user_id != current_user.id:
            return jsonify({"error": "Access denied"}), 403
        
        if report.status != "completed":
            return jsonify({"error": "Report not yet completed"}), 400
        
        # Update download tracking
        report.download_count = (report.download_count or 0) + 1
        db.session.commit()
        
        # Generate filename
        filename = f"geopolitical_report_{report_uuid[:8]}_{datetime.now().strftime('%Y%m%d')}.md"
        
        # Prepare content
        content = report.full_report_markdown or "Report content not available"
        
        return Response(
            content,
            mimetype='text/markdown',
            headers={
                'Content-Disposition': f'attachment; filename={filename}',
                'Content-Type': 'text/markdown; charset=utf-8'
            }
        )
        
    except Exception as e:
        logger.error(f"Error downloading report {report_uuid}: {e}")
        return jsonify({"error": "Download failed"}), 500


@multimodel_bp.route('/analyze', methods=['POST'])
@login_required
def quick_analyze():
    """
    Quick analysis endpoint for immediate responses.
    
    Request Body:
    {
        "query": "Question or text to analyze",
        "context": {
            "ward_context": "Optional ward",
            "urgency": "Optional urgency level"
        }
    }
    
    Returns:
        Immediate analysis response (not stored as full report)
    """
    try:
        data = request.get_json() or {}
        
        query = data.get('query', '').strip()
        if not query:
            return jsonify({"error": "Query is required"}), 400
        
        if len(query) > 2000:
            return jsonify({"error": "Query too long for quick analysis - use reports endpoint"}), 400
        
        context = data.get('context', {})
        context['analysis_depth'] = 'quick'  # Force quick analysis
        
        # Check budget
        estimated_cost = 0.05  # Quick analysis cost estimate
        if not asyncio.run(get_budget_manager().can_afford_request(estimated_cost)):
            return jsonify({
                "error": "Insufficient budget for request",
                "suggestion": "Use local analysis mode"
            }), 402
        
        # Generate quick response
        response = asyncio.run(get_orchestrator().generate_response(query, context))
        
        # Record usage
        if response.cost_usd > 0:
            asyncio.run(get_budget_manager().record_spend(
                response.cost_usd, 
                response.provider.value,
                "quick_analysis"
            ))
        
        return jsonify({
            "analysis": response.content,
            "model_used": response.model_used,
            "provider": response.provider.value,
            "quality_score": response.quality_score,
            "cost_usd": response.cost_usd,
            "processing_time_ms": response.latency_ms,
            "confidence_level": response.metadata.get("confidence_level", "medium"),
            "timestamp": datetime.now(timezone.utc).isoformat()
        })
        
    except Exception as e:
        logger.error(f"Error in quick analysis: {e}")
        return jsonify({
            "error": "Analysis failed",
            "details": str(e),
            "timestamp": datetime.now(timezone.utc).isoformat()
        }), 500


@multimodel_bp.route('/analyze/confidence', methods=['POST'])
@login_required
def analyze_with_confidence():
    """
    Enhanced analysis endpoint with confidence scoring and optional consensus.
    
    Request Body:
    {
        "query": "Question or text to analyze",
        "context": {
            "ward_context": "Optional ward",
            "analysis_depth": "quick|standard|deep",
            "strategic_context": "defensive|neutral|offensive",
            "urgency": "Optional urgency level"
        },
        "enable_consensus": false,  // Enable multi-model consensus for critical queries
        "confidence_threshold": 0.8  // Minimum confidence required
    }
    
    Returns:
        Analysis response with detailed confidence metrics and optional consensus data
    """
    try:
        data = request.get_json() or {}
        
        query = data.get('query', '').strip()
        if not query:
            return jsonify({"error": "Query is required"}), 400
        
        if len(query) > 3000:
            return jsonify({"error": "Query too long - use reports endpoint for complex analysis"}), 400
        
        context = data.get('context', {})
        enable_consensus = data.get('enable_consensus', False)
        confidence_threshold = data.get('confidence_threshold', 0.0)
        
        # Enhanced cost estimation for confidence analysis
        analysis_depth = context.get('analysis_depth', 'standard')
        base_cost = {'quick': 0.05, 'standard': 0.15, 'deep': 0.35}.get(analysis_depth, 0.15)
        consensus_cost = base_cost * 0.5 if enable_consensus else 0.0
        estimated_cost = base_cost + consensus_cost
        
        # Check budget
        if not asyncio.run(get_budget_manager().can_afford_request(estimated_cost)):
            return jsonify({
                "error": "Insufficient budget for confidence analysis",
                "estimated_cost_usd": estimated_cost,
                "suggestion": "Disable consensus or use quick analysis mode"
            }), 402
        
        # Generate response with confidence scoring
        result = asyncio.run(get_orchestrator().generate_response_with_confidence(
            query, context, enable_consensus
        ))
        
        response = result["response"]
        confidence_metrics = result["confidence_metrics"]
        
        # Check if confidence meets threshold
        if confidence_threshold > 0 and confidence_metrics["overall_confidence"] < confidence_threshold:
            logger.warning(f"Analysis confidence {confidence_metrics['overall_confidence']:.2f} below threshold {confidence_threshold}")
        
        # Record usage
        if response.cost_usd > 0:
            asyncio.run(get_budget_manager().record_spend(
                response.cost_usd, 
                response.provider.value,
                "confidence_analysis"
            ))
        
        # Record consensus cost if applicable
        consensus_data = result.get("consensus_data")
        if consensus_data and consensus_data.get("secondary_cost", 0) > 0:
            asyncio.run(get_budget_manager().record_spend(
                consensus_data["secondary_cost"],
                consensus_data.get("secondary_provider", "unknown"),
                "consensus_validation"
            ))
        
        return jsonify({
            "analysis": response.content,
            "model_used": response.model_used,
            "provider": response.provider.value,
            "quality_score": response.quality_score,
            "cost_usd": response.cost_usd,
            "processing_time_ms": response.latency_ms,
            "confidence_metrics": confidence_metrics,
            "consensus_data": consensus_data,
            "analysis_metadata": result.get("analysis", {}),
            "threshold_met": confidence_metrics["overall_confidence"] >= confidence_threshold,
            "generation_time_ms": result.get("generation_time_ms", 0),
            "timestamp": datetime.now(timezone.utc).isoformat()
        })
        
    except Exception as e:
        logger.error(f"Error in confidence analysis: {e}")
        return jsonify({
            "error": "Confidence analysis failed",
            "details": str(e),
            "timestamp": datetime.now(timezone.utc).isoformat()
        }), 500


@multimodel_bp.route('/strategist/<ward>', methods=['GET'])
@login_required
def enhanced_strategist_analysis(ward):
    """
    Enhanced strategist analysis using multi-model orchestration.
    
    URL Parameters:
    - ward: Ward name for analysis
    
    Query Parameters:
    - depth: Analysis depth (quick|standard|deep) - default: standard
    - context: Strategic context (defensive|neutral|offensive) - default: neutral
    - query: Custom analysis query (optional)
    - enable_consensus: Enable multi-model consensus (true|false) - default: false
    
    Returns:
        Enhanced political analysis with confidence scoring
    """
    try:
        ward = ward.strip()
        if not ward:
            return jsonify({"error": "Ward parameter is required"}), 400
        
        # Parse query parameters
        depth = request.args.get('depth', 'standard')
        if depth not in ['quick', 'standard', 'deep']:
            depth = 'standard'
        
        context_mode = request.args.get('context', 'neutral')
        if context_mode not in ['defensive', 'neutral', 'offensive']:
            context_mode = 'neutral'
        
        custom_query = request.args.get('query', '').strip()
        enable_consensus = request.args.get('enable_consensus', 'false').lower() == 'true'
        
        # Check budget for enhanced analysis
        estimated_cost = {'quick': 0.08, 'standard': 0.20, 'deep': 0.45}.get(depth, 0.20)
        if enable_consensus:
            estimated_cost += estimated_cost * 0.5
        
        if not asyncio.run(get_budget_manager().can_afford_request(estimated_cost)):
            return jsonify({
                "error": "Insufficient budget for enhanced strategist analysis",
                "estimated_cost_usd": estimated_cost,
                "suggestion": "Use legacy strategist endpoint or increase budget"
            }), 402
        
        # Generate enhanced analysis
        if enable_consensus:
            # Use strategic recommendation method for consensus
            situation = f"Current political landscape in {ward}"
            goal = "Comprehensive strategic intelligence and actionable insights"
            result = asyncio.run(get_strategist_adapter().strategic_recommendation(ward, situation, goal))
        else:
            # Use standard enhanced analysis
            result = asyncio.run(get_strategist_adapter().analyze_political_situation(
                ward, custom_query, depth, context_mode
            ))
        
        # Record usage
        if result.get("cost_usd", 0) > 0:
            asyncio.run(get_budget_manager().record_spend(
                result["cost_usd"],
                result.get("provider", "unknown"),
                "enhanced_strategist"
            ))
        
        logger.info(f"Enhanced strategist analysis completed for {ward} by user {current_user.id}")
        
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"Enhanced strategist analysis failed for {ward}: {e}")
        return jsonify({
            "error": "Enhanced strategist analysis failed",
            "details": str(e),
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "fallback_suggestion": "Try legacy /api/v1/strategist endpoint"
        }), 500


@multimodel_bp.route('/strategist/intelligence/<ward>', methods=['GET'])
@login_required
def quick_intelligence_brief(ward):
    """
    Quick intelligence briefing for urgent political developments.
    
    URL Parameters:
    - ward: Ward name for intelligence brief
    
    Query Parameters:
    - focus: Specific focus area (optional)
    
    Returns:
        Real-time intelligence brief with latest developments
    """
    try:
        ward = ward.strip()
        if not ward:
            return jsonify({"error": "Ward parameter is required"}), 400
        
        focus_area = request.args.get('focus', '').strip()
        
        # Check budget for real-time intelligence
        estimated_cost = 0.12  # Real-time data is more expensive
        if not asyncio.run(get_budget_manager().can_afford_request(estimated_cost)):
            return jsonify({
                "error": "Insufficient budget for real-time intelligence",
                "suggestion": "Increase budget or use cached analysis"
            }), 402
        
        # Generate intelligence brief
        brief = asyncio.run(get_strategist_adapter().quick_intelligence_brief(ward, focus_area))
        
        # Record usage
        if brief.get("cost_usd", 0) > 0:
            asyncio.run(get_budget_manager().record_spend(
                brief["cost_usd"],
                brief.get("source_model", "unknown"),
                "intelligence_brief"
            ))
        
        return jsonify(brief)
        
    except Exception as e:
        logger.error(f"Intelligence brief failed for {ward}: {e}")
        return jsonify({
            "error": "Intelligence brief failed", 
            "details": str(e),
            "timestamp": datetime.now(timezone.utc).isoformat()
        }), 500


@multimodel_bp.route('/system/status', methods=['GET'])
@login_required
def system_status():
    """
    Get multi-model AI system status and health metrics.
    
    Returns:
        System status including model availability, budget, and performance
    """
    try:
        # Get orchestrator status
        orchestrator_status = asyncio.run(get_orchestrator().get_system_status())
        
        # Get budget status
        budget_status = asyncio.run(get_budget_manager().get_current_status())
        
        # Get recent performance metrics
        recent_executions = db.session.query(AIModelExecution)\
            .filter(AIModelExecution.created_at >= datetime.now(timezone.utc).replace(hour=0, minute=0, second=0))\
            .count()
        
        # Check model configurations
        model_configs = {}
        for client_name in ['claude_client', 'perplexity_client', 'openai_client', 'gemini_client', 'llama_client']:
            try:
                client = getattr(get_orchestrator(), client_name)
                config = asyncio.run(client.get_model_info())
                model_configs[client_name.replace('_client', '')] = config
            except Exception as e:
                model_configs[client_name.replace('_client', '')] = {"error": str(e)}
        
        return jsonify({
            "system_status": "operational",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "orchestrator": orchestrator_status,
            "budget": budget_status,
            "model_configurations": model_configs,
            "daily_statistics": {
                "total_executions": recent_executions,
                "system_uptime": "24h",  # Could be calculated from app start time
            },
            "capabilities": [
                "multi_model_orchestration",
                "real_time_intelligence",
                "comprehensive_reports",
                "cost_optimization",
                "quality_validation"
            ]
        })
        
    except Exception as e:
        logger.error(f"Error getting system status: {e}")
        return jsonify({
            "error": "System status unavailable",
            "timestamp": datetime.now(timezone.utc).isoformat()
        }), 500


@multimodel_bp.route('/budget/status', methods=['GET'])
@login_required
def budget_status():
    """Get current budget status and usage metrics."""
    try:
        status = asyncio.run(get_budget_manager().get_current_status())
        forecast = asyncio.run(get_budget_manager().get_cost_forecast(7))
        optimizations = asyncio.run(get_budget_manager().optimize_costs())
        
        return jsonify({
            "current_status": status,
            "forecast": forecast,
            "optimizations": optimizations,
            "timestamp": datetime.now(timezone.utc).isoformat()
        })
        
    except Exception as e:
        logger.error(f"Error getting budget status: {e}")
        return jsonify({"error": "Budget status unavailable"}), 500


@multimodel_bp.route('/budget/optimize', methods=['POST'])
@login_required
def optimize_budget():
    """Trigger budget optimization analysis."""
    try:
        optimizations = asyncio.run(get_budget_manager().optimize_costs())
        
        return jsonify({
            "optimization_analysis": optimizations,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "status": "optimization_complete"
        })
        
    except Exception as e:
        logger.error(f"Error optimizing budget: {e}")
        return jsonify({"error": "Budget optimization failed"}), 500


@multimodel_bp.route('/reports/list', methods=['GET'])
@login_required
def list_reports():
    """
    List user's reports with filtering and pagination.
    
    Query Parameters:
    - page: Page number (default: 1)
    - per_page: Items per page (default: 20, max: 100)
    - status: Filter by status
    - ward: Filter by ward
    - days: Reports from last N days
    """
    try:
        page = int(request.args.get('page', 1))
        per_page = min(int(request.args.get('per_page', 20)), 100)
        status_filter = request.args.get('status')
        ward_filter = request.args.get('ward')
        days_filter = request.args.get('days')
        
        # Build query
        query = db.session.query(GeopoliticalReport)\
            .filter(GeopoliticalReport.user_id == current_user.id)
        
        if status_filter:
            query = query.filter(GeopoliticalReport.status == status_filter)
        
        if ward_filter:
            query = query.filter(GeopoliticalReport.ward_context.ilike(f'%{ward_filter}%'))
        
        if days_filter:
            cutoff = datetime.now(timezone.utc) - timedelta(days=int(days_filter))
            query = query.filter(GeopoliticalReport.requested_at >= cutoff)
        
        # Get paginated results
        paginated = query.order_by(GeopoliticalReport.requested_at.desc())\
            .paginate(page=page, per_page=per_page, error_out=False)
        
        # Format response
        reports = []
        for report in paginated.items:
            reports.append({
                "report_uuid": report.report_uuid,
                "query": report.query_text[:100] + "..." if len(report.query_text) > 100 else report.query_text,
                "ward_context": report.ward_context,
                "status": report.status,
                "analysis_depth": report.analysis_depth,
                "requested_at": report.requested_at.isoformat(),
                "completed_at": report.completed_at.isoformat() if report.completed_at else None,
                "confidence_score": report.confidence_score,
                "cost_usd": float(report.total_cost_usd or 0)
            })
        
        return jsonify({
            "reports": reports,
            "pagination": {
                "page": page,
                "per_page": per_page,
                "total": paginated.total,
                "pages": paginated.pages,
                "has_next": paginated.has_next,
                "has_prev": paginated.has_prev
            },
            "filters": {
                "status": status_filter,
                "ward": ward_filter,
                "days": days_filter
            }
        })
        
    except Exception as e:
        logger.error(f"Error listing reports: {e}")
        return jsonify({"error": "Failed to list reports"}), 500


def _estimate_report_cost(analysis_depth: str, strategic_context: str) -> float:
    """Estimate cost for report generation based on parameters."""
    
    base_costs = {
        "quick": 0.15,
        "standard": 0.35,
        "deep": 0.75
    }
    
    context_multipliers = {
        "defensive": 1.0,
        "neutral": 1.1,
        "offensive": 1.2
    }
    
    base_cost = base_costs.get(analysis_depth, 0.35)
    multiplier = context_multipliers.get(strategic_context, 1.1)
    
    return base_cost * multiplier


@multimodel_bp.errorhandler(404)
def not_found(error):
    """Handle 404 errors for multi-model endpoints."""
    return jsonify({
        "error": "Multi-model endpoint not found",
        "available_endpoints": [
            "/api/v1/multimodel/reports [POST]",
            "/api/v1/multimodel/reports/<uuid> [GET]",
            "/api/v1/multimodel/analyze [POST]",
            "/api/v1/multimodel/analyze/confidence [POST]",
            "/api/v1/multimodel/strategist/<ward> [GET]",
            "/api/v1/multimodel/strategist/intelligence/<ward> [GET]",
            "/api/v1/multimodel/system/status [GET]",
            "/api/v1/multimodel/budget/status [GET]"
        ]
    }), 404


@multimodel_bp.errorhandler(500)
def internal_error(error):
    """Handle 500 errors for multi-model endpoints."""
    logger.error(f"Internal error in multi-model API: {error}")
    return jsonify({
        "error": "Internal multi-model system error",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "support": "Check system logs for details"
    }), 500