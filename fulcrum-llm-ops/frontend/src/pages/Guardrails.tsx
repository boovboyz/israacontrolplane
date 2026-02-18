import { Shield, AlertTriangle, CheckCircle, Search, Plus, MoreHorizontal, Lock, Activity, RotateCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";

// API Client (Simple inline for now, ideally in api/client.ts)
const API_URL = "http://localhost:8000";

interface Policy {
    id: string;
    name: string;
    description: string;
    type: "pii" | "toxicity" | "topic" | "bias";
    status: "active" | "monitor" | "inactive";
    violations_24h: number;
}

const fetchPolicies = async (): Promise<Policy[]> => {
    const res = await axios.get(`${API_URL}/guardrails/policies`);
    return res.data;
};

export function GuardrailsPage() {
    const { data: policies, isLoading, isError, refetch } = useQuery({
        queryKey: ['policies'],
        queryFn: fetchPolicies,
        refetchInterval: 5000 // Poll every 5s for demo
    });

    if (isLoading) {
        return <div className="p-12 flex justify-center"><RotateCcw className="animate-spin h-6 w-6 text-muted-foreground" /></div>
    }

    if (isError) {
        return <div className="p-12 text-center text-red-500">Failed to load policies. Is backend running?</div>
    }

    const activeCount = policies?.filter(p => p.status === 'active').length || 0;
    const totalViolations = policies?.reduce((acc, p) => acc + p.violations_24h, 0) || 0;

    return (
        <div className="p-8 space-y-8 h-full overflow-y-auto bg-background">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Guardrails</h1>
                    <p className="text-muted-foreground mt-1">
                        Safety policies and intervention rules.
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => refetch()}>
                        <RotateCcw className="h-4 w-4 mr-2" /> Refresh
                    </Button>
                    <Button className="gap-2">
                        <Plus className="h-4 w-4" /> New Policy
                    </Button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="p-6 flex items-center justify-between shadow-sm border-white/5 bg-card">
                    <div>
                        <div className="text-sm font-medium text-muted-foreground">Active Policies</div>
                        <div className="text-3xl font-bold mt-1">{activeCount}</div>
                    </div>
                    <div className="p-3 bg-emerald-500/10 rounded-lg text-emerald-500">
                        <Shield className="h-6 w-6" />
                    </div>
                </Card>
                <Card className="p-6 flex items-center justify-between shadow-sm border-white/5 bg-card">
                    <div>
                        <div className="text-sm font-medium text-muted-foreground">Interventions (24h)</div>
                        <div className="text-3xl font-bold mt-1 text-rose-500">{totalViolations}</div>
                    </div>
                    <div className="p-3 bg-rose-500/10 rounded-lg text-rose-500">
                        <AlertTriangle className="h-6 w-6" />
                    </div>
                </Card>
                <Card className="p-6 flex items-center justify-between shadow-sm border-white/5 bg-card">
                    <div>
                        <div className="text-sm font-medium text-muted-foreground">Latency Impact</div>
                        <div className="text-3xl font-bold mt-1 text-blue-500">~15ms</div>
                    </div>
                    <div className="p-3 bg-blue-500/10 rounded-lg text-blue-500">
                        <Activity className="h-6 w-6" />
                    </div>
                </Card>
            </div>

            {/* Main Content */}
            <div className="space-y-4">
                <div className="flex justify-between items-center">
                    <div className="relative w-96">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search policies..."
                            className="pl-10 bg-background border-border"
                        />
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline">Filter by Type</Button>
                        <Button variant="outline">Status</Button>
                    </div>
                </div>

                <div className="border border-border rounded-lg overflow-hidden bg-card shadow-sm">
                    <div className="grid grid-cols-12 bg-muted/30 border-b border-border py-3 px-6 text-xs uppercase tracking-wider font-semibold text-muted-foreground">
                        <div className="col-span-4">Policy Name</div>
                        <div className="col-span-2">Type</div>
                        <div className="col-span-2">Status</div>
                        <div className="col-span-2 text-right">Violations (24h)</div>
                        <div className="col-span-2 text-right">Actions</div>
                    </div>
                    <div className="divide-y divide-border">
                        {policies?.map((p) => (
                            <div key={p.id} className="grid grid-cols-12 items-center py-4 px-6 hover:bg-muted/30 transition-colors">
                                <div className="col-span-4">
                                    <div className="font-medium text-foreground">{p.name}</div>
                                    <div className="text-xs text-muted-foreground">{p.description}</div>
                                </div>
                                <div className="col-span-2">
                                    <Badge variant="outline" className="capitalize text-[10px]">{p.type}</Badge>
                                </div>
                                <div className="col-span-2">
                                    {p.status === 'active' && <Badge variant="default" className="gap-1 bg-emerald-500 hover:bg-emerald-600"><CheckCircle className="h-3 w-3" /> Active</Badge>}
                                    {p.status === 'monitor' && <Badge variant="secondary" className="gap-1"><Activity className="h-3 w-3" /> Monitor</Badge>}
                                    {p.status === 'inactive' && <Badge variant="outline" className="gap-1"><Lock className="h-3 w-3" /> Inactive</Badge>}
                                </div>
                                <div className="col-span-2 text-right font-mono text-sm text-foreground/80">
                                    {p.violations_24h}
                                </div>
                                <div className="col-span-2 flex justify-end">
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                                        <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
