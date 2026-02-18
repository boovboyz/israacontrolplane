import json
import uuid
import random
from datetime import datetime, timezone
from fastapi import BackgroundTasks, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from ai_confidence.pipeline import run_prompt as run_prompt_pipeline
from ai_confidence.judge_azure import AzureOpenAIJudge
from .api_models import (
    ConfidenceResponse,
    ReplayRequest,
    ReplayResponse,
    RunCreateRequest,
    RunCreateResponse,
)
from .config import (
    AZURE_OPENAI_API_VERSION,
    AZURE_OPENAI_DEPLOYMENT,
    AZURE_OPENAI_ENDPOINT,
    AZURE_OPENAI_KEY,
    DB_PATH,
    RAGAS_SAMPLE_RATE,
)
from .store import Store
from .jobs import run_ragas_job

def utcnow():
    return datetime.now(timezone.utc).isoformat()

app = FastAPI(
    title="AI Confidence Control Plane",
    version="0.2.0",
    description="FastAPI control plane for confidence scoring + async RAGAS on sampled traces."
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

store = Store(DB_PATH)

# Ensure config is present for judge
if not AZURE_OPENAI_ENDPOINT:
    print("WARNING: AZURE_OPENAI_ENDPOINT not set. Judges will fail.")

AZURE_CFG = {
    "endpoint": AZURE_OPENAI_ENDPOINT,
    "api_key": AZURE_OPENAI_KEY,
    "deployment": AZURE_OPENAI_DEPLOYMENT,
    "api_version": AZURE_OPENAI_API_VERSION,
}

# Lazy init judge to avoid crash at startup if env missing
try:
    judge_client = AzureOpenAIJudge(**AZURE_CFG)
except:
    judge_client = None

def should_sample() -> bool:
    return random.random() < RAGAS_SAMPLE_RATE

@app.post("/runs", response_model=RunCreateResponse)
def create_run(req: RunCreateRequest, background: BackgroundTasks):
    run_id = req.run_id or str(uuid.uuid4())
    created = utcnow()
    
    # Persist request
    store.upsert_run(run_id, {
        "parent_run_id": None,
        "template": req.template,
        "environment": req.environment,
        "status": "running",
        "created_at": created,
        "updated_at": created,
        "request_json": json.dumps({
            "template": req.template,
            "environment": req.environment,
            "system_prompt": req.system_prompt,
            "user_prompt": req.user_prompt,
            "tags": req.tags,
            "deployment": AZURE_OPENAI_DEPLOYMENT,
        }),
        "answer_text": None,
        "confidence_json": None,
    })
    store.add_event(run_id, "run_created", created, {"request": req.model_dump()})

    # Execute LLM + inline confidence
    # If caller provides answer_override, skipping inline confidence for v0.2
    if req.answer_override is not None:
        store.upsert_run(run_id, {"answer_text": req.answer_override, "status": "completed", "updated_at": utcnow()})
        store.add_event(run_id, "run_completed", utcnow(), {"note": "answer_override provided"})
        
        if should_sample() and judge_client:
            background.add_task(run_ragas_job, store=store, run_id=run_id, judge_client=judge_client)
            
        return RunCreateResponse(run_id=run_id, status="completed", confidence=None, routing=None)

    # Real Execution
    if not judge_client:
        raise HTTPException(status_code=500, detail="Azure OpenAI not configured.")
        
    try:
        output, report = run_prompt_pipeline(
            run_id=run_id,
            system_prompt=req.system_prompt,
            user_prompt=req.user_prompt,
            azure_cfg=AZURE_CFG,
        )
    except Exception as e:
        store.upsert_run(run_id, {"status": "failed", "updated_at": utcnow()})
        store.add_event(run_id, "run_failed", utcnow(), {"error": str(e)})
        raise HTTPException(status_code=500, detail=str(e))

    store.upsert_run(run_id, {
        "answer_text": output,
        "status": "completed",
        "confidence_json": json.dumps({
            "run_id": report.run_id,
            "step_id": report.step_id,
            "confidence": report.overall_confidence,
            "routing": report.routing,
            "breakdown": report.components,
            "gates_triggered": report.gates_triggered,
            "notes": report.notes,
            "raw": report.raw,
        }),
        "updated_at": utcnow(),
    })
    
    store.add_event(run_id, "run_completed", utcnow(), {"confidence": report.overall_confidence, "routing": report.routing})

    if should_sample():
        store.add_event(run_id, "ragas_scheduled", utcnow(), {"sample_rate": RAGAS_SAMPLE_RATE})
        background.add_task(run_ragas_job, store=store, run_id=run_id, judge_client=judge_client)

    return RunCreateResponse(run_id=run_id, status="completed", confidence=report.overall_confidence, routing=report.routing)

@app.get("/runs/{id}/confidence", response_model=ConfidenceResponse)
def get_confidence(id: str):
    run = store.get_run(id)
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")
    
    c = run.get("confidence_json")
    if not c:
        raise HTTPException(status_code=404, detail="Confidence not available yet")
        
    return ConfidenceResponse(
        run_id=c["run_id"],
        step_id=c["step_id"],
        confidence=c["confidence"],
        routing=c["routing"],
        breakdown=c["breakdown"],
        gates_triggered=c["gates_triggered"],
        notes=c["notes"],
        raw=c.get("raw", {}),
    )

@app.post("/replays", response_model=ReplayResponse, status_code=202)
def replay(req: ReplayRequest, background: BackgroundTasks):
    parent = store.get_run(req.run_id)
    if not parent:
        raise HTTPException(status_code=404, detail="Parent run not found")
        
    replay_run_id = str(uuid.uuid4())
    now = utcnow()
    
    request_json = parent.get("request_json") or {}
    
    # Create replay run record
    store.upsert_run(replay_run_id, {
        "parent_run_id": req.run_id,
        "template": parent.get("template", "unknown"),
        "environment": parent.get("environment", "unknown"),
        "status": "replay_created",
        "created_at": now,
        "updated_at": now,
        "request_json": json.dumps({
            **request_json,
            "replay": {
                "parent_run_id": req.run_id,
                "resume_from_step": req.resume_from_step,
                "mode": req.mode,
                "edits": req.edits,
                "reason": req.reason,
            }
        }),
        "answer_text": parent.get("answer_text"),
        "confidence_json": parent.get("confidence_json") and json.dumps(parent["confidence_json"]) or None,
    })
    
    store.add_event(replay_run_id, "replay_created", now, req.model_dump())
    
    return ReplayResponse(replay_run_id=replay_run_id, status="accepted")
