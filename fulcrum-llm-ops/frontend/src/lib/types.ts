// Canonical type definitions — all API layer and components import from here.

export interface RunListItem {
    run_id: string;
    status: "success" | "failed" | "running" | "pending";
    model: string;
    latency_ms?: number;
    cost_usd?: number;
    confidence?: number;
    confidence_label?: "low" | "medium" | "high";
    confidence_components?: Record<string, number>;
    parse_success?: number;
    started_at?: string;
}

export interface ArtifactItem {
    name: string;
    path: string;
    type: "text" | "json" | "file";
}

export interface RunDetail extends RunListItem {
    params: Record<string, any>;
    metrics: Record<string, number>;
    tags: Record<string, string>;
    artifacts: ArtifactItem[];
    input_preview?: Record<string, any>;
    output_preview?: Record<string, any>;

    // Additional fields used in UI
    inputs?: Record<string, any>;
    outputs?: Record<string, any>;
    prompt?: string;
    output?: string;
    context?: Array<{ text: string; score?: number; source?: string }>;
    usage?: { total_tokens: number; prompt_tokens?: number; completion_tokens?: number };
    start_time?: string;
    end_time?: string;
    model_name?: string;
    error?: string;
    confidence_score?: number;
    confidence_label?: "low" | "medium" | "high";
    confidence_components?: Record<string, number>;
    confidence_explanation?: ConfidenceExplanation;
}

export interface ConfidenceExplanation {
    version: string;
    score: number;
    label: string;
    formula: string;
    weights: Record<string, number>;
    components: Record<string, any>;
    evidence: Array<{
        component: string;
        artifact: string;
        path: string;
        excerpt: string;
        note: string;
    }>;
    interpretation: {
        what_it_means: string;
        recommended_usage: string;
        confidence_vs_uncertainty: string;
    };
    limitations: string[];
    improvement_actions: string[];
}

export interface RunsResponse {
    runs: RunListItem[];
    models: string[];
    statuses: string[];
}

export interface ReplayRequest {
    source_run_id: string;
    prompt?: string;
    model: string;
    temperature: number;
}

export interface ReplayResponse {
    new_run_id: string;
    latency_ms: number;
    cost_usd: number;
    confidence: number;
    output_text: string;
    view_run_url: string;
}

// Dashboard Types

export interface MetricsKPIs {
    p50_latency_ms: number;
    p95_latency_ms: number;
    total_cost_usd: number;
    avg_confidence: number;
    parse_success_rate: number;
    run_count: number;
}

export interface DashboardSummaryResponse {
    range: string;
    kpis: MetricsKPIs;
    models: string[];
}

export interface CostByModelItem {
    model: string;
    cost_usd: number;
    run_count: number;
}

export interface ConfidenceBin {
    min: number;
    max: number;
    count: number;
}

export interface ConfidenceDistributionResponse {
    bins: ConfidenceBin[];
}

export interface TimeseriesResponse {
    metric: string;
    points: TimeseriesPoint[];
}

export interface MetricsSummary {
    total_runs: number;
    avg_latency_ms: number;
    p50_latency_ms: number;
    p95_latency_ms: number;
    min_latency_ms: number;
    max_latency_ms: number;
    total_cost_usd: number;
    avg_cost_usd: number;
    avg_confidence: number;
    status_counts: Record<string, number>;
}

export interface TimeseriesPoint {
    timestamp: string;
    value: number;
    run_id: string;
    model: string;
}

export interface EvaluationRequest {
    run_id: string;
    rating: number;
    label: string;
    comment?: string;
}

export interface EvaluationResponse {
    run_id: string;
    rating: number;
    label: string;
    comment: string;
}

export interface CompareRunsResponse {
    runs: RunDetail[];
}

// Replay Studio Types

export interface RunStageArtifacts {
    user_question?: string;
    retrieved_sources?: Record<string, any>[];
    kpi_summary?: Record<string, any>;
    prompt_packet?: string;
    llm_response?: string;
    parsed_forecast?: Record<string, any>[];
    parse_error?: Record<string, any>;
}

export interface RunStagesResponse {
    run_id: string;
    model: string;
    temperature: number;
    confidence?: number;
    confidence_label?: string;
    confidence_components?: Record<string, number>;
    stages: RunStageArtifacts;
}

export interface ReplayOverrides {
    user_question?: string;
    retrieved_sources?: Record<string, any>[];
    kpi_summary?: Record<string, any>;
    prompt_packet?: string;
    llm_response?: string;
}

export interface ReplayOptions {
    recompute_retrieval: boolean;
    recompute_kpi: boolean;
}

export interface ReplayStagedRequest {
    source_run_id: string;
    replay_from_stage: number;
    overrides: ReplayOverrides;
    options: ReplayOptions;
    model: string;
    temperature: number;
}

export interface ReplayStagedResponse {
    new_run_id: string;
    output_text?: string;
    parsed_forecast?: Record<string, any>[];
    metrics: {
        latency_ms: number;
        cost_usd: number;
        confidence: number;
        parse_success: number;
    };
}

export interface Alert {
    id: string;
    run_id?: string;
    type: string;
    severity: "low" | "medium" | "high";
    message: string;
    created_at: string;
    is_resolved: boolean;
}

