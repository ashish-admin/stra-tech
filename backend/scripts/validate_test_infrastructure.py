#!/usr/bin/env python3
"""
Test infrastructure validation script for LokDarpan backend.

Validates that all test infrastructure components are working properly:
- Test discovery and collection
- Fixture availability
- Mock services
- Coverage configuration
"""

import os
import sys
import subprocess
import importlib.util
from pathlib import Path

# Add the backend directory to Python path  
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))


def check_test_discovery():
    """Check that pytest can discover all tests."""
    print("🔍 Checking test discovery...")
    
    try:
        result = subprocess.run([
            'python', '-m', 'pytest', 
            '--collect-only', '-q', 'tests/'
        ], capture_output=True, text=True, cwd=backend_dir)
        
        if result.returncode == 0:
            lines = result.stdout.strip().split('\n')
            test_count = len([l for l in lines if '::' in l])
            print(f"✅ Discovered {test_count} tests successfully")
            return True
        else:
            print(f"❌ Test discovery failed: {result.stderr}")
            return False
            
    except Exception as e:
        print(f"❌ Test discovery error: {e}")
        return False


def check_imports():
    """Check that all critical modules can be imported."""
    print("\n📦 Checking critical imports...")
    
    critical_modules = [
        'strategist.cache',
        'strategist.credibility.checks', 
        'strategist.nlp.pipeline',
        'strategist.reasoner.ultra_think',
        'strategist.retriever.perplexity_client',
        'strategist.service',
        'app.models',
        'app.models_ai',
    ]
    
    success = True
    for module_name in critical_modules:
        try:
            importlib.import_module(module_name)
            print(f"✅ {module_name}")
        except ImportError as e:
            print(f"❌ {module_name}: {e}")
            success = False
    
    return success


def check_fixtures():
    """Check that test fixtures are available."""
    print("\n🧪 Checking test fixtures...")
    
    try:
        # Import conftest to check fixtures
        spec = importlib.util.spec_from_file_location("conftest", backend_dir / "tests" / "conftest.py")
        conftest = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(conftest)
        
        # Check for key fixtures
        fixtures = [attr for attr in dir(conftest) if attr.endswith('_fixture') or 
                   attr in ['mock_ai_services', 'mock_redis_cache', 'sample_posts', 'auth_user']]
        
        if fixtures:
            print(f"✅ Found {len(fixtures)} fixtures: {', '.join(fixtures[:5])}...")
            return True
        else:
            print("❌ No fixtures found in conftest.py")
            return False
            
    except Exception as e:
        print(f"❌ Fixture check failed: {e}")
        return False


def check_coverage_config():
    """Check coverage configuration."""
    print("\n📊 Checking coverage configuration...")
    
    coveragerc = backend_dir / ".coveragerc"
    if not coveragerc.exists():
        print("❌ .coveragerc file not found")
        return False
    
    try:
        with open(coveragerc, 'r') as f:
            config_content = f.read()
        
        required_sections = ['[run]', '[report]', '[html]']
        missing_sections = [sec for sec in required_sections if sec not in config_content]
        
        if missing_sections:
            print(f"❌ Missing coverage config sections: {missing_sections}")
            return False
        else:
            print("✅ Coverage configuration is properly set up")
            return True
            
    except Exception as e:
        print(f"❌ Coverage config check failed: {e}")
        return False


def check_pytest_config():
    """Check pytest configuration."""
    print("\n⚙️ Checking pytest configuration...")
    
    pytest_ini = backend_dir / "pytest.ini"
    if not pytest_ini.exists():
        print("❌ pytest.ini file not found")
        return False
    
    try:
        with open(pytest_ini, 'r') as f:
            config_content = f.read()
        
        required_markers = ['unit:', 'integration:', 'strategist:', 'asyncio:']
        missing_markers = [marker for marker in required_markers if marker not in config_content]
        
        if missing_markers:
            print(f"❌ Missing pytest markers: {missing_markers}")
            return False
        else:
            print("✅ Pytest configuration includes all required markers")
            return True
            
    except Exception as e:
        print(f"❌ Pytest config check failed: {e}")
        return False


def run_sample_test():
    """Run a simple test to validate the test infrastructure."""
    print("\n🧪 Running sample test...")
    
    try:
        result = subprocess.run([
            'python', '-m', 'pytest', 
            'tests/strategist/unit/test_credibility.py::TestCredibilityScorer::test_init_default_parameters',
            '-v'
        ], capture_output=True, text=True, cwd=backend_dir)
        
        if result.returncode == 0:
            print("✅ Sample test passed successfully")
            return True
        else:
            print(f"❌ Sample test failed: {result.stderr}")
            return False
            
    except Exception as e:
        print(f"❌ Sample test error: {e}")
        return False


def main():
    print("=" * 70)
    print("LokDarpan Backend Test Infrastructure Validation")
    print("=" * 70)
    
    os.chdir(backend_dir)
    
    checks = [
        ("Test Discovery", check_test_discovery),
        ("Critical Imports", check_imports),
        ("Test Fixtures", check_fixtures),
        ("Coverage Config", check_coverage_config),
        ("Pytest Config", check_pytest_config),
        ("Sample Test", run_sample_test),
    ]
    
    results = []
    for check_name, check_func in checks:
        try:
            success = check_func()
            results.append((check_name, success))
        except Exception as e:
            print(f"❌ {check_name} check crashed: {e}")
            results.append((check_name, False))
    
    print("\n" + "=" * 50)
    print("VALIDATION SUMMARY")
    print("=" * 50)
    
    passed = sum(1 for _, success in results if success)
    total = len(results)
    
    for check_name, success in results:
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status:8} {check_name}")
    
    print(f"\nOverall: {passed}/{total} checks passed")
    
    if passed == total:
        print("🎉 All test infrastructure components are working properly!")
        return 0
    else:
        print("⚠️ Some test infrastructure issues need to be addressed.")
        return 1


if __name__ == '__main__':
    sys.exit(main())