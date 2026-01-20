import * as React from "react"
import { useTranslation } from "react-i18next"
import { TableRow, TableCell } from "./table"
import { cn } from "@/lib/utils"

interface TableEmptyProps {
  colSpan: number
  loading?: boolean
  message?: string
  className?: string
}

const TableEmpty = React.forwardRef<HTMLTableRowElement, TableEmptyProps>(
  ({ colSpan, loading = false, message, className, ...props }, ref) => {
    const { t } = useTranslation()
    return (
      <TableRow ref={ref} {...props}>
        <TableCell
          colSpan={colSpan}
          className={cn(
            "text-center py-6 text-muted-foreground text-sm",
            className
          )}
        >
          {loading ? t('common.loading') : message || t('common.noData')}
        </TableCell>
      </TableRow>
    )
  }
)
TableEmpty.displayName = "TableEmpty"

export { TableEmpty }
