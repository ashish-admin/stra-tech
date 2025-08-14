# backend/app/utils/ward.py
import re

_WARD_PREFIX = re.compile(r"(?i)^\s*ward\s*no\.?\s*\d+\s*")
_WARD_NUM    = re.compile(r"(?i)^\s*ward\s*\d+\s*")
_WARD_INT    = re.compile(r"^\s*\d+\s*[-–]?\s*")
_WS          = re.compile(r"\s+")

def normalize_ward(label: str) -> str:
    """
    Normalize real-world GHMC ward labels to a comparable key.
    Examples:
      "Ward 95 Jubilee Hills" -> "Jubilee Hills"
      "95 - Jubilee Hills"    -> "Jubilee Hills"
      "Jubilee   Hills"       -> "Jubilee Hills"
    """
    if not label:
        return ""
    s = str(label)
    s = _WARD_PREFIX.sub("", s)
    s = _WARD_NUM.sub("", s)
    s = _WARD_INT.sub("", s)
    s = _WS.sub(" ", s).strip()
    return s
