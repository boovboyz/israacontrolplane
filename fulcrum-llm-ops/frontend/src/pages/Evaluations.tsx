import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchRuns, fetchRun } from "@/api/runs";
import { submitEvaluation } from "@/api/evaluations";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { EmptyState } from "@/components/EmptyState";
import {
    ThumbsUp, ThumbsDown, Star, Send, Loader2, Play,
    CheckCircle2, Activity, Search, AlertTriangle
} from "lucide-react";
import { toast } from "sonner";

// --- Automated Suites Types ---
interface TestSuite {
    id: string;
    name: string;
    description: string;
    tests: number;
    status: "completed" | "running" | "failed";
    pass_rate: number;
    last_run: string;
}

const MOCK_SUITES: TestSuite[] = [
    { id: "1", name: "Accuracy Benchmark", description: "Tests factual accuracy of responses", tests: 150, status: "completed", pass_rate: 94, last_run: "1/20/2024" },
    { id: "2", name: "Safety & Compliance", description: "Checks for harmful or policy-violating outputs", tests: 200, status: "completed", pass_rate: 99, last_run: "1/20/2024" },
    { id: "3", name: "Latency Tests", description: "Performance benchmarks under load", tests: 50, status: "running", pass_rate: 88, last_run: "1/19/2024" },
    { id: "4", name: "Edge Cases", description: "Tests unusual inputs and edge scenarios", tests: 75, status: "failed", pass_rate: 72, last_run: "1/18/2024" },
];

export function EvaluationsPage() {
    const [activeTab, setActiveTab] = useState<"suites" | "human">("suites");

    return (
        <div className="flex flex-col h-full bg-background overflow-hidden relative">
            <div className="flex items-center justify-between p-6 border-b border-border">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight">Evaluations</h1>
                    <p className="text-muted-foreground text-sm">Run and monitor evaluation suites and human feedback</p>
                </div>
                <div className="flex bg-muted p-1 rounded-lg">
                    <button
                        onClick={() => setActiveTab("suites")}
                        className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'suites' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                        Automated Suites
                    </button>
                    <button
                        onClick={() => setActiveTab("human")}
                        className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'human' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                        Human Review
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-hidden relative">
                {activeTab === 'suites' ? <SuitesView /> : <HumanEvaluationView />}
            </div>
        </div>
    );
}

function SuitesView() {
    return (
        <div className="p-6 space-y-8 h-full overflow-y-auto custom-scrollbar">
            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="p-6 rounded-lg bg-card border shadow-sm relative overflow-hidden">
                    <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Total Suites</div>
                    <div className="text-3xl font-bold">4</div>
                    <div className="absolute top-4 right-4 p-2 bg-blue-500/10 text-blue-500 rounded-lg"><CheckCircle2 className="h-5 w-5" /></div>
                </div>
                <div className="p-6 rounded-lg bg-card border shadow-sm relative overflow-hidden">
                    <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Total Tests</div>
                    <div className="text-3xl font-bold">475</div>
                    <div className="absolute top-4 right-4 p-2 bg-purple-500/10 text-purple-500 rounded-lg"><Activity className="h-5 w-5" /></div>
                </div>
                <div className="p-6 rounded-lg bg-card border shadow-sm relative overflow-hidden">
                    <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Avg Pass Rate</div>
                    <div className="text-3xl font-bold text-emerald-500">88.3%</div>
                    <div className="absolute top-4 right-4 p-2 bg-green-500/10 text-green-500 rounded-lg"><CheckCircle2 className="h-5 w-5" /></div>
                </div>
                <div className="p-6 rounded-lg bg-card border shadow-sm relative overflow-hidden">
                    <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Failed Suites</div>
                    <div className="text-3xl font-bold text-rose-500">1</div>
                    <div className="absolute top-4 right-4 p-2 bg-red-500/10 text-red-500 rounded-lg"><AlertTriangle className="h-5 w-5" /></div>
                </div>
            </div>

            <div className="space-y-4">
                <div className="flex justify-between items-center">
                    <div className="relative w-96">
                        <input
                            type="text"
                            placeholder="Search evaluations..."
                            className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    </div>
                    <Button className="gap-2">
                        <Play className="h-4 w-4" /> Run All Evaluations
                    </Button>
                </div>

                <div className="border border-border rounded-lg overflow-hidden bg-card">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-muted/50 border-b border-border">
                            <tr>
                                <th className="px-6 py-4 font-semibold text-muted-foreground uppercase text-xs tracking-wider">Suite Name</th>
                                <th className="px-6 py-4 font-semibold text-muted-foreground uppercase text-xs tracking-wider">Tests</th>
                                <th className="px-6 py-4 font-semibold text-muted-foreground uppercase text-xs tracking-wider">Status</th>
                                <th className="px-6 py-4 font-semibold text-muted-foreground uppercase text-xs tracking-wider w-1/4">Pass Rate</th>
                                <th className="px-6 py-4 font-semibold text-muted-foreground uppercase text-xs tracking-wider">Last Run</th>
                                <th className="px-6 py-4 font-semibold text-muted-foreground uppercase text-xs tracking-wider text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {MOCK_SUITES.map((s) => (
                                <tr key={s.id} className="hover:bg-muted/50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="font-medium text-foreground">{s.name}</div>
                                        <div className="text-xs text-muted-foreground">{s.description}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <Badge variant="outline" className="font-mono text-xs">{s.tests}</Badge>
                                    </td>
                                    <td className="px-6 py-4">
                                        {s.status === 'completed' && <Badge variant="default" className="bg-emerald-500 hover:bg-emerald-600">Completed</Badge>}
                                        {s.status === 'running' && <Badge variant="secondary">Running</Badge>}
                                        {s.status === 'failed' && <Badge variant="destructive">Failed</Badge>}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full ${s.pass_rate >= 90 ? 'bg-emerald-500' : s.pass_rate >= 75 ? 'bg-yellow-500' : 'bg-red-500'}`}
                                                    style={{ width: `${s.pass_rate}%` }}
                                                />
                                            </div>
                                            <span className="text-xs font-mono w-8 text-right">{s.pass_rate}%</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-muted-foreground text-xs whitespace-nowrap">{s.last_run}</td>
                                    <td className="px-6 py-4 text-right">
                                        <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-muted">
                                            <Play className="h-3.5 w-3.5" />
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

function HumanEvaluationView() {
    const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
    const [rating, setRating] = useState(3);
    const [label, setLabel] = useState("neutral");
    const [comment, setComment] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const { data: runsData, isLoading } = useQuery({
        queryKey: ["runs-for-eval"],
        queryFn: () => fetchRuns({}),
    });

    const { data: selectedRun } = useQuery({
        queryKey: ["run-eval", selectedRunId],
        queryFn: () => fetchRun(selectedRunId!),
        enabled: !!selectedRunId,
    });

    const handleSubmit = async () => {
        if (!selectedRunId) return;
        setSubmitting(true);
        try {
            await submitEvaluation({
                run_id: selectedRunId,
                rating,
                label,
                comment,
            });
            toast.success("Evaluation saved.");
            setComment("");
        } catch (e) {
            toast.error("Failed to save evaluation.");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="flex h-full overflow-hidden">
            {/* Run list */}
            <div className="w-[320px] border-r border-border flex flex-col overflow-hidden bg-muted/10">
                <div className="p-4 border-b border-border">
                    <h2 className="text-xs font-semibold tracking-widest uppercase text-muted-foreground">Select Run</h2>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                    {isLoading ? (
                        <LoadingSkeleton />
                    ) : !runsData?.runs.length ? (
                        <div className="p-4 text-sm text-muted-foreground text-center">No runs available</div>
                    ) : (
                        runsData.runs.map((run: any) => (
                            <button
                                key={run.run_id}
                                onClick={() => setSelectedRunId(run.run_id)}
                                className={`w-full text-left p-3 rounded-lg border text-sm transition-all duration-200 ${selectedRunId === run.run_id
                                    ? "border-primary/50 bg-primary/10 shadow-sm"
                                    : "border-transparent hover:bg-muted"
                                    }`}
                            >
                                <div className="flex items-center justify-between">
                                    <span className="font-mono text-xs truncate max-w-[140px] text-foreground/80">{run.run_id}</span>
                                    <div className={`h-2 w-2 rounded-full ${run.status === 'completed' ? 'bg-emerald-500' : 'bg-yellow-500'}`} />
                                </div>
                                <div className="text-xs text-muted-foreground mt-1 truncate">{run.model_name || 'gpt-4'}</div>
                            </button>
                        ))
                    )}
                </div>
            </div>

            {/* Evaluation form */}
            <div className="flex-1 overflow-y-auto p-6 md:p-12 flex flex-col items-center bg-background/50">
                {!selectedRunId ? (
                    <EmptyState
                        icon={ThumbsUp}
                        title="Select a run to evaluate"
                        description="Choose a run from the sidebar to provide human feedback."
                    />
                ) : (
                    <div className="w-full max-w-2xl space-y-8 animate-fade-in">
                        <div className="bg-card p-8 border border-border rounded-lg shadow-sm">
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <h2 className="text-xl font-semibold mb-1">Evaluate Run</h2>
                                    <p className="text-sm font-mono text-muted-foreground">{selectedRunId}</p>
                                </div>
                                {selectedRun?.tags?.eval_rating && (
                                    <Badge variant="outline" className="gap-2">
                                        <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                                        Evaluated
                                    </Badge>
                                )}
                            </div>

                            {/* Quick label */}
                            <div className="space-y-4 mb-8">
                                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Label</label>
                                <div className="grid grid-cols-3 gap-4">
                                    <button
                                        onClick={() => setLabel("thumbs_up")}
                                        className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg border transition-all ${label === "thumbs_up" ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-500" : "border-border bg-background hover:bg-muted"
                                            }`}
                                    >
                                        <ThumbsUp className="h-4 w-4" /> Good
                                    </button>
                                    <button
                                        onClick={() => setLabel("neutral")}
                                        className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg border transition-all ${label === "neutral" ? "border-yellow-500/50 bg-yellow-500/10 text-yellow-500" : "border-border bg-background hover:bg-muted"
                                            }`}
                                    >
                                        Neutral
                                    </button>
                                    <button
                                        onClick={() => setLabel("thumbs_down")}
                                        className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg border transition-all ${label === "thumbs_down" ? "border-rose-500/50 bg-rose-500/10 text-rose-500" : "border-border bg-background hover:bg-muted"
                                            }`}
                                    >
                                        <ThumbsDown className="h-4 w-4" /> Bad
                                    </button>
                                </div>
                            </div>

                            {/* Rating 1-5 */}
                            <div className="space-y-4 mb-8">
                                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Rating (1-5)</label>
                                <div className="flex items-center gap-2 bg-muted/20 p-2 rounded-lg border border-border w-fit">
                                    {[1, 2, 3, 4, 5].map((n) => (
                                        <button
                                            key={n}
                                            onClick={() => setRating(n)}
                                            className={`p-2 rounded-md transition-all hover:scale-110 ${rating >= n ? "text-yellow-400" : "text-muted-foreground/20 hover:text-yellow-400/50"
                                                }`}
                                        >
                                            <Star className="h-6 w-6" fill={rating >= n ? "currentColor" : "none"} />
                                        </button>
                                    ))}
                                    <span className="text-xl font-mono text-foreground ml-4 border-l border-border pl-4">{rating}.0</span>
                                </div>
                            </div>

                            {/* Comment */}
                            <div className="space-y-4 mb-8">
                                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Comment</label>
                                <textarea
                                    value={comment}
                                    onChange={(e) => setComment(e.target.value)}
                                    placeholder="Add specific details about quality issues or improvements..."
                                    className="w-full bg-background border border-border rounded-lg px-4 py-3 text-sm focus:ring-1 focus:ring-primary outline-none min-h-[120px] resize-y"
                                />
                            </div>

                            <Button
                                onClick={handleSubmit}
                                disabled={submitting}
                                className="w-full h-12 text-md"
                            >
                                {submitting ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
                                Submit Evaluation
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
