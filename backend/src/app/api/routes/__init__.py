"""
API Routes for LokDarpan

This module contains all route handlers organized by domain.
"""

# Import all blueprints for easy registration
from .main import main_bp
from .trends import trends_bp
from .pulse import pulse_bp
from .ward import ward_bp
from .epaper import bp_epaper
from .summary import summary_bp
from .multimodel import multimodel_bp

__all__ = [
    'main_bp',
    'trends_bp', 
    'pulse_bp',
    'ward_bp',
    'bp_epaper',
    'summary_bp',
    'multimodel_bp'
]