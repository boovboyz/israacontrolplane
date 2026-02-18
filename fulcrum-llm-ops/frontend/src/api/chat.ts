import { apiClient } from "@/api/client";

export interface ChatRequest {
    message: string;
    model?: string;
    top_k?: number;
    retrieval_enabled?: boolean;
    session_id?: string;
}

export interface ChatResponse {
    response: string;
    run_id: string | null;
    session_id?: string;
    guardrails?: any;
    context?: any[];
}

export async function sendChatMessage(data: ChatRequest): Promise<ChatResponse> {
    const response = await apiClient.post<ChatResponse>("/chat/", data);
    return response.data;
}
