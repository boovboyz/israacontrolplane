import sys
import os
import time
import requests
import uuid

# Add app to path
sys.path.append(os.path.join(os.path.dirname(__file__), "app"))

from client import FulcrumClient

def verify():
    print("🚀 Verifying Logging Flow...")
    
    API_URL = "http://localhost:8000"
    
    # 1. Check Backend
    try:
        requests.get(f"{API_URL}/docs")
        print("✅ Backend is reachable")
    except Exception:
        print("❌ Backend is NOT reachable. Make sure it's running on port 8000.")
        return

    # 2. Use Client
    client = FulcrumClient(api_url=API_URL, api_key="dev-key-123")
    session_id = str(uuid.uuid4())
    
    print(f"   Starting run with session_id={session_id}...")
    
    try:
        with client.run(
            user_id="test_user",
            session_id=session_id,
            model="test-model-v1",
            run_name="Verification Run",
            params={"temp": 0.5},
            tags={"env": "test"}
        ) as run:
            print(f"     Run started. ID: {run.run_id}")
            
            run.log_input("This is a test prompt", user_question="Test Question")
            run.log_metric("accuracy", 0.99)
            run.log_output("This is a test response", parsed_json={"forecast": 100})
            run.log_artifact("debug.log", "Debug info...", "text")
            
            time.sleep(1)
            
        print("✅ Run completed and logged.")
        
        if run.run_id:
            # 3. Verify Persistence
            print(f"   Verifying existence of run {run.run_id}...")
            resp = requests.get(f"{API_URL}/runs/{run.run_id}")
            if resp.status_code == 200:
                data = resp.json()
                if data["status"] == "success":
                    print("✅ Run status is 'success'")
                else:
                    print(f"⚠️ Run status is {data['status']}")
                    
                # Check artifacts
                artifacts = data.get("artifacts", [])
                names = [a["name"] for a in artifacts]
                print(f"   Artifacts found: {names}")
                
                required = ["prompt_packet.txt", "user_question.txt", "parsed_forecast.json", "debug.log", "llm_response.txt"]
                missing = [r for r in required if r not in names]
                
                if not missing:
                    print("✅ All artifacts verified.")
                else:
                    print(f"❌ Missing artifacts: {missing}")
            else:
                print(f"❌ Failed to fetch run: {resp.status_code}")
                
    except Exception as e:
        print(f"❌ Verification failed: {e}")

if __name__ == "__main__":
    verify()
