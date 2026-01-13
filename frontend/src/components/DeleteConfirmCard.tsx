import { useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { X, Check } from 'lucide-react'
import { Button } from '@/components/ui-tw'

interface DeleteConfirmCardProps {
  isOpen: boolean
  message: string
  onConfirm: () => void
  onCancel: () => void
  buttonRef: HTMLButtonElement | null
}

export const DeleteConfirmCard = ({
  isOpen,
  message,
  onConfirm,
  onCancel,
  buttonRef,
}: DeleteConfirmCardProps) => {
  const { t } = useTranslation()
  const cardRef = useRef<HTMLDivElement>(null)

  // 点击外部关闭确认卡片
  useEffect(() => {
    if (!isOpen) return

    const handleClickOutside = (event: MouseEvent) => {
      if (cardRef.current && !cardRef.current.contains(event.target as Node)) {
        // 检查是否点击的是删除按钮本身
        if (buttonRef && buttonRef.contains(event.target as Node)) {
          return
        }
        onCancel()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen, buttonRef, onCancel])

  if (!isOpen || !buttonRef) return null

  const rect = buttonRef.getBoundingClientRect()
  const position = {
    top: `${rect.top - 8}px`,
    right: `${window.innerWidth - rect.right}px`,
    transform: 'translateY(-100%)',
  }

  return (
    <div
      ref={cardRef}
      className="fixed z-[9999] min-w-[240px] rounded-lg border bg-popover p-3 text-popover-foreground shadow-lg animate-in fade-in-0 zoom-in-95"
      style={position}
    >
      <p className="text-sm text-muted-foreground mb-3 leading-relaxed">{message}</p>
      <div className="flex items-center gap-2 justify-end">
        <Button
          size="sm"
          variant="outline"
          className="h-7 px-2.5 text-xs transition-colors duration-200 cursor-pointer hover:bg-accent/80"
          onClick={onCancel}
        >
          <X className="h-3.5 w-3.5 mr-1" />
          {t('common.cancel')}
        </Button>
        <Button
          size="sm"
          variant="destructive"
          className="h-7 px-2.5 text-xs transition-colors duration-200 cursor-pointer"
          onClick={onConfirm}
        >
          <Check className="h-3.5 w-3.5 mr-1" />
          {t('common.confirm')}
        </Button>
      </div>
    </div>
  )
}
