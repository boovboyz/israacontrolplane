import requests
import sys

BACKEND_URL = "http://localhost:8000"

def test_guardrails():
    print("=== TESTING GUARDRAILS ===")

    # 1. Test Policies Endpoint
    print("\n[Step 1] Fetching Policies...")
    try:
        r = requests.get(f"{BACKEND_URL}/guardrails/policies")
        if r.status_code != 200:
            print(f"FAILED: {r.text}")
            sys.exit(1)
        policies = r.json()
        print(f"   -> Found {len(policies)} policies.")
        active = [p for p in policies if p['status'] == 'active']
        print(f"   -> Active: {[p['name'] for p in active]}")
    except Exception as e:
        print(f"FAILED: {e}")
        sys.exit(1)

    # 2. Test Safe Content (Should Pass)
    print("\n[Step 2] Testing Safe Content...")
    try:
        payload = {"text": "Hello, how are sales looking?", "source": "user"}
        r = requests.post(f"{BACKEND_URL}/guardrails/validate", json=payload)
        data = r.json()
        if data["blocked"]:
            print(f"FAILED: Safe content was blocked. Reason: {data.get('reason')}")
            sys.exit(1)
        print("   -> PASSED (Not blocked)")
    except Exception as e:
        print(f"FAILED: {e}")
        sys.exit(1)

    # 3. Test PII Content (Should Redact)
    print("\n[Step 3] Testing PII Content ('Call me at 123-456-7890')...")
    try:
        payload = {"text": "Call me at 123-456-7890", "source": "user"}
        r = requests.post(f"{BACKEND_URL}/guardrails/validate", json=payload)
        data = r.json()
        if data["blocked"]:
             print(f"FAILED: Safe/PII content was blocked. Reason: {data.get('reason')}")
             sys.exit(1)
        
        val_text = data.get("validated_text", "")
        if "[REDACTED]" not in val_text:
             print(f"FAILED: PII was not redacted. Got: {val_text}")
             sys.exit(1)
             
        print(f"   -> PASSED (Redacted: {val_text})")
    except Exception as e:
        print(f"FAILED: {e}")
        sys.exit(1)

    # 4. Test Toxic Content (Should Block based on original script logic? No, wrapper says monitor/fix for Toxic too)
    # Wait, my wrapper says ToxicLanguage(..., on_fail="fix")
    # So it should NOT block, but CENSOR.
    
    print("\n[Step 4] Testing Toxic Content ('I hate this')...")
    try:
        payload = {"text": "I hate this report", "source": "user"}
        r = requests.post(f"{BACKEND_URL}/guardrails/validate", json=payload)
        data = r.json()
        
        # In my wrapper, toxicity is "active" but on_fail="fix"
        # Since on_fail="fix", Guardrails returns passed=True!
        # So it should NOT block, but return censored text.
        
        if data["blocked"]:
             print(f"FAILED: Toxic content was blocked (Expected Fix). Reason: {data.get('reason')}")
             # Actually, if I want to BLOCK toxic, I should change on_fail to "exception".
             # But let's verify FIX behavior for now.
             sys.exit(1)
             
        val_text = data.get("validated_text", "")
        if "****" not in val_text:
             print(f"FAILED: Toxic content not censored. Got: {val_text}")
             sys.exit(1)
             
        print(f"   -> PASSED (Censored: {val_text})")
        
    except Exception as e:
        print(f"FAILED: {e}")
        sys.exit(1)

    print("\n=== GUARDRAILS VERIFICATION SUCCESSFUL ===")

if __name__ == "__main__":
    test_guardrails()
