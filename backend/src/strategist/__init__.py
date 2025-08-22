"""
Political Strategist Module

AI-powered strategic analysis system for political intelligence gathering
and strategic decision support.
"""

from .api.router import strategist_bp
from .core.analysis.service import StrategistService

__all__ = ['strategist_bp', 'StrategistService']