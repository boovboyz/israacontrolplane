import re
from typing import List

PII_PCI_PATTERNS = {
    "EMAIL": re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}"),
    "PHONE": re.compile(r"\b\d{3}[-.]?\d{3}[-.]?\d{4}\b"),
    "SSN": re.compile(r"\b\d{3}-\d{2}-\d{4}\b"),
    # Simple CC pattern (will have false positives; in production add Luhn check)
    "CREDIT_CARD": re.compile(r"\b(?:\d[ -]*?){13,16}\b"),
}

def scan(text: str) -> List[str]:
    violations = []
    for label, pat in PII_PCI_PATTERNS.items():
        if pat.search(text):
            violations.append(label)
    return violations
