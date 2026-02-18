import sys
from pathlib import Path
import traceback

root_path = Path.cwd()
sys.path.append(str(root_path))

modules = [
    "app.observability",
    "app.llm",
    "app.retrieve",
    "app.prompt_builder",
    "app.ingest",
    "app.guardrails_wrapper"
]

for mod in modules:
    print(f"Importing {mod}...")
    try:
        __import__(mod)
        print(f"✅ {mod} success")
    except Exception:
        print(f"❌ {mod} failed")
        traceback.print_exc()
