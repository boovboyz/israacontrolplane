
import sys
from pathlib import Path

# Add app to path
root_app_path = Path("/Users/israa/Desktop/sales-predictor-layer1/app").resolve()
sys.path.insert(0, str(root_app_path))

try:
    import validation
    print("SUCCESS: Imported validation")
    
    # Test cases
    cases = [
        ("   ", False, "empty/whitespace"),
        ("Hello world", True, "normal input"),
        ("A" * 25000, False, "too long"),
        ("Hello\0World", False, "null byte")
    ]
    
    for text, expected_valid, desc in cases:
        is_valid, normalized, errors = validation.validate_user_text(text)
        if is_valid == expected_valid:
            print(f"PASS: {desc} -> valid={is_valid}")
        else:
            print(f"FAIL: {desc} -> expected {expected_valid}, got {is_valid}. Errors: {errors}")
            
except Exception as e:
    print(f"FAIL: {e}")
