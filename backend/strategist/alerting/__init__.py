"""
Enhanced Contextual Alerting Module for Wave 2

Provides conversation-aware intelligent alerting with:
- Strategic priority scoring
- Real-time political event correlation  
- Campaign objective alignment
- Automated action recommendation integration
"""

from .enhanced_alerting import (
    EnhancedAlertingEngine, 
    AlertContext, 
    StrategicAlert,
    AlertPriority,
    AlertCategory
)

__all__ = [
    'EnhancedAlertingEngine',
    'AlertContext', 
    'StrategicAlert',
    'AlertPriority',
    'AlertCategory'
]