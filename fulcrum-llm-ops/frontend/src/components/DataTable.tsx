import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { flexRender, type ColumnDef } from "@tanstack/react-table"
import { cn } from "@/lib/utils"

interface DataTableProps<TData, TValue> {
    columns: ColumnDef<TData, TValue>[]
    data: TData[]
    onRowClick?: (row: TData) => void
}

export function DataTable<TData, TValue>({
    columns,
    data,
    onRowClick,
}: DataTableProps<TData, TValue>) {
    return (
        <div className="rounded-md border border-border overflow-hidden bg-card shadow-sm">
            <Table>
                <TableHeader className="bg-muted/50 border-b border-border">
                    {columns.map((column: any) => (
                        <TableHead key={column.id} className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">
                            {column.header}
                        </TableHead>
                    ))}
                </TableHeader>
                <TableBody>
                    {data.length ? (
                        data.map((row, i) => (
                            <TableRow
                                key={i}
                                onClick={() => onRowClick && onRowClick(row)}
                                className={cn(
                                    "border-b border-border hover:bg-muted/50 transition-colors data-[state=selected]:bg-muted",
                                    onRowClick ? "cursor-pointer" : ""
                                )}
                            >
                                {columns.map((column: any) => (
                                    <TableCell key={column.id} className="py-3">
                                        {/* Simplification for non-tanstack usage or mixed usage */}
                                        {flexRender(column.cell, { row: { original: row } } as any)}
                                    </TableCell>
                                ))}
                            </TableRow>
                        ))
                    ) : (
                        <TableRow>
                            <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                                No results.
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </div>
    )
}
