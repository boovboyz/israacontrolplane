from pydantic import BaseModel, Field
from typing import Any, Dict, List, Literal, Optional

Routing = Literal["stp", "assist", "escalate", "block"]

class RunCreateRequest(BaseModel):
    run_id: Optional[str] = None
    template: str = "generic"
    environment: str = "prod"
    system_prompt: str = "You are a helpful assistant."
    user_prompt: str
    # Optionally allow callers to supply an already-produced answer
    answer_override: Optional[str] = None
    tags: Dict[str, str] = Field(default_factory=dict)

class RunCreateResponse(BaseModel):
    run_id: str
    status: str
    confidence: Optional[int] = None
    routing: Optional[Routing] = None

class ConfidenceResponse(BaseModel):
    run_id: str
    step_id: str
    confidence: int
    routing: Routing
    breakdown: Dict[str, float]
    gates_triggered: List[str]
    notes: List[str]
    raw: Dict[str, Any]

class ReplayRequest(BaseModel):
    run_id: str
    resume_from_step: str = "step_llm_01"
    mode: Literal["dry_run", "write"] = "dry_run"
    edits: Dict[str, Any] = Field(default_factory=dict) # prompt/context/params edits
    reason: str = "human_correction"

class ReplayResponse(BaseModel):
    replay_run_id: str
    status: str
