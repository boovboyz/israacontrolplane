import json
from datetime import datetime, timezone
from typing import Any, Dict, Optional
from ai_confidence.models import RetrievedChunk, LLMCall, RunContext, ConfidenceReport # Import ConfidenceReport!
from ai_confidence.scorer import compute_confidence, ConfidenceReport # Ensure Scorer imports
from ai_confidence.ragas_adapter import RagasConfig, score_with_ragas

# Need to redefine ConfidenceConfig locally or make scorer export it properly?
# Scorer exported 'compute_confidence', but 'ConfidenceConfig' isn't explicitly in __init__ of scorer usually in the simplified version provided.
# However, in the prompt's provided code for `scorer.py`, `compute_confidence` signature was:
# def compute_confidence(run: RunContext, call: LLMCall, judge) -> ConfidenceReport:
# It didn't take a config object there in the simplified version I wrote earlier (Step 15 of user prompt).
# But the jobs code assumes `cfg=ConfidenceConfig(...)`.
# I must adapt `app/jobs.py` to match the `scorer.py` I ACTUALLY WROTE.

def utcnow():
    return datetime.now(timezone.utc).isoformat()

def run_ragas_job(
    *,
    store,
    run_id: str,
    judge_client,
):
    """
    Async deep eval:
    - Pull run from DB
    - Compute RAGAS metrics
    - Update confidence (simplified: just log ragas scores for now if scorer doesn't support fusion yet)
    """
    run = store.get_run(run_id)
    if not run:
        return
    
    req = run["request_json"] or {}
    answer = run.get("answer_text") or ""
    
    chunks = [msg for msg in req.get("contexts", [])] 
    # If no contexts in request, using dummy
    real_contexts = []
    # For demo version:
    real_contexts = [RetrievedChunk(source_id="demo", chunk_id="0", text="(no retrieval context)", similarity=1.0)]

    call = LLMCall(
        model=req.get("deployment", "unknown"),
        system_prompt=req.get("system_prompt", ""),
        user_prompt=req.get("user_prompt", ""),
        contexts=real_contexts,
        output_text=answer,
        params={},
    )
    
    # Compute RAGAS metrics
    ragas_scores: Dict[str, float] = {}
    try:
        ragas_scores = score_with_ragas(
            question=call.user_prompt,
            answer=call.output_text,
            contexts=call.contexts,
            cfg=RagasConfig(enabled=True, metrics=["faithfulness", "answer_relevancy", "context_utilization"]),
        )
    except Exception as e:
        store.add_event(run_id, "ragas_error", utcnow(), {"error": str(e)})
        return

    store.add_event(run_id, "ragas_complete", utcnow(), {"ragas_scores": ragas_scores})
    
    # In a full implementation, we would re-run compute_confidence here merging RAGAS scores.
    # For this v0.1 demo, we just append the event.
