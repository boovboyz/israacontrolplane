import { useQuery } from "@tanstack/react-query";
import { fetchRun } from "@/api/runs";
import { ChevronDown, ChevronUp, Clock, Gauge, BrainCircuit, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { CodeBlock } from "@/components/ui/code-block";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { MetricCard } from "@/components/MetricCard";
import { StatusBadge } from "@/components/StatusBadge";
import { TraceView } from "@/components/TraceView";
import { ArtifactsViewer } from "@/components/ArtifactsViewer";

interface RunPanelProps {
    runId: string;
    defaultOpen?: boolean;
}

export function RunPanel({ runId, defaultOpen = true }: RunPanelProps) {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    const { data: run, isLoading } = useQuery({
        queryKey: ["run", runId],
        queryFn: () => fetchRun(runId),
        enabled: !!runId,
    });

    if (isLoading) {
        return <div className="h-20 animate-pulse bg-white/5 rounded-lg my-4" />;
    }

    if (!run) return null;

    const duration = run.end_time && run.start_time
        ? `${((new Date(run.end_time).getTime() - new Date(run.start_time).getTime()) / 1000).toFixed(2)}s`
        : run.latency_ms ? `${(run.latency_ms / 1000).toFixed(2)}s` : "-";

    const cost = run.cost_usd
        ? `$${run.cost_usd.toFixed(5)}`
        : run.usage
            ? `$${(run.usage.total_tokens * 0.00002).toFixed(5)}`
            : "$0.00000";

    const confidence = run.confidence_score !== undefined ? run.confidence_score : run.confidence;

    return (
        <div className="border border-white/10 rounded-lg bg-card/50 my-4 overflow-hidden">
            <div
                className="flex items-center justify-between p-3 bg-white/[0.02] border-b border-white/5 cursor-pointer hover:bg-white/5 transition-colors"
                onClick={() => setIsOpen(!isOpen)}
            >
                <div className="flex items-center gap-3">
                    <StatusBadge status={run.status} />
                    <span className="font-mono text-xs text-muted-foreground">{run.run_id}</span>
                    <span className="text-xs text-muted-foreground">• {run.model_name || run.model}</span>
                </div>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
            </div>

            {isOpen && (
                <div>
                    <div className="p-4 space-y-6">
                        {/* Metrics */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
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

                        {/* Tabs */}
                        <Tabs defaultValue="trace" className="w-full">
                            <TabsList className="w-full justify-start border-b border-white/[0.04] bg-transparent p-0 h-auto rounded-none mb-4">
                                <TabsTrigger
                                    value="trace"
                                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2 text-xs"
                                >
                                    Trace & IO
                                </TabsTrigger>
                                <TabsTrigger
                                    value="context"
                                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2 text-xs"
                                >
                                    Knowledge
                                </TabsTrigger>
                                <TabsTrigger
                                    value="artifacts"
                                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2 text-xs"
                                >
                                    Artifacts
                                </TabsTrigger>
                                <TabsTrigger
                                    value="metadata"
                                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2 text-xs"
                                >
                                    Log
                                </TabsTrigger>
                            </TabsList>

                            <TabsContent value="trace" className="mt-0">
                                <TraceView run={run} />
                            </TabsContent>

                            <TabsContent value="context" className="mt-0">
                                <div className="space-y-2">
                                    {run.context && run.context.length > 0 ? (
                                        run.context.map((chunk: any, i: number) => (
                                            <div key={i} className="p-3 border border-white/[0.04] rounded bg-white/[0.02]">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <Badge variant="secondary" className="font-mono text-[10px]">Chunk {i + 1}</Badge>
                                                    <span className="text-xs text-muted-foreground font-mono">Score: {chunk.score?.toFixed(3)}</span>
                                                </div>
                                                <p className="text-xs text-muted-foreground leading-relaxed font-mono">
                                                    {chunk.text}
                                                </p>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="text-center text-sm text-muted-foreground py-4">No context retrieved</div>
                                    )}
                                </div>
                            </TabsContent>

                            <TabsContent value="artifacts" className="mt-0">
                                <ArtifactsViewer runId={run.run_id} artifacts={run.artifacts || []} />
                            </TabsContent>

                            <TabsContent value="metadata" className="mt-0">
                                <div className="bg-[#0d0f14] p-0 rounded border border-white/10">
                                    <CodeBlock code={run} className="border-0 text-xs" />
                                </div>
                            </TabsContent>
                        </Tabs>
                    </div>
                </div>
            )}
        </div>
    );
}
