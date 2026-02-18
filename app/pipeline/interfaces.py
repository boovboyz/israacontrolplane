from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Protocol, runtime_checkable
import uuid
from datetime import datetime

@dataclass
class PipelineContext:
    """Carries state through the pipeline execution."""
    request_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    run_id: Optional[str] = None
    session_id: Optional[str] = None
    user_id: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)
    created_at: datetime = field(default_factory=datetime.utcnow)

@dataclass
class StepResult:
    """Standardized output from a pipeline step."""
    output: Any
    metadata: Dict[str, Any] = field(default_factory=dict)
    artifacts: Dict[str, Any] = field(default_factory=dict)
    errors: List[str] = field(default_factory=list)
    success: bool = True

@runtime_checkable
class PipelineStep(Protocol):
    """Interface for a modular processing step."""
    
    @property
    def name(self) -> str:
        """Unique identifier for the step."""
        ...

    def run(self, ctx: PipelineContext, input_data: Any) -> StepResult:
        """
        Execute the step logic.
        
        Args:
            ctx: Shared pipeline context.
            input_data: Data from the previous step or initial input.
            
        Returns:
            StepResult containing output and side effects.
        """
        ...
