import { Construction } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";

interface PlaceholderPageProps {
    title: string;
}

export function PlaceholderPage({ title }: PlaceholderPageProps) {
    return (
        <EmptyState
            icon={Construction}
            title={title}
            description="This feature is currently under development. Check back later for updates."
        />
    );
}
