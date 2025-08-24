"""
LokDarpan Error Intelligence System

Advanced error categorization, priority scoring, and resolution recommendation
system that provides strategic insights for development and operations teams.
"""

import re
import time
import hashlib
import logging
from datetime import datetime, timezone, timedelta
from typing import Dict, List, Optional, Any, Tuple, Set
from dataclasses import dataclass, asdict
from collections import defaultdict, Counter
from enum import Enum
import json

# Optional machine learning imports
ML_AVAILABLE = False
try:
    import numpy as np
    from sklearn.feature_extraction.text import TfidfVectorizer
    from sklearn.cluster import KMeans
    from sklearn.metrics.pairwise import cosine_similarity
    ML_AVAILABLE = True
except ImportError:
    pass

from .error_tracking import ErrorSeverity, ErrorCategory

class PriorityLevel(Enum):
    """Error priority levels for resolution planning."""
    P0_CRITICAL = "P0_critical"      # System down, immediate response
    P1_HIGH = "P1_high"              # Major functionality broken, <4h response
    P2_MEDIUM = "P2_medium"          # Feature impact, <24h response
    P3_LOW = "P3_low"                # Minor issues, <7d response
    P4_BACKLOG = "P4_backlog"        # Technical debt, planned work

class ResolutionComplexity(Enum):
    """Estimated resolution complexity levels."""
    TRIVIAL = "trivial"              # <2 hours
    SIMPLE = "simple"                # 2-8 hours
    MODERATE = "moderate"            # 1-3 days
    COMPLEX = "complex"              # 1-2 weeks
    EPIC = "epic"                    # >2 weeks

class BusinessImpact(Enum):
    """Business impact classification."""
    CRITICAL = "critical"            # Revenue/user safety impact
    HIGH = "high"                    # Major user experience degradation
    MEDIUM = "medium"                # Feature limitations
    LOW = "low"                      # Minor inconvenience
    NONE = "none"                    # Internal/development only

@dataclass
class ErrorIntelligence:
    """Comprehensive error intelligence analysis."""
    error_id: str
    category: ErrorCategory
    severity: ErrorSeverity
    priority: PriorityLevel
    complexity: ResolutionComplexity
    business_impact: BusinessImpact
    
    # Analysis metrics
    frequency_score: float           # How often this error occurs
    trend_score: float              # Error frequency trend (increasing/decreasing)
    user_impact_score: float        # Estimated user impact
    system_stability_score: float   # Impact on system stability
    
    # Resolution information
    estimated_resolution_time: float  # Hours
    required_expertise: List[str]     # Required skills/expertise
    resolution_confidence: float      # Confidence in automated suggestions
    
    # Strategic insights
    root_cause_category: str
    prevention_suggestions: List[str]
    monitoring_recommendations: List[str]
    
    # Metadata
    analysis_timestamp: datetime
    confidence_score: float          # Overall analysis confidence
    similar_errors: List[str]        # Similar error IDs

class ErrorIntelligenceEngine:
    """
    Advanced error intelligence engine that provides:
    - Automated error categorization and priority scoring
    - Root cause analysis and resolution recommendations
    - Strategic insights for prevention and system improvement
    - Trend analysis and predictive capabilities
    """
    
    def __init__(self):
        self.logger = logging.getLogger('lokdarpan.error_intelligence')
        
        # Analysis models and data
        self.error_patterns = {}
        self.resolution_history = {}
        self.expertise_mapping = self._initialize_expertise_mapping()
        
        # ML components for pattern recognition (optional)
        if ML_AVAILABLE:
            self.tfidf_vectorizer = TfidfVectorizer(
                max_features=1000,
                stop_words='english',
                ngram_range=(1, 3)
            )
            self.error_clusters = None
        else:
            self.tfidf_vectorizer = None
            self.error_clusters = None
        
        # Business impact rules
        self.business_rules = self._initialize_business_rules()
        
        # Performance thresholds
        self.performance_thresholds = {
            'response_time': {'critical': 5000, 'high': 2000, 'medium': 1000},
            'error_rate': {'critical': 10.0, 'high': 5.0, 'medium': 1.0},
            'user_impact': {'critical': 1000, 'high': 100, 'medium': 10}
        }
    
    def analyze_error(self, error_data: Dict[str, Any], historical_data: List[Dict[str, Any]] = None) -> ErrorIntelligence:
        """
        Perform comprehensive error intelligence analysis.
        
        Args:
            error_data: Current error information
            historical_data: Related historical errors for pattern analysis
            
        Returns:
            Complete error intelligence analysis
        """
        start_time = time.time()
        
        try:
            # Extract basic information
            error_id = error_data.get('id', 'unknown')
            category = ErrorCategory(error_data.get('category', 'unknown'))
            severity = ErrorSeverity(error_data.get('severity', 'medium'))
            
            # Analyze error patterns
            frequency_analysis = self._analyze_frequency_patterns(error_data, historical_data or [])
            trend_analysis = self._analyze_trend_patterns(error_data, historical_data or [])
            impact_analysis = self._analyze_impact_patterns(error_data)
            
            # Determine priority and complexity
            priority = self._calculate_priority(error_data, frequency_analysis, impact_analysis)
            complexity = self._estimate_complexity(error_data, category)
            business_impact = self._assess_business_impact(error_data, impact_analysis)
            
            # Resolution analysis
            resolution_time = self._estimate_resolution_time(complexity, category)
            expertise = self._determine_required_expertise(error_data, category)
            confidence = self._calculate_resolution_confidence(error_data, historical_data or [])
            
            # Strategic insights
            root_cause = self._analyze_root_cause(error_data, historical_data or [])
            prevention = self._generate_prevention_suggestions(error_data, root_cause)
            monitoring = self._generate_monitoring_recommendations(error_data, category)
            
            # Find similar errors
            similar_errors = self._find_similar_errors(error_data, historical_data or [])
            
            # Calculate overall confidence
            analysis_confidence = self._calculate_analysis_confidence(
                frequency_analysis, trend_analysis, impact_analysis, len(historical_data or [])
            )
            
            intelligence = ErrorIntelligence(
                error_id=error_id,
                category=category,
                severity=severity,
                priority=priority,
                complexity=complexity,
                business_impact=business_impact,
                
                frequency_score=frequency_analysis['score'],
                trend_score=trend_analysis['score'],
                user_impact_score=impact_analysis['user_impact'],
                system_stability_score=impact_analysis['system_stability'],
                
                estimated_resolution_time=resolution_time,
                required_expertise=expertise,
                resolution_confidence=confidence,
                
                root_cause_category=root_cause,
                prevention_suggestions=prevention,
                monitoring_recommendations=monitoring,
                
                analysis_timestamp=datetime.now(timezone.utc),
                confidence_score=analysis_confidence,
                similar_errors=similar_errors
            )
            
            # Log analysis performance
            analysis_duration = time.time() - start_time
            self.logger.info(f"Error intelligence analysis completed for {error_id} in {analysis_duration:.2f}s")
            
            return intelligence
        
        except Exception as e:
            self.logger.error(f"Error intelligence analysis failed: {e}")
            # Return minimal intelligence on failure
            return self._create_fallback_intelligence(error_data)
    
    def _analyze_frequency_patterns(self, error_data: Dict[str, Any], historical_data: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Analyze error frequency patterns."""
        try:
            error_message = error_data.get('message', '')
            component = error_data.get('component', '')
            
            # Count similar errors in historical data
            similar_count = 0
            recent_count = 0
            now = datetime.now(timezone.utc)
            
            for hist_error in historical_data:
                hist_message = hist_error.get('message', '')
                hist_component = hist_error.get('component', '')
                
                # Check similarity (simple string matching)
                if (self._calculate_text_similarity(error_message, hist_message) > 0.7 and
                    component == hist_component):
                    similar_count += 1
                    
                    # Check if recent (last 24 hours)
                    hist_timestamp = hist_error.get('timestamp')
                    if hist_timestamp:
                        try:
                            hist_time = datetime.fromisoformat(hist_timestamp.replace('Z', '+00:00'))
                            if (now - hist_time).total_seconds() < 86400:  # 24 hours
                                recent_count += 1
                        except:
                            pass
            
            # Calculate frequency score (0-1 scale)
            total_errors = len(historical_data)
            frequency_rate = similar_count / max(total_errors, 1)
            recent_rate = recent_count / max(similar_count, 1) if similar_count > 0 else 0
            
            # Combined frequency score
            frequency_score = min(frequency_rate * 2 + recent_rate * 0.5, 1.0)
            
            return {
                'score': frequency_score,
                'similar_count': similar_count,
                'recent_count': recent_count,
                'total_historical': total_errors
            }
        
        except Exception as e:
            self.logger.warning(f"Frequency analysis failed: {e}")
            return {'score': 0.5, 'similar_count': 0, 'recent_count': 0, 'total_historical': 0}
    
    def _analyze_trend_patterns(self, error_data: Dict[str, Any], historical_data: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Analyze error trend patterns (increasing/decreasing frequency)."""
        try:
            error_message = error_data.get('message', '')
            component = error_data.get('component', '')
            
            # Group similar errors by time periods
            now = datetime.now(timezone.utc)
            periods = {
                'last_hour': [],
                'last_6_hours': [],
                'last_24_hours': [],
                'last_week': []
            }
            
            for hist_error in historical_data:
                hist_message = hist_error.get('message', '')
                hist_component = hist_error.get('component', '')
                
                if (self._calculate_text_similarity(error_message, hist_message) > 0.7 and
                    component == hist_component):
                    
                    hist_timestamp = hist_error.get('timestamp')
                    if hist_timestamp:
                        try:
                            hist_time = datetime.fromisoformat(hist_timestamp.replace('Z', '+00:00'))
                            time_diff = (now - hist_time).total_seconds()
                            
                            if time_diff < 3600:  # 1 hour
                                periods['last_hour'].append(hist_error)
                            if time_diff < 21600:  # 6 hours
                                periods['last_6_hours'].append(hist_error)
                            if time_diff < 86400:  # 24 hours
                                periods['last_24_hours'].append(hist_error)
                            if time_diff < 604800:  # 1 week
                                periods['last_week'].append(hist_error)
                        except:
                            pass
            
            # Calculate trend score
            counts = [len(periods[p]) for p in ['last_hour', 'last_6_hours', 'last_24_hours', 'last_week']]
            
            if sum(counts) == 0:
                trend_score = 0.0
            else:
                # Simple trend calculation: more recent errors = higher trend score
                weighted_sum = counts[0] * 4 + counts[1] * 2 + counts[2] * 1 + counts[3] * 0.5
                max_possible = sum(counts) * 4
                trend_score = weighted_sum / max_possible if max_possible > 0 else 0
            
            return {
                'score': trend_score,
                'trend_direction': 'increasing' if trend_score > 0.6 else 'stable' if trend_score > 0.3 else 'decreasing',
                'period_counts': {k: len(v) for k, v in periods.items()}
            }
        
        except Exception as e:
            self.logger.warning(f"Trend analysis failed: {e}")
            return {'score': 0.5, 'trend_direction': 'stable', 'period_counts': {}}
    
    def _analyze_impact_patterns(self, error_data: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze error impact on users and system stability."""
        try:
            severity = ErrorSeverity(error_data.get('severity', 'medium'))
            category = ErrorCategory(error_data.get('category', 'unknown'))
            component = error_data.get('component', '')
            context = error_data.get('context', {})
            
            # Base impact scores
            severity_impact = {
                ErrorSeverity.CRITICAL: 1.0,
                ErrorSeverity.HIGH: 0.8,
                ErrorSeverity.MEDIUM: 0.5,
                ErrorSeverity.LOW: 0.2,
                ErrorSeverity.INFO: 0.1
            }.get(severity, 0.5)
            
            category_impact = {
                ErrorCategory.AUTHENTICATION: 0.9,
                ErrorCategory.SECURITY: 1.0,
                ErrorCategory.DATABASE: 0.8,
                ErrorCategory.API: 0.7,
                ErrorCategory.STRATEGIST: 0.6,
                ErrorCategory.UI_COMPONENT: 0.4,
                ErrorCategory.PERFORMANCE: 0.6,
                ErrorCategory.SSE_STREAMING: 0.5
            }.get(category, 0.3)
            
            # Component-specific impact
            component_impact = 0.5
            high_impact_components = ['auth', 'login', 'payment', 'strategist', 'dashboard']
            if any(comp in component.lower() for comp in high_impact_components):
                component_impact = 0.8
            
            # Context-based adjustments
            context_impact = 0.5
            if context:
                # Check for user-facing errors
                if any(key in context for key in ['user_id', 'session_id', 'frontend']):
                    context_impact += 0.2
                
                # Check for performance issues
                response_time = context.get('response_time', 0)
                if response_time > 5000:  # >5 seconds
                    context_impact += 0.3
                elif response_time > 2000:  # >2 seconds
                    context_impact += 0.1
            
            # Calculate composite scores
            user_impact = min((severity_impact + category_impact + context_impact) / 3, 1.0)
            system_stability = min((severity_impact + component_impact + category_impact) / 3, 1.0)
            
            return {
                'user_impact': user_impact,
                'system_stability': system_stability,
                'severity_factor': severity_impact,
                'category_factor': category_impact,
                'component_factor': component_impact,
                'context_factor': context_impact
            }
        
        except Exception as e:
            self.logger.warning(f"Impact analysis failed: {e}")
            return {'user_impact': 0.5, 'system_stability': 0.5}
    
    def _calculate_priority(self, error_data: Dict[str, Any], frequency: Dict[str, Any], impact: Dict[str, Any]) -> PriorityLevel:
        """Calculate error priority based on multiple factors."""
        try:
            severity = ErrorSeverity(error_data.get('severity', 'medium'))
            category = ErrorCategory(error_data.get('category', 'unknown'))
            
            # Base priority from severity
            severity_priority = {
                ErrorSeverity.CRITICAL: 4,
                ErrorSeverity.HIGH: 3,
                ErrorSeverity.MEDIUM: 2,
                ErrorSeverity.LOW: 1,
                ErrorSeverity.INFO: 0
            }.get(severity, 2)
            
            # Adjust for frequency
            frequency_score = frequency.get('score', 0)
            if frequency_score > 0.8:
                severity_priority += 2
            elif frequency_score > 0.5:
                severity_priority += 1
            
            # Adjust for impact
            user_impact = impact.get('user_impact', 0)
            system_impact = impact.get('system_stability', 0)
            
            if user_impact > 0.8 or system_impact > 0.8:
                severity_priority += 2
            elif user_impact > 0.5 or system_impact > 0.5:
                severity_priority += 1
            
            # Category-specific adjustments
            critical_categories = [ErrorCategory.SECURITY, ErrorCategory.AUTHENTICATION, ErrorCategory.DATABASE]
            if category in critical_categories:
                severity_priority += 1
            
            # Map to priority levels
            if severity_priority >= 7:
                return PriorityLevel.P0_CRITICAL
            elif severity_priority >= 5:
                return PriorityLevel.P1_HIGH
            elif severity_priority >= 3:
                return PriorityLevel.P2_MEDIUM
            elif severity_priority >= 1:
                return PriorityLevel.P3_LOW
            else:
                return PriorityLevel.P4_BACKLOG
        
        except Exception as e:
            self.logger.warning(f"Priority calculation failed: {e}")
            return PriorityLevel.P2_MEDIUM
    
    def _estimate_complexity(self, error_data: Dict[str, Any], category: ErrorCategory) -> ResolutionComplexity:
        """Estimate resolution complexity based on error characteristics."""
        try:
            message = error_data.get('message', '').lower()
            stack_trace = error_data.get('stack_trace', '')
            component = error_data.get('component', '').lower()
            
            # Base complexity by category
            category_complexity = {
                ErrorCategory.SECURITY: ResolutionComplexity.COMPLEX,
                ErrorCategory.AUTHENTICATION: ResolutionComplexity.MODERATE,
                ErrorCategory.DATABASE: ResolutionComplexity.MODERATE,
                ErrorCategory.STRATEGIST: ResolutionComplexity.COMPLEX,
                ErrorCategory.API: ResolutionComplexity.SIMPLE,
                ErrorCategory.UI_COMPONENT: ResolutionComplexity.SIMPLE,
                ErrorCategory.PERFORMANCE: ResolutionComplexity.MODERATE,
                ErrorCategory.SSE_STREAMING: ResolutionComplexity.MODERATE
            }.get(category, ResolutionComplexity.SIMPLE)
            
            # Adjust based on error characteristics
            complexity_score = list(ResolutionComplexity).index(category_complexity)
            
            # Increase complexity for certain patterns
            complex_patterns = [
                'race condition', 'deadlock', 'memory leak', 'concurrency',
                'distributed', 'async', 'timeout', 'network', 'security'
            ]
            
            if any(pattern in message for pattern in complex_patterns):
                complexity_score += 1
            
            # Increase complexity for deep stack traces
            if stack_trace and len(stack_trace.split('\n')) > 20:
                complexity_score += 1
            
            # Increase complexity for core components
            core_components = ['auth', 'database', 'security', 'strategist']
            if any(comp in component for comp in core_components):
                complexity_score += 1
            
            # Decrease complexity for simple patterns
            simple_patterns = ['validation', 'format', 'null', 'undefined', 'missing']
            if any(pattern in message for pattern in simple_patterns):
                complexity_score -= 1
            
            # Map to complexity levels
            complexity_score = max(0, min(complexity_score, len(ResolutionComplexity) - 1))
            return list(ResolutionComplexity)[complexity_score]
        
        except Exception as e:
            self.logger.warning(f"Complexity estimation failed: {e}")
            return ResolutionComplexity.MODERATE
    
    def _assess_business_impact(self, error_data: Dict[str, Any], impact_analysis: Dict[str, Any]) -> BusinessImpact:
        """Assess business impact of the error."""
        try:
            category = ErrorCategory(error_data.get('category', 'unknown'))
            severity = ErrorSeverity(error_data.get('severity', 'medium'))
            user_impact = impact_analysis.get('user_impact', 0)
            component = error_data.get('component', '').lower()
            
            # Critical business impact categories
            if category in [ErrorCategory.SECURITY, ErrorCategory.AUTHENTICATION]:
                return BusinessImpact.CRITICAL
            
            # High impact based on severity and user impact
            if severity == ErrorSeverity.CRITICAL or user_impact > 0.8:
                return BusinessImpact.HIGH
            
            # Check for revenue-impacting components
            revenue_components = ['payment', 'checkout', 'subscription', 'strategist']
            if any(comp in component for comp in revenue_components):
                return BusinessImpact.HIGH
            
            # Medium impact for user-facing issues
            if (category in [ErrorCategory.UI_COMPONENT, ErrorCategory.API] and 
                user_impact > 0.5):
                return BusinessImpact.MEDIUM
            
            # Low impact for performance and minor issues
            if category in [ErrorCategory.PERFORMANCE, ErrorCategory.CACHE]:
                return BusinessImpact.LOW
            
            # Default based on user impact
            if user_impact > 0.6:
                return BusinessImpact.MEDIUM
            elif user_impact > 0.3:
                return BusinessImpact.LOW
            else:
                return BusinessImpact.NONE
        
        except Exception as e:
            self.logger.warning(f"Business impact assessment failed: {e}")
            return BusinessImpact.MEDIUM
    
    def _estimate_resolution_time(self, complexity: ResolutionComplexity, category: ErrorCategory) -> float:
        """Estimate resolution time in hours."""
        base_times = {
            ResolutionComplexity.TRIVIAL: 1.0,
            ResolutionComplexity.SIMPLE: 4.0,
            ResolutionComplexity.MODERATE: 16.0,  # 2 days
            ResolutionComplexity.COMPLEX: 80.0,   # 2 weeks
            ResolutionComplexity.EPIC: 200.0      # 5 weeks
        }
        
        base_time = base_times.get(complexity, 16.0)
        
        # Adjust for category
        category_multipliers = {
            ErrorCategory.SECURITY: 1.5,
            ErrorCategory.DATABASE: 1.3,
            ErrorCategory.STRATEGIST: 1.4,
            ErrorCategory.UI_COMPONENT: 0.8,
            ErrorCategory.API: 0.9
        }
        
        multiplier = category_multipliers.get(category, 1.0)
        return base_time * multiplier
    
    def _determine_required_expertise(self, error_data: Dict[str, Any], category: ErrorCategory) -> List[str]:
        """Determine required expertise for resolution."""
        expertise = set()
        
        # Category-based expertise
        category_expertise = {
            ErrorCategory.SECURITY: ['security', 'backend'],
            ErrorCategory.AUTHENTICATION: ['backend', 'security'],
            ErrorCategory.DATABASE: ['backend', 'database'],
            ErrorCategory.API: ['backend'],
            ErrorCategory.UI_COMPONENT: ['frontend'],
            ErrorCategory.STRATEGIST: ['ai_ml', 'backend'],
            ErrorCategory.PERFORMANCE: ['backend', 'devops'],
            ErrorCategory.SSE_STREAMING: ['backend', 'frontend']
        }
        
        expertise.update(category_expertise.get(category, []))
        
        # Component-based expertise
        component = error_data.get('component', '').lower()
        if 'react' in component or 'jsx' in component:
            expertise.add('frontend')
        if 'python' in component or 'flask' in component:
            expertise.add('backend')
        if 'postgres' in component or 'sql' in component:
            expertise.add('database')
        if 'redis' in component:
            expertise.add('cache')
        if 'celery' in component:
            expertise.add('background_tasks')
        
        return list(expertise) if expertise else ['general']
    
    def _calculate_resolution_confidence(self, error_data: Dict[str, Any], historical_data: List[Dict[str, Any]]) -> float:
        """Calculate confidence in automated resolution suggestions."""
        try:
            # Base confidence factors
            factors = []
            
            # Historical data availability
            if len(historical_data) > 10:
                factors.append(0.8)
            elif len(historical_data) > 5:
                factors.append(0.6)
            else:
                factors.append(0.3)
            
            # Error message clarity
            message = error_data.get('message', '')
            if len(message) > 50 and any(keyword in message.lower() for keyword in ['error', 'failed', 'exception']):
                factors.append(0.7)
            else:
                factors.append(0.4)
            
            # Stack trace availability
            if error_data.get('stack_trace'):
                factors.append(0.8)
            else:
                factors.append(0.5)
            
            # Context richness
            context = error_data.get('context', {})
            if len(context) > 3:
                factors.append(0.7)
            else:
                factors.append(0.4)
            
            return sum(factors) / len(factors) if factors else 0.5
        
        except Exception as e:
            self.logger.warning(f"Confidence calculation failed: {e}")
            return 0.5
    
    def _analyze_root_cause(self, error_data: Dict[str, Any], historical_data: List[Dict[str, Any]]) -> str:
        """Analyze and categorize the root cause of the error."""
        try:
            message = error_data.get('message', '').lower()
            stack_trace = error_data.get('stack_trace', '').lower()
            component = error_data.get('component', '').lower()
            category = ErrorCategory(error_data.get('category', 'unknown'))
            
            # Pattern-based root cause analysis
            root_cause_patterns = {
                'configuration': ['config', 'setting', 'environment', 'missing variable'],
                'dependency': ['import', 'module not found', 'dependency', 'version'],
                'data_validation': ['validation', 'invalid', 'format', 'type error'],
                'resource_exhaustion': ['memory', 'timeout', 'limit', 'capacity'],
                'concurrency': ['race condition', 'deadlock', 'thread', 'async'],
                'external_service': ['connection', 'network', 'api', 'service unavailable'],
                'business_logic': ['logic', 'calculation', 'algorithm', 'business rule'],
                'user_input': ['input', 'parameter', 'request', 'validation'],
                'infrastructure': ['database', 'redis', 'server', 'deployment']
            }
            
            text_to_analyze = f"{message} {stack_trace} {component}"
            
            for root_cause, patterns in root_cause_patterns.items():
                if any(pattern in text_to_analyze for pattern in patterns):
                    return root_cause
            
            # Category-based fallback
            category_root_causes = {
                ErrorCategory.AUTHENTICATION: 'authentication_system',
                ErrorCategory.SECURITY: 'security_vulnerability',
                ErrorCategory.DATABASE: 'data_layer',
                ErrorCategory.API: 'service_layer',
                ErrorCategory.UI_COMPONENT: 'presentation_layer',
                ErrorCategory.PERFORMANCE: 'performance_optimization',
                ErrorCategory.STRATEGIST: 'ai_model_integration'
            }
            
            return category_root_causes.get(category, 'unknown')
        
        except Exception as e:
            self.logger.warning(f"Root cause analysis failed: {e}")
            return 'unknown'
    
    def _generate_prevention_suggestions(self, error_data: Dict[str, Any], root_cause: str) -> List[str]:
        """Generate prevention suggestions based on root cause analysis."""
        try:
            prevention_strategies = {
                'configuration': [
                    'Implement configuration validation on startup',
                    'Use environment-specific configuration files',
                    'Add configuration documentation and examples',
                    'Implement configuration testing in CI/CD'
                ],
                'dependency': [
                    'Pin dependency versions in requirements files',
                    'Use dependency vulnerability scanning',
                    'Implement dependency update testing',
                    'Document minimum version requirements'
                ],
                'data_validation': [
                    'Implement input validation at API boundaries',
                    'Add data type checking and sanitization',
                    'Create comprehensive validation test suite',
                    'Use schema validation libraries'
                ],
                'resource_exhaustion': [
                    'Implement resource monitoring and alerting',
                    'Add connection pooling and resource limits',
                    'Optimize memory usage and garbage collection',
                    'Implement graceful degradation strategies'
                ],
                'concurrency': [
                    'Review and test concurrent access patterns',
                    'Implement proper locking mechanisms',
                    'Use async/await patterns correctly',
                    'Add concurrency testing to test suite'
                ],
                'external_service': [
                    'Implement circuit breaker patterns',
                    'Add retry logic with exponential backoff',
                    'Monitor external service health',
                    'Implement fallback mechanisms'
                ],
                'business_logic': [
                    'Add comprehensive business logic tests',
                    'Implement business rule validation',
                    'Document business requirements clearly',
                    'Add edge case handling'
                ],
                'user_input': [
                    'Implement frontend input validation',
                    'Add server-side validation layers',
                    'Use proper input sanitization',
                    'Provide clear user error messages'
                ],
                'infrastructure': [
                    'Implement infrastructure monitoring',
                    'Add database query optimization',
                    'Use infrastructure as code',
                    'Implement automated failover'
                ]
            }
            
            suggestions = prevention_strategies.get(root_cause, [
                'Review error handling patterns',
                'Add comprehensive logging',
                'Implement monitoring and alerting',
                'Add unit and integration tests'
            ])
            
            # Add category-specific suggestions
            category = ErrorCategory(error_data.get('category', 'unknown'))
            if category == ErrorCategory.STRATEGIST:
                suggestions.extend([
                    'Implement AI model validation',
                    'Add model performance monitoring',
                    'Use model versioning and rollback'
                ])
            elif category == ErrorCategory.SECURITY:
                suggestions.extend([
                    'Conduct security code review',
                    'Implement security testing',
                    'Add security monitoring'
                ])
            
            return suggestions[:5]  # Return top 5 suggestions
        
        except Exception as e:
            self.logger.warning(f"Prevention suggestion generation failed: {e}")
            return ['Review error patterns and implement appropriate fixes']
    
    def _generate_monitoring_recommendations(self, error_data: Dict[str, Any], category: ErrorCategory) -> List[str]:
        """Generate monitoring recommendations."""
        try:
            base_recommendations = [
                'Add error rate monitoring for this component',
                'Implement response time alerting',
                'Set up log-based alerting for error patterns'
            ]
            
            category_recommendations = {
                ErrorCategory.API: [
                    'Monitor API endpoint response times',
                    'Track API error rates by endpoint',
                    'Implement SLA monitoring'
                ],
                ErrorCategory.DATABASE: [
                    'Monitor database connection pool usage',
                    'Track slow query performance',
                    'Set up database health checks'
                ],
                ErrorCategory.STRATEGIST: [
                    'Monitor AI model inference times',
                    'Track model prediction accuracy',
                    'Implement model drift detection'
                ],
                ErrorCategory.PERFORMANCE: [
                    'Add performance profiling',
                    'Monitor resource utilization trends',
                    'Implement performance regression testing'
                ],
                ErrorCategory.SECURITY: [
                    'Implement security event monitoring',
                    'Add anomaly detection',
                    'Monitor authentication patterns'
                ]
            }
            
            recommendations = base_recommendations + category_recommendations.get(category, [])
            return recommendations[:4]  # Return top 4 recommendations
        
        except Exception as e:
            self.logger.warning(f"Monitoring recommendation generation failed: {e}")
            return ['Implement basic error monitoring']
    
    def _find_similar_errors(self, error_data: Dict[str, Any], historical_data: List[Dict[str, Any]]) -> List[str]:
        """Find similar errors in historical data."""
        try:
            if not historical_data:
                return []
            
            current_message = error_data.get('message', '')
            current_component = error_data.get('component', '')
            
            similar_errors = []
            
            for hist_error in historical_data:
                hist_message = hist_error.get('message', '')
                hist_component = hist_error.get('component', '')
                hist_id = hist_error.get('id', '')
                
                # Calculate similarity
                message_similarity = self._calculate_text_similarity(current_message, hist_message)
                component_match = current_component == hist_component
                
                if message_similarity > 0.7 or (message_similarity > 0.5 and component_match):
                    similar_errors.append(hist_id)
            
            return similar_errors[:5]  # Return top 5 similar errors
        
        except Exception as e:
            self.logger.warning(f"Similar error search failed: {e}")
            return []
    
    def _calculate_text_similarity(self, text1: str, text2: str) -> float:
        """Calculate text similarity using simple method."""
        try:
            if not text1 or not text2:
                return 0.0
            
            # Simple word-based similarity
            words1 = set(text1.lower().split())
            words2 = set(text2.lower().split())
            
            if not words1 or not words2:
                return 0.0
            
            intersection = len(words1.intersection(words2))
            union = len(words1.union(words2))
            
            return intersection / union if union > 0 else 0.0
        
        except Exception:
            return 0.0
    
    def _calculate_analysis_confidence(self, frequency: Dict, trend: Dict, impact: Dict, historical_count: int) -> float:
        """Calculate overall analysis confidence."""
        try:
            confidence_factors = []
            
            # Historical data factor
            if historical_count > 20:
                confidence_factors.append(0.9)
            elif historical_count > 10:
                confidence_factors.append(0.7)
            elif historical_count > 5:
                confidence_factors.append(0.5)
            else:
                confidence_factors.append(0.3)
            
            # Analysis quality factors
            if frequency.get('score', 0) > 0:
                confidence_factors.append(0.8)
            
            if trend.get('score', 0) > 0:
                confidence_factors.append(0.7)
            
            if impact.get('user_impact', 0) > 0:
                confidence_factors.append(0.8)
            
            return sum(confidence_factors) / len(confidence_factors) if confidence_factors else 0.5
        
        except Exception:
            return 0.5
    
    def _create_fallback_intelligence(self, error_data: Dict[str, Any]) -> ErrorIntelligence:
        """Create minimal intelligence analysis when full analysis fails."""
        return ErrorIntelligence(
            error_id=error_data.get('id', 'unknown'),
            category=ErrorCategory(error_data.get('category', 'unknown')),
            severity=ErrorSeverity(error_data.get('severity', 'medium')),
            priority=PriorityLevel.P2_MEDIUM,
            complexity=ResolutionComplexity.MODERATE,
            business_impact=BusinessImpact.MEDIUM,
            
            frequency_score=0.5,
            trend_score=0.5,
            user_impact_score=0.5,
            system_stability_score=0.5,
            
            estimated_resolution_time=16.0,
            required_expertise=['general'],
            resolution_confidence=0.3,
            
            root_cause_category='unknown',
            prevention_suggestions=['Review error details and implement appropriate fixes'],
            monitoring_recommendations=['Implement basic error monitoring'],
            
            analysis_timestamp=datetime.now(timezone.utc),
            confidence_score=0.3,
            similar_errors=[]
        )
    
    def _initialize_expertise_mapping(self) -> Dict[str, List[str]]:
        """Initialize expertise mapping for different error types."""
        return {
            'frontend': ['react', 'javascript', 'ui/ux', 'css'],
            'backend': ['python', 'flask', 'api_design', 'server_architecture'],
            'database': ['postgresql', 'sql', 'database_design', 'query_optimization'],
            'security': ['authentication', 'authorization', 'encryption', 'security_audit'],
            'ai_ml': ['machine_learning', 'ai_models', 'data_science', 'model_deployment'],
            'devops': ['deployment', 'monitoring', 'infrastructure', 'ci_cd'],
            'cache': ['redis', 'caching_strategies', 'performance_tuning'],
            'background_tasks': ['celery', 'task_queues', 'async_processing']
        }
    
    def _initialize_business_rules(self) -> Dict[str, Any]:
        """Initialize business impact rules."""
        return {
            'critical_components': ['auth', 'payment', 'strategist', 'dashboard'],
            'user_facing_categories': [
                ErrorCategory.UI_COMPONENT, 
                ErrorCategory.AUTHENTICATION, 
                ErrorCategory.API
            ],
            'system_critical_categories': [
                ErrorCategory.SECURITY,
                ErrorCategory.DATABASE,
                ErrorCategory.PERFORMANCE
            ]
        }

# Global error intelligence engine instance
error_intelligence_engine = ErrorIntelligenceEngine()