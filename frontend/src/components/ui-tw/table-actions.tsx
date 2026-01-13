import * as React from "react"
import { Button } from "./button"
import { Pencil, Trash2, Settings2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface TableActionButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "edit" | "delete" | "settings"
  icon?: React.ReactNode
}

const TableActionButton = React.forwardRef<HTMLButtonElement, TableActionButtonProps>(
  ({ variant, icon, className, ...props }, ref) => {
    const getIcon = () => {
      if (icon) return icon
      switch (variant) {
        case "edit":
          return <Pencil className="h-3.5 w-3.5" />
        case "delete":
          return <Trash2 className="h-3.5 w-3.5" />
        case "settings":
          return <Settings2 className="h-3.5 w-3.5" />
        default:
          return null
      }
    }

    const getClassName = () => {
      const base = "h-7 w-7"
      if (variant === "delete") {
        return cn(base, "text-destructive hover:text-destructive", className)
      }
      return cn(base, className)
    }

    return (
      <Button
        ref={ref}
        variant="ghost"
        size="icon"
        className={getClassName()}
        {...props}
      >
        {getIcon()}
      </Button>
    )
  }
)
TableActionButton.displayName = "TableActionButton"

interface TableActionsProps {
  children?: React.ReactNode
  className?: string
}

const TableActions = React.forwardRef<HTMLDivElement, TableActionsProps>(
  ({ children, className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("flex items-center gap-1", className)}
      {...props}
    >
      {children}
    </div>
  )
)
TableActions.displayName = "TableActions"

export { TableActionButton, TableActions }
