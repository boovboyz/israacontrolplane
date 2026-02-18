import { apiClient } from "@/api/client";
import type { EvaluationRequest, EvaluationResponse } from "@/lib/types";

export async function submitEvaluation(data: EvaluationRequest): Promise<EvaluationResponse> {
    const { data: res } = await apiClient.post("/evaluations", data);
    return res;
}
