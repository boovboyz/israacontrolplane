import { useState, useEffect } from "react";
import { X, Loader2, Download } from "lucide-react";
import { fetchArtifact } from "@/api/runs";

interface ArtifactViewerProps {
    runId: string;
    path: string;
    isOpen: boolean;
    onClose: () => void;
}

export function ArtifactViewer({ runId, path, isOpen, onClose }: ArtifactViewerProps) {
    const [content, setContent] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen && runId && path) {
            setLoading(true);
            setError(null);
            fetchArtifact(runId, path)
                .then(setContent)
                .catch(err => {
                    setError(err.message);
                    setContent(null);
                })
                .finally(() => setLoading(false));
        } else {
            setContent(null);
        }
    }, [isOpen, runId, path]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
            <div className="bg-card border shadow-lg rounded-lg w-full max-w-3xl h-[80vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between p-4 border-b">
                    <div>
                        <h3 className="font-semibold text-lg">{path.split('/').pop()}</h3>
                        <p className="text-xs text-muted-foreground font-mono">{path}</p>
                    </div>
                    <div className="flex items-center gap-2">
                        {/* Download button mockup */}
                        <button className="p-2 hover:bg-muted rounded-md" title="Download">
                            <Download className="h-4 w-4" />
                        </button>
                        <button onClick={onClose} className="p-2 hover:bg-muted rounded-md">
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-auto p-4 bg-muted/10 font-mono text-sm relative">
                    {loading && (
                        <div className="absolute inset-0 flex items-center justify-center bg-background/50">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    )}

                    {error ? (
                        <div className="text-destructive flex flex-col items-center justify-center h-full">
                            <p className="font-semibold">Failed to load artifact</p>
                            <p className="text-sm">{error}</p>
                        </div>
                    ) : (
                        <pre className="whitespace-pre-wrap break-words">
                            {content}
                        </pre>
                    )}
                </div>
            </div>
        </div>
    );
}
