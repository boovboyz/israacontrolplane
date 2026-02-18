
import sys
import os
from pathlib import Path
import traceback

# Mimic chat.py setup
root_app_path = Path("/Users/israa/Desktop/sales-predictor-layer1/app").resolve()
print(f"Adding to sys.path: {root_app_path}")
if str(root_app_path) not in sys.path:
    sys.path.insert(0, str(root_app_path))

try:
    import llm
    print("SUCCESS: Imported llm")
except Exception:
    traceback.print_exc()

try:
    # Also verify validation
    import validation
    print("SUCCESS: Imported validation")
except Exception:
    traceback.print_exc()
