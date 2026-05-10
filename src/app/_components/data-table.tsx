import Link from "next/link";
import type { ReactNode } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

export type DataTableColumn<Row> = {
  id: string;
  header: ReactNode;
  cell: (row: Row) => ReactNode;
  className?: string;
  headerClassName?: string;
};

type DataTableProps<Row extends { id: string }> = {
  columns: readonly DataTableColumn<Row>[];
  rows: readonly Row[];
  selectedRowId?: string;
  getRowHref?: (row: Row) => string | undefined;
  emptyState?: ReactNode;
  className?: string;
  tableClassName?: string;
};

export function DataTable<Row extends { id: string }>({
  columns,
  rows,
  selectedRowId,
  getRowHref,
  emptyState,
  className,
  tableClassName,
}: DataTableProps<Row>) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-[8px] border border-gray-200 bg-white",
        className,
      )}
    >
      <div className="overflow-x-auto">
        <Table className={cn("min-w-[760px]", tableClassName)}>
          <TableHeader>
            <TableRow className="hover:bg-transparent active:bg-transparent">
              {columns.map((column) => (
                <TableHead
                  key={column.id}
                  className={cn("h-[45px]", column.headerClassName)}
                >
                  {column.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length > 0 ? (
              rows.map((row) => {
                const rowHref = getRowHref?.(row);
                const selected = row.id === selectedRowId;

                return (
                  <TableRow
                    key={row.id}
                    data-state={selected ? "selected" : undefined}
                    className={cn(
                      "h-[46px]",
                      rowHref && "cursor-pointer",
                      selected && "bg-green-50 hover:bg-green-50",
                    )}
                  >
                    {columns.map((column) => (
                      <TableCell
                        key={column.id}
                        className={cn("py-2.5", column.className)}
                      >
                        {rowHref ? (
                          <Link
                            href={rowHref}
                            className="block outline-none focus-visible:ring-2 focus-visible:ring-green-200"
                          >
                            {column.cell(row)}
                          </Link>
                        ) : (
                          column.cell(row)
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-[120px]">
                  <div className="flex items-center justify-center text-body-14-regular text-gray-500">
                    {emptyState ?? "표시할 항목이 없습니다."}
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
