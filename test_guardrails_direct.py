import sys
import os

# Add app to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.guardrails_wrapper import get_guardrails_wrapper

def test_direct():
    wrapper = get_guardrails_wrapper()
    print("Wrapper initialized.")
    
    # Check policies
    policies = wrapper.get_policies()
    print(f"Policies: {[p['id'] for p in policies]}")
    assert len(policies) == 3
    
    # Test Safe
    res = wrapper.validate_input("Hello world")
    print(f"Safe check: {res.passed}")
    assert res.passed
    
    # Test PII
    res = wrapper.validate_input("Call me at 123-456-7890")
    print(f"PII check: {res.passed} (Msg: {res.failure_message})")
    assert res.passed 
    assert "[REDACTED]" in (res.validated_text or "")
    
    # Test Toxicity
    res = wrapper.validate_input("I hate you")
    print(f"Toxicity check: {res.passed}")
    assert res.passed 
    assert "*" in (res.validated_text or "")
    
    # Test Competitor
    res = wrapper.validate_input("CompetitorX is better")
    print(f"Competitor check: {res.passed}")
    print(f"Competitor Text: {res.validated_text}")
    print(f"Competitor Failures: {res.failures}")
    print(f"Competitor Msg: {res.failure_message}")
    print(f"Competitor Metadata: {res.metadata}")
    
    assert res.passed 

if __name__ == "__main__":
    test_direct()
