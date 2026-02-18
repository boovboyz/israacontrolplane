import subprocess
import sys
import os
import time
import socket
from pathlib import Path

# Paths
BASE_DIR = Path(__file__).parent.parent.absolute() # Moved to app/, so go up one level
OPS_DIR = BASE_DIR / "fulcrum-llm-ops"
BACKEND_DIR = OPS_DIR / "backend"
FRONTEND_DIR = OPS_DIR / "frontend"

def is_port_in_use(port):
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        return s.connect_ex(('localhost', port)) == 0

def start_backend():
    """Starts the Backend on port 8000 if not already running."""
    if is_port_in_use(8000):
        print("Backend already running on port 8000.")
        return True
    
    print("Starting Backend...")
    try:
        # Redirect outputs to log files instead of devnull/pipe to avoid buffer issues and help debugging
        out_file = open("backend_stdout.log", "w")
        err_file = open("backend_stderr.log", "w")
        
        proc = subprocess.Popen(
            [sys.executable, "-m", "uvicorn", "app.main:app", "--reload", "--host", "0.0.0.0", "--port", "8000"],
            cwd=str(BACKEND_DIR),
            stdout=out_file,
            stderr=err_file
        )
        # Give it a sec to bind
        time.sleep(3) 
        
        # Check if it died
        if proc.poll() is not None:
             print("Backend failed to start (process exited).")
             # Read stderr
             try:
                 with open("backend_stderr.log", "r") as f:
                     print(f"Backend Error: {f.read()}")
             except:
                 pass
             return False
             
        return True
    except Exception as e:
        print(f"Failed to start backend: {e}")
        return False

def start_frontend():
    """Starts the Frontend on port 5173 if not already running."""
    if is_port_in_use(5173):
        print("Frontend already running on port 5173.")
        return True

    print("Starting Frontend...")
    try:
        # Check for npm
        npm_cmd = "npm.cmd" if sys.platform == "win32" else "npm"
        
        out_file = open("frontend_stdout.log", "w")
        err_file = open("frontend_stderr.log", "w")
        
        proc = subprocess.Popen(
            [npm_cmd, "run", "dev"],
            cwd=str(FRONTEND_DIR),
            stdout=out_file,
            stderr=err_file
        )
        time.sleep(3)
        
        if proc.poll() is not None:
             print("Frontend failed to start (process exited).")
             try:
                 with open("frontend_stderr.log", "r") as f:
                     print(f"Frontend Error: {f.read()}")
             except:
                 pass
             return False
             
        return True
    except Exception as e:
        print(f"Failed to start frontend: {e}")
        return False

def connect_ops_platform():
    """Orchestrates starting both services."""
    b_ok = start_backend()
    f_ok = start_frontend()
    return b_ok and f_ok

if __name__ == "__main__":
    current_status = connect_ops_platform()
    if current_status:
        print("All systems go! Ops platform is ready.")
    else:
        print("Some services failed to start.")
