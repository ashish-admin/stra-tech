#!/usr/bin/env python3
"""
LokDarpan System Health Monitoring Suite

Comprehensive health monitoring system that tracks system metrics,
performance indicators, and service availability. Integrates with
existing error tracking and provides real-time health assessment.

Features:
- Real-time system metrics monitoring
- Service availability checking
- Performance trend analysis
- Automated health scoring
- Integration with error tracking system
- Proactive alerting and remediation suggestions
- Historical health data analysis

Author: LokDarpan Team
Version: 1.0.0
"""

import os
import sys
import json
import logging
import time
import psutil
import socket
import subprocess
import argparse
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, asdict
from collections import deque, defaultdict
from enum import Enum
import threading
import queue

# Add the backend directory to Python path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))

try:
    import redis
    import requests
    import psycopg2
    from sqlalchemy import create_engine, text
except ImportError as e:
    print(f"Required dependency missing: {e}")
    print("Install with: pip install redis requests psycopg2-binary sqlalchemy psutil")
    sys.exit(1)

class HealthStatus(Enum):
    HEALTHY = "healthy"
    DEGRADED = "degraded"
    CRITICAL = "critical"
    UNKNOWN = "unknown"

class ServiceType(Enum):
    DATABASE = "database"
    CACHE = "cache"
    WEB_SERVER = "web_server"
    API = "api"
    WORKER = "worker"
    EXTERNAL_API = "external_api"

@dataclass
class HealthMetric:
    """Individual health metric measurement."""
    name: str
    value: float
    unit: str
    status: HealthStatus
    timestamp: datetime
    threshold_critical: Optional[float] = None
    threshold_warning: Optional[float] = None
    context: Optional[Dict[str, Any]] = None

@dataclass
class ServiceHealth:
    """Health status of a service."""
    service_name: str
    service_type: ServiceType
    status: HealthStatus
    response_time: Optional[float]
    last_check: datetime
    metrics: List[HealthMetric]
    issues: List[str]
    recommendations: List[str]
    uptime_percentage: Optional[float] = None

@dataclass
class SystemHealthReport:
    """Complete system health report."""
    timestamp: datetime
    overall_status: HealthStatus
    overall_score: float
    services: List[ServiceHealth]
    system_metrics: List[HealthMetric]
    alerts: List[Dict[str, Any]]
    trends: Dict[str, Any]
    recommendations: List[str]

class HealthMonitor:
    """
    Comprehensive health monitoring system for LokDarpan.
    
    Monitors system resources, service availability, performance metrics,
    and provides intelligent health assessment and alerting.
    """
    
    def __init__(self, config_path: Optional[str] = None):
        self.config = self._load_config(config_path)
        self.project_root = Path(self.config['project_root'])
        
        # Initialize connections
        self.redis_client = self._init_redis()
        self.db_engine = self._init_database()
        
        # Health monitoring state
        self.health_history = deque(maxlen=1000)
        self.service_cache = {}
        self.alert_state = defaultdict(dict)
        
        # Monitoring thread control
        self.monitoring_active = False
        self.monitor_thread = None
        self.health_queue = queue.Queue()
        
        # Set up logging
        self.logger = self._setup_logging()
        
        # Define services to monitor
        self.services_config = self._load_services_config()
        
        self.logger.info("HealthMonitor initialized successfully")
    
    def _load_config(self, config_path: Optional[str] = None) -> Dict[str, Any]:
        """Load configuration from file or environment."""
        default_config = {
            'project_root': os.path.dirname(os.path.dirname(__file__)),
            'database_url': os.getenv('DATABASE_URL', 'postgresql://postgres:amuktha@localhost/lokdarpan_db'),
            'redis_url': os.getenv('REDIS_URL', 'redis://localhost:6379/0'),
            'api_base_url': os.getenv('VITE_API_BASE_URL', 'http://localhost:5000'),
            'monitoring_interval': 60,  # seconds
            'health_check_timeout': 10,  # seconds
            'alert_cooldown': 300,  # seconds
            'history_retention_hours': 168,  # 7 days
            'system_thresholds': {
                'cpu_warning': 70,
                'cpu_critical': 90,
                'memory_warning': 80,
                'memory_critical': 95,
                'disk_warning': 85,
                'disk_critical': 95,
                'response_time_warning': 2.0,
                'response_time_critical': 5.0
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
            return create_engine(self.config['database_url'])
        except Exception as e:
            self.logger.error(f"Database connection failed: {e}")
            return None
    
    def _setup_logging(self) -> logging.Logger:
        """Set up structured logging."""
        logger = logging.getLogger('health_monitor')
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
            file_handler = logging.FileHandler(log_dir / 'health_monitor.log')
            file_formatter = logging.Formatter(
                '%(asctime)s [%(levelname)s] %(name)s:%(lineno)d - %(message)s'
            )
            file_handler.setFormatter(file_formatter)
            logger.addHandler(file_handler)
        
        return logger
    
    def _load_services_config(self) -> Dict[str, Any]:
        """Load services configuration for monitoring."""
        return {
            'postgresql': {
                'type': ServiceType.DATABASE,
                'host': 'localhost',
                'port': 5432,
                'check_method': 'database_health',
                'critical_for_system': True
            },
            'redis': {
                'type': ServiceType.CACHE,
                'host': 'localhost', 
                'port': 6379,
                'check_method': 'redis_health',
                'critical_for_system': True
            },
            'flask_api': {
                'type': ServiceType.API,
                'url': self.config['api_base_url'] + '/api/v1/status',
                'check_method': 'api_health',
                'critical_for_system': True
            },
            'frontend': {
                'type': ServiceType.WEB_SERVER,
                'host': 'localhost',
                'port': 5173,
                'check_method': 'port_health',
                'critical_for_system': True
            },
            'celery_worker': {
                'type': ServiceType.WORKER,
                'check_method': 'celery_health',
                'critical_for_system': False
            }
        }
    
    def run_health_check(self) -> SystemHealthReport:
        """Run comprehensive health check and return report."""
        self.logger.info("Starting comprehensive health check")
        
        start_time = time.time()
        
        # Collect system metrics
        system_metrics = self._collect_system_metrics()
        
        # Check all services
        service_healths = []
        for service_name, service_config in self.services_config.items():
            service_health = self._check_service_health(service_name, service_config)
            service_healths.append(service_health)
        
        # Calculate overall health score
        overall_score, overall_status = self._calculate_overall_health(system_metrics, service_healths)
        
        # Generate alerts
        alerts = self._generate_alerts(system_metrics, service_healths)
        
        # Analyze trends
        trends = self._analyze_health_trends()
        
        # Generate recommendations
        recommendations = self._generate_health_recommendations(system_metrics, service_healths, alerts)
        
        # Create health report
        report = SystemHealthReport(
            timestamp=datetime.now(),
            overall_status=overall_status,
            overall_score=overall_score,
            services=service_healths,
            system_metrics=system_metrics,
            alerts=alerts,
            trends=trends,
            recommendations=recommendations
        )
        
        # Store in history and cache
        self._store_health_report(report)
        
        duration = time.time() - start_time
        self.logger.info(f"Health check completed in {duration:.2f} seconds - Overall score: {overall_score:.2f}")
        
        return report
    
    def _collect_system_metrics(self) -> List[HealthMetric]:
        """Collect system-level metrics."""
        metrics = []
        thresholds = self.config['system_thresholds']
        now = datetime.now()
        
        try:
            # CPU usage
            cpu_percent = psutil.cpu_percent(interval=1)
            cpu_status = self._determine_metric_status(
                cpu_percent, 
                thresholds['cpu_warning'], 
                thresholds['cpu_critical']
            )
            metrics.append(HealthMetric(
                name='cpu_usage',
                value=cpu_percent,
                unit='%',
                status=cpu_status,
                timestamp=now,
                threshold_warning=thresholds['cpu_warning'],
                threshold_critical=thresholds['cpu_critical']
            ))
            
            # Memory usage
            memory = psutil.virtual_memory()
            memory_status = self._determine_metric_status(
                memory.percent,
                thresholds['memory_warning'],
                thresholds['memory_critical']
            )
            metrics.append(HealthMetric(
                name='memory_usage',
                value=memory.percent,
                unit='%',
                status=memory_status,
                timestamp=now,
                threshold_warning=thresholds['memory_warning'],
                threshold_critical=thresholds['memory_critical'],
                context={
                    'available_gb': round(memory.available / (1024**3), 2),
                    'total_gb': round(memory.total / (1024**3), 2)
                }
            ))
            
            # Disk usage
            disk = psutil.disk_usage('/')
            disk_percent = (disk.used / disk.total) * 100
            disk_status = self._determine_metric_status(
                disk_percent,
                thresholds['disk_warning'],
                thresholds['disk_critical']
            )
            metrics.append(HealthMetric(
                name='disk_usage',
                value=disk_percent,
                unit='%',
                status=disk_status,
                timestamp=now,
                threshold_warning=thresholds['disk_warning'],
                threshold_critical=thresholds['disk_critical'],
                context={
                    'free_gb': round(disk.free / (1024**3), 2),
                    'total_gb': round(disk.total / (1024**3), 2)
                }
            ))
            
            # Network I/O
            network = psutil.net_io_counters()
            metrics.append(HealthMetric(
                name='network_bytes_sent',
                value=network.bytes_sent,
                unit='bytes',
                status=HealthStatus.HEALTHY,
                timestamp=now
            ))
            metrics.append(HealthMetric(
                name='network_bytes_recv',
                value=network.bytes_recv,
                unit='bytes',
                status=HealthStatus.HEALTHY,
                timestamp=now
            ))
            
            # Load average (Unix/Linux only)
            if hasattr(os, 'getloadavg'):
                load_avg = os.getloadavg()[0]  # 1-minute load average
                cpu_count = psutil.cpu_count()
                load_percent = (load_avg / cpu_count) * 100 if cpu_count > 0 else 0
                
                load_status = self._determine_metric_status(
                    load_percent, 
                    70,  # Warning at 70% of CPU capacity
                    100   # Critical at 100% of CPU capacity
                )
                metrics.append(HealthMetric(
                    name='load_average',
                    value=load_avg,
                    unit='load',
                    status=load_status,
                    timestamp=now,
                    context={'cpu_count': cpu_count, 'load_percent': load_percent}
                ))
            
            # Process count
            process_count = len(psutil.pids())
            metrics.append(HealthMetric(
                name='process_count',
                value=process_count,
                unit='processes',
                status=HealthStatus.HEALTHY,
                timestamp=now
            ))
            
        except Exception as e:
            self.logger.error(f"Error collecting system metrics: {e}")
            metrics.append(HealthMetric(
                name='metric_collection_error',
                value=1,
                unit='error',
                status=HealthStatus.CRITICAL,
                timestamp=now,
                context={'error': str(e)}
            ))
        
        return metrics
    
    def _check_service_health(self, service_name: str, service_config: Dict[str, Any]) -> ServiceHealth:
        """Check health of a specific service."""
        start_time = time.time()
        issues = []
        recommendations = []
        metrics = []
        status = HealthStatus.UNKNOWN
        
        try:
            check_method = service_config.get('check_method')
            
            if check_method == 'database_health':
                status, service_metrics, service_issues, service_recs = self._check_database_health()
            elif check_method == 'redis_health':
                status, service_metrics, service_issues, service_recs = self._check_redis_health()
            elif check_method == 'api_health':
                status, service_metrics, service_issues, service_recs = self._check_api_health(service_config['url'])
            elif check_method == 'port_health':
                status, service_metrics, service_issues, service_recs = self._check_port_health(
                    service_config['host'], service_config['port']
                )
            elif check_method == 'celery_health':
                status, service_metrics, service_issues, service_recs = self._check_celery_health()
            else:
                status = HealthStatus.UNKNOWN
                service_metrics = []
                service_issues = [f"Unknown check method: {check_method}"]
                service_recs = []
            
            metrics.extend(service_metrics)
            issues.extend(service_issues)
            recommendations.extend(service_recs)
            
        except Exception as e:
            status = HealthStatus.CRITICAL
            issues.append(f"Health check failed: {str(e)}")
            recommendations.append(f"Investigate {service_name} service connectivity")
            self.logger.error(f"Service health check failed for {service_name}: {e}")
        
        response_time = time.time() - start_time
        
        # Add response time metric
        response_time_status = self._determine_metric_status(
            response_time,
            self.config['system_thresholds']['response_time_warning'],
            self.config['system_thresholds']['response_time_critical']
        )
        metrics.append(HealthMetric(
            name=f'{service_name}_response_time',
            value=response_time,
            unit='seconds',
            status=response_time_status,
            timestamp=datetime.now()
        ))
        
        return ServiceHealth(
            service_name=service_name,
            service_type=service_config['type'],
            status=status,
            response_time=response_time,
            last_check=datetime.now(),
            metrics=metrics,
            issues=issues,
            recommendations=recommendations
        )
    
    def _check_database_health(self) -> Tuple[HealthStatus, List[HealthMetric], List[str], List[str]]:
        """Check PostgreSQL database health."""
        metrics = []
        issues = []
        recommendations = []
        
        if not self.db_engine:
            return HealthStatus.CRITICAL, metrics, ["Database connection not initialized"], ["Check DATABASE_URL configuration"]
        
        try:
            with self.db_engine.connect() as conn:
                # Basic connectivity test
                result = conn.execute(text("SELECT 1"))
                result.fetchone()
                
                # Get database statistics
                stats_query = text("""
                    SELECT 
                        pg_size_pretty(pg_database_size(current_database())) as db_size,
                        (SELECT count(*) FROM pg_stat_activity) as active_connections,
                        (SELECT count(*) FROM pg_stat_activity WHERE state = 'active') as active_queries
                """)
                stats = conn.execute(stats_query).fetchone()
                
                metrics.append(HealthMetric(
                    name='db_active_connections',
                    value=stats[1],
                    unit='connections',
                    status=HealthStatus.HEALTHY,
                    timestamp=datetime.now(),
                    context={'db_size': stats[0]}
                ))
                
                metrics.append(HealthMetric(
                    name='db_active_queries',
                    value=stats[2],
                    unit='queries',
                    status=HealthStatus.HEALTHY,
                    timestamp=datetime.now()
                ))
                
                # Check for long-running queries
                long_queries = conn.execute(text("""
                    SELECT count(*) FROM pg_stat_activity 
                    WHERE state = 'active' AND query_start < now() - interval '5 minutes'
                """)).fetchone()[0]
                
                if long_queries > 0:
                    issues.append(f"{long_queries} long-running queries detected")
                    recommendations.append("Investigate slow queries and consider optimization")
                
                # Check connection usage
                max_connections = conn.execute(text("SHOW max_connections")).fetchone()[0]
                connection_usage = (stats[1] / int(max_connections)) * 100
                
                if connection_usage > 80:
                    issues.append(f"High connection usage: {connection_usage:.1f}%")
                    recommendations.append("Consider connection pooling optimization")
                
                status = HealthStatus.DEGRADED if issues else HealthStatus.HEALTHY
                
        except Exception as e:
            status = HealthStatus.CRITICAL
            issues.append(f"Database check failed: {str(e)}")
            recommendations.append("Check PostgreSQL service status and connectivity")
        
        return status, metrics, issues, recommendations
    
    def _check_redis_health(self) -> Tuple[HealthStatus, List[HealthMetric], List[str], List[str]]:
        """Check Redis cache health."""
        metrics = []
        issues = []
        recommendations = []
        
        if not self.redis_client:
            return HealthStatus.CRITICAL, metrics, ["Redis connection not initialized"], ["Check REDIS_URL configuration"]
        
        try:
            # Basic connectivity test
            pong = self.redis_client.ping()
            if not pong:
                return HealthStatus.CRITICAL, metrics, ["Redis ping failed"], ["Check Redis service status"]
            
            # Get Redis info
            info = self.redis_client.info()
            
            # Memory usage
            used_memory = info.get('used_memory', 0)
            max_memory = info.get('maxmemory', 0)
            
            if max_memory > 0:
                memory_usage = (used_memory / max_memory) * 100
                memory_status = self._determine_metric_status(memory_usage, 80, 95)
                
                metrics.append(HealthMetric(
                    name='redis_memory_usage',
                    value=memory_usage,
                    unit='%',
                    status=memory_status,
                    timestamp=datetime.now(),
                    context={
                        'used_memory_human': info.get('used_memory_human'),
                        'maxmemory_human': info.get('maxmemory_human')
                    }
                ))
                
                if memory_usage > 80:
                    issues.append(f"High Redis memory usage: {memory_usage:.1f}%")
                    recommendations.append("Consider increasing Redis memory limit or implement cache eviction")
            
            # Connection metrics
            connected_clients = info.get('connected_clients', 0)
            metrics.append(HealthMetric(
                name='redis_connected_clients',
                value=connected_clients,
                unit='clients',
                status=HealthStatus.HEALTHY,
                timestamp=datetime.now()
            ))
            
            # Key count
            db0_keys = info.get('db0', {}).get('keys', 0) if 'db0' in info else 0
            metrics.append(HealthMetric(
                name='redis_key_count',
                value=db0_keys,
                unit='keys',
                status=HealthStatus.HEALTHY,
                timestamp=datetime.now()
            ))
            
            # Check for high CPU usage
            used_cpu = info.get('used_cpu_sys', 0) + info.get('used_cpu_user', 0)
            if used_cpu > 80:
                issues.append(f"High Redis CPU usage: {used_cpu:.1f}%")
                recommendations.append("Investigate Redis performance and optimize queries")
            
            status = HealthStatus.DEGRADED if issues else HealthStatus.HEALTHY
            
        except Exception as e:
            status = HealthStatus.CRITICAL
            issues.append(f"Redis check failed: {str(e)}")
            recommendations.append("Check Redis service status and connectivity")
        
        return status, metrics, issues, recommendations
    
    def _check_api_health(self, url: str) -> Tuple[HealthStatus, List[HealthMetric], List[str], List[str]]:
        """Check API endpoint health."""
        metrics = []
        issues = []
        recommendations = []
        
        try:
            response = requests.get(url, timeout=self.config['health_check_timeout'])
            
            # Response time metric
            response_time = response.elapsed.total_seconds()
            response_time_status = self._determine_metric_status(
                response_time,
                self.config['system_thresholds']['response_time_warning'],
                self.config['system_thresholds']['response_time_critical']
            )
            
            metrics.append(HealthMetric(
                name='api_response_time',
                value=response_time,
                unit='seconds',
                status=response_time_status,
                timestamp=datetime.now()
            ))
            
            # Status code check
            if response.status_code == 200:
                status = HealthStatus.HEALTHY
                
                # Try to parse response data
                try:
                    data = response.json()
                    if isinstance(data, dict) and 'status' in data:
                        api_status = data.get('status', 'unknown')
                        if api_status != 'ok':
                            issues.append(f"API reports status: {api_status}")
                            status = HealthStatus.DEGRADED
                except:
                    pass  # Non-JSON response is okay
                    
            elif 400 <= response.status_code < 500:
                status = HealthStatus.DEGRADED
                issues.append(f"API returned client error: {response.status_code}")
                recommendations.append("Check API endpoint configuration and authentication")
            else:
                status = HealthStatus.CRITICAL
                issues.append(f"API returned server error: {response.status_code}")
                recommendations.append("Check API service status and logs")
            
            # Response time warnings
            if response_time > self.config['system_thresholds']['response_time_warning']:
                issues.append(f"Slow API response: {response_time:.2f}s")
                recommendations.append("Investigate API performance and optimize if needed")
                
        except requests.exceptions.Timeout:
            status = HealthStatus.CRITICAL
            issues.append("API request timed out")
            recommendations.append("Check API service availability and network connectivity")
        except requests.exceptions.ConnectionError:
            status = HealthStatus.CRITICAL
            issues.append("Cannot connect to API")
            recommendations.append("Check if API service is running and accessible")
        except Exception as e:
            status = HealthStatus.CRITICAL
            issues.append(f"API check failed: {str(e)}")
            recommendations.append("Investigate API service status")
        
        return status, metrics, issues, recommendations
    
    def _check_port_health(self, host: str, port: int) -> Tuple[HealthStatus, List[HealthMetric], List[str], List[str]]:
        """Check if a port is accessible."""
        metrics = []
        issues = []
        recommendations = []
        
        try:
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(self.config['health_check_timeout'])
            
            start_time = time.time()
            result = sock.connect_ex((host, port))
            response_time = time.time() - start_time
            sock.close()
            
            metrics.append(HealthMetric(
                name='port_response_time',
                value=response_time,
                unit='seconds',
                status=HealthStatus.HEALTHY if result == 0 else HealthStatus.CRITICAL,
                timestamp=datetime.now()
            ))
            
            if result == 0:
                status = HealthStatus.HEALTHY
            else:
                status = HealthStatus.CRITICAL
                issues.append(f"Port {port} not accessible on {host}")
                recommendations.append(f"Check if service is running on port {port}")
                
        except Exception as e:
            status = HealthStatus.CRITICAL
            issues.append(f"Port check failed: {str(e)}")
            recommendations.append(f"Investigate network connectivity to {host}:{port}")
        
        return status, metrics, issues, recommendations
    
    def _check_celery_health(self) -> Tuple[HealthStatus, List[HealthMetric], List[str], List[str]]:
        """Check Celery worker health."""
        metrics = []
        issues = []
        recommendations = []
        
        try:
            # Try to get Celery worker status
            result = subprocess.run(
                ['celery', '-A', 'celery_worker.celery', 'inspect', 'active'],
                cwd=self.project_root / 'backend',
                capture_output=True,
                text=True,
                timeout=10
            )
            
            if result.returncode == 0:
                status = HealthStatus.HEALTHY
                
                # Count active tasks
                try:
                    output = result.stdout
                    if 'empty' in output.lower():
                        active_tasks = 0
                    else:
                        # Simple count of task entries
                        active_tasks = output.count('"id":')
                    
                    metrics.append(HealthMetric(
                        name='celery_active_tasks',
                        value=active_tasks,
                        unit='tasks',
                        status=HealthStatus.HEALTHY,
                        timestamp=datetime.now()
                    ))
                    
                except Exception:
                    pass  # Parsing failed, but worker is responsive
                    
            else:
                status = HealthStatus.CRITICAL
                issues.append("Celery worker not responding")
                recommendations.append("Check Celery worker status and restart if needed")
                
        except subprocess.TimeoutExpired:
            status = HealthStatus.CRITICAL
            issues.append("Celery health check timed out")
            recommendations.append("Celery worker may be unresponsive - consider restart")
        except FileNotFoundError:
            status = HealthStatus.UNKNOWN
            issues.append("Celery command not found")
            recommendations.append("Check Celery installation and environment")
        except Exception as e:
            status = HealthStatus.CRITICAL
            issues.append(f"Celery check failed: {str(e)}")
            recommendations.append("Investigate Celery worker configuration")
        
        return status, metrics, issues, recommendations
    
    def _determine_metric_status(self, value: float, warning_threshold: float, critical_threshold: float) -> HealthStatus:
        """Determine health status based on metric value and thresholds."""
        if value >= critical_threshold:
            return HealthStatus.CRITICAL
        elif value >= warning_threshold:
            return HealthStatus.DEGRADED
        else:
            return HealthStatus.HEALTHY
    
    def _calculate_overall_health(self, system_metrics: List[HealthMetric], service_healths: List[ServiceHealth]) -> Tuple[float, HealthStatus]:
        """Calculate overall system health score."""
        total_score = 0
        weight_sum = 0
        
        # Weight system metrics
        for metric in system_metrics:
            weight = 1.0
            if metric.status == HealthStatus.HEALTHY:
                score = 1.0
            elif metric.status == HealthStatus.DEGRADED:
                score = 0.6
            elif metric.status == HealthStatus.CRITICAL:
                score = 0.2
            else:
                score = 0.5
            
            total_score += score * weight
            weight_sum += weight
        
        # Weight service health (critical services have higher weight)
        for service_health in service_healths:
            weight = 2.0 if self.services_config.get(service_health.service_name, {}).get('critical_for_system', False) else 1.0
            
            if service_health.status == HealthStatus.HEALTHY:
                score = 1.0
            elif service_health.status == HealthStatus.DEGRADED:
                score = 0.6
            elif service_health.status == HealthStatus.CRITICAL:
                score = 0.1
            else:
                score = 0.5
            
            total_score += score * weight
            weight_sum += weight
        
        overall_score = total_score / weight_sum if weight_sum > 0 else 0.5
        
        # Determine overall status
        if overall_score >= 0.8:
            overall_status = HealthStatus.HEALTHY
        elif overall_score >= 0.5:
            overall_status = HealthStatus.DEGRADED
        else:
            overall_status = HealthStatus.CRITICAL
        
        return overall_score, overall_status
    
    def _generate_alerts(self, system_metrics: List[HealthMetric], service_healths: List[ServiceHealth]) -> List[Dict[str, Any]]:
        """Generate alerts based on health status."""
        alerts = []
        now = datetime.now()
        
        # System metric alerts
        for metric in system_metrics:
            if metric.status in [HealthStatus.CRITICAL, HealthStatus.DEGRADED]:
                alert_key = f"system_metric_{metric.name}"
                
                # Check alert cooldown
                if self._should_send_alert(alert_key):
                    alert = {
                        'type': 'system_metric',
                        'severity': 'critical' if metric.status == HealthStatus.CRITICAL else 'warning',
                        'metric_name': metric.name,
                        'current_value': metric.value,
                        'threshold_warning': metric.threshold_warning,
                        'threshold_critical': metric.threshold_critical,
                        'message': f"System {metric.name} is {metric.status.value}: {metric.value}{metric.unit}",
                        'timestamp': now.isoformat()
                    }
                    alerts.append(alert)
                    self.alert_state[alert_key]['last_sent'] = now
        
        # Service alerts
        for service_health in service_healths:
            if service_health.status in [HealthStatus.CRITICAL, HealthStatus.DEGRADED]:
                alert_key = f"service_{service_health.service_name}"
                
                if self._should_send_alert(alert_key):
                    alert = {
                        'type': 'service',
                        'severity': 'critical' if service_health.status == HealthStatus.CRITICAL else 'warning',
                        'service_name': service_health.service_name,
                        'service_type': service_health.service_type.value,
                        'status': service_health.status.value,
                        'issues': service_health.issues,
                        'response_time': service_health.response_time,
                        'message': f"Service {service_health.service_name} is {service_health.status.value}",
                        'timestamp': now.isoformat()
                    }
                    alerts.append(alert)
                    self.alert_state[alert_key]['last_sent'] = now
        
        return alerts
    
    def _should_send_alert(self, alert_key: str) -> bool:
        """Check if alert should be sent based on cooldown."""
        if alert_key not in self.alert_state:
            self.alert_state[alert_key] = {}
            return True
        
        last_sent = self.alert_state[alert_key].get('last_sent')
        if not last_sent:
            return True
        
        cooldown_seconds = self.config['alert_cooldown']
        time_since_last = (datetime.now() - last_sent).total_seconds()
        
        return time_since_last >= cooldown_seconds
    
    def _analyze_health_trends(self) -> Dict[str, Any]:
        """Analyze health trends from historical data."""
        trends = {
            'overall_score_trend': 'stable',
            'service_availability_trend': {},
            'system_resource_trends': {},
            'alert_frequency_trend': 'stable'
        }
        
        if len(self.health_history) < 2:
            return trends
        
        # Analyze overall score trend
        recent_scores = [report.overall_score for report in list(self.health_history)[-10:]]
        if len(recent_scores) >= 2:
            if recent_scores[-1] > recent_scores[0] * 1.1:
                trends['overall_score_trend'] = 'improving'
            elif recent_scores[-1] < recent_scores[0] * 0.9:
                trends['overall_score_trend'] = 'degrading'
        
        # Analyze service trends
        service_trends = defaultdict(list)
        for report in list(self.health_history)[-20:]:
            for service in report.services:
                service_trends[service.service_name].append(service.status.value)
        
        for service_name, status_history in service_trends.items():
            if len(status_history) >= 2:
                recent_healthy = sum(1 for s in status_history[-5:] if s == 'healthy')
                earlier_healthy = sum(1 for s in status_history[:5] if s == 'healthy')
                
                if recent_healthy > earlier_healthy:
                    trends['service_availability_trend'][service_name] = 'improving'
                elif recent_healthy < earlier_healthy:
                    trends['service_availability_trend'][service_name] = 'degrading'
                else:
                    trends['service_availability_trend'][service_name] = 'stable'
        
        return trends
    
    def _generate_health_recommendations(self, system_metrics: List[HealthMetric], service_healths: List[ServiceHealth], alerts: List[Dict[str, Any]]) -> List[str]:
        """Generate recommendations for improving system health."""
        recommendations = []
        
        # Critical alerts recommendations
        critical_alerts = [a for a in alerts if a.get('severity') == 'critical']
        if critical_alerts:
            recommendations.append(f"URGENT: Address {len(critical_alerts)} critical issues immediately")
        
        # System resource recommendations
        for metric in system_metrics:
            if metric.status == HealthStatus.CRITICAL:
                if metric.name == 'cpu_usage':
                    recommendations.append("High CPU usage detected - consider scaling or optimizing processes")
                elif metric.name == 'memory_usage':
                    recommendations.append("High memory usage detected - check for memory leaks or increase system RAM")
                elif metric.name == 'disk_usage':
                    recommendations.append("High disk usage detected - clean up old files or expand storage")
        
        # Service-specific recommendations
        critical_services = [s for s in service_healths if s.status == HealthStatus.CRITICAL]
        if critical_services:
            for service in critical_services:
                recommendations.extend(service.recommendations[:2])  # Top 2 recommendations per service
        
        # Performance recommendations
        slow_services = [s for s in service_healths if s.response_time and s.response_time > 2.0]
        if slow_services:
            recommendations.append(f"Performance issue: {len(slow_services)} services have slow response times")
        
        # General maintenance recommendations
        degraded_services = [s for s in service_healths if s.status == HealthStatus.DEGRADED]
        if len(degraded_services) > 2:
            recommendations.append("Multiple services show degraded performance - consider system maintenance")
        
        return recommendations[:10]  # Limit to top 10 recommendations
    
    def _store_health_report(self, report: SystemHealthReport):
        """Store health report in history and external storage."""
        # Add to in-memory history
        self.health_history.append(report)
        
        # Store in Redis for fast access
        if self.redis_client:
            try:
                report_data = {
                    'timestamp': report.timestamp.isoformat(),
                    'overall_status': report.overall_status.value,
                    'overall_score': report.overall_score,
                    'service_count': len(report.services),
                    'alert_count': len(report.alerts),
                    'critical_services': [s.service_name for s in report.services if s.status == HealthStatus.CRITICAL]
                }
                
                key = f"lokdarpan:health:{report.timestamp.strftime('%Y%m%d_%H%M%S')}"
                self.redis_client.setex(key, 86400, json.dumps(report_data))  # Store for 24 hours
                
                # Update latest health status
                self.redis_client.setex('lokdarpan:health:latest', 3600, json.dumps(report_data))
                
            except Exception as e:
                self.logger.error(f"Failed to store health report in Redis: {e}")
        
        # Clean up old history
        cutoff_time = datetime.now() - timedelta(hours=self.config['history_retention_hours'])
        self.health_history = deque([r for r in self.health_history if r.timestamp > cutoff_time], maxlen=1000)
    
    def start_continuous_monitoring(self):
        """Start continuous health monitoring in background thread."""
        if self.monitoring_active:
            self.logger.warning("Monitoring already active")
            return
        
        self.monitoring_active = True
        self.monitor_thread = threading.Thread(target=self._monitoring_loop, daemon=True)
        self.monitor_thread.start()
        
        self.logger.info("Started continuous health monitoring")
    
    def stop_continuous_monitoring(self):
        """Stop continuous health monitoring."""
        self.monitoring_active = False
        if self.monitor_thread:
            self.monitor_thread.join(timeout=10)
        
        self.logger.info("Stopped continuous health monitoring")
    
    def _monitoring_loop(self):
        """Main monitoring loop for continuous health checks."""
        while self.monitoring_active:
            try:
                report = self.run_health_check()
                
                # Put report in queue for external consumption
                try:
                    self.health_queue.put_nowait(report)
                except queue.Full:
                    pass  # Queue full, skip this report
                
                # Sleep for monitoring interval
                time.sleep(self.config['monitoring_interval'])
                
            except Exception as e:
                self.logger.error(f"Error in monitoring loop: {e}")
                time.sleep(10)  # Wait before retrying
    
    def get_latest_health_report(self) -> Optional[SystemHealthReport]:
        """Get the most recent health report."""
        try:
            return self.health_queue.get_nowait()
        except queue.Empty:
            return None
    
    def get_health_summary(self) -> Dict[str, Any]:
        """Get a quick health summary."""
        if not self.health_history:
            return {'status': 'no_data'}
        
        latest_report = self.health_history[-1]
        
        return {
            'timestamp': latest_report.timestamp.isoformat(),
            'overall_status': latest_report.overall_status.value,
            'overall_score': latest_report.overall_score,
            'services': {
                'total': len(latest_report.services),
                'healthy': sum(1 for s in latest_report.services if s.status == HealthStatus.HEALTHY),
                'degraded': sum(1 for s in latest_report.services if s.status == HealthStatus.DEGRADED),
                'critical': sum(1 for s in latest_report.services if s.status == HealthStatus.CRITICAL)
            },
            'alerts': len(latest_report.alerts),
            'critical_alerts': sum(1 for a in latest_report.alerts if a.get('severity') == 'critical')
        }


def main():
    """Main entry point for health monitoring."""
    parser = argparse.ArgumentParser(description='LokDarpan System Health Monitor')
    parser.add_argument('--config', help='Configuration file path')
    parser.add_argument('--check', action='store_true', help='Run single health check')
    parser.add_argument('--monitor', action='store_true', help='Start continuous monitoring')
    parser.add_argument('--summary', action='store_true', help='Show health summary')
    parser.add_argument('--duration', type=int, default=0, help='Monitoring duration in seconds (0 = infinite)')
    
    args = parser.parse_args()
    
    # Initialize health monitor
    monitor = HealthMonitor(args.config)
    
    if args.check or not any([args.monitor, args.summary]):
        # Run single health check
        report = monitor.run_health_check()
        
        print(f"🏥 System Health Report - {report.timestamp.strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"Overall Status: {report.overall_status.value.upper()}")
        print(f"Health Score: {report.overall_score:.2f}/1.0")
        print()
        
        # Services summary
        print("📊 Services:")
        for service in report.services:
            status_icon = {"healthy": "✅", "degraded": "⚠️", "critical": "❌", "unknown": "❓"}
            print(f"  {status_icon.get(service.status.value, '❓')} {service.service_name}: {service.status.value} ({service.response_time:.3f}s)")
            
            if service.issues:
                for issue in service.issues[:2]:  # Show top 2 issues
                    print(f"    - {issue}")
        
        # System metrics summary
        print("\n💻 System Metrics:")
        critical_metrics = [m for m in report.system_metrics if m.status != HealthStatus.HEALTHY]
        if critical_metrics:
            for metric in critical_metrics:
                status_icon = {"healthy": "✅", "degraded": "⚠️", "critical": "❌", "unknown": "❓"}
                print(f"  {status_icon.get(metric.status.value, '❓')} {metric.name}: {metric.value}{metric.unit}")
        else:
            print("  ✅ All system metrics healthy")
        
        # Alerts
        if report.alerts:
            print(f"\n🚨 Alerts ({len(report.alerts)}):")
            for alert in report.alerts[:5]:  # Show top 5 alerts
                severity_icon = {"critical": "🔴", "warning": "🟡", "info": "🔵"}
                print(f"  {severity_icon.get(alert.get('severity'), '⚪')} {alert.get('message', 'Unknown alert')}")
        
        # Recommendations
        if report.recommendations:
            print(f"\n💡 Top Recommendations:")
            for rec in report.recommendations[:3]:
                print(f"  - {rec}")
    
    elif args.summary:
        summary = monitor.get_health_summary()
        if summary.get('status') == 'no_data':
            print("No health data available. Run --check first.")
        else:
            print("🏥 Health Summary:")
            print(f"Status: {summary['overall_status'].upper()}")
            print(f"Score: {summary['overall_score']:.2f}/1.0")
            print(f"Services: {summary['services']['healthy']}✅ {summary['services']['degraded']}⚠️ {summary['services']['critical']}❌")
            if summary['critical_alerts'] > 0:
                print(f"🚨 {summary['critical_alerts']} critical alerts")
    
    elif args.monitor:
        print("🔄 Starting continuous health monitoring...")
        print("Press Ctrl+C to stop")
        
        monitor.start_continuous_monitoring()
        
        try:
            start_time = time.time()
            while True:
                # Get latest report if available
                report = monitor.get_latest_health_report()
                if report:
                    print(f"{report.timestamp.strftime('%H:%M:%S')} - Health Score: {report.overall_score:.2f} - Status: {report.overall_status.value}")
                    
                    # Show critical alerts
                    critical_alerts = [a for a in report.alerts if a.get('severity') == 'critical']
                    if critical_alerts:
                        for alert in critical_alerts:
                            print(f"  🚨 CRITICAL: {alert.get('message')}")
                
                # Check duration limit
                if args.duration > 0 and (time.time() - start_time) >= args.duration:
                    break
                
                time.sleep(1)
                
        except KeyboardInterrupt:
            pass
        
        monitor.stop_continuous_monitoring()
        print("\n✅ Monitoring stopped")


if __name__ == '__main__':
    main()