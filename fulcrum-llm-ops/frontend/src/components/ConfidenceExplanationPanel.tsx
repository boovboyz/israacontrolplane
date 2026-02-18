import {
    Activity, CheckCircle2, AlertTriangle, FileText, Info, TrendingUp
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface ConfidenceExplanation {
    version: string;
    score: number;
    label: string;
    formula: string;
    weights: Record<string, number>;
    components: Record<string, any>;
    evidence: Array<{
        component: string;
        artifact: string;
        path: string;
        excerpt: string;
        note: string;
    }>;
    interpretation: {
        what_it_means: string;
        recommended_usage: string;
        confidence_vs_uncertainty: string;
    };
    limitations: string[];
    improvement_actions: string[];
}

export function ConfidenceExplanationPanel({ explanation }: { explanation: ConfidenceExplanation }) {
    if (!explanation) return null;

    const { score, label, formula, components, evidence, interpretation, limitations, improvement_actions } = explanation;

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header / Score Overview */}
            <div className="flex items-start gap-6 p-6 bg-white/[0.02] border border-white/[0.04] rounded-xl">
                <div className="flex-1">
                    <h3 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
                        <Activity className="h-5 w-5 text-primary" />
                        Confidence Score Breakdown
                        <Badge variant="outline" className="ml-2 py-0 h-5 text-[10px] text-muted-foreground border-white/10">
                            {explanation.version}
                        </Badge>
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4 font-mono text-xs bg-black/20 p-2 rounded border border-white/5 w-fit">
                        {formula}
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                            <div className="text-xs font-semibold text-blue-400 mb-1">RECOMMENDED USAGE</div>
                            <p className="text-xs text-blue-200/80 leading-relaxed">
                                {interpretation.recommended_usage}
                            </p>
                        </div>
                        <div className="p-3 bg-white/[0.02] border border-white/5 rounded-lg">
                            <div className="text-xs font-semibold text-muted-foreground mb-1">INTERPRETATION</div>
                            <p className="text-xs text-muted-foreground leading-relaxed">
                                {interpretation.what_it_means}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Big Score Card */}
                <div className="flex flex-col items-center justify-center p-6 bg-[#0b0c10] border border-white/10 rounded-xl shadow-2xl min-w-[160px]">
                    <div className={`text-4xl font-bold font-mono mb-1 ${score > 0.8 ? "text-emerald-400" : score > 0.5 ? "text-amber-400" : "text-rose-400"
                        }`}>
                        {(score * 100).toFixed(0)}%
                    </div>
                    <Badge variant={score > 0.8 ? "success" : score > 0.5 ? "warning" : "destructive"}>
                        {label.toUpperCase()}
                    </Badge>
                </div>
            </div>

            {/* Components Table */}
            <Card>
                <CardHeader className="border-b border-white/[0.04] py-3 bg-white/[0.01]">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-primary" /> Scoring Components
                    </CardTitle>
                </CardHeader>
                <Table>
                    <TableHeader>
                        <TableRow className="hover:bg-transparent border-white/5">
                            <TableHead className="w-[200px]">Component</TableHead>
                            <TableHead className="w-[100px] text-right">Value</TableHead>
                            <TableHead>Reason / Logic</TableHead>
                            <TableHead className="w-[100px] text-center">Outcome</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {Object.entries(components).map(([key, data]: [string, any]) => (
                            <TableRow key={key} className="hover:bg-white/[0.02] border-white/5">
                                <TableCell className="font-mono text-xs text-muted-foreground capitalize">
                                    {key.replace(/_/g, " ")}
                                </TableCell>
                                <TableCell className={`text-right font-mono text-xs ${data.value > 0 ? "text-emerald-400" : data.value < 0 ? "text-rose-400" : "text-muted-foreground"}`}>
                                    {data.value > 0 ? "+" : ""}{data.value.toFixed(2)}
                                </TableCell>
                                <TableCell className="text-xs text-white/70">
                                    {data.reason}
                                </TableCell>
                                <TableCell className="text-center">
                                    {data.fired ? (
                                        <CheckCircle2 className="h-4 w-4 text-emerald-500 mx-auto" />
                                    ) : (
                                        <div className="h-1.5 w-1.5 rounded-full bg-white/10 mx-auto" />
                                    )}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </Card>

            {/* Evidence & Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="h-full">
                    <CardHeader className="border-b border-white/[0.04] py-3 bg-white/[0.01]">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <FileText className="h-4 w-4 text-purple-400" /> Evidence Trace
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        {evidence.length > 0 ? (
                            <div className="divide-y divide-white/5">
                                {evidence.map((ev, i) => (
                                    <div key={i} className="p-4 hover:bg-white/[0.01] transition-colors">
                                        <div className="flex items-center justify-between mb-2">
                                            <Badge variant="outline" className="text-[10px] border-purple-500/20 text-purple-300">
                                                {ev.component.replace(/_/g, " ")}
                                            </Badge>
                                            <span className="text-[10px] font-mono text-white/30">{ev.artifact}</span>
                                        </div>
                                        <div className="bg-[#0b0c10] p-2 rounded border border-white/5 font-mono text-[10px] text-white/60 mb-1.5 overflow-x-auto">
                                            {ev.excerpt}
                                        </div>
                                        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                                            <Info className="h-3 w-3" /> {ev.note}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="p-8 text-center text-muted-foreground text-sm italic">
                                No specific evidence snippets extracted for this run.
                            </div>
                        )}
                    </CardContent>
                </Card>

                <div className="space-y-6">
                    <Card>
                        <CardHeader className="border-b border-white/[0.04] py-3 bg-white/[0.01]">
                            <CardTitle className="text-sm font-medium flex items-center gap-2 text-rose-400">
                                <AlertTriangle className="h-4 w-4" /> Limitations & Risks
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4">
                            <ul className="space-y-2">
                                {limitations.map((lim, i) => (
                                    <li key={i} className="text-xs text-white/70 flex gap-2">
                                        <span className="text-rose-500 translate-y-0.5">•</span>
                                        {lim}
                                    </li>
                                ))}
                            </ul>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="border-b border-white/[0.04] py-3 bg-white/[0.01]">
                            <CardTitle className="text-sm font-medium flex items-center gap-2 text-emerald-400">
                                <CheckCircle2 className="h-4 w-4" /> Improvement Actions
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4">
                            <ul className="space-y-2">
                                {improvement_actions.map((action, i) => (
                                    <li key={i} className="text-xs text-white/70 flex gap-2">
                                        <span className="text-emerald-500 translate-y-0.5">•</span>
                                        {action}
                                    </li>
                                ))}
                            </ul>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
