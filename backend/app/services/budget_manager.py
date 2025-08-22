"""
Budget Management System for Multi-Model AI Services

Provides comprehensive budget tracking, cost optimization, and automated
controls to ensure AI service spending stays within allocated limits.
Includes real-time monitoring, circuit breakers, and cost forecasting.
"""

import logging
import json
from datetime import datetime, timezone, timedelta
from typing import Dict, List, Optional, Any, Tuple
from decimal import Decimal
from dataclasses import dataclass
from enum import Enum

from sqlalchemy import and_, desc, func
from flask import current_app

from ..models import BudgetTracker, AIModelExecution, db
from ..extensions import redis_client

logger = logging.getLogger(__name__)


class BudgetStatus(Enum):
    """Budget status levels."""
    NORMAL = "normal"          # 0-70% usage
    WARNING = "warning"        # 70-85% usage  
    CRITICAL = "critical"      # 85-95% usage
    EXCEEDED = "exceeded"      # >95% usage


@dataclass
class BudgetAlert:
    """Budget alert information."""
    status: BudgetStatus
    current_usage_percent: float
    remaining_budget_usd: float
    projected_overage: float
    recommendation: str
    alert_level: str


class BudgetManager:
    """
    Comprehensive budget management for multi-model AI system.
    
    Features:
    - Real-time budget tracking across all AI services
    - Automated circuit breakers to prevent overspending
    - Cost forecasting and optimization recommendations
    - Service-specific budget allocation and monitoring
    - Alert system for budget thresholds
    """
    
    def __init__(self):
        # Budget configuration
        self.config = {
            "monthly_budget_usd": float(current_app.config.get('AI_MONTHLY_BUDGET', 325.0)),
            "daily_budget_usd": float(current_app.config.get('AI_DAILY_BUDGET', 12.0)),
            "alert_thresholds": {
                "warning": 0.70,    # 70%
                "critical": 0.85,   # 85%
                "exceeded": 0.95    # 95%
            },
            "circuit_breaker_threshold": 0.95,  # Stop at 95%
            "cost_optimization_threshold": 0.60,  # Optimize at 60%
            "service_allocations": {
                "claude": 0.40,      # 40% for primary analysis
                "perplexity": 0.25,  # 25% for real-time search
                "openai": 0.25,      # 25% for embeddings
                "llama_local": 0.10  # 10% for fallback compute costs
            }
        }
        
        # Cache keys for frequent lookups
        self.cache_keys = {
            "current_budget": "budget:current",
            "daily_spend": "budget:daily_spend",
            "circuit_breaker": "budget:circuit_breaker",
            "last_alert": "budget:last_alert"
        }

    async def can_afford_request(self, estimated_cost_usd: float, 
                                service: str = "unknown") -> bool:
        """
        Check if a request can be afforded within current budget constraints.
        
        Args:
            estimated_cost_usd: Estimated cost of the request
            service: AI service name (claude, perplexity, openai, llama_local)
            
        Returns:
            True if request can be afforded, False otherwise
        """
        
        try:
            # Check circuit breaker status
            if await self._is_circuit_breaker_active():
                logger.warning("Budget circuit breaker active - rejecting request")
                return False
            
            # Get current budget status
            current_status = await self.get_current_status()
            
            # Check if adding this cost would exceed limits
            projected_total = current_status["current_spend_usd"] + estimated_cost_usd
            budget_limit = current_status["total_budget_usd"]
            
            projected_usage = projected_total / budget_limit
            
            # Reject if would exceed circuit breaker threshold
            if projected_usage > self.config["circuit_breaker_threshold"]:
                logger.warning(f"Request would exceed budget limit: {projected_usage:.1%}")
                await self._activate_circuit_breaker(f"Request would exceed {projected_usage:.1%}")
                return False
            
            # Check service-specific allocation if available
            if service in self.config["service_allocations"]:
                service_budget = budget_limit * self.config["service_allocations"][service]
                service_spend = await self._get_service_spend(service)
                
                if service_spend + estimated_cost_usd > service_budget * 1.1:  # 10% buffer
                    logger.warning(f"{service} service budget would be exceeded")
                    return False
            
            return True
            
        except Exception as e:
            logger.error(f"Budget check error: {e}")
            # Default to allow if budget check fails (graceful degradation)
            return True

    async def record_spend(self, cost_usd: float, service: str, 
                          operation_type: str = "unknown", 
                          metadata: Dict[str, Any] = None) -> None:
        """
        Record spending and update budget tracking.
        
        Args:
            cost_usd: Amount spent in USD
            service: AI service name
            operation_type: Type of operation (analysis, embedding, search)
            metadata: Additional spending metadata
        """
        
        try:
            # Update current budget tracker
            current_tracker = await self._get_or_create_current_tracker()
            
            # Update spending totals
            current_tracker.current_spend_usd += Decimal(str(cost_usd))
            current_tracker.request_count += 1
            current_tracker.successful_requests += 1
            
            # Update service breakdown
            spend_by_service = current_tracker.spend_by_service or {}
            spend_by_service[service] = spend_by_service.get(service, 0) + cost_usd
            current_tracker.spend_by_service = spend_by_service
            
            # Update operation breakdown
            spend_by_operation = current_tracker.spend_by_operation or {}
            spend_by_operation[operation_type] = spend_by_operation.get(operation_type, 0) + cost_usd
            current_tracker.spend_by_operation = spend_by_operation
            
            # Update budget status
            usage_percent = float(current_tracker.current_spend_usd / current_tracker.total_budget_usd * 100)
            
            if usage_percent >= 95:
                current_tracker.budget_status = BudgetStatus.EXCEEDED.value
            elif usage_percent >= 85:
                current_tracker.budget_status = BudgetStatus.CRITICAL.value
            elif usage_percent >= 70:
                current_tracker.budget_status = BudgetStatus.WARNING.value
            else:
                current_tracker.budget_status = BudgetStatus.NORMAL.value
            
            # Save changes
            db.session.commit()
            
            # Update cached values
            await self._update_cache(current_tracker)
            
            # Check if alerts needed
            await self._check_and_send_alerts(current_tracker)
            
            logger.debug(f"Recorded spend: ${cost_usd:.4f} for {service}")
            
        except Exception as e:
            logger.error(f"Error recording spend: {e}")
            db.session.rollback()

    async def record_failed_request(self, service: str, error: str) -> None:
        """Record a failed request for budget tracking."""
        
        try:
            current_tracker = await self._get_or_create_current_tracker()
            current_tracker.request_count += 1
            current_tracker.failed_requests += 1
            
            db.session.commit()
            
            logger.debug(f"Recorded failed request for {service}: {error}")
            
        except Exception as e:
            logger.error(f"Error recording failed request: {e}")
            db.session.rollback()

    async def get_current_status(self) -> Dict[str, Any]:
        """Get current budget status and metrics."""
        
        try:
            current_tracker = await self._get_or_create_current_tracker()
            
            # Calculate key metrics
            usage_percent = float(current_tracker.current_spend_usd / current_tracker.total_budget_usd * 100)
            remaining_budget = float(current_tracker.total_budget_usd - current_tracker.current_spend_usd)
            
            # Calculate efficiency metrics
            success_rate = (current_tracker.successful_requests / 
                          max(current_tracker.request_count, 1))
            
            avg_cost_per_request = (float(current_tracker.current_spend_usd) / 
                                  max(current_tracker.successful_requests, 1))
            
            # Service breakdown
            service_breakdown = {}
            if current_tracker.spend_by_service:
                for service, spend in current_tracker.spend_by_service.items():
                    allocated = (self.config["service_allocations"].get(service, 0) * 
                               float(current_tracker.total_budget_usd))
                    service_breakdown[service] = {
                        "spent_usd": spend,
                        "allocated_usd": allocated,
                        "usage_percent": (spend / allocated * 100) if allocated > 0 else 0
                    }
            
            return {
                "period_type": current_tracker.period_type,
                "period_start": current_tracker.period_start.isoformat(),
                "period_end": current_tracker.period_end.isoformat(),
                "total_budget_usd": float(current_tracker.total_budget_usd),
                "current_spend_usd": float(current_tracker.current_spend_usd),
                "remaining_budget_usd": remaining_budget,
                "usage_percent": usage_percent,
                "budget_status": current_tracker.budget_status,
                "request_count": current_tracker.request_count,
                "successful_requests": current_tracker.successful_requests,
                "failed_requests": current_tracker.failed_requests,
                "success_rate": success_rate,
                "avg_cost_per_request": avg_cost_per_request,
                "service_breakdown": service_breakdown,
                "operation_breakdown": current_tracker.spend_by_operation or {},
                "circuit_breaker_active": current_tracker.circuit_breaker_active,
                "last_updated": current_tracker.updated_at.isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error getting budget status: {e}")
            return self._get_default_status()

    async def get_cost_forecast(self, days_ahead: int = 7) -> Dict[str, Any]:
        """Generate cost forecast based on current usage patterns."""
        
        try:
            # Get recent spending trends
            recent_executions = db.session.query(AIModelExecution)\
                .filter(AIModelExecution.created_at >= datetime.now(timezone.utc) - timedelta(days=7))\
                .all()
            
            if not recent_executions:
                return {"forecast": "insufficient_data"}
            
            # Calculate daily average spending
            daily_costs = {}
            for execution in recent_executions:
                day = execution.created_at.date()
                cost = float(execution.cost_usd or 0)
                daily_costs[day] = daily_costs.get(day, 0) + cost
            
            avg_daily_spend = sum(daily_costs.values()) / len(daily_costs)
            
            # Project forward
            current_status = await self.get_current_status()
            current_spend = current_status["current_spend_usd"]
            
            projected_spend = current_spend + (avg_daily_spend * days_ahead)
            budget_limit = current_status["total_budget_usd"]
            
            # Calculate overage risk
            overage_risk = max(0, projected_spend - budget_limit)
            overage_percent = (overage_risk / budget_limit * 100) if overage_risk > 0 else 0
            
            # Generate recommendations
            recommendations = []
            if projected_spend > budget_limit * 0.9:
                recommendations.append("Consider enabling cost optimization mode")
            if overage_risk > 0:
                recommendations.append(f"Projected overage of ${overage_risk:.2f}")
                recommendations.append("Review service allocations and usage patterns")
            
            return {
                "forecast_days": days_ahead,
                "avg_daily_spend": round(avg_daily_spend, 4),
                "projected_total_spend": round(projected_spend, 2),
                "budget_limit": budget_limit,
                "projected_overage": round(overage_risk, 2),
                "overage_percent": round(overage_percent, 1),
                "recommendations": recommendations,
                "confidence": "medium" if len(daily_costs) >= 5 else "low"
            }
            
        except Exception as e:
            logger.error(f"Error generating cost forecast: {e}")
            return {"forecast": "error", "error": str(e)}

    async def optimize_costs(self) -> Dict[str, Any]:
        """Analyze spending and suggest cost optimizations."""
        
        try:
            current_status = await self.get_current_status()
            
            # Get recent executions for analysis
            recent_executions = db.session.query(AIModelExecution)\
                .filter(AIModelExecution.created_at >= datetime.now(timezone.utc) - timedelta(days=7))\
                .all()
            
            optimizations = []
            
            # Analyze service usage efficiency
            service_breakdown = current_status.get("service_breakdown", {})
            
            for service, metrics in service_breakdown.items():
                usage_percent = metrics.get("usage_percent", 0)
                
                if usage_percent > 90:
                    optimizations.append({
                        "type": "service_budget",
                        "service": service,
                        "message": f"{service} is at {usage_percent:.1f}% of allocation",
                        "recommendation": "Consider increasing allocation or optimizing usage"
                    })
            
            # Analyze model efficiency
            provider_costs = {}
            provider_requests = {}
            
            for execution in recent_executions:
                provider = execution.provider
                cost = float(execution.cost_usd or 0)
                
                provider_costs[provider] = provider_costs.get(provider, 0) + cost
                provider_requests[provider] = provider_requests.get(provider, 0) + 1
            
            # Find expensive providers
            for provider, total_cost in provider_costs.items():
                avg_cost = total_cost / provider_requests.get(provider, 1)
                
                if avg_cost > 0.10:  # $0.10 per request threshold
                    optimizations.append({
                        "type": "model_efficiency",
                        "provider": provider,
                        "message": f"{provider} has high average cost: ${avg_cost:.4f}/request",
                        "recommendation": "Consider using more cost-effective models or caching"
                    })
            
            # Cache hit ratio analysis
            cached_executions = [e for e in recent_executions 
                               if e.request_metadata and e.request_metadata.get("cached")]
            
            cache_hit_ratio = len(cached_executions) / max(len(recent_executions), 1)
            
            if cache_hit_ratio < 0.3:  # Less than 30% cache hits
                optimizations.append({
                    "type": "caching",
                    "message": f"Low cache hit ratio: {cache_hit_ratio:.1%}",
                    "recommendation": "Increase cache TTL or improve cache key strategies"
                })
            
            # Overall recommendations
            overall_recommendations = []
            
            if current_status["usage_percent"] > 80:
                overall_recommendations.append("Enable aggressive cost optimization mode")
                overall_recommendations.append("Increase cache TTL to reduce API calls")
                overall_recommendations.append("Review query complexity and optimization opportunities")
            
            return {
                "current_usage_percent": current_status["usage_percent"],
                "optimization_opportunities": optimizations,
                "cache_hit_ratio": cache_hit_ratio,
                "overall_recommendations": overall_recommendations,
                "potential_savings": self._calculate_potential_savings(optimizations)
            }
            
        except Exception as e:
            logger.error(f"Error analyzing cost optimizations: {e}")
            return {"error": str(e)}

    async def _get_or_create_current_tracker(self) -> BudgetTracker:
        """Get or create current period budget tracker."""
        
        now = datetime.now(timezone.utc)
        
        # Check for existing monthly tracker
        current_tracker = db.session.query(BudgetTracker)\
            .filter(
                and_(
                    BudgetTracker.period_type == 'monthly',
                    BudgetTracker.period_start <= now,
                    BudgetTracker.period_end >= now
                )
            )\
            .first()
        
        if current_tracker:
            return current_tracker
        
        # Create new monthly tracker
        start_of_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        
        if now.month == 12:
            end_of_month = start_of_month.replace(year=now.year + 1, month=1) - timedelta(seconds=1)
        else:
            end_of_month = start_of_month.replace(month=now.month + 1) - timedelta(seconds=1)
        
        new_tracker = BudgetTracker(
            period_type='monthly',
            period_start=start_of_month,
            period_end=end_of_month,
            total_budget_usd=Decimal(str(self.config["monthly_budget_usd"])),
            allocated_by_service=self.config["service_allocations"],
            current_spend_usd=Decimal('0.0'),
            spend_by_service={},
            spend_by_operation={},
            budget_status=BudgetStatus.NORMAL.value,
            alert_thresholds=self.config["alert_thresholds"],
            circuit_breaker_active=False
        )
        
        db.session.add(new_tracker)
        db.session.commit()
        
        logger.info(f"Created new monthly budget tracker: ${self.config['monthly_budget_usd']}")
        
        return new_tracker

    async def _get_service_spend(self, service: str) -> float:
        """Get current spending for a specific service."""
        
        try:
            current_tracker = await self._get_or_create_current_tracker()
            spend_by_service = current_tracker.spend_by_service or {}
            return spend_by_service.get(service, 0.0)
            
        except Exception as e:
            logger.error(f"Error getting service spend: {e}")
            return 0.0

    async def _is_circuit_breaker_active(self) -> bool:
        """Check if budget circuit breaker is active."""
        
        try:
            # Check cache first
            cached_status = await redis_client.get(self.cache_keys["circuit_breaker"])
            if cached_status:
                return json.loads(cached_status)
            
            # Check database
            current_tracker = await self._get_or_create_current_tracker()
            return current_tracker.circuit_breaker_active
            
        except Exception as e:
            logger.error(f"Error checking circuit breaker: {e}")
            return False

    async def _activate_circuit_breaker(self, reason: str) -> None:
        """Activate budget circuit breaker."""
        
        try:
            current_tracker = await self._get_or_create_current_tracker()
            current_tracker.circuit_breaker_active = True
            
            db.session.commit()
            
            # Update cache
            await redis_client.setex(self.cache_keys["circuit_breaker"], 3600, json.dumps(True))
            
            logger.critical(f"Budget circuit breaker activated: {reason}")
            
            # Send alert
            await self._send_circuit_breaker_alert(reason)
            
        except Exception as e:
            logger.error(f"Error activating circuit breaker: {e}")

    async def _update_cache(self, tracker: BudgetTracker) -> None:
        """Update cached budget information."""
        
        try:
            cache_data = {
                "current_spend": float(tracker.current_spend_usd),
                "total_budget": float(tracker.total_budget_usd),
                "usage_percent": float(tracker.current_spend_usd / tracker.total_budget_usd * 100),
                "status": tracker.budget_status,
                "updated_at": tracker.updated_at.isoformat()
            }
            
            await redis_client.setex(
                self.cache_keys["current_budget"], 
                300,  # 5 minute cache
                json.dumps(cache_data)
            )
            
        except Exception as e:
            logger.warning(f"Cache update error: {e}")

    async def _check_and_send_alerts(self, tracker: BudgetTracker) -> None:
        """Check if budget alerts should be sent."""
        
        try:
            usage_percent = float(tracker.current_spend_usd / tracker.total_budget_usd)
            
            # Determine alert level
            alert_level = None
            if usage_percent >= self.config["alert_thresholds"]["exceeded"]:
                alert_level = "exceeded"
            elif usage_percent >= self.config["alert_thresholds"]["critical"]:
                alert_level = "critical"
            elif usage_percent >= self.config["alert_thresholds"]["warning"]:
                alert_level = "warning"
            
            if alert_level:
                # Check if alert already sent recently
                last_alert_key = f"{self.cache_keys['last_alert']}:{alert_level}"
                last_alert = await redis_client.get(last_alert_key)
                
                if not last_alert:
                    await self._send_budget_alert(tracker, alert_level, usage_percent)
                    
                    # Cache alert to prevent spam (1 hour)
                    await redis_client.setex(last_alert_key, 3600, datetime.now(timezone.utc).isoformat())
                    
        except Exception as e:
            logger.error(f"Error checking alerts: {e}")

    async def _send_budget_alert(self, tracker: BudgetTracker, level: str, usage_percent: float) -> None:
        """Send budget alert notification."""
        
        try:
            remaining = float(tracker.total_budget_usd - tracker.current_spend_usd)
            
            alert_message = f"""
Budget Alert: {level.upper()}

Current Usage: {usage_percent:.1%} of monthly budget
Remaining Budget: ${remaining:.2f}
Current Spend: ${float(tracker.current_spend_usd):.2f}
Total Budget: ${float(tracker.total_budget_usd):.2f}

Period: {tracker.period_start.date()} to {tracker.period_end.date()}
"""
            
            logger.warning(f"BUDGET ALERT [{level}]: {usage_percent:.1%} usage, ${remaining:.2f} remaining")
            
            # In production, this would integrate with alerting systems
            # For now, just log the alert
            
        except Exception as e:
            logger.error(f"Error sending budget alert: {e}")

    async def _send_circuit_breaker_alert(self, reason: str) -> None:
        """Send circuit breaker activation alert."""
        
        logger.critical(f"CIRCUIT BREAKER ACTIVATED: {reason}")
        
        # In production, this would send immediate notifications
        # to operations team and stakeholders

    def _calculate_potential_savings(self, optimizations: List[Dict[str, Any]]) -> Dict[str, float]:
        """Calculate potential cost savings from optimizations."""
        
        # This would implement more sophisticated savings calculations
        # For now, provide estimates based on optimization types
        
        savings = {
            "caching_improvements": 0.0,
            "model_optimization": 0.0,
            "service_reallocation": 0.0
        }
        
        for opt in optimizations:
            if opt["type"] == "caching":
                savings["caching_improvements"] += 10.0  # Estimated savings
            elif opt["type"] == "model_efficiency":
                savings["model_optimization"] += 5.0
            elif opt["type"] == "service_budget":
                savings["service_reallocation"] += 3.0
        
        savings["total_potential"] = sum(savings.values())
        
        return savings

    def _get_default_status(self) -> Dict[str, Any]:
        """Get default status when database unavailable."""
        
        return {
            "total_budget_usd": self.config["monthly_budget_usd"],
            "current_spend_usd": 0.0,
            "remaining_budget_usd": self.config["monthly_budget_usd"],
            "usage_percent": 0.0,
            "budget_status": BudgetStatus.NORMAL.value,
            "circuit_breaker_active": False,
            "error": "Unable to retrieve budget status"
        }


# Global budget manager instance - lazy initialization
budget_manager = None

def get_budget_manager():
    """Get the global budget manager instance, creating it if needed."""
    global budget_manager
    if budget_manager is None:
        budget_manager = BudgetManager()
    return budget_manager