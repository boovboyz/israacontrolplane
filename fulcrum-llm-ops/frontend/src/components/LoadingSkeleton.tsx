// Simple skeleton component

export function LoadingSkeleton() {
    return (
        <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center space-x-4">
                    <div className="h-12 w-full bg-muted/20 animate-pulse rounded-md" />
                </div>
            ))}
        </div>
    );
}
