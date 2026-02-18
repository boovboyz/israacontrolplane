import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { CodeBlock } from "@/components/ui/code-block";
import { Badge } from "@/components/ui/badge";

interface TraceViewProps {
    run: any;
}

export function TraceView({ run }: TraceViewProps) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-full">
            <Card className="flex flex-col overflow-hidden h-full">
                <CardHeader className="bg-white/[0.02] border-b border-white/[0.04] py-3">
                    <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">Input / Prompt</CardTitle>
                </CardHeader>
                <div className="flex-1 bg-[#0d0f14] relative">
                    <CodeBlock
                        code={run.input_preview || run.inputs || { prompt: run.prompt } || {}}
                        className="rounded-none border-0 bg-transparent h-full max-h-[500px]"
                    />
                </div>
            </Card>

            <Card className="flex flex-col overflow-hidden h-full border-blue-500/20">
                <CardHeader className="bg-blue-500/5 border-b border-blue-500/10 py-3 flex flex-row items-center justify-between">
                    <CardTitle className="text-sm font-medium uppercase tracking-wider text-blue-400">Model Output</CardTitle>
                    <Badge variant="outline" className="text-[10px] border-blue-500/20 text-blue-400">Final Answer</Badge>
                </CardHeader>
                <div className="flex-1 bg-[#0d0f14] relative">
                    <CodeBlock
                        code={run.output_preview || run.outputs || { output: run.output } || {}}
                        className="rounded-none border-0 bg-transparent h-full max-h-[500px]"
                    />
                </div>
            </Card>
        </div>
    );
}
