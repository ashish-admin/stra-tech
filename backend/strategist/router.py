"""
Political Strategist Router - Flask Blueprint

This file provides Flask blueprints for the Political Strategist module.
It's a stub that redirects to the enhanced implementation in app/strategist_api.py
"""

from flask import Blueprint

# Create empty blueprint - actual implementation is in app/strategist_api.py
strategist_bp = Blueprint('strategist_stub', __name__, url_prefix='/api/v1/strategist_stub')

# Note: The actual strategist endpoints are implemented in:
# - app/strategist_api.py (compatibility blueprint with enhanced AI)
# - app/multimodel_api.py (multimodel endpoints)
#
# This file exists only to prevent import errors.
# The app/__init__.py will use the compatibility blueprint instead.