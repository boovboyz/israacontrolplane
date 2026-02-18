import { Download, FileJson, FileText, Database } from "lucide-react";

export function ExportsPage() {
    return (
        <div className="p-6 space-y-6 h-full overflow-y-auto">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight">Data Export</h1>
                    <p className="text-muted-foreground">Download logs, traces, and datasets</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Card 1 */}
                <div className="bg-card border rounded-lg p-6 hover:shadow-md transition-shadow">
                    <div className="p-3 bg-blue-500/10 text-blue-500 rounded-lg w-fit mb-4"><Database className="h-6 w-6" /></div>
                    <h3 className="font-semibold text-lg mb-2">Run Traces</h3>
                    <p className="text-sm text-muted-foreground mb-6">Full export of all LLM execution traces, including inputs, outputs, and metadata.</p>
                    <button className="w-full flex items-center justify-center gap-2 px-4 py-2 border rounded-md hover:bg-muted transition-colors text-sm">
                        <Download className="h-4 w-4" /> Export CSV
                    </button>
                    <button className="w-full flex items-center justify-center gap-2 px-4 py-2 mt-2 border rounded-md hover:bg-muted transition-colors text-sm">
                        <Download className="h-4 w-4" /> Export JSON
                    </button>
                </div>

                {/* Card 2 */}
                <div className="bg-card border rounded-lg p-6 hover:shadow-md transition-shadow">
                    <div className="p-3 bg-green-500/10 text-green-500 rounded-lg w-fit mb-4"><FileText className="h-6 w-6" /></div>
                    <h3 className="font-semibold text-lg mb-2">Evaluation Reports</h3>
                    <p className="text-sm text-muted-foreground mb-6">Aggregate summaries of evaluation suites, pass rates, and failure analysis.</p>
                    <button className="w-full flex items-center justify-center gap-2 px-4 py-2 border rounded-md hover:bg-muted transition-colors text-sm">
                        <Download className="h-4 w-4" /> Download PDF Report
                    </button>
                </div>

                {/* Card 3 */}
                <div className="bg-card border rounded-lg p-6 hover:shadow-md transition-shadow">
                    <div className="p-3 bg-purple-500/10 text-purple-500 rounded-lg w-fit mb-4"><FileJson className="h-6 w-6" /></div>
                    <h3 className="font-semibold text-lg mb-2">Policy Violations</h3>
                    <p className="text-sm text-muted-foreground mb-6">Log of all guardrail triggers and blocked content events for compliance review.</p>
                    <button className="w-full flex items-center justify-center gap-2 px-4 py-2 border rounded-md hover:bg-muted transition-colors text-sm">
                        <Download className="h-4 w-4" /> Export Audit Log
                    </button>
                </div>
            </div>
        </div>
    );
}
