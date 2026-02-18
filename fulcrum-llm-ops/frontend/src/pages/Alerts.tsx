import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchAlerts, resolveAlert } from "@/api/alerts";
import { Alert } from "@/lib/types";
import { Bell, AlertTriangle, CheckCircle, Clock, Check } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Link } from "react-router-dom";

export function AlertsPage() {
    const queryClient = useQueryClient();
    const [filter, setFilter] = useState<"active" | "resolved">("active");

    const { data: alerts, isLoading } = useQuery({
        queryKey: ["alerts", filter],
        queryFn: () => fetchAlerts(filter === "resolved"),
        refetchInterval: 5000
    });

    const resolveMutation = useMutation({
        mutationFn: resolveAlert,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["alerts"] });
            toast.success("Alert resolved");
        },
        onError: () => {
            toast.error("Failed to resolve alert");
        }
    });

    const stats = {
        critical: alerts?.filter(a => a.severity === "high").length || 0,
        warning: alerts?.filter(a => a.severity === "medium").length || 0,
        info: alerts?.filter(a => a.severity === "low").length || 0,
    };

    return (
        <div className="p-6 space-y-6 h-full overflow-y-auto">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight">Alerts</h1>
                    <p className="text-muted-foreground">Monitor system anomalies and trigger configurations</p>
                </div>
                <div className="flex gap-2">
                    <div className="bg-muted/50 p-1 rounded-lg flex items-center">
                        <Button
                            variant={filter === "active" ? "secondary" : "ghost"}
                            size="sm"
                            onClick={() => setFilter("active")}
                            className="text-xs"
                        >
                            Active
                        </Button>
                        <Button
                            variant={filter === "resolved" ? "secondary" : "ghost"}
                            size="sm"
                            onClick={() => setFilter("resolved")}
                            className="text-xs"
                        >
                            Resolved
                        </Button>
                    </div>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-lg bg-card border shadow-sm flex items-center gap-4">
                    <div className="p-3 bg-red-500/10 text-red-500 rounded-lg"><AlertTriangle className="h-6 w-6" /></div>
                    <div>
                        <div className="text-2xl font-bold">{stats.critical}</div>
                        <div className="text-xs text-muted-foreground">Critical Alerts</div>
                    </div>
                </div>
                <div className="p-4 rounded-lg bg-card border shadow-sm flex items-center gap-4">
                    <div className="p-3 bg-yellow-500/10 text-yellow-500 rounded-lg"><Bell className="h-6 w-6" /></div>
                    <div>
                        <div className="text-2xl font-bold">{stats.warning}</div>
                        <div className="text-xs text-muted-foreground">Warnings</div>
                    </div>
                </div>
                <div className="p-4 rounded-lg bg-card border shadow-sm flex items-center gap-4">
                    <div className="p-3 bg-blue-500/10 text-blue-500 rounded-lg"><CheckCircle className="h-6 w-6" /></div>
                    <div>
                        <div className="text-2xl font-bold">{stats.info}</div>
                        <div className="text-xs text-muted-foreground">Info / Low Severity</div>
                    </div>
                </div>
            </div>

            <h2 className="text-lg font-semibold mt-8">{filter === "active" ? "Active Alerts" : "Resolved History"}</h2>

            <div className="space-y-3">
                {isLoading ? (
                    <div className="p-8 text-center text-muted-foreground animate-pulse">Loading alerts...</div>
                ) : alerts && alerts.length > 0 ? (
                    alerts.map((alert) => (
                        <AlertCard
                            key={alert.id}
                            alert={alert}
                            onResolve={() => resolveMutation.mutate(alert.id)}
                            isResolving={resolveMutation.isPending}
                        />
                    ))
                ) : (
                    <div className="border rounded-lg overflow-hidden bg-white/[0.02]">
                        <div className="p-12 text-center text-muted-foreground flex flex-col items-center">
                            <CheckCircle className="h-12 w-12 mb-4 text-emerald-500/20" />
                            <h3 className="text-lg font-medium text-foreground">No {filter} alerts</h3>
                            <p className="max-w-sm mx-auto mt-2 text-sm">
                                {filter === "active" ? "All systems nominal. You're good to go." : "No resolved alerts allowed yet."}
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

function AlertCard({ alert, onResolve, isResolving }: { alert: Alert, onResolve: () => void, isResolving: boolean }) {
    const isResolved = alert.is_resolved;

    // Severity styles
    const severityStyles = {
        high: "border-red-500/20 bg-red-500/5",
        medium: "border-yellow-500/20 bg-yellow-500/5",
        low: "border-blue-500/20 bg-blue-500/5"
    };

    const iconStyles = {
        high: "text-red-500",
        medium: "text-yellow-500",
        low: "text-blue-500"
    };

    return (
        <div className={`p-4 rounded-lg border flex flex-col md:flex-row gap-4 items-start md:items-center justify-between transition-all hover:bg-white/[0.02] ${severityStyles[alert.severity]}`}>
            <div className="flex gap-4 items-start">
                <div className={`p-2 rounded-full bg-background/50 border border-white/5 ${iconStyles[alert.severity]}`}>
                    {alert.severity === 'high' ? <AlertTriangle className="h-5 w-5" /> : <Bell className="h-5 w-5" />}
                </div>
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-sm">{alert.type.replace(/_/g, " ")}</h3>
                        <Badge variant="outline" className="text-[10px] uppercase">{alert.severity}</Badge>
                        {alert.run_id && (
                            <Link to={`/runs/${alert.run_id}`} className="text-[10px] items-center text-muted-foreground hover:text-primary underline flex gap-1">
                                Run: <span className="font-mono">{alert.run_id.slice(0, 8)}</span>
                            </Link>
                        )}
                    </div>
                    <p className="text-sm text-muted-foreground">{alert.message}</p>
                    <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground/60">
                        <Clock className="h-3 w-3" />
                        <span>{formatDistanceToNow(new Date(alert.created_at), { addSuffix: true })}</span>
                    </div>
                </div>
            </div>

            {!isResolved ? (
                <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 shrink-0 border-white/10 hover:bg-emerald-500/10 hover:text-emerald-500 hover:border-emerald-500/20"
                    onClick={onResolve}
                    disabled={isResolving}
                >
                    <Check className="h-4 w-4" /> Resolve
                </Button>
            ) : (
                <Badge variant="secondary" className="gap-1 bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
                    <CheckCircle className="h-3 w-3" /> Resolved
                </Badge>
            )}
        </div>
    );
}
