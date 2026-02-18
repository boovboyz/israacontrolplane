from dataclasses import dataclass, field
from typing import Any, Dict, List, Literal, Optional, Sequence

Routing = Literal["stp", "assist", "escalate", "block"]

@dataclass(frozen=True)
class RetrievedChunk:
    source_id: str
    chunk_id: str
    text: str
    similarity: Optional[float] = None
    rank: Optional[int] = None
    metadata: Dict[str, Any] = field(default_factory=dict)

@dataclass(frozen=True)
class LLMCall:
    model: str
    system_prompt: str
    user_prompt: str
    contexts: Sequence[RetrievedChunk]
    output_text: str
    params: Dict[str, Any] = field(default_factory=dict)

@dataclass(frozen=True)
class RunContext:
    run_id: str
    step_id: str
    template: str
    environment: str
    tags: Dict[str, str] = field(default_factory=dict)

@dataclass
class ConfidenceReport:
    run_id: str
    step_id: str
    overall_confidence: int # 0..100
    routing: Routing
    components: Dict[str, float]
    gates_triggered: List[str]
    notes: List[str]
    raw: Dict[str, Any] = field(default_factory=dict)
