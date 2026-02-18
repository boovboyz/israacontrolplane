import { useQuery } from "@tanstack/react-query";
import { fetchRuns } from "@/api/runs";
import type { RunDetail } from "@/lib/types";
import { formatDistanceToNow } from "date-fns";
import { Clock, AlertCircle, ChevronRight, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/StatusBadge";
import { useState } from "react";

// Using a custom drawer implementation if Sheet is not available, but user asked for "drawer titled Past Runs"
// I will implement it as a collapsible sidebar within the page layout or a fixed drawer.
// Given the requirements "right-side or bottom drawer", a fixed sidebar in the 3-column layout is best.

interface PastRunsDrawerProps {
    onSelectRun: (runId: string) => void;
    activeRunId?: string;
    isOpen: boolean;
    onClose: () => void;
}

export function PastRunsDrawer({ onSelectRun, activeRunId, isOpen, onClose }: PastRunsDrawerProps) {
    const [search, setSearch] = useState("");

    const { data, isLoading } = useQuery({
        queryKey: ["runs", "recent"],
        queryFn: () => fetchRuns({ limit: 50 }),
        refetchInterval: 5000,
    });

    const filteredRuns = data?.runs.filter(r =>
        r.run_id.includes(search) ||
        r.model?.toLowerCase().includes(search.toLowerCase()) ||
        r.inputs?.prompt?.toLowerCase().includes(search.toLowerCase())
    ) || [];

    if (!isOpen) return null;

    return (
        <div className="w-[350px] border-l border-white/10 bg-[#0b0c10] flex flex-col h-full absolute right-0 top-0 bottom-0 z-20 shadow-2xl transition-transform transform translate-x-0">
            <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
                <h2 className="font-semibold text-lg flex items-center gap-2">
                    <Clock className="h-4 w-4 text-primary" /> Past Runs
                </h2>
                <Button variant="ghost" size="icon" onClick={onClose}>
                    <ChevronRight className="h-5 w-5" />
                </Button>
            </div>

            <div className="p-4 border-b border-white/10">
                <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search runs..."
                        className="pl-9 bg-white/5 border-white/10"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar">
                {isLoading ? (
                    <div className="p-4 space-y-3">
                        {[1, 2, 3, 4, 5].map(i => (
                            <div key={i} className="h-20 bg-white/5 rounded-lg animate-pulse" />
                        ))}
                    </div>
                ) : filteredRuns.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground flex flex-col items-center">
                        <AlertCircle className="h-8 w-8 mb-2 opacity-50" />
                        <span>No runs found</span>
                    </div>
                ) : (
                    <div className="divide-y divide-white/5">
                        {filteredRuns.map((run: RunDetail) => (
                            <div
                                key={run.run_id}
                                onClick={() => onSelectRun(run.run_id)}
                                className={`p-4 cursor-pointer hover:bg-white/5 transition-colors ${activeRunId === run.run_id ? "bg-primary/10 border-l-2 border-primary" : "border-l-2 border-transparent"}`}
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <StatusBadge status={run.status} />
                                        <span className="text-[10px] font-mono text-muted-foreground">
                                            {formatDistanceToNow(new Date(run.start_time || Date.now()), { addSuffix: true })}
                                        </span>
                                    </div>
                                    <Badge variant="outline" className="text-[10px] h-5 border-white/10 bg-black/20 text-white/60">
                                        {run.model_name || run.model}
                                    </Badge>
                                </div>
                                <div className="text-sm font-medium truncate mb-1 text-white/90">
                                    {run.inputs?.prompt || run.outputs?.output || "No prompt data"}
                                </div>
                                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                    <span className="flex items-center gap-1">
                                        <Clock className="h-3 w-3" />
                                        {run.latency_ms ? `${(run.latency_ms / 1000).toFixed(1)}s` : "-"}
                                    </span>
                                    {run.confidence_score !== undefined && (
                                        <span className={`flex items-center gap-1 ${(run.confidence_score > 0.8) ? 'text-emerald-500' : 'text-yellow-500'}`}>
                                            <Badge className="h-1.5 w-1.5 rounded-full p-0" variant={run.confidence_score > 0.8 ? "success" : "warning"} />
                                            {(run.confidence_score * 100).toFixed(0)}%
                                        </span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
