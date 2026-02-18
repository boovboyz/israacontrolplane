import requests
import uuid

API_URL = "http://localhost:8000"
VALID_KEY = "dev-key-123"
INVALID_KEY = "wrong-key"

def test_auth():
    print("🔐 Testing Authentication...")
    
    # 1. Test No Key -> 401
    print("   [1/3] Testing Missing Key...")
    resp = requests.post(f"{API_URL}/runs", json={})
    if resp.status_code == 401:
        print("✅ Correctly rejected (401)")
    else:
        print(f"❌ Failed! Expected 401, got {resp.status_code}")

    # 2. Test Invalid Key -> 401
    print("   [2/3] Testing Invalid Key...")
    resp = requests.post(f"{API_URL}/runs", json={}, headers={"Authorization": f"Bearer {INVALID_KEY}"})
    if resp.status_code == 401:
        print("✅ Correctly rejected (401)")
    else:
        print(f"❌ Failed! Expected 401, got {resp.status_code}")
        
    # 3. Test Valid Key -> 200 (or validation error 422, but not 401)
    print("   [3/3] Testing Valid Key...")
    # Passing minimal valid body to avoid 422
    payload = {
        "user_id": "auth_test",
        "session_id": str(uuid.uuid4()),
        "model": "test",
        "params": {}
    }
    resp = requests.post(f"{API_URL}/runs", json=payload, headers={"Authorization": f"Bearer {VALID_KEY}"})
    if resp.status_code == 200:
        print("✅ Authorized and created run (200)")
    else:
        print(f"❌ Failed! Expected 200, got {resp.status_code}: {resp.text}")

if __name__ == "__main__":
    test_auth()
