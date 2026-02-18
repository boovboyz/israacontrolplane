import { cn } from "@/lib/utils";
import { Check, Copy } from "lucide-react";
import { useState } from "react";

interface CodeBlockProps {
    code: string | object;
    language?: string;
    className?: string;
    maxHeight?: string;
    editable?: boolean;
    onChange?: (value: string) => void;
}

export function CodeBlock({ code, language: _language = "json", className, maxHeight, editable, onChange }: CodeBlockProps) {
    const [copied, setCopied] = useState(false);

    const text = typeof code === 'string' ? code : JSON.stringify(code, null, 2);

    const copyToClipboard = () => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    if (editable) {
        return (
            <div className={cn("relative group rounded-lg border bg-[#0d0f14] overflow-hidden text-sm", className)}>
                <textarea
                    value={text}
                    onChange={(e) => onChange?.(e.target.value)}
                    className={cn(
                        "w-full bg-transparent p-4 font-mono text-xs leading-relaxed text-blue-100/90 focus:outline-none resize-none custom-scrollbar",
                        maxHeight ? "overflow-y-auto" : "h-full"
                    )}
                    style={{ height: maxHeight || "300px" }}
                    spellCheck={false}
                />
            </div>
        );
    }

    return (
        <div className={cn("relative group rounded-lg border bg-[#0d0f14] overflow-hidden text-sm", className)}>
            <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                <button
                    onClick={copyToClipboard}
                    className="p-1.5 rounded-md bg-white/10 hover:bg-white/20 text-muted-foreground transition-colors"
                >
                    {copied ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
            </div>
            <pre
                className={cn("p-4 overflow-x-auto font-mono text-xs leading-relaxed custom-scrollbar", maxHeight ? "overflow-y-auto" : "")}
                style={{ maxHeight }}
            >
                <code className="text-blue-100/90">{text}</code>
            </pre>
        </div>
    );
}
