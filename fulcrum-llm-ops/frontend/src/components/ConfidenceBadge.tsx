import { useState, useRef } from "react";
import { HelpCircle, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

interface ConfidenceBadgeProps {
    score?: number;
    label?: string; // "low" | "medium" | "high"
    components?: Record<string, number>;
    runId?: string;
}

export function ConfidenceBadge({ score, label, components, runId }: ConfidenceBadgeProps) {
    const [showTooltip, setShowTooltip] = useState(false);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    if (score === undefined || score === null) {
        return <span className="text-[10px] text-muted-foreground">Confidence: —</span>;
    }

    // Determine color based on label or score
    let colorClass = "text-muted-foreground";
    let bgClass = "bg-muted/10";

    const normalizedLabel = label?.toLowerCase() || (score > 0.8 ? "high" : score > 0.5 ? "medium" : "low");

    switch (normalizedLabel) {
        case "high":
            colorClass = "text-emerald-400";
            bgClass = "bg-emerald-500/10 border-emerald-500/20";
            break;
        case "medium":
            colorClass = "text-amber-400";
            bgClass = "bg-amber-500/10 border-amber-500/20";
            break;
        case "low":
            colorClass = "text-rose-400";
            bgClass = "bg-rose-500/10 border-rose-500/20";
            break;
    }

    const handleMouseEnter = () => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        setShowTooltip(true);
    };

    const handleMouseLeave = () => {
        timeoutRef.current = setTimeout(() => {
            setShowTooltip(false);
        }, 300);
    };

    return (
        <div
            className="relative inline-flex items-center gap-1.5 group"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >
            <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full border ${bgClass}`}>
                <span className={`text-[10px] font-medium uppercase tracking-wider ${colorClass}`}>
                    {normalizedLabel}
                </span>
                <span className={`text-[10px] font-mono border-l border-white/10 pl-1.5 ${colorClass}`}>
                    {score.toFixed(2)}
                </span>
            </div>

            <div className="cursor-help">
                <HelpCircle className="h-3.5 w-3.5 text-muted-foreground/50 hover:text-muted-foreground transition-colors" />
            </div>

            {/* Custom Tooltip */}
            {showTooltip && (
                <div
                    className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 rounded-lg border border-white/10 bg-[#0b0c10] shadow-xl z-50 animate-in fade-in zoom-in-95 duration-200"
                    onMouseEnter={handleMouseEnter}
                    onMouseLeave={handleMouseLeave}
                >
                    <div className="flex items-center gap-2 mb-2 border-b border-white/5 pb-2">
                        <span className="text-xs font-semibold text-white">Confidence Score (v0)</span>
                    </div>

                    {components && Object.keys(components).length > 0 ? (
                        <div className="space-y-1.5">
                            {Object.entries(components).map(([key, val]) => (
                                <div key={key} className="flex justify-between text-[10px]">
                                    <span className="text-muted-foreground capitalize">{key.replace(/_/g, " ")}</span>
                                    <span className={`font-mono ${val > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                        {val > 0 ? '+' : ''}{val.toFixed(2)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-[10px] text-muted-foreground italic">
                            Insufficient signals; score is conservative.
                            <br />
                            (Basic validation checks only)
                        </p>
                    )}

                    <div className="mt-2 pt-2 border-t border-white/5 flex justify-end">
                        {runId ? (
                            <Link
                                to={`/runs/${runId}?tab=confidence`}
                                onClick={(e) => e.stopPropagation()}
                                className="text-[10px] text-blue-400 hover:text-blue-300 hover:underline cursor-pointer flex items-center gap-1"
                            >
                                View full breakdown <ArrowRight className="h-3 w-3" />
                            </Link>
                        ) : (
                            <span className="text-[10px] text-muted-foreground flex items-center gap-1 cursor-not-allowed opacity-50">
                                View full breakdown (N/A)
                            </span>
                        )}
                    </div>

                    {/* Arrow */}
                    <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-[#0b0c10]" />
                </div>
            )}
        </div>
    );
}
