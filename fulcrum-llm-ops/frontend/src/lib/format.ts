import { format, parseISO } from "date-fns";

export const formatCurrency = (val?: number) => {
    if (val === undefined || val === null) return "-";
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 4 }).format(val);
};

export const formatLatency = (ms?: number) => {
    if (ms === undefined || ms === null) return "-";
    return `${ms.toFixed(0)} ms`;
};

export const formatConfidence = (val?: number) => {
    if (val === undefined || val === null) return "-";
    return `${(val * 100).toFixed(1)}%`;
};

export const formatDate = (dateStr?: string) => {
    if (!dateStr) return "-";
    try {
        return format(parseISO(dateStr), "MMM d, HH:mm:ss");
    } catch (e) {
        return dateStr;
    }
};
