import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Book, Plus, Search, MoreHorizontal, History, Copy } from "lucide-react";
import { fetchPrompts, createPrompt, Prompt } from "@/api/prompts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";

export function PromptLibrary() {
    const queryClient = useQueryClient();
    const [search, setSearch] = useState("");
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [selectedPrompt, setSelectedPrompt] = useState<Prompt | null>(null);

    // Create Form State
    const [newName, setNewName] = useState("");
    const [newSlug, setNewSlug] = useState("");
    const [newTemplate, setNewTemplate] = useState("");

    const { data: prompts, isLoading } = useQuery({
        queryKey: ["prompts"],
        queryFn: fetchPrompts
    });

    const createMutation = useMutation({
        mutationFn: createPrompt,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["prompts"] });
            setIsCreateOpen(false);
            setNewName("");
            setNewSlug("");
            setNewTemplate("");
            toast.success("Prompt created successfully");
        },
        onError: (err: any) => {
            toast.error("Failed to create prompt: " + err.response?.data?.detail);
        }
    });

    const handleCreate = () => {
        if (!newName || !newSlug || !newTemplate) return;
        createMutation.mutate({
            name: newName,
            slug: newSlug,
            template: newTemplate,
            author: "You", // TODO: Auth
            status: "dev"
        });
    };

    const filteredPrompts = prompts?.filter(p =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.id.toLowerCase().includes(search.toLowerCase())
    ) || [];

    return (
        <div className="p-6 space-y-6 h-full overflow-y-auto bg-background">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight">Prompt Library</h1>
                    <p className="text-muted-foreground">Manage and version control your prompt templates</p>
                </div>

                <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                    <DialogTrigger asChild>
                        <Button className="gap-2">
                            <Plus className="h-4 w-4" /> New Prompt
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Create New Prompt</DialogTitle>
                            <DialogDescription>
                                Add a new prompt template to the library.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label>Name</Label>
                                <Input placeholder="e.g. Sales Forecast Agent" value={newName} onChange={e => setNewName(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label>Slug (ID)</Label>
                                <Input placeholder="e.g. forecast_agent" value={newSlug} onChange={e => setNewSlug(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label>Template</Label>
                                <Textarea
                                    placeholder="Enter your prompt template here use {{variable}} for dynamic parts."
                                    className="h-32 font-mono text-xs"
                                    value={newTemplate}
                                    onChange={e => setNewTemplate(e.target.value)}
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                            <Button onClick={handleCreate} disabled={createMutation.isPending}>Create Prompt</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="flex items-center gap-4 mb-6">
                <div className="relative w-96">
                    <input
                        type="text"
                        placeholder="Search prompts..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                </div>
            </div>

            <div className="border border-border rounded-lg overflow-hidden bg-card shadow-sm">
                <table className="w-full text-sm text-left">
                    <thead className="bg-muted/50 border-b border-border">
                        <tr>
                            <th className="px-6 py-4 font-semibold text-muted-foreground uppercase text-xs tracking-wider">Name</th>
                            <th className="px-6 py-4 font-semibold text-muted-foreground uppercase text-xs tracking-wider">Version</th>
                            <th className="px-6 py-4 font-semibold text-muted-foreground uppercase text-xs tracking-wider">Status</th>
                            <th className="px-6 py-4 font-semibold text-muted-foreground uppercase text-xs tracking-wider">Last Updated</th>
                            <th className="px-6 py-4 font-semibold text-muted-foreground uppercase text-xs tracking-wider">Author</th>
                            <th className="px-6 py-4 font-semibold text-muted-foreground uppercase text-xs tracking-wider text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {isLoading ? (
                            <tr><td colSpan={6} className="text-center py-8 text-muted-foreground">Loading prompts...</td></tr>
                        ) : filteredPrompts.length === 0 ? (
                            <tr><td colSpan={6} className="text-center py-8 text-muted-foreground">No prompts found.</td></tr>
                        ) : (
                            filteredPrompts.map((p) => (
                                <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-muted rounded-lg text-foreground">
                                                <Book className="h-4 w-4" />
                                            </div>
                                            <div>
                                                <div className="font-medium text-foreground">{p.name}</div>
                                                <div className="text-xs text-muted-foreground font-mono">{p.id}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="font-mono bg-muted px-2 py-0.5 rounded text-xs">
                                            {p.latest_version?.version || "v0"}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize border ${p.status === 'prod' ? 'bg-green-500/10 text-green-500 border-green-500/20' :
                                            p.status === 'staging' ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' :
                                                'bg-blue-500/10 text-blue-500 border-blue-500/20'
                                            }`}>
                                            {p.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-muted-foreground text-xs">
                                        {new Date(p.updated_at).toLocaleString()}
                                    </td>
                                    <td className="px-6 py-4 text-muted-foreground text-xs">{p.author}</td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => setSelectedPrompt(p)}
                                            >
                                                <History className="h-4 w-4" />
                                            </Button>
                                            <Button variant="ghost" size="sm">
                                                <MoreHorizontal className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Version History Sheet */}
            <Sheet open={!!selectedPrompt} onOpenChange={(open) => !open && setSelectedPrompt(null)}>
                <SheetContent className="w-[600px] border-l border-white/10 sm:max-w-[600px] overflow-y-auto">
                    <SheetHeader className="mb-6">
                        <SheetTitle>Version History</SheetTitle>
                        <SheetDescription>
                            History for {selectedPrompt?.name} ({selectedPrompt?.id})
                        </SheetDescription>
                    </SheetHeader>

                    <div className="space-y-6">
                        {selectedPrompt?.versions.map((v) => (
                            <div key={v.version} className="p-4 rounded-lg border border-white/10 bg-white/5 space-y-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Badge variant="outline">{v.version}</Badge>
                                        <span className="text-xs text-muted-foreground">
                                            {new Date(v.created_at).toLocaleString()}
                                        </span>
                                    </div>
                                    <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => {
                                        navigator.clipboard.writeText(v.template);
                                        toast.success("Template copied to clipboard");
                                    }}>
                                        <Copy className="h-3 w-3" />
                                    </Button>
                                </div>

                                <div className="bg-black/40 p-3 rounded-md font-mono text-xs whitespace-pre-wrap text-muted-foreground">
                                    {v.template}
                                </div>

                                {v.variables && v.variables.length > 0 && (
                                    <div className="flex gap-2">
                                        {v.variables.map(variable => (
                                            <Badge key={variable} variant="secondary" className="text-[10px]">
                                                {variable}
                                            </Badge>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </SheetContent>
            </Sheet>
        </div>
    );
}
