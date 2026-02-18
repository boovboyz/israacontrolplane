import os

def env(name: str, default: str | None = None) -> str:
    v = os.getenv(name, default)
    if v is None or v == "":
        # For demo purposes, don't crash immediately if env vars are missing, 
        # but the specific endpoint needing them might fail.
        if default is not None:
            return default
        # In strict mode, we'd raise RuntimeError here. 
        # raise RuntimeError(f"Missing environment variable: {name}")
        return "" 
    return v

AZURE_OPENAI_ENDPOINT = env("AZURE_OPENAI_ENDPOINT", "")
AZURE_OPENAI_KEY = env("AZURE_OPENAI_KEY", "")
AZURE_OPENAI_DEPLOYMENT = env("AZURE_OPENAI_DEPLOYMENT", "")
AZURE_OPENAI_API_VERSION = os.getenv("AZURE_OPENAI_API_VERSION", "2024-02-01")

DB_PATH = os.getenv("AI_CONFIDENCE_DB_PATH", "ai_confidence.db")
# Async RAGAS sampling (0.0 to 1.0)
RAGAS_SAMPLE_RATE = float(os.getenv("RAGAS_SAMPLE_RATE", "0.05"))
