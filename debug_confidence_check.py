import requests
import time
import sys

BASE_URL = "http://127.0.0.1:8000"

def verify_confidence_components():
    print("1. Sending Chat Request...")
    payload = {"message": "analyze risk in this sales forecast", "model": "grok-4-fast"}
    try:
        resp = requests.post(f"{BASE_URL}/chat/", json=payload, timeout=30)
        if resp.status_code == 200:
            data = resp.json()
            run_id = data.get("run_id")
            print(f"✅ Chat success. Run ID: {run_id}")
            
            # Wait for async logging? Usually synchronous enough in this app
            time.sleep(2)
            
            print(f"2. Fetching Run Details for {run_id}...")
            run_resp = requests.get(f"{BASE_URL}/runs/{run_id}")
            if run_resp.status_code == 200:
                run_data = run_resp.json()
                conf = run_data.get("confidence")
                comps = run_data.get("confidence_components")
                
                print(f"   Confidence Score: {conf}")
                print(f"   Components: {comps}")
                
                if comps and isinstance(comps, dict):
                    if "risk_analysis" in comps and comps["risk_analysis"] > 0:
                        print("✅ Risk analysis component found!")
                    else:
                        print("⚠️ Risk analysis component missing or 0.")
                    
                    if "base_score" in comps:
                        print("✅ Base score component found.")

                # New: Verify Confidence Explanation
                conf_exp = run_data.get("confidence_explanation")
                if conf_exp:
                    print("✅ Confidence Explanation found!")
                    print(f"   Version: {conf_exp.get('version')}")
                    print(f"   Evidence Count: {len(conf_exp.get('evidence', []))}")
                    return True
                else:
                    print("❌ Confidence Explanation MISSING.")
                    return False

            else:
                print(f"❌ Failed to get run details: {run_resp.status_code}")
        else:
            print(f"❌ Chat failed: {resp.status_code} - {resp.text}")
            
    except Exception as e:
        print(f"❌ Exception: {e}")
        
    return False

if __name__ == "__main__":
    if verify_confidence_components():
        print("✅ VERIFICATION SUCCESS")
        sys.exit(0)
    else:
        print("❌ VERIFICATION FAILED")
        sys.exit(1)
