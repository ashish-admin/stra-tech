#!/usr/bin/env python3
"""
LokDarpan Documentation Automation System

Automated documentation generation, updating, and maintenance system
that integrates with Git workflows, error tracking, and health monitoring
to keep documentation always up-to-date and relevant.

Features:
- Git-triggered documentation updates
- Automated issue tracking and resolution
- Integration with error tracking and health monitoring
- Process documentation generation
- Script generation based on system state
- Version-controlled documentation lifecycle

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
import argparse
import schedule
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, asdict
from collections import defaultdict, deque
import tempfile
import re

# Add the backend directory to Python path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))

try:
    import git
    import requests
    from jinja2 import Environment, FileSystemLoader, Template
    from watchdog.observers import Observer
    from watchdog.events import FileSystemEventHandler
except ImportError as e:
    print(f"Required dependency missing: {e}")
    print("Install with: pip install GitPython requests jinja2 watchdog schedule")
    sys.exit(1)

# Import our custom modules
try:
    from living_docs_engine import LivingDocsEngine
    from error_analysis_suite import ErrorAnalyzer
    from system_health_monitor import HealthMonitor
except ImportError as e:
    print(f"Could not import custom modules: {e}")
    print("Make sure the scripts are in the same directory")

class DocumentationType(str):
    """Types of documentation that can be automatically generated."""
    SYSTEM_STATUS = "system_status"
    ERROR_TRACKING = "error_tracking"
    TROUBLESHOOTING = "troubleshooting"
    PROCESS_GUIDE = "process_guide"
    API_REFERENCE = "api_reference"
    DEPLOYMENT_GUIDE = "deployment_guide"
    HEALTH_REPORT = "health_report"
    CHANGE_LOG = "change_log"
    DEVELOPMENT_GUIDE = "development_guide"

@dataclass
class DocumentationTask:
    """Represents a documentation update task."""
    task_id: str
    doc_type: DocumentationType
    priority: int  # 1=urgent, 2=high, 3=normal, 4=low
    trigger_source: str  # git, error, health, manual, scheduled
    created_at: datetime
    updated_at: datetime
    status: str  # pending, in_progress, completed, failed
    data_sources: List[str]
    output_files: List[str]
    dependencies: List[str]
    error_message: Optional[str] = None

class GitChangeHandler(FileSystemEventHandler):
    """Handler for Git repository changes."""
    
    def __init__(self, automation_system):
        self.automation = automation_system
        self.logger = automation_system.logger
        
    def on_modified(self, event):
        if not event.is_directory and self._is_relevant_file(event.src_path):
            self.logger.info(f"File change detected: {event.src_path}")
            self.automation.queue_documentation_update(
                trigger_source="git_change",
                changed_files=[event.src_path]
            )
    
    def _is_relevant_file(self, file_path: str) -> bool:
        """Check if file change should trigger documentation update."""
        relevant_patterns = [
            r'\.py$',
            r'\.js$',
            r'\.jsx$',
            r'\.ts$',
            r'\.tsx$',
            r'requirements\.txt$',
            r'package\.json$',
            r'config\.py$',
            r'README\.md$',
            r'CHANGELOG\.md$'
        ]
        
        file_path = str(file_path)
        return any(re.search(pattern, file_path) for pattern in relevant_patterns)

class DocumentationAutomation:
    """
    Main automation system for LokDarpan documentation.
    
    Orchestrates automatic documentation generation, updates,
    and maintenance based on system events, changes, and schedules.
    """
    
    def __init__(self, config_path: Optional[str] = None):
        self.config = self._load_config(config_path)
        self.project_root = Path(self.config['project_root'])
        self.docs_root = self.project_root / 'docs'
        self.templates_dir = Path(__file__).parent / 'templates' / 'automation'
        
        # Create directories
        self.docs_root.mkdir(exist_ok=True)
        self.templates_dir.mkdir(parents=True, exist_ok=True)
        
        # Initialize components
        self.git_repo = self._init_git()
        self.living_docs = LivingDocsEngine(config_path)
        self.error_analyzer = ErrorAnalyzer(config_path)
        self.health_monitor = HealthMonitor(config_path)
        
        # Task management
        self.pending_tasks = deque()
        self.completed_tasks = deque(maxlen=1000)
        self.task_lock = False
        
        # File watching
        self.observer = None
        self.watching = False
        
        # Template engine
        self.jinja_env = Environment(
            loader=FileSystemLoader([str(self.templates_dir), str(self.project_root / 'scripts' / 'templates')]),
            autoescape=True,
            trim_blocks=True,
            lstrip_blocks=True
        )
        
        # Set up logging
        self.logger = self._setup_logging()
        
        # Load existing tasks
        self._load_pending_tasks()
        
        self.logger.info("DocumentationAutomation initialized successfully")
    
    def _load_config(self, config_path: Optional[str] = None) -> Dict[str, Any]:
        """Load configuration from file or environment."""
        default_config = {
            'project_root': os.path.dirname(os.path.dirname(__file__)),
            'documentation_schedule': {
                'system_status': '*/10 * * * *',      # Every 10 minutes
                'error_tracking': '*/15 * * * *',     # Every 15 minutes
                'health_report': '*/5 * * * *',       # Every 5 minutes
                'troubleshooting': '0 * * * *',       # Every hour
                'process_guide': '0 6 * * *',         # Daily at 6 AM
                'change_log': '0 0 * * 0'             # Weekly on Sunday
            },
            'priority_thresholds': {
                'critical_errors': 1,     # Urgent priority
                'service_down': 1,        # Urgent priority
                'high_error_rate': 2,     # High priority
                'performance_degradation': 2,  # High priority
                'dependency_issues': 3,   # Normal priority
                'documentation_outdated': 4  # Low priority
            },
            'automation_settings': {
                'max_concurrent_tasks': 3,
                'task_timeout_minutes': 30,
                'retry_failed_tasks': True,
                'max_retries': 3,
                'watch_file_changes': True,
                'auto_git_commit': False,  # Set to True to auto-commit documentation
                'notification_webhook': None
            }
        }
        
        if config_path and os.path.exists(config_path):
            try:
                with open(config_path, 'r') as f:
                    if config_path.endswith('.yaml') or config_path.endswith('.yml'):
                        file_config = yaml.safe_load(f)
                    else:
                        file_config = json.load(f)
                    default_config.update(file_config)
            except Exception as e:
                print(f"Warning: Could not load config file {config_path}: {e}")
        
        return default_config
    
    def _init_git(self):
        """Initialize Git repository."""
        try:
            return git.Repo(self.project_root)
        except git.exc.InvalidGitRepositoryError:
            self.logger.error("Not a valid Git repository")
            return None
    
    def _setup_logging(self) -> logging.Logger:
        """Set up structured logging."""
        logger = logging.getLogger('doc_automation')
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
            file_handler = logging.FileHandler(log_dir / 'documentation_automation.log')
            file_formatter = logging.Formatter(
                '%(asctime)s [%(levelname)s] %(name)s:%(lineno)d - %(message)s'
            )
            file_handler.setFormatter(file_formatter)
            logger.addHandler(file_handler)
        
        return logger
    
    def _load_pending_tasks(self):
        """Load pending tasks from storage."""
        tasks_file = self.project_root / 'cache' / 'pending_documentation_tasks.json'
        
        if tasks_file.exists():
            try:
                with open(tasks_file, 'r') as f:
                    tasks_data = json.load(f)
                    
                for task_data in tasks_data:
                    task = DocumentationTask(
                        task_id=task_data['task_id'],
                        doc_type=task_data['doc_type'],
                        priority=task_data['priority'],
                        trigger_source=task_data['trigger_source'],
                        created_at=datetime.fromisoformat(task_data['created_at']),
                        updated_at=datetime.fromisoformat(task_data['updated_at']),
                        status=task_data['status'],
                        data_sources=task_data['data_sources'],
                        output_files=task_data['output_files'],
                        dependencies=task_data['dependencies'],
                        error_message=task_data.get('error_message')
                    )
                    self.pending_tasks.append(task)
                
                self.logger.info(f"Loaded {len(self.pending_tasks)} pending documentation tasks")
                
            except Exception as e:
                self.logger.error(f"Failed to load pending tasks: {e}")
    
    def _save_pending_tasks(self):
        """Save pending tasks to storage."""
        cache_dir = self.project_root / 'cache'
        cache_dir.mkdir(exist_ok=True)
        tasks_file = cache_dir / 'pending_documentation_tasks.json'
        
        try:
            tasks_data = []
            for task in self.pending_tasks:
                task_data = asdict(task)
                task_data['created_at'] = task.created_at.isoformat()
                task_data['updated_at'] = task.updated_at.isoformat()
                tasks_data.append(task_data)
            
            with open(tasks_file, 'w') as f:
                json.dump(tasks_data, f, indent=2)
                
        except Exception as e:
            self.logger.error(f"Failed to save pending tasks: {e}")
    
    def start_automation(self):
        """Start the documentation automation system."""
        self.logger.info("Starting documentation automation system")
        
        # Set up scheduled tasks
        self._setup_scheduled_tasks()
        
        # Start file watching if enabled
        if self.config['automation_settings']['watch_file_changes']:
            self._start_file_watching()
        
        # Process initial tasks
        self._process_pending_tasks()
        
        self.logger.info("Documentation automation system started successfully")
    
    def stop_automation(self):
        """Stop the documentation automation system."""
        self.logger.info("Stopping documentation automation system")
        
        # Stop file watching
        if self.observer and self.watching:
            self.observer.stop()
            self.observer.join()
            self.watching = False
        
        # Save pending tasks
        self._save_pending_tasks()
        
        self.logger.info("Documentation automation system stopped")
    
    def _setup_scheduled_tasks(self):
        """Set up scheduled documentation tasks."""
        schedule_config = self.config['documentation_schedule']
        
        # System status updates
        if schedule_config.get('system_status'):
            schedule.every(10).minutes.do(
                self.queue_documentation_update,
                doc_type=DocumentationType.SYSTEM_STATUS,
                trigger_source="scheduled"
            )
        
        # Error tracking reports
        if schedule_config.get('error_tracking'):
            schedule.every(15).minutes.do(
                self.queue_documentation_update,
                doc_type=DocumentationType.ERROR_TRACKING,
                trigger_source="scheduled"
            )
        
        # Health reports
        if schedule_config.get('health_report'):
            schedule.every(5).minutes.do(
                self.queue_documentation_update,
                doc_type=DocumentationType.HEALTH_REPORT,
                trigger_source="scheduled"
            )
        
        # Troubleshooting guides
        if schedule_config.get('troubleshooting'):
            schedule.every().hour.do(
                self.queue_documentation_update,
                doc_type=DocumentationType.TROUBLESHOOTING,
                trigger_source="scheduled"
            )
        
        # Process guides
        if schedule_config.get('process_guide'):
            schedule.every().day.at("06:00").do(
                self.queue_documentation_update,
                doc_type=DocumentationType.PROCESS_GUIDE,
                trigger_source="scheduled"
            )
        
        # Change logs
        if schedule_config.get('change_log'):
            schedule.every().sunday.do(
                self.queue_documentation_update,
                doc_type=DocumentationType.CHANGE_LOG,
                trigger_source="scheduled"
            )
        
        self.logger.info("Scheduled documentation tasks configured")
    
    def _start_file_watching(self):
        """Start watching for file changes."""
        if self.observer:
            return
        
        self.observer = Observer()
        handler = GitChangeHandler(self)
        
        # Watch key directories
        watch_dirs = [
            self.project_root / 'backend' / 'app',
            self.project_root / 'frontend' / 'src',
            self.project_root / 'scripts',
            self.project_root
        ]
        
        for watch_dir in watch_dirs:
            if watch_dir.exists():
                self.observer.schedule(handler, str(watch_dir), recursive=True)
        
        self.observer.start()
        self.watching = True
        
        self.logger.info("Started file watching for documentation triggers")
    
    def queue_documentation_update(
        self, 
        doc_type: Optional[DocumentationType] = None, 
        trigger_source: str = "manual",
        priority: Optional[int] = None,
        data_sources: Optional[List[str]] = None,
        changed_files: Optional[List[str]] = None
    ) -> str:
        """Queue a documentation update task."""
        
        # Determine documentation type if not specified
        if doc_type is None:
            doc_type = self._determine_doc_type_from_trigger(trigger_source, changed_files)
        
        # Determine priority if not specified
        if priority is None:
            priority = self._determine_priority(doc_type, trigger_source)
        
        # Create task ID
        task_id = f"{doc_type}_{int(time.time())}_{hashlib.md5(trigger_source.encode()).hexdigest()[:8]}"
        
        # Determine data sources
        if data_sources is None:
            data_sources = self._determine_data_sources(doc_type)
        
        # Determine output files
        output_files = self._determine_output_files(doc_type)
        
        # Create task
        task = DocumentationTask(
            task_id=task_id,
            doc_type=doc_type,
            priority=priority,
            trigger_source=trigger_source,
            created_at=datetime.now(),
            updated_at=datetime.now(),
            status="pending",
            data_sources=data_sources,
            output_files=output_files,
            dependencies=[]
        )
        
        # Add to queue (sorted by priority)
        inserted = False
        for i, existing_task in enumerate(self.pending_tasks):
            if task.priority < existing_task.priority:  # Lower number = higher priority
                self.pending_tasks.insert(i, task)
                inserted = True
                break
        
        if not inserted:
            self.pending_tasks.append(task)
        
        self.logger.info(f"Queued documentation task: {task_id} (priority: {priority}, type: {doc_type})")
        
        # Save tasks and trigger processing
        self._save_pending_tasks()
        self._process_pending_tasks()
        
        return task_id
    
    def _determine_doc_type_from_trigger(self, trigger_source: str, changed_files: Optional[List[str]] = None) -> DocumentationType:
        """Determine documentation type based on trigger source and changed files."""
        if trigger_source == "error":
            return DocumentationType.ERROR_TRACKING
        elif trigger_source == "health":
            return DocumentationType.HEALTH_REPORT
        elif trigger_source == "git_change":
            if changed_files:
                # Analyze changed files to determine doc type
                for file_path in changed_files:
                    if 'api' in file_path.lower() or 'routes' in file_path.lower():
                        return DocumentationType.API_REFERENCE
                    elif 'config' in file_path.lower() or 'deploy' in file_path.lower():
                        return DocumentationType.DEPLOYMENT_GUIDE
                    elif 'readme' in file_path.lower() or 'changelog' in file_path.lower():
                        return DocumentationType.CHANGE_LOG
            
            return DocumentationType.DEVELOPMENT_GUIDE
        elif trigger_source == "scheduled":
            return DocumentationType.SYSTEM_STATUS
        else:
            return DocumentationType.SYSTEM_STATUS
    
    def _determine_priority(self, doc_type: DocumentationType, trigger_source: str) -> int:
        """Determine task priority based on type and trigger."""
        priority_map = {
            DocumentationType.SYSTEM_STATUS: 3,
            DocumentationType.ERROR_TRACKING: 2,
            DocumentationType.HEALTH_REPORT: 2,
            DocumentationType.TROUBLESHOOTING: 2,
            DocumentationType.API_REFERENCE: 3,
            DocumentationType.DEPLOYMENT_GUIDE: 3,
            DocumentationType.PROCESS_GUIDE: 4,
            DocumentationType.CHANGE_LOG: 4,
            DocumentationType.DEVELOPMENT_GUIDE: 4
        }
        
        base_priority = priority_map.get(doc_type, 3)
        
        # Adjust based on trigger source
        if trigger_source == "error":
            base_priority = min(base_priority, 2)  # Bump up priority
        elif trigger_source == "health":
            base_priority = min(base_priority, 2)  # Bump up priority
        elif trigger_source == "manual":
            base_priority = min(base_priority, 2)  # Manual requests get higher priority
        
        return base_priority
    
    def _determine_data_sources(self, doc_type: DocumentationType) -> List[str]:
        """Determine data sources needed for documentation type."""
        data_source_map = {
            DocumentationType.SYSTEM_STATUS: ["health_monitor", "error_analyzer", "git"],
            DocumentationType.ERROR_TRACKING: ["error_analyzer", "log_files"],
            DocumentationType.HEALTH_REPORT: ["health_monitor", "system_metrics"],
            DocumentationType.TROUBLESHOOTING: ["error_analyzer", "health_monitor", "log_files"],
            DocumentationType.API_REFERENCE: ["source_code", "openapi_spec"],
            DocumentationType.DEPLOYMENT_GUIDE: ["config_files", "docker_files", "scripts"],
            DocumentationType.PROCESS_GUIDE: ["git", "workflows", "scripts"],
            DocumentationType.CHANGE_LOG: ["git", "issues", "commits"],
            DocumentationType.DEVELOPMENT_GUIDE: ["source_code", "config_files", "dependencies"]
        }
        
        return data_source_map.get(doc_type, ["system_state"])
    
    def _determine_output_files(self, doc_type: DocumentationType) -> List[str]:
        """Determine output files for documentation type."""
        output_map = {
            DocumentationType.SYSTEM_STATUS: [str(self.docs_root / 'SYSTEM_STATUS.md')],
            DocumentationType.ERROR_TRACKING: [str(self.docs_root / 'ERROR_TRACKING.md')],
            DocumentationType.HEALTH_REPORT: [str(self.docs_root / 'HEALTH_REPORT.md')],
            DocumentationType.TROUBLESHOOTING: [str(self.docs_root / 'TROUBLESHOOTING.md')],
            DocumentationType.API_REFERENCE: [str(self.docs_root / 'API_REFERENCE.md')],
            DocumentationType.DEPLOYMENT_GUIDE: [str(self.docs_root / 'DEPLOYMENT.md')],
            DocumentationType.PROCESS_GUIDE: [str(self.docs_root / 'DEVELOPMENT_PROCESS.md')],
            DocumentationType.CHANGE_LOG: [str(self.project_root / 'CHANGELOG.md')],
            DocumentationType.DEVELOPMENT_GUIDE: [str(self.docs_root / 'DEVELOPMENT.md')]
        }
        
        return output_map.get(doc_type, [])
    
    def _process_pending_tasks(self):
        """Process pending documentation tasks."""
        if self.task_lock:
            return
        
        self.task_lock = True
        
        try:
            max_concurrent = self.config['automation_settings']['max_concurrent_tasks']
            processed_count = 0
            
            while self.pending_tasks and processed_count < max_concurrent:
                task = self.pending_tasks.popleft()
                
                try:
                    self._execute_documentation_task(task)
                    processed_count += 1
                except Exception as e:
                    self.logger.error(f"Task execution failed: {task.task_id}: {e}")
                    task.status = "failed"
                    task.error_message = str(e)
                    task.updated_at = datetime.now()
                    
                    # Retry logic
                    if (self.config['automation_settings']['retry_failed_tasks'] and 
                        task.trigger_source != "failed_retry"):
                        
                        retry_task = task
                        retry_task.trigger_source = "failed_retry"
                        retry_task.status = "pending"
                        retry_task.error_message = None
                        self.pending_tasks.append(retry_task)
                        
                        self.logger.info(f"Queued task for retry: {task.task_id}")
                
                # Move to completed tasks
                self.completed_tasks.append(task)
            
            # Save updated state
            self._save_pending_tasks()
            
        finally:
            self.task_lock = False
    
    def _execute_documentation_task(self, task: DocumentationTask):
        """Execute a specific documentation task."""
        self.logger.info(f"Executing documentation task: {task.task_id} ({task.doc_type})")
        
        task.status = "in_progress"
        task.updated_at = datetime.now()
        
        start_time = time.time()
        
        try:
            # Collect data from specified sources
            data = self._collect_task_data(task)
            
            # Generate documentation content
            content = self._generate_documentation_content(task, data)
            
            # Write to output files
            self._write_documentation_files(task, content)
            
            # Post-processing (Git commit, notifications, etc.)
            self._post_process_documentation(task)
            
            task.status = "completed"
            
            duration = time.time() - start_time
            self.logger.info(f"Documentation task completed: {task.task_id} in {duration:.2f}s")
            
        except Exception as e:
            task.status = "failed"
            task.error_message = str(e)
            self.logger.error(f"Documentation task failed: {task.task_id}: {e}")
            raise
        finally:
            task.updated_at = datetime.now()
    
    def _collect_task_data(self, task: DocumentationTask) -> Dict[str, Any]:
        """Collect data needed for documentation task."""
        data = {
            'timestamp': datetime.now(),
            'task_info': asdict(task)
        }
        
        for source in task.data_sources:
            try:
                if source == "health_monitor":
                    data['health_report'] = self.health_monitor.run_health_check()
                elif source == "error_analyzer":
                    data['error_analysis'] = self.error_analyzer.run_comprehensive_analysis()
                elif source == "system_metrics":
                    data['system_metrics'] = self._collect_system_metrics()
                elif source == "git":
                    data['git_info'] = self._collect_git_info()
                elif source == "log_files":
                    data['log_analysis'] = self._analyze_log_files()
                elif source == "source_code":
                    data['code_analysis'] = self._analyze_source_code()
                elif source == "config_files":
                    data['config_analysis'] = self._analyze_config_files()
                elif source == "dependencies":
                    data['dependency_analysis'] = self._analyze_dependencies()
                elif source == "workflows":
                    data['workflow_analysis'] = self._analyze_workflows()
                elif source == "scripts":
                    data['script_analysis'] = self._analyze_scripts()
                elif source == "docker_files":
                    data['docker_analysis'] = self._analyze_docker_files()
                elif source == "openapi_spec":
                    data['api_spec'] = self._generate_api_spec()
                
            except Exception as e:
                self.logger.warning(f"Failed to collect data from source {source}: {e}")
                data[f'{source}_error'] = str(e)
        
        return data
    
    def _generate_documentation_content(self, task: DocumentationTask, data: Dict[str, Any]) -> Dict[str, str]:
        """Generate documentation content based on task type and data."""
        content = {}
        
        try:
            if task.doc_type == DocumentationType.SYSTEM_STATUS:
                content = self._generate_system_status_content(data)
            elif task.doc_type == DocumentationType.ERROR_TRACKING:
                content = self._generate_error_tracking_content(data)
            elif task.doc_type == DocumentationType.HEALTH_REPORT:
                content = self._generate_health_report_content(data)
            elif task.doc_type == DocumentationType.TROUBLESHOOTING:
                content = self._generate_troubleshooting_content(data)
            elif task.doc_type == DocumentationType.API_REFERENCE:
                content = self._generate_api_reference_content(data)
            elif task.doc_type == DocumentationType.DEPLOYMENT_GUIDE:
                content = self._generate_deployment_guide_content(data)
            elif task.doc_type == DocumentationType.PROCESS_GUIDE:
                content = self._generate_process_guide_content(data)
            elif task.doc_type == DocumentationType.CHANGE_LOG:
                content = self._generate_change_log_content(data)
            elif task.doc_type == DocumentationType.DEVELOPMENT_GUIDE:
                content = self._generate_development_guide_content(data)
            else:
                raise ValueError(f"Unknown documentation type: {task.doc_type}")
            
        except Exception as e:
            self.logger.error(f"Content generation failed for {task.doc_type}: {e}")
            # Generate basic fallback content
            content = {
                'main': f"""# {task.doc_type.replace('_', ' ').title()}

**Generated:** {datetime.now().isoformat()}
**Status:** Content generation failed

## Error
{str(e)}

## Available Data
{json.dumps({k: type(v).__name__ for k, v in data.items()}, indent=2)}
"""
            }
        
        return content
    
    def _generate_system_status_content(self, data: Dict[str, Any]) -> Dict[str, str]:
        """Generate system status documentation content."""
        template_content = """# LokDarpan System Status Report

**Generated:** {{ data.timestamp.strftime('%Y-%m-%d %H:%M:%S') }}
**Last Updated:** {{ data.timestamp.strftime('%Y-%m-%d %H:%M:%S') }}

## Executive Summary

{% if data.health_report %}
**Overall System Health:** {{ data.health_report.overall_status.value.upper() }} ({{ (data.health_report.overall_score * 100) | round(1) }}%)

### Quick Stats
- **Services Monitored:** {{ data.health_report.services | length }}
- **Active Alerts:** {{ data.health_report.alerts | length }}
- **System Uptime:** {% if data.health_report.services %}{{ data.health_report.services[0].uptime_percentage or 'N/A' }}%{% else %}N/A{% endif %}

## Service Status

| Service | Status | Response Time | Issues |
|---------|--------|---------------|---------|
{% for service in data.health_report.services %}
| {{ service.service_name }} | {{ service.status.value }} | {{ service.response_time | round(3) }}s | {{ service.issues | length }} |
{% endfor %}

## System Metrics

{% for metric in data.health_report.system_metrics %}
- **{{ metric.name.replace('_', ' ').title() }}:** {{ metric.value }}{{ metric.unit }} ({{ metric.status.value }})
{% endfor %}

## Active Alerts
{% if data.health_report.alerts %}
{% for alert in data.health_report.alerts %}
### {{ alert.severity.upper() }}: {{ alert.type.replace('_', ' ').title() }}
{{ alert.message }}
{% if alert.get('timestamp') %}
*Triggered: {{ alert.timestamp }}*
{% endif %}
{% endfor %}
{% else %}
No active alerts.
{% endif %}

## Recommendations
{% for recommendation in data.health_report.recommendations %}
- {{ recommendation }}
{% endfor %}

{% endif %}

{% if data.error_analysis %}
## Error Summary
- **Total Errors (24h):** {{ data.error_analysis.total_errors }}
- **Patterns Detected:** {{ data.error_analysis.patterns_detected }}
- **Critical Issues:** {{ data.error_analysis.critical_patterns }}
- **New Patterns:** {{ data.error_analysis.new_patterns }}

### Error Trend: {{ data.error_analysis.trend_analysis.get('overall_trend', 'stable').upper() }}
{% endif %}

## Git Information
{% if data.git_info %}
- **Current Branch:** {{ data.git_info.current_branch }}
- **Last Commit:** {{ data.git_info.last_commit_hash }}
- **Last Commit Message:** {{ data.git_info.last_commit_message }}
- **Files Changed (24h):** {{ data.git_info.recent_changes | length }}
{% endif %}

---
*This report is automatically generated and updated every 10 minutes.*
*For real-time monitoring, use the health monitoring dashboard.*
"""
        
        template = Template(template_content)
        content = template.render(data=data)
        
        return {'main': content}
    
    def _generate_error_tracking_content(self, data: Dict[str, Any]) -> Dict[str, str]:
        """Generate error tracking documentation content."""
        if not data.get('error_analysis'):
            return {'main': '# Error Tracking Report\n\nNo error analysis data available.'}
        
        error_analysis = data['error_analysis']
        
        template_content = """# LokDarpan Error Tracking Report

**Generated:** {{ data.timestamp.strftime('%Y-%m-%d %H:%M:%S') }}
**Analysis Period:** Last 24 hours

## Error Summary
- **Total Errors:** {{ error_analysis.total_errors }}
- **Patterns Detected:** {{ error_analysis.patterns_detected }}
- **Critical Patterns:** {{ error_analysis.critical_patterns }}
- **New Patterns:** {{ error_analysis.new_patterns }}
- **Resolved Patterns:** {{ error_analysis.resolved_patterns }}

## Trend Analysis
**Overall Trend:** {{ error_analysis.trend_analysis.get('overall_trend', 'unknown').upper() }}

### Error Distribution by Hour
{% if error_analysis.trend_analysis.get('hourly_distribution') %}
{% for hour, count in error_analysis.trend_analysis.hourly_distribution.items() %}
- {{ hour }}: {{ count }} errors
{% endfor %}
{% endif %}

## Alert Conditions
{% if error_analysis.alert_conditions %}
{% for alert in error_analysis.alert_conditions %}
### {{ alert.severity.upper() }}: {{ alert.type.replace('_', ' ').title() }}
{{ alert.message }}

{% if alert.get('patterns') %}
**Affected Patterns:**
{% for pattern in alert.patterns %}
- {{ pattern }}
{% endfor %}
{% endif %}
{% endfor %}
{% else %}
No alert conditions detected.
{% endif %}

## Recommendations
{% for recommendation in error_analysis.recommendations %}
- {{ recommendation }}
{% endfor %}

## Investigation Steps
1. **Immediate Actions:**
   - Check system health dashboard
   - Review recent deployments
   - Verify service connectivity

2. **Analysis Steps:**
   - Examine error patterns for root causes
   - Check correlation with system changes
   - Review affected user workflows

3. **Prevention Measures:**
   - Implement additional error handling
   - Add monitoring for identified patterns
   - Update error recovery procedures

---
*This report is automatically updated every 15 minutes.*
*For detailed error analysis, run: `python scripts/error-analysis-suite.py --analyze`*
"""
        
        template = Template(template_content)
        content = template.render(data=data, error_analysis=error_analysis)
        
        return {'main': content}
    
    def _generate_health_report_content(self, data: Dict[str, Any]) -> Dict[str, str]:
        """Generate health report documentation content."""
        if not data.get('health_report'):
            return {'main': '# Health Report\n\nNo health data available.'}
        
        health_report = data['health_report']
        
        template_content = """# LokDarpan Health Report

**Generated:** {{ data.timestamp.strftime('%Y-%m-%d %H:%M:%S') }}
**Overall Status:** {{ health_report.overall_status.value.upper() }}
**Health Score:** {{ (health_report.overall_score * 100) | round(1) }}%

## Service Health Overview

{% for service in health_report.services %}
### {{ service.service_name }} ({{ service.service_type.value }})
- **Status:** {{ service.status.value }}
- **Response Time:** {{ service.response_time | round(3) }}s
- **Last Check:** {{ service.last_check.strftime('%Y-%m-%d %H:%M:%S') }}

{% if service.issues %}
**Issues:**
{% for issue in service.issues %}
- {{ issue }}
{% endfor %}
{% endif %}

{% if service.recommendations %}
**Recommendations:**
{% for rec in service.recommendations %}
- {{ rec }}
{% endfor %}
{% endif %}

{% if service.metrics %}
**Metrics:**
{% for metric in service.metrics %}
- {{ metric.name }}: {{ metric.value }}{{ metric.unit }} ({{ metric.status.value }})
{% endfor %}
{% endif %}

---

{% endfor %}

## System Metrics

{% for metric in health_report.system_metrics %}
### {{ metric.name.replace('_', ' ').title() }}
- **Current Value:** {{ metric.value }}{{ metric.unit }}
- **Status:** {{ metric.status.value }}
{% if metric.threshold_warning %}
- **Warning Threshold:** {{ metric.threshold_warning }}{{ metric.unit }}
{% endif %}
{% if metric.threshold_critical %}
- **Critical Threshold:** {{ metric.threshold_critical }}{{ metric.unit }}
{% endif %}
{% if metric.context %}
- **Additional Info:** {{ metric.context }}
{% endif %}

{% endfor %}

## Health Trends
{{ health_report.trends.get('overall_score_trend', 'No trend data available') }}

## Active Alerts
{% if health_report.alerts %}
{% for alert in health_report.alerts %}
### {{ alert.severity.upper() }}: {{ alert.message }}
{% if alert.get('component') %}
**Component:** {{ alert.component }}
{% endif %}
{% if alert.get('threshold') and alert.get('actual') %}
**Threshold:** {{ alert.threshold }}, **Actual:** {{ alert.actual }}
{% endif %}

{% endfor %}
{% else %}
No active health alerts.
{% endif %}

## Action Items
{% for recommendation in health_report.recommendations %}
- {{ recommendation }}
{% endfor %}

---
*This health report is automatically updated every 5 minutes.*
*For continuous monitoring, run: `python scripts/system-health-monitor.py --monitor`*
"""
        
        template = Template(template_content)
        content = template.render(data=data, health_report=health_report)
        
        return {'main': content}
    
    # Additional content generation methods would be implemented here...
    def _generate_troubleshooting_content(self, data: Dict[str, Any]) -> Dict[str, str]:
        """Generate troubleshooting guide content."""
        template_content = """# LokDarpan Troubleshooting Guide

**Generated:** {{ data.timestamp.strftime('%Y-%m-%d %H:%M:%S') }}

## Quick Diagnostics

### System Health Check
```bash
python scripts/system-health-monitor.py --check
```

### Error Analysis
```bash
python scripts/error-analysis-suite.py --analyze
```

### Documentation Update
```bash
python scripts/living-docs-engine.py --full-update
```

## Common Issues and Solutions

### Database Connection Issues
**Symptoms:** Connection timeouts, authentication failures
**Solutions:**
1. Check PostgreSQL service: `sudo systemctl status postgresql`
2. Verify DATABASE_URL: `echo $DATABASE_URL`
3. Test connection: `psql $DATABASE_URL -c "SELECT 1"`

### Redis Cache Issues
**Symptoms:** Cache misses, connection errors
**Solutions:**
1. Check Redis service: `sudo systemctl status redis`
2. Test connection: `redis-cli ping`
3. Check memory usage: `redis-cli info memory`

### API Response Issues
**Symptoms:** Slow responses, timeout errors
**Solutions:**
1. Check Flask service: `curl -f http://localhost:5000/api/v1/status`
2. Review API logs: `tail -f backend/logs/app.log`
3. Monitor response times in health dashboard

### Frontend Build Issues
**Symptoms:** Build failures, module not found errors
**Solutions:**
1. Clear node modules: `cd frontend && rm -rf node_modules && npm install`
2. Check for dependency conflicts: `npm audit`
3. Verify Node.js version compatibility

{% if data.health_report and data.health_report.alerts %}
## Current System Issues

{% for alert in data.health_report.alerts %}
### {{ alert.severity.upper() }}: {{ alert.message }}
{% if alert.get('component') %}
**Affected Component:** {{ alert.component }}
{% endif %}

**Immediate Actions:**
1. Check service status
2. Review recent changes
3. Monitor system resources

{% endfor %}
{% endif %}

{% if data.error_analysis and data.error_analysis.critical_patterns > 0 %}
## Critical Error Patterns

**{{ data.error_analysis.critical_patterns }} critical error patterns detected**

**Investigation Steps:**
1. Run detailed error analysis: `python scripts/error-analysis-suite.py --analyze --report error_report.html`
2. Check system logs: `journalctl -u lokdarpan.service -f`
3. Review recent deployments and changes

{% endif %}

## Emergency Procedures

### System Recovery
1. **Stop all services:**
   ```bash
   ./scripts/dev-stop.sh
   ```

2. **Check system resources:**
   ```bash
   df -h  # Disk space
   free -h  # Memory usage
   top  # CPU usage
   ```

3. **Restart services:**
   ```bash
   ./scripts/dev-start.sh
   ```

### Data Recovery
1. **Database backup:**
   ```bash
   pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql
   ```

2. **Redis backup:**
   ```bash
   redis-cli BGSAVE
   ```

### Log Analysis
1. **View recent errors:**
   ```bash
   tail -100 /var/log/lokdarpan/app.log | grep ERROR
   ```

2. **Check system logs:**
   ```bash
   journalctl -u lokdarpan.service --since "1 hour ago"
   ```

---
*This troubleshooting guide is automatically updated every hour.*
*For immediate assistance, check the health monitoring dashboard.*
"""
        
        template = Template(template_content)
        content = template.render(data=data)
        
        return {'main': content}
    
    def _write_documentation_files(self, task: DocumentationTask, content: Dict[str, str]):
        """Write documentation content to files."""
        for i, output_file in enumerate(task.output_files):
            output_path = Path(output_file)
            output_path.parent.mkdir(parents=True, exist_ok=True)
            
            # Determine which content to write (main, or specific named content)
            content_key = 'main' if len(content) == 1 else f'file_{i}'
            file_content = content.get(content_key, content.get('main', ''))
            
            try:
                with open(output_path, 'w') as f:
                    f.write(file_content)
                
                self.logger.info(f"Documentation written to: {output_path}")
                
            except Exception as e:
                self.logger.error(f"Failed to write documentation file {output_path}: {e}")
                raise
    
    def _post_process_documentation(self, task: DocumentationTask):
        """Post-process documentation (Git commit, notifications, etc.)."""
        try:
            # Auto-commit if enabled
            if (self.config['automation_settings']['auto_git_commit'] and 
                self.git_repo and 
                task.trigger_source != "git_change"):  # Avoid commit loops
                
                self._commit_documentation_changes(task)
            
            # Send notifications if configured
            webhook_url = self.config['automation_settings'].get('notification_webhook')
            if webhook_url:
                self._send_notification(task, webhook_url)
                
        except Exception as e:
            self.logger.warning(f"Post-processing failed for task {task.task_id}: {e}")
    
    def _commit_documentation_changes(self, task: DocumentationTask):
        """Commit documentation changes to Git."""
        try:
            # Stage files
            for output_file in task.output_files:
                if Path(output_file).exists():
                    self.git_repo.index.add([output_file])
            
            # Create commit message
            commit_message = f"docs: Update {task.doc_type.replace('_', ' ')} documentation\n\nGenerated by: {task.trigger_source}\nTask ID: {task.task_id}"
            
            # Commit if there are changes
            if self.git_repo.index.diff("HEAD"):
                self.git_repo.index.commit(commit_message)
                self.logger.info(f"Committed documentation changes for task: {task.task_id}")
            
        except Exception as e:
            self.logger.error(f"Git commit failed for task {task.task_id}: {e}")
    
    def _send_notification(self, task: DocumentationTask, webhook_url: str):
        """Send notification about documentation update."""
        try:
            payload = {
                'task_id': task.task_id,
                'doc_type': task.doc_type,
                'status': task.status,
                'trigger_source': task.trigger_source,
                'timestamp': task.updated_at.isoformat(),
                'output_files': task.output_files
            }
            
            response = requests.post(webhook_url, json=payload, timeout=10)
            if response.status_code == 200:
                self.logger.info(f"Notification sent for task: {task.task_id}")
            else:
                self.logger.warning(f"Notification failed for task {task.task_id}: HTTP {response.status_code}")
                
        except Exception as e:
            self.logger.error(f"Notification sending failed for task {task.task_id}: {e}")
    
    # Helper methods for data collection
    
    def _collect_system_metrics(self) -> Dict[str, Any]:
        """Collect basic system metrics."""
        # This would be implemented to gather system info
        return {'cpu_usage': 0, 'memory_usage': 0, 'disk_usage': 0}
    
    def _collect_git_info(self) -> Dict[str, Any]:
        """Collect Git repository information."""
        if not self.git_repo:
            return {}
        
        try:
            return {
                'current_branch': self.git_repo.active_branch.name,
                'last_commit_hash': self.git_repo.head.commit.hexsha[:8],
                'last_commit_message': self.git_repo.head.commit.message.strip(),
                'last_commit_date': self.git_repo.head.commit.committed_datetime.isoformat(),
                'recent_changes': [item.a_path for item in self.git_repo.index.diff("HEAD~1")]
            }
        except Exception as e:
            self.logger.error(f"Git info collection failed: {e}")
            return {'error': str(e)}
    
    def _analyze_log_files(self) -> Dict[str, Any]:
        """Analyze log files for patterns and issues."""
        # Implementation would analyze log files
        return {'log_analysis': 'basic'}
    
    def _analyze_source_code(self) -> Dict[str, Any]:
        """Analyze source code structure and metrics."""
        # Implementation would analyze code structure
        return {'code_analysis': 'basic'}
    
    def _analyze_config_files(self) -> Dict[str, Any]:
        """Analyze configuration files."""
        # Implementation would analyze config files
        return {'config_analysis': 'basic'}
    
    def _analyze_dependencies(self) -> Dict[str, Any]:
        """Analyze project dependencies."""
        # Implementation would analyze dependencies
        return {'dependency_analysis': 'basic'}
    
    def _analyze_workflows(self) -> Dict[str, Any]:
        """Analyze workflows and processes."""
        # Implementation would analyze workflows
        return {'workflow_analysis': 'basic'}
    
    def _analyze_scripts(self) -> Dict[str, Any]:
        """Analyze scripts and automation."""
        # Implementation would analyze scripts
        return {'script_analysis': 'basic'}
    
    def _analyze_docker_files(self) -> Dict[str, Any]:
        """Analyze Docker and containerization setup."""
        # Implementation would analyze Docker files
        return {'docker_analysis': 'basic'}
    
    def _generate_api_spec(self) -> Dict[str, Any]:
        """Generate API specification."""
        # Implementation would generate OpenAPI spec
        return {'api_spec': 'basic'}
    
    def run_scheduled_tasks(self):
        """Run scheduled tasks (called by scheduler)."""
        schedule.run_pending()
        self._process_pending_tasks()
    
    def get_task_status(self) -> Dict[str, Any]:
        """Get current automation status."""
        return {
            'pending_tasks': len(self.pending_tasks),
            'completed_tasks': len(self.completed_tasks),
            'automation_running': self.watching,
            'last_update': datetime.now().isoformat()
        }


def main():
    """Main entry point for documentation automation."""
    parser = argparse.ArgumentParser(description='LokDarpan Documentation Automation')
    parser.add_argument('--config', help='Configuration file path')
    parser.add_argument('--start', action='store_true', help='Start automation system')
    parser.add_argument('--stop', action='store_true', help='Stop automation system')
    parser.add_argument('--status', action='store_true', help='Show automation status')
    parser.add_argument('--generate', choices=['system_status', 'error_tracking', 'health_report', 'troubleshooting'], 
                       help='Generate specific documentation type')
    parser.add_argument('--schedule', action='store_true', help='Run scheduled tasks once')
    
    args = parser.parse_args()
    
    # Initialize automation system
    automation = DocumentationAutomation(args.config)
    
    if args.start:
        print("🚀 Starting documentation automation system...")
        automation.start_automation()
        
        try:
            while True:
                automation.run_scheduled_tasks()
                time.sleep(60)  # Check every minute
        except KeyboardInterrupt:
            pass
        finally:
            automation.stop_automation()
            print("\n✅ Documentation automation stopped")
    
    elif args.stop:
        automation.stop_automation()
        print("✅ Documentation automation stopped")
    
    elif args.status:
        status = automation.get_task_status()
        print("📊 Documentation Automation Status:")
        print(f"Pending Tasks: {status['pending_tasks']}")
        print(f"Completed Tasks: {status['completed_tasks']}")
        print(f"File Watching: {'Active' if status['automation_running'] else 'Inactive'}")
        print(f"Last Update: {status['last_update']}")
    
    elif args.generate:
        doc_type_map = {
            'system_status': DocumentationType.SYSTEM_STATUS,
            'error_tracking': DocumentationType.ERROR_TRACKING,
            'health_report': DocumentationType.HEALTH_REPORT,
            'troubleshooting': DocumentationType.TROUBLESHOOTING
        }
        
        doc_type = doc_type_map.get(args.generate)
        if doc_type:
            print(f"📝 Generating {args.generate} documentation...")
            task_id = automation.queue_documentation_update(
                doc_type=doc_type,
                trigger_source="manual"
            )
            print(f"✅ Documentation task queued: {task_id}")
        else:
            print(f"❌ Unknown documentation type: {args.generate}")
    
    elif args.schedule:
        print("⏰ Running scheduled documentation tasks...")
        automation.run_scheduled_tasks()
        status = automation.get_task_status()
        print(f"✅ Processed {status['pending_tasks']} tasks")
    
    else:
        print("No action specified. Use --help for available options.")


if __name__ == '__main__':
    main()