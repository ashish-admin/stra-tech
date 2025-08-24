"""
Interactive Scenario Simulation Module for Wave 2

Provides conversation-based "what-if" political analysis with:
- Electoral outcome modeling
- Strategic impact assessment  
- Confidence interval calculations
- Visual feedback generation
"""

from .simulator import ScenarioSimulator, ScenarioRequest, SimulationResult

__all__ = ['ScenarioSimulator', 'ScenarioRequest', 'SimulationResult']