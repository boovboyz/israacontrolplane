import { apiClient } from "@/api/client";
import type {
    DashboardSummaryResponse,
    TimeseriesResponse,
    CostByModelItem,
    ConfidenceDistributionResponse,
} from "@/lib/types";

export async function fetchDashboardSummary(range: string = "7d"): Promise<DashboardSummaryResponse> {
    const { data } = await apiClient.get("/metrics/summary", { params: { range } });
    return data;
}

export async function fetchTimeseries(metric: string, range: string): Promise<TimeseriesResponse> {
    const { data } = await apiClient.get("/metrics/timeseries", {
        params: { metric, range }
    });
    return data;
}

export async function fetchCostByModel(range: string): Promise<CostByModelItem[]> {
    const { data } = await apiClient.get("/metrics/cost_by_model", { params: { range } });
    return data;
}

export async function fetchConfidenceDistribution(range: string): Promise<ConfidenceDistributionResponse> {
    const { data } = await apiClient.get("/metrics/confidence_distribution", { params: { range } });
    return data;
}

export async function fetchRecentRuns(range: string, limit: number = 20): Promise<any[]> {
    const { data } = await apiClient.get("/metrics/recent_runs", {
        params: { range, limit }
    });
    return data;
}
