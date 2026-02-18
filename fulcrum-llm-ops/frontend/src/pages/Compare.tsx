import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchRuns } from "@/api/runs";
import { fetchCompareRuns } from "@/api/compare";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { EmptyState } from "@/components/EmptyState";
import { GitCompare, AlertCircle } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import type { RunDetail } from "@/lib/types";

export function ComparePage() {
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [compareResult, setCompareResult] = useState<RunDetail[] | null>(null);
    const [comparing, setComparing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const { data: runsData, isLoading } = useQuery({
        queryKey: ["runs-for-compare"],
        queryFn: () => fetchRuns({}),
    });

    const toggleRun = (id: string) => {
        setSelectedIds((prev) => {
            if (prev.includes(id)) return prev.filter((x) => x !== id);
            if (prev.length >= 4) return prev;
            return [...prev, id];
        });
    };

    const handleCompare = async () => {
        if (selectedIds.length < 2) return;
        setComparing(true);
        setError(null);
        try {
            const res = await fetchCompareRuns(selectedIds);
            setCompareResult(res.runs);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setComparing(false);
        }
    };

    return (
        <div className="flex flex-col h-full overflow-hidden">
            <div className="p-6 border-b shrink-0">
                <h1 className="text-2xl font-semibold tracking-tight">Variant Comparison</h1>
                <p className="text-sm text-muted-foreground">
                    Select 2-4 runs to compare side-by-side.
                </p>
            </div>

            <div className="flex flex-1 overflow-hidden">
                {/* Left: Run selector */}
                <div className="w-[340px] border-r flex flex-col overflow-hidden">
                    <div className="p-4 border-b bg-muted/10 flex items-center justify-between">
                        <span className="text-sm font-medium">{selectedIds.length}/4 selected</span>
                        <button
                            onClick={handleCompare}
                            disabled={selectedIds.length < 2 || comparing}
                            className="px-3 py-1.5 bg-primary text-primary-foreground rounded-md text-xs font-medium disabled:opacity-50"
                        >
                            {comparing ? "Loading..." : "Compare"}
                        </button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2 space-y-1">
                        {isLoading ? (
                            <LoadingSkeleton />
                        ) : (
                            runsData?.runs.map((run) => {
                                const selected = selectedIds.includes(run.run_id);
                                return (
                                    <button
                                        key={run.run_id}
                                        onClick={() => toggleRun(run.run_id)}
                                        className={`w-full text-left p-3 rounded-lg border text-sm transition-all ${
                                            selected
                                                ? "border-primary bg-primary/10"
                                                : "border-transparent hover:bg-muted/30"
                                        }`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <span className="font-mono text-xs truncate max-w-[180px]">{run.run_id}</span>
                                            <StatusBadge status={run.status} />
                                        </div>
                                        <div className="text-xs text-muted-foreground mt-1">{run.model}</div>
                                    </button>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* Right: Comparison */}
                <div className="flex-1 overflow-y-auto p-6">
                    {error && (
                        <div className="flex items-center gap-2 text-destructive text-sm mb-4">
                            <AlertCircle className="h-4 w-4" /> {error}
                        </div>
                    )}

                    {!compareResult ? (
                        <EmptyState
                            icon={GitCompare}
                            title="Select runs to compare"
                            description="Choose 2-4 runs from the left panel, then click Compare."
                        />
                    ) : (
                        <div className="space-y-6">
                            {/* Summary table */}
                            <div className="border rounded-md overflow-hidden">
                                <table className="w-full text-sm">
                                    <thead className="bg-muted/30 border-b">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">Metric</th>
                                            {compareResult.map((r) => (
                                                <th key={r.run_id} className="px-4 py-3 text-center text-xs font-mono">
                                                    {r.run_id.slice(0, 8)}...
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        <CompareRow label="Model" values={compareResult.map((r) => r.model)} />
                                        <CompareRow label="Status" values={compareResult.map((r) => r.status)} />
                                        <CompareRow label="Latency (ms)" values={compareResult.map((r) => r.latency_ms?.toString() ?? "-")} />
                                        <CompareRow label="Cost (USD)" values={compareResult.map((r) => r.cost_usd ? `$${r.cost_usd.toFixed(4)}` : "-")} />
                                        <CompareRow label="Confidence" values={compareResult.map((r) => r.confidence ? `${(r.confidence * 100).toFixed(1)}%` : "-")} />
                                        <CompareRow label="Parse Success" values={compareResult.map((r) => r.metrics?.parse_success?.toString() ?? "-")} />
                                    </tbody>
                                </table>
                            </div>

                            {/* Side-by-side output preview */}
                            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Parameters</h3>
                            <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${compareResult.length}, 1fr)` }}>
                                {compareResult.map((r) => (
                                    <div key={r.run_id} className="bg-card border rounded-md p-3 overflow-auto max-h-[300px]">
                                        <div className="text-xs font-mono text-muted-foreground mb-2">{r.run_id.slice(0, 12)}</div>
                                        <pre className="text-xs font-mono whitespace-pre-wrap">
                                            {JSON.stringify(r.params, null, 2)}
                                        </pre>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function CompareRow({ label, values }: { label: string; values: string[] }) {
    return (
        <tr>
            <td className="px-4 py-2.5 text-muted-foreground font-medium">{label}</td>
            {values.map((v, i) => (
                <td key={i} className="px-4 py-2.5 text-center font-mono text-xs">{v}</td>
            ))}
        </tr>
    );
}
