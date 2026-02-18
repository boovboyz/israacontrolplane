import type { RunDetail, RunsResponse, ReplayRequest, ReplayResponse, MetricsSummary } from "./types";

const API_BASE = "/api"; // Proxy to backend

export const api = {
    getRuns: async (params?: { q?: string; model?: string; status?: string; min_confidence?: number }): Promise<RunsResponse> => {
        const query = new URLSearchParams();
        if (params?.q) query.append("q", params.q);
        if (params?.model) query.append("model", params.model);
        if (params?.status && params.status !== "all") query.append("status", params.status);
        if (params?.min_confidence) query.append("min_confidence", params.min_confidence.toString());

        const res = await fetch(`${API_BASE}/runs?${query.toString()}`);
        if (!res.ok) throw new Error("Failed to fetch runs");
        return res.json();
    },

    getRunDetails: async (runId: string): Promise<RunDetail> => {
        const res = await fetch(`${API_BASE}/runs/${runId}`);
        if (!res.ok) throw new Error("Failed to fetch run details");
        return res.json();
    },

    getArtifact: async (runId: string, path: string): Promise<string> => {
        const res = await fetch(`${API_BASE}/runs/${runId}/artifact?path=${encodeURIComponent(path)}`);
        if (!res.ok) throw new Error("Failed to fetch artifact");
        return res.text();
    },

    replayRun: async (data: ReplayRequest): Promise<ReplayResponse> => {
        const res = await fetch(`${API_BASE}/replay`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
        });
        if (!res.ok) throw new Error("Replay failed");
        return res.json();
    },

    getMetricsSummary: async (): Promise<MetricsSummary> => {
        const res = await fetch(`${API_BASE}/metrics/summary`);
        if (!res.ok) throw new Error("Failed to fetch metrics");
        return res.json();
    }
};
