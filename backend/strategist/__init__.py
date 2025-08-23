"""
Political Strategist Module

AI-powered strategic intelligence system for LokDarpan.
Provides real-time political analysis, opportunity detection, and strategic recommendations.
"""

from .service import PoliticalStrategist, get_ward_report, analyze_text

__version__ = "1.0.0"
__all__ = ["PoliticalStrategist", "get_ward_report", "analyze_text"]