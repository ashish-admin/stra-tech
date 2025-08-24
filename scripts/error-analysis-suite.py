#!/usr/bin/env python3
"""
LokDarpan Error Analysis and Reporting Suite

Advanced error pattern analysis, frequency tracking, and intelligent
reporting system that integrates with the existing error tracking
infrastructure and provides actionable insights.

Features:
- Real-time error pattern detection
- Intelligent error categorization and priority scoring
- Automated trend analysis and predictions
- Integration with frontend telemetry systems
- Automated resolution suggestions
- Custom alert generation

Author: LokDarpan Team
Version: 1.0.0
"""

import os
import sys
import json
import logging
import time
import hashlib
import pickle
import argparse
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Optional, Any, Tuple, Set
from dataclasses import dataclass, asdict
from collections import defaultdict, deque, Counter
from enum import Enum
import statistics
import re

# Add the backend directory to Python path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))

try:
    import redis
    import requests
    import psycopg2
    import numpy as np
    from sklearn.cluster import DBSCAN
    from sklearn.feature_extraction.text import TfidfVectorizer
    from sklearn.metrics.pairwise import cosine_similarity
    import matplotlib.pyplot as plt
    import seaborn as sns
    from jinja2 import Template
except ImportError as e:
    print(f"Required dependency missing: {e}")
    print("Install with: pip install redis requests psycopg2-binary numpy scikit-learn matplotlib seaborn jinja2")
    sys.exit(1)

# Import from existing error tracking system
try:
    from app.error_tracking import ErrorSeverity, ErrorCategory, ErrorMetric
except ImportError:
    # Define basic classes if import fails
    class ErrorSeverity(Enum):
        CRITICAL = "critical"
        HIGH = "high"
        MEDIUM = "medium"
        LOW = "low"
        INFO = "info"
    
    class ErrorCategory(Enum):
        DATABASE = "database"
        API = "api"
        UI_COMPONENT = "ui_component"
        STRATEGIST = "strategist"
        SSE_STREAMING = "sse_streaming"
        UNKNOWN = "unknown"

@dataclass
class ErrorPattern:
    """Represents a detected error pattern."""
    pattern_id: str
    signature: str
    category: ErrorCategory
    severity: ErrorSeverity
    frequency: int
    first_seen: datetime
    last_seen: datetime
    affected_components: Set[str]
    error_messages: List[str]
    stack_traces: List[str]
    confidence_score: float
    trend: str  # 'increasing', 'stable', 'decreasing'
    resolution_suggestions: List[str]

@dataclass
class ErrorAnalysisResult:
    """Result of error analysis."""
    timestamp: datetime
    total_errors: int
    patterns_detected: int
    critical_patterns: int
    new_patterns: int
    resolved_patterns: int
    trend_analysis: Dict[str, Any]
    recommendations: List[str]
    alert_conditions: List[Dict[str, Any]]

class ErrorAnalyzer:
    """
    Advanced error analysis engine for LokDarpan.
    
    Analyzes error patterns using machine learning techniques,
    provides intelligent categorization, and generates actionable
    recommendations for system improvement.
    """
    
    def __init__(self, config_path: Optional[str] = None):
        self.config = self._load_config(config_path)
        self.project_root = Path(self.config['project_root'])
        
        # Initialize components
        self.redis_client = self._init_redis()
        self.db_connection = self._init_database()
        
        # Analysis state
        self.known_patterns = {}
        self.pattern_history = deque(maxlen=1000)
        self.analysis_cache = {}
        
        # ML components
        self.vectorizer = TfidfVectorizer(max_features=1000, stop_words='english')
        self.clustering_model = DBSCAN(eps=0.3, min_samples=3)
        
        # Set up logging
        self.logger = self._setup_logging()
        
        # Load previous analysis state
        self._load_analysis_state()
        
        self.logger.info("ErrorAnalyzer initialized successfully")
    
    def _load_config(self, config_path: Optional[str] = None) -> Dict[str, Any]:
        """Load configuration from file or environment."""
        default_config = {
            'project_root': os.path.dirname(os.path.dirname(__file__)),
            'database_url': os.getenv('DATABASE_URL', 'postgresql://postgres:amuktha@localhost/lokdarpan_db'),
            'redis_url': os.getenv('REDIS_URL', 'redis://localhost:6379/0'),
            'frontend_api_url': os.getenv('VITE_API_BASE_URL', 'http://localhost:5000'),
            'analysis_window_hours': 24,
            'pattern_confidence_threshold': 0.7,
            'clustering_min_samples': 3,
            'trend_analysis_days': 7,
            'alert_thresholds': {
                'error_rate_per_hour': 50,
                'new_pattern_confidence': 0.8,
                'critical_pattern_frequency': 10
            }
        }
        
        if config_path and os.path.exists(config_path):
            try:
                with open(config_path, 'r') as f:
                    file_config = json.load(f)
                    default_config.update(file_config)
            except Exception as e:
                print(f"Warning: Could not load config file {config_path}: {e}")
        
        return default_config
    
    def _init_redis(self):
        """Initialize Redis connection."""
        try:
            client = redis.from_url(self.config['redis_url'], decode_responses=True)
            client.ping()
            return client
        except Exception as e:
            self.logger.error(f"Redis connection failed: {e}")
            return None
    
    def _init_database(self):
        """Initialize database connection."""
        try:
            import psycopg2
            return psycopg2.connect(self.config['database_url'])
        except Exception as e:
            self.logger.error(f"Database connection failed: {e}")
            return None
    
    def _setup_logging(self) -> logging.Logger:
        """Set up structured logging."""
        logger = logging.getLogger('error_analyzer')
        logger.setLevel(logging.INFO)
        
        if not logger.handlers:
            # Console handler
            console_handler = logging.StreamHandler()
            console_formatter = logging.Formatter(
                '%(asctime)s [%(levelname)s] %(name)s: %(message)s'
            )
            console_handler.setFormatter(console_formatter)
            logger.addHandler(console_handler)
            
            # File handler
            log_dir = self.project_root / 'logs'
            log_dir.mkdir(exist_ok=True)
            file_handler = logging.FileHandler(log_dir / 'error_analysis.log')
            file_formatter = logging.Formatter(
                '%(asctime)s [%(levelname)s] %(name)s:%(lineno)d - %(message)s'
            )
            file_handler.setFormatter(file_formatter)
            logger.addHandler(file_handler)
        
        return logger
    
    def _load_analysis_state(self):
        """Load previous analysis state from cache."""
        cache_file = self.project_root / 'cache' / 'error_analysis_state.pkl'
        
        if cache_file.exists():
            try:
                with open(cache_file, 'rb') as f:
                    state = pickle.load(f)
                    self.known_patterns = state.get('known_patterns', {})
                    self.pattern_history = deque(state.get('pattern_history', []), maxlen=1000)
                    self.analysis_cache = state.get('analysis_cache', {})
                
                self.logger.info(f"Loaded {len(self.known_patterns)} known patterns from cache")
            except Exception as e:
                self.logger.warning(f"Could not load analysis state: {e}")
    
    def _save_analysis_state(self):
        """Save analysis state to cache."""
        cache_dir = self.project_root / 'cache'
        cache_dir.mkdir(exist_ok=True)
        cache_file = cache_dir / 'error_analysis_state.pkl'
        
        try:
            state = {
                'known_patterns': self.known_patterns,
                'pattern_history': list(self.pattern_history),
                'analysis_cache': self.analysis_cache,
                'last_updated': datetime.now().isoformat()
            }
            
            with open(cache_file, 'wb') as f:
                pickle.dump(state, f)
                
        except Exception as e:
            self.logger.error(f"Could not save analysis state: {e}")
    
    def run_comprehensive_analysis(self) -> ErrorAnalysisResult:
        """Run comprehensive error analysis."""
        self.logger.info("Starting comprehensive error analysis")
        
        start_time = time.time()
        
        # Collect error data from all sources
        error_data = self._collect_error_data()
        
        # Detect patterns using ML
        patterns = self._detect_error_patterns(error_data)
        
        # Analyze trends
        trend_analysis = self._analyze_error_trends(error_data, patterns)
        
        # Generate recommendations
        recommendations = self._generate_recommendations(patterns, trend_analysis)
        
        # Check alert conditions
        alert_conditions = self._check_alert_conditions(patterns, trend_analysis)
        
        # Count pattern changes
        new_patterns = sum(1 for p in patterns if p.pattern_id not in self.known_patterns)
        resolved_patterns = self._count_resolved_patterns(patterns)
        
        # Update known patterns
        for pattern in patterns:
            self.known_patterns[pattern.pattern_id] = pattern
        
        # Create analysis result
        result = ErrorAnalysisResult(
            timestamp=datetime.now(),
            total_errors=len(error_data),
            patterns_detected=len(patterns),
            critical_patterns=sum(1 for p in patterns if p.severity == ErrorSeverity.CRITICAL),
            new_patterns=new_patterns,
            resolved_patterns=resolved_patterns,
            trend_analysis=trend_analysis,
            recommendations=recommendations,
            alert_conditions=alert_conditions
        )
        
        # Save state and cache results
        self._save_analysis_state()
        self._cache_analysis_result(result)
        
        duration = time.time() - start_time
        self.logger.info(f"Error analysis completed in {duration:.2f} seconds")
        
        return result
    
    def _collect_error_data(self) -> List[Dict[str, Any]]:
        """Collect error data from all available sources."""
        self.logger.info("Collecting error data from all sources")
        
        all_errors = []
        
        # Collect from Redis
        redis_errors = self._collect_redis_errors()
        all_errors.extend(redis_errors)
        
        # Collect from database
        db_errors = self._collect_database_errors()
        all_errors.extend(db_errors)
        
        # Collect from log files
        log_errors = self._collect_log_errors()
        all_errors.extend(log_errors)
        
        # Collect from frontend (if available)
        frontend_errors = self._collect_frontend_errors()
        all_errors.extend(frontend_errors)
        
        self.logger.info(f"Collected {len(all_errors)} errors from all sources")
        
        return all_errors
    
    def _collect_redis_errors(self) -> List[Dict[str, Any]]:
        """Collect errors from Redis."""
        errors = []
        
        if not self.redis_client:
            return errors
        
        try:
            # Get error keys
            error_keys = self.redis_client.keys('lokdarpan:errors:*')
            
            for key in error_keys:
                try:
                    error_data = self.redis_client.get(key)
                    if error_data:
                        error = json.loads(error_data)
                        error['source'] = 'redis'
                        errors.append(error)
                except Exception as e:
                    self.logger.warning(f"Could not parse Redis error {key}: {e}")
            
            self.logger.info(f"Collected {len(errors)} errors from Redis")
            
        except Exception as e:
            self.logger.error(f"Failed to collect Redis errors: {e}")
        
        return errors
    
    def _collect_database_errors(self) -> List[Dict[str, Any]]:
        """Collect errors from database."""
        errors = []
        
        if not self.db_connection:
            return errors
        
        try:
            with self.db_connection.cursor() as cursor:
                # Check if error_log table exists
                cursor.execute("""
                    SELECT EXISTS (
                        SELECT FROM information_schema.tables 
                        WHERE table_name = 'error_log'
                    );
                """)
                
                if cursor.fetchone()[0]:
                    # Get recent errors
                    cursor.execute("""
                        SELECT * FROM error_log 
                        WHERE created_at > %s
                        ORDER BY created_at DESC
                    """, (datetime.now() - timedelta(hours=self.config['analysis_window_hours']),))
                    
                    columns = [desc[0] for desc in cursor.description]
                    for row in cursor.fetchall():
                        error = dict(zip(columns, row))
                        error['source'] = 'database'
                        # Convert datetime objects to strings
                        for key, value in error.items():
                            if isinstance(value, datetime):
                                error[key] = value.isoformat()
                        errors.append(error)
            
            self.logger.info(f"Collected {len(errors)} errors from database")
            
        except Exception as e:
            self.logger.error(f"Failed to collect database errors: {e}")
        
        return errors
    
    def _collect_log_errors(self) -> List[Dict[str, Any]]:
        """Collect errors from log files."""
        errors = []
        
        log_directories = [
            self.project_root / 'backend' / 'logs',
            self.project_root / 'logs',
            Path('/var/log/lokdarpan')
        ]
        
        error_patterns = [
            (r'(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}),\d+ \[ERROR\] (.+)', 'error'),
            (r'(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}),\d+ \[CRITICAL\] (.+)', 'critical'),
            (r'(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}),\d+ \[WARNING\] (.+)', 'warning'),
            (r'Exception: (.+)', 'exception'),
            (r'Error: (.+)', 'error_generic')
        ]
        
        for log_dir in log_directories:
            if not log_dir.exists():
                continue
                
            for log_file in log_dir.glob('*.log'):
                try:
                    with open(log_file, 'r') as f:
                        for line_num, line in enumerate(f, 1):
                            for pattern, error_type in error_patterns:
                                match = re.search(pattern, line)
                                if match:
                                    timestamp_str = match.group(1) if len(match.groups()) >= 2 else None
                                    message = match.group(2) if len(match.groups()) >= 2 else match.group(1)
                                    
                                    error = {
                                        'source': 'logfile',
                                        'file': str(log_file),
                                        'line': line_num,
                                        'type': error_type,
                                        'message': message.strip(),
                                        'full_line': line.strip(),
                                        'timestamp': timestamp_str or datetime.now().isoformat()
                                    }
                                    errors.append(error)
                                    break
                                    
                except Exception as e:
                    self.logger.warning(f"Could not parse log file {log_file}: {e}")
        
        self.logger.info(f"Collected {len(errors)} errors from log files")
        
        return errors
    
    def _collect_frontend_errors(self) -> List[Dict[str, Any]]:
        """Collect errors from frontend via API."""
        errors = []
        
        try:
            # Try to get frontend errors from the error tracking endpoint
            response = requests.get(
                f"{self.config['frontend_api_url']}/api/v1/errors/frontend",
                timeout=5
            )
            
            if response.status_code == 200:
                frontend_data = response.json()
                for error in frontend_data.get('errors', []):
                    error['source'] = 'frontend'
                    errors.append(error)
            
            self.logger.info(f"Collected {len(errors)} errors from frontend")
            
        except Exception as e:
            self.logger.warning(f"Could not collect frontend errors: {e}")
        
        return errors
    
    def _detect_error_patterns(self, error_data: List[Dict[str, Any]]) -> List[ErrorPattern]:
        """Detect error patterns using machine learning."""
        self.logger.info("Detecting error patterns using ML techniques")
        
        if len(error_data) < 3:
            self.logger.warning("Insufficient error data for pattern detection")
            return []
        
        patterns = []
        
        # Group errors by similarity
        error_groups = self._cluster_errors(error_data)
        
        for group_id, group_errors in error_groups.items():
            if len(group_errors) < self.config['clustering_min_samples']:
                continue
                
            pattern = self._create_pattern_from_group(group_errors)
            if pattern and pattern.confidence_score >= self.config['pattern_confidence_threshold']:
                patterns.append(pattern)
        
        self.logger.info(f"Detected {len(patterns)} error patterns")
        
        return patterns
    
    def _cluster_errors(self, error_data: List[Dict[str, Any]]) -> Dict[int, List[Dict[str, Any]]]:
        """Cluster errors based on message similarity."""
        if len(error_data) < 3:
            return {0: error_data}
        
        # Extract error messages for clustering
        messages = []
        for error in error_data:
            message = error.get('message', '') or error.get('error', '') or str(error)
            messages.append(message)
        
        try:
            # Vectorize error messages
            X = self.vectorizer.fit_transform(messages)
            
            # Perform clustering
            clusters = self.clustering_model.fit_predict(X)
            
            # Group errors by cluster
            grouped_errors = defaultdict(list)
            for i, cluster_id in enumerate(clusters):
                grouped_errors[cluster_id].append(error_data[i])
            
            return dict(grouped_errors)
            
        except Exception as e:
            self.logger.error(f"Error clustering failed: {e}")
            # Return all errors as one group
            return {0: error_data}
    
    def _create_pattern_from_group(self, group_errors: List[Dict[str, Any]]) -> Optional[ErrorPattern]:
        """Create an error pattern from a group of similar errors."""
        if not group_errors:
            return None
        
        # Extract common characteristics
        messages = [error.get('message', '') or error.get('error', '') for error in group_errors]
        components = set()
        stack_traces = []
        
        for error in group_errors:
            # Extract component information
            component = error.get('component', '') or error.get('file', '') or 'unknown'
            components.add(component)
            
            # Collect stack traces
            stack_trace = error.get('stack_trace', '') or error.get('stack', '')
            if stack_trace:
                stack_traces.append(stack_trace)
        
        # Generate pattern signature
        signature = self._generate_pattern_signature(messages)
        
        # Determine category and severity
        category = self._classify_error_category(group_errors)
        severity = self._classify_error_severity(group_errors)
        
        # Calculate confidence score
        confidence_score = self._calculate_pattern_confidence(group_errors, signature)
        
        # Determine trend
        trend = self._determine_pattern_trend(group_errors)
        
        # Generate resolution suggestions
        resolution_suggestions = self._generate_resolution_suggestions(category, messages)
        
        # Get timestamps
        timestamps = []
        for error in group_errors:
            timestamp_str = error.get('timestamp', '') or error.get('created_at', '')
            if timestamp_str:
                try:
                    if isinstance(timestamp_str, str):
                        timestamp = datetime.fromisoformat(timestamp_str.replace('Z', '+00:00'))
                    else:
                        timestamp = timestamp_str
                    timestamps.append(timestamp)
                except:
                    timestamps.append(datetime.now())
        
        if not timestamps:
            timestamps = [datetime.now()]
        
        pattern = ErrorPattern(
            pattern_id=hashlib.md5(signature.encode()).hexdigest()[:12],
            signature=signature,
            category=category,
            severity=severity,
            frequency=len(group_errors),
            first_seen=min(timestamps),
            last_seen=max(timestamps),
            affected_components=components,
            error_messages=messages[:10],  # Keep sample of messages
            stack_traces=stack_traces[:5],  # Keep sample of stack traces
            confidence_score=confidence_score,
            trend=trend,
            resolution_suggestions=resolution_suggestions
        )
        
        return pattern
    
    def _generate_pattern_signature(self, messages: List[str]) -> str:
        """Generate a unique signature for error pattern."""
        # Find common words/phrases in error messages
        all_text = ' '.join(messages).lower()
        
        # Extract key terms
        words = re.findall(r'\b\w+\b', all_text)
        word_counts = Counter(words)
        
        # Get most common meaningful words (excluding stop words)
        stop_words = {'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'}
        common_words = [word for word, count in word_counts.most_common(10) 
                       if word not in stop_words and len(word) > 2]
        
        signature = '_'.join(common_words[:5])  # Top 5 common words
        
        return signature or 'unknown_pattern'
    
    def _classify_error_category(self, errors: List[Dict[str, Any]]) -> ErrorCategory:
        """Classify error category based on error content."""
        category_indicators = {
            ErrorCategory.DATABASE: ['database', 'sql', 'connection', 'query', 'postgres', 'psycopg'],
            ErrorCategory.API: ['api', 'http', 'request', 'response', 'endpoint', 'fetch'],
            ErrorCategory.UI_COMPONENT: ['component', 'react', 'render', 'jsx', 'ui', 'frontend'],
            ErrorCategory.STRATEGIST: ['strategist', 'ai', 'analysis', 'political', 'gemini', 'perplexity'],
            ErrorCategory.SSE_STREAMING: ['sse', 'streaming', 'eventsource', 'websocket', 'realtime']
        }
        
        # Count indicators for each category
        category_scores = defaultdict(int)
        
        for error in errors:
            error_text = ' '.join([
                str(error.get('message', '')),
                str(error.get('error', '')),
                str(error.get('component', '')),
                str(error.get('file', ''))
            ]).lower()
            
            for category, indicators in category_indicators.items():
                for indicator in indicators:
                    if indicator in error_text:
                        category_scores[category] += 1
        
        # Return category with highest score
        if category_scores:
            return max(category_scores.items(), key=lambda x: x[1])[0]
        
        return ErrorCategory.UNKNOWN
    
    def _classify_error_severity(self, errors: List[Dict[str, Any]]) -> ErrorSeverity:
        """Classify error severity based on error characteristics."""
        severity_indicators = {
            ErrorSeverity.CRITICAL: ['critical', 'fatal', 'crash', 'dead', 'fail', 'security'],
            ErrorSeverity.HIGH: ['error', 'exception', 'failed', 'cannot', 'unable'],
            ErrorSeverity.MEDIUM: ['warning', 'warn', 'deprecated', 'slow'],
            ErrorSeverity.LOW: ['info', 'debug', 'notice'],
        }
        
        severity_scores = defaultdict(int)
        
        for error in errors:
            error_text = ' '.join([
                str(error.get('message', '')),
                str(error.get('error', '')),
                str(error.get('type', ''))
            ]).lower()
            
            for severity, indicators in severity_indicators.items():
                for indicator in indicators:
                    if indicator in error_text:
                        severity_scores[severity] += 1
        
        # Return highest severity found
        severity_order = [ErrorSeverity.CRITICAL, ErrorSeverity.HIGH, ErrorSeverity.MEDIUM, ErrorSeverity.LOW, ErrorSeverity.INFO]
        
        for severity in severity_order:
            if severity_scores[severity] > 0:
                return severity
        
        return ErrorSeverity.MEDIUM
    
    def _calculate_pattern_confidence(self, errors: List[Dict[str, Any]], signature: str) -> float:
        """Calculate confidence score for pattern detection."""
        # Factors that increase confidence:
        # 1. Number of similar errors
        # 2. Consistency of error messages
        # 3. Temporal clustering
        # 4. Component consistency
        
        confidence = 0.0
        
        # Frequency factor (more errors = higher confidence)
        frequency_factor = min(len(errors) / 10, 1.0) * 0.3
        confidence += frequency_factor
        
        # Message similarity factor
        messages = [error.get('message', '') for error in errors]
        if messages:
            # Calculate average similarity between messages
            if len(messages) > 1:
                try:
                    vectors = self.vectorizer.transform(messages)
                    similarities = cosine_similarity(vectors)
                    avg_similarity = np.mean(similarities[np.triu_indices_from(similarities, k=1)])
                    confidence += avg_similarity * 0.4
                except:
                    confidence += 0.2  # Default similarity
            else:
                confidence += 0.2
        
        # Temporal clustering factor
        timestamps = []
        for error in errors:
            timestamp_str = error.get('timestamp', '') or error.get('created_at', '')
            if timestamp_str:
                try:
                    timestamp = datetime.fromisoformat(timestamp_str.replace('Z', '+00:00'))
                    timestamps.append(timestamp)
                except:
                    pass
        
        if len(timestamps) > 1:
            # Check if errors are temporally clustered
            time_diffs = [(timestamps[i+1] - timestamps[i]).total_seconds() 
                         for i in range(len(timestamps)-1)]
            if time_diffs:
                avg_time_diff = statistics.mean(time_diffs)
                if avg_time_diff < 3600:  # Errors within an hour
                    confidence += 0.2
                else:
                    confidence += 0.1
        
        # Component consistency factor
        components = set(error.get('component', '') or error.get('file', '') for error in errors)
        if len(components) == 1:
            confidence += 0.1  # All from same component
        elif len(components) <= 3:
            confidence += 0.05  # From few components
        
        return min(confidence, 1.0)
    
    def _determine_pattern_trend(self, errors: List[Dict[str, Any]]) -> str:
        """Determine if error pattern is increasing, stable, or decreasing."""
        timestamps = []
        for error in errors:
            timestamp_str = error.get('timestamp', '') or error.get('created_at', '')
            if timestamp_str:
                try:
                    timestamp = datetime.fromisoformat(timestamp_str.replace('Z', '+00:00'))
                    timestamps.append(timestamp)
                except:
                    pass
        
        if len(timestamps) < 3:
            return 'stable'
        
        timestamps.sort()
        
        # Divide into first half and second half
        mid_point = len(timestamps) // 2
        first_half = timestamps[:mid_point]
        second_half = timestamps[mid_point:]
        
        # Calculate error rate for each half
        if first_half and second_half:
            first_duration = (first_half[-1] - first_half[0]).total_seconds() or 1
            second_duration = (second_half[-1] - second_half[0]).total_seconds() or 1
            
            first_rate = len(first_half) / (first_duration / 3600)  # errors per hour
            second_rate = len(second_half) / (second_duration / 3600)  # errors per hour
            
            ratio = second_rate / first_rate if first_rate > 0 else float('inf')
            
            if ratio > 1.5:
                return 'increasing'
            elif ratio < 0.5:
                return 'decreasing'
        
        return 'stable'
    
    def _generate_resolution_suggestions(self, category: ErrorCategory, messages: List[str]) -> List[str]:
        """Generate resolution suggestions based on error category and messages."""
        suggestions = []
        
        # Common error keywords and their solutions
        keyword_solutions = {
            'connection': 'Check network connectivity and service status',
            'timeout': 'Increase timeout values or optimize request handling',
            'memory': 'Check for memory leaks and optimize resource usage',
            'database': 'Verify database connections and query performance',
            'authentication': 'Check authentication tokens and user sessions',
            'permission': 'Verify user permissions and access controls',
            'file': 'Check file paths and permissions',
            'import': 'Verify module imports and dependencies'
        }
        
        # Category-specific suggestions
        category_suggestions = {
            ErrorCategory.DATABASE: [
                'Check database connection pool settings',
                'Review query performance and indexing',
                'Verify database migration status'
            ],
            ErrorCategory.API: [
                'Implement proper error handling for API calls',
                'Add request timeout and retry logic',
                'Check API endpoint availability'
            ],
            ErrorCategory.UI_COMPONENT: [
                'Review component error boundaries',
                'Check for undefined props or state',
                'Verify component lifecycle methods'
            ],
            ErrorCategory.STRATEGIST: [
                'Check AI service API keys and quotas',
                'Verify external service connectivity',
                'Implement fallback mechanisms'
            ],
            ErrorCategory.SSE_STREAMING: [
                'Check SSE connection stability',
                'Implement reconnection logic',
                'Review server-side event handling'
            ]
        }
        
        # Add category-specific suggestions
        suggestions.extend(category_suggestions.get(category, []))
        
        # Add keyword-based suggestions
        all_text = ' '.join(messages).lower()
        for keyword, solution in keyword_solutions.items():
            if keyword in all_text:
                suggestions.append(solution)
        
        # Remove duplicates and limit to top 5
        unique_suggestions = list(dict.fromkeys(suggestions))
        return unique_suggestions[:5]
    
    def _analyze_error_trends(self, error_data: List[Dict[str, Any]], patterns: List[ErrorPattern]) -> Dict[str, Any]:
        """Analyze error trends over time."""
        self.logger.info("Analyzing error trends")
        
        now = datetime.now()
        
        # Time-based analysis
        hourly_counts = defaultdict(int)
        daily_counts = defaultdict(int)
        category_trends = defaultdict(list)
        
        for error in error_data:
            timestamp_str = error.get('timestamp', '') or error.get('created_at', '')
            if timestamp_str:
                try:
                    timestamp = datetime.fromisoformat(timestamp_str.replace('Z', '+00:00'))
                    
                    # Hourly counts
                    hour_key = timestamp.replace(minute=0, second=0, microsecond=0)
                    hourly_counts[hour_key] += 1
                    
                    # Daily counts
                    day_key = timestamp.date()
                    daily_counts[day_key] += 1
                    
                    # Category trends
                    category = error.get('category', 'unknown')
                    category_trends[category].append(timestamp)
                    
                except:
                    continue
        
        # Calculate overall trend
        if len(daily_counts) >= 2:
            sorted_days = sorted(daily_counts.keys())
            recent_avg = statistics.mean([daily_counts[day] for day in sorted_days[-3:]])
            earlier_avg = statistics.mean([daily_counts[day] for day in sorted_days[:3]])
            
            trend_ratio = recent_avg / earlier_avg if earlier_avg > 0 else 1
            
            if trend_ratio > 1.2:
                overall_trend = 'increasing'
            elif trend_ratio < 0.8:
                overall_trend = 'decreasing'
            else:
                overall_trend = 'stable'
        else:
            overall_trend = 'insufficient_data'
        
        # Pattern evolution
        pattern_evolution = {}
        for pattern in patterns:
            if pattern.pattern_id in self.known_patterns:
                old_pattern = self.known_patterns[pattern.pattern_id]
                frequency_change = pattern.frequency - old_pattern.frequency
                pattern_evolution[pattern.pattern_id] = {
                    'frequency_change': frequency_change,
                    'severity_change': pattern.severity.value != old_pattern.severity.value,
                    'trend': pattern.trend
                }
        
        return {
            'overall_trend': overall_trend,
            'hourly_distribution': {k.isoformat(): v for k, v in hourly_counts.items()},
            'daily_distribution': {k.isoformat(): v for k, v in daily_counts.items()},
            'category_trends': {k: len(v) for k, v in category_trends.items()},
            'pattern_evolution': pattern_evolution,
            'peak_error_hour': max(hourly_counts.items(), key=lambda x: x[1])[0].isoformat() if hourly_counts else None,
            'total_errors_today': daily_counts.get(now.date(), 0)
        }
    
    def _generate_recommendations(self, patterns: List[ErrorPattern], trend_analysis: Dict[str, Any]) -> List[str]:
        """Generate actionable recommendations based on analysis."""
        recommendations = []
        
        # High-frequency pattern recommendations
        high_freq_patterns = [p for p in patterns if p.frequency > 20]
        if high_freq_patterns:
            recommendations.append(f"Address {len(high_freq_patterns)} high-frequency error patterns immediately")
        
        # Critical severity recommendations
        critical_patterns = [p for p in patterns if p.severity == ErrorSeverity.CRITICAL]
        if critical_patterns:
            recommendations.append(f"Urgent: {len(critical_patterns)} critical error patterns require immediate attention")
        
        # Increasing trend recommendations
        increasing_patterns = [p for p in patterns if p.trend == 'increasing']
        if increasing_patterns:
            recommendations.append(f"Monitor {len(increasing_patterns)} error patterns showing increasing trend")
        
        # Category-specific recommendations
        category_counts = defaultdict(int)
        for pattern in patterns:
            category_counts[pattern.category] += 1
        
        for category, count in category_counts.items():
            if count > 5:
                recommendations.append(f"Focus on {category.value} errors: {count} patterns detected")
        
        # Overall trend recommendations
        if trend_analysis['overall_trend'] == 'increasing':
            recommendations.append("Implement error rate monitoring and alerting - overall error trend is increasing")
        
        # Component-specific recommendations
        component_issues = defaultdict(int)
        for pattern in patterns:
            for component in pattern.affected_components:
                component_issues[component] += pattern.frequency
        
        top_components = sorted(component_issues.items(), key=lambda x: x[1], reverse=True)[:3]
        for component, error_count in top_components:
            if error_count > 30:
                recommendations.append(f"Review {component} component: {error_count} errors detected")
        
        return recommendations[:10]  # Limit to top 10 recommendations
    
    def _check_alert_conditions(self, patterns: List[ErrorPattern], trend_analysis: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Check for conditions that should trigger alerts."""
        alerts = []
        
        thresholds = self.config['alert_thresholds']
        
        # High error rate alert
        total_errors_today = trend_analysis.get('total_errors_today', 0)
        if total_errors_today > thresholds['error_rate_per_hour'] * 24:
            alerts.append({
                'type': 'high_error_rate',
                'severity': 'high',
                'message': f"High error rate detected: {total_errors_today} errors today",
                'threshold': thresholds['error_rate_per_hour'] * 24,
                'actual': total_errors_today
            })
        
        # New critical patterns alert
        new_critical_patterns = [p for p in patterns 
                               if p.severity == ErrorSeverity.CRITICAL 
                               and p.pattern_id not in self.known_patterns
                               and p.confidence_score >= thresholds['new_pattern_confidence']]
        
        if new_critical_patterns:
            alerts.append({
                'type': 'new_critical_patterns',
                'severity': 'critical',
                'message': f"{len(new_critical_patterns)} new critical error patterns detected",
                'patterns': [p.pattern_id for p in new_critical_patterns]
            })
        
        # High-frequency pattern alert
        high_freq_patterns = [p for p in patterns 
                             if p.frequency >= thresholds['critical_pattern_frequency']]
        
        if high_freq_patterns:
            alerts.append({
                'type': 'high_frequency_patterns',
                'severity': 'high',
                'message': f"{len(high_freq_patterns)} patterns with high frequency detected",
                'patterns': [{'id': p.pattern_id, 'frequency': p.frequency} for p in high_freq_patterns]
            })
        
        return alerts
    
    def _count_resolved_patterns(self, current_patterns: List[ErrorPattern]) -> int:
        """Count patterns that appear to be resolved."""
        resolved_count = 0
        current_pattern_ids = {p.pattern_id for p in current_patterns}
        
        for pattern_id, old_pattern in self.known_patterns.items():
            if pattern_id not in current_pattern_ids:
                # Pattern no longer appears - might be resolved
                time_since_last_seen = datetime.now() - old_pattern.last_seen
                if time_since_last_seen > timedelta(hours=24):
                    resolved_count += 1
        
        return resolved_count
    
    def _cache_analysis_result(self, result: ErrorAnalysisResult):
        """Cache analysis result for later use."""
        cache_key = f"analysis_{result.timestamp.strftime('%Y%m%d_%H')}"
        self.analysis_cache[cache_key] = result
        
        # Keep only recent cache entries
        cutoff_time = datetime.now() - timedelta(days=7)
        self.analysis_cache = {
            k: v for k, v in self.analysis_cache.items() 
            if v.timestamp > cutoff_time
        }
    
    def generate_detailed_report(self, result: ErrorAnalysisResult) -> str:
        """Generate detailed HTML report."""
        template_str = """
<!DOCTYPE html>
<html>
<head>
    <title>LokDarpan Error Analysis Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #f8f9fa; padding: 20px; border-radius: 5px; }
        .section { margin: 20px 0; }
        .pattern { background: #fff; border: 1px solid #ddd; padding: 15px; margin: 10px 0; border-radius: 5px; }
        .critical { border-left: 5px solid #dc3545; }
        .high { border-left: 5px solid #fd7e14; }
        .medium { border-left: 5px solid #ffc107; }
        .low { border-left: 5px solid #28a745; }
        .alert { background: #f8d7da; border: 1px solid #f5c6cb; color: #721c24; padding: 10px; border-radius: 5px; margin: 10px 0; }
        .recommendation { background: #d4edda; border: 1px solid #c3e6cb; color: #155724; padding: 10px; border-radius: 5px; margin: 5px 0; }
        .trend-up { color: #dc3545; }
        .trend-down { color: #28a745; }
        .trend-stable { color: #6c757d; }
    </style>
</head>
<body>
    <div class="header">
        <h1>LokDarpan Error Analysis Report</h1>
        <p><strong>Generated:</strong> {{ result.timestamp.strftime('%Y-%m-%d %H:%M:%S') }}</p>
        <p><strong>Analysis Period:</strong> Last {{ config.analysis_window_hours }} hours</p>
    </div>

    <div class="section">
        <h2>Executive Summary</h2>
        <ul>
            <li><strong>Total Errors:</strong> {{ result.total_errors }}</li>
            <li><strong>Patterns Detected:</strong> {{ result.patterns_detected }}</li>
            <li><strong>Critical Patterns:</strong> {{ result.critical_patterns }}</li>
            <li><strong>New Patterns:</strong> {{ result.new_patterns }}</li>
            <li><strong>Resolved Patterns:</strong> {{ result.resolved_patterns }}</li>
        </ul>
    </div>

    {% if result.alert_conditions %}
    <div class="section">
        <h2>🚨 Alerts</h2>
        {% for alert in result.alert_conditions %}
        <div class="alert">
            <strong>{{ alert.severity.upper() }}:</strong> {{ alert.message }}
        </div>
        {% endfor %}
    </div>
    {% endif %}

    <div class="section">
        <h2>📈 Trend Analysis</h2>
        <p><strong>Overall Trend:</strong> 
            <span class="trend-{{ result.trend_analysis.overall_trend }}">
                {{ result.trend_analysis.overall_trend.upper() }}
            </span>
        </p>
        <p><strong>Errors Today:</strong> {{ result.trend_analysis.total_errors_today }}</p>
        {% if result.trend_analysis.peak_error_hour %}
        <p><strong>Peak Error Hour:</strong> {{ result.trend_analysis.peak_error_hour }}</p>
        {% endif %}
    </div>

    <div class="section">
        <h2>🔍 Error Patterns</h2>
        {% for pattern in patterns %}
        <div class="pattern {{ pattern.severity.value }}">
            <h3>{{ pattern.signature }} ({{ pattern.frequency }} occurrences)</h3>
            <p><strong>Category:</strong> {{ pattern.category.value.title() }}</p>
            <p><strong>Severity:</strong> {{ pattern.severity.value.title() }}</p>
            <p><strong>Trend:</strong> {{ pattern.trend.title() }}</p>
            <p><strong>Confidence:</strong> {{ (pattern.confidence_score * 100) | round(1) }}%</p>
            <p><strong>Affected Components:</strong> {{ ', '.join(pattern.affected_components) }}</p>
            
            {% if pattern.resolution_suggestions %}
            <div>
                <strong>Resolution Suggestions:</strong>
                {% for suggestion in pattern.resolution_suggestions %}
                <div class="recommendation">{{ suggestion }}</div>
                {% endfor %}
            </div>
            {% endif %}
        </div>
        {% endfor %}
    </div>

    <div class="section">
        <h2>💡 Recommendations</h2>
        {% for recommendation in result.recommendations %}
        <div class="recommendation">{{ recommendation }}</div>
        {% endfor %}
    </div>

    <div class="footer">
        <p><em>Report generated by LokDarpan Error Analysis Suite</em></p>
    </div>
</body>
</html>
        """
        
        template = Template(template_str)
        return template.render(
            result=result,
            patterns=self.known_patterns.values(),
            config=self.config
        )
    
    def create_visualizations(self, result: ErrorAnalysisResult) -> Dict[str, str]:
        """Create visualizations for error analysis."""
        viz_dir = self.project_root / 'docs' / 'living' / 'visualizations'
        viz_dir.mkdir(parents=True, exist_ok=True)
        
        created_files = {}
        
        try:
            # Error trend visualization
            if result.trend_analysis.get('daily_distribution'):
                plt.figure(figsize=(12, 6))
                
                # Daily error counts
                dates = []
                counts = []
                for date_str, count in result.trend_analysis['daily_distribution'].items():
                    dates.append(datetime.fromisoformat(date_str))
                    counts.append(count)
                
                plt.subplot(1, 2, 1)
                plt.plot(dates, counts, marker='o')
                plt.title('Daily Error Counts')
                plt.xlabel('Date')
                plt.ylabel('Error Count')
                plt.xticks(rotation=45)
                
                # Category distribution
                if result.trend_analysis.get('category_trends'):
                    categories = list(result.trend_analysis['category_trends'].keys())
                    counts = list(result.trend_analysis['category_trends'].values())
                    
                    plt.subplot(1, 2, 2)
                    plt.pie(counts, labels=categories, autopct='%1.1f%%')
                    plt.title('Error Distribution by Category')
                
                plt.tight_layout()
                
                trend_file = viz_dir / 'error_trends.png'
                plt.savefig(trend_file, dpi=150, bbox_inches='tight')
                plt.close()
                
                created_files['trend_chart'] = str(trend_file)
            
            # Pattern severity heatmap
            if self.known_patterns:
                patterns_data = []
                for pattern in self.known_patterns.values():
                    patterns_data.append({
                        'signature': pattern.signature[:30] + '...' if len(pattern.signature) > 30 else pattern.signature,
                        'frequency': pattern.frequency,
                        'severity': pattern.severity.value,
                        'confidence': pattern.confidence_score
                    })
                
                if patterns_data:
                    plt.figure(figsize=(10, max(6, len(patterns_data) * 0.3)))
                    
                    signatures = [p['signature'] for p in patterns_data]
                    frequencies = [p['frequency'] for p in patterns_data]
                    
                    colors = []
                    for p in patterns_data:
                        if p['severity'] == 'critical':
                            colors.append('#dc3545')
                        elif p['severity'] == 'high':
                            colors.append('#fd7e14')
                        elif p['severity'] == 'medium':
                            colors.append('#ffc107')
                        else:
                            colors.append('#28a745')
                    
                    plt.barh(signatures, frequencies, color=colors)
                    plt.title('Error Pattern Frequencies by Severity')
                    plt.xlabel('Frequency')
                    plt.ylabel('Pattern')
                    
                    patterns_file = viz_dir / 'pattern_frequencies.png'
                    plt.savefig(patterns_file, dpi=150, bbox_inches='tight')
                    plt.close()
                    
                    created_files['patterns_chart'] = str(patterns_file)
        
        except Exception as e:
            self.logger.error(f"Visualization creation failed: {e}")
        
        return created_files


def main():
    """Main entry point for error analysis suite."""
    parser = argparse.ArgumentParser(description='LokDarpan Error Analysis Suite')
    parser.add_argument('--config', help='Configuration file path')
    parser.add_argument('--analyze', action='store_true', help='Run comprehensive analysis')
    parser.add_argument('--report', help='Generate detailed report to specified file')
    parser.add_argument('--visualize', action='store_true', help='Create visualizations')
    parser.add_argument('--alert-check', action='store_true', help='Check alert conditions only')
    
    args = parser.parse_args()
    
    # Initialize analyzer
    analyzer = ErrorAnalyzer(args.config)
    
    if args.analyze or not any([args.report, args.visualize, args.alert_check]):
        # Run comprehensive analysis
        result = analyzer.run_comprehensive_analysis()
        
        print("Error Analysis Complete!")
        print(f"Total Errors: {result.total_errors}")
        print(f"Patterns Detected: {result.patterns_detected}")
        print(f"Critical Patterns: {result.critical_patterns}")
        print(f"New Patterns: {result.new_patterns}")
        
        if result.alert_conditions:
            print(f"\n🚨 ALERTS ({len(result.alert_conditions)}):")
            for alert in result.alert_conditions:
                print(f"  - {alert['severity'].upper()}: {alert['message']}")
        
        if result.recommendations:
            print(f"\n💡 TOP RECOMMENDATIONS:")
            for rec in result.recommendations[:5]:
                print(f"  - {rec}")
        
        # Generate report if requested
        if args.report:
            report_html = analyzer.generate_detailed_report(result)
            with open(args.report, 'w') as f:
                f.write(report_html)
            print(f"\nDetailed report saved to: {args.report}")
        
        # Create visualizations if requested
        if args.visualize:
            viz_files = analyzer.create_visualizations(result)
            if viz_files:
                print(f"\nVisualizations created:")
                for name, path in viz_files.items():
                    print(f"  - {name}: {path}")
    
    elif args.alert_check:
        # Quick alert check
        error_data = analyzer._collect_error_data()
        patterns = analyzer._detect_error_patterns(error_data)
        trend_analysis = analyzer._analyze_error_trends(error_data, patterns)
        alerts = analyzer._check_alert_conditions(patterns, trend_analysis)
        
        if alerts:
            print(f"🚨 {len(alerts)} ALERTS DETECTED:")
            for alert in alerts:
                print(f"  - {alert['severity'].upper()}: {alert['message']}")
        else:
            print("✅ No alerts detected")


if __name__ == '__main__':
    main()