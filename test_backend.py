
import requests
import sys

BASE_URL = "http://localhost:8000"
RUN_ID = "e466b9df88e5421eb85d12dc803601ed" # From Step 1

def test_backend_endpoints():
    print(f"Testing Backend at {BASE_URL}...")
    
    # 1. Health
    try:
        r = requests.get(f"{BASE_URL}/health", timeout=2)
        print(f"GET /health: {r.status_code}")
        if r.status_code != 200:
            print("FAILED health check")
            return
    except Exception as e:
        print(f"FAILED connection: {e}")
        return

    # 2. Get Run Details
    print(f"GET /runs/{RUN_ID}...")
    r = requests.get(f"{BASE_URL}/runs/{RUN_ID}")
    if r.status_code == 200:
        data = r.json()
        print("Run found!")
        # Validate schema fields
        needed = ["run_id", "status", "metrics", "artifacts"]
        for n in needed:
            if n not in data:
                print(f"MISSING field: {n}")
        if data["status"] not in ["failed", "success", "running", "pending"]:
             print(f"Unexpected status: {data['status']}")
    else:
        print(f"FAILED: {r.status_code} - {r.text}")

    # 3. Get Artifact Content
    print(f"GET /runs/{RUN_ID}/artifact?path=llm_response.txt...")
    r = requests.get(f"{BASE_URL}/runs/{RUN_ID}/artifact", params={"path": "llm_response.txt"})
    if r.status_code == 200:
        print("Artifact content retrieved successfully.")
        print(f"Content Start: {r.text[:50]}...")
    else:
        print(f"FAILED: {r.status_code} - {r.text}")

    print("Backend Test Complete.")

if __name__ == "__main__":
    test_backend_endpoints()
