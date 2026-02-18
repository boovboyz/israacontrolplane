import { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { fetchRun } from "@/api/runs";
import { StatusBadge } from "@/components/StatusBadge";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { JsonViewer } from "@/components/JsonViewer";
import { ArtifactViewer } from "@/components/ArtifactViewer";
import { ChevronLeft, Play, AlertCircle, Eye } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export function MLflowDetails() {
    const { runId } = useParams();
    const navigate = useNavigate();

    // Artifact Viewer State
    const [viewArtifact, setViewArtifact] = useState<{ path: string } | null>(null);

    const { data: run, isLoading, isError } = useQuery({
        queryKey: ["run", runId],
        queryFn: () => fetchRun(runId!),
        enabled: !!runId
    });

    if (isLoading) return <div className="p-8"><LoadingSkeleton /></div>;
    if (isError || !run) return (
        <div className="p-8 flex flex-col items-center justify-center h-full">
            <AlertCircle className="h-10 w-10 text-destructive mb-4" />
            <h3 className="text-lg font-medium">Failed to load run details</h3>
            <button onClick={() => navigate("/runs")} className="mt-4 text-primary hover:underline">
                Back to Runs
            </button>
        </div>
    );

    return (
        <div className="flex flex-col h-full bg-background overflow-hidden">
            {/* Header */}
            <div className="h-16 border-b flex items-center justify-between px-6 bg-card shrink-0">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate(`/runs/${runId}`)}
                        className="p-2 hover:bg-muted rounded-full"
                    >
                        <ChevronLeft className="h-5 w-5 text-muted-foreground" />
                    </button>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-lg font-semibold font-mono tracking-tight">{run.run_id}</h1>
                            <StatusBadge status={run.status} />
                            <span className="px-2 py-0.5 rounded text-xs bg-muted text-muted-foreground font-medium uppercase tracking-wide">
                                MLflow Details
                            </span>
                        </div>
                        <div className="text-xs text-muted-foreground flex items-center gap-2">
                            <span>Started {run.started_at ? formatDistanceToNow(new Date(run.started_at), { addSuffix: true }) : "-"}</span>
                            <span>•</span>
                            <span className="font-mono">{run.model}</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    {/* Replay Button */}
                    <Link
                        to={`/replay?sourceRunId=${run.run_id}`}
                        className="inline-flex items-center bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
                    >
                        <Play className="h-4 w-4 mr-2" />
                        Replay Run
                    </Link>
                </div>
            </div>

            {/* Content Content - Single Scrollable View */}
            <div className="flex-1 overflow-auto p-8 space-y-8">

                {/* Run Summary */}
                <section className="space-y-3">
                    <h2 className="text-lg font-semibold tracking-tight border-b pb-2">Run Summary</h2>
                    <JsonViewer data={{
                        run_id: run.run_id,
                        status: run.status,
                        model: run.model,
                        latency_ms: run.latency_ms,
                        cost_usd: run.cost_usd,
                        confidence: run.confidence,
                        started_at: run.started_at
                    }} />
                </section>

                {/* Parameters */}
                <section className="space-y-3">
                    <h2 className="text-lg font-semibold tracking-tight border-b pb-2">Parameters</h2>
                    <JsonViewer data={run.params} />
                </section>

                {/* Metrics */}
                <section className="space-y-3">
                    <h2 className="text-lg font-semibold tracking-tight border-b pb-2">Metrics</h2>
                    <JsonViewer data={run.metrics} />
                </section>

                {/* Tags */}
                <section className="space-y-3">
                    <h2 className="text-lg font-semibold tracking-tight border-b pb-2">Tags</h2>
                    <JsonViewer data={run.tags} />
                </section>

                {/* Artifacts */}
                <section className="space-y-3">
                    <h2 className="text-lg font-semibold tracking-tight border-b pb-2">Artifacts</h2>
                    <div className="border rounded-md overflow-hidden bg-card">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-muted/50 border-b uppercase text-xs font-medium text-muted-foreground">
                                <tr>
                                    <th className="px-4 py-3">Name</th>
                                    <th className="px-4 py-3">Path</th>
                                    <th className="px-4 py-3">Type</th>
                                    <th className="px-4 py-3 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {run.artifacts?.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground italic">
                                            No artifacts found
                                        </td>
                                    </tr>
                                )}
                                {run.artifacts?.map((art) => (
                                    <tr key={art.path} className="hover:bg-muted/20">
                                        <td className="px-4 py-3 font-medium">{art.name}</td>
                                        <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{art.path}</td>
                                        <td className="px-4 py-3 text-xs uppercase text-muted-foreground">{art.type}</td>
                                        <td className="px-4 py-3 text-right">
                                            <button
                                                onClick={() => setViewArtifact({ path: art.path })}
                                                className="inline-flex items-center text-xs font-medium text-primary hover:underline"
                                            >
                                                <Eye className="h-3 w-3 mr-1" />
                                                View
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>

            </div>

            {/* Artifact Modal */}
            <ArtifactViewer
                runId={run.run_id}
                path={viewArtifact?.path || ""}
                isOpen={!!viewArtifact}
                onClose={() => setViewArtifact(null)}
            />
        </div>
    );
}
