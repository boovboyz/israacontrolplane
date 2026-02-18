import sys
from pathlib import Path
import traceback

# Setup paths
root_path = Path.cwd()
sys.path.append(str(root_path))

print("Attempting to import app.llm...")
try:
    from app import llm
    print("✅ Successfully imported app.llm")
except Exception:
    print("❌ Failed to import app.llm")
    traceback.print_exc()

print("\nAttempting to init ContentGenerator...")
try:
    from app.llm import ContentGenerator
    gen = ContentGenerator()
    print("✅ Successfully initialized ContentGenerator")
except Exception:
    print("❌ Failed to init ContentGenerator")
    traceback.print_exc()
