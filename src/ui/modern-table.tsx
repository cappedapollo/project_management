import { m } from "motion/react";
import { forwardRef } from "react";
import { cn } from "@/utils";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/ui/table";

interface ModernTableProps {
  children: React.ReactNode;
  hover?: boolean;
  striped?: boolean;
  bordered?: boolean;
  loading?: boolean;
  className?: string;
}

const ModernTable = forwardRef<HTMLTableElement, ModernTableProps>(
  ({ className, children, hover = true, striped = false, bordered = false, loading = false }, ref) => {
    if (loading) {
      return (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <m.div
              key={i}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              className="h-12 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse"
            />
          ))}
        </div>
      );
    }

    return (
      <div className="relative overflow-hidden rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900">
        <Table
          ref={ref}
          className={cn(
            "w-full",
            striped && "[&_tr:nth-child(even)]:bg-gray-50 dark:[&_tr:nth-child(even)]:bg-gray-800/50",
            className
          )}
        >
          {children}
        </Table>
      </div>
    );
  }
);

const ModernTableRow = forwardRef<HTMLTableRowElement, React.HTMLAttributes<HTMLTableRowElement> & { hover?: boolean }>(
  ({ className, hover = true, ...props }, ref) => (
    <m.tr
      ref={ref}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      whileHover={hover ? { backgroundColor: "rgba(0, 0, 0, 0.02)" } : undefined}
      className={cn(
        "border-b border-gray-100 dark:border-gray-800 transition-colors",
        hover && "hover:bg-gray-50/50 dark:hover:bg-gray-800/50",
        className
      )}
      {...(props as any)}
    />
  )
);

const ModernTableCell = forwardRef<HTMLTableCellElement, React.HTMLAttributes<HTMLTableCellElement> & { colSpan?: number }>(
  ({ className, ...props }, ref) => (
    <TableCell
      ref={ref}
      className={cn("px-6 py-4 text-sm", className)}
      {...props}
    />
  )
);

const ModernTableHeader = forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => (
    <TableHeader
      ref={ref}
      className={cn("bg-gray-50/50 dark:bg-gray-800/50", className)}
      {...props}
    />
  )
);

const ModernTableHead = forwardRef<HTMLTableCellElement, React.HTMLAttributes<HTMLTableCellElement>>(
  ({ className, ...props }, ref) => (
    <TableHead
      ref={ref}
      className={cn("px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider", className)}
      {...props}
    />
  )
);

ModernTable.displayName = "ModernTable";
ModernTableRow.displayName = "ModernTableRow";
ModernTableCell.displayName = "ModernTableCell";
ModernTableHeader.displayName = "ModernTableHeader";
ModernTableHead.displayName = "ModernTableHead";

export { 
  ModernTable, 
  ModernTableRow as ModernTableRow, 
  ModernTableCell, 
  ModernTableHeader, 
  ModernTableHead,
  TableBody as ModernTableBody
};