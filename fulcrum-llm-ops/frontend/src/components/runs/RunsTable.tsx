import { useNavigate } from "react-router-dom";
import { Run } from "@/api/runs";
import { StatusBadge } from "@/components/StatusBadge";
import { formatDistanceToNow } from "date-fns";

interface RunsTableProps {
    runs: Run[];
}

export function RunsTable({ runs }: RunsTableProps) {
    const navigate = useNavigate();

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-7 px-6 py-2 text-xs font-bold text-muted-foreground uppercase tracking-widest text-center">
                <div className="text-left">Run ID</div>
                <div>Status</div>
                <div>Model</div>
                <div className="text-right">Latency</div>
                <div className="text-right">Cost</div>
                <div className="text-right">Confidence</div>
                <div className="text-left pl-4">Started</div>
            </div>

            <div className="space-y-2">
                {runs.map((run) => (
                    <div
                        key={run.run_id}
                        onClick={() => navigate(`/runs/${run.run_id}`)}
                        className="grid grid-cols-7 items-center px-6 py-4 bg-card/40 hover:bg-card/80 backdrop-blur rounded-2xl border border-border/50 hover:border-primary/50 cursor-pointer transition-all duration-300 hover:scale-[1.01] hover:shadow-lg hover:shadow-primary/10 group"
                    >
                        <div className="font-mono text-xs text-primary font-bold truncate max-w-[140px] group-hover:text-primary-foreground group-hover:bg-primary group-hover:px-2 group-hover:py-1 group-hover:rounded-md transition-all">
                            {run.run_id}
                        </div>
                        <div className="flex justify-center">
                            <StatusBadge status={run.status} />
                        </div>
                        <div className="font-mono text-xs text-foreground/80 text-center">
                            {run.model}
                        </div>
                        <div className="text-right font-mono text-xs text-foreground/70">
                            {run.latency_ms ? `${run.latency_ms} ms` : "-"}
                        </div>
                        <div className="text-right text-muted-foreground font-mono text-xs">
                            {run.cost_usd ? `$${run.cost_usd.toFixed(4)}` : "-"}
                        </div>
                        <div className="text-right font-bold flex justify-end">
                            {run.confidence ? (
                                <span className={`px-2 py-0.5 rounded-full text-xs ${run.confidence > 0.8 ? "bg-green-500/20 text-green-400" : run.confidence > 0.5 ? "bg-yellow-500/20 text-yellow-400" : "bg-red-500/20 text-red-400"
                                    }`}>
                                    {(run.confidence * 100).toFixed(1)}%
                                </span>
                            ) : "-"}
                        </div>
                        <div className="text-muted-foreground text-xs pl-4">
                            {run.started_at ? formatDistanceToNow(new Date(run.started_at), { addSuffix: true }) : "-"}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
