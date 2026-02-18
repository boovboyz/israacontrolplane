import { Search, RefreshCw, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface AppHeaderProps {
    onRefresh?: () => void;
    isRefreshing?: boolean;
}

export function AppHeader({ onRefresh, isRefreshing }: AppHeaderProps) {
    return (
        <header className="h-16 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 flex items-center justify-between px-6 sticky top-0 z-40">
            {/* Search */}
            <div className="flex items-center w-full max-w-xl">
                <div className="relative w-full">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        type="text"
                        placeholder="Search runs..."
                        className="w-full pl-9 bg-background border-border"
                    />
                    <div className="absolute right-3 top-2.5 flex gap-1">
                        <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
                            <span className="text-xs">⌘</span>K
                        </kbd>
                    </div>
                </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon">
                    <Bell className="h-4 w-4" />
                </Button>

                <div className="h-6 w-px bg-border mx-2" />

                <Button
                    onClick={onRefresh}
                    variant="outline"
                    size="sm"
                    className="gap-2"
                >
                    <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
                    <span className="text-xs">Refresh</span>
                </Button>
            </div>
        </header>
    );
}
