"""
Background Tasks

This package contains all Celery task definitions organized by domain.
"""

# Import task modules for registration
from .content import epaper_ingestion, legacy_epaper
from .ai import embeddings, summary_generation  
from .electoral import form20_processing

__all__ = [
    'epaper_ingestion',
    'legacy_epaper', 
    'embeddings',
    'summary_generation',
    'form20_processing'
]