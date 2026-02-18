import { apiClient } from "@/api/client";
import type { RunDetail } from "@/lib/types";

// Re-export Run type for compatibility
export type Run = RunDetail;
export type { RunDetail };

interface RunsResponse {
    runs: RunDetail[];
    total: number;
    models: string[];
    statuses: string[];
}

export async function fetchRuns(params: any): Promise<RunsResponse> {
    const { data } = await apiClient.get("/runs", { params });
    return data;
}

export async function fetchRun(runId: string): Promise<RunDetail> {
    const { data } = await apiClient.get(`/runs/${runId}`);
    // Normalize data if needed
    if (data.started_at && !data.start_time) data.start_time = data.started_at;
    if (!data.confidence_score && data.confidence) data.confidence_score = data.confidence;
    return data;
}

export async function fetchArtifact(runId: string, path: string): Promise<string> {
    const { data } = await apiClient.get(`/runs/${runId}/artifact`, {
        params: { path },
        responseType: 'text'
    });
    return data;
}

export async function replayRun(data: any): Promise<any> {
    const { data: res } = await apiClient.post("/replay", data);
    return res;
}
