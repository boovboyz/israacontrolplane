import { useState, useMemo, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
    fetchDashboardSummary,
    fetchTimeseries,
    fetchCostByModel,
    fetchConfidenceDistribution,
    fetchRecentRuns,
} from "@/api/metrics";
import type { RunListItem } from "@/lib/types";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Activity,
    Clock,
    AlertTriangle,
    DollarSign,
    Loader2,
    Calendar,
    RefreshCw,
    BarChart3,
    Target,
    ArrowUpRight,
    Copy,
    Check,
    ChevronUp,
    ChevronDown,
    Inbox,
} from "lucide-react";
import {
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    BarChart,
    Bar,
    Area,
    AreaChart,
} from "recharts";
import { formatDistanceToNow } from "date-fns";
import { Link } from "react-router-dom";
import { toast } from "sonner";

/* ------------------------------------------------------------------ */
/*  Skeleton helpers                                                    */
/* ------------------------------------------------------------------ */

const Skeleton = ({ className = "" }: { className?: string }) => (
    <div className={`animate-pulse rounded-md bg-muted/60 ${className}`} />
);

const KPICardSkeleton = () => (
    <Card className="p-5 border-l-4 border-l-muted/30">
        <div className="flex justify-between items-start">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-8 w-8 rounded-lg" />
        </div>
        <div className="mt-3 space-y-2">
            <Skeleton className="h-7 w-24" />
            <Skeleton className="h-3 w-16" />
        </div>
    </Card>
);

const ChartSkeleton = ({ title }: { title: string }) => (
    <Card>
        <CardHeader>
            <CardTitle className="text-sm">{title}</CardTitle>
        </CardHeader>
        <CardContent className="h-[300px] flex items-center justify-center">
            <div className="text-center space-y-3">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground mx-auto" />
                <p className="text-xs text-muted-foreground">Loading chart data...</p>
            </div>
        </CardContent>
    </Card>
);

/* ------------------------------------------------------------------ */
/*  Empty state                                                         */
/* ------------------------------------------------------------------ */

const EmptyState = ({ message }: { message: string }) => (
    <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="p-4 bg-muted/30 rounded-full mb-4">
            <Inbox className="h-8 w-8 text-muted-foreground" />
        </div>
        <p className="text-sm text-muted-foreground max-w-xs">{message}</p>
    </div>
);

const ChartEmpty = ({ title, message }: { title: string; message: string }) => (
    <Card>
        <CardHeader>
            <CardTitle className="text-sm">{title}</CardTitle>
        </CardHeader>
        <CardContent className="h-[300px]">
            <EmptyState message={message} />
        </CardContent>
    </Card>
);

/* ------------------------------------------------------------------ */
/*  KPI card                                                            */
/* ------------------------------------------------------------------ */

const KPICard = ({
    title,
    value,
    icon: Icon,
    subtext,
}: {
    title: string;
    value: string | number;
    icon: React.ElementType;
    subtext?: string;
}) => (
    <Card className="p-5 flex flex-col justify-between hover:shadow-md transition-all border-l-4 border-l-primary/20">
        <div className="flex justify-between items-start">
            <div className="text-sm font-medium text-muted-foreground">{title}</div>
            <div className="p-2 bg-primary/10 rounded-lg text-primary">
                <Icon className="h-4 w-4" />
            </div>
        </div>
        <div className="mt-3">
            <div className="text-2xl font-bold tracking-tight">{value}</div>
            {subtext && (
                <div className="text-xs text-muted-foreground mt-1">{subtext}</div>
            )}
        </div>
    </Card>
);

/* ------------------------------------------------------------------ */
/*  Custom chart tooltip                                                */
/* ------------------------------------------------------------------ */

const TOOLTIP_STYLE = {
    backgroundColor: "hsl(222 15% 7%)",
    border: "1px solid hsl(217 33% 15%)",
    borderRadius: "8px",
    fontSize: "12px",
};

const LABEL_STYLE = { color: "#94a3b8" };

/* ------------------------------------------------------------------ */
/*  Sortable table types                                               */
/* ------------------------------------------------------------------ */

type SortKey =
    | "started_at"
    | "latency_ms"
    | "cost_usd"
    | "confidence"
    | "status"
    | "model";
type SortDir = "asc" | "desc";

/* ------------------------------------------------------------------ */
/*  Copy-to-clipboard button                                           */
/* ------------------------------------------------------------------ */

function CopyButton({ text }: { text: string }) {
    const [copied, setCopied] = useState(false);

    const handleCopy = useCallback(
        (e: React.MouseEvent) => {
            e.preventDefault();
            e.stopPropagation();
            navigator.clipboard.writeText(text).then(() => {
                setCopied(true);
                toast.success("Run ID copied");
                setTimeout(() => setCopied(false), 1500);
            });
        },
        [text]
    );

    return (
        <button
            onClick={handleCopy}
            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-white/10"
            title="Copy Run ID"
        >
            {copied ? (
                <Check className="h-3 w-3 text-emerald-400" />
            ) : (
                <Copy className="h-3 w-3 text-muted-foreground" />
            )}
        </button>
    );
}

/* ------------------------------------------------------------------ */
/*  Table Charts (Visualizes the current table rows)                   */
/* ------------------------------------------------------------------ */

const TableCharts = ({ runs }: { runs: RunListItem[] }) => {
    // Only show if we have runs
    if (!runs || runs.length === 0) return null;

    // Transform data for recharts
    // We strictly follow the table's sort order
    const data = runs.map((r) => ({
        id: r.run_id.substring(0, 6),
        fullId: r.run_id,
        latency: r.latency_ms ?? 0,
        cost: r.cost_usd ?? 0,
        confidence: (r.confidence ?? 0) * 100,
        status: r.status,
    }));

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Latency Bar Chart */}
            <Card className="border-l-4 border-l-blue-500/20">
                <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Latency (ms) - current view
                    </CardTitle>
                </CardHeader>
                <CardContent className="h-[180px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data}>
                            <Tooltip
                                contentStyle={TOOLTIP_STYLE}
                                cursor={{ fill: "hsl(217 33% 12% / 0.5)" }}
                                formatter={(val: any) => [`${Math.round(val)}ms`, "Latency"]}
                                labelFormatter={(label) => `Run: ${label}`}
                            />
                            <Bar
                                dataKey="latency"
                                fill="#3b82f6"
                                radius={[2, 2, 0, 0]}
                                maxBarSize={40}
                            />
                        </BarChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>

            {/* Cost Bar Chart */}
            <Card className="border-l-4 border-l-emerald-500/20">
                <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Cost ($) - current view
                    </CardTitle>
                </CardHeader>
                <CardContent className="h-[180px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data}>
                            <Tooltip
                                contentStyle={TOOLTIP_STYLE}
                                cursor={{ fill: "hsl(217 33% 12% / 0.5)" }}
                                formatter={(val: any) => [`$${val.toFixed(4)}`, "Cost"]}
                                labelFormatter={(label) => `Run: ${label}`}
                            />
                            <Bar
                                dataKey="cost"
                                fill="#10b981"
                                radius={[2, 2, 0, 0]}
                                maxBarSize={40}
                            />
                        </BarChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>

            {/* Confidence Area/Bar Chart */}
            <Card className="border-l-4 border-l-amber-500/20">
                <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Confidence (%) - current view
                    </CardTitle>
                </CardHeader>
                <CardContent className="h-[180px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={data}>
                            <defs>
                                <linearGradient id="confGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <Tooltip
                                contentStyle={TOOLTIP_STYLE}
                                cursor={{ stroke: "hsl(217 33% 15%)" }}
                                formatter={(val: any) => [`${val.toFixed(0)}%`, "Confidence"]}
                                labelFormatter={(label) => `Run: ${label}`}
                            />
                            <Area
                                type="monotone"
                                dataKey="confidence"
                                stroke="#f59e0b"
                                fill="url(#confGrad)"
                                strokeWidth={2}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>
        </div>
    );
};

/* ================================================================== */
/*  MAIN COMPONENT                                                     */
/* ================================================================== */

export function Metrics() {
    const [range, setRange] = useState("7d");
    const [sortKey, setSortKey] = useState<SortKey>("started_at");
    const [sortDir, setSortDir] = useState<SortDir>("desc");
    const [filterModel, setFilterModel] = useState<string>("all");
    const [filterStatus, setFilterStatus] = useState<string>("all");

    const queryClient = useQueryClient();

    /* ---- Parallel data queries ---- */
    const summary = useQuery({
        queryKey: ["metrics-summary", range],
        queryFn: () => fetchDashboardSummary(range),
    });
    const latencySeries = useQuery({
        queryKey: ["metrics-latency", range],
        queryFn: () => fetchTimeseries("latency_ms", range),
    });
    const costSeries = useQuery({
        queryKey: ["metrics-cost", range],
        queryFn: () => fetchTimeseries("cost_usd", range),
    });
    const costByModel = useQuery({
        queryKey: ["metrics-model-cost", range],
        queryFn: () => fetchCostByModel(range),
    });
    const confidenceDist = useQuery({
        queryKey: ["metrics-confidence", range],
        queryFn: () => fetchConfidenceDistribution(range),
    });
    const recentRuns = useQuery({
        queryKey: ["metrics-recent", range],
        queryFn: () => fetchRecentRuns(range, 100),
    });

    const isRefreshing =
        summary.isFetching ||
        latencySeries.isFetching ||
        costSeries.isFetching ||
        costByModel.isFetching ||
        confidenceDist.isFetching ||
        recentRuns.isFetching;

    const handleRefresh = () => {
        queryClient.invalidateQueries({ queryKey: ["metrics-summary", range] });
        queryClient.invalidateQueries({ queryKey: ["metrics-latency", range] });
        queryClient.invalidateQueries({ queryKey: ["metrics-cost", range] });
        queryClient.invalidateQueries({ queryKey: ["metrics-model-cost", range] });
        queryClient.invalidateQueries({ queryKey: ["metrics-confidence", range] });
        queryClient.invalidateQueries({ queryKey: ["metrics-recent", range] });
    };

    const kpis = summary.data?.kpis;
    const models = summary.data?.models ?? [];

    /* ---- Table: filter + sort ---- */
    const filteredRuns = useMemo(() => {
        let runs: RunListItem[] = recentRuns.data ?? [];
        if (filterModel !== "all") {
            runs = runs.filter((r) => r.model === filterModel);
        }
        if (filterStatus !== "all") {
            runs = runs.filter((r) => r.status === filterStatus);
        }
        return runs;
    }, [recentRuns.data, filterModel, filterStatus]);

    const sortedRuns = useMemo(() => {
        const arr = [...filteredRuns];
        arr.sort((a, b) => {
            let aVal: any = (a as any)[sortKey] ?? 0;
            let bVal: any = (b as any)[sortKey] ?? 0;
            if (sortKey === "started_at") {
                aVal = aVal ? new Date(aVal).getTime() : 0;
                bVal = bVal ? new Date(bVal).getTime() : 0;
            }
            if (typeof aVal === "string") {
                return sortDir === "asc"
                    ? aVal.localeCompare(bVal)
                    : bVal.localeCompare(aVal);
            }
            return sortDir === "asc" ? aVal - bVal : bVal - aVal;
        });
        return arr;
    }, [filteredRuns, sortKey, sortDir]);

    const toggleSort = (key: SortKey) => {
        if (sortKey === key) {
            setSortDir((d) => (d === "asc" ? "desc" : "asc"));
        } else {
            setSortKey(key);
            setSortDir("desc");
        }
    };

    const SortIcon = ({ col }: { col: SortKey }) => {
        if (sortKey !== col)
            return (
                <ChevronDown className="h-3 w-3 text-muted-foreground/40 ml-1 inline" />
            );
        return sortDir === "asc" ? (
            <ChevronUp className="h-3 w-3 text-primary ml-1 inline" />
        ) : (
            <ChevronDown className="h-3 w-3 text-primary ml-1 inline" />
        );
    };

    /* ---- Unique statuses for filter ---- */
    const statuses = useMemo(() => {
        const s = new Set<string>();
        (recentRuns.data ?? []).forEach((r: RunListItem) => s.add(r.status));
        return Array.from(s);
    }, [recentRuns.data]);

    /* ---- Status badge helper ---- */
    const statusBadge = (status: string) => {
        const variant =
            status === "success"
                ? "success"
                : status === "failed"
                    ? "error"
                    : status === "running"
                        ? "warning"
                        : "neutral";
        return <Badge variant={variant}>{status}</Badge>;
    };

    /* ---- Parse success badge ---- */
    const parseBadge = (val?: number) => {
        if (val === undefined || val === null) return <span className="text-muted-foreground">-</span>;
        return val >= 1 ? (
            <Badge variant="success">Pass</Badge>
        ) : (
            <Badge variant="error">Fail</Badge>
        );
    };

    /* ================================================================ */
    /*  RENDER                                                          */
    /* ================================================================ */

    return (
        <div className="p-5 space-y-5 h-full overflow-y-auto custom-scrollbar bg-background">
            {/* ---- HEADER ---- */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Metrics</h1>
                    <p className="text-xs text-muted-foreground mt-1">
                        System health, cost analysis, and model performance.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Select value={range} onValueChange={setRange}>
                        <SelectTrigger className="w-[120px] h-8 text-xs">
                            <Calendar className="mr-2 h-3.5 w-3.5" />
                            <SelectValue placeholder="Range" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="24h">Last 24h</SelectItem>
                            <SelectItem value="7d">Last 7 Days</SelectItem>
                            <SelectItem value="30d">Last 30 Days</SelectItem>
                            <SelectItem value="90d">Last 90 Days</SelectItem>
                        </SelectContent>
                    </Select>
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={handleRefresh}
                        disabled={isRefreshing}
                        title="Refresh data"
                        className="h-8 w-8"
                    >
                        <RefreshCw
                            className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`}
                        />
                    </Button>
                </div>
            </div>

            {/* ---- KPI CARDS ---- */}
            {summary.isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <KPICardSkeleton key={i} />
                    ))}
                </div>
            ) : kpis && kpis.run_count > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
                    <KPICard
                        title="Total Runs"
                        value={kpis.run_count.toLocaleString()}
                        icon={Activity}
                        subtext="In selected range"
                    />
                    <KPICard
                        title="P50 Latency"
                        value={`${Math.round(kpis.p50_latency_ms)}ms`}
                        icon={Clock}
                        subtext="Median response"
                    />
                    <KPICard
                        title="P95 Latency"
                        value={`${Math.round(kpis.p95_latency_ms)}ms`}
                        icon={AlertTriangle}
                        subtext="Tail latency"
                    />
                    <KPICard
                        title="Total Cost"
                        value={`$${kpis.total_cost_usd.toFixed(2)}`}
                        icon={DollarSign}
                        subtext="Estimated token cost"
                    />
                    <KPICard
                        title="Avg Confidence"
                        value={`${(kpis.avg_confidence * 100).toFixed(1)}%`}
                        icon={Target}
                        subtext="Model certainty"
                    />
                    <KPICard
                        title="Parse Success"
                        value={`${(kpis.parse_success_rate * 100).toFixed(1)}%`}
                        icon={BarChart3}
                        subtext="JSON validity"
                    />
                </div>
            ) : (
                <Card className="p-6">
                    <EmptyState message="No runs found in the selected time range. Run some predictions to see metrics here." />
                </Card>
            )}

            {/* ---- CHARTS GRID ---- */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* 1. Latency Trend */}
                {latencySeries.isLoading ? (
                    <ChartSkeleton title="Latency Trend (ms)" />
                ) : !latencySeries.data?.points?.length ? (
                    <ChartEmpty
                        title="Latency Trend (ms)"
                        message="No latency data available for this range."
                    />
                ) : (
                    <Card>
                        <CardHeader className="py-3 px-4">
                            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Latency Trend (ms)</CardTitle>
                        </CardHeader>
                        <CardContent className="h-[250px] p-4 pt-0">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={latencySeries.data.points}>
                                    <defs>
                                        <linearGradient
                                            id="latencyGrad"
                                            x1="0"
                                            y1="0"
                                            x2="0"
                                            y2="1"
                                        >
                                            <stop
                                                offset="5%"
                                                stopColor="#3b82f6"
                                                stopOpacity={0.3}
                                            />
                                            <stop
                                                offset="95%"
                                                stopColor="#3b82f6"
                                                stopOpacity={0}
                                            />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid
                                        strokeDasharray="3 3"
                                        stroke="hsl(217 33% 15%)"
                                        vertical={false}
                                    />
                                    <XAxis
                                        dataKey="timestamp"
                                        tickFormatter={(t: string) => t.substring(5, 10)}
                                        stroke="#666"
                                        fontSize={10}
                                        tickLine={false}
                                        axisLine={false}
                                    />
                                    <YAxis
                                        stroke="#666"
                                        fontSize={10}
                                        tickLine={false}
                                        axisLine={false}
                                        tickFormatter={(v: number) => `${Math.round(v)}`}
                                    />
                                    <Tooltip
                                        contentStyle={TOOLTIP_STYLE}
                                        labelStyle={LABEL_STYLE}
                                        formatter={(v: any) => [
                                            `${Math.round(v)}ms`,
                                            "Latency",
                                        ]}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="value"
                                        stroke="#3b82f6"
                                        strokeWidth={2}
                                        fill="url(#latencyGrad)"
                                        dot={false}
                                        activeDot={{ r: 4, strokeWidth: 0 }}
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                )}

                {/* 2. Cost Trend */}
                {costSeries.isLoading ? (
                    <ChartSkeleton title="Cost Accumulation (USD)" />
                ) : !costSeries.data?.points?.length ? (
                    <ChartEmpty
                        title="Cost Accumulation (USD)"
                        message="No cost data available for this range."
                    />
                ) : (
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-sm">
                                Cost Accumulation (USD)
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={costSeries.data.points}>
                                    <defs>
                                        <linearGradient
                                            id="costGrad"
                                            x1="0"
                                            y1="0"
                                            x2="0"
                                            y2="1"
                                        >
                                            <stop
                                                offset="5%"
                                                stopColor="#10b981"
                                                stopOpacity={0.3}
                                            />
                                            <stop
                                                offset="95%"
                                                stopColor="#10b981"
                                                stopOpacity={0}
                                            />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid
                                        strokeDasharray="3 3"
                                        stroke="hsl(217 33% 15%)"
                                        vertical={false}
                                    />
                                    <XAxis
                                        dataKey="timestamp"
                                        tickFormatter={(t: string) => t.substring(5, 10)}
                                        stroke="#666"
                                        fontSize={11}
                                        tickLine={false}
                                        axisLine={false}
                                    />
                                    <YAxis
                                        stroke="#666"
                                        fontSize={11}
                                        tickLine={false}
                                        axisLine={false}
                                        tickFormatter={(v: number) => `$${v.toFixed(3)}`}
                                    />
                                    <Tooltip
                                        contentStyle={TOOLTIP_STYLE}
                                        labelStyle={LABEL_STYLE}
                                        formatter={(v: any) => [
                                            `$${v.toFixed(4)}`,
                                            "Cost",
                                        ]}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="value"
                                        stroke="#10b981"
                                        strokeWidth={2}
                                        fill="url(#costGrad)"
                                        dot={false}
                                        activeDot={{ r: 4, strokeWidth: 0 }}
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                )}

                {/* 3. Cost by Model */}
                {costByModel.isLoading ? (
                    <ChartSkeleton title="Cost by Model" />
                ) : !costByModel.data?.length ? (
                    <ChartEmpty
                        title="Cost by Model"
                        message="No model cost data available for this range."
                    />
                ) : (
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-sm">Cost by Model</CardTitle>
                        </CardHeader>
                        <CardContent className="h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                    data={costByModel.data}
                                    layout="vertical"
                                    margin={{ left: 10, right: 20 }}
                                >
                                    <CartesianGrid
                                        strokeDasharray="3 3"
                                        stroke="hsl(217 33% 15%)"
                                        horizontal={false}
                                    />
                                    <XAxis
                                        type="number"
                                        stroke="#666"
                                        fontSize={11}
                                        tickLine={false}
                                        axisLine={false}
                                        tickFormatter={(v: number) => `$${v.toFixed(2)}`}
                                    />
                                    <YAxis
                                        dataKey="model"
                                        type="category"
                                        width={110}
                                        stroke="#666"
                                        fontSize={10}
                                        tickLine={false}
                                        axisLine={false}
                                    />
                                    <Tooltip
                                        cursor={{ fill: "hsl(217 33% 12% / 0.5)" }}
                                        contentStyle={TOOLTIP_STYLE}
                                        formatter={(v: any, _: any, entry: any) => [
                                            `$${v.toFixed(4)} (${entry.payload.run_count} runs)`,
                                            "Cost",
                                        ]}
                                    />
                                    <Bar
                                        dataKey="cost_usd"
                                        fill="#8b5cf6"
                                        radius={[0, 4, 4, 0]}
                                        barSize={22}
                                    />
                                </BarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                )}

                {/* 4. Confidence Distribution */}
                {confidenceDist.isLoading ? (
                    <ChartSkeleton title="Confidence Distribution" />
                ) : !confidenceDist.data?.bins?.some((b) => b.count > 0) ? (
                    <ChartEmpty
                        title="Confidence Distribution"
                        message="No confidence data available for this range."
                    />
                ) : (
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-sm">
                                Confidence Distribution
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={confidenceDist.data.bins}>
                                    <CartesianGrid
                                        strokeDasharray="3 3"
                                        vertical={false}
                                        stroke="hsl(217 33% 15%)"
                                    />
                                    <XAxis
                                        dataKey="min"
                                        type="category"
                                        stroke="#666"
                                        fontSize={11}
                                        tickLine={false}
                                        axisLine={false}
                                        tickFormatter={(val: number) =>
                                            `${(val * 100).toFixed(0)}%`
                                        }
                                    />
                                    <YAxis
                                        stroke="#666"
                                        fontSize={11}
                                        tickLine={false}
                                        axisLine={false}
                                        allowDecimals={false}
                                    />
                                    <Tooltip
                                        contentStyle={TOOLTIP_STYLE}
                                        formatter={(v: any) => [v, "Runs"]}
                                        labelFormatter={(val: any) =>
                                            `${(val * 100).toFixed(0)}% - ${((val + 0.1) * 100).toFixed(0)}%`
                                        }
                                    />
                                    <Bar
                                        dataKey="count"
                                        fill="#f59e0b"
                                        radius={[4, 4, 0, 0]}
                                        barSize={32}
                                    />
                                </BarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                )}
            </div>

            {/* ---- RECENT RUNS TABLE ---- */}
            <TableCharts runs={sortedRuns} />
            <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-4">
                    <CardTitle className="text-lg">Recent Runs</CardTitle>
                    <div className="flex items-center gap-3">
                        {/* Model filter */}
                        <Select value={filterModel} onValueChange={setFilterModel}>
                            <SelectTrigger className="w-[150px] h-8 text-xs">
                                <SelectValue placeholder="All models" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All models</SelectItem>
                                {models.map((m) => (
                                    <SelectItem key={m} value={m}>
                                        {m}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        {/* Status filter */}
                        <Select value={filterStatus} onValueChange={setFilterStatus}>
                            <SelectTrigger className="w-[120px] h-8 text-xs">
                                <SelectValue placeholder="All statuses" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All statuses</SelectItem>
                                {statuses.map((s) => (
                                    <SelectItem key={s} value={s}>
                                        {s}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Link to="/runs">
                            <Button variant="ghost" size="sm" className="gap-1 h-8">
                                View All <ArrowUpRight className="h-3.5 w-3.5" />
                            </Button>
                        </Link>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    {recentRuns.isLoading ? (
                        <div className="p-8">
                            <div className="space-y-3">
                                {Array.from({ length: 5 }).map((_, i) => (
                                    <Skeleton key={i} className="h-10 w-full" />
                                ))}
                            </div>
                        </div>
                    ) : !sortedRuns.length ? (
                        <EmptyState
                            message={
                                filterModel !== "all" || filterStatus !== "all"
                                    ? "No runs match the selected filters."
                                    : "No runs found in this time range."
                            }
                        />
                    ) : (
                        <div className="relative overflow-x-auto max-h-[480px] overflow-y-auto custom-scrollbar">
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs uppercase text-muted-foreground bg-muted/50 sticky top-0 z-10">
                                    <tr>
                                        <th className="px-4 py-3">Run ID</th>
                                        <th
                                            className="px-4 py-3 cursor-pointer select-none hover:text-foreground transition-colors"
                                            onClick={() => toggleSort("status")}
                                        >
                                            Status
                                            <SortIcon col="status" />
                                        </th>
                                        <th
                                            className="px-4 py-3 cursor-pointer select-none hover:text-foreground transition-colors"
                                            onClick={() => toggleSort("model")}
                                        >
                                            Model
                                            <SortIcon col="model" />
                                        </th>
                                        <th
                                            className="px-4 py-3 text-right cursor-pointer select-none hover:text-foreground transition-colors"
                                            onClick={() => toggleSort("latency_ms")}
                                        >
                                            Latency
                                            <SortIcon col="latency_ms" />
                                        </th>
                                        <th
                                            className="px-4 py-3 text-right cursor-pointer select-none hover:text-foreground transition-colors"
                                            onClick={() => toggleSort("cost_usd")}
                                        >
                                            Cost
                                            <SortIcon col="cost_usd" />
                                        </th>
                                        <th
                                            className="px-4 py-3 text-right cursor-pointer select-none hover:text-foreground transition-colors"
                                            onClick={() => toggleSort("confidence")}
                                        >
                                            Confidence
                                            <SortIcon col="confidence" />
                                        </th>
                                        <th className="px-4 py-3 text-center">Parse</th>
                                        <th
                                            className="px-4 py-3 text-right cursor-pointer select-none hover:text-foreground transition-colors"
                                            onClick={() => toggleSort("started_at")}
                                        >
                                            Started
                                            <SortIcon col="started_at" />
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {sortedRuns.map((run) => (
                                        <tr
                                            key={run.run_id}
                                            className="border-b border-white/5 hover:bg-white/[0.03] transition-colors group"
                                        >
                                            {/* Run ID + Copy */}
                                            <td className="px-4 py-3 font-mono text-xs">
                                                <div className="flex items-center gap-1.5">
                                                    <Link
                                                        to={`/runs/${run.run_id}`}
                                                        className="hover:text-primary underline-offset-4 hover:underline"
                                                    >
                                                        {run.run_id.substring(0, 8)}...
                                                    </Link>
                                                    <CopyButton text={run.run_id} />
                                                </div>
                                            </td>
                                            {/* Status */}
                                            <td className="px-4 py-3">
                                                {statusBadge(run.status)}
                                            </td>
                                            {/* Model */}
                                            <td className="px-4 py-3 text-xs text-muted-foreground font-mono">
                                                {run.model || "-"}
                                            </td>
                                            {/* Latency */}
                                            <td className="px-4 py-3 text-right font-mono text-xs">
                                                {run.latency_ms != null
                                                    ? `${Math.round(run.latency_ms)}ms`
                                                    : "-"}
                                            </td>
                                            {/* Cost */}
                                            <td className="px-4 py-3 text-right font-mono text-xs">
                                                {run.cost_usd != null
                                                    ? `$${run.cost_usd.toFixed(4)}`
                                                    : "-"}
                                            </td>
                                            {/* Confidence (progress bar) */}
                                            <td className="px-4 py-3 text-right">
                                                {run.confidence != null ? (
                                                    <div className="flex items-center justify-end gap-2">
                                                        <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
                                                            <div
                                                                className={`h-full rounded-full transition-all ${run.confidence >= 0.7
                                                                    ? "bg-emerald-500"
                                                                    : run.confidence >= 0.4
                                                                        ? "bg-yellow-500"
                                                                        : "bg-red-500"
                                                                    }`}
                                                                style={{
                                                                    width: `${Math.min(run.confidence * 100, 100)}%`,
                                                                }}
                                                            />
                                                        </div>
                                                        <span className="text-xs font-mono w-10 text-right">
                                                            {(run.confidence * 100).toFixed(0)}%
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <span className="text-muted-foreground text-xs">
                                                        -
                                                    </span>
                                                )}
                                            </td>
                                            {/* Parse */}
                                            <td className="px-4 py-3 text-center">
                                                {parseBadge(run.parse_success)}
                                            </td>
                                            {/* Started */}
                                            <td className="px-4 py-3 text-right text-muted-foreground text-xs">
                                                {run.started_at
                                                    ? formatDistanceToNow(
                                                        new Date(run.started_at),
                                                        { addSuffix: true }
                                                    )
                                                    : "-"}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
