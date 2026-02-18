import { Card } from "@/components/ui/card";
import { type LucideIcon } from "lucide-react";

interface MetricCardProps {
    label: string;
    value: string | number;
    icon: LucideIcon;
    color: string;
    bg: string;
}

export function MetricCard({ label, value, icon: Icon, color, bg }: MetricCardProps) {
    return (
        <Card className="p-4 flex items-center gap-4 hover:border-white/10 transition-colors">
            <div className={`h-12 w-12 rounded-xl ${bg} flex items-center justify-center ${color}`}>
                <Icon className="h-6 w-6" />
            </div>
            <div>
                <div className="text-sm text-muted-foreground font-medium">{label}</div>
                <div className={`text-xl font-bold tracking-tight ${color}`}>{value}</div>
            </div>
        </Card>
    );
}
