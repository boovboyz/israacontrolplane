import { useState } from "react";
import { useNavigate, useParams, Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { fetchRun, fetchArtifact } from "@/api/runs";
import { formatDistanceToNow } from "date-fns";
import {
    ArrowLeft, Clock, Activity, AlertCircle, Play,
    Share2, Download, Gauge, BrainCircuit, FileText, FileJson, X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { CodeBlock } from "@/components/ui/code-block";
import { ConfidenceExplanationPanel } from "@/components/ConfidenceExplanationPanel";

export function RunDetails() {
    const { runId } = useParams();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const activeTab = searchParams.get("tab") || "trace";

    const handleTabChange = (val: string) => {
        setSearchParams({ tab: val }, { replace: true });
    };

    const { data: run, isLoading, error } = useQuery({
        queryKey: ["run", runId],
        queryFn: () => fetchRun(runId!),
        enabled: !!runId,
    });

    if (isLoading) {
        return (
            <div className="p-8 space-y-4 animate-pulse">
                <div className="h-8 w-1/3 bg-white/5 rounded-lg" />
                <div className="h-64 bg-white/5 rounded-xl" />
            </div>
        );
    }

    if (error || !run) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                <AlertCircle className="h-10 w-10 mb-4 text-destructive" />
                <h2 className="text-xl font-semibold text-foreground">Run not found</h2>
                <Button variant="link" onClick={() => navigate("/runs")}>
                    Back to Live Runs
                </Button>
            </div>
        );
    }

    const duration = run.end_time && run.start_time
        ? `${((new Date(run.end_time).getTime() - new Date(run.start_time).getTime()) / 1000).toFixed(2)}s`
        : run.latency_ms ? `${(run.latency_ms / 1000).toFixed(2)}s` : "-";

    const cost = run.cost_usd
        ? `$${run.cost_usd.toFixed(5)}`
        : run.usage
            ? `$${(run.usage.total_tokens * 0.00002).toFixed(5)}`
            : "$0.00000";

    const modelName = run.model_name || run.model || "Unknown Model";
    const confidence = run.confidence_score !== undefined ? run.confidence_score : run.confidence;

    return (
        <div className="flex flex-col h-full bg-background overflow-hidden relative">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-white/[0.04] bg-white/[0.01]">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => navigate("/runs")}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-xl font-bold tracking-tight font-mono text-primary/90">
                                {run.run_id}
                            </h1>
                            <StatusBadge status={run.status} />
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                            <Clock className="h-3.5 w-3.5" />
                            <span>{run.start_time ? formatDistanceToNow(new Date(run.start_time), { addSuffix: true }) : "Unknown time"}</span>
                            <span className="text-white/20">•</span>
                            <span className="font-mono text-xs border border-white/10 px-1.5 py-0.5 rounded text-white/60">
                                {modelName}
                            </span>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" className="gap-2 border-white/10">
                        <Share2 className="h-4 w-4" /> Share
                    </Button>
                    <Link to={`/replay?sourceRunId=${run.run_id}`}>
                        <Button
                            variant="default"
                            size="sm"
                            className="gap-2 shadow-[0_0_15px_rgba(6,182,212,0.3)]"
                        >
                            <Play className="h-4 w-4 fill-current" /> Open in Replay
                        </Button>
                    </Link>
                </div>
            </div>

            {/* Content Content - Scrollable */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">

                {/* Metrics Grid */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <MetricCard
                        label="Latency"
                        value={run.latency_ms ? `${(run.latency_ms / 1000).toFixed(2)}s` : duration}
                        icon={Clock}
                        color="text-blue-400"
                        bg="bg-blue-500/10"
                    />
                    <MetricCard
                        label="Confidence"
                        value={confidence !== undefined ? `${(confidence * 100).toFixed(0)}%` : "-"}
                        icon={Gauge}
                        color={(confidence || 0) > 0.8 ? "text-emerald-400" : "text-yellow-400"}
                        bg={(confidence || 0) > 0.8 ? "bg-emerald-500/10" : "bg-yellow-500/10"}
                    />
                    <MetricCard
                        label="Tokens"
                        value={run.usage?.total_tokens || 0}
                        icon={BrainCircuit}
                        color="text-purple-400"
                        bg="bg-purple-500/10"
                    />
                    <MetricCard
                        label="Est. Cost"
                        value={cost}
                        icon={Activity}
                        color="text-pink-400"
                        bg="bg-pink-500/10"
                    />
                </div>

                {/* Main Content Tabs */}
                <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full h-full flex flex-col">
                    <TabsList className="w-full justify-start border-b border-white/[0.04] bg-transparent p-0 h-auto rounded-none mb-6">
                        <TabsTrigger
                            value="trace"
                            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2"
                        >
                            <Activity className="h-4 w-4 mr-2" />
                            Trace & IO
                        </TabsTrigger>
                        <TabsTrigger
                            value="context"
                            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2"
                        >
                            <BrainCircuit className="h-4 w-4 mr-2" />
                            Knowledge Retrieval
                        </TabsTrigger>
                        <TabsTrigger
                            value="artifacts"
                            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2"
                        >
                            <FileText className="h-4 w-4 mr-2" />
                            Artifacts
                        </TabsTrigger>
                        <TabsTrigger
                            value="confidence"
                            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2"
                        >
                            <Gauge className="h-4 w-4 mr-2" />
                            Confidence
                        </TabsTrigger>
                        <TabsTrigger
                            value="metadata"
                            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2"
                        >
                            <Download className="h-4 w-4 mr-2" />
                            Metadata & Logs
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="trace" className="space-y-6 mt-0">
                        {/* Input/Output Split */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-full">
                            <Card className="flex flex-col overflow-hidden h-full">
                                <CardHeader className="bg-white/[0.02] border-b border-white/[0.04] py-3">
                                    <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">Input / Prompt</CardTitle>
                                </CardHeader>
                                <div className="flex-1 bg-[#0d0f14] relative">
                                    <CodeBlock
                                        code={run.input_preview || run.inputs || { prompt: run.prompt } || {}}
                                        className="rounded-none border-0 bg-transparent h-full max-h-[500px]"
                                    />
                                </div>
                            </Card>

                            <Card className="flex flex-col overflow-hidden h-full border-blue-500/20">
                                <CardHeader className="bg-blue-500/5 border-b border-blue-500/10 py-3 flex flex-row items-center justify-between">
                                    <CardTitle className="text-sm font-medium uppercase tracking-wider text-blue-400">Model Output</CardTitle>
                                    <Badge variant="outline" className="text-[10px] border-blue-500/20 text-blue-400">Final Answer</Badge>
                                </CardHeader>
                                <div className="flex-1 bg-[#0d0f14] relative">
                                    <CodeBlock
                                        code={run.output_preview || run.outputs || { output: run.output } || {}}
                                        className="rounded-none border-0 bg-transparent h-full max-h-[500px]"
                                    />
                                </div>
                            </Card>
                        </div>
                    </TabsContent>

                    <TabsContent value="context" className="mt-0">
                        <Card>
                            <CardHeader className="border-b border-white/[0.04]">
                                <CardTitle>Knowledge Retrieval Chunks</CardTitle>
                            </CardHeader>
                            <CardContent className="p-0">
                                {run.context && run.context.length > 0 ? (
                                    run.context.map((chunk: any, i: number) => (
                                        <div key={i} className="p-4 border-b border-white/[0.04] last:border-0 hover:bg-white/[0.02]">
                                            <div className="flex items-center gap-2 mb-2">
                                                <Badge variant="secondary" className="font-mono text-[10px]">Chunk {i + 1}</Badge>
                                                <span className="text-xs text-muted-foreground font-mono">Score: {chunk.score?.toFixed(3)}</span>
                                            </div>
                                            <p className="text-sm text-muted-foreground leading-relaxed font-mono">
                                                {chunk.text}
                                            </p>
                                        </div>
                                    ))
                                ) : (
                                    <div className="p-8 text-center text-muted-foreground">
                                        No context retrieved for this run.
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="artifacts" className="mt-0">
                        <ArtifactsViewer runId={run.run_id} artifacts={run.artifacts || []} />
                    </TabsContent>

                    <TabsContent value="confidence" className="mt-0">
                        {run.confidence_explanation ? (
                            <ConfidenceExplanationPanel explanation={run.confidence_explanation} />
                        ) : (
                            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground border border-white/5 rounded-xl bg-white/[0.01]">
                                <Gauge className="h-12 w-12 mb-4 opacity-20" />
                                <h3 className="text-lg font-medium text-white mb-1">No Explanation Available</h3>
                                <p className="text-sm">
                                    Detailed confidence explanation was not generated for this run.
                                </p>
                            </div>
                        )}
                    </TabsContent>

                    <TabsContent value="metadata" className="mt-0">
                        <Card>
                            <CardHeader className="border-b border-white/[0.04]">
                                <CardTitle>System Metadata</CardTitle>
                            </CardHeader>
                            <div className="p-0 bg-[#0d0f14]">
                                <CodeBlock
                                    code={run} // Dump full object
                                    className="rounded-none border-0"
                                />
                            </div>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}

function MetricCard({ label, value, icon: Icon, color, bg }: any) {
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

function StatusBadge({ status }: { status: string }) {
    if (status === 'completed') return <Badge variant="success">Completed</Badge>;
    if (status === 'error') return <Badge variant="error">Error</Badge>;
    if (status === 'running') return <Badge variant="warning">Running</Badge>;
    return <Badge variant="neutral">{status}</Badge>;
}

function ArtifactsViewer({ runId, artifacts }: { runId: string, artifacts: any[] }) {
    const [selectedPath, setSelectedPath] = useState<string | null>(null);

    return (
        <div className="space-y-4">
            <div className="bg-card border border-white/[0.04] rounded-lg overflow-hidden">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 p-4">
                    {artifacts.map((art) => (
                        <div
                            key={art.path}
                            onClick={() => setSelectedPath(art.path)}
                            className="flex items-center gap-3 p-3 rounded-md bg-white/[0.02] hover:bg-white/[0.05] cursor-pointer border border-white/[0.02] hover:border-white/10 transition-all"
                        >
                            <div className="p-2 rounded bg-primary/10 text-primary">
                                {art.type === 'json' ? <FileJson className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
                            </div>
                            <div className="overflow-hidden">
                                <div className="font-medium text-sm truncate">{art.name}</div>
                                <div className="text-xs text-muted-foreground font-mono truncate">{art.path}</div>
                            </div>
                        </div>
                    ))}
                    {artifacts.length === 0 && (
                        <div className="col-span-full py-8 text-center text-muted-foreground">
                            No artifacts found for this run.
                        </div>
                    )}
                </div>
            </div>

            {selectedPath && (
                <ArtifactContentModal
                    runId={runId}
                    path={selectedPath}
                    onClose={() => setSelectedPath(null)}
                />
            )}
        </div>
    );
}

function ArtifactContentModal({ runId, path, onClose }: { runId: string, path: string, onClose: () => void }) {
    // Fetch content on mount
    const { data: content, isLoading, error } = useQuery({
        queryKey: ["artifact", runId, path],
        queryFn: () => fetchArtifact(runId, path),
    });

    // Simple overlay modal since we don't have Dialog component
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 md:p-12">
            <div className="bg-[#0b0c10] border border-white/10 rounded-xl w-full max-w-4xl max-h-full flex flex-col shadow-2xl relative">
                {/* Modal Header */}
                <div className="flex items-center justify-between p-4 border-b border-white/10 bg-white/[0.03]">
                    <div className="flex items-center gap-2 text-white">
                        <FileText className="h-4 w-4 text-primary" />
                        <span className="font-medium font-mono">{path}</span>
                    </div>
                    <Button variant="ghost" size="icon" onClick={onClose} className="hover:bg-white/10">
                        <X className="h-5 w-5" />
                    </Button>
                </div>

                {/* Modal Content */}
                <div className="flex-1 overflow-auto bg-[#0d0f14] p-0 relative min-h-[300px]">
                    {isLoading ? (
                        <div className="absolute inset-0 flex items-center justify-center">
                            <Clock className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    ) : error ? (
                        <div className="p-8 text-destructive flex flex-col items-center">
                            <AlertCircle className="h-8 w-8 mb-2" />
                            <p>Failed to load artifact content.</p>
                        </div>
                    ) : (
                        <CodeBlock
                            code={content || ""}
                            className="rounded-none border-0 min-h-full"
                        />
                    )}
                </div>
            </div>
        </div>
    );
}
