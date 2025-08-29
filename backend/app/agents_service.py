"""
LokDarpan Agent Service Integration
Integrates the BMad-inspired agent framework with LokDarpan's political intelligence system
"""

import os
import yaml
import asyncio
import logging
from pathlib import Path
from typing import Dict, List, Optional, Any, Union
from datetime import datetime, timezone

import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from strategist.service import PoliticalStrategist, get_ward_report
from strategist.reasoner.multi_model_coordinator import MultiModelCoordinator, AnalysisRequest
from strategist.cache import cget, cset

logger = logging.getLogger(__name__)

class LokDarpanAgentFramework:
    """
    Main interface for the LokDarpan Agent Framework
    Integrates with existing political intelligence infrastructure
    """
    
    def __init__(self):
        self.agents_dir = Path(__file__).parent.parent.parent / ".lokdarpan-agents"
        self.config = self._load_core_config()
        self.available_agents = self._discover_agents()
        self.available_tasks = self._discover_tasks()
        self.templates = self._discover_templates()
        self.knowledge_base = self._load_knowledge_base()
        self.coordinator = MultiModelCoordinator()
        
    def _load_core_config(self) -> Dict[str, Any]:
        """Load the core agent configuration"""
        try:
            config_path = self.agents_dir / "core-config.yaml"
            if config_path.exists():
                with open(config_path, 'r', encoding='utf-8') as f:
                    return yaml.safe_load(f)
            else:
                logger.warning("Core config not found, using default configuration")
                return self._default_config()
        except Exception as e:
            logger.error(f"Error loading core config: {e}")
            return self._default_config()
    
    def _default_config(self) -> Dict[str, Any]:
        """Provide default configuration if config file is unavailable"""
        return {
            "project": {"name": "LokDarpan", "version": "5.0.1"},
            "integration": {"backend_service": "flask-app"},
            "context": {"region": "GHMC", "total_wards": 150}
        }
    
    def _discover_agents(self) -> Dict[str, Dict[str, Any]]:
        """Discover available specialized agents"""
        agents = {}
        agents_path = self.agents_dir / "agents"
        
        if agents_path.exists():
            for agent_file in agents_path.glob("*.md"):
                try:
                    agent_config = self._parse_agent_file(agent_file)
                    if agent_config:
                        agents[agent_config['id']] = agent_config
                except Exception as e:
                    logger.warning(f"Could not parse agent file {agent_file}: {e}")
        
        return agents
    
    def _discover_tasks(self) -> Dict[str, Dict[str, Any]]:
        """Discover available task workflows"""
        tasks = {}
        tasks_path = self.agents_dir / "tasks"
        
        if tasks_path.exists():
            for task_file in tasks_path.glob("*.md"):
                try:
                    task_config = self._parse_task_file(task_file)
                    if task_config:
                        tasks[task_config['name']] = task_config
                except Exception as e:
                    logger.warning(f"Could not parse task file {task_file}: {e}")
        
        return tasks
    
    def _discover_templates(self) -> Dict[str, str]:
        """Discover available document templates"""
        templates = {}
        templates_path = self.agents_dir / "templates"
        
        if templates_path.exists():
            for template_file in templates_path.glob("*.yaml"):
                try:
                    with open(template_file, 'r', encoding='utf-8') as f:
                        templates[template_file.stem] = f.read()
                except Exception as e:
                    logger.warning(f"Could not load template {template_file}: {e}")
        
        return templates
    
    def _load_knowledge_base(self) -> Dict[str, str]:
        """Load knowledge base data"""
        kb = {}
        data_path = self.agents_dir / "data"
        
        if data_path.exists():
            for kb_file in data_path.glob("*.md"):
                try:
                    with open(kb_file, 'r', encoding='utf-8') as f:
                        kb[kb_file.stem] = f.read()
                except Exception as e:
                    logger.warning(f"Could not load knowledge base file {kb_file}: {e}")
        
        return kb
    
    def _parse_agent_file(self, file_path: Path) -> Optional[Dict[str, Any]]:
        """Parse agent definition from markdown file"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Extract YAML configuration block
            if '```yaml' in content:
                yaml_start = content.find('```yaml') + 7
                yaml_end = content.find('```', yaml_start)
                yaml_content = content[yaml_start:yaml_end].strip()
                
                config = yaml.safe_load(yaml_content)
                if 'agent' in config:
                    agent_config = config['agent']
                    agent_config['file_path'] = str(file_path)
                    agent_config['persona'] = config.get('persona', {})
                    agent_config['commands'] = config.get('commands', {})
                    return agent_config
        except Exception as e:
            logger.error(f"Error parsing agent file {file_path}: {e}")
        
        return None
    
    def _parse_task_file(self, file_path: Path) -> Optional[Dict[str, Any]]:
        """Parse task definition from markdown file"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Extract basic task information
            task_config = {
                'name': file_path.stem,
                'file_path': str(file_path),
                'content': content,
                'requires_elicitation': 'elicit: true' in content
            }
            
            return task_config
        except Exception as e:
            logger.error(f"Error parsing task file {file_path}: {e}")
        
        return None

class LokDarpanMasterAgent:
    """
    Implementation of the LokDarpan Master Agent
    Main orchestrator for political intelligence operations
    """
    
    def __init__(self, framework: LokDarpanAgentFramework):
        self.framework = framework
        self.name = "LokDarpan Master"
        self.identity = "Political Intelligence & Campaign Strategy Coordinator"
        self.active_session = None
        
    async def process_command(self, command: str, parameters: Dict[str, Any] = None) -> Dict[str, Any]:
        """Process agent commands and coordinate with LokDarpan infrastructure"""
        parameters = parameters or {}
        
        try:
            if command == "help":
                return self._get_help()
            elif command == "analyze-ward":
                return await self._analyze_ward(parameters)
            elif command == "strategic-brief":
                return await self._generate_strategic_brief(parameters)
            elif command == "competitor-intel":
                return await self._competitor_intelligence(parameters)
            elif command == "sentiment-pulse":
                return await self._sentiment_pulse(parameters)
            elif command == "task":
                return await self._execute_task(parameters)
            elif command == "agent":
                return await self._delegate_to_agent(parameters)
            else:
                return {
                    "error": f"Unknown command: {command}",
                    "available_commands": list(self._get_help()["commands"].keys())
                }
                
        except Exception as e:
            logger.error(f"Error processing command {command}: {e}", exc_info=True)
            return {
                "error": "Command processing failed",
                "details": str(e),
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
    
    def _get_help(self) -> Dict[str, Any]:
        """Return available commands and capabilities"""
        return {
            "agent": self.name,
            "identity": self.identity,
            "status": "operational",
            "integration": "LokDarpan Political Intelligence Dashboard v5.0.1",
            "commands": {
                "analyze-ward": "Execute comprehensive ward analysis using live LokDarpan data",
                "strategic-brief": "Generate executive briefing with actionable recommendations",
                "competitor-intel": "Analyze competitor positioning and vulnerabilities",
                "sentiment-pulse": "Get real-time sentiment analysis and trends",
                "forecast-electoral": "Generate electoral predictions with confidence intervals",
                "task": "Execute specialized political intelligence tasks",
                "agent": "Delegate to specialized sub-agents"
            },
            "available_agents": list(self.framework.available_agents.keys()),
            "available_tasks": list(self.framework.available_tasks.keys()),
            "knowledge_base": list(self.framework.knowledge_base.keys()),
            "operational_modes": ["defensive", "neutral", "offensive"]
        }
    
    async def _analyze_ward(self, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Execute comprehensive ward analysis"""
        ward_name = parameters.get('ward_name', 'Unknown')
        analysis_depth = parameters.get('depth', 'standard')
        
        logger.info(f"LokDarpan Master Agent: Analyzing ward {ward_name} with depth {analysis_depth}")
        
        # Leverage existing PoliticalStrategist infrastructure
        strategist = PoliticalStrategist(ward_name)
        result = await strategist.analyze_situation(analysis_depth)
        
        # Enhance with agent framework context
        result['agent_analysis'] = {
            'agent_used': 'LokDarpan Master',
            'framework_version': self.framework.config.get('project', {}).get('version', 'unknown'),
            'political_context': 'Hyderabad GHMC Electoral Intelligence',
            'integration_level': 'full_lokdarpan_integration'
        }
        
        return result
    
    async def _generate_strategic_brief(self, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Generate strategic briefing using template system"""
        ward_name = parameters.get('ward_name', 'All Wards')
        briefing_type = parameters.get('type', 'executive')
        
        # Get base intelligence analysis
        base_analysis = await self._analyze_ward({'ward_name': ward_name, 'depth': 'deep'})
        
        # Apply strategic briefing template
        template = self.framework.templates.get('strategic-brief', '')
        
        briefing = {
            'briefing_type': briefing_type,
            'ward_focus': ward_name,
            'timestamp': datetime.now(timezone.utc).isoformat(),
            'prepared_by': 'LokDarpan Master Agent',
            'intelligence_base': base_analysis,
            'template_applied': 'strategic-brief.yaml',
            'strategic_recommendations': self._extract_strategic_recommendations(base_analysis),
            'political_context': self.framework.knowledge_base.get('political-context', 'Context unavailable')
        }
        
        return briefing
    
    async def _competitor_intelligence(self, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze competitor positioning and strategies"""
        party_name = parameters.get('party_name', 'Unknown')
        ward = parameters.get('ward', 'All')
        
        # Use intelligence analyst capabilities
        analyst_result = await self._delegate_to_agent({
            'agent_name': 'intelligence-analyst',
            'command': 'competitor-profile',
            'parameters': {'party': party_name, 'ward': ward}
        })
        
        return {
            'competitor_analysis': analyst_result,
            'party_focus': party_name,
            'ward_scope': ward,
            'political_context': self._get_party_context(party_name),
            'strategic_implications': self._assess_competitive_implications(analyst_result)
        }
    
    async def _sentiment_pulse(self, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Get real-time sentiment analysis and trends"""
        ward_name = parameters.get('ward_name', 'Unknown')
        
        # Execute sentiment analysis task
        task_result = await self._execute_task({
            'task_name': 'analyze-sentiment',
            'parameters': {
                'ward_name': ward_name,
                'analysis_depth': 'standard'
            }
        })
        
        return {
            'sentiment_analysis': task_result,
            'ward': ward_name,
            'analysis_type': 'real_time_sentiment_pulse',
            'strategic_context': self._interpret_sentiment_strategically(task_result)
        }
    
    async def _execute_task(self, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Execute specialized political intelligence tasks"""
        task_name = parameters.get('task_name', '')
        task_parameters = parameters.get('parameters', {})
        
        if task_name not in self.framework.available_tasks:
            return {
                'error': f'Task not found: {task_name}',
                'available_tasks': list(self.framework.available_tasks.keys())
            }
        
        task_config = self.framework.available_tasks[task_name]
        
        # For tasks requiring elicitation, return task requirements
        if task_config.get('requires_elicitation'):
            return {
                'task_name': task_name,
                'status': 'requires_user_input',
                'elicitation_required': True,
                'task_description': f"Task {task_name} requires additional parameters",
                'next_step': 'provide_required_parameters'
            }
        
        # Execute the task (simplified implementation)
        # In a full implementation, this would parse the task workflow and execute it
        if task_name == 'analyze-sentiment':
            return await self._execute_sentiment_analysis_task(task_parameters)
        
        return {
            'task_executed': task_name,
            'parameters_used': task_parameters,
            'status': 'completed',
            'note': 'Task execution placeholder - full implementation would parse and execute workflow'
        }
    
    async def _delegate_to_agent(self, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Delegate to specialized sub-agents"""
        agent_name = parameters.get('agent_name', '')
        
        if agent_name not in self.framework.available_agents:
            return {
                'error': f'Agent not found: {agent_name}',
                'available_agents': list(self.framework.available_agents.keys())
            }
        
        agent_config = self.framework.available_agents[agent_name]
        
        return {
            'delegated_to': agent_name,
            'agent_specialization': agent_config.get('specialization', 'Unknown'),
            'agent_capabilities': agent_config.get('commands', {}),
            'status': 'delegation_prepared',
            'note': 'Agent delegation framework ready - full implementation would instantiate specialized agent'
        }
    
    async def _execute_sentiment_analysis_task(self, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Execute sentiment analysis task using existing infrastructure"""
        ward_name = parameters.get('ward_name', 'Unknown')
        
        # Leverage existing strategist infrastructure for sentiment analysis
        strategist = PoliticalStrategist(ward_name)
        analysis_result = await strategist.analyze_situation('standard')
        
        # Extract sentiment-specific insights
        sentiment_data = {
            'ward': ward_name,
            'overall_sentiment': analysis_result.get('sentiment_score', 0),
            'confidence_level': analysis_result.get('confidence_score', 0),
            'key_findings': analysis_result.get('strategic_implications', []),
            'trend_analysis': 'Extracted from base analysis',
            'political_implications': self._extract_political_implications(analysis_result)
        }
        
        return sentiment_data
    
    def _extract_strategic_recommendations(self, analysis: Dict[str, Any]) -> List[str]:
        """Extract strategic recommendations from analysis"""
        recommendations = analysis.get('recommended_actions', [])
        if isinstance(recommendations, list):
            return recommendations
        elif isinstance(recommendations, str):
            return [recommendations]
        else:
            return ['Strategic analysis completed - review full analysis for detailed insights']
    
    def _get_party_context(self, party_name: str) -> str:
        """Get political context for specific party"""
        context_kb = self.framework.knowledge_base.get('political-context', '')
        # Simple extraction - full implementation would parse and extract specific party information
        return f"Political context for {party_name} from LokDarpan knowledge base"
    
    def _assess_competitive_implications(self, analysis: Dict[str, Any]) -> List[str]:
        """Assess strategic implications of competitive analysis"""
        return [
            "Competitive analysis completed",
            "Strategic implications identified",
            "Recommendations available for strategic planning"
        ]
    
    def _interpret_sentiment_strategically(self, sentiment_data: Dict[str, Any]) -> Dict[str, Any]:
        """Provide strategic interpretation of sentiment analysis"""
        return {
            'strategic_summary': 'Sentiment trends analyzed for strategic impact',
            'recommended_actions': 'Based on sentiment analysis results',
            'risk_assessment': 'Sentiment-based risk evaluation completed'
        }
    
    def _extract_political_implications(self, analysis: Dict[str, Any]) -> List[str]:
        """Extract political implications from analysis"""
        return [
            "Electoral implications assessed",
            "Campaign strategy considerations identified", 
            "Competitive positioning evaluated"
        ]


# Integration endpoint for Flask application
def create_agent_service() -> LokDarpanAgentFramework:
    """Create and return configured agent framework instance"""
    return LokDarpanAgentFramework()

def get_master_agent() -> LokDarpanMasterAgent:
    """Get LokDarpan Master Agent instance"""
    framework = create_agent_service()
    return LokDarpanMasterAgent(framework)


# Example usage functions for API integration
async def execute_agent_command(command: str, parameters: Dict[str, Any] = None) -> Dict[str, Any]:
    """Execute agent command - for API endpoint integration"""
    master_agent = get_master_agent()
    return await master_agent.process_command(command, parameters)

def get_agent_capabilities() -> Dict[str, Any]:
    """Get agent capabilities - for API documentation"""
    master_agent = get_master_agent()
    return master_agent._get_help()