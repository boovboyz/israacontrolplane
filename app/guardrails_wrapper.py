"""
Guardrails AI wrapper module.

Provides unified validation interface that combines:
1. Guardrails AI validators (Input/Output)
2. Policy management and stats tracking
"""

from typing import Optional, Any, Dict, List
from dataclasses import dataclass
from enum import Enum
import os
import sys

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import Guardrails
try:
    from guardrails import Guard
    from guardrails.hub import DetectPII, ToxicLanguage, CompetitorCheck
except ImportError:
    # Use custom validators if Hub not available/configured
    print("Guardrails Hub validators not found, using custom implementations.")
    from app.guardrails_custom import DetectPII, ToxicLanguage, CompetitorCheck


@dataclass
class ValidationResult:
    """Structured validation result."""
    passed: bool
    failures: List[str]  # List of failed validator names
    validated_text: Optional[str] = None
    failure_message: Optional[str] = None
    metadata: Dict[str, Any] = None
    
    @property
    def failed(self) -> bool:
        return not self.passed
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "passed": self.passed,
            "failures": self.failures,
            "validated_text": self.validated_text,
            "failure_message": self.failure_message,
            "metadata": self.metadata or {}
        }


class GuardrailsWrapper:
    """Wrapper for Guardrails AI validation."""
    
    def __init__(self):
        """Initialize Guardrails wrapper with validators."""
        self.available = True
        self.modules = {}
        
        # Stats tracking
        self.stats = {
            "pii": {"violations": 0, "status": "active"},
            "toxicity": {"violations": 0, "status": "active"},
            "competitors": {"violations": 0, "status": "monitor"}
        }

        try:
            # --- INPUT GUARD ---
            self.input_guard = Guard().use_many(
                DetectPII(on_fail="exception"), 
                ToxicLanguage(threshold=0.5, on_fail="exception"),
                CompetitorCheck(competitors=["CompetitorX", "BadCo"], on_fail="exception")
            )
            
            # --- OUTPUT GUARD ---
            # Ensure output is clean too (keep fix for output to attempt salvage)
            self.output_guard = Guard().use_many(
                ToxicLanguage(threshold=0.5, on_fail="fix")
            )
            
            print("Guardrails AI initialized with custom validators.")
            
        except Exception as e:
            print(f"Guardrails AI initialization failed: {e}")
            self.available = False
    
    def get_policies(self):
        """Return current policy stats for UI."""
        return [
            # ... (omitted for brevity, keep existing) ...
            {
                "id": "pii",
                "name": "PII Redaction",
                "description": "Detects emails and phone numbers",
                "type": "pii",
                "status": self.stats["pii"]["status"],
                "violations_24h": self.stats["pii"]["violations"]
            },
            {
                "id": "toxicity",
                "name": "Toxicity Filter",
                "description": "Blocks toxic language",
                "type": "toxicity",
                "status": self.stats["toxicity"]["status"],
                "violations_24h": self.stats["toxicity"]["violations"]
            },
            {
                "id": "competitors",
                "name": "Competitor Check",
                "description": "Monitors competitor mentions",
                "type": "topic",
                "status": self.stats["competitors"]["status"],
                "violations_24h": self.stats["competitors"]["violations"]
            }
        ]

    def validate_input(self, text: str) -> ValidationResult:
        """Validate user input against guardrails."""
        if not self.available:
            return ValidationResult(passed=True, failures=[], validated_text=text, metadata={"fallback": True})
        
        try:
            # Run Guardrails
            # With on_fail="exception", this raises ValidationError on failure
            result = self.input_guard.validate(text)
            
            return ValidationResult(
                passed=True,
                failures=[],
                validated_text=result.validated_output or text,
                metadata={"guardrails_ai": "passed"}
            )
                
        except Exception as e:
            # Check if it's a Guardrails validation error
            # Simplest is to just treat exception as failure
            # Try to parse the message if possible
            err_msg = str(e)
            failure_type = "validation_error"
            
            if "Found toxic language" in err_msg:
                self.stats["toxicity"]["violations"] += 1
                failure_type = "ToxicLanguage"
            elif "Found PII" in err_msg:
                self.stats["pii"]["violations"] += 1
                failure_type = "DetectPII"
            elif "Found competitors" in err_msg:
                self.stats["competitors"]["violations"] += 1
                failure_type = "CompetitorCheck"
                
            return ValidationResult(
                passed=False,
                failures=[failure_type],
                validated_text=text,
                failure_message=err_msg,
                metadata={"error": err_msg}
            )
                


    def validate_output(self, text: str, schema: Optional[Any] = None) -> ValidationResult:
        """Validate LLM output."""
        if not self.available:
            return ValidationResult(passed=True, failures=[], validated_text=text)
        
        try:
            result = self.output_guard.validate(text)
            validated_text = result.validated_output if result.validated_output is not None else text
            
            if result.validation_passed:
                 return ValidationResult(passed=True, failures=[], validated_text=validated_text)
            
            failures = [f.validator_name for f in getattr(result, "validation_summaries", [])]
            msgs = [getattr(f, "error_message", getattr(f, "msg", str(f))) for f in getattr(result, "validation_summaries", [])]
            
            return ValidationResult(
                passed=False,
                failures=failures,
                validated_text=validated_text,
                failure_message="; ".join(msgs)
            )
        except Exception as e:
            return ValidationResult(passed=False, failures=["exception"], validated_text=text, failure_message=str(e))


# Singleton instance
_wrapper_instance = None

def get_guardrails_wrapper() -> GuardrailsWrapper:
    """Get singleton instance of GuardrailsWrapper."""
    global _wrapper_instance
    if _wrapper_instance is None:
        _wrapper_instance = GuardrailsWrapper()
    return _wrapper_instance


# Convenience functions
def validate_input(text: str) -> ValidationResult:
    """Validate user input."""
    return get_guardrails_wrapper().validate_input(text)


def validate_output(text: str, schema: Optional[Any] = None) -> ValidationResult:
    """Validate LLM output."""
    return get_guardrails_wrapper().validate_output(text, schema)


def check_input(text: str, ctx: Dict[str, Any] = None) -> ValidationResult:
    """
    Policy check for user input.
    Use this for early rejection of unsafe content.
    """
    # We could use ctx to select different guards (e.g. strict mode)
    # For now, map to standard validate_input
    return validate_input(text)
