interface JsonViewerProps {
    data: any;
}

export function JsonViewer({ data }: JsonViewerProps) {
    if (!data || (typeof data === 'object' && Object.keys(data).length === 0)) {
        return <div className="text-sm text-muted-foreground italic">No data available</div>;
    }

    const jsonString = JSON.stringify(data, null, 2);

    return (
        <pre className="bg-muted/30 p-4 rounded-md overflow-auto text-xs font-mono border">
            <code>{jsonString}</code>
        </pre>
    );
}
