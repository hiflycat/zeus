import * as React from "react"
import { TableRow, TableCell } from "./table"
import { cn } from "@/lib/utils"

interface TableEmptyProps {
  colSpan: number
  loading?: boolean
  message?: string
  className?: string
}

const TableEmpty = React.forwardRef<HTMLTableRowElement, TableEmptyProps>(
  ({ colSpan, loading = false, message, className, ...props }, ref) => (
    <TableRow ref={ref} {...props}>
      <TableCell
        colSpan={colSpan}
        className={cn(
          "text-center py-6 text-muted-foreground text-sm",
          className
        )}
      >
        {loading ? "加载中..." : message || "暂无数据"}
      </TableCell>
    </TableRow>
  )
)
TableEmpty.displayName = "TableEmpty"

export { TableEmpty }
