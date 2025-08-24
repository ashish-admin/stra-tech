#!/usr/bin/env python3
"""
LokDarpan Living Documentation Engine

A comprehensive system for maintaining up-to-date documentation that evolves
with the system, integrates error tracking, and provides actionable insights
for development teams.

Features:
- Automated documentation updates based on code changes
- Error pattern analysis and documentation
- System health monitoring integration
- Git-based documentation versioning
- Real-time issue detection and documentation

Author: LokDarpan Team
Version: 1.0.0
"""

import os
import sys
import json
import logging
import subprocess
import time
import yaml
import hashlib
import shutil
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, asdict
from collections import defaultdict
import tempfile
import re
import argparse

# Add the backend directory to Python path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))

try:
    import requests
    import git
    import psycopg2
    import redis
    from jinja2 import Template, Environment, FileSystemLoader
    from sqlalchemy import create_engine, text
except ImportError as e:
    print(f"Required dependency missing: {e}")
    print("Install with: pip install requests GitPython psycopg2-binary redis jinja2 sqlalchemy")
    sys.exit(1)

@dataclass
class DocumentationState:
    """Represents the current state of documentation."""
    last_updated: datetime
    version: str
    git_commit: str
    error_count: int
    health_score: float
    issues_detected: List[str]
    components_documented: int
    
class LivingDocsEngine:
    """
    Core engine for living documentation system.
    
    Maintains documentation that automatically updates based on:
    - Code changes and git commits
    - Error patterns and frequency
    - System health metrics
    - Performance telemetry data
    - Infrastructure changes
    """
    
    def __init__(self, config_path: Optional[str] = None):
        self.config = self._load_config(config_path)
        self.project_root = Path(self.config['project_root'])
        self.docs_root = self.project_root / 'docs' / 'living'
        self.templates_dir = Path(__file__).parent / 'templates' / 'docs'
        
        # Ensure directories exist
        self.docs_root.mkdir(parents=True, exist_ok=True)
        self.templates_dir.mkdir(parents=True, exist_ok=True)
        
        # Initialize components
        self.git_repo = self._init_git()
        self.db_engine = self._init_database()
        self.redis_client = self._init_redis()
        
        # Set up logging
        self.logger = self._setup_logging()
        
        # Initialize Jinja2 for templating
        self.jinja_env = Environment(
            loader=FileSystemLoader([str(self.templates_dir), str(self.project_root / 'scripts' / 'templates')]),
            autoescape=True,
            trim_blocks=True,
            lstrip_blocks=True
        )
        
        # Documentation state
        self.doc_state = self._load_documentation_state()
        
        self.logger.info("LivingDocsEngine initialized successfully")
    
    def _load_config(self, config_path: Optional[str] = None) -> Dict[str, Any]:
        """Load configuration from file or environment."""
        default_config = {
            'project_root': os.path.dirname(os.path.dirname(__file__)),
            'database_url': os.getenv('DATABASE_URL', 'postgresql://postgres:amuktha@localhost/lokdarpan_db'),
            'redis_url': os.getenv('REDIS_URL', 'redis://localhost:6379/0'),
            'api_base_url': os.getenv('API_BASE_URL', 'http://localhost:5000'),
            'error_threshold_minutes': 60,
            'health_check_interval': 300,
            'documentation_update_interval': 1800,
            'max_error_history_days': 7,
            'components_to_monitor': [
                'backend/app',
                'frontend/src',
                'scripts',
                'docs',
                'migrations'
            ]
        }
        
        if config_path and os.path.exists(config_path):
            with open(config_path, 'r') as f:
                if config_path.endswith('.yaml') or config_path.endswith('.yml'):
                    file_config = yaml.safe_load(f)
                else:
                    file_config = json.load(f)
                default_config.update(file_config)
        
        return default_config
    
    def _init_git(self):
        """Initialize Git repository."""
        try:
            return git.Repo(self.project_root)
        except git.exc.InvalidGitRepositoryError:
            self.logger.error("Not a valid Git repository")
            return None
    
    def _init_database(self):
        """Initialize database connection."""
        try:
            return create_engine(self.config['database_url'])
        except Exception as e:
            self.logger.error(f"Database connection failed: {e}")
            return None
    
    def _init_redis(self):
        """Initialize Redis connection."""
        try:
            client = redis.from_url(self.config['redis_url'], decode_responses=True)
            client.ping()  # Test connection
            return client
        except Exception as e:
            self.logger.warning(f"Redis connection failed: {e}")
            return None
    
    def _setup_logging(self) -> logging.Logger:
        """Set up structured logging."""
        logger = logging.getLogger('living_docs')
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
            file_handler = logging.FileHandler(log_dir / 'living_docs.log')
            file_formatter = logging.Formatter(
                '%(asctime)s [%(levelname)s] %(name)s:%(lineno)d - %(message)s'
            )
            file_handler.setFormatter(file_formatter)
            logger.addHandler(file_handler)
        
        return logger
    
    def _load_documentation_state(self) -> DocumentationState:
        """Load current documentation state."""
        state_file = self.docs_root / '.state.json'
        
        if state_file.exists():
            try:
                with open(state_file, 'r') as f:
                    data = json.load(f)
                    return DocumentationState(
                        last_updated=datetime.fromisoformat(data['last_updated']),
                        version=data['version'],
                        git_commit=data['git_commit'],
                        error_count=data['error_count'],
                        health_score=data['health_score'],
                        issues_detected=data['issues_detected'],
                        components_documented=data['components_documented']
                    )
            except Exception as e:
                self.logger.warning(f"Failed to load documentation state: {e}")
        
        # Return default state
        return DocumentationState(
            last_updated=datetime.now(),
            version='1.0.0',
            git_commit=self._get_current_commit(),
            error_count=0,
            health_score=1.0,
            issues_detected=[],
            components_documented=0
        )
    
    def _save_documentation_state(self):
        """Save current documentation state."""
        state_file = self.docs_root / '.state.json'
        
        try:
            with open(state_file, 'w') as f:
                json.dump(asdict(self.doc_state), f, indent=2, default=str)
        except Exception as e:
            self.logger.error(f"Failed to save documentation state: {e}")
    
    def _get_current_commit(self) -> str:
        """Get current Git commit hash."""
        if self.git_repo:
            return self.git_repo.head.commit.hexsha[:8]
        return 'unknown'
    
    def run_full_documentation_update(self) -> Dict[str, Any]:
        """Run complete documentation update cycle."""
        self.logger.info("Starting full documentation update cycle")
        
        start_time = time.time()
        results = {
            'timestamp': datetime.now().isoformat(),
            'duration': 0,
            'updates_made': 0,
            'errors_found': 0,
            'health_score': 1.0,
            'actions_taken': []
        }
        
        try:
            # 1. Analyze current system state
            system_state = self.analyze_system_state()
            results['system_state'] = system_state
            results['actions_taken'].append("Analyzed system state")
            
            # 2. Collect error data
            error_analysis = self.analyze_error_patterns()
            results['error_analysis'] = error_analysis
            results['errors_found'] = error_analysis['total_errors']
            results['actions_taken'].append("Analyzed error patterns")
            
            # 3. Check system health
            health_check = self.perform_health_check()
            results['health_check'] = health_check
            results['health_score'] = health_check['overall_score']
            results['actions_taken'].append("Performed health check")
            
            # 4. Update documentation sections
            doc_updates = self.update_documentation_sections(system_state, error_analysis, health_check)
            results['documentation_updates'] = doc_updates
            results['updates_made'] = doc_updates['sections_updated']
            results['actions_taken'].append("Updated documentation sections")
            
            # 5. Generate issue reports
            issue_reports = self.generate_issue_reports(error_analysis, health_check)
            results['issue_reports'] = issue_reports
            results['actions_taken'].append("Generated issue reports")
            
            # 6. Update process documentation
            process_updates = self.update_process_documentation()
            results['process_updates'] = process_updates
            results['actions_taken'].append("Updated process documentation")
            
            # 7. Create maintenance scripts if needed
            maintenance_scripts = self.generate_maintenance_scripts(error_analysis, health_check)
            results['maintenance_scripts'] = maintenance_scripts
            results['actions_taken'].append("Generated maintenance scripts")
            
            # Update documentation state
            self.doc_state.last_updated = datetime.now()
            self.doc_state.git_commit = self._get_current_commit()
            self.doc_state.error_count = error_analysis['total_errors']
            self.doc_state.health_score = health_check['overall_score']
            self.doc_state.issues_detected = [issue['title'] for issue in issue_reports.get('issues', [])]
            
            self._save_documentation_state()
            
        except Exception as e:
            self.logger.error(f"Documentation update failed: {e}", exc_info=True)
            results['error'] = str(e)
            results['actions_taken'].append(f"ERROR: {str(e)}")
        
        results['duration'] = time.time() - start_time
        self.logger.info(f"Documentation update completed in {results['duration']:.2f} seconds")
        
        return results
    
    def analyze_system_state(self) -> Dict[str, Any]:
        """Analyze current system state from multiple sources."""
        self.logger.info("Analyzing system state")
        
        state = {
            'timestamp': datetime.now().isoformat(),
            'git_info': {},
            'file_changes': {},
            'dependency_status': {},
            'service_status': {},
            'performance_metrics': {}
        }
        
        # Git information
        if self.git_repo:
            try:
                state['git_info'] = {
                    'current_branch': self.git_repo.active_branch.name,
                    'current_commit': self.git_repo.head.commit.hexsha[:8],
                    'commit_message': self.git_repo.head.commit.message.strip(),
                    'author': str(self.git_repo.head.commit.author),
                    'commit_date': self.git_repo.head.commit.committed_datetime.isoformat(),
                    'changed_files': self._get_recent_changed_files(),
                    'untracked_files': [item.a_path for item in self.git_repo.index.diff(None)]
                }
            except Exception as e:
                self.logger.error(f"Git analysis failed: {e}")
                state['git_info']['error'] = str(e)
        
        # File change analysis
        state['file_changes'] = self._analyze_file_changes()
        
        # Dependency status
        state['dependency_status'] = self._check_dependency_status()
        
        # Service status
        state['service_status'] = self._check_service_status()
        
        # Performance metrics from Redis if available
        if self.redis_client:
            state['performance_metrics'] = self._get_performance_metrics()
        
        return state
    
    def analyze_error_patterns(self) -> Dict[str, Any]:
        """Analyze error patterns from multiple sources."""
        self.logger.info("Analyzing error patterns")
        
        analysis = {
            'timestamp': datetime.now().isoformat(),
            'total_errors': 0,
            'error_categories': {},
            'error_trends': {},
            'critical_issues': [],
            'recommendations': []
        }
        
        # Get errors from Redis
        if self.redis_client:
            redis_errors = self._get_redis_errors()
            analysis['redis_errors'] = redis_errors
            analysis['total_errors'] += redis_errors.get('count', 0)
        
        # Get errors from database
        if self.db_engine:
            db_errors = self._get_database_errors()
            analysis['database_errors'] = db_errors
            analysis['total_errors'] += db_errors.get('count', 0)
        
        # Parse log files
        log_errors = self._parse_log_files()
        analysis['log_errors'] = log_errors
        analysis['total_errors'] += log_errors.get('count', 0)
        
        # Analyze patterns
        analysis['error_categories'] = self._categorize_errors(
            redis_errors, db_errors, log_errors
        )
        
        analysis['error_trends'] = self._analyze_error_trends(
            redis_errors, db_errors, log_errors
        )
        
        # Identify critical issues
        analysis['critical_issues'] = self._identify_critical_issues(analysis)
        
        # Generate recommendations
        analysis['recommendations'] = self._generate_error_recommendations(analysis)
        
        return analysis
    
    def perform_health_check(self) -> Dict[str, Any]:
        """Perform comprehensive system health check."""
        self.logger.info("Performing health check")
        
        health = {
            'timestamp': datetime.now().isoformat(),
            'overall_score': 1.0,
            'components': {},
            'alerts': [],
            'recommendations': []
        }
        
        checks = [
            ('database', self._check_database_health),
            ('redis', self._check_redis_health),
            ('api', self._check_api_health),
            ('filesystem', self._check_filesystem_health),
            ('dependencies', self._check_dependencies_health),
            ('performance', self._check_performance_health)
        ]
        
        total_score = 0
        component_count = 0
        
        for component_name, check_func in checks:
            try:
                component_health = check_func()
                health['components'][component_name] = component_health
                total_score += component_health.get('score', 0)
                component_count += 1
                
                # Add alerts for failing components
                if component_health.get('score', 1) < 0.5:
                    health['alerts'].append({
                        'component': component_name,
                        'severity': 'high',
                        'message': f"{component_name} health check failed",
                        'details': component_health
                    })
            except Exception as e:
                self.logger.error(f"Health check failed for {component_name}: {e}")
                health['components'][component_name] = {
                    'status': 'error',
                    'score': 0,
                    'error': str(e)
                }
        
        if component_count > 0:
            health['overall_score'] = total_score / component_count
        
        # Generate health recommendations
        health['recommendations'] = self._generate_health_recommendations(health)
        
        return health
    
    def update_documentation_sections(self, system_state: Dict, error_analysis: Dict, health_check: Dict) -> Dict[str, Any]:
        """Update various documentation sections based on current state."""
        self.logger.info("Updating documentation sections")
        
        updates = {
            'sections_updated': 0,
            'files_created': [],
            'files_modified': [],
            'errors': []
        }
        
        # Define documentation sections to update
        sections = [
            {
                'name': 'system_status',
                'template': 'system_status.md.j2',
                'output': 'SYSTEM_STATUS.md',
                'data': {
                    'system_state': system_state,
                    'health_check': health_check,
                    'error_analysis': error_analysis
                }
            },
            {
                'name': 'error_tracking',
                'template': 'error_tracking.md.j2',
                'output': 'ERROR_TRACKING.md',
                'data': {'error_analysis': error_analysis}
            },
            {
                'name': 'troubleshooting',
                'template': 'troubleshooting.md.j2',
                'output': 'TROUBLESHOOTING.md',
                'data': {
                    'health_check': health_check,
                    'error_analysis': error_analysis,
                    'common_issues': self._get_common_issues()
                }
            },
            {
                'name': 'deployment_status',
                'template': 'deployment_status.md.j2',
                'output': 'DEPLOYMENT_STATUS.md',
                'data': {
                    'system_state': system_state,
                    'health_check': health_check
                }
            }
        ]
        
        for section in sections:
            try:
                output_path = self.docs_root / section['output']
                
                # Check if update is needed
                if self._should_update_section(section, output_path):
                    content = self._render_template(section['template'], section['data'])
                    
                    # Write content
                    with open(output_path, 'w') as f:
                        f.write(content)
                    
                    if output_path.exists():
                        updates['files_modified'].append(str(output_path))
                    else:
                        updates['files_created'].append(str(output_path))
                    
                    updates['sections_updated'] += 1
                    
                    self.logger.info(f"Updated documentation section: {section['name']}")
            
            except Exception as e:
                error_msg = f"Failed to update section {section['name']}: {e}"
                self.logger.error(error_msg)
                updates['errors'].append(error_msg)
        
        return updates
    
    def generate_issue_reports(self, error_analysis: Dict, health_check: Dict) -> Dict[str, Any]:
        """Generate detailed issue reports for developers."""
        self.logger.info("Generating issue reports")
        
        reports = {
            'issues': [],
            'reports_created': 0,
            'priority_issues': 0
        }
        
        # High priority issues from health check
        for component, health in health_check.get('components', {}).items():
            if health.get('score', 1) < 0.3:
                reports['issues'].append({
                    'title': f"{component.title()} Health Critical",
                    'severity': 'critical',
                    'category': 'system_health',
                    'description': f"{component} component is in critical state",
                    'details': health,
                    'recommendations': health.get('recommendations', []),
                    'created_at': datetime.now().isoformat()
                })
                reports['priority_issues'] += 1
        
        # Error pattern issues
        for category, errors in error_analysis.get('error_categories', {}).items():
            if errors.get('count', 0) > 10:  # More than 10 errors in category
                reports['issues'].append({
                    'title': f"High Error Rate in {category.title()}",
                    'severity': 'high',
                    'category': 'error_pattern',
                    'description': f"Detected {errors['count']} errors in {category} category",
                    'details': errors,
                    'recommendations': self._get_error_recommendations(category, errors),
                    'created_at': datetime.now().isoformat()
                })
        
        # Create individual issue reports
        issues_dir = self.docs_root / 'issues'
        issues_dir.mkdir(exist_ok=True)
        
        for issue in reports['issues']:
            try:
                issue_file = issues_dir / f"{issue['category']}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.md"
                
                content = self._render_template('issue_report.md.j2', {'issue': issue})
                
                with open(issue_file, 'w') as f:
                    f.write(content)
                
                reports['reports_created'] += 1
                
            except Exception as e:
                self.logger.error(f"Failed to create issue report: {e}")
        
        return reports
    
    def update_process_documentation(self) -> Dict[str, Any]:
        """Update process documentation based on current practices."""
        self.logger.info("Updating process documentation")
        
        updates = {
            'processes_updated': 0,
            'files_modified': []
        }
        
        # Update development processes
        dev_process = self._analyze_development_process()
        if dev_process:
            process_file = self.docs_root / 'DEVELOPMENT_PROCESS.md'
            content = self._render_template('development_process.md.j2', dev_process)
            
            with open(process_file, 'w') as f:
                f.write(content)
            
            updates['files_modified'].append(str(process_file))
            updates['processes_updated'] += 1
        
        # Update deployment process
        deploy_process = self._analyze_deployment_process()
        if deploy_process:
            deploy_file = self.docs_root / 'DEPLOYMENT_PROCESS.md'
            content = self._render_template('deployment_process.md.j2', deploy_process)
            
            with open(deploy_file, 'w') as f:
                f.write(content)
            
            updates['files_modified'].append(str(deploy_file))
            updates['processes_updated'] += 1
        
        return updates
    
    def generate_maintenance_scripts(self, error_analysis: Dict, health_check: Dict) -> Dict[str, Any]:
        """Generate maintenance scripts based on detected issues."""
        self.logger.info("Generating maintenance scripts")
        
        scripts = {
            'scripts_created': 0,
            'scripts': []
        }
        
        scripts_dir = self.project_root / 'scripts' / 'generated'
        scripts_dir.mkdir(exist_ok=True)
        
        # Script for error cleanup
        if error_analysis.get('total_errors', 0) > 50:
            script_path = scripts_dir / 'cleanup_errors.sh'
            script_content = self._generate_cleanup_script(error_analysis)
            
            with open(script_path, 'w') as f:
                f.write(script_content)
            
            script_path.chmod(0o755)  # Make executable
            scripts['scripts'].append(str(script_path))
            scripts['scripts_created'] += 1
        
        # Script for health monitoring
        if health_check.get('overall_score', 1) < 0.8:
            script_path = scripts_dir / 'health_monitor.sh'
            script_content = self._generate_health_monitor_script(health_check)
            
            with open(script_path, 'w') as f:
                f.write(script_content)
            
            script_path.chmod(0o755)
            scripts['scripts'].append(str(script_path))
            scripts['scripts_created'] += 1
        
        return scripts
    
    # Helper methods for data collection and analysis
    
    def _get_recent_changed_files(self, days: int = 7) -> List[str]:
        """Get recently changed files from Git."""
        if not self.git_repo:
            return []
        
        try:
            since_date = datetime.now() - timedelta(days=days)
            commits = list(self.git_repo.iter_commits(since=since_date))
            
            changed_files = set()
            for commit in commits:
                for item in commit.stats.files:
                    changed_files.add(item)
            
            return list(changed_files)
        except Exception as e:
            self.logger.error(f"Failed to get changed files: {e}")
            return []
    
    def _analyze_file_changes(self) -> Dict[str, Any]:
        """Analyze recent file changes for patterns."""
        changes = {
            'recent_changes': 0,
            'change_patterns': {},
            'high_activity_files': []
        }
        
        changed_files = self._get_recent_changed_files()
        changes['recent_changes'] = len(changed_files)
        
        # Analyze patterns by file type
        patterns = defaultdict(int)
        for file_path in changed_files:
            ext = Path(file_path).suffix.lower()
            patterns[ext] += 1
        
        changes['change_patterns'] = dict(patterns)
        
        # Identify high activity files (changed frequently)
        if self.git_repo:
            try:
                # Get file change frequency
                file_frequency = defaultdict(int)
                for commit in list(self.git_repo.iter_commits(max_count=100)):
                    for file_path in commit.stats.files:
                        file_frequency[file_path] += 1
                
                # Get top 10 most changed files
                changes['high_activity_files'] = sorted(
                    file_frequency.items(),
                    key=lambda x: x[1],
                    reverse=True
                )[:10]
            except Exception as e:
                self.logger.error(f"Failed to analyze file activity: {e}")
        
        return changes
    
    def _check_dependency_status(self) -> Dict[str, Any]:
        """Check status of project dependencies."""
        status = {
            'backend': {},
            'frontend': {},
            'outdated_packages': [],
            'security_vulnerabilities': []
        }
        
        # Check Python dependencies
        try:
            result = subprocess.run(
                ['pip', 'list', '--outdated', '--format=json'],
                cwd=self.project_root / 'backend',
                capture_output=True,
                text=True,
                timeout=30
            )
            
            if result.returncode == 0:
                outdated = json.loads(result.stdout)
                status['backend']['outdated_count'] = len(outdated)
                status['outdated_packages'].extend([pkg['name'] for pkg in outdated])
        except Exception as e:
            status['backend']['error'] = str(e)
        
        # Check Node.js dependencies
        try:
            result = subprocess.run(
                ['npm', 'outdated', '--json'],
                cwd=self.project_root / 'frontend',
                capture_output=True,
                text=True,
                timeout=30
            )
            
            if result.stdout:
                outdated = json.loads(result.stdout)
                status['frontend']['outdated_count'] = len(outdated)
                status['outdated_packages'].extend(outdated.keys())
        except Exception as e:
            status['frontend']['error'] = str(e)
        
        return status
    
    def _check_service_status(self) -> Dict[str, Any]:
        """Check status of running services."""
        status = {
            'services': {},
            'ports': {}
        }
        
        # Check common ports
        ports_to_check = {
            5000: 'Flask Backend',
            5173: 'Vite Frontend',
            5432: 'PostgreSQL',
            6379: 'Redis'
        }
        
        for port, service_name in ports_to_check.items():
            try:
                import socket
                sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                sock.settimeout(1)
                result = sock.connect_ex(('localhost', port))
                sock.close()
                
                status['ports'][port] = {
                    'service': service_name,
                    'status': 'running' if result == 0 else 'not_running'
                }
            except Exception as e:
                status['ports'][port] = {
                    'service': service_name,
                    'status': 'error',
                    'error': str(e)
                }
        
        return status
    
    def _get_performance_metrics(self) -> Dict[str, Any]:
        """Get performance metrics from Redis."""
        metrics = {}
        
        if not self.redis_client:
            return metrics
        
        try:
            # Get performance keys
            perf_keys = self.redis_client.keys('lokdarpan:performance:*')
            
            for key in perf_keys[-100:]:  # Last 100 metrics
                try:
                    data = self.redis_client.get(key)
                    if data:
                        metric_data = json.loads(data)
                        metric_type = key.split(':')[2]
                        
                        if metric_type not in metrics:
                            metrics[metric_type] = []
                        
                        metrics[metric_type].append(metric_data)
                except Exception as e:
                    continue
        
        except Exception as e:
            self.logger.error(f"Failed to get performance metrics: {e}")
        
        return metrics
    
    def _get_redis_errors(self) -> Dict[str, Any]:
        """Get error data from Redis."""
        errors = {'count': 0, 'errors': []}
        
        if not self.redis_client:
            return errors
        
        try:
            error_keys = self.redis_client.keys('lokdarpan:errors:*')
            errors['count'] = len(error_keys)
            
            for key in error_keys[-50:]:  # Last 50 errors
                try:
                    error_data = self.redis_client.get(key)
                    if error_data:
                        errors['errors'].append(json.loads(error_data))
                except Exception:
                    continue
        
        except Exception as e:
            self.logger.error(f"Failed to get Redis errors: {e}")
        
        return errors
    
    def _get_database_errors(self) -> Dict[str, Any]:
        """Get error data from database."""
        errors = {'count': 0, 'errors': []}
        
        if not self.db_engine:
            return errors
        
        try:
            with self.db_engine.connect() as conn:
                # This assumes there's an error_log table
                # Adjust query based on actual schema
                result = conn.execute(text("""
                    SELECT COUNT(*) as error_count
                    FROM information_schema.tables 
                    WHERE table_name = 'error_log'
                """))
                
                if result.fetchone()[0] > 0:
                    result = conn.execute(text("""
                        SELECT * FROM error_log 
                        WHERE created_at > NOW() - INTERVAL '24 hours'
                        ORDER BY created_at DESC 
                        LIMIT 50
                    """))
                    
                    for row in result:
                        errors['errors'].append(dict(row))
                    
                    errors['count'] = len(errors['errors'])
        
        except Exception as e:
            self.logger.error(f"Failed to get database errors: {e}")
        
        return errors
    
    def _parse_log_files(self) -> Dict[str, Any]:
        """Parse log files for error patterns."""
        errors = {'count': 0, 'errors': [], 'patterns': {}}
        
        log_directories = [
            self.project_root / 'backend' / 'logs',
            self.project_root / 'logs',
            Path('/var/log/lokdarpan')
        ]
        
        error_patterns = [
            r'ERROR\s+(.+)',
            r'CRITICAL\s+(.+)',
            r'Exception\s+(.+)',
            r'Error:\s+(.+)',
            r'Failed\s+(.+)'
        ]
        
        for log_dir in log_directories:
            if not log_dir.exists():
                continue
            
            for log_file in log_dir.glob('*.log'):
                try:
                    with open(log_file, 'r') as f:
                        for line_num, line in enumerate(f, 1):
                            for pattern in error_patterns:
                                match = re.search(pattern, line, re.IGNORECASE)
                                if match:
                                    errors['errors'].append({
                                        'file': str(log_file),
                                        'line': line_num,
                                        'message': match.group(1),
                                        'full_line': line.strip()
                                    })
                                    errors['count'] += 1
                                    
                                    # Track pattern frequency
                                    pattern_key = match.group(1)[:50]
                                    errors['patterns'][pattern_key] = errors['patterns'].get(pattern_key, 0) + 1
                
                except Exception as e:
                    self.logger.error(f"Failed to parse log file {log_file}: {e}")
        
        return errors
    
    # Health check methods
    
    def _check_database_health(self) -> Dict[str, Any]:
        """Check database health."""
        health = {'status': 'unknown', 'score': 0, 'details': {}}
        
        if not self.db_engine:
            health['status'] = 'unavailable'
            health['details']['error'] = 'Database connection not initialized'
            return health
        
        try:
            with self.db_engine.connect() as conn:
                # Test basic connectivity
                result = conn.execute(text("SELECT 1"))
                result.fetchone()
                
                # Check database size
                result = conn.execute(text("SELECT pg_size_pretty(pg_database_size(current_database()))"))
                health['details']['size'] = result.fetchone()[0]
                
                # Check active connections
                result = conn.execute(text("SELECT count(*) FROM pg_stat_activity"))
                health['details']['active_connections'] = result.fetchone()[0]
                
                health['status'] = 'healthy'
                health['score'] = 1.0
                
        except Exception as e:
            health['status'] = 'error'
            health['score'] = 0
            health['details']['error'] = str(e)
        
        return health
    
    def _check_redis_health(self) -> Dict[str, Any]:
        """Check Redis health."""
        health = {'status': 'unknown', 'score': 0, 'details': {}}
        
        if not self.redis_client:
            health['status'] = 'unavailable'
            health['details']['error'] = 'Redis connection not initialized'
            return health
        
        try:
            # Test connectivity
            pong = self.redis_client.ping()
            if pong:
                # Get Redis info
                info = self.redis_client.info()
                health['details']['memory_used'] = info.get('used_memory_human')
                health['details']['connected_clients'] = info.get('connected_clients')
                health['details']['uptime'] = info.get('uptime_in_seconds')
                
                health['status'] = 'healthy'
                health['score'] = 1.0
            else:
                health['status'] = 'error'
                health['score'] = 0
                
        except Exception as e:
            health['status'] = 'error'
            health['score'] = 0
            health['details']['error'] = str(e)
        
        return health
    
    def _check_api_health(self) -> Dict[str, Any]:
        """Check API health."""
        health = {'status': 'unknown', 'score': 0, 'details': {}}
        
        try:
            # Test API endpoint
            response = requests.get(
                f"{self.config['api_base_url']}/api/v1/status",
                timeout=5
            )
            
            if response.status_code == 200:
                health['status'] = 'healthy'
                health['score'] = 1.0
                health['details']['response_time'] = response.elapsed.total_seconds()
                
                try:
                    data = response.json()
                    health['details']['api_data'] = data
                except:
                    pass
            else:
                health['status'] = 'error'
                health['score'] = 0.3
                health['details']['status_code'] = response.status_code
                
        except Exception as e:
            health['status'] = 'error'
            health['score'] = 0
            health['details']['error'] = str(e)
        
        return health
    
    def _check_filesystem_health(self) -> Dict[str, Any]:
        """Check filesystem health."""
        health = {'status': 'healthy', 'score': 1.0, 'details': {}}
        
        try:
            # Check disk space
            disk_usage = shutil.disk_usage(self.project_root)
            free_percent = (disk_usage.free / disk_usage.total) * 100
            
            health['details']['disk_free_percent'] = round(free_percent, 2)
            health['details']['disk_free_gb'] = round(disk_usage.free / (1024**3), 2)
            
            if free_percent < 10:
                health['status'] = 'critical'
                health['score'] = 0.2
            elif free_percent < 20:
                health['status'] = 'warning'
                health['score'] = 0.6
            
            # Check if critical directories exist
            critical_dirs = [
                'backend/app',
                'frontend/src',
                'docs',
                'scripts'
            ]
            
            missing_dirs = []
            for dir_path in critical_dirs:
                if not (self.project_root / dir_path).exists():
                    missing_dirs.append(dir_path)
            
            if missing_dirs:
                health['details']['missing_directories'] = missing_dirs
                health['score'] *= 0.7
                
        except Exception as e:
            health['status'] = 'error'
            health['score'] = 0
            health['details']['error'] = str(e)
        
        return health
    
    def _check_dependencies_health(self) -> Dict[str, Any]:
        """Check dependencies health."""
        health = {'status': 'healthy', 'score': 1.0, 'details': {}}
        
        # Check if requirements files exist
        req_files = [
            ('backend/requirements.txt', 'Python'),
            ('frontend/package.json', 'Node.js')
        ]
        
        for req_file, lang in req_files:
            file_path = self.project_root / req_file
            if file_path.exists():
                health['details'][f'{lang.lower()}_deps'] = 'present'
            else:
                health['details'][f'{lang.lower()}_deps'] = 'missing'
                health['score'] *= 0.5
        
        return health
    
    def _check_performance_health(self) -> Dict[str, Any]:
        """Check performance health."""
        health = {'status': 'healthy', 'score': 1.0, 'details': {}}
        
        # Get performance metrics from Redis
        if self.redis_client:
            try:
                # Check for recent slow requests
                slow_requests = 0
                perf_keys = self.redis_client.keys('lokdarpan:performance:request_complete:*')
                
                for key in perf_keys[-50:]:  # Last 50 requests
                    try:
                        data = self.redis_client.get(key)
                        if data:
                            request_data = json.loads(data)
                            if request_data.get('response_time', 0) > 2.0:  # Slow request
                                slow_requests += 1
                    except:
                        continue
                
                health['details']['slow_requests'] = slow_requests
                
                if slow_requests > 10:
                    health['status'] = 'degraded'
                    health['score'] = 0.6
                elif slow_requests > 5:
                    health['score'] = 0.8
                    
            except Exception as e:
                health['details']['error'] = str(e)
        
        return health
    
    # Template rendering and content generation
    
    def _render_template(self, template_name: str, data: Dict[str, Any]) -> str:
        """Render Jinja2 template with data."""
        try:
            template = self.jinja_env.get_template(template_name)
            return template.render(**data, now=datetime.now())
        except Exception as e:
            self.logger.error(f"Template rendering failed for {template_name}: {e}")
            # Return basic template if main template fails
            return self._render_fallback_template(template_name, data)
    
    def _render_fallback_template(self, template_name: str, data: Dict[str, Any]) -> str:
        """Render fallback template when main template fails."""
        timestamp = datetime.now().isoformat()
        
        fallback_templates = {
            'system_status.md.j2': f"""# System Status Report
Generated: {timestamp}

## Overview
- Health Score: {data.get('health_check', {}).get('overall_score', 'Unknown')}
- Total Errors: {data.get('error_analysis', {}).get('total_errors', 'Unknown')}

## System State
{json.dumps(data.get('system_state', {}), indent=2)}

## Health Check
{json.dumps(data.get('health_check', {}), indent=2)}
""",
            'error_tracking.md.j2': f"""# Error Tracking Report
Generated: {timestamp}

## Error Summary
{json.dumps(data.get('error_analysis', {}), indent=2)}
""",
            'troubleshooting.md.j2': f"""# Troubleshooting Guide
Generated: {timestamp}

## Current Issues
{json.dumps(data.get('health_check', {}), indent=2)}
"""
        }
        
        return fallback_templates.get(template_name, f"# {template_name}\nGenerated: {timestamp}\n\nData:\n{json.dumps(data, indent=2)}")
    
    def _should_update_section(self, section: Dict, output_path: Path) -> bool:
        """Check if documentation section needs updating."""
        if not output_path.exists():
            return True
        
        # Check if file is older than update interval
        file_age = time.time() - output_path.stat().st_mtime
        if file_age > self.config['documentation_update_interval']:
            return True
        
        # Check if there are new errors or significant changes
        if section['name'] == 'error_tracking':
            last_error_count = getattr(self.doc_state, 'error_count', 0)
            current_error_count = section['data']['error_analysis'].get('total_errors', 0)
            if current_error_count != last_error_count:
                return True
        
        return False
    
    # Utility methods
    
    def _categorize_errors(self, *error_sources) -> Dict[str, Any]:
        """Categorize errors from multiple sources."""
        categories = defaultdict(lambda: {'count': 0, 'errors': []})
        
        for error_source in error_sources:
            for error in error_source.get('errors', []):
                # Determine category based on error content
                error_text = str(error.get('message', '')).lower()
                
                if any(word in error_text for word in ['database', 'sql', 'connection']):
                    category = 'database'
                elif any(word in error_text for word in ['api', 'http', 'request']):
                    category = 'api'
                elif any(word in error_text for word in ['auth', 'login', 'permission']):
                    category = 'authentication'
                elif any(word in error_text for word in ['strategist', 'ai', 'analysis']):
                    category = 'strategist'
                elif any(word in error_text for word in ['sse', 'streaming', 'eventsource']):
                    category = 'sse_streaming'
                else:
                    category = 'unknown'
                
                categories[category]['count'] += 1
                categories[category]['errors'].append(error)
        
        return dict(categories)
    
    def _analyze_error_trends(self, *error_sources) -> Dict[str, Any]:
        """Analyze error trends over time."""
        trends = {
            'hourly_distribution': defaultdict(int),
            'daily_trend': 'stable',
            'peak_hours': []
        }
        
        now = datetime.now()
        error_times = []
        
        for error_source in error_sources:
            for error in error_source.get('errors', []):
                # Extract timestamp from error
                timestamp_str = error.get('timestamp') or error.get('created_at') or error.get('time')
                if timestamp_str:
                    try:
                        if isinstance(timestamp_str, str):
                            timestamp = datetime.fromisoformat(timestamp_str.replace('Z', '+00:00'))
                        else:
                            timestamp = timestamp_str
                        
                        error_times.append(timestamp)
                        
                        # Count by hour
                        hour_key = timestamp.hour
                        trends['hourly_distribution'][hour_key] += 1
                        
                    except Exception:
                        continue
        
        if error_times:
            # Analyze trend
            recent_errors = [t for t in error_times if (now - t).total_seconds() < 3600]  # Last hour
            older_errors = [t for t in error_times if 3600 <= (now - t).total_seconds() < 7200]  # Hour before
            
            if len(recent_errors) > len(older_errors) * 1.5:
                trends['daily_trend'] = 'increasing'
            elif len(recent_errors) < len(older_errors) * 0.5:
                trends['daily_trend'] = 'decreasing'
            
            # Find peak hours
            if trends['hourly_distribution']:
                sorted_hours = sorted(trends['hourly_distribution'].items(), key=lambda x: x[1], reverse=True)
                trends['peak_hours'] = [hour for hour, count in sorted_hours[:3]]
        
        return trends
    
    def _identify_critical_issues(self, analysis: Dict) -> List[Dict]:
        """Identify critical issues requiring immediate attention."""
        issues = []
        
        # High error rate
        if analysis.get('total_errors', 0) > 100:
            issues.append({
                'type': 'high_error_rate',
                'severity': 'critical',
                'message': f"High error rate detected: {analysis['total_errors']} errors",
                'action_required': 'immediate'
            })
        
        # Database errors
        db_errors = analysis.get('error_categories', {}).get('database', {}).get('count', 0)
        if db_errors > 10:
            issues.append({
                'type': 'database_errors',
                'severity': 'high',
                'message': f"High database error rate: {db_errors} errors",
                'action_required': 'urgent'
            })
        
        # Authentication errors
        auth_errors = analysis.get('error_categories', {}).get('authentication', {}).get('count', 0)
        if auth_errors > 5:
            issues.append({
                'type': 'auth_errors',
                'severity': 'high',
                'message': f"Authentication errors detected: {auth_errors} errors",
                'action_required': 'urgent'
            })
        
        return issues
    
    def _generate_error_recommendations(self, analysis: Dict) -> List[str]:
        """Generate recommendations based on error analysis."""
        recommendations = []
        
        total_errors = analysis.get('total_errors', 0)
        
        if total_errors > 50:
            recommendations.append("Implement error rate limiting and circuit breakers")
            recommendations.append("Review log aggregation and alerting systems")
        
        error_categories = analysis.get('error_categories', {})
        
        if error_categories.get('database', {}).get('count', 0) > 5:
            recommendations.append("Investigate database connection pooling and query optimization")
        
        if error_categories.get('api', {}).get('count', 0) > 10:
            recommendations.append("Review API error handling and timeout configurations")
        
        if error_categories.get('strategist', {}).get('count', 0) > 3:
            recommendations.append("Check AI service connectivity and fallback mechanisms")
        
        return recommendations
    
    def _generate_health_recommendations(self, health: Dict) -> List[str]:
        """Generate health recommendations."""
        recommendations = []
        
        overall_score = health.get('overall_score', 1.0)
        
        if overall_score < 0.5:
            recommendations.append("System health is critical - immediate attention required")
        elif overall_score < 0.8:
            recommendations.append("System health is degraded - investigate failing components")
        
        components = health.get('components', {})
        
        for component, component_health in components.items():
            if component_health.get('score', 1) < 0.5:
                recommendations.append(f"Fix {component} component - currently failing")
        
        return recommendations
    
    def _get_common_issues(self) -> List[Dict]:
        """Get list of common issues and their solutions."""
        return [
            {
                'title': 'Database Connection Errors',
                'description': 'Cannot connect to PostgreSQL database',
                'solution': 'Check DATABASE_URL environment variable and PostgreSQL service status',
                'commands': [
                    'sudo systemctl status postgresql',
                    'psql $DATABASE_URL -c "SELECT 1"'
                ]
            },
            {
                'title': 'Redis Connection Errors',
                'description': 'Cannot connect to Redis cache',
                'solution': 'Check Redis service status and REDIS_URL configuration',
                'commands': [
                    'sudo systemctl status redis',
                    'redis-cli ping'
                ]
            },
            {
                'title': 'Frontend Build Failures',
                'description': 'Frontend build process fails',
                'solution': 'Clear node_modules and reinstall dependencies',
                'commands': [
                    'cd frontend',
                    'rm -rf node_modules package-lock.json',
                    'npm install'
                ]
            }
        ]
    
    def _get_error_recommendations(self, category: str, errors: Dict) -> List[str]:
        """Get specific recommendations for error category."""
        recommendations_map = {
            'database': [
                'Check database connection pool settings',
                'Review slow query log',
                'Verify database migrations are up to date'
            ],
            'api': [
                'Implement API rate limiting',
                'Add request timeout handling',
                'Review API endpoint error responses'
            ],
            'authentication': [
                'Check session configuration',
                'Review authentication middleware',
                'Verify JWT token expiration settings'
            ],
            'strategist': [
                'Check AI service API keys',
                'Verify external service connectivity',
                'Review strategist timeout settings'
            ]
        }
        
        return recommendations_map.get(category, ['Review error logs and implement appropriate fixes'])
    
    def _analyze_development_process(self) -> Optional[Dict]:
        """Analyze current development process."""
        if not self.git_repo:
            return None
        
        try:
            # Analyze commit patterns
            recent_commits = list(self.git_repo.iter_commits(max_count=50))
            
            commit_authors = defaultdict(int)
            commit_patterns = defaultdict(int)
            
            for commit in recent_commits:
                commit_authors[str(commit.author)] += 1
                
                # Analyze commit message patterns
                message = commit.message.lower()
                if message.startswith('feat'):
                    commit_patterns['feature'] += 1
                elif message.startswith('fix'):
                    commit_patterns['bugfix'] += 1
                elif message.startswith('docs'):
                    commit_patterns['documentation'] += 1
                else:
                    commit_patterns['other'] += 1
            
            return {
                'recent_commits': len(recent_commits),
                'active_contributors': len(commit_authors),
                'commit_patterns': dict(commit_patterns),
                'top_contributors': sorted(commit_authors.items(), key=lambda x: x[1], reverse=True)[:5]
            }
            
        except Exception as e:
            self.logger.error(f"Failed to analyze development process: {e}")
            return None
    
    def _analyze_deployment_process(self) -> Optional[Dict]:
        """Analyze deployment process."""
        deployment_files = [
            'Dockerfile',
            'docker-compose.yml',
            '.github/workflows',
            'scripts/deploy.sh'
        ]
        
        process = {
            'deployment_files_present': [],
            'missing_files': [],
            'ci_cd_setup': False,
            'containerized': False
        }
        
        for file_path in deployment_files:
            full_path = self.project_root / file_path
            if full_path.exists():
                process['deployment_files_present'].append(file_path)
                
                if 'docker' in file_path.lower():
                    process['containerized'] = True
                elif 'workflow' in file_path:
                    process['ci_cd_setup'] = True
            else:
                process['missing_files'].append(file_path)
        
        return process
    
    def _generate_cleanup_script(self, error_analysis: Dict) -> str:
        """Generate error cleanup script."""
        return f"""#!/bin/bash
# Generated Error Cleanup Script - {datetime.now().isoformat()}

set -e

echo "Starting error cleanup process..."

# Clean up log files older than 7 days
find /var/log/lokdarpan -name "*.log" -mtime +7 -delete 2>/dev/null || true

# Clean up Redis error keys older than 24 hours
redis-cli --scan --pattern "lokdarpan:errors:*" | while read key; do
    redis-cli ttl "$key" | grep -q "^-1$" && redis-cli expire "$key" 86400
done 2>/dev/null || true

# Rotate large log files
for log_file in /var/log/lokdarpan/*.log; do
    if [ -f "$log_file" ] && [ $(stat -c%s "$log_file") -gt 10485760 ]; then # 10MB
        echo "Rotating large log file: $log_file"
        mv "$log_file" "${{log_file}}.$(date +%Y%m%d_%H%M%S)"
        touch "$log_file"
    fi
done

echo "Error cleanup completed successfully"
"""
    
    def _generate_health_monitor_script(self, health_check: Dict) -> str:
        """Generate health monitoring script."""
        failing_components = [
            name for name, component in health_check.get('components', {}).items()
            if component.get('score', 1) < 0.5
        ]
        
        return f"""#!/bin/bash
# Generated Health Monitor Script - {datetime.now().isoformat()}

set -e

echo "Starting health check..."

# Check database connectivity
if ! psql "$DATABASE_URL" -c "SELECT 1" > /dev/null 2>&1; then
    echo "ERROR: Database connection failed"
    exit 1
fi

# Check Redis connectivity
if ! redis-cli ping > /dev/null 2>&1; then
    echo "ERROR: Redis connection failed"
    exit 1
fi

# Check API endpoint
if ! curl -f -s "${{API_BASE_URL:-http://localhost:5000}}/api/v1/status" > /dev/null; then
    echo "ERROR: API health check failed"
    exit 1
fi

# Check disk space
DISK_USAGE=$(df / | awk 'NR==2 {{print $5}}' | sed 's/%//')
if [ "$DISK_USAGE" -gt 90 ]; then
    echo "WARNING: Disk usage is at ${{DISK_USAGE}}%"
fi

# Failing components: {', '.join(failing_components) if failing_components else 'None'}

echo "Health check completed successfully"
"""


def create_documentation_templates():
    """Create documentation templates."""
    templates_dir = Path(__file__).parent / 'templates'
    templates_dir.mkdir(exist_ok=True)
    
    # System Status Template
    system_status_template = """# System Status Report

**Generated:** {{ now.isoformat() }}
**Health Score:** {{ health_check.overall_score | round(2) }}/1.0

## Executive Summary

{% if health_check.overall_score >= 0.8 %}
🟢 **System Status: Healthy**
{% elif health_check.overall_score >= 0.5 %}
🟡 **System Status: Degraded** 
{% else %}
🔴 **System Status: Critical**
{% endif %}

- **Total Errors (24h):** {{ error_analysis.total_errors }}
- **Active Alerts:** {{ health_check.alerts | length }}
- **Components Monitored:** {{ health_check.components | length }}

## Component Health

{% for component, health in health_check.components.items() %}
### {{ component.title() }}
- **Status:** {{ health.status }}
- **Score:** {{ health.score | round(2) }}
{% if health.details %}
- **Details:** {{ health.details | tojson(indent=2) }}
{% endif %}
{% if health.get('recommendations') %}
- **Recommendations:**
{% for rec in health.recommendations %}
  - {{ rec }}
{% endfor %}
{% endif %}

{% endfor %}

## Recent Changes

{% if system_state.git_info %}
- **Current Branch:** {{ system_state.git_info.current_branch }}
- **Last Commit:** {{ system_state.git_info.current_commit }}
- **Commit Message:** {{ system_state.git_info.commit_message }}
- **Files Changed (7d):** {{ system_state.git_info.changed_files | length }}
{% endif %}

## Error Summary

{% for category, errors in error_analysis.error_categories.items() %}
- **{{ category.title() }}:** {{ errors.count }} errors
{% endfor %}

## Alerts

{% if health_check.alerts %}
{% for alert in health_check.alerts %}
### {{ alert.severity.upper() }}: {{ alert.component }}
{{ alert.message }}

{% endfor %}
{% else %}
No active alerts.
{% endif %}

## Recommendations

{% for recommendation in health_check.recommendations %}
- {{ recommendation }}
{% endfor %}

---
*This report is automatically generated by LokDarpan Living Documentation System*
"""

    # Error Tracking Template
    error_tracking_template = """# Error Tracking Report

**Generated:** {{ now.isoformat() }}
**Total Errors:** {{ error_analysis.total_errors }}

## Error Distribution

{% for category, errors in error_analysis.error_categories.items() %}
### {{ category.title() }} ({{ errors.count }} errors)

{% if errors.errors %}
Recent examples:
{% for error in errors.errors[:3] %}
- **{{ error.get('timestamp', 'Unknown time') }}:** {{ error.get('message', error.get('error', 'No message')) }}
{% endfor %}
{% endif %}

{% endfor %}

## Error Trends

{% if error_analysis.error_trends %}
- **Daily Trend:** {{ error_analysis.error_trends.daily_trend }}
{% if error_analysis.error_trends.peak_hours %}
- **Peak Hours:** {{ error_analysis.error_trends.peak_hours | join(', ') }}
{% endif %}
{% endif %}

## Critical Issues

{% for issue in error_analysis.critical_issues %}
### {{ issue.type.title() }}
- **Severity:** {{ issue.severity }}
- **Message:** {{ issue.message }}
- **Action Required:** {{ issue.action_required }}

{% endfor %}

## Recommendations

{% for recommendation in error_analysis.recommendations %}
- {{ recommendation }}
{% endfor %}

---
*This report is automatically updated based on system error patterns*
"""

    # Save templates
    with open(templates_dir / 'system_status.md.j2', 'w') as f:
        f.write(system_status_template)
    
    with open(templates_dir / 'error_tracking.md.j2', 'w') as f:
        f.write(error_tracking_template)
    
    print(f"Documentation templates created in {templates_dir}")


def main():
    """Main entry point for living documentation engine."""
    parser = argparse.ArgumentParser(description='LokDarpan Living Documentation Engine')
    parser.add_argument('--config', help='Configuration file path')
    parser.add_argument('--create-templates', action='store_true', help='Create documentation templates')
    parser.add_argument('--full-update', action='store_true', help='Run full documentation update')
    parser.add_argument('--health-check', action='store_true', help='Run health check only')
    parser.add_argument('--error-analysis', action='store_true', help='Run error analysis only')
    
    args = parser.parse_args()
    
    if args.create_templates:
        create_documentation_templates()
        return
    
    # Initialize engine
    engine = LivingDocsEngine(args.config)
    
    if args.health_check:
        health = engine.perform_health_check()
        print(json.dumps(health, indent=2, default=str))
    elif args.error_analysis:
        errors = engine.analyze_error_patterns()
        print(json.dumps(errors, indent=2, default=str))
    elif args.full_update:
        results = engine.run_full_documentation_update()
        print(json.dumps(results, indent=2, default=str))
    else:
        print("No action specified. Use --help for available options.")


if __name__ == '__main__':
    main()