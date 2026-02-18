import { useState, useMemo } from "react";
import { useQuery } from '@tanstack/react-query';
import { fetchRuns } from '@/api/runs';
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from 'date-fns';
import {
    Loader2, Search, Filter, CheckCircle2,
    Clock, ArrowRight, Activity, RefreshCw
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ConfidenceBadge } from "@/components/ConfidenceBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { Card } from "@/components/ui/card";

export function LiveRuns() {
    const navigate = useNavigate();
    const [filter, setFilter] = useState('');

    const { data, isLoading, refetch, isFetching } = useQuery({
        queryKey: ['runs'],
        queryFn: () => fetchRuns({ limit: 50 }),
        refetchInterval: 5000,
    });

    const runs = data?.runs || [];

    const filteredRuns = useMemo(() => {
        if (!filter) return runs;
        const q = filter.toLowerCase();
        return runs.filter((r: any) =>
            r.run_id.toLowerCase().includes(q) ||
            r.inputs?.prompt?.toLowerCase().includes(q) ||
            (r.model_name || r.model || "").toLowerCase().includes(q)
        );
    }, [runs, filter]);

    // Compute live metrics from real data
    const metrics = useMemo(() => {
        if (!runs.length) return { total: 0, successRate: "0%", avgLatency: "-" };
        const completed = runs.filter((r: any) => r.status === "completed").length;
        const successRate = runs.length > 0 ? ((completed / runs.length) * 100).toFixed(1) + "%" : "0%";
        const latencies = runs.filter((r: any) => r.latency_ms).map((r: any) => r.latency_ms);
        const avgLatency = latencies.length > 0
            ? (latencies.reduce((a: number, b: number) => a + b, 0) / latencies.length / 1000).toFixed(2) + "s"
            : "-";
        return { total: runs.length, successRate, avgLatency };
    }, [runs]);

    return (
        <div className="p-4 space-y-4 h-full overflow-y-auto custom-scrollbar bg-background">
            {/* Page Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div>
                    <div className="flex items-center gap-2">
                        <h1 className="text-2xl font-bold tracking-tight">Live Runs</h1>
                        {isFetching && (
                            <div className="flex items-center gap-1.5 text-xs text-primary">
                                <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                            </div>
                        )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                        Real-time observability of LLM execution traces.
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <div className="relative">
                        <Search className="absolute left-2 top-2 h-3.5 w-3.5 text-muted-foreground" />
                        <Input
                            value={filter}
                            onChange={(e) => setFilter(e.target.value)}
                            placeholder="Filter runs..."
                            className="pl-8 w-[180px] h-8 text-xs"
                        />
                    </div>
                    <Button variant="outline" size="sm" className="gap-2 h-8 text-xs">
                        <Filter className="h-3.5 w-3.5" /> Filters
                    </Button>
                    <Button onClick={() => refetch()} variant="default" size="sm" className="gap-2 h-8 text-xs">
                        <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} /> Live
                    </Button>
                </div>
            </div>

            {/* Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Card className="p-3 flex items-center justify-between hover:shadow-md transition-shadow">
                    <div>
                        <div className="text-xs font-medium text-muted-foreground">Total Runs</div>
                        <div className="text-2xl font-bold mt-0.5">{metrics.total}</div>
                    </div>
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                        <Activity className="h-4 w-4" />
                    </div>
                </Card>
                <Card className="p-3 flex items-center justify-between hover:shadow-md transition-shadow">
                    <div>
                        <div className="text-xs font-medium text-muted-foreground">Success Rate</div>
                        <div className="text-2xl font-bold mt-0.5 text-emerald-500">{metrics.successRate}</div>
                    </div>
                    <div className="h-8 w-8 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                        <CheckCircle2 className="h-4 w-4" />
                    </div>
                </Card>
                <Card className="p-3 flex items-center justify-between hover:shadow-md transition-shadow">
                    <div>
                        <div className="text-xs font-medium text-muted-foreground">Avg Latency</div>
                        <div className="text-2xl font-bold mt-0.5 text-blue-500">{metrics.avgLatency}</div>
                    </div>
                    <div className="h-8 w-8 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500">
                        <Clock className="h-4 w-4" />
                    </div>
                </Card>
            </div>

            {/* Main Data Table */}
            <div className="space-y-3">
                <div className="border rounded-md overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow className="h-8 hover:bg-transparent">
                                <TableHead className="w-[160px] h-8 text-xs">Run ID</TableHead>
                                <TableHead className="w-[100px] h-8 text-xs">Status</TableHead>
                                <TableHead className="w-[140px] h-8 text-xs">Model</TableHead>
                                <TableHead className="h-8 text-xs">Input Preview</TableHead>
                                <TableHead className="w-[100px] text-right h-8 text-xs">Duration</TableHead>
                                <TableHead className="w-[120px] text-right h-8 text-xs">Confidence</TableHead>
                                <TableHead className="w-[140px] text-right h-8 text-xs">Time</TableHead>
                                <TableHead className="w-[40px] h-8"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="h-24 text-center">
                                        <div className="flex flex-col items-center justify-center text-muted-foreground gap-2">
                                            <Loader2 className="h-5 w-5 animate-spin text-primary" />
                                            <span className="text-xs">Loading runs...</span>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : filteredRuns.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="h-24 text-center text-muted-foreground text-xs">
                                        No runs found.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredRuns.map((run: any) => (
                                    <TableRow
                                        key={run.run_id}
                                        onClick={() => navigate(`/runs/${run.run_id}`)}
                                        className="cursor-pointer group h-9 hover:bg-white/[0.02]"
                                    >
                                        <TableCell className="py-1">
                                            <span className="font-mono text-[11px] text-secondary-foreground group-hover:text-primary transition-colors">
                                                {run.run_id.slice(0, 8)}...
                                            </span>
                                        </TableCell>
                                        <TableCell className="py-1">
                                            <div className="scale-90 origin-left">
                                                <StatusBadge status={run.status} />
                                            </div>
                                        </TableCell>
                                        <TableCell className="py-1">
                                            <Badge variant="outline" className="font-mono text-[10px] text-muted-foreground py-0 h-5">
                                                {run.model_name || run.model || "unknown"}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="py-1">
                                            <div className="max-w-[300px] truncate text-[11px] text-muted-foreground font-mono">
                                                {run.inputs?.prompt || run.prompt || "No input prompt captured"}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right py-1 text-[11px] font-mono text-muted-foreground">
                                            {run.latency_ms ? `${(run.latency_ms / 1000).toFixed(2)}s` : "-"}
                                        </TableCell>
                                        <TableCell className="text-right py-1">
                                            <div className="flex justify-end">
                                                <ConfidenceBadge
                                                    score={run.confidence_score !== undefined ? run.confidence_score : run.confidence}
                                                    label={run.confidence_label}
                                                    components={run.confidence_components}
                                                    runId={run.run_id}
                                                />
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right py-1 text-[11px] text-muted-foreground">
                                            {(run.start_time || run.started_at) ? formatDistanceToNow(new Date(run.start_time || run.started_at), { addSuffix: true }) : "-"}
                                        </TableCell>
                                        <TableCell className="py-1">
                                            <ArrowRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>
        </div>
    );
}

function StatusBadge({ status }: { status: string }) {
    if (status === 'completed' || status === 'success') return <Badge variant="success">Completed</Badge>;
    if (status === 'error' || status === 'failed') return <Badge variant="error">Error</Badge>;
    if (status === 'running') return <Badge variant="warning" className="animate-pulse">Running</Badge>;
    return <Badge variant="neutral">{status}</Badge>;
}
