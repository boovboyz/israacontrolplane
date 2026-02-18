
import sys
import os
sys.path.append(os.path.join(os.getcwd(), "fulcrum-llm-ops", "backend"))
from app.mlflow_store import mlflow_store

print("Testing log_replay_run...")
try:
    run_id = mlflow_store.log_replay_run(
        source_run_id="test_run",
        model="test",
        temperature=0.7,
        prompt="test prompt",
        output_text="test output",
        latency=100,
        cost=0.01,
        confidence=0.9
    )
    print(f"Success. Run ID: {run_id}")
except Exception as e:
    import traceback
    traceback.print_exc()
