from typing import List, Optional, Dict, Any
from pydantic import BaseModel
from datetime import datetime


class RunListItem(BaseModel):
    run_id: str
    status: str
    model: str
    latency_ms: Optional[float] = None
    cost_usd: Optional[float] = None
    confidence: Optional[float] = None
    confidence_label: Optional[str] = None
    confidence_components: Optional[Dict[str, float]] = None
    parse_success: Optional[float] = 0
    started_at: Optional[datetime] = None


class ArtifactItem(BaseModel):
    name: str
    path: str
    type: str


class ConfidenceComponent(BaseModel):
    value: float
    fired: bool
    reason: Optional[str] = None

class ConfidenceEvidence(BaseModel):
    component: str
    artifact: str
    path: str
    excerpt: str
    note: str

class ConfidenceExplanation(BaseModel):
    version: str
    score: float
    label: str
    formula: str
    weights: Dict[str, float]
    components: Dict[str, ConfidenceComponent]
    evidence: List[ConfidenceEvidence]
    interpretation: Dict[str, str]
    limitations: List[str]
    improvement_actions: List[str]

class RunDetail(RunListItem):
    params: Dict[str, Any]
    metrics: Dict[str, float]
    tags: Dict[str, str]
    artifacts: List[ArtifactItem]
    input_preview: Optional[Dict[str, Any]] = None
    output_preview: Optional[Dict[str, Any]] = None
    confidence_explanation: Optional[ConfidenceExplanation] = None


class RunsResponse(BaseModel):
    runs: List[RunListItem]
    models: List[str]
    statuses: List[str]


class ReplayRequest(BaseModel):
    source_run_id: str
    prompt: Optional[str] = None
    model: str
    temperature: float = 0.7


class ReplayResponse(BaseModel):
    new_run_id: str
    latency_ms: float
    cost_usd: float
    confidence: float
    output_text: str
    view_run_url: str


class MetricsSummary(BaseModel):
    total_runs: int = 0
    p50_latency_ms: float = 0
    p95_latency_ms: float = 0
    avg_latency_ms: float = 0
    min_latency_ms: float = 0
    max_latency_ms: float = 0
    total_cost_usd: float = 0
    avg_cost_usd: float = 0
    avg_confidence: float = 0
    status_counts: Dict[str, int] = {}


# Layer 3 schemas - Metrics
class TimeseriesPoint(BaseModel):
    timestamp: str
    value: float
    run_id: str
    model: str


class MetricsKPIs(BaseModel):
    p50_latency_ms: float
    p95_latency_ms: float
    total_cost_usd: float
    avg_confidence: float
    parse_success_rate: float
    run_count: int


class DashboardSummaryResponse(BaseModel):
    range: str
    kpis: MetricsKPIs
    models: List[str]


class CostByModelItem(BaseModel):
    model: str
    cost_usd: float
    run_count: int


class ConfidenceBin(BaseModel):
    min: float
    max: float
    count: int


class ConfidenceDistributionResponse(BaseModel):
    bins: List[ConfidenceBin]


class TimeseriesResponse(BaseModel):
    metric: str
    points: List[TimeseriesPoint]


class CompareRunsResponse(BaseModel):
    runs: List[RunDetail]


# Layer 3 schemas - Evaluations
class EvaluationRequest(BaseModel):
    run_id: str
    rating: int  # 1-5
    label: str  # thumbs_up / thumbs_down / neutral
    comment: str = ""


class EvaluationResponse(BaseModel):
    run_id: str
    rating: int
    label: str
    comment: str

# ----------------- REPLAY STUDIO STAGED EXECUTION -----------------

class RunStageArtifacts(BaseModel):
    # Captures all potentially available artifacts from a run for replay
    # Nullable if not present in the run
    user_question: Optional[str] = None
    retrieved_sources: Optional[List[Dict[str, Any]]] = None
    kpi_summary: Optional[Dict[str, Any]] = None
    prompt_packet: Optional[str] = None
    llm_response: Optional[str] = None
    parsed_forecast: Optional[List[Dict[str, Any]]] = None
    parse_error: Optional[Dict[str, Any]] = None

class RunStagesResponse(BaseModel):
    run_id: str
    model: str
    temperature: float = 0.7
    confidence: Optional[float] = None
    confidence_label: Optional[str] = None
    confidence_components: Optional[Dict[str, float]] = None
    stages: RunStageArtifacts

class ReplayOverrides(BaseModel):
    # User can optionally override any of these inputs
    user_question: Optional[str] = None
    retrieved_sources: Optional[List[Dict[str, Any]]] = None
    kpi_summary: Optional[Dict[str, Any]] = None
    prompt_packet: Optional[str] = None
    llm_response: Optional[str] = None

class ReplayOptions(BaseModel):
    recompute_retrieval: bool = False
    recompute_kpi: bool = False

class ReplayStagedRequest(BaseModel):
    source_run_id: str
    replay_from_stage: int  # 0=Question, 1=Retrieval, 2=KPI, 3=Prompt, 4=Response
    overrides: ReplayOverrides
    options: ReplayOptions
    model: str
    temperature: float = 0.7

class ReplayStagedResponse(BaseModel):
    new_run_id: str
    output_text: Optional[str] = None
    parsed_forecast: Optional[List[Dict[str, Any]]] = None
    metrics: Dict[str, float]


# ----------------- CLIENT LOGGING -----------------

class CreateRunRequest(BaseModel):
    user_id: Optional[str] = "default_user"
    session_id: Optional[str] = "default_session"
    model: str = "unknown"
    params: Dict[str, Any] = {}
    tags: Dict[str, str] = {}


class UpdateRunRequest(BaseModel):
    status: Optional[str] = None
    metrics: Dict[str, float] = {}
    output: Optional[str] = None
    error: Optional[str] = None
    end_time: bool = False # If True, marks run as terminated


class LogArtifactRequest(BaseModel):
    name: str # e.g. "prompt.txt"
    content: str
    type: str # "text" or "json"


class Alert(BaseModel):
    id: str
    run_id: Optional[str] = None
    type: str # POLICY_FAIL, LOW_CONFIDENCE, etc
    severity: str # low, medium, high
    message: str
    created_at: str
    is_resolved: bool


# ----------------- PROMPT LIBRARY -----------------

class PromptVersion(BaseModel):
    version: str # v1, v2, ...
    template: str
    variables: List[str] = []
    author: Optional[str] = None
    created_at: str

class Prompt(BaseModel):
    id: str # slug
    name: str
    latest_version: Optional[PromptVersion] = None
    versions: List[PromptVersion] = []
    status: str # prod, staging, dev
    updated_at: str
    author: str

class CreatePromptRequest(BaseModel):
    name: str
    slug: str
    template: str
    author: Optional[str] = "Unknown"
    status: Optional[str] = "dev"
    tags: List[str] = []

class CreateVersionRequest(BaseModel):
    template: str
    author: Optional[str] = "Unknown"

class RenderPromptRequest(BaseModel):
    template: str
    variables: Dict[str, Any]

