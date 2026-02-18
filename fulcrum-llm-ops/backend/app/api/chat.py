import sys
from pathlib import Path
import os
import logging
# Logic to handle importing from root 'app' folder which conflicts with backend 'app' package
# We add the root 'app' directory to sys.path so we can import modules directly
# Try the standard relative path first, then Docker paths as fallback
root_app_path = Path(__file__).resolve().parent.parent.parent.parent.parent / "app"
docker_app_path = Path("/project/app")
docker_project_root = Path("/project")

for candidate in [root_app_path, docker_app_path]:
    if candidate.is_dir() and str(candidate) not in sys.path:
        sys.path.insert(0, str(candidate))

# Ensure CWD is the project root so relative paths like "demo_data/" work
for project_root in [root_app_path.parent, docker_project_root]:
    if (project_root / "demo_data").is_dir():
        os.chdir(str(project_root))
        break

try:
    import llm
    import retrieve
    import prompt_builder
    import ingest
    import guardrails_wrapper
    import observability
    
    ContentGenerator = llm.ContentGenerator
    get_relevant_context = retrieve.get_relevant_context
    chunk_documents = retrieve.chunk_documents
    compute_kpi_summary = prompt_builder.compute_kpi_summary
    build_prompt_packet = prompt_builder.build_prompt_packet
    load_structured_data = ingest.load_structured_data
    load_unstructured_data = ingest.load_unstructured_data
    check_input = guardrails_wrapper.check_input
    obs = observability.obs

except ImportError as e:
    logging.error(f"Failed to import root app modules (core): {e}")
    ContentGenerator = None
    get_relevant_context = None
    chunk_documents = None
    compute_kpi_summary = None
    build_prompt_packet = None
    load_structured_data = None
    load_unstructured_data = None
    check_input = None
    obs = None

try:
    import validation
    validate_user_text = validation.validate_user_text
except ImportError as e:
    logging.error(f"Failed to import validation module: {e}")
    validate_user_text = None



from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List, Dict, Any

router = APIRouter()
logger = logging.getLogger("uvicorn")

# --- Startup: Load Data ---
# In a real production app, this should be cached properly or loaded on startup event
try:
    logger.info("Loading Sales Data and Docs for Chat API...")
    structured_data = load_structured_data()
    unstructured_docs = load_unstructured_data()
    kpi_summary = compute_kpi_summary(structured_data)
    content_gen = ContentGenerator() # Handles MLflow initialization internally
    logger.info("Data loaded successfully.")
except Exception as e:
    logger.error(f"Failed to load data: {e}")
    structured_data = None
    unstructured_docs = []
    kpi_summary = ""
    content_gen = None

import uuid

class ChatRequest(BaseModel):
    message: str
    model: str = "grok-4-fast"
    top_k: int = 3
    retrieval_enabled: bool = True
    session_id: Optional[str] = None
    user_id: Optional[str] = None

class ChatResponse(BaseModel):
    response: str
    run_id: Optional[str] = None
    session_id: str
    guardrails: Optional[Dict[str, Any]] = None
    context: List[Dict[str, Any]] = []

@router.post("/", response_model=ChatResponse)
async def chat_endpoint(req: ChatRequest):
    if not content_gen:
        raise HTTPException(status_code=500, detail="Backend data not initialized")

    try:
        # 0. Input Validation
        if validate_user_text:
            is_valid, normalized_text, errors = validate_user_text(req.message)
            if not is_valid:
                raise HTTPException(status_code=400, detail=f"Invalid input: {'; '.join(errors)}")
            req.message = normalized_text

        # Generate session_id if not provided
        session_id = req.session_id or str(uuid.uuid4())

        # 0.5 Policy Check (Guardrails)
        if check_input and obs:
            policy_result = check_input(req.message, ctx={"user_id": req.user_id, "session_id": session_id})
            if not policy_result.passed:
                # Log blocked request to MLflow
                with obs.start_run(run_name="blocked_input") as run:
                    obs.set_tag("session_id", session_id)
                    if req.user_id:
                        obs.set_tag("user_id", req.user_id)
                    obs.set_tag("guardrails_status", "blocked")
                    obs.log_text(req.message, "user_input.txt")
                    obs.log_text(policy_result.failure_message, "violation.txt")
                
                raise HTTPException(status_code=400, detail=f"Policy violation: {policy_result.failure_message}")

        # 1. Retrieval
        relevant_chunks = []
        if req.retrieval_enabled:
            relevant_chunks = get_relevant_context(req.message, unstructured_docs, top_k=req.top_k)
        
        # 2. Build Prompt
        packet = build_prompt_packet(req.message, kpi_summary, relevant_chunks)
        
        # 3. Generate
        full_response, run_id, guardrails_meta = content_gen.generate_response(
            packet,
            retrieval_context=relevant_chunks,
            model=req.model,
            user_question=req.message,
            top_k=req.top_k,
            session_id=session_id,
            user_id=req.user_id,
        )
        
        return ChatResponse(
            response=full_response,
            run_id=run_id,
            session_id=session_id,
            guardrails=guardrails_meta,
            context=relevant_chunks
        )

    except Exception as e:
        logger.error(f"Chat error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
