import { useState, useRef, useEffect, type KeyboardEvent } from "react";
import { Send, Bot, User, Clock, Settings, Paperclip } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useMutation } from "@tanstack/react-query";
import { sendChatMessage } from "@/api/chat";
import { RunPanel } from "@/components/RunPanel";
import { PastRunsDrawer } from "@/components/PastRunsDrawer";
import { Badge } from "@/components/ui/badge";

interface Message {
    id: string;
    role: "user" | "assistant";
    content: string;
    runId?: string; // If assistant message has a corresponding run
    timestamp: Date;
}

export function ChatPage() {
    const [messages, setMessages] = useState<Message[]>([
        {
            id: "welcome",
            role: "assistant",
            content: "Hello! I'm your Sales Predictor AI. How can I help you with forecasting today?",
            timestamp: new Date()
        }
    ]);
    const [input, setInput] = useState("");
    const [selectedModel, setSelectedModel] = useState("grok-4-fast");
    const [retrievalEnabled, setRetrievalEnabled] = useState(true);
    const [isDrawerOpen, setIsDrawerOpen] = useState(true);

    const scrollRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    const [sessionId, setSessionId] = useState<string>(() => {
        return localStorage.getItem("chat_session_id") || "";
    });

    // Mutation for sending chat
    const chatMutation = useMutation({
        mutationFn: sendChatMessage,
        onSuccess: (data) => {
            if (data.session_id && data.session_id !== sessionId) {
                setSessionId(data.session_id);
                localStorage.setItem("chat_session_id", data.session_id);
            }

            const assistantMsg: Message = {
                id: Date.now().toString(),
                role: "assistant",
                content: data.response,
                runId: data.run_id || undefined,
                timestamp: new Date()
            };
            setMessages(prev => [...prev, assistantMsg]);
        },
        onError: (error: any) => {
            console.error("Chat error:", error);
            const errorMsg: Message = {
                id: Date.now().toString(),
                role: "assistant",
                content: error.response?.data?.detail || "Sorry, I encountered an error processing your request. Please try again.",
                timestamp: new Date()
            };
            setMessages(prev => [...prev, errorMsg]);
        }
    });

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, chatMutation.isPending]);

    const handleNewChat = () => {
        setSessionId("");
        localStorage.removeItem("chat_session_id");
        setMessages([
            {
                id: "welcome",
                role: "assistant",
                content: "Hello! I'm your Sales Predictor AI. How can I help you with forecasting today?",
                timestamp: new Date()
            }
        ]);
        if (inputRef.current) inputRef.current.focus();
    };

    const handleSubmit = () => {
        if (!input.trim() || chatMutation.isPending) return;

        const userMsg: Message = {
            id: Date.now().toString(),
            role: "user",
            content: input.trim(),
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMsg]);
        setInput("");

        chatMutation.mutate({
            message: userMsg.content,
            model: selectedModel,
            retrieval_enabled: retrievalEnabled,
            session_id: sessionId || undefined
        });
    };

    const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
        }
    };

    const handleSelectPastRun = (runId: string) => {
        // Create a view message to show the run panel
        const viewMsg: Message = {
            id: `view-${runId}-${Date.now()}`,
            role: "assistant",
            content: `Viewing past run: ${runId}`,
            runId: runId,
            timestamp: new Date()
        };
        setMessages(prev => [...prev, viewMsg]);
    };

    return (
        <div className="flex h-full bg-background overflow-hidden relative">
            {/* Main Content Area */}
            <div className={`flex-1 flex flex-col h-full transition-all duration-300 ${isDrawerOpen ? 'mr-[350px]' : ''}`}>

                {/* Chat Header / Config */}
                <div className="h-14 border-b border-white/10 flex items-center justify-between px-6 bg-white/[0.02]">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            <Bot className="h-5 w-5 text-primary" />
                            <span className="font-semibold">Sales Predictor</span>
                        </div>
                        <div className="h-4 w-px bg-white/10" />
                        <div className="flex items-center gap-2 text-sm">
                            <Settings className="h-4 w-4 text-muted-foreground" />
                            <Select value={selectedModel} onValueChange={setSelectedModel}>
                                <SelectTrigger className="w-[180px] h-8 bg-transparent border-white/10">
                                    <SelectValue placeholder="Select Model" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="grok-beta">xAI Grok Beta</SelectItem>
                                    <SelectItem value="grok-2-vision-1212">xAI Grok 2 Vision</SelectItem>
                                    <SelectItem value="meta-llama/Llama-2-70b-chat-hf">Llama 2 70B</SelectItem>
                                    <SelectItem value="mistralai/Mixtral-8x7B-Instruct-v0.1">Mixtral 8x7B</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex items-center gap-2">
                            <Switch
                                id="retrieval"
                                checked={retrievalEnabled}
                                onCheckedChange={setRetrievalEnabled}
                            />
                            <label htmlFor="retrieval" className="text-xs text-muted-foreground cursor-pointer">Retrieval</label>
                        </div>
                        {sessionId && (
                            <Badge variant="outline" className="text-[10px] text-muted-foreground border-white/10 font-mono">
                                Session: {sessionId.slice(0, 8)}...
                            </Badge>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        <Button
                            variant="ghost"
                            size="sm"
                            className="text-muted-foreground hover:text-white"
                            onClick={handleNewChat}
                        >
                            New Chat
                        </Button>
                        <div className="h-4 w-px bg-white/10" />
                        <Button
                            variant="ghost"
                            size="sm"
                            className={isDrawerOpen ? "text-primary bg-primary/10" : "text-muted-foreground"}
                            onClick={() => setIsDrawerOpen(!isDrawerOpen)}
                        >
                            <Clock className="h-4 w-4 mr-2" />
                            History
                        </Button>
                    </div>
                </div>

                {/* Messages Stream */}
                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar" ref={scrollRef}>
                    <div className="max-w-4xl mx-auto space-y-6 pb-4">
                        {messages.map((msg) => (
                            <div key={msg.id} className="flex flex-col gap-2">
                                {/* Message Bubble */}
                                <div className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                                    <div className={`
                                        h-8 w-8 rounded-full flex items-center justify-center shrink-0
                                        ${msg.role === 'assistant' ? 'bg-primary/20 text-primary' : 'bg-white/10 text-white'}
                                    `}>
                                        {msg.role === 'assistant' ? <Bot className="h-5 w-5" /> : <User className="h-5 w-5" />}
                                    </div>

                                    <div className={`flex flex-col max-w-[80%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                                        <div className={`
                                            rounded-2xl px-5 py-3 text-sm leading-relaxed whitespace-pre-wrap
                                            ${msg.role === 'user'
                                                ? 'bg-primary text-primary-foreground rounded-tr-sm'
                                                : 'bg-white/5 border border-white/10 text-foreground rounded-tl-sm'}
                                        `}>
                                            {msg.content}
                                        </div>
                                        <span className="text-[10px] text-muted-foreground mt-1 px-1 opacity-50">
                                            {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                </div>

                                {/* Auto-Expanded Run Panel for Assistant Messages */}
                                {msg.runId && (
                                    <div className="pl-12 pr-4 animate-in fade-in slide-in-from-top-2 duration-500">
                                        <div className="flex items-center gap-2 mb-2">
                                            <div className="h-px bg-white/10 flex-1" />
                                            <Badge variant="outline" className="text-[10px] text-muted-foreground border-white/10 bg-black/20">
                                                Run Analysis
                                            </Badge>
                                            <div className="h-px bg-white/10 flex-1" />
                                        </div>
                                        <RunPanel runId={msg.runId} />
                                    </div>
                                )}
                            </div>
                        ))}

                        {chatMutation.isPending && (
                            <div className="flex gap-4">
                                <div className="h-8 w-8 rounded-full bg-primary/20 text-primary flex items-center justify-center">
                                    <Bot className="h-5 w-5 animate-pulse" />
                                </div>
                                <div className="bg-white/5 border border-white/10 rounded-2xl rounded-tl-sm px-5 py-3 h-12 flex items-center gap-1">
                                    <div className="w-2 h-2 bg-white/40 rounded-full animate-bounce [animation-delay:-0.3s]" />
                                    <div className="w-2 h-2 bg-white/40 rounded-full animate-bounce [animation-delay:-0.15s]" />
                                    <div className="w-2 h-2 bg-white/40 rounded-full animate-bounce" />
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Input Area */}
                <div className="p-4 border-t border-white/10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                    <div className="max-w-4xl mx-auto relative group">
                        <div className="absolute left-3 top-3 flex gap-2">
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                                <Paperclip className="h-4 w-4" />
                            </Button>
                        </div>
                        <textarea
                            ref={inputRef}
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Ask a question about sales forecasting..."
                            className="text-sm min-h-[50px] max-h-[200px] w-full resize-none rounded-xl border border-white/10 bg-white/5 pl-12 pr-12 py-3 focus:outline-none focus:ring-1 focus:ring-primary custom-scrollbar text-foreground placeholder:text-muted-foreground"
                            rows={1}
                        />
                        <div className="absolute right-3 top-2">
                            <Button
                                size="icon"
                                className="h-8 w-8 rounded-lg"
                                onClick={handleSubmit}
                                disabled={!input.trim() || chatMutation.isPending}
                            >
                                <Send className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                    <div className="text-center text-[10px] text-muted-foreground mt-2">
                        Fulcrum AI can make mistakes. Consider checking important information.
                    </div>
                </div>
            </div>

            {/* Right Drawer (Past Runs) */}
            <PastRunsDrawer
                isOpen={isDrawerOpen}
                onClose={() => setIsDrawerOpen(false)}
                onSelectRun={handleSelectPastRun}
            />
        </div>
    );
}
