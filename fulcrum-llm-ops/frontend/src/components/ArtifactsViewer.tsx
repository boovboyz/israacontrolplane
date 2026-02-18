import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { FileText, FileJson, X, Clock, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CodeBlock } from "@/components/ui/code-block";
import { fetchArtifact } from "@/api/runs";

interface ArtifactsViewerProps {
    runId: string;
    artifacts: any[];
}

export function ArtifactsViewer({ runId, artifacts }: ArtifactsViewerProps) {
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
