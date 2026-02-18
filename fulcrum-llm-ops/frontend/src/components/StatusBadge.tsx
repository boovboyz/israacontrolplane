import { Badge } from "@/components/ui/badge";

interface StatusBadgeProps {
    status: string;
}

export function StatusBadge({ status }: StatusBadgeProps) {
    if (status === 'completed') return <Badge variant="success">Completed</Badge>;
    if (status === 'error') return <Badge variant="error">Error</Badge>;
    if (status === 'running') return <Badge variant="warning">Running</Badge>;
    return <Badge variant="neutral">{status}</Badge>;
}
