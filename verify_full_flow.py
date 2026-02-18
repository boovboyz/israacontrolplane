
import os
import requests
import time
import sys
from app.llm import ContentGenerator

# Configuration
BACKEND_URL = "http://localhost:8000"
sys.path.append(os.getcwd())

def verify_full_flow():
    print("=== STARTING END-TO-END VERIFICATION ===")

    # 1. Layer 1: Create a Run
    print("\n[Step 1] Creating Layer 1 Run (Mocking Streamlit)...")
    gen = ContentGenerator()
    packet = "End-to-end test packet."
    
    # We rely on existing logic in llm.py
    response, run_id = gen.generate_response(
        packet=packet,
        retrieval_context=[{"source": "test.txt", "content": "Sample"}],
        model="gpt-4-test",
        user_question="Is the system working?",
        top_k=1
    )
    print(f"   -> Layer 1 Run ID: {run_id}")
    if not run_id:
        raise Exception("Layer 1 failed to return Run ID")

    # 2. Layer 2: Fetch Run from Backend
    print(f"\n[Step 2] Fetching Run {run_id} from Backend...")
    retry = 0
    run_data = None
    while retry < 3:
        try:
            r = requests.get(f"{BACKEND_URL}/runs/{run_id}")
            if r.status_code == 200:
                run_data = r.json()
                break
        except:
            pass
        time.sleep(1)
        retry += 1
    
    if not run_data:
        raise Exception("Backend failed to return run data (Check if Server is running)")
    
    print("   -> Run Data Retrieved.")
    # Verify artifacts list presence
    artifacts = run_data.get("artifacts", [])
    print(f"   -> Artifacts Found: {len(artifacts)} ({[a['name'] for a in artifacts]})")
    if len(artifacts) < 3:
        print("WAARNING: Expected at least 3 artifacts (prompt, response, sources)")

    # 3. Layer 3: Replay
    print("\n[Step 3] Executing Replay...")
    replay_payload = {
        "source_run_id": run_id,
        "model": "mock-llm",
        "temperature": 0.5,
        "prompt": "Modified prompt for replay"
    }
    r = requests.post(f"{BACKEND_URL}/replay", json=replay_payload)
    if r.status_code != 200:
        print(f"FAILED: {r.text}")
        raise Exception("Replay failed")
    
    replay_data = r.json()
    new_run_id = replay_data["new_run_id"]
    print(f"   -> Replay Run ID: {new_run_id}")

    # 4. Layer 3: Evaluation
    print(f"\n[Step 4] Submitting Evaluation for {new_run_id}...")
    eval_payload = {
        "run_id": new_run_id,
        "rating": 5,
        "label": "thumbs_up",
        "comment": "Nice replay"
    }
    r = requests.post(f"{BACKEND_URL}/evaluations", json=eval_payload)
    if r.status_code != 200:
        print(f"FAILED: {r.text}")
        raise Exception("Evaluation failed")
    print("   -> Evaluation Saved.")

    # 5. Layer 3: Compare
    print(f"\n[Step 5] Comparing {run_id} vs {new_run_id}...")
    r = requests.get(f"{BACKEND_URL}/compare", params={"run_ids": f"{run_id},{new_run_id}"})
    if r.status_code != 200:
        print(f"FAILED: {r.text}")
        raise Exception("Compare failed")
    
    compare_data = r.json()
    print(f"   -> Comparison successful. Runs returned: {len(compare_data['runs'])}")
    if len(compare_data["runs"]) != 2:
        raise Exception("Compare returned wrong number of runs")

    # 6. Metrics
    print("\n[Step 6] Checking Metrics Summary...")
    r = requests.get(f"{BACKEND_URL}/metrics/summary")
    if r.status_code != 200:
         raise Exception("Metrics failed")
    metrics = r.json()
    print(f"   -> Total Runs: {metrics['total_runs']}")

    print("\n=== VERIFICATION SUCCESSFUL ===")

if __name__ == "__main__":
    verify_full_flow()
