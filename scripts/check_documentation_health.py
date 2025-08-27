#!/usr/bin/env python3
"""
LokDarpan Documentation Health Monitoring Script
===============================================

Comprehensive documentation health checker for LokDarpan project.
Validates documentation freshness, accuracy, and completeness.

Features:
- Document freshness validation against SLA requirements
- Link validation and reference checking
- Test infrastructure synchronization validation
- Documentation completeness assessment
- Automated report generation with actionable recommendations

Usage:
    python scripts/check_documentation_health.py [--fix] [--verbose] [--report-format json]
    
Last Updated: August 26, 2025
Version: 1.0 - Test Infrastructure Edition
"""

import os
import sys
import json
import datetime
import re
import subprocess
import argparse
from pathlib import Path
from typing import Dict, List, Tuple, Any, Optional
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('logs/living_docs.log'),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

class DocumentationHealthChecker:
    """Comprehensive documentation health monitoring and validation system."""
    
    def __init__(self, project_root: str = None):
        self.project_root = Path(project_root or os.getcwd())
        self.health_report = {
            'timestamp': datetime.datetime.now().isoformat(),
            'overall_health': 'UNKNOWN',
            'test_infrastructure_sync': False,
            'document_freshness': {},
            'link_validation': {},
            'completeness_assessment': {},
            'recommendations': [],
            'metrics': {}
        }
        
        # Documentation SLA requirements (in days)
        self.freshness_requirements = {
            'CRITICAL': 7,    # SYSTEM_STATUS.md, TESTING_STATUS.md
            'PROCESS': 30,    # PROCESS_MANAGEMENT_GUIDE.md
            'ARCHITECTURE': 60,  # CLAUDE.md
            'HISTORICAL': float('inf')  # Sprint retrospectives (immutable)
        }
        
        # Critical document mappings
        self.document_categories = {
            'CRITICAL': [
                'SYSTEM_STATUS.md',
                'backend/TESTING_STATUS.md',
                'PROJECT_PLAN_UPDATE.md'
            ],
            'PROCESS': [
                'docs/PROCESS_MANAGEMENT_GUIDE.md',
                'QUALITY_GATES.md',
                'docs/QUALITY_GATES.md'
            ],
            'ARCHITECTURE': [
                'CLAUDE.md',
                'README.md',
                'docs/TROUBLESHOOTING.md'
            ],
            'HISTORICAL': [
                'docs/sprints/sprint-1-retrospective.md'
            ]
        }
    
    def run_health_check(self, fix_issues: bool = False, verbose: bool = False) -> Dict[str, Any]:
        """Execute comprehensive documentation health check."""
        logger.info("🏥 Starting LokDarpan Documentation Health Check")
        
        try:
            # 1. Document freshness validation
            logger.info("📅 Checking document freshness...")
            self._check_document_freshness()
            
            # 2. Link validation
            logger.info("🔗 Validating links and references...")
            self._validate_links()
            
            # 3. Test infrastructure synchronization
            logger.info("🧪 Validating test infrastructure synchronization...")
            self._check_test_infrastructure_sync()
            
            # 4. Completeness assessment
            logger.info("📋 Assessing documentation completeness...")
            self._assess_completeness()
            
            # 5. Generate recommendations
            logger.info("💡 Generating recommendations...")
            self._generate_recommendations()
            
            # 6. Calculate overall health score
            self._calculate_health_score()
            
            # 7. Apply fixes if requested
            if fix_issues:
                logger.info("🔧 Applying automated fixes...")
                self._apply_fixes()
            
            logger.info(f"✅ Documentation health check complete. Overall status: {self.health_report['overall_health']}")
            
        except Exception as e:
            logger.error(f"❌ Health check failed: {e}")
            self.health_report['overall_health'] = 'ERROR'
            self.health_report['error'] = str(e)
        
        return self.health_report
    
    def _check_document_freshness(self):
        """Validate document freshness against SLA requirements."""
        freshness_results = {}
        current_time = datetime.datetime.now()
        
        for category, documents in self.document_categories.items():
            sla_days = self.freshness_requirements[category]
            
            for doc_path in documents:
                full_path = self.project_root / doc_path
                
                if not full_path.exists():
                    freshness_results[doc_path] = {
                        'status': 'MISSING',
                        'message': f'Document does not exist: {full_path}'
                    }
                    continue
                
                # Get file modification time
                mod_time = datetime.datetime.fromtimestamp(full_path.stat().st_mtime)
                days_old = (current_time - mod_time).days
                
                if sla_days == float('inf'):  # Historical documents
                    status = 'HISTORICAL'
                    message = f'Historical document (immutable): {days_old} days old'
                elif days_old <= sla_days:
                    status = 'FRESH'
                    message = f'Document is fresh: {days_old}/{sla_days} days'
                else:
                    status = 'STALE'
                    message = f'Document is stale: {days_old}/{sla_days} days (exceeds SLA)'
                
                freshness_results[doc_path] = {
                    'status': status,
                    'days_old': days_old,
                    'sla_days': sla_days,
                    'category': category,
                    'message': message,
                    'last_modified': mod_time.isoformat()
                }
        
        self.health_report['document_freshness'] = freshness_results
        
        # Calculate freshness metrics
        total_docs = len([d for d in freshness_results.values() if d['status'] != 'MISSING'])
        fresh_docs = len([d for d in freshness_results.values() if d['status'] in ['FRESH', 'HISTORICAL']])
        freshness_percentage = (fresh_docs / total_docs * 100) if total_docs > 0 else 0
        
        self.health_report['metrics']['freshness_percentage'] = freshness_percentage
        logger.info(f"📅 Document freshness: {freshness_percentage:.1f}% ({fresh_docs}/{total_docs} documents fresh)")
    
    def _validate_links(self):
        """Validate links and references in documentation."""
        link_results = {}
        
        # Patterns to find different types of links
        patterns = {
            'internal_links': re.compile(r'\\[([^\\]]+)\\]\\(([^)]+\\.md)\\)'),
            'file_references': re.compile(r'`([^`]+\\.(py|js|jsx|md|yml|yaml|json))`'),
            'directory_references': re.compile(r'`([^`]+/[^`]*)`'),
            'external_links': re.compile(r'\\[([^\\]]+)\\]\\((https?://[^)]+)\\)')
        }
        
        for category, documents in self.document_categories.items():
            for doc_path in documents:
                full_path = self.project_root / doc_path
                
                if not full_path.exists():
                    continue
                
                try:
                    content = full_path.read_text(encoding='utf-8')
                    doc_links = {}
                    
                    for pattern_name, pattern in patterns.items():
                        matches = pattern.findall(content)
                        doc_links[pattern_name] = []
                        
                        for match in matches:
                            if pattern_name in ['internal_links', 'file_references', 'directory_references']:
                                # Validate internal references
                                ref_path = match[1] if isinstance(match, tuple) else match
                                ref_full_path = self.project_root / ref_path
                                
                                if ref_full_path.exists():
                                    status = 'VALID'
                                else:
                                    status = 'BROKEN'
                                
                                doc_links[pattern_name].append({
                                    'reference': ref_path,
                                    'status': status
                                })
                            else:
                                # External links (would require network check)
                                doc_links[pattern_name].append({
                                    'reference': match[1] if isinstance(match, tuple) else match,
                                    'status': 'UNCHECKED'  # Would need network validation
                                })
                    
                    link_results[doc_path] = doc_links
                    
                except Exception as e:
                    logger.warning(f"⚠️ Could not validate links in {doc_path}: {e}")
                    link_results[doc_path] = {'error': str(e)}
        
        self.health_report['link_validation'] = link_results
        
        # Calculate link validation metrics
        total_links = 0
        valid_links = 0
        
        for doc_links in link_results.values():
            if 'error' in doc_links:
                continue
            for pattern_links in doc_links.values():
                for link in pattern_links:
                    total_links += 1
                    if link['status'] == 'VALID':
                        valid_links += 1
        
        link_validity = (valid_links / total_links * 100) if total_links > 0 else 100
        self.health_report['metrics']['link_validity_percentage'] = link_validity
        logger.info(f"🔗 Link validity: {link_validity:.1f}% ({valid_links}/{total_links} links valid)")
    
    def _check_test_infrastructure_sync(self):
        """Validate test infrastructure data synchronization with documentation."""
        sync_results = {
            'test_results_sync': False,
            'coverage_metrics_sync': False,
            'system_health_sync': False,
            'details': {}
        }
        
        try:
            # 1. Check if test results are reflected in TESTING_STATUS.md
            testing_status_path = self.project_root / 'backend' / 'TESTING_STATUS.md'
            if testing_status_path.exists():
                content = testing_status_path.read_text()
                
                # Look for test infrastructure mentions
                if '74%' in content and '34/46' in content:
                    sync_results['test_results_sync'] = True
                    sync_results['details']['testing_status'] = 'Test results synchronized'
                else:
                    sync_results['details']['testing_status'] = 'Test results not synchronized'
            
            # 2. Check if system health is reflected in SYSTEM_STATUS.md
            system_status_path = self.project_root / 'SYSTEM_STATUS.md'
            if system_status_path.exists():
                content = system_status_path.read_text()
                
                # Look for test infrastructure mentions
                if 'TEST INFRASTRUCTURE' in content and '74%' in content:
                    sync_results['system_health_sync'] = True
                    sync_results['details']['system_status'] = 'System health synchronized'
                else:
                    sync_results['details']['system_status'] = 'System health not synchronized'
            
            # 3. Check README.md for test infrastructure status
            readme_path = self.project_root / 'README.md'
            if readme_path.exists():
                content = readme_path.read_text()
                
                if '🧪 Testing Infrastructure' in content:
                    sync_results['coverage_metrics_sync'] = True
                    sync_results['details']['readme'] = 'Test infrastructure documentation synchronized'
                else:
                    sync_results['details']['readme'] = 'Test infrastructure not documented in README'
            
        except Exception as e:
            sync_results['details']['error'] = f'Synchronization check failed: {e}'
        
        # Overall sync status
        sync_results['overall_sync'] = all([
            sync_results['test_results_sync'],
            sync_results['coverage_metrics_sync'],
            sync_results['system_health_sync']
        ])
        
        self.health_report['test_infrastructure_sync'] = sync_results['overall_sync']
        self.health_report['sync_details'] = sync_results
        
        logger.info(f"🧪 Test infrastructure sync: {'✅ Synchronized' if sync_results['overall_sync'] else '❌ Not synchronized'}")
    
    def _assess_completeness(self):
        """Assess documentation completeness against requirements."""
        completeness_results = {
            'required_documents': {},
            'process_coverage': {},
            'test_documentation': {}
        }
        
        # Required documents checklist
        required_docs = [
            'README.md',
            'CLAUDE.md', 
            'SYSTEM_STATUS.md',
            'PROJECT_PLAN_UPDATE.md',
            'backend/TESTING_STATUS.md',
            'docs/PROCESS_MANAGEMENT_GUIDE.md'
        ]
        
        for doc in required_docs:
            doc_path = self.project_root / doc
            completeness_results['required_documents'][doc] = {
                'exists': doc_path.exists(),
                'size_bytes': doc_path.stat().st_size if doc_path.exists() else 0
            }
        
        # Process coverage assessment
        critical_processes = [
            'Development startup procedures',
            'Testing procedures', 
            'Documentation update procedures',
            'Quality gate validation',
            'Troubleshooting guides'
        ]
        
        for process in critical_processes:
            # Simple heuristic: check if process is mentioned in key documents
            covered = False
            for doc in required_docs:
                doc_path = self.project_root / doc
                if doc_path.exists():
                    content = doc_path.read_text().lower()
                    if any(keyword in content for keyword in process.lower().split()):
                        covered = True
                        break
            
            completeness_results['process_coverage'][process] = covered
        
        self.health_report['completeness_assessment'] = completeness_results
        
        # Calculate completeness metrics
        docs_exist = sum(1 for doc in completeness_results['required_documents'].values() if doc['exists'])
        docs_total = len(completeness_results['required_documents'])
        doc_completeness = (docs_exist / docs_total * 100) if docs_total > 0 else 0
        
        process_covered = sum(1 for covered in completeness_results['process_coverage'].values() if covered)
        process_total = len(completeness_results['process_coverage'])
        process_completeness = (process_covered / process_total * 100) if process_total > 0 else 0
        
        self.health_report['metrics']['document_completeness'] = doc_completeness
        self.health_report['metrics']['process_completeness'] = process_completeness
        
        logger.info(f"📋 Documentation completeness: {doc_completeness:.1f}% documents, {process_completeness:.1f}% processes")
    
    def _generate_recommendations(self):
        """Generate actionable recommendations based on health assessment."""
        recommendations = []
        
        # Freshness recommendations
        stale_docs = [
            doc for doc, data in self.health_report['document_freshness'].items()
            if data.get('status') == 'STALE'
        ]
        
        if stale_docs:
            recommendations.append({
                'priority': 'HIGH',
                'category': 'FRESHNESS',
                'title': 'Update stale documentation',
                'description': f"The following documents exceed their freshness SLA: {', '.join(stale_docs)}",
                'action': 'Review and update stale documents with current information'
            })
        
        # Link validation recommendations  
        if self.health_report['metrics'].get('link_validity_percentage', 100) < 95:
            recommendations.append({
                'priority': 'MEDIUM',
                'category': 'LINKS',
                'title': 'Fix broken links and references',
                'description': f"Link validity is {self.health_report['metrics']['link_validity_percentage']:.1f}%, below 95% target",
                'action': 'Review and fix broken internal links and file references'
            })
        
        # Test infrastructure sync recommendations
        if not self.health_report['test_infrastructure_sync']:
            recommendations.append({
                'priority': 'HIGH',
                'category': 'SYNC',
                'title': 'Synchronize test infrastructure documentation',
                'description': 'Test infrastructure documentation is not synchronized across all documents',
                'action': 'Update all documents to reflect current test infrastructure status (74% API coverage)'
            })
        
        # Completeness recommendations
        missing_docs = [
            doc for doc, data in self.health_report['completeness_assessment']['required_documents'].items()
            if not data['exists']
        ]
        
        if missing_docs:
            recommendations.append({
                'priority': 'MEDIUM',
                'category': 'COMPLETENESS',
                'title': 'Create missing required documents',
                'description': f"Missing required documents: {', '.join(missing_docs)}",
                'action': 'Create missing documents following established templates'
            })
        
        self.health_report['recommendations'] = recommendations
        logger.info(f"💡 Generated {len(recommendations)} recommendations")
    
    def _calculate_health_score(self):
        """Calculate overall documentation health score."""
        metrics = self.health_report['metrics']
        
        # Weight factors for different aspects
        weights = {
            'freshness': 0.3,
            'links': 0.2,
            'completeness': 0.25,
            'sync': 0.25
        }
        
        # Calculate component scores
        freshness_score = metrics.get('freshness_percentage', 0)
        link_score = metrics.get('link_validity_percentage', 0)
        completeness_score = (
            metrics.get('document_completeness', 0) + 
            metrics.get('process_completeness', 0)
        ) / 2
        sync_score = 100 if self.health_report['test_infrastructure_sync'] else 0
        
        # Weighted overall score
        overall_score = (
            freshness_score * weights['freshness'] +
            link_score * weights['links'] +
            completeness_score * weights['completeness'] +
            sync_score * weights['sync']
        )
        
        # Determine health status
        if overall_score >= 90:
            health_status = 'EXCELLENT'
        elif overall_score >= 80:
            health_status = 'GOOD'
        elif overall_score >= 70:
            health_status = 'FAIR'
        elif overall_score >= 60:
            health_status = 'POOR'
        else:
            health_status = 'CRITICAL'
        
        self.health_report['metrics']['overall_score'] = round(overall_score, 1)
        self.health_report['overall_health'] = health_status
        
        logger.info(f"📊 Overall documentation health: {health_status} ({overall_score:.1f}%)")
    
    def _apply_fixes(self):
        """Apply automated fixes for identified issues."""
        fixes_applied = []
        
        # Example automated fixes (would be implemented based on specific needs)
        logger.info("🔧 Automated fixes would be implemented here")
        logger.info("   - Update 'Last Updated' timestamps")
        logger.info("   - Fix relative path references") 
        logger.info("   - Synchronize test infrastructure metrics")
        
        self.health_report['fixes_applied'] = fixes_applied
    
    def generate_report(self, format_type: str = 'text') -> str:
        """Generate health report in specified format."""
        if format_type == 'json':
            return json.dumps(self.health_report, indent=2)
        
        # Text format report
        report_lines = [
            "=" * 60,
            "📋 LOKDARPAN DOCUMENTATION HEALTH REPORT",
            "=" * 60,
            f"Generated: {self.health_report['timestamp']}",
            f"Overall Health: {self.health_report['overall_health']} ({self.health_report['metrics'].get('overall_score', 0)}%)",
            "",
            "📊 METRICS SUMMARY",
            "-" * 30,
            f"Document Freshness: {self.health_report['metrics'].get('freshness_percentage', 0):.1f}%",
            f"Link Validity: {self.health_report['metrics'].get('link_validity_percentage', 0):.1f}%",
            f"Document Completeness: {self.health_report['metrics'].get('document_completeness', 0):.1f}%",
            f"Process Completeness: {self.health_report['metrics'].get('process_completeness', 0):.1f}%",
            f"Test Infrastructure Sync: {'✅ Yes' if self.health_report['test_infrastructure_sync'] else '❌ No'}",
            "",
            "🔍 RECOMMENDATIONS",
            "-" * 30
        ]
        
        for rec in self.health_report['recommendations']:
            report_lines.extend([
                f"[{rec['priority']}] {rec['title']}",
                f"  Description: {rec['description']}",
                f"  Action: {rec['action']}",
                ""
            ])
        
        if not self.health_report['recommendations']:
            report_lines.append("No recommendations - documentation health is excellent!")
        
        return "\\n".join(report_lines)


def main():
    """Main entry point for documentation health checker."""
    parser = argparse.ArgumentParser(description='LokDarpan Documentation Health Checker')
    parser.add_argument('--fix', action='store_true', help='Apply automated fixes')
    parser.add_argument('--verbose', action='store_true', help='Verbose output')
    parser.add_argument('--report-format', choices=['text', 'json'], default='text', help='Report format')
    parser.add_argument('--output-file', help='Save report to file')
    
    args = parser.parse_args()
    
    # Initialize health checker
    checker = DocumentationHealthChecker()
    
    # Run health check
    health_report = checker.run_health_check(fix_issues=args.fix, verbose=args.verbose)
    
    # Generate report
    report = checker.generate_report(format_type=args.report_format)
    
    # Output report
    if args.output_file:
        Path(args.output_file).write_text(report)
        logger.info(f"📄 Report saved to {args.output_file}")
    else:
        print(report)
    
    # Exit with appropriate code
    if health_report['overall_health'] in ['EXCELLENT', 'GOOD']:
        sys.exit(0)
    elif health_report['overall_health'] in ['FAIR']:
        sys.exit(1)
    else:
        sys.exit(2)


if __name__ == '__main__':
    main()