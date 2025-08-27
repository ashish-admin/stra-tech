#!/usr/bin/env python3
"""
Comprehensive test runner with coverage reporting for LokDarpan backend.

This script runs the full test suite with coverage analysis and generates
HTML reports for easy visualization of test coverage across the codebase.
"""

import os
import sys
import subprocess
import argparse
from pathlib import Path

# Add the backend directory to Python path
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))


def run_command(cmd, description="Running command"):
    """Run a shell command and return success status."""
    print(f"\n{description}...")
    print(f"Command: {' '.join(cmd)}")
    
    try:
        result = subprocess.run(cmd, check=True, capture_output=True, text=True)
        print(f"✅ {description} completed successfully")
        if result.stdout:
            print("Output:", result.stdout[-500:])  # Last 500 chars
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ {description} failed with exit code {e.returncode}")
        if e.stdout:
            print("STDOUT:", e.stdout[-1000:])
        if e.stderr:
            print("STDERR:", e.stderr[-1000:])
        return False


def main():
    parser = argparse.ArgumentParser(description='Run tests with coverage reporting')
    parser.add_argument('--unit-only', action='store_true', help='Run only unit tests')
    parser.add_argument('--integration-only', action='store_true', help='Run only integration tests')
    parser.add_argument('--strategist-only', action='store_true', help='Run only strategist module tests')
    parser.add_argument('--no-coverage', action='store_true', help='Skip coverage reporting')
    parser.add_argument('--fail-under', type=int, default=80, help='Minimum coverage percentage required')
    args = parser.parse_args()

    os.chdir(backend_dir)
    
    # Test selection based on arguments
    test_markers = []
    if args.unit_only:
        test_markers.append('-m unit')
    elif args.integration_only:
        test_markers.append('-m integration')
    elif args.strategist_only:
        test_markers.append('-m strategist')
    
    # Build pytest command
    pytest_cmd = ['python', '-m', 'pytest']
    
    if not args.no_coverage:
        pytest_cmd.extend([
            '--cov=app',
            '--cov=strategist', 
            '--cov-branch',
            '--cov-report=term-missing',
            '--cov-report=html:htmlcov',
            '--cov-report=xml:coverage.xml',
            f'--cov-fail-under={args.fail_under}'
        ])
    
    pytest_cmd.extend([
        '-v',
        '--tb=short',
        'tests/'
    ])
    
    if test_markers:
        pytest_cmd.extend(test_markers)
    
    print("=" * 70)
    print("LokDarpan Backend Test Suite with Coverage Analysis")
    print("=" * 70)
    
    # Run tests
    success = run_command(pytest_cmd, "Running test suite with coverage")
    
    if not args.no_coverage and success:
        print("\n" + "=" * 50)
        print("COVERAGE REPORT GENERATED")
        print("=" * 50)
        
        html_report = backend_dir / "htmlcov" / "index.html"
        xml_report = backend_dir / "coverage.xml"
        
        if html_report.exists():
            print(f"📊 HTML Coverage Report: file://{html_report.absolute()}")
        
        if xml_report.exists():
            print(f"📋 XML Coverage Report: {xml_report.absolute()}")
            
        # Generate coverage badge
        try:
            import coverage
            cov = coverage.Coverage()
            cov.load()
            total_coverage = cov.report()
            
            badge_color = "brightgreen" if total_coverage >= 90 else \
                         "green" if total_coverage >= 80 else \
                         "yellow" if total_coverage >= 70 else "red"
            
            print(f"\n📈 Overall Coverage: {total_coverage:.1f}%")
            print(f"🏆 Coverage Badge: ![Coverage](https://img.shields.io/badge/coverage-{total_coverage:.0f}%25-{badge_color})")
            
        except ImportError:
            print("📊 Install 'coverage' package to see detailed coverage metrics")
    
    return 0 if success else 1


if __name__ == '__main__':
    sys.exit(main())