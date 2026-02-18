import { LucideIcon } from "lucide-react";

interface EmptyStateProps {
    icon?: LucideIcon;
    title: string;
    description?: string;
    action?: React.ReactNode;
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
    return (
        <div className="flex flex-col items-center justify-center h-full p-8 text-center animate-in fade-in zoom-in duration-500">
            <div className="rounded-full bg-muted/50 p-6 mb-6">
                {Icon && <Icon className="h-12 w-12 text-muted-foreground/50" />}
            </div>
            <h3 className="text-xl font-semibold tracking-tight mb-2">{title}</h3>
            {description && (
                <p className="text-muted-foreground max-w-sm mb-8">
                    {description}
                </p>
            )}
            {action}
        </div>
    );
}
