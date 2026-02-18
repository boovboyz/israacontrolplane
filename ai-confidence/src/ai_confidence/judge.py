import json
import re
from typing import Any, Dict

_JSON_RE = re.compile(r"\{.*\}", re.DOTALL)

def clamp01(x: float) -> float:
    return max(0.0, min(1.0, float(x)))

def extract_json(text: str) -> Dict[str, Any]:
    m = _JSON_RE.search(text)
    if not m:
        raise ValueError("Judge did not return JSON.")
    return json.loads(m.group(0))
