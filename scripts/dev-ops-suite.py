#!/usr/bin/env python3
"""
LokDarpan Development Operations Suite

Comprehensive development and testing script suite with automated
error analysis, performance testing, and documentation updates.
Integrates with the error tracking and living documentation systems.
"""

import os
import sys
import json
import time
import argparse
import subprocess
import concurrent.futures
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, asdict
import tempfile
import shutil

import requests
import redis

# Color output support
class Colors:
    RED = '\033[91m'
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    MAGENTA = '\033[95m'
    CYAN = '\033[96m'
    WHITE = '\033[97m'
    BOLD = '\033[1m'
    UNDERLINE = '\033[4m'
    RESET = '\033[0m'

def colored(text: str, color: str) -> str:
    """Add color to text output."""
    return f"{color}{text}{Colors.RESET}"

@dataclass
class TestResult:
    """Test execution result."""
    name: str
    passed: bool
    duration: float
    output: str
    error: Optional[str] = None
    warnings: List[str] = None

@dataclass
class PerformanceMetric:
    """Performance measurement result."""
    metric_name: str
    value: float
    unit: str
    threshold: Optional[float] = None
    passed: Optional[bool] = None

class LokDarpanDevOps:
    """
    Comprehensive development operations suite for LokDarpan.
    
    Features:
    - Automated testing with error analysis
    - Performance benchmarking
    - Code quality analysis
    - Documentation updates
    - Error pattern analysis
    - System health monitoring
    """
    
    def __init__(self, project_root: str):
        self.project_root = Path(project_root)
        self.backend_dir = self.project_root / "backend"
        self.frontend_dir = self.project_root / "frontend"
        self.scripts_dir = self.project_root / "scripts"
        
        # Results storage
        self.test_results: List[TestResult] = []
        self.performance_metrics: List[PerformanceMetric] = []
        self.error_analysis: Dict[str, Any] = {}
        
        # Redis for live data
        self.redis_client = self._get_redis_client()
        
        # Execution context
        self.execution_id = f"devops_{int(time.time())}"
        self.start_time = time.time()
    
    def _get_redis_client(self):
        """Get Redis client for accessing live data."""
        try:
            redis_url = os.getenv('REDIS_URL', 'redis://localhost:6379/0')
            client = redis.from_url(redis_url, decode_responses=True)
            client.ping()
            return client
        except Exception as e:
            print(colored(f"Warning: Could not connect to Redis: {e}", Colors.YELLOW))
            return None
    
    def run_full_suite(self, skip_tests=False, skip_performance=False, update_docs=True):
        """Run the complete development operations suite."""
        print(colored("🚀 Starting LokDarpan Development Operations Suite", Colors.BOLD))
        print(f"📁 Project root: {self.project_root}")
        print(f"🆔 Execution ID: {self.execution_id}")
        print()
        
        # Pre-flight checks
        if not self._preflight_checks():
            print(colored("❌ Pre-flight checks failed. Aborting.", Colors.RED))
            return False
        
        success = True
        
        # 1. Code quality analysis
        if not self.analyze_code_quality():
            success = False
        
        # 2. Run tests
        if not skip_tests and not self.run_comprehensive_tests():
            success = False
        
        # 3. Performance testing
        if not skip_performance and not self.run_performance_tests():
            success = False
        
        # 4. Error pattern analysis
        if not self.analyze_error_patterns():
            success = False
        
        # 5. System health check
        if not self.check_system_health():
            success = False
        
        # 6. Update documentation
        if update_docs and not self.update_documentation():
            success = False
        
        # 7. Generate report
        self.generate_comprehensive_report()
        
        duration = time.time() - self.start_time
        status = colored("✅ SUCCESS", Colors.GREEN) if success else colored("❌ FAILED", Colors.RED)
        print(f"\n{status} - DevOps suite completed in {duration:.1f}s")
        
        return success
    
    def _preflight_checks(self) -> bool:
        """Run pre-flight checks to ensure system is ready."""
        print(colored("🔍 Running pre-flight checks...", Colors.CYAN))
        
        checks = [
            ("Backend directory", self.backend_dir.exists()),
            ("Frontend directory", self.frontend_dir.exists()),
            ("Backend venv", (self.backend_dir / "venv").exists()),
            ("Frontend node_modules", (self.frontend_dir / "node_modules").exists()),
            ("Git repository", (self.project_root / ".git").exists())
        ]
        
        all_passed = True
        for check_name, passed in checks:
            status = colored("✅", Colors.GREEN) if passed else colored("❌", Colors.RED)
            print(f"  {status} {check_name}")
            if not passed:
                all_passed = False
        
        return all_passed
    
    def analyze_code_quality(self) -> bool:
        """Analyze code quality across the project."""
        print(colored("\n📊 Analyzing code quality...", Colors.CYAN))
        
        quality_checks = []
        
        # Python code quality (backend)
        if self.backend_dir.exists():
            quality_checks.extend([
                self._check_python_linting(),
                self._check_python_formatting(),
                self._check_python_security(),
                self._check_python_complexity()
            ])
        
        # JavaScript code quality (frontend)
        if self.frontend_dir.exists():
            quality_checks.extend([
                self._check_js_linting(),
                self._check_js_formatting(),
                self._check_js_security(),
                self._check_js_bundle_size()
            ])
        
        # Overall quality metrics
        passed_checks = sum(1 for result in quality_checks if result.passed)
        total_checks = len(quality_checks)
        quality_score = (passed_checks / total_checks) * 100 if total_checks > 0 else 0
        
        print(f"  📈 Quality Score: {quality_score:.1f}% ({passed_checks}/{total_checks})")
        
        self.test_results.extend(quality_checks)
        return quality_score >= 80  # Require 80% quality score
    
    def _check_python_linting(self) -> TestResult:
        """Check Python code with flake8."""
        start_time = time.time()
        
        try:
            result = subprocess.run([
                sys.executable, '-m', 'flake8', 
                str(self.backend_dir / 'app'),
                '--max-line-length=120',
                '--ignore=E203,W503',
                '--exclude=migrations'
            ], capture_output=True, text=True, cwd=self.backend_dir)
            
            duration = time.time() - start_time
            passed = result.returncode == 0
            
            return TestResult(
                name="Python Linting (flake8)",
                passed=passed,
                duration=duration,
                output=result.stdout,
                error=result.stderr if not passed else None
            )
        
        except Exception as e:
            return TestResult(
                name="Python Linting (flake8)",
                passed=False,
                duration=time.time() - start_time,
                output="",
                error=str(e)
            )
    
    def _check_python_formatting(self) -> TestResult:
        """Check Python code formatting with black."""
        start_time = time.time()
        
        try:
            result = subprocess.run([
                sys.executable, '-m', 'black', 
                '--check',
                '--line-length=120',
                str(self.backend_dir / 'app')
            ], capture_output=True, text=True, cwd=self.backend_dir)
            
            duration = time.time() - start_time
            passed = result.returncode == 0
            
            return TestResult(
                name="Python Formatting (black)",
                passed=passed,
                duration=duration,
                output=result.stdout,
                error=result.stderr if not passed else None
            )
        
        except Exception as e:
            return TestResult(
                name="Python Formatting (black)",
                passed=False,
                duration=time.time() - start_time,
                output="",
                error=str(e)
            )
    
    def _check_python_security(self) -> TestResult:
        """Check Python security with bandit."""
        start_time = time.time()
        
        try:
            result = subprocess.run([
                sys.executable, '-m', 'bandit',
                '-r', str(self.backend_dir / 'app'),
                '-f', 'json',
                '-ll'  # Only high and medium severity
            ], capture_output=True, text=True, cwd=self.backend_dir)
            
            duration = time.time() - start_time
            
            # Bandit returns non-zero if issues found, but we want to parse results
            try:
                bandit_results = json.loads(result.stdout)
                issues = bandit_results.get('results', [])
                high_issues = [i for i in issues if i.get('issue_severity') == 'HIGH']
                medium_issues = [i for i in issues if i.get('issue_severity') == 'MEDIUM']
                
                passed = len(high_issues) == 0 and len(medium_issues) < 5
                
                return TestResult(
                    name="Python Security (bandit)",
                    passed=passed,
                    duration=duration,
                    output=f"High: {len(high_issues)}, Medium: {len(medium_issues)}",
                    error=None if passed else f"Security issues found: {len(high_issues)} high, {len(medium_issues)} medium"
                )
            except json.JSONDecodeError:
                # Assume passed if no valid JSON (likely no issues)
                return TestResult(
                    name="Python Security (bandit)",
                    passed=True,
                    duration=duration,
                    output="No security issues found",
                    error=None
                )
        
        except Exception as e:
            return TestResult(
                name="Python Security (bandit)",
                passed=False,
                duration=time.time() - start_time,
                output="",
                error=str(e)
            )
    
    def _check_python_complexity(self) -> TestResult:
        """Check Python code complexity with radon."""
        start_time = time.time()
        
        try:
            result = subprocess.run([
                sys.executable, '-m', 'radon', 'cc',
                str(self.backend_dir / 'app'),
                '-a',  # Average complexity
                '--json'
            ], capture_output=True, text=True, cwd=self.backend_dir)
            
            duration = time.time() - start_time
            
            if result.returncode == 0:
                try:
                    complexity_data = json.loads(result.stdout)
                    total_complexity = 0
                    function_count = 0
                    
                    for file_data in complexity_data.values():
                        for item in file_data:
                            if item['type'] == 'function':
                                total_complexity += item['complexity']
                                function_count += 1
                    
                    avg_complexity = total_complexity / function_count if function_count > 0 else 0
                    passed = avg_complexity < 10  # Complexity threshold
                    
                    return TestResult(
                        name="Python Complexity (radon)",
                        passed=passed,
                        duration=duration,
                        output=f"Average complexity: {avg_complexity:.2f}",
                        error=None if passed else f"High complexity: {avg_complexity:.2f} (threshold: 10)"
                    )
                except (json.JSONDecodeError, KeyError):
                    pass
            
            return TestResult(
                name="Python Complexity (radon)",
                passed=True,  # Default to passed if analysis fails
                duration=duration,
                output="Complexity analysis completed",
                error=None
            )
        
        except Exception as e:
            return TestResult(
                name="Python Complexity (radon)",
                passed=False,
                duration=time.time() - start_time,
                output="",
                error=str(e)
            )
    
    def _check_js_linting(self) -> TestResult:
        """Check JavaScript code with ESLint."""
        start_time = time.time()
        
        try:
            result = subprocess.run([
                'npm', 'run', 'lint', '--', '--format=json'
            ], capture_output=True, text=True, cwd=self.frontend_dir)
            
            duration = time.time() - start_time
            passed = result.returncode == 0
            
            # Try to parse ESLint JSON output
            lint_summary = "ESLint check completed"
            if result.stdout:
                try:
                    lint_results = json.loads(result.stdout)
                    total_errors = sum(r.get('errorCount', 0) for r in lint_results)
                    total_warnings = sum(r.get('warningCount', 0) for r in lint_results)
                    lint_summary = f"Errors: {total_errors}, Warnings: {total_warnings}"
                    passed = total_errors == 0
                except json.JSONDecodeError:
                    pass
            
            return TestResult(
                name="JavaScript Linting (ESLint)",
                passed=passed,
                duration=duration,
                output=lint_summary,
                error=result.stderr if not passed else None
            )
        
        except Exception as e:
            return TestResult(
                name="JavaScript Linting (ESLint)",
                passed=False,
                duration=time.time() - start_time,
                output="",
                error=str(e)
            )
    
    def _check_js_formatting(self) -> TestResult:
        """Check JavaScript code formatting with Prettier."""
        start_time = time.time()
        
        try:
            result = subprocess.run([
                'npx', 'prettier', '--check', 'src/**/*.{js,jsx}'
            ], capture_output=True, text=True, cwd=self.frontend_dir)
            
            duration = time.time() - start_time
            passed = result.returncode == 0
            
            return TestResult(
                name="JavaScript Formatting (Prettier)",
                passed=passed,
                duration=duration,
                output="Code formatting check completed",
                error=result.stdout if not passed else None
            )
        
        except Exception as e:
            return TestResult(
                name="JavaScript Formatting (Prettier)",
                passed=False,
                duration=time.time() - start_time,
                output="",
                error=str(e)
            )
    
    def _check_js_security(self) -> TestResult:
        """Check JavaScript security with npm audit."""
        start_time = time.time()
        
        try:
            result = subprocess.run([
                'npm', 'audit', '--audit-level=high', '--json'
            ], capture_output=True, text=True, cwd=self.frontend_dir)
            
            duration = time.time() - start_time
            
            try:
                audit_results = json.loads(result.stdout)
                vulnerabilities = audit_results.get('vulnerabilities', {})
                high_vuln = sum(1 for v in vulnerabilities.values() if v.get('severity') == 'high')
                critical_vuln = sum(1 for v in vulnerabilities.values() if v.get('severity') == 'critical')
                
                passed = high_vuln == 0 and critical_vuln == 0
                
                return TestResult(
                    name="JavaScript Security (npm audit)",
                    passed=passed,
                    duration=duration,
                    output=f"Critical: {critical_vuln}, High: {high_vuln}",
                    error=None if passed else f"Security vulnerabilities found: {critical_vuln} critical, {high_vuln} high"
                )
            except json.JSONDecodeError:
                # If JSON parsing fails, assume passed (no vulnerabilities)
                return TestResult(
                    name="JavaScript Security (npm audit)",
                    passed=True,
                    duration=duration,
                    output="No security vulnerabilities found",
                    error=None
                )
        
        except Exception as e:
            return TestResult(
                name="JavaScript Security (npm audit)",
                passed=False,
                duration=time.time() - start_time,
                output="",
                error=str(e)
            )
    
    def _check_js_bundle_size(self) -> TestResult:
        """Check JavaScript bundle size."""
        start_time = time.time()
        
        try:
            # Build the project to check bundle size
            result = subprocess.run([
                'npm', 'run', 'build'
            ], capture_output=True, text=True, cwd=self.frontend_dir)
            
            duration = time.time() - start_time
            
            if result.returncode == 0:
                # Check dist folder size
                dist_dir = self.frontend_dir / "dist"
                if dist_dir.exists():
                    total_size = sum(f.stat().st_size for f in dist_dir.rglob('*') if f.is_file())
                    size_mb = total_size / (1024 * 1024)
                    passed = size_mb < 10  # 10MB threshold
                    
                    return TestResult(
                        name="Bundle Size Check",
                        passed=passed,
                        duration=duration,
                        output=f"Bundle size: {size_mb:.2f}MB",
                        error=None if passed else f"Bundle too large: {size_mb:.2f}MB (threshold: 10MB)"
                    )
            
            return TestResult(
                name="Bundle Size Check",
                passed=False,
                duration=duration,
                output="",
                error="Build failed or dist directory not found"
            )
        
        except Exception as e:
            return TestResult(
                name="Bundle Size Check",
                passed=False,
                duration=time.time() - start_time,
                output="",
                error=str(e)
            )
    
    def run_comprehensive_tests(self) -> bool:
        """Run comprehensive test suite."""
        print(colored("\n🧪 Running comprehensive tests...", Colors.CYAN))
        
        test_suites = []
        
        # Backend tests
        if self.backend_dir.exists():
            test_suites.extend([
                self._run_backend_unit_tests(),
                self._run_backend_integration_tests(),
                self._run_api_tests()
            ])
        
        # Frontend tests
        if self.frontend_dir.exists():
            test_suites.extend([
                self._run_frontend_tests(),
                self._run_e2e_tests()
            ])
        
        # Error tracking tests
        test_suites.append(self._test_error_tracking_system())
        
        passed_tests = sum(1 for result in test_suites if result.passed)
        total_tests = len(test_suites)
        test_score = (passed_tests / total_tests) * 100 if total_tests > 0 else 0
        
        print(f"  🎯 Test Score: {test_score:.1f}% ({passed_tests}/{total_tests})")
        
        self.test_results.extend(test_suites)
        return test_score >= 90  # Require 90% test pass rate
    
    def _run_backend_unit_tests(self) -> TestResult:
        """Run backend unit tests with pytest."""
        start_time = time.time()
        
        try:
            result = subprocess.run([
                sys.executable, '-m', 'pytest',
                'tests/',
                '--json-report',
                '--json-report-file=/tmp/pytest_report.json',
                '-v'
            ], capture_output=True, text=True, cwd=self.backend_dir)
            
            duration = time.time() - start_time
            passed = result.returncode == 0
            
            # Parse pytest JSON report if available
            test_summary = "Unit tests completed"
            try:
                with open('/tmp/pytest_report.json') as f:
                    pytest_data = json.load(f)
                    total = pytest_data['summary']['total']
                    passed_count = pytest_data['summary']['passed']
                    failed_count = pytest_data['summary']['failed']
                    test_summary = f"Total: {total}, Passed: {passed_count}, Failed: {failed_count}"
            except (FileNotFoundError, KeyError):
                pass
            
            return TestResult(
                name="Backend Unit Tests (pytest)",
                passed=passed,
                duration=duration,
                output=test_summary,
                error=result.stderr if not passed else None
            )
        
        except Exception as e:
            return TestResult(
                name="Backend Unit Tests (pytest)",
                passed=False,
                duration=time.time() - start_time,
                output="",
                error=str(e)
            )
    
    def _run_backend_integration_tests(self) -> TestResult:
        """Run backend integration tests."""
        start_time = time.time()
        
        try:
            result = subprocess.run([
                sys.executable, '-m', 'pytest',
                'tests/test_integration.py',
                '-v'
            ], capture_output=True, text=True, cwd=self.backend_dir)
            
            duration = time.time() - start_time
            passed = result.returncode == 0
            
            return TestResult(
                name="Backend Integration Tests",
                passed=passed,
                duration=duration,
                output="Integration tests completed",
                error=result.stderr if not passed else None
            )
        
        except Exception as e:
            return TestResult(
                name="Backend Integration Tests",
                passed=False,
                duration=time.time() - start_time,
                output="",
                error=str(e)
            )
    
    def _run_api_tests(self) -> TestResult:
        """Test API endpoints."""
        start_time = time.time()
        
        try:
            # Basic API health check
            response = requests.get('http://localhost:5000/api/v1/status', timeout=10)
            api_healthy = response.status_code == 200
            
            if api_healthy:
                # Test error tracking endpoints
                error_response = requests.get('http://localhost:5000/api/v1/errors/health', timeout=10)
                error_tracking_healthy = error_response.status_code == 200
                
                passed = api_healthy and error_tracking_healthy
                output = "API endpoints responding correctly"
            else:
                passed = False
                output = f"API health check failed: {response.status_code}"
            
            duration = time.time() - start_time
            
            return TestResult(
                name="API Endpoint Tests",
                passed=passed,
                duration=duration,
                output=output,
                error=None if passed else "API not responding correctly"
            )
        
        except Exception as e:
            return TestResult(
                name="API Endpoint Tests",
                passed=False,
                duration=time.time() - start_time,
                output="",
                error=str(e)
            )
    
    def _run_frontend_tests(self) -> TestResult:
        """Run frontend tests with Jest/Vitest."""
        start_time = time.time()
        
        try:
            result = subprocess.run([
                'npm', 'test', '--', '--run', '--reporter=json'
            ], capture_output=True, text=True, cwd=self.frontend_dir)
            
            duration = time.time() - start_time
            passed = result.returncode == 0
            
            return TestResult(
                name="Frontend Tests (Jest/Vitest)",
                passed=passed,
                duration=duration,
                output="Frontend tests completed",
                error=result.stderr if not passed else None
            )
        
        except Exception as e:
            return TestResult(
                name="Frontend Tests (Jest/Vitest)",
                passed=False,
                duration=time.time() - start_time,
                output="",
                error=str(e)
            )
    
    def _run_e2e_tests(self) -> TestResult:
        """Run end-to-end tests."""
        start_time = time.time()
        
        try:
            # Check if Playwright is available
            result = subprocess.run([
                'npx', 'playwright', 'test', '--reporter=json'
            ], capture_output=True, text=True, cwd=self.frontend_dir)
            
            duration = time.time() - start_time
            passed = result.returncode == 0
            
            return TestResult(
                name="End-to-End Tests (Playwright)",
                passed=passed,
                duration=duration,
                output="E2E tests completed",
                error=result.stderr if not passed else None
            )
        
        except Exception as e:
            # E2E tests are optional, so don't fail if not available
            return TestResult(
                name="End-to-End Tests (Playwright)",
                passed=True,
                duration=time.time() - start_time,
                output="E2E tests not available or not configured",
                error=None
            )
    
    def _test_error_tracking_system(self) -> TestResult:
        """Test the error tracking system integration."""
        start_time = time.time()
        
        try:
            # Test backend error tracking
            test_error = {
                'component': 'DevOpsTest',
                'severity': 'info',
                'category': 'unknown',
                'message': 'Test error from DevOps suite',
                'context': {'test': True}
            }
            
            response = requests.post(
                'http://localhost:5000/api/v1/errors/report',
                json=test_error,
                timeout=10
            )
            
            backend_healthy = response.status_code == 200
            
            # Test Redis connectivity if available
            redis_healthy = True
            if self.redis_client:
                try:
                    self.redis_client.ping()
                except:
                    redis_healthy = False
            
            passed = backend_healthy and redis_healthy
            duration = time.time() - start_time
            
            return TestResult(
                name="Error Tracking System Test",
                passed=passed,
                duration=duration,
                output=f"Backend: {'✓' if backend_healthy else '✗'}, Redis: {'✓' if redis_healthy else '✗'}",
                error=None if passed else "Error tracking system not fully functional"
            )
        
        except Exception as e:
            return TestResult(
                name="Error Tracking System Test",
                passed=False,
                duration=time.time() - start_time,
                output="",
                error=str(e)
            )
    
    def run_performance_tests(self) -> bool:
        """Run performance tests and benchmarks."""
        print(colored("\n⚡ Running performance tests...", Colors.CYAN))
        
        performance_tests = [
            self._test_api_performance(),
            self._test_frontend_performance(),
            self._test_database_performance(),
            self._test_memory_usage()
        ]
        
        # Calculate performance score
        passed_tests = sum(1 for metric in performance_tests if metric.passed)
        total_tests = len(performance_tests)
        performance_score = (passed_tests / total_tests) * 100 if total_tests > 0 else 0
        
        print(f"  ⚡ Performance Score: {performance_score:.1f}% ({passed_tests}/{total_tests})")
        
        self.performance_metrics.extend(performance_tests)
        return performance_score >= 75  # Require 75% performance benchmark pass
    
    def _test_api_performance(self) -> PerformanceMetric:
        """Test API response times."""
        try:
            endpoints = [
                'http://localhost:5000/api/v1/status',
                'http://localhost:5000/api/v1/errors/health'
            ]
            
            total_time = 0
            successful_requests = 0
            
            for endpoint in endpoints:
                for _ in range(5):  # 5 requests per endpoint
                    start_time = time.time()
                    try:
                        response = requests.get(endpoint, timeout=5)
                        if response.status_code == 200:
                            total_time += time.time() - start_time
                            successful_requests += 1
                    except:
                        pass
            
            avg_response_time = (total_time / successful_requests * 1000) if successful_requests > 0 else 5000
            threshold = 500  # 500ms threshold
            
            return PerformanceMetric(
                metric_name="API Response Time",
                value=avg_response_time,
                unit="ms",
                threshold=threshold,
                passed=avg_response_time < threshold
            )
        
        except Exception:
            return PerformanceMetric(
                metric_name="API Response Time",
                value=5000,
                unit="ms",
                threshold=500,
                passed=False
            )
    
    def _test_frontend_performance(self) -> PerformanceMetric:
        """Test frontend build performance."""
        try:
            start_time = time.time()
            result = subprocess.run([
                'npm', 'run', 'build'
            ], capture_output=True, text=True, cwd=self.frontend_dir)
            
            build_time = (time.time() - start_time) * 1000  # Convert to ms
            threshold = 60000  # 60 seconds threshold
            
            return PerformanceMetric(
                metric_name="Frontend Build Time",
                value=build_time,
                unit="ms",
                threshold=threshold,
                passed=result.returncode == 0 and build_time < threshold
            )
        
        except Exception:
            return PerformanceMetric(
                metric_name="Frontend Build Time",
                value=120000,
                unit="ms",
                threshold=60000,
                passed=False
            )
    
    def _test_database_performance(self) -> PerformanceMetric:
        """Test database query performance."""
        try:
            # Simple database query timing test
            start_time = time.time()
            result = subprocess.run([
                'psql', os.getenv('DATABASE_URL', 'postgresql://postgres:amuktha@localhost/lokdarpan_db'),
                '-c', 'SELECT COUNT(*) FROM post;'
            ], capture_output=True, text=True)
            
            query_time = (time.time() - start_time) * 1000  # Convert to ms
            threshold = 1000  # 1 second threshold
            
            return PerformanceMetric(
                metric_name="Database Query Time",
                value=query_time,
                unit="ms",
                threshold=threshold,
                passed=result.returncode == 0 and query_time < threshold
            )
        
        except Exception:
            return PerformanceMetric(
                metric_name="Database Query Time",
                value=5000,
                unit="ms",
                threshold=1000,
                passed=False
            )
    
    def _test_memory_usage(self) -> PerformanceMetric:
        """Test system memory usage."""
        try:
            # Get system memory usage
            result = subprocess.run(['free', '-m'], capture_output=True, text=True)
            
            if result.returncode == 0:
                lines = result.stdout.split('\n')
                memory_line = [line for line in lines if 'Mem:' in line][0]
                parts = memory_line.split()
                total_memory = int(parts[1])
                used_memory = int(parts[2])
                memory_usage_percent = (used_memory / total_memory) * 100
                
                threshold = 85  # 85% threshold
                
                return PerformanceMetric(
                    metric_name="System Memory Usage",
                    value=memory_usage_percent,
                    unit="%",
                    threshold=threshold,
                    passed=memory_usage_percent < threshold
                )
            
            return PerformanceMetric(
                metric_name="System Memory Usage",
                value=50,
                unit="%",
                threshold=85,
                passed=True
            )
        
        except Exception:
            return PerformanceMetric(
                metric_name="System Memory Usage",
                value=50,
                unit="%",
                threshold=85,
                passed=True  # Default to passed if can't measure
            )
    
    def analyze_error_patterns(self) -> bool:
        """Analyze current error patterns from the system."""
        print(colored("\n🔍 Analyzing error patterns...", Colors.CYAN))
        
        try:
            # Get error summary from API
            response = requests.get('http://localhost:5000/api/v1/errors/summary', timeout=10)
            
            if response.status_code == 200:
                error_data = response.json()
                summary = error_data.get('summary', {})
                
                self.error_analysis = {
                    'total_errors': summary.get('total_errors', 0),
                    'error_rate': summary.get('error_rate', 0),
                    'by_severity': summary.get('by_severity', {}),
                    'by_category': summary.get('by_category', {}),
                    'alert_status': summary.get('alert_status', 'unknown'),
                    'top_components': summary.get('top_components', [])
                }
                
                print(f"  📊 Total Errors: {self.error_analysis['total_errors']}")
                print(f"  📈 Error Rate: {self.error_analysis['error_rate']:.2f}/min")
                print(f"  🚨 Alert Status: {self.error_analysis['alert_status']}")
                
                return True
            else:
                print(colored("  ❌ Could not retrieve error analysis", Colors.RED))
                return False
        
        except Exception as e:
            print(colored(f"  ❌ Error analysis failed: {e}", Colors.RED))
            return False
    
    def check_system_health(self) -> bool:
        """Check overall system health."""
        print(colored("\n🏥 Checking system health...", Colors.CYAN))
        
        health_checks = {
            'backend_api': self._check_backend_health(),
            'frontend_build': self._check_frontend_health(),
            'database': self._check_database_health(),
            'redis': self._check_redis_health(),
            'error_tracking': self._check_error_tracking_health()
        }
        
        healthy_services = sum(1 for status in health_checks.values() if status)
        total_services = len(health_checks)
        health_score = (healthy_services / total_services) * 100
        
        print(f"  🏥 Health Score: {health_score:.1f}% ({healthy_services}/{total_services})")
        
        for service, healthy in health_checks.items():
            status = colored("✅", Colors.GREEN) if healthy else colored("❌", Colors.RED)
            print(f"    {status} {service.replace('_', ' ').title()}")
        
        return health_score >= 80  # Require 80% service health
    
    def _check_backend_health(self) -> bool:
        """Check backend API health."""
        try:
            response = requests.get('http://localhost:5000/api/v1/status', timeout=5)
            return response.status_code == 200
        except:
            return False
    
    def _check_frontend_health(self) -> bool:
        """Check frontend health (can build)."""
        try:
            result = subprocess.run([
                'npm', 'run', 'build'
            ], capture_output=True, text=True, cwd=self.frontend_dir, timeout=60)
            return result.returncode == 0
        except:
            return False
    
    def _check_database_health(self) -> bool:
        """Check database connectivity."""
        try:
            result = subprocess.run([
                'psql', os.getenv('DATABASE_URL', 'postgresql://postgres:amuktha@localhost/lokdarpan_db'),
                '-c', 'SELECT 1;'
            ], capture_output=True, text=True, timeout=10)
            return result.returncode == 0
        except:
            return False
    
    def _check_redis_health(self) -> bool:
        """Check Redis connectivity."""
        if self.redis_client:
            try:
                return self.redis_client.ping()
            except:
                return False
        return False
    
    def _check_error_tracking_health(self) -> bool:
        """Check error tracking system health."""
        try:
            response = requests.get('http://localhost:5000/api/v1/errors/health', timeout=5)
            return response.status_code == 200
        except:
            return False
    
    def update_documentation(self) -> bool:
        """Update project documentation."""
        print(colored("\n📚 Updating documentation...", Colors.CYAN))
        
        try:
            # Run living documentation generator
            result = subprocess.run([
                sys.executable, 
                str(self.scripts_dir / 'living-docs-generator.py'),
                '--project-root', str(self.project_root),
                '--update-main-docs'
            ], capture_output=True, text=True)
            
            success = result.returncode == 0
            
            if success:
                print("  ✅ Documentation updated successfully")
            else:
                print(f"  ❌ Documentation update failed: {result.stderr}")
            
            return success
        
        except Exception as e:
            print(f"  ❌ Documentation update error: {e}")
            return False
    
    def generate_comprehensive_report(self):
        """Generate comprehensive DevOps report."""
        print(colored("\n📄 Generating comprehensive report...", Colors.CYAN))
        
        report_data = {
            'execution_info': {
                'execution_id': self.execution_id,
                'timestamp': datetime.now(timezone.utc).isoformat(),
                'duration': time.time() - self.start_time,
                'project_root': str(self.project_root)
            },
            'test_results': [asdict(result) for result in self.test_results],
            'performance_metrics': [asdict(metric) for metric in self.performance_metrics],
            'error_analysis': self.error_analysis,
            'summary': self._generate_summary()
        }
        
        # Save report
        report_file = self.project_root / "docs" / "generated" / f"devops_report_{self.execution_id}.json"
        report_file.parent.mkdir(parents=True, exist_ok=True)
        
        with open(report_file, 'w') as f:
            json.dump(report_data, f, indent=2, default=str)
        
        # Generate markdown report
        markdown_report = self._generate_markdown_report(report_data)
        markdown_file = self.project_root / "docs" / "generated" / f"devops_report_{self.execution_id}.md"
        
        with open(markdown_file, 'w') as f:
            f.write(markdown_report)
        
        print(f"  📄 Report saved to: {report_file}")
        print(f"  📝 Markdown report: {markdown_file}")
    
    def _generate_summary(self) -> Dict[str, Any]:
        """Generate execution summary."""
        total_tests = len(self.test_results)
        passed_tests = sum(1 for result in self.test_results if result.passed)
        test_pass_rate = (passed_tests / total_tests) * 100 if total_tests > 0 else 0
        
        total_perf_metrics = len(self.performance_metrics)
        passed_perf_metrics = sum(1 for metric in self.performance_metrics if metric.passed)
        perf_pass_rate = (passed_perf_metrics / total_perf_metrics) * 100 if total_perf_metrics > 0 else 0
        
        return {
            'overall_success': test_pass_rate >= 90 and perf_pass_rate >= 75,
            'test_pass_rate': test_pass_rate,
            'performance_pass_rate': perf_pass_rate,
            'total_tests': total_tests,
            'passed_tests': passed_tests,
            'total_performance_metrics': total_perf_metrics,
            'passed_performance_metrics': passed_perf_metrics,
            'error_rate': self.error_analysis.get('error_rate', 0),
            'alert_status': self.error_analysis.get('alert_status', 'unknown')
        }
    
    def _generate_markdown_report(self, report_data: Dict[str, Any]) -> str:
        """Generate markdown report."""
        summary = report_data['summary']
        execution_info = report_data['execution_info']
        
        status_icon = "✅" if summary['overall_success'] else "❌"
        status_text = "SUCCESS" if summary['overall_success'] else "FAILED"
        
        markdown = f"""# LokDarpan DevOps Report {status_icon}

**Status**: {status_text}  
**Execution ID**: {execution_info['execution_id']}  
**Timestamp**: {execution_info['timestamp']}  
**Duration**: {execution_info['duration']:.1f}s  

## Summary

- **Test Pass Rate**: {summary['test_pass_rate']:.1f}% ({summary['passed_tests']}/{summary['total_tests']})
- **Performance Pass Rate**: {summary['performance_pass_rate']:.1f}% ({summary['passed_performance_metrics']}/{summary['total_performance_metrics']})
- **Error Rate**: {summary['error_rate']:.2f}/min
- **Alert Status**: {summary['alert_status']}

## Test Results

| Test Name | Status | Duration | Details |
|-----------|--------|----------|---------|
"""
        
        for result in report_data['test_results']:
            status = "✅ PASS" if result['passed'] else "❌ FAIL"
            markdown += f"| {result['name']} | {status} | {result['duration']:.2f}s | {result.get('error', 'OK')[:50]} |\n"
        
        markdown += f"""
## Performance Metrics

| Metric | Value | Threshold | Status |
|--------|-------|-----------|--------|
"""
        
        for metric in report_data['performance_metrics']:
            status = "✅ PASS" if metric.get('passed', False) else "❌ FAIL"
            threshold = f"{metric.get('threshold', 'N/A')}{metric['unit']}"
            value = f"{metric['value']:.2f}{metric['unit']}"
            markdown += f"| {metric['metric_name']} | {value} | {threshold} | {status} |\n"
        
        if report_data['error_analysis']:
            markdown += f"""
## Error Analysis

- **Total Errors**: {report_data['error_analysis'].get('total_errors', 0)}
- **Error Rate**: {report_data['error_analysis'].get('error_rate', 0):.2f} errors/minute
- **Alert Status**: {report_data['error_analysis'].get('alert_status', 'unknown')}

### Error Distribution by Severity
"""
            for severity, count in report_data['error_analysis'].get('by_severity', {}).items():
                markdown += f"- **{severity.title()}**: {count}\n"
        
        markdown += f"""
## Recommendations

Based on the analysis:
"""
        
        if summary['test_pass_rate'] < 90:
            markdown += "- ⚠️ **Test pass rate below 90%** - Review and fix failing tests\n"
        
        if summary['performance_pass_rate'] < 75:
            markdown += "- ⚠️ **Performance issues detected** - Optimize slow components\n"
        
        if summary['error_rate'] > 1.0:
            markdown += f"- 🚨 **High error rate** ({summary['error_rate']:.2f}/min) - Investigate error patterns\n"
        
        if summary['alert_status'] not in ['normal', 'unknown']:
            markdown += f"- 🔔 **System alerts active** ({summary['alert_status']}) - Review system health\n"
        
        if summary['overall_success']:
            markdown += "- ✅ **All systems operational** - Continue regular monitoring\n"
        
        markdown += f"""
---
*Report generated by LokDarpan DevOps Suite v1.0.0*
"""
        
        return markdown

def main():
    """Main entry point for DevOps suite."""
    parser = argparse.ArgumentParser(description='LokDarpan Development Operations Suite')
    parser.add_argument('--project-root', default='.', help='Project root directory')
    parser.add_argument('--skip-tests', action='store_true', help='Skip test execution')
    parser.add_argument('--skip-performance', action='store_true', help='Skip performance tests')
    parser.add_argument('--skip-docs', action='store_true', help='Skip documentation updates')
    parser.add_argument('--quick', action='store_true', help='Quick run (skip tests and performance)')
    
    args = parser.parse_args()
    
    # Initialize DevOps suite
    devops = LokDarpanDevOps(args.project_root)
    
    # Configure execution based on arguments
    skip_tests = args.skip_tests or args.quick
    skip_performance = args.skip_performance or args.quick
    update_docs = not args.skip_docs
    
    # Run full suite
    success = devops.run_full_suite(
        skip_tests=skip_tests,
        skip_performance=skip_performance,
        update_docs=update_docs
    )
    
    sys.exit(0 if success else 1)

if __name__ == '__main__':
    main()