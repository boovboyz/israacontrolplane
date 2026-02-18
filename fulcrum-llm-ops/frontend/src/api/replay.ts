import { apiClient } from "./client";
import type {
    ReplayRequest, ReplayResponse,
    RunStagesResponse, ReplayStagedRequest, ReplayStagedResponse
} from "@/lib/types";

export const runReplay = async (data: ReplayRequest): Promise<ReplayResponse> => {
    const res = await apiClient.post("/replay", data);
    return res.data;
};

// New Staged Replay API

export const fetchRunStages = async (runId: string): Promise<RunStagesResponse> => {
    const res = await apiClient.get(`/replay/runs/${runId}/stages`);
    return res.data;
};

export const runStagedReplay = async (data: ReplayStagedRequest): Promise<ReplayStagedResponse> => {
    const res = await apiClient.post("/replay/staged", data);
    return res.data;
};
