import subprocess
import socket
import os
import sys
import time
from pathlib import Path

# Paths
ROOT_DIR = Path(__file__).parent.resolve()
BACKEND_DIR = ROOT_DIR / "fulcrum-llm-ops" / "backend"
FRONTEND_DIR = ROOT_DIR / "fulcrum-llm-ops" / "frontend"
CONFIDENCE_DIR = ROOT_DIR / "ai-confidence"

def is_port_in_use(port: int) -> bool:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        return s.connect_ex(('localhost', port)) == 0

def start_process(command, cwd, name, log_file=None):
    print(f"🚀 Starting {name}...")
    try:
        if log_file:
            log = open(log_file, "w")
            # Using shell=True for convenience with complex commands/envs, 
            # though careful with security (local dev is fine)
            proc = subprocess.Popen(command, cwd=cwd, shell=True, stdout=log, stderr=subprocess.STDOUT)
        else:
            proc = subprocess.Popen(command, cwd=cwd, shell=True)
        return proc
    except Exception as e:
        print(f"❌ Failed to start {name}: {e}")
        return None

def connect_ops_platform():
    """
    Called by Streamlit UI to launch services.
    Returns True if startup sequence initiated successfully.
    """
    
    # Check Ports
    if is_port_in_use(8000) and is_port_in_use(5173) and is_port_in_use(8001):
        # Already running?
        print("✅ Services appear to be running already.")
        return True

    logs_dir = ROOT_DIR / "logs"
    logs_dir.mkdir(exist_ok=True)

    # 1. Start Layer 2 Backend (Port 8000)
    if not is_port_in_use(8000):
        # We assume the user is running in an env where backend deps are installed OR
        # we can try to use the same python interpreter
        cmd = f"{sys.executable} -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload"
        start_process(cmd, BACKEND_DIR, "Ops Backend", logs_dir / "backend.log")
        time.sleep(2) # Give it a moment

    # 2. Start AI Confidence (Port 8001)
    if not is_port_in_use(8001):
        # Check if .venv exists in ai-confidence, if so use it
        venv_python = CONFIDENCE_DIR / ".venv" / "bin" / "python"
        if venv_python.exists():
             py_cmd = str(venv_python)
        else:
             py_cmd = sys.executable
        
        # Ensure deps are installed? We assume user followed instructions.
        cmd = f"{py_cmd} -m uvicorn app.main:app --host 127.0.0.1 --port 8001 --reload"
        start_process(cmd, CONFIDENCE_DIR, "AI Control Plane", logs_dir / "confidence.log")
        time.sleep(2)

    # 3. Start Frontend (Port 5173)
    if not is_port_in_use(5173):
        # Check for npm
        cmd = "npm run dev"
        start_process(cmd, FRONTEND_DIR, "Ops Frontend", logs_dir / "frontend.log")

    # Final check
    time.sleep(3)
    ok = is_port_in_use(8000) or is_port_in_use(5173)
    return ok
