
import sys
import os
from pathlib import Path

# Add app to path
root_app_path = Path("/Users/israa/Desktop/sales-predictor-layer1/app").resolve()
sys.path.insert(0, str(root_app_path))
sys.path.insert(0, str(root_app_path.parent)) # For module resolution

try:
    import guardrails_wrapper
    print("SUCCESS: Imported guardrails_wrapper")
    
    gw = guardrails_wrapper.get_guardrails_wrapper()
    print(f"Wrapper Available: {gw.available}")
    
    text = "shutup idiot"
    print(f"Testing input: '{text}'")
    
    # Call module-level function
    result = guardrails_wrapper.check_input(text)
    print(f"Result Passed: {result.passed}")
    print(f"Failures: {result.failures}")
    print(f"Failure Message: {result.failure_message}")
    print(f"Validated Text: '{result.validated_text}'")
    print(f"Metadata: {result.metadata}")
    
    # Check if custom validator logic works standalone
    from guardrails_custom import ToxicLanguage
    v = ToxicLanguage()
    res = v.validate(text, {})
    print(f"Standalone Validator Result: {res}")

except Exception as e:
    import traceback
    traceback.print_exc()
