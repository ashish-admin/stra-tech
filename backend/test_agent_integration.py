#!/usr/bin/env python3
"""
Test script for LokDarpan Agent Integration
Verifies that the agent system integrates correctly with the Flask application
"""

import os
import sys
import traceback
from pathlib import Path

# Add current directory to Python path
sys.path.insert(0, '.')

def test_agent_service_import():
    """Test that agent service can be imported correctly"""
    print("="*50)
    print("Testing Agent Service Import")
    print("="*50)
    
    try:
        from app.agents_service import get_agent_capabilities, get_master_agent
        print("✅ Agent service import: SUCCESS")
        
        capabilities = get_agent_capabilities()
        print(f"✅ Available commands: {len(capabilities.get('commands', {}))}")
        print(f"✅ Available agents: {len(capabilities.get('available_agents', []))}")
        print(f"✅ Available tasks: {len(capabilities.get('available_tasks', []))}")
        
        return True
    except Exception as e:
        print(f"❌ Agent service import: FAILED")
        print(f"   Error: {e}")
        print(f"   Traceback: {traceback.format_exc()}")
        return False

def test_agent_api_import():
    """Test that agent API blueprint can be imported"""
    print("\n" + "="*50)
    print("Testing Agent API Blueprint Import")
    print("="*50)
    
    try:
        from app.agents_api import agents_bp
        print("✅ Agent API blueprint import: SUCCESS")
        print(f"✅ Blueprint name: {agents_bp.name}")
        print(f"✅ Blueprint URL prefix: {agents_bp.url_prefix}")
        
        # Count endpoints
        endpoint_count = len([rule for rule in agents_bp.deferred_functions])
        print(f"✅ Registered endpoints: {endpoint_count}")
        
        return True
    except Exception as e:
        print(f"❌ Agent API blueprint import: FAILED")
        print(f"   Error: {e}")
        print(f"   Traceback: {traceback.format_exc()}")
        return False

def test_flask_app_integration():
    """Test that the Flask app can be created with agent integration"""
    print("\n" + "="*50)
    print("Testing Flask Application Integration")
    print("="*50)
    
    try:
        from app import create_app
        
        # Set minimal required environment variables
        os.environ.setdefault('SECRET_KEY', 'test-key')
        os.environ.setdefault('DATABASE_URL', 'sqlite:///test.db')
        
        app = create_app()
        print("✅ Flask app creation: SUCCESS")
        
        # Check if agent blueprint is registered
        blueprint_names = [bp.name for bp in app.blueprints.values()]
        if 'agents' in blueprint_names:
            print("✅ Agent blueprint registered: SUCCESS")
        else:
            print("❌ Agent blueprint registered: FAILED")
            print(f"   Available blueprints: {blueprint_names}")
            return False
        
        # Test app context
        with app.app_context():
            print("✅ App context creation: SUCCESS")
        
        return True
    except Exception as e:
        print(f"❌ Flask app integration: FAILED")
        print(f"   Error: {e}")
        print(f"   Traceback: {traceback.format_exc()}")
        return False

def test_agent_framework_directory():
    """Test that agent framework directory structure is correct"""
    print("\n" + "="*50)
    print("Testing Agent Framework Directory Structure")
    print("="*50)
    
    base_path = Path(__file__).parent.parent / ".lokdarpan-agents"
    
    required_paths = [
        base_path,
        base_path / "core-config.yaml",
        base_path / "lokdarpan-master.md",
        base_path / "agents",
        base_path / "tasks",
        base_path / "templates",
        base_path / "data"
    ]
    
    all_good = True
    for path in required_paths:
        if path.exists():
            print(f"✅ {path.name}: EXISTS")
        else:
            print(f"❌ {path.name}: MISSING")
            all_good = False
    
    if all_good:
        # Check content
        agents_count = len(list((base_path / "agents").glob("*.md"))) if (base_path / "agents").exists() else 0
        tasks_count = len(list((base_path / "tasks").glob("*.md"))) if (base_path / "tasks").exists() else 0
        templates_count = len(list((base_path / "templates").glob("*.yaml"))) if (base_path / "templates").exists() else 0
        data_count = len(list((base_path / "data").glob("*.md"))) if (base_path / "data").exists() else 0
        
        print(f"✅ Agents: {agents_count} files")
        print(f"✅ Tasks: {tasks_count} files")
        print(f"✅ Templates: {templates_count} files")
        print(f"✅ Data: {data_count} files")
    
    return all_good

def test_strategist_integration():
    """Test integration with existing strategist module"""
    print("\n" + "="*50)
    print("Testing Strategist Module Integration")
    print("="*50)
    
    try:
        # Test strategist imports that agent service depends on
        from strategist.service import PoliticalStrategist
        print("✅ PoliticalStrategist import: SUCCESS")
        
        from strategist.cache import cget, cset
        print("✅ Cache functions import: SUCCESS")
        
        # Test that we can create a strategist instance
        strategist = PoliticalStrategist("Test Ward")
        print("✅ PoliticalStrategist instantiation: SUCCESS")
        
        return True
    except Exception as e:
        print(f"❌ Strategist integration: FAILED")
        print(f"   Error: {e}")
        print(f"   Traceback: {traceback.format_exc()}")
        return False

def main():
    """Run all integration tests"""
    print("LokDarpan Agent Integration Test Suite")
    print("="*60)
    print(f"Python path: {sys.path[0]}")
    print(f"Working directory: {os.getcwd()}")
    print(f"Current file: {__file__}")
    
    tests = [
        test_agent_framework_directory,
        test_strategist_integration,
        test_agent_service_import,
        test_agent_api_import,
        test_flask_app_integration
    ]
    
    results = []
    for test in tests:
        try:
            result = test()
            results.append(result)
        except Exception as e:
            print(f"❌ Test {test.__name__} crashed: {e}")
            results.append(False)
    
    # Summary
    print("\n" + "="*60)
    print("INTEGRATION TEST SUMMARY")
    print("="*60)
    
    passed = sum(results)
    total = len(results)
    
    print(f"Passed: {passed}/{total}")
    print(f"Success Rate: {(passed/total)*100:.1f}%")
    
    if passed == total:
        print("🎉 ALL TESTS PASSED - Agent integration is successful!")
        return 0
    else:
        print("❌ SOME TESTS FAILED - Check errors above")
        return 1

if __name__ == "__main__":
    exit_code = main()
    sys.exit(exit_code)