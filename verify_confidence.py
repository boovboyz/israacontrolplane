import sys
import os
import time
import requests
import uuid

# Add app to path
try:
    from app.client import FulcrumClient
except ImportError:
    sys.path.append(os.path.join(os.path.dirname(__file__), "app"))
    from client import FulcrumClient

API_URL = "http://localhost:8000"
API_KEY = "dev-key-123"

def verify_confidence():
    print("🧠 Verifying Confidence Score V0...")
    
    client = FulcrumClient(api_url=API_URL, api_key=API_KEY)
    
    # Test 1: Perfect Run
    print("\n[1/3] Testing 'High Confidence' Run...")
    with client.run(user_id="test", session_id="conf_test", model="test", run_name="High Conf") as run:
        run.log_input("Prompt...")
        time.sleep(0.1)
        run.log_output("Response...", parsed_json={"outcome": 100})
        # Mock retrieval artifact
        run.log_artifact("retrieved_sources.json", "[{}]", "json")
        
    # Validation
    resp = requests.get(f"{API_URL}/runs/{run.run_id}")
    if resp.status_code != 200:
        print(f"❌ Failed to get run: {resp.status_code} - {resp.text}")
        return
    info = resp.json()
    score = info.get("confidence")
    label = info.get("confidence_label")
    print(f"   Score: {score}, Label: {label}")
    
    if score >= 0.9:
        print("✅ Correctly scored HIGH")
    else:
        print(f"❌ Expected HIGH, got {score}")

    # Test 2: Poor Run (No retrieval, no parse)
    print("\n[2/3] Testing 'Low Confidence' Run...")
    with client.run(user_id="test", session_id="conf_test", model="test", run_name="Low Conf") as run:
        run.log_input("Prompt...")
        run.log_output("Response... (no json)")
        # No retrieval artifact
        
    info = requests.get(f"{API_URL}/runs/{run.run_id}").json()
    score = info.get("confidence")
    label = info.get("confidence_label")
    print(f"   Score: {score}, Label: {label}")
    
    if score is not None and score < 0.8:
         print("✅ Correctly scored LOW/MED")
    else:
         print(f"❌ Expected <0.8, got {score}")

    # Test 3: Artifact Upload Update
    print("\n[3/3] Testing Recompute on Artifact Upload...")
    # Add retrieval to the poor run
    print("   Uploading retrieved_sources.json to the low confidence run...")
    client = FulcrumClient(api_url=API_URL, api_key=API_KEY)
    # Manual API call to upload artifact
    requests.post(f"{API_URL}/runs/{run.run_id}/artifact", json={
        "name": "retrieved_sources.json",
        "content": "[{}]",
        "type": "json"
    }, headers={"Authorization": f"Bearer {API_KEY}"})
    
    time.sleep(1)
    info = requests.get(f"{API_URL}/runs/{run.run_id}").json()
    new_score = info.get("confidence")
    print(f"   New Score: {new_score}")
    
    if new_score > score:
        print("✅ Score increased after artifact upload")
    else:
        print("❌ Score did not increase")

if __name__ == "__main__":
    verify_confidence()
