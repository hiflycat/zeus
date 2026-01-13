"use client"

import { useTranslation } from "react-i18next"
import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react"
import { Button } from "./button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./select"

interface PaginationProps {
  current: number
  total: number
  pageSize: number
  onChange: (page: number, pageSize: number) => void
  showSizeChanger?: boolean
  pageSizeOptions?: number[]
}

const Pagination = ({
  current,
  total,
  pageSize,
  onChange,
  showSizeChanger = true,
  pageSizeOptions = [10, 20, 50, 100],
}: PaginationProps) => {
  const { t } = useTranslation()
  const totalPages = Math.ceil(total / pageSize)

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      onChange(page, pageSize)
    }
  }

  const handlePageSizeChange = (newPageSize: number) => {
    const newTotalPages = Math.ceil(total / newPageSize)
    const newPage = current > newTotalPages ? newTotalPages : current
    onChange(newPage || 1, newPageSize)
  }

  const renderPageNumbers = () => {
    const pages: (number | string)[] = []
    const maxVisible = 7

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      if (current <= 4) {
        for (let i = 1; i <= 5; i++) {
          pages.push(i)
        }
        pages.push('ellipsis')
        pages.push(totalPages)
      } else if (current >= totalPages - 3) {
        pages.push(1)
        pages.push('ellipsis')
        for (let i = totalPages - 4; i <= totalPages; i++) {
          pages.push(i)
        }
      } else {
        pages.push(1)
        pages.push('ellipsis')
        for (let i = current - 1; i <= current + 1; i++) {
          pages.push(i)
        }
        pages.push('ellipsis')
        pages.push(totalPages)
      }
    }

    return pages.map((page, index) => {
      if (page === 'ellipsis') {
        return (
          <Button
            key={`ellipsis-${index}`}
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            disabled
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        )
      }
      return (
        <Button
          key={page}
          variant={current === page ? "default" : "ghost"}
          size="icon"
          className="h-9 w-9"
          onClick={() => handlePageChange(page as number)}
        >
          {page}
        </Button>
      )
    })
  }

  if (totalPages === 0) return null

  return (
    <div className="flex items-center justify-between px-2 py-4">
      <div className="flex items-center gap-2">
        {showSizeChanger && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">{t('common.pagination.itemsPerPage')}</span>
            <Select
              value={pageSize.toString()}
              onValueChange={(value) => handlePageSizeChange(Number(value))}
            >
              <SelectTrigger className="h-9 w-14">
                <SelectValue />
              </SelectTrigger>
              <SelectContent 
                className="!min-w-0 w-[var(--radix-select-trigger-width)]" 
                position="popper"
              >
                {pageSizeOptions.map((size) => (
                  <SelectItem 
                    key={size} 
                    value={size.toString()}
                    className="[&>span>svg]:h-2.5 [&>span>svg]:w-2.5 [&>span]:left-1 !pl-5"
                  >
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-sm text-muted-foreground">{t('common.pagination.items')}</span>
          </div>
        )}
        <span className="text-sm text-muted-foreground">
          {t('common.pagination.totalItems', { total })}
        </span>
      </div>
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9"
          onClick={() => handlePageChange(current - 1)}
          disabled={current === 1}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        {renderPageNumbers()}
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9"
          onClick={() => handlePageChange(current + 1)}
          disabled={current === totalPages}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

export { Pagination }
