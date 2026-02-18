import requests
import time
import sys

BASE_URL = "http://localhost:8000"
API_KEY = "dev-key-123" # Default from settings
HEADERS = {"X-API-Key": API_KEY}

def log_run_with_issue(issue_type="low_confidence"):
    print(f"Logging run with {issue_type}...")
    
    # 1. Start Run
    resp = requests.post(f"{BASE_URL}/runs", json={
        "user_id": "verify_user",
        "session_id": "verify_session",
        "model": "gpt-4",
        "params": {"prompt": f"Verify {issue_type}"}
    }, headers=HEADERS)
    response_data = resp.json()
    if isinstance(response_data, dict):
        run_id = response_data.get("run_id")
    else:
        run_id = response_data # It's just the string ID
        
    if not run_id:
        print(f"Error: No run_id in response: {resp.text}")
        sys.exit(1)
    print(f"Started Run: {run_id}")
    
    # 2. Log Metrics/Artifacts based on issue
    if issue_type == "low_confidence":
        # Simulate low confidence via components
        requests.post(f"{BASE_URL}/runs/{run_id}/artifacts", json={
            "name": "confidence_components.json",
            "content": '{"policy_pass": 0.0, "retrieval_present": 0.0}',
            "type": "json"
        }, headers=HEADERS)
        # Simulate success status
        requests.patch(f"{BASE_URL}/runs/{run_id}", json={
            "status": "success",
            "metrics": {"latency_ms": 500}
        }, headers=HEADERS)
        
    elif issue_type == "policy_fail":
        requests.patch(f"{BASE_URL}/runs/{run_id}", json={
            "status": "success",
            "metrics": {"policy_pass": 0, "latency_ms": 200}
        }, headers=HEADERS)
        
    elif issue_type == "high_latency":
        requests.patch(f"{BASE_URL}/runs/{run_id}", json={
            "status": "success",
            "metrics": {"latency_ms": 15000}
        }, headers=HEADERS)

    print("Run updated. Checking alerts...")
    time.sleep(1) # Allow for async processing if any (though ours is synchronous)
    
    # 3. Check Alerts
    resp = requests.get(f"{BASE_URL}/alerts", headers=HEADERS)
    alerts = resp.json()
    
    found = False
    for alert in alerts:
        if alert.get("run_id") == run_id:
            print(f"FOUND ALERT: {alert['type']} - {alert['message']}")
            found = True
            
            # Resolve it
            print("Resolving alert...")
            requests.post(f"{BASE_URL}/alerts/{alert['id']}/resolve", headers=HEADERS)
            
    if not found:
        print("ERROR: No alert found for this run.")
        sys.exit(1)
        
    print("Verification Passed!")

if __name__ == "__main__":
    log_run_with_issue("low_confidence")
