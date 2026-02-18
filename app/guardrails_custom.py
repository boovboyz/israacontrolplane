from guardrails.validator_base import (
    FailResult,
    PassResult,
    ValidationResult,
    Validator,
    register_validator,
)
from typing import Any, Dict, List, Optional
import re

@register_validator(name="custom/detect_pii", data_type="string")
class DetectPII(Validator):
    """Detects PII using regex and fails if found."""

    def __init__(
        self,
        pii_entities: List[str] = None, # generic arg, ignored in simple regex
        on_fail: Optional[str] = None,
    ):
        super().__init__(on_fail=on_fail)
        # Regex for email and phone
        self._regex = r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b|\b\d{3}[-.]?\d{3}[-.]?\d{4}\b"

    def validate(self, value: Any, metadata: Dict) -> ValidationResult:
        p = re.compile(self._regex)
        match = p.search(value)
        if match:
            found = match.group()
            return FailResult(
                error_message=f"Found PII: {found}",
                fix_value=value.replace(found, "[REDACTED]"),
            )
        return PassResult()


@register_validator(name="custom/toxic_language", data_type="string")
class ToxicLanguage(Validator):
    """Simple toxicity validator using a blocklist."""

    def __init__(
        self,
        validation_method: str = "sentence",
        threshold: float = 0.5,
        on_fail: Optional[str] = None,
    ):
        super().__init__(on_fail=on_fail, validation_method=validation_method, threshold=threshold)
        self._blocklist = ["hate", "kill", "shut up", "idiot", "stupid"]

    def validate(self, value: Any, metadata: Dict) -> ValidationResult:
        lower_val = value.lower()
        for word in self._blocklist:
            if word in lower_val:
                return FailResult(
                    error_message=f"Found toxic language: {word}",
                    fix_value=value.replace(word, "*" * len(word)),
                )
        return PassResult()

@register_validator(name="custom/competitor_check", data_type="string")
class CompetitorCheck(Validator):
    def __init__(self, competitors: List[str], on_fail: str = None):
        super().__init__(on_fail=on_fail, competitors=competitors)
        self.competitors = competitors

    def validate(self, value: Any, metadata: Dict) -> ValidationResult:
        found = []
        for comp in self.competitors:
            if comp.lower() in value.lower():
                found.append(comp)
        
        if found:
            return FailResult(
                error_message=f"Found competitors: {', '.join(found)}",
                fix_value=value
            )
        return PassResult()
