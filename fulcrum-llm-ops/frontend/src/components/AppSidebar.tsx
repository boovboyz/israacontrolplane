import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
    Activity, Play, FileText, ShieldCheck, BarChart3,
    Bell, Download, Settings, GitCompare, ThumbsUp as ThumbsUpIcon,
    Zap, LucideIcon, MessageSquare
} from "lucide-react";

interface NavItem {
    label: string;
    path: string;
    icon: LucideIcon;
}

interface NavGroup {
    title: string;
    items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
    {
        title: "Assistant",
        items: [
            { label: "New Chat", path: "/chat", icon: MessageSquare },
        ]
    },
    {
        title: "Platform",
        items: [
            { label: "Live Runs", path: "/runs", icon: Activity },
            { label: "Replay Studio", path: "/replay", icon: Play },
            { label: "Metrics", path: "/metrics", icon: BarChart3 },
        ],
    },
    {
        title: "Refinement",
        items: [
            { label: "Compare", path: "/compare", icon: GitCompare },
            { label: "Prompt Library", path: "/prompts", icon: FileText },
        ],
    },
    {
        title: "Quality",
        items: [
            { label: "Evaluations", path: "/evaluations", icon: ThumbsUpIcon },
            { label: "Guardrails", path: "/policies", icon: ShieldCheck },
        ]
    },
    {
        title: "System",
        items: [
            { label: "Alerts", path: "/alerts", icon: Bell },
            { label: "Exports", path: "/exports", icon: Download },
            { label: "Admin", path: "/admin", icon: Settings },
        ],
    },
];

export function AppSidebar() {
    return (
        <aside className="fixed left-0 top-0 bottom-0 w-[240px] z-50 bg-[#0A0C10] border-r border-white/[0.04] flex flex-col">
            {/* Logo Area */}
            <div className="h-12 flex items-center px-4 border-b border-white/[0.04]">
                <div className="flex items-center gap-3">
                    <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20">
                        <Zap className="h-4 w-4 text-primary" fill="currentColor" />
                    </div>
                    <span className="font-bold text-base tracking-tight text-white/90">
                        Fulcrum Ops
                    </span>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-4">
                {NAV_GROUPS.map((group) => (
                    <div key={group.title}>
                        <div className="px-2 mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/50">
                            {group.title}
                        </div>
                        <div className="space-y-0.5">
                            {group.items.map((item) => (
                                <NavLink
                                    key={item.path}
                                    to={item.path}
                                    className={({ isActive }) => cn(
                                        "flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors group",
                                        isActive
                                            ? "bg-primary/10 text-primary"
                                            : "text-muted-foreground hover:bg-white/[0.03] hover:text-white"
                                    )}
                                >
                                    <item.icon className="h-4 w-4" />
                                    <span>{item.label}</span>
                                </NavLink>
                            ))}
                        </div>
                    </div>
                ))}
            </nav>

            {/* Footer */}
            <div className="p-4 border-t border-white/[0.04]">
                <div className="flex items-center gap-3 p-2 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                    <div className="h-8 w-8 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-bold text-zinc-400 border border-white/10">
                        JS
                    </div>
                    <div className="flex-1 overflow-hidden">
                        <div className="text-xs font-medium text-white/90 truncate">Johran Smith</div>
                        <div className="text-[10px] text-muted-foreground truncate">Engineering Lead</div>
                    </div>
                </div>
            </div>
        </aside>
    );
}
