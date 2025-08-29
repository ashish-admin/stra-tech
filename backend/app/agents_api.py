"""
LokDarpan Agents API Blueprint
Flask API endpoints for the integrated agent framework
"""

import asyncio
import logging
from flask import Blueprint, request, jsonify, Response, stream_template
from datetime import datetime, timezone
from typing import Dict, Any, Optional

from .agents_service import execute_agent_command, get_agent_capabilities, get_master_agent
from .async_helper import run_async

logger = logging.getLogger(__name__)

# Create Blueprint
agents_bp = Blueprint('agents', __name__, url_prefix='/api/v1/agents')

@agents_bp.route('/status', methods=['GET'])
def agent_status():
    """Get agent system status and capabilities"""
    try:
        capabilities = get_agent_capabilities()
        return jsonify({
            'status': 'operational',
            'timestamp': datetime.now(timezone.utc).isoformat(),
            'capabilities': capabilities,
            'integration': 'LokDarpan Political Intelligence Dashboard v5.0.1'
        })
    except Exception as e:
        logger.error(f"Error getting agent status: {e}", exc_info=True)
        return jsonify({
            'status': 'error',
            'error': str(e),
            'timestamp': datetime.now(timezone.utc).isoformat()
        }), 500

@agents_bp.route('/help', methods=['GET'])
def agent_help():
    """Get available agent commands and documentation"""
    try:
        capabilities = get_agent_capabilities()
        return jsonify({
            'agent_system': 'LokDarpan Political Intelligence Framework',
            'commands': capabilities.get('commands', {}),
            'available_agents': capabilities.get('available_agents', []),
            'available_tasks': capabilities.get('available_tasks', []),
            'operational_modes': capabilities.get('operational_modes', []),
            'usage_examples': {
                'ward_analysis': '/api/v1/agents/command/analyze-ward?ward_name=Jubilee%20Hills&depth=standard',
                'strategic_briefing': '/api/v1/agents/command/strategic-brief?ward_name=Banjara%20Hills&type=executive',
                'sentiment_analysis': '/api/v1/agents/command/sentiment-pulse?ward_name=Himayatnagar'
            },
            'integration_endpoints': {
                'command_execution': '/api/v1/agents/command/{command}',
                'task_execution': '/api/v1/agents/task/{task_name}',
                'agent_delegation': '/api/v1/agents/delegate/{agent_name}'
            }
        })
    except Exception as e:
        logger.error(f"Error getting agent help: {e}", exc_info=True)
        return jsonify({'error': str(e)}), 500

@agents_bp.route('/command/<command>', methods=['GET', 'POST'])
def execute_command(command: str):
    """Execute agent commands with parameters"""
    try:
        # Get parameters from request
        if request.method == 'POST':
            parameters = request.get_json() or {}
        else:
            parameters = request.args.to_dict()
        
        logger.info(f"Executing agent command: {command} with parameters: {parameters}")
        
        # Execute command asynchronously
        result = run_async(execute_agent_command(command, parameters))
        
        return jsonify({
            'command': command,
            'parameters': parameters,
            'result': result,
            'timestamp': datetime.now(timezone.utc).isoformat(),
            'executed_by': 'LokDarpan Master Agent'
        })
        
    except Exception as e:
        logger.error(f"Error executing command {command}: {e}", exc_info=True)
        return jsonify({
            'command': command,
            'error': str(e),
            'timestamp': datetime.now(timezone.utc).isoformat()
        }), 500

@agents_bp.route('/ward-analysis/<ward_name>', methods=['GET'])
def ward_analysis(ward_name: str):
    """Convenience endpoint for ward analysis"""
    try:
        depth = request.args.get('depth', 'standard')
        parameters = {
            'ward_name': ward_name,
            'depth': depth
        }
        
        result = run_async(execute_agent_command('analyze-ward', parameters))
        
        return jsonify({
            'ward': ward_name,
            'analysis_depth': depth,
            'analysis': result,
            'timestamp': datetime.now(timezone.utc).isoformat(),
            'agent': 'LokDarpan Master'
        })
        
    except Exception as e:
        logger.error(f"Error in ward analysis for {ward_name}: {e}", exc_info=True)
        return jsonify({
            'ward': ward_name,
            'error': str(e),
            'timestamp': datetime.now(timezone.utc).isoformat()
        }), 500

@agents_bp.route('/strategic-brief/<ward_name>', methods=['GET'])
def strategic_briefing(ward_name: str):
    """Generate strategic briefing for specified ward"""
    try:
        briefing_type = request.args.get('type', 'executive')
        parameters = {
            'ward_name': ward_name,
            'type': briefing_type
        }
        
        result = run_async(execute_agent_command('strategic-brief', parameters))
        
        return jsonify({
            'ward': ward_name,
            'briefing_type': briefing_type,
            'briefing': result,
            'timestamp': datetime.now(timezone.utc).isoformat(),
            'classification': 'INTERNAL-CAMPAIGN-USE'
        })
        
    except Exception as e:
        logger.error(f"Error generating strategic brief for {ward_name}: {e}", exc_info=True)
        return jsonify({
            'ward': ward_name,
            'error': str(e),
            'timestamp': datetime.now(timezone.utc).isoformat()
        }), 500

@agents_bp.route('/sentiment-pulse/<ward_name>', methods=['GET'])
def sentiment_pulse(ward_name: str):
    """Get real-time sentiment analysis for ward"""
    try:
        parameters = {
            'ward_name': ward_name
        }
        
        result = run_async(execute_agent_command('sentiment-pulse', parameters))
        
        return jsonify({
            'ward': ward_name,
            'sentiment_pulse': result,
            'timestamp': datetime.now(timezone.utc).isoformat(),
            'analysis_type': 'real_time_political_sentiment'
        })
        
    except Exception as e:
        logger.error(f"Error getting sentiment pulse for {ward_name}: {e}", exc_info=True)
        return jsonify({
            'ward': ward_name,
            'error': str(e),
            'timestamp': datetime.now(timezone.utc).isoformat()
        }), 500

@agents_bp.route('/competitor-intel', methods=['GET', 'POST'])
def competitor_intelligence():
    """Analyze competitor positioning and strategies"""
    try:
        if request.method == 'POST':
            data = request.get_json() or {}
            party_name = data.get('party_name', 'Unknown')
            ward = data.get('ward', 'All')
        else:
            party_name = request.args.get('party_name', 'Unknown')
            ward = request.args.get('ward', 'All')
        
        parameters = {
            'party_name': party_name,
            'ward': ward
        }
        
        result = run_async(execute_agent_command('competitor-intel', parameters))
        
        return jsonify({
            'party': party_name,
            'ward_scope': ward,
            'intelligence': result,
            'timestamp': datetime.now(timezone.utc).isoformat(),
            'classification': 'COMPETITIVE-INTELLIGENCE'
        })
        
    except Exception as e:
        logger.error(f"Error getting competitor intelligence: {e}", exc_info=True)
        return jsonify({
            'error': str(e),
            'timestamp': datetime.now(timezone.utc).isoformat()
        }), 500

@agents_bp.route('/task/<task_name>', methods=['GET', 'POST'])
def execute_task(task_name: str):
    """Execute specialized political intelligence tasks"""
    try:
        # Get task parameters
        if request.method == 'POST':
            task_parameters = request.get_json() or {}
        else:
            task_parameters = request.args.to_dict()
        
        parameters = {
            'task_name': task_name,
            'parameters': task_parameters
        }
        
        result = run_async(execute_agent_command('task', parameters))
        
        return jsonify({
            'task': task_name,
            'parameters': task_parameters,
            'result': result,
            'timestamp': datetime.now(timezone.utc).isoformat(),
            'executor': 'LokDarpan Agent Framework'
        })
        
    except Exception as e:
        logger.error(f"Error executing task {task_name}: {e}", exc_info=True)
        return jsonify({
            'task': task_name,
            'error': str(e),
            'timestamp': datetime.now(timezone.utc).isoformat()
        }), 500

@agents_bp.route('/delegate/<agent_name>', methods=['GET', 'POST'])
def delegate_to_agent(agent_name: str):
    """Delegate to specialized sub-agents"""
    try:
        # Get delegation parameters
        if request.method == 'POST':
            agent_parameters = request.get_json() or {}
        else:
            agent_parameters = request.args.to_dict()
        
        parameters = {
            'agent_name': agent_name,
            'parameters': agent_parameters
        }
        
        result = run_async(execute_agent_command('agent', parameters))
        
        return jsonify({
            'delegated_agent': agent_name,
            'parameters': agent_parameters,
            'delegation_result': result,
            'timestamp': datetime.now(timezone.utc).isoformat(),
            'master_agent': 'LokDarpan Master'
        })
        
    except Exception as e:
        logger.error(f"Error delegating to agent {agent_name}: {e}", exc_info=True)
        return jsonify({
            'agent': agent_name,
            'error': str(e),
            'timestamp': datetime.now(timezone.utc).isoformat()
        }), 500

@agents_bp.route('/stream/analysis/<ward_name>', methods=['GET'])
def stream_ward_analysis(ward_name: str):
    """Stream real-time ward analysis updates"""
    try:
        def generate_analysis_stream():
            """Generator function for streaming analysis updates"""
            yield f"data: {{\"status\": \"starting\", \"ward\": \"{ward_name}\", \"timestamp\": \"{datetime.now(timezone.utc).isoformat()}\"}}\n\n"
            
            try:
                # Execute analysis
                parameters = {
                    'ward_name': ward_name,
                    'depth': request.args.get('depth', 'standard')
                }
                
                yield f"data: {{\"status\": \"analyzing\", \"stage\": \"intelligence_gathering\"}}\n\n"
                
                result = run_async(execute_agent_command('analyze-ward', parameters))
                
                yield f"data: {{\"status\": \"analyzing\", \"stage\": \"strategic_analysis\"}}\n\n"
                
                # Stream final result
                import json
                yield f"data: {json.dumps({'status': 'completed', 'result': result})}\n\n"
                
            except Exception as e:
                yield f"data: {{\"status\": \"error\", \"error\": \"{str(e)}\"}}\n\n"
        
        return Response(
            generate_analysis_stream(),
            mimetype='text/event-stream',
            headers={
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
                'Access-Control-Allow-Origin': '*'
            }
        )
        
    except Exception as e:
        logger.error(f"Error streaming analysis for {ward_name}: {e}", exc_info=True)
        return jsonify({
            'ward': ward_name,
            'error': str(e),
            'timestamp': datetime.now(timezone.utc).isoformat()
        }), 500

@agents_bp.route('/batch-analysis', methods=['POST'])
def batch_analysis():
    """Execute analysis for multiple wards"""
    try:
        data = request.get_json()
        wards = data.get('wards', [])
        depth = data.get('depth', 'standard')
        
        if not wards:
            return jsonify({'error': 'No wards specified'}), 400
        
        results = {}
        for ward in wards:
            try:
                parameters = {
                    'ward_name': ward,
                    'depth': depth
                }
                result = run_async(execute_agent_command('analyze-ward', parameters))
                results[ward] = result
            except Exception as e:
                logger.error(f"Error analyzing ward {ward}: {e}")
                results[ward] = {'error': str(e)}
        
        return jsonify({
            'batch_analysis': results,
            'total_wards': len(wards),
            'successful_analyses': len([r for r in results.values() if 'error' not in r]),
            'timestamp': datetime.now(timezone.utc).isoformat()
        })
        
    except Exception as e:
        logger.error(f"Error in batch analysis: {e}", exc_info=True)
        return jsonify({
            'error': str(e),
            'timestamp': datetime.now(timezone.utc).isoformat()
        }), 500

# Health check endpoint
@agents_bp.route('/health', methods=['GET'])
def health_check():
    """Health check for agent system"""
    try:
        # Test basic agent functionality
        capabilities = get_agent_capabilities()
        
        health_status = {
            'status': 'healthy',
            'timestamp': datetime.now(timezone.utc).isoformat(),
            'agent_framework': 'operational',
            'available_commands': len(capabilities.get('commands', {})),
            'available_agents': len(capabilities.get('available_agents', [])),
            'available_tasks': len(capabilities.get('available_tasks', [])),
            'integration': 'LokDarpan v5.0.1'
        }
        
        return jsonify(health_status)
        
    except Exception as e:
        logger.error(f"Health check failed: {e}", exc_info=True)
        return jsonify({
            'status': 'unhealthy',
            'error': str(e),
            'timestamp': datetime.now(timezone.utc).isoformat()
        }), 500

# Error handlers
@agents_bp.errorhandler(404)
def agent_not_found(error):
    """Handle agent/command not found errors"""
    return jsonify({
        'error': 'Agent endpoint not found',
        'available_endpoints': [
            '/api/v1/agents/status',
            '/api/v1/agents/help',
            '/api/v1/agents/command/{command}',
            '/api/v1/agents/ward-analysis/{ward_name}',
            '/api/v1/agents/strategic-brief/{ward_name}',
            '/api/v1/agents/sentiment-pulse/{ward_name}'
        ],
        'timestamp': datetime.now(timezone.utc).isoformat()
    }), 404

@agents_bp.errorhandler(500)
def agent_internal_error(error):
    """Handle internal agent system errors"""
    return jsonify({
        'error': 'Internal agent system error',
        'details': str(error),
        'timestamp': datetime.now(timezone.utc).isoformat(),
        'support': 'Check agent system configuration and logs'
    }), 500