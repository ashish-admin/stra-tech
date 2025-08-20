#!/usr/bin/env python3
"""
Security audit script for LokDarpan backend.

This script performs comprehensive security checks on the LokDarpan application
to identify potential vulnerabilities and ensure compliance with security best practices.
"""

import os
import sys
import re
import subprocess
import json
from datetime import datetime
from typing import Dict, List, Tuple

# Add the backend directory to the Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

class SecurityAuditor:
    """Security audit utilities for LokDarpan."""
    
    def __init__(self):
        self.findings = []
        self.warnings = []
        self.info = []
        
    def add_finding(self, severity: str, category: str, description: str, details: str = ""):
        """Add a security finding."""
        finding = {
            'severity': severity,
            'category': category,
            'description': description,
            'details': details,
            'timestamp': datetime.now().isoformat()
        }
        
        if severity == 'CRITICAL' or severity == 'HIGH':
            self.findings.append(finding)
        elif severity == 'MEDIUM' or severity == 'LOW':
            self.warnings.append(finding)
        else:
            self.info.append(finding)
    
    def check_environment_variables(self) -> None:
        """Check for secure environment variable configuration."""
        print("🔍 Checking environment variables...")
        
        required_vars = ['SECRET_KEY', 'DATABASE_URL']
        optional_vars = ['GEMINI_API_KEY', 'OPENAI_API_KEY', 'NEWS_API_KEY', 'TWITTER_BEARER_TOKEN']
        
        for var in required_vars:
            if not os.environ.get(var):
                self.add_finding('CRITICAL', 'Configuration', 
                               f'Missing required environment variable: {var}')
            else:
                value = os.environ.get(var)
                if var == 'SECRET_KEY':
                    if len(value) < 32:
                        self.add_finding('HIGH', 'Configuration',
                                       'SECRET_KEY is too short (< 32 characters)')
                    elif value in ['dev-secret-key-change-in-production', 'a_default_secret_key']:
                        self.add_finding('CRITICAL', 'Configuration',
                                       'Using default/development SECRET_KEY in production')
        
        for var in optional_vars:
            if not os.environ.get(var):
                self.add_finding('INFO', 'Configuration',
                               f'Optional environment variable not set: {var}',
                               'Some features may be disabled')
    
    def check_file_permissions(self) -> None:
        """Check file permissions for security issues."""
        print("🔍 Checking file permissions...")
        
        sensitive_files = [
            '.env',
            'config.py',
            'migrations/',
            'app/models.py',
            'app/security.py'
        ]
        
        for file_path in sensitive_files:
            full_path = os.path.join(os.path.dirname(__file__), '..', file_path)
            if os.path.exists(full_path):
                try:
                    stat_info = os.stat(full_path)
                    permissions = oct(stat_info.st_mode)[-3:]
                    
                    # Check for world-readable files
                    if permissions[-1] in ['4', '5', '6', '7']:
                        self.add_finding('MEDIUM', 'File Permissions',
                                       f'File {file_path} is world-readable: {permissions}')
                    
                    # Check for world-writable files
                    if permissions[-1] in ['2', '3', '6', '7']:
                        self.add_finding('HIGH', 'File Permissions',
                                       f'File {file_path} is world-writable: {permissions}')
                        
                except OSError as e:
                    self.add_finding('LOW', 'File Permissions',
                                   f'Could not check permissions for {file_path}: {e}')
    
    def check_exposed_secrets(self) -> None:
        """Check for exposed secrets in the codebase."""
        print("🔍 Checking for exposed secrets...")
        
        secret_patterns = [
            (r'(GEMINI_API_KEY\s*=\s*["\'][^"\']{20,}["\'])', 'Gemini API Key'),
            (r'(OPENAI_API_KEY\s*=\s*["\'][^"\']{20,}["\'])', 'OpenAI API Key'),
            (r'(NEWS_API_KEY\s*=\s*["\'][^"\']{20,}["\'])', 'News API Key'),
            (r'(TWITTER_BEARER_TOKEN\s*=\s*["\'][^"\']{20,}["\'])', 'Twitter Bearer Token'),
            (r'(SECRET_KEY\s*=\s*["\'][^"\']{10,}["\'])', 'Secret Key'),
            (r'(password\s*=\s*["\'][^"\']{5,}["\'])', 'Hardcoded Password'),
            (r'([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})', 'Email Address'),
        ]
        
        # Check Python files
        for root, dirs, files in os.walk(os.path.join(os.path.dirname(__file__), '..')):
            # Skip certain directories
            dirs[:] = [d for d in dirs if d not in ['.git', '__pycache__', 'venv', 'node_modules']]
            
            for file in files:
                if file.endswith(('.py', '.js', '.jsx', '.ts', '.tsx', '.env', '.config')):
                    file_path = os.path.join(root, file)
                    try:
                        with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                            content = f.read()
                            
                        for pattern, secret_type in secret_patterns:
                            matches = re.findall(pattern, content, re.IGNORECASE)
                            for match in matches:
                                # Skip .env.example files
                                if '.example' in file_path:
                                    continue
                                    
                                relative_path = os.path.relpath(file_path, os.path.dirname(__file__))
                                self.add_finding('HIGH', 'Exposed Secrets',
                                               f'{secret_type} found in {relative_path}',
                                               f'Pattern: {match[:50]}...')
                                
                    except (UnicodeDecodeError, PermissionError):
                        continue
    
    def check_dependencies(self) -> None:
        """Check for vulnerable dependencies."""
        print("🔍 Checking dependencies for vulnerabilities...")
        
        requirements_file = os.path.join(os.path.dirname(__file__), '..', 'requirements.txt')
        
        if os.path.exists(requirements_file):
            try:
                # Try to run safety check if available
                result = subprocess.run(['safety', 'check', '-r', requirements_file], 
                                      capture_output=True, text=True, timeout=30)
                
                if result.returncode == 0:
                    self.add_finding('INFO', 'Dependencies', 
                                   'No known vulnerabilities found in dependencies')
                else:
                    vulnerabilities = result.stdout.split('\\n')
                    for vuln in vulnerabilities:
                        if vuln.strip():
                            self.add_finding('MEDIUM', 'Dependencies',
                                           'Vulnerable dependency found', vuln.strip())
                            
            except (subprocess.TimeoutExpired, FileNotFoundError):
                self.add_finding('INFO', 'Dependencies',
                               'Could not run vulnerability check (safety not installed)')
                
            # Check for outdated or insecure versions
            insecure_packages = [
                ('flask', '2.0.0', 'Consider upgrading Flask for security patches'),
                ('requests', '2.25.0', 'Consider upgrading requests for security patches'),
                ('sqlalchemy', '1.4.0', 'Consider upgrading SQLAlchemy for security patches'),
            ]
            
            with open(requirements_file, 'r') as f:
                requirements = f.read()
                
            for package, min_version, recommendation in insecure_packages:
                if package in requirements.lower():
                    self.add_finding('LOW', 'Dependencies', recommendation)
    
    def check_security_configuration(self) -> None:
        """Check security configuration in the application."""
        print("🔍 Checking security configuration...")
        
        config_file = os.path.join(os.path.dirname(__file__), '..', 'config.py')
        
        if os.path.exists(config_file):
            with open(config_file, 'r') as f:
                config_content = f.read()
            
            # Check for security headers
            if 'SECURITY_HEADERS' not in config_content:
                self.add_finding('MEDIUM', 'Security Headers',
                               'Security headers configuration not found')
            
            # Check for rate limiting
            if 'RATE_LIMIT' not in config_content:
                self.add_finding('MEDIUM', 'Rate Limiting',
                               'Rate limiting configuration not found')
            
            # Check for session security
            security_configs = [
                'SESSION_COOKIE_HTTPONLY',
                'SESSION_COOKIE_SECURE',
                'SESSION_COOKIE_SAMESITE'
            ]
            
            for config in security_configs:
                if config not in config_content:
                    self.add_finding('MEDIUM', 'Session Security',
                                   f'{config} not configured')
        
        # Check for security middleware
        init_file = os.path.join(os.path.dirname(__file__), '..', 'app', '__init__.py')
        if os.path.exists(init_file):
            with open(init_file, 'r') as f:
                init_content = f.read()
            
            security_features = [
                ('apply_security_headers', 'Security headers middleware'),
                ('validate_environment', 'Environment validation'),
                ('AuditLogger', 'Audit logging'),
                ('ProxyFix', 'Proxy fix for proper IP handling')
            ]
            
            for feature, description in security_features:
                if feature not in init_content:
                    self.add_finding('MEDIUM', 'Security Middleware',
                                   f'{description} not implemented')
    
    def check_database_security(self) -> None:
        """Check database security configuration."""
        print("🔍 Checking database security...")
        
        database_url = os.environ.get('DATABASE_URL', '')
        
        if database_url:
            # Check for SSL in database connection
            if 'sslmode' not in database_url.lower():
                self.add_finding('MEDIUM', 'Database Security',
                               'SSL mode not specified in database connection')
            
            # Check for embedded credentials in URL
            if '@' in database_url and '://' in database_url:
                # Parse to check if credentials are in URL
                if '://' in database_url and ':' in database_url.split('://')[1].split('@')[0]:
                    self.add_finding('LOW', 'Database Security',
                                   'Database credentials in connection string',
                                   'Consider using environment variables for credentials')
        
        # Check models for security features
        models_file = os.path.join(os.path.dirname(__file__), '..', 'app', 'models.py')
        if os.path.exists(models_file):
            with open(models_file, 'r') as f:
                models_content = f.read()
            
            security_features = [
                ('password_hash', 'Password hashing'),
                ('check_password', 'Password verification'),
                ('failed_login_attempts', 'Account lockout mechanism'),
                ('is_active', 'Account status management')
            ]
            
            for feature, description in security_features:
                if feature not in models_content:
                    self.add_finding('MEDIUM', 'Database Security',
                                   f'{description} not implemented in User model')
    
    def generate_report(self) -> str:
        """Generate a comprehensive security audit report."""
        report = []
        report.append("🔒 LokDarpan Security Audit Report")
        report.append("=" * 50)
        report.append(f"Generated: {datetime.now().isoformat()}")
        report.append("")
        
        # Summary
        total_issues = len(self.findings) + len(self.warnings)
        critical_high = len([f for f in self.findings if f['severity'] in ['CRITICAL', 'HIGH']])
        
        report.append("📊 SUMMARY")
        report.append("-" * 20)
        report.append(f"Total Issues Found: {total_issues}")
        report.append(f"Critical/High Severity: {critical_high}")
        report.append(f"Medium/Low Severity: {len(self.warnings)}")
        report.append(f"Informational: {len(self.info)}")
        report.append("")
        
        # Critical and High severity findings
        if self.findings:
            report.append("🚨 CRITICAL & HIGH SEVERITY FINDINGS")
            report.append("-" * 40)
            for finding in self.findings:
                report.append(f"[{finding['severity']}] {finding['category']}: {finding['description']}")
                if finding['details']:
                    report.append(f"    Details: {finding['details']}")
                report.append("")
        
        # Medium and Low severity warnings
        if self.warnings:
            report.append("⚠️  MEDIUM & LOW SEVERITY WARNINGS")
            report.append("-" * 40)
            for warning in self.warnings:
                report.append(f"[{warning['severity']}] {warning['category']}: {warning['description']}")
                if warning['details']:
                    report.append(f"    Details: {warning['details']}")
                report.append("")
        
        # Informational findings
        if self.info:
            report.append("ℹ️  INFORMATIONAL")
            report.append("-" * 20)
            for info_item in self.info:
                report.append(f"[{info_item['severity']}] {info_item['category']}: {info_item['description']}")
                if info_item['details']:
                    report.append(f"    Details: {info_item['details']}")
                report.append("")
        
        # Recommendations
        report.append("🔧 RECOMMENDATIONS")
        report.append("-" * 20)
        
        if critical_high > 0:
            report.append("1. IMMEDIATE ACTION REQUIRED:")
            report.append("   - Address all CRITICAL and HIGH severity findings")
            report.append("   - Rotate any exposed API keys or secrets")
            report.append("   - Review file permissions and access controls")
            report.append("")
        
        report.append("2. ONGOING SECURITY MEASURES:")
        report.append("   - Implement regular security audits")
        report.append("   - Set up dependency vulnerability monitoring")
        report.append("   - Enable comprehensive audit logging")
        report.append("   - Regular security training for development team")
        report.append("")
        
        report.append("3. COMPLIANCE & GOVERNANCE:")
        report.append("   - Document security policies and procedures")
        report.append("   - Implement change management for security configurations")
        report.append("   - Regular security assessments and penetration testing")
        report.append("   - Incident response plan development and testing")
        report.append("")
        
        return "\\n".join(report)
    
    def run_audit(self) -> None:
        """Run the complete security audit."""
        print("🔒 Starting LokDarpan Security Audit...")
        print("=" * 50)
        
        self.check_environment_variables()
        self.check_file_permissions()
        self.check_exposed_secrets()
        self.check_dependencies()
        self.check_security_configuration()
        self.check_database_security()
        
        print("\\n" + "=" * 50)
        print("🔒 Security Audit Complete!")
        print("=" * 50)
        
        # Generate and save report
        report = self.generate_report()
        
        # Save report to file
        report_file = f"security_audit_{datetime.now().strftime('%Y%m%d_%H%M%S')}.txt"
        report_path = os.path.join(os.path.dirname(__file__), '..', 'logs', report_file)
        
        # Create logs directory if it doesn't exist
        os.makedirs(os.path.dirname(report_path), exist_ok=True)
        
        with open(report_path, 'w') as f:
            f.write(report)
        
        print(f"📄 Security audit report saved to: {report_path}")
        print("\\n" + report)
        
        # Return exit code based on findings
        critical_high = len([f for f in self.findings if f['severity'] in ['CRITICAL', 'HIGH']])
        return 1 if critical_high > 0 else 0

def main():
    """Main function to run security audit."""
    auditor = SecurityAuditor()
    exit_code = auditor.run_audit()
    sys.exit(exit_code)

if __name__ == '__main__':
    main()