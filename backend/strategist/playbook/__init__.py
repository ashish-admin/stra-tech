"""
Communications Playbook Module for Wave 2

Provides dynamic political communications playbook generation with:
- AI-powered template creation
- Multilingual messaging strategies
- Opposition response automation
- Conversation-aware customization
"""

from .generator import PlaybookGenerator, PlaybookType, PlaybookTemplate

__all__ = ['PlaybookGenerator', 'PlaybookType', 'PlaybookTemplate']