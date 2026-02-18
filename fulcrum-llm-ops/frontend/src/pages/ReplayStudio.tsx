import { useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchRunStages, runStagedReplay } from '@/api/replay';
import { createPrompt } from '@/api/prompts';
import { apiClient } from "@/api/client";
import { RunStageArtifacts, ReplayOverrides } from '@/lib/types';
import {
    Play, RotateCcw, Zap, Sliders,
    MessageSquare,
    CheckCircle2,
    Database, FileText, BrainCircuit, Terminal,
    ArrowRight, Save
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CodeBlock } from "@/components/ui/code-block";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ConfidenceBadge } from "@/components/ConfidenceBadge";
import {
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

// Stages definition
const STAGES = [
    { id: 0, name: "User Question", icon: MessageSquare, color: "text-blue-400" },
    { id: 1, name: "Knowledge Retrieval", icon: Database, color: "text-indigo-400" },
    { id: 2, name: "KPI Summary", icon: FileText, color: "text-emerald-400" },
    { id: 3, name: "Prompt Assembly", icon: BrainCircuit, color: "text-amber-400" },
    { id: 4, name: "Model Response", icon: Terminal, color: "text-purple-400" },
    { id: 5, name: "Parsed Forecast", icon: CheckCircle2, color: "text-green-400" },
];

export function ReplayStudio() {
    const [searchParams] = useSearchParams();
    const sourceRunId = searchParams.get('sourceRunId');
    const isPlayground = !sourceRunId;
    const queryClient = useQueryClient();

    // UI State
    const [activeStage, setActiveStage] = useState<number>(0);
    const [replayFromStage, setReplayFromStage] = useState<number>(0);
    const [prompt, setPrompt] = useState(""); // For Playground mode

    // Save Prompt State
    const [isSaveOpen, setIsSaveOpen] = useState(false);
    const [saveName, setSaveName] = useState("");
    const [saveSlug, setSaveSlug] = useState("");

    // Config State
    const [model, setModel] = useState("gpt-4-turbo");
    const [temperature, setTemperature] = useState(0.7);
    const [recomputeRetrieval, setRecomputeRetrieval] = useState(false);
    const [recomputeKPI, setRecomputeKPI] = useState(false);

    // Data State
    const [originalStages, setOriginalStages] = useState<RunStageArtifacts | null>(null);
    const [overrides, setOverrides] = useState<ReplayOverrides>({});
    const [lastResult, setLastResult] = useState<any>(null);

    // Load Source Run (Only for Replay Mode)
    const { data: sourceData, isLoading: isLoadingSource } = useQuery({
        queryKey: ['run-stages', sourceRunId],
        queryFn: () => fetchRunStages(sourceRunId!),
        enabled: !!sourceRunId,
    });

    useEffect(() => {
        if (sourceData) {
            setOriginalStages(sourceData.stages);
            setModel(sourceData.model || "gpt-4-turbo");
            setTemperature(sourceData.temperature);
        }
    }, [sourceData]);

    // Playground Mutation (Ad-hoc run)
    const playgroundMutation = useMutation({
        mutationFn: (data: any) => apiClient.post("/replay", data).then(res => res.data),
        onSuccess: (data) => {
            setLastResult({
                // Normalize response to match ReplayStagedResponse structure roughly
                new_run_id: data.new_run_id,
                output_text: data.output_text,
                metrics: {
                    latency_ms: data.latency_ms,
                    cost_usd: data.cost_usd,
                    confidence: data.confidence,
                    parse_success: 0 // Playground doesn't have this usually
                }
            });
            toast.success("Run completed");
        },
        onError: (err: any) => {
            const msg = err.response?.data?.detail || err.message || "Unknown error";
            toast.error(`Run failed: ${msg}`);
            console.error(err);
        }
    });

    // Replay Mutation (Staged replay)
    const replayMutation = useMutation({
        mutationFn: runStagedReplay,
        onSuccess: (data) => {
            setLastResult(data);
            toast.success("Replay completed successfully");
        },
        onError: (err: any) => {
            const msg = err.response?.data?.detail || err.message || "Unknown error";
            toast.error(`Replay failed: ${msg}`);
            console.error(err);
        }
    });

    // Save Prompt Mutation
    const savePromptMutation = useMutation({
        mutationFn: createPrompt,
        onSuccess: () => {
            toast.success("Prompt saved to library");
            setIsSaveOpen(false);
            setSaveName("");
            setSaveSlug("");
            queryClient.invalidateQueries({ queryKey: ["prompts"] });
        },
        onError: (err: any) => {
            toast.error("Failed to save prompt: " + err.response?.data?.detail);
        }
    });

    const isPending = playgroundMutation.isPending || replayMutation.isPending;

    const handleRun = () => {
        if (isPlayground) {
            if (!prompt.trim()) {
                toast.error("Please enter a prompt");
                return;
            }
            playgroundMutation.mutate({
                source_run_id: "playground",
                model,
                temperature,
                prompt: prompt.trim(),
            });
        } else {
            if (!sourceRunId) return;
            replayMutation.mutate({
                source_run_id: sourceRunId,
                replay_from_stage: replayFromStage,
                model,
                temperature,
                overrides,
                options: {
                    recompute_retrieval: recomputeRetrieval,
                    recompute_kpi: recomputeKPI
                }
            });
        }
    };

    const handleSavePrompt = () => {
        // Get content based on current view/context
        // If Playground: use 'prompt' state
        // If Replay Stage 3 (Prompt): use 'prompt_packet' override or original

        let templateContent = "";

        if (isPlayground) {
            templateContent = prompt;
        } else if (activeStage === 3) {
            templateContent = getStageValue('prompt_packet') as string;
        } else {
            toast.error("Navigate to the 'Prompt Assembly' stage to save the prompt.");
            return;
        }

        if (!templateContent) {
            toast.error("Prompt content is empty.");
            return;
        }

        savePromptMutation.mutate({
            name: saveName,
            slug: saveSlug,
            template: templateContent,
            author: "User", // TODO
            status: "dev"
        });
    };

    // Helper to get current value for a stage (Override > Original > Empty)
    const getStageValue = (field: keyof RunStageArtifacts) => {
        // @ts-ignore
        if (overrides[field] !== undefined) return overrides[field];
        // @ts-ignore
        if (originalStages && originalStages[field] !== undefined) return originalStages[field];
        return "";
    };

    const updateOverride = (field: keyof ReplayOverrides, value: any) => {
        setOverrides(prev => ({
            ...prev,
            [field]: value
        }));
    };

    // Render Editor Content based on Active Stage
    const renderEditor = () => {
        if (isPlayground) {
            return (
                <div className="flex flex-col h-full bg-[#0d0f14]">
                    <div className="flex-1 p-0">
                        <textarea
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            placeholder="Enter your prompt here..."
                            className="w-full h-full bg-transparent border-none p-3 font-mono text-xs resize-none focus:outline-none"
                        />
                    </div>
                </div>
            );
        }

        const isReadOnly = activeStage < replayFromStage;

        // Helper to render read-only banner
        const ReadOnlyBanner = () => (
            <div className="bg-muted/30 border-b border-white/5 px-4 py-2 text-xs text-muted-foreground flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-yellow-500/50" />
                Read-only: This stage is upstream of your selected "Replay From" point.
            </div>
        );

        switch (activeStage) {
            case 0: // User Question
                return (
                    <div className="flex flex-col h-full bg-[#0d0f14]">
                        {isReadOnly && <ReadOnlyBanner />}
                        <div className="flex-1 p-0 relative">
                            {/* <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1 absolute top-2 right-4 z-10 opacity-50">
                                User Question
                            </label> */}
                            <textarea
                                value={getStageValue('user_question') as string}
                                onChange={(e) => updateOverride('user_question', e.target.value)}
                                disabled={isReadOnly}
                                className={cn(
                                    "w-full h-full bg-transparent border-none p-3 font-mono text-xs resize-none focus:outline-none",
                                    isReadOnly && "opacity-60 cursor-not-allowed"
                                )}
                                placeholder="Enter user question..."
                            />
                        </div>
                    </div>
                );
            case 1: // Retrieval
                return (
                    <div className="flex flex-col h-full bg-[#0d0f14]">
                        {isReadOnly && <ReadOnlyBanner />}
                        <div className="flex-1 p-0 overflow-hidden flex flex-col">
                            <div className="flex justify-between items-center px-3 py-1.5 border-b border-white/5 bg-white/[0.01]">
                                <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                                    Knowledge Retrieval Sources (JSON)
                                </label>
                                {activeStage >= replayFromStage && (
                                    <div className="text-[9px] text-muted-foreground uppercase opacity-70">
                                        Editable
                                    </div>
                                )}
                            </div>
                            <div className="flex-1 overflow-auto">
                                <CodeBlock
                                    code={getStageValue('retrieved_sources')}
                                    language="json"
                                    editable={!isReadOnly}
                                    onChange={(val) => {
                                        try {
                                            updateOverride('retrieved_sources', JSON.parse(val));
                                        } catch (e) { }
                                    }}
                                />
                            </div>
                        </div>
                    </div>
                );
            case 2: // KPI
                return (
                    <div className="flex flex-col h-full bg-[#0d0f14]">
                        {isReadOnly && <ReadOnlyBanner />}
                        <div className="flex-1 p-0 overflow-hidden flex flex-col">
                            <div className="px-3 py-1.5 border-b border-white/5 bg-white/[0.01]">
                                <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                                    KPI Summary (JSON)
                                </label>
                            </div>
                            <div className="flex-1 overflow-auto">
                                <CodeBlock
                                    code={getStageValue('kpi_summary')}
                                    language="json"
                                    editable={!isReadOnly}
                                    onChange={(val) => {
                                        try {
                                            updateOverride('kpi_summary', JSON.parse(val));
                                        } catch (e) { }
                                    }}
                                />
                            </div>
                        </div>
                    </div>
                );
            case 3: // Prompt
                return (
                    <div className="flex flex-col h-full bg-[#0d0f14]">
                        {isReadOnly && <ReadOnlyBanner />}
                        <div className="flex-1 p-0">
                            <div className="px-3 py-1.5 border-b border-white/5 bg-white/[0.01]">
                                <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                                    Constructed Prompt Packet
                                </label>
                            </div>
                            <textarea
                                value={getStageValue('prompt_packet') as string}
                                onChange={(e) => updateOverride('prompt_packet', e.target.value)}
                                disabled={isReadOnly}
                                className={cn(
                                    "w-full h-[calc(100%-28px)] bg-transparent border-none p-3 font-mono text-xs resize-none focus:outline-none",
                                    isReadOnly && "opacity-60 cursor-not-allowed"
                                )}
                            />
                        </div>
                    </div>
                );
            case 4: // LLM Response
                return (
                    <div className="flex flex-col h-full bg-[#0d0f14]">
                        {isReadOnly && <ReadOnlyBanner />}
                        <div className="flex-1 p-0">
                            <div className="px-3 py-1.5 border-b border-white/5 bg-white/[0.01]">
                                <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                                    {model || "Model"} Response
                                </label>
                            </div>
                            <textarea
                                value={getStageValue('llm_response') as string}
                                onChange={(e) => updateOverride('llm_response', e.target.value)}
                                disabled={isReadOnly}
                                className={cn(
                                    "w-full h-[calc(100%-28px)] bg-transparent border-none p-3 font-mono text-xs resize-none focus:outline-none",
                                    isReadOnly && "opacity-60 cursor-not-allowed"
                                )}
                            />
                        </div>
                    </div>
                );
            default:
                return <div className="p-12 text-center text-muted-foreground">Select a stage to view/edit</div>;
        }
    };

    return (
        <div className="flex flex-col h-screen overflow-hidden bg-background">
            {/* Header */}
            <div className="h-12 border-b border-white/[0.04] bg-white/[0.01] flex items-center justify-between px-4 shrink-0">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-primary/10 rounded-lg text-primary">
                        <Zap className="h-3.5 w-3.5" />
                    </div>
                    <h1 className="text-xs font-semibold tracking-wide uppercase text-muted-foreground/80">
                        {isPlayground ? "Playground" : "Replay Studio"}
                    </h1>
                    {sourceRunId && (
                        <div className="flex items-center gap-2 ml-4 px-3 py-0.5 bg-white/[0.03] rounded-full border border-white/[0.05]">
                            <span className="text-[10px] text-muted-foreground">Source:</span>
                            <span className="text-[10px] font-mono text-white">{sourceRunId}</span>
                        </div>
                    )}
                    {sourceData && sourceData.confidence !== undefined && (
                        <div className="ml-2">
                            <ConfidenceBadge
                                score={sourceData.confidence}
                                label={sourceData.confidence_label}
                                components={sourceData.confidence_components}
                            />
                        </div>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <Link to="/runs">
                        <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground">
                            Close
                        </Button>
                    </Link>
                </div>
            </div>

            {/* Main 3-Column Layout */}
            <div className="flex-1 flex overflow-hidden">

                {/* COL 1: Controls */}
                <div className="w-[280px] border-r border-white/[0.04] bg-[#0A0C10] flex flex-col">
                    <div className="p-3 space-y-4 overflow-y-auto">

                        {/* 1. Configuration */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold uppercase text-muted-foreground flex items-center gap-2 px-1">
                                <Sliders className="h-3 w-3" /> {isPlayground ? "Run Config" : "Replay Config"}
                            </label>

                            <div className="space-y-3 p-2.5 bg-white/[0.02] rounded-lg border border-white/[0.04]">
                                {!isPlayground && (
                                    <div className="space-y-1">
                                        <label className="text-[10px] text-muted-foreground">Start Replay From</label>
                                        <Select
                                            value={String(replayFromStage)}
                                            onValueChange={(v) => {
                                                const val = parseInt(v);
                                                setReplayFromStage(val);
                                                setActiveStage(val); // Auto switch view
                                            }}
                                        >
                                            <SelectTrigger className="h-7 text-[11px] bg-[#0d0f14] border-white/10">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {STAGES.slice(0, 5).map(s => (
                                                    <SelectItem key={s.id} value={String(s.id)} className="text-[11px]">
                                                        {s.id}. {s.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}

                                <div className="space-y-1">
                                    <label className="text-[10px] text-muted-foreground">Model</label>
                                    <Select
                                        value={model}
                                        onValueChange={setModel}
                                    >
                                        <SelectTrigger className="h-7 text-[11px] bg-[#0d0f14] border-white/10">
                                            <SelectValue placeholder="Select model" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="gpt-4-turbo" className="text-[11px]">gpt-4-turbo</SelectItem>
                                            <SelectItem value="gpt-3.5-turbo" className="text-[11px]">gpt-3.5-turbo</SelectItem>
                                            <SelectItem value="grok-beta" className="text-[11px]">grok-beta</SelectItem>
                                            <SelectItem value="mock-llm" className="text-[11px]">mock-llm</SelectItem>
                                            {model && !["gpt-4-turbo", "gpt-3.5-turbo", "grok-beta", "mock-llm"].includes(model) && (
                                                <SelectItem value={model} className="text-[11px]">{model} (Source)</SelectItem>
                                            )}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-1">
                                    <div className="flex justify-between">
                                        <label className="text-[10px] text-muted-foreground">Temperature</label>
                                        <span className="text-[10px] text-muted-foreground font-mono">{temperature}</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="0"
                                        max="2"
                                        step="0.1"
                                        value={temperature}
                                        onChange={(e) => setTemperature(parseFloat(e.target.value))}
                                        className="w-full accent-primary h-1 bg-white/10 rounded-lg appearance-none cursor-pointer mt-1"
                                    />
                                </div>

                                {!isPlayground && (
                                    <div className="space-y-2 pt-2 border-t border-white/[0.05]">
                                        {replayFromStage <= 1 && (
                                            <div className="flex items-center justify-between">
                                                <label className="text-[10px] text-muted-foreground">Recompute Retrieval</label>
                                                <Switch
                                                    checked={recomputeRetrieval}
                                                    onCheckedChange={setRecomputeRetrieval}
                                                    className="scale-75 origin-right"
                                                />
                                            </div>
                                        )}
                                        {replayFromStage <= 2 && (
                                            <div className="flex items-center justify-between">
                                                <label className="text-[10px] text-muted-foreground">Recompute KPI</label>
                                                <Switch
                                                    checked={recomputeKPI}
                                                    onCheckedChange={setRecomputeKPI}
                                                    className="scale-75 origin-right"
                                                />
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* 2. Run Button */}
                        <Button
                            className="w-full shadow-lg shadow-primary/20 h-8 text-xs bg-primary hover:bg-primary/90"
                            onClick={handleRun}
                            disabled={isPending}
                        >
                            {isPending ? (
                                <RotateCcw className="h-3.5 w-3.5 mr-2 animate-spin" />
                            ) : (
                                <Play className="h-3.5 w-3.5 mr-2 fill-current" />
                            )}
                            {isPlayground ? "Run" : "Run Replay"}
                        </Button>

                        {/* Pipeline Stages - Only in Replay Mode */}
                        {!isPlayground && (
                            <div className="pt-4 border-t border-white/[0.04]">
                                <label className="text-[10px] font-bold uppercase text-muted-foreground mb-2 px-1 block">
                                    Pipeline Stages
                                </label>
                                <div className="space-y-0.5">
                                    {STAGES.map((stage) => {
                                        const isActive = activeStage === stage.id;
                                        const isReplayPoint = replayFromStage === stage.id;

                                        return (
                                            <button
                                                key={stage.id}
                                                onClick={() => setActiveStage(stage.id)}
                                                className={cn(
                                                    "w-full flex items-center gap-2.5 px-2 py-1.5 rounded text-left transition-colors relative hover:bg-white/[0.02]",
                                                    isActive ? "bg-primary/10 text-white" : "text-muted-foreground",
                                                )}
                                            >
                                                {isReplayPoint && (
                                                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-3/4 bg-primary rounded-r-full shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                                                )}
                                                <stage.icon className={cn("h-3.5 w-3.5", stage.color)} />
                                                <span className="text-[11px] font-medium">{stage.name}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                    </div>
                </div>

                {/* COL 2: Editor */}
                <div className="flex-1 flex flex-col min-w-[400px] border-r border-white/[0.04] bg-[#0d0f14]/30">
                    <div className="h-9 border-b border-white/[0.04] flex items-center px-3 bg-white/[0.01] justify-between">
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-medium text-muted-foreground">Editor View:</span>
                            <Badge variant="outline" className="text-[10px] h-4 px-1.5 border-white/10 font-normal">
                                {isPlayground ? "Prompt" : STAGES[activeStage]?.name}
                            </Badge>
                        </div>
                        {/* Save to Library Button */}
                        {(isPlayground || activeStage === 3) && (
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-6 gap-1 text-[10px]"
                                onClick={() => setIsSaveOpen(true)}
                            >
                                <Save className="h-3 w-3" /> Save to Library
                            </Button>
                        )}
                    </div>
                    <div className="flex-1 overflow-hidden relative">
                        {isLoadingSource ? (
                            <div className="absolute inset-0 flex items-center justify-center">
                                <RotateCcw className="h-5 w-5 animate-spin text-muted-foreground" />
                            </div>
                        ) : (
                            renderEditor()
                        )}
                    </div>
                </div>

                {/* COL 3: Output */}
                <div className="w-[380px] bg-[#0A0C10] flex flex-col">
                    {/* ... (Existing Output logic) ... */}
                    <div className="h-9 border-b border-white/[0.04] flex items-center justify-between px-3 bg-white/[0.01]">
                        <label className="text-[10px] font-bold uppercase text-muted-foreground flex items-center gap-2">
                            <CheckCircle2 className="h-3 w-3" /> {isPlayground ? "Results" : "Replay Results"}
                        </label>
                        {lastResult && (
                            <Link to={`/runs/${lastResult.new_run_id}`} target="_blank">
                                <Button variant="ghost" size="sm" className="h-5 text-[10px] gap-1 px-1.5 hover:bg-white/5">
                                    View Run <ArrowRight className="h-2.5 w-2.5" />
                                </Button>
                            </Link>
                        )}
                    </div>

                    <div className="flex-1 overflow-auto p-4">
                        {!lastResult && !isPending && (
                            <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-30">
                                <Zap className="h-12 w-12 mb-2" />
                                <p className="text-sm">Ready to {isPlayground ? "Run" : "Replay"}</p>
                            </div>
                        )}

                        {isPending && (
                            <div className="h-full flex flex-col items-center justify-center text-primary animate-pulse">
                                <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin mb-4" />
                                <p className="text-sm">Running Pipeline...</p>
                            </div>
                        )}

                        {lastResult && (
                            <div className="space-y-6 animate-fade-in">
                                {/* Output Metrics */}
                                <div className="grid grid-cols-2 gap-3">
                                    <Card className="bg-white/[0.02] border-white/[0.05] p-3">
                                        <div className="text-[10px] text-muted-foreground uppercase">Latency</div>
                                        <div className="text-lg font-mono text-blue-400">
                                            {lastResult.metrics.latency_ms}ms
                                        </div>
                                    </Card>
                                    <Card className="bg-white/[0.02] border-white/[0.05] p-3">
                                        <div className="text-[10px] text-muted-foreground uppercase">Cost</div>
                                        <div className="text-lg font-mono text-emerald-400">
                                            ${lastResult.metrics.cost_usd.toFixed(4)}
                                        </div>
                                    </Card>
                                    <Card className="bg-white/[0.02] border-white/[0.05] p-3">
                                        <div className="text-[10px] text-muted-foreground uppercase">Confidence</div>
                                        <div className="text-lg font-mono text-purple-400">
                                            {(lastResult.metrics.confidence * 100).toFixed(0)}%
                                        </div>
                                    </Card>
                                    <Card className="bg-white/[0.02] border-white/[0.05] p-3">
                                        <div className="text-[10px] text-muted-foreground uppercase">Success</div>
                                        <div className="text-lg font-mono text-white">
                                            {lastResult.metrics.parse_success ? "YES" : "NO"}
                                        </div>
                                    </Card>
                                </div>

                                {/* Text Output */}
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold uppercase text-muted-foreground">Output Text</label>
                                    <div className="bg-[#0d0f14] border border-white/[0.1] rounded-md p-3 text-xs font-mono text-white/80 max-h-[300px] overflow-auto whitespace-pre-wrap">
                                        {lastResult.output_text}
                                    </div>
                                </div>

                                {/* Parsed Forecast */}
                                {lastResult.parsed_forecast && (
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold uppercase text-muted-foreground">Parsed Forecast</label>
                                        <CodeBlock code={lastResult.parsed_forecast} language="json" />
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

            </div>

            {/* Save Prompt Dialog */}
            <Dialog open={isSaveOpen} onOpenChange={setIsSaveOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Save to Prompt Library</DialogTitle>
                        <DialogDescription>
                            Save the current prompt template to the library for reuse.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Prompt Name</Label>
                            <Input
                                placeholder="e.g. Optimized Forecast"
                                value={saveName}
                                onChange={e => setSaveName(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Slug (ID)</Label>
                            <Input
                                placeholder="e.g. optimized_forecast"
                                value={saveSlug}
                                onChange={e => setSaveSlug(e.target.value)}
                            />
                            <p className="text-[10px] text-muted-foreground">
                                Unique identifier for fetching the prompt programmatically.
                            </p>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsSaveOpen(false)}>Cancel</Button>
                        <Button onClick={handleSavePrompt} disabled={savePromptMutation.isPending}>
                            Save Prompt
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div >
    );
}
