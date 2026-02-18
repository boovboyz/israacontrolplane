import { apiClient } from "@/api/client";
import type { CompareRunsResponse } from "@/lib/types";

export async function fetchCompareRuns(runIds: string[]): Promise<CompareRunsResponse> {
    const { data } = await apiClient.get("/compare", {
        params: { run_ids: runIds.join(",") }
    });
    return data;
}
