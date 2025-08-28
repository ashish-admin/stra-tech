"""
Strategic Guardrails and Compliance

Enforces strategic outputs, ensures internal use compliance, PII redaction, and audit trails.
"""

import json
import logging
import re
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional

logger = logging.getLogger(__name__)

# Blocked output keys - content not suitable for strategic output
BLOCK_KEYS = {
    "disclaimer", "warning", "legal_notice", "privacy_notice"
}

# Allowed strategic output categories
ALLOWED_CATEGORIES = {
    "insights", "trends", "issues", "risks", "confidence", "citations",
    "opportunities", "actions", "competitor_analysis", "strategic_overview",
    "key_intelligence", "threats", "recommended_actions", "political_context"
}

# PII patterns to redact
PII_PATTERNS = [
    (r'\b\d{4}[-\s]\d{4}[-\s]\d{4}[-\s]\d{4}\b', '[CARD_REDACTED]'),  # Card numbers
    (r'\b\d{10,12}\b', '[PHONE_REDACTED]'),  # Phone numbers
    (r'\b[A-Z]{5}\d{4}[A-Z]\b', '[PAN_REDACTED]'),  # PAN numbers
    (r'\b\d{12}\b', '[AADHAAR_REDACTED]'),  # Aadhaar numbers
    (r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b', '[EMAIL_REDACTED]')  # Email
]

# Content filters for inappropriate content
INAPPROPRIATE_PATTERNS = [
    r'\b(kill|assassinate|violence|bomb|attack)\b',
    r'\b(hate|communal|religious violence)\b',
    r'\b(fake news|misinformation|lie)\b'
]

# Compliance requirements
COMPLIANCE_REQUIREMENTS = {
    "internal_use_only": True,
    "require_human_review": ["critical_threats", "high_priority_actions"],
    "audit_logging": True,
    "content_moderation": True
}


def sanitize_and_strategize(result: Dict[str, Any]) -> Dict[str, Any]:
    """
    Sanitize AI output and ensure strategic focus.
    
    Args:
        result: Raw AI analysis result
        
    Returns:
        Sanitized strategic output compliant with guidelines
    """
    try:
        # Initialize clean output
        clean_output = {
            "internal_use_only": True,
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "compliance_version": "1.0"
        }
        
        # Filter and map strategic content
        if isinstance(result, dict):
            for key, value in result.items():
                # Skip blocked keys
                if key in BLOCK_KEYS:
                    logger.info(f"Blocked key removed: {key}")
                    continue
                
                # Include allowed strategic categories
                if key in ALLOWED_CATEGORIES:
                    clean_output[key] = _sanitize_content(value)
                else:
                    # Map unrecognized keys to strategic categories
                    mapped_key = _map_to_strategic_category(key)
                    if mapped_key:
                        clean_output[mapped_key] = _sanitize_content(value)
        
        # Ensure required strategic sections exist
        _ensure_strategic_completeness(clean_output)
        
        # Add compliance metadata
        clean_output["compliance"] = {
            "pii_redacted": True,
            "content_filtered": True,
            "strategic_focus": True,
            "audit_trail": {
                "sanitized_at": datetime.now(timezone.utc).isoformat(),
                "original_keys": list(result.keys()) if isinstance(result, dict) else [],
                "filtered_keys": [k for k in result.keys() if k in BLOCK_KEYS] if isinstance(result, dict) else []
            }
        }
        
        # Log for audit
        _log_strategic_output(clean_output)
        
        return clean_output
        
    except Exception as e:
        logger.error(f"Error in sanitization: {e}", exc_info=True)
        return _emergency_fallback_output()


def _sanitize_content(content: Any) -> Any:
    """Sanitize content for PII and inappropriate material."""
    if isinstance(content, str):
        sanitized = content
        
        # Redact PII
        for pattern, replacement in PII_PATTERNS:
            sanitized = re.sub(pattern, replacement, sanitized)
        
        # Check for inappropriate content
        for pattern in INAPPROPRIATE_PATTERNS:
            if re.search(pattern, sanitized, re.IGNORECASE):
                logger.warning(f"Inappropriate content detected and flagged")
                sanitized = "[CONTENT_FILTERED] " + sanitized
        
        return sanitized
        
    elif isinstance(content, list):
        return [_sanitize_content(item) for item in content]
        
    elif isinstance(content, dict):
        return {k: _sanitize_content(v) for k, v in content.items()}
    
    return content


def _map_to_strategic_category(key: str) -> Optional[str]:
    """Map unrecognized keys to strategic categories."""
    key_lower = key.lower()
    
    mapping = {
        'analysis': 'insights',
        'findings': 'insights',
        'recommendations': 'actions',
        'suggestions': 'actions',
        'problems': 'risks',
        'issues_found': 'risks',
        'weaknesses': 'risks',
        'strengths': 'opportunities',
        'advantages': 'opportunities',
        'summary': 'strategic_overview',
        'overview': 'strategic_overview'
    }
    
    for pattern, category in mapping.items():
        if pattern in key_lower:
            return category
    
    return None


def _ensure_strategic_completeness(output: Dict[str, Any]) -> None:
    """Ensure strategic output has required sections."""
    required_sections = {
        "insights": [],
        "risks": [],
        "actions": [],
        "opportunities": []
    }
    
    for section, default_value in required_sections.items():
        if section not in output:
            output[section] = default_value
            logger.info(f"Added missing strategic section: {section}")


def _log_strategic_output(output: Dict[str, Any]) -> None:
    """Log strategic output for audit trail."""
    try:
        audit_log = {
            "event": "strategic_output_generated",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "ward": output.get("ward", "unknown"),
            "confidence_score": output.get("confidence_score", 0),
            "action_count": len(output.get("recommended_actions", [])),
            "threat_count": len(output.get("threats", [])),
            "opportunity_count": len(output.get("opportunities", [])),
            "compliance_status": "compliant"
        }
        
        # Log at INFO level for audit trail
        logger.info(f"Strategic output audit: {json.dumps(audit_log)}")
        
    except Exception as e:
        logger.error(f"Error logging strategic output: {e}")


def _emergency_fallback_output() -> Dict[str, Any]:
    """Emergency fallback when sanitization fails."""
    return {
        "internal_use_only": True,
        "error": "Strategic analysis temporarily unavailable",
        "fallback_mode": True,
        "insights": [],
        "risks": ["System analysis unavailable - manual review required"],
        "actions": [
            {
                "category": "immediate",
                "description": "Conduct manual strategic review",
                "timeline": "immediate",
                "priority": 1
            }
        ],
        "opportunities": [],
        "confidence_score": 0.0,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "compliance": {
            "emergency_fallback": True,
            "manual_review_required": True
        }
    }


def validate_strategic_output(output: Dict[str, Any]) -> Dict[str, Any]:
    """
    Validate strategic output meets quality and compliance standards.
    
    Args:
        output: Strategic analysis output
        
    Returns:
        Validation results with pass/fail status
    """
    validation = {
        "passed": True,
        "warnings": [],
        "errors": [],
        "compliance_check": True
    }
    
    try:
        # Check required fields
        required_fields = ["insights", "risks", "actions", "confidence_score"]
        for field in required_fields:
            if field not in output:
                validation["errors"].append(f"Missing required field: {field}")
                validation["passed"] = False
        
        # Check confidence score
        confidence = output.get("confidence_score", 0)
        if confidence < 0.3:
            validation["warnings"].append("Low confidence score - manual review recommended")
        
        # Check action quality
        actions = output.get("recommended_actions", [])
        if not actions:
            validation["warnings"].append("No recommended actions provided")
        
        for action in actions:
            if not action.get("timeline") or not action.get("description"):
                validation["errors"].append("Action missing required fields")
                validation["passed"] = False
        
        # Check internal use compliance
        if not output.get("internal_use_only"):
            validation["errors"].append("Missing internal use compliance flag")
            validation["passed"] = False
        
        return validation
        
    except Exception as e:
        logger.error(f"Error validating strategic output: {e}")
        return {
            "passed": False,
            "errors": [f"Validation error: {e}"],
            "warnings": [],
            "compliance_check": False
        }