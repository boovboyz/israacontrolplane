import { apiClient } from "@/api/client";

export interface PromptVersion {
    version: string;
    template: string;
    variables: string[];
    author?: string;
    created_at: string;
}

export interface Prompt {
    id: string; // slug
    name: string;
    latest_version?: PromptVersion;
    versions: PromptVersion[];
    status: "prod" | "staging" | "dev";
    updated_at: string;
    author: string;
}

export interface CreatePromptRequest {
    name: string;
    slug: string;
    template: string;
    author?: string;
    status?: string;
    tags?: string[];
}

export interface CreateVersionRequest {
    template: string;
    author?: string;
}

export async function fetchPrompts(): Promise<Prompt[]> {
    const response = await apiClient.get<Prompt[]>("/prompts");
    return response.data;
}

export async function fetchPrompt(slug: string): Promise<Prompt> {
    const response = await apiClient.get<Prompt>(`/prompts/${slug}`);
    return response.data;
}

export async function createPrompt(data: CreatePromptRequest): Promise<Prompt> {
    const response = await apiClient.post<Prompt>("/prompts", data);
    return response.data;
}

export async function createPromptVersion(slug: string, data: CreateVersionRequest): Promise<Prompt> {
    const response = await apiClient.post<Prompt>(`/prompts/${slug}/versions`, data);
    return response.data;
}
