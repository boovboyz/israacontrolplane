import { apiClient } from "./client";
import type { Alert } from "@/lib/types";

export const fetchAlerts = async (resolved: boolean = false): Promise<Alert[]> => {
    const response = await apiClient.get<Alert[]>("/alerts", { params: { resolved } });
    return response.data;
};

export const resolveAlert = async (alertId: string): Promise<boolean> => {
    const response = await apiClient.post<boolean>(`/alerts/${alertId}/resolve`);
    return response.data;
};
