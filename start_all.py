import subprocess
import time
import signal
import sys
import os
from pathlib import Path

# Paths
ROOT_DIR = Path(__file__).parent.resolve()
BACKEND_DIR = ROOT_DIR / "fulcrum-llm-ops" / "backend"
FRONTEND_DIR = ROOT_DIR / "fulcrum-llm-ops" / "frontend"
APP_DIR = ROOT_DIR / "app"

processes = []

def signal_handler(sig, frame):
    print("\nShutting down all services...")
    for p in processes:
        p.terminate()
    sys.exit(0)

signal.signal(signal.SIGINT, signal_handler)

def start_services():
    print("🚀 Starting Fulcrum LLM Ops System...")
    
    # 1. Start Backend (Port 8000)
    print("   [1/3] Starting Backend API...")
    backend_env = os.environ.copy()
    backend_cmd = [sys.executable, "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
    p_backend = subprocess.Popen(backend_cmd, cwd=BACKEND_DIR, env=backend_env)
    processes.append(p_backend)
    
    # 2. Start Frontend (Port 5173)
    print("   [2/3] Starting Frontend UI...")
    # Use npm from shell
    p_frontend = subprocess.Popen(["npm", "run", "dev"], cwd=FRONTEND_DIR, shell=True)
    processes.append(p_frontend)

    # 3. Start Streamlit Chatbot (Port 8501)
    print("   [3/3] Starting Sales Predictor Chatbot...")
    streamlit_cmd = [sys.executable, "-m", "streamlit", "run", "app/main.py",
                     "--server.port", "8501", "--server.headless", "true"]
    p_streamlit = subprocess.Popen(streamlit_cmd, cwd=ROOT_DIR)
    processes.append(p_streamlit)

    print("\n✅ All services launched!")
    print("\n   [CHATBOT]  Sales AI Chatbot: http://localhost:8501")
    print("   [MAIN APP] Ops Dashboard:    http://localhost:5173")
    print("   [API]      Backend Docs:     http://localhost:8000/docs")
    print("\nPress Ctrl+C to stop all services.")

    # Open Chat automatically
    try:
        time.sleep(5) # Wait for Vite to start
        import webbrowser
        webbrowser.open("http://localhost:8501")
    except:
        pass

    # Keep main process alive
    while True:
        time.sleep(1)

if __name__ == "__main__":
    start_services()

