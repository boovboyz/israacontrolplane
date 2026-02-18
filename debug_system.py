import sys
from pathlib import Path
import os
import requests

# Setup paths similar to app/api/chat.py
root_path = Path.cwd()
sys.path.append(str(root_path))

print("=== 1. Testing Imports & Initialization ===")

try:
    from app import llm, retrieve, prompt_builder, ingest, guardrails_wrapper, observability
    print("✅ Core modules imported successfully.")
except Exception as e:
    print(f"❌ Failed to import core modules: {e}")

try:
    print("   Attempting to load data...")
    structured_data = ingest.load_structured_data()
    print("   ✅ Structured data loaded.")
except Exception as e:
    print(f"   ❌ Failed to load structured data: {e}")

try:
    unstructured_docs = ingest.load_unstructured_data()
    print("   ✅ Unstructured data loaded.")
except Exception as e:
    print(f"   ❌ Failed to load unstructured data: {e}")

try:
    print("   Attempting to init ContentGenerator (LLM)...")
    content_gen = llm.ContentGenerator()
    print("   ✅ ContentGenerator initialized.")
except Exception as e:
    print(f"   ❌ Failed to init ContentGenerator: {e}")
    # Inspect environment variables
    print("   Environment Check:")
    print(f"   TOGETHER_API_KEY set? {'Yes' if os.getenv('TOGETHER_API_KEY') else 'No'}")
    print(f"   MLFLOW_TRACKING_URI set? {'Yes' if os.getenv('MLFLOW_TRACKING_URI') else 'No'}")

print("\n=== 2. Testing API Endpoints (Assuming Server Running) ===")
BASE_URL = "http://127.0.0.1:8000"

# Test Health
try:
    resp = requests.get(f"{BASE_URL}/health", timeout=5)
    print(f"GET /health: {resp.status_code} {resp.text}")
except Exception as e:
    print(f"❌ GET /health failed: {e}")

# Test Runs
try:
    resp = requests.get(f"{BASE_URL}/runs", timeout=5)
    if resp.status_code == 200:
        print(f"✅ GET /runs: Success ({len(resp.json()['runs'])} runs)")
    else:
        print(f"❌ GET /runs: {resp.status_code} - {resp.text}")
except Exception as e:
    print(f"❌ GET /runs failed: {e}")

# Test Chat
try:
    payload = {"message": "Hello world", "model": "grok-4-fast"}
    resp = requests.post(f"{BASE_URL}/chat/", json=payload, timeout=10)
    if resp.status_code == 200:
        print(f"✅ POST /chat: Success")
        print(resp.json().get("response"))
    else:
        print(f"❌ POST /chat: {resp.status_code} - {resp.text}")
except Exception as e:
    print(f"❌ POST /chat failed: {e}")
