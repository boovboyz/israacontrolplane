import sys
import os
from pathlib import Path

# Add project root to sys.path to allow importing 'app.llm', 'app.ingest', etc.
# Current file: .../backend/app/main.py
# Root is 3 levels up: .../sales-predictor-layer1/
root_path = Path(__file__).parent.parent.parent.parent.resolve()
sys.path.append(str(root_path))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.settings import settings
from app.api import runs, replay, metrics, evaluations, compare, guardrails, chat, alerts

app = FastAPI(title="Fulcrum LLM Ops API")

@app.on_event("startup")
def startup_event():
    if os.getenv("ALERTS_DEMO_MODE", "false").lower() == "true":
        from app.services.alerts import alerts_service
        alerts_service.seed_demo_alerts()

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Layer 2 core
app.include_router(runs.router, prefix="/runs", tags=["runs"])
app.include_router(replay.router, prefix="/replay", tags=["replay"])
app.include_router(metrics.router, prefix="/metrics", tags=["metrics"])

# Layer 3 extensions
app.include_router(evaluations.router, prefix="/evaluations", tags=["evaluations"])
app.include_router(compare.router, prefix="/compare", tags=["compare"])
app.include_router(guardrails.router, prefix="/guardrails", tags=["guardrails"])
app.include_router(alerts.router, prefix="/alerts", tags=["alerts"])

from app.api import prompts
app.include_router(prompts.router, prefix="/prompts", tags=["prompts"])

# Unified Chat Endpoint
app.include_router(chat.router, prefix="/chat", tags=["chat"])


@app.get("/health")
def health_check():
    return {"status": "ok"}


@app.get("/mlflow-info")
def get_mlflow_info():
    from app.mlflow_store import mlflow_store
    return {
        "tracking_uri": settings.MLFLOW_TRACKING_URI,
        "experiment_name": settings.MLFLOW_EXPERIMENT_NAME,
        "experiment_id": mlflow_store.get_experiment_id(),
    }
