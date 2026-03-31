import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// TUI Table — terminal-style data table with box-drawing borders.
//
// The output of `pigeongov list`, except rendered in a browser by someone
// who thinks CSS Grid is a gateway drug to rounded corners.
// ---------------------------------------------------------------------------

export interface TuiTableColumn<T> {
  /** Header label */
  header: string;
  /** How to extract the cell value from a row */
  accessor: keyof T | ((row: T) => React.ReactNode);
  /** Alignment — left by default, because we're not accountants */
  align?: "left" | "center" | "right";
  /** Optional width class (e.g. "w-24", "min-w-[200px]") */
  width?: string;
  /** If true, hide on mobile */
  hideOnMobile?: boolean;
}

interface TuiTableProps<T> {
  columns: TuiTableColumn<T>[];
  data: T[];
  /** Unique key for each row */
  rowKey: keyof T | ((row: T, index: number) => string);
  /** Click handler for a row */
  onRowClick?: (row: T) => void;
  /** Empty state message */
  emptyMessage?: string;
  className?: string;
}

function getCellValue<T>(row: T, accessor: TuiTableColumn<T>["accessor"]): React.ReactNode {
  if (typeof accessor === "function") return accessor(row);
  return row[accessor] as React.ReactNode;
}

function getRowKey<T>(row: T, index: number, rowKey: TuiTableProps<T>["rowKey"]): string {
  if (typeof rowKey === "function") return rowKey(row, index);
  return String(row[rowKey]);
}

const alignClass = {
  left: "text-left",
  center: "text-center",
  right: "text-right",
};

export function TuiTable<T>({
  columns,
  data,
  rowKey,
  onRowClick,
  emptyMessage = "No data.",
  className,
}: TuiTableProps<T>) {
  if (data.length === 0) {
    return (
      <div className={cn("font-mono text-sm text-[#9d8ec2] px-4 py-6", className)}>
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className={cn("overflow-x-auto font-mono", className)}>
      <table className="w-full text-sm border-collapse">
        {/* Header */}
        <thead>
          <tr className="border-b-2 border-[#3d2a7a]">
            {columns.map((col, i) => (
              <th
                key={i}
                className={cn(
                  "px-4 py-2 text-[#4ade80] font-bold text-xs uppercase tracking-wider",
                  alignClass[col.align ?? "left"],
                  col.width,
                  col.hideOnMobile && "hidden md:table-cell"
                )}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>

        {/* Body */}
        <tbody>
          {data.map((row, rowIdx) => (
            <tr
              key={getRowKey(row, rowIdx, rowKey)}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={cn(
                "border-b border-[#3d2a7a]/50 transition-colors",
                rowIdx % 2 === 1 && "bg-[#1a1040]/30",
                onRowClick && "cursor-pointer hover:bg-[#251660]"
              )}
            >
              {columns.map((col, colIdx) => (
                <td
                  key={colIdx}
                  className={cn(
                    "px-4 py-2.5 text-white/90",
                    alignClass[col.align ?? "left"],
                    col.width,
                    col.hideOnMobile && "hidden md:table-cell"
                  )}
                >
                  {getCellValue(row, col.accessor)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
