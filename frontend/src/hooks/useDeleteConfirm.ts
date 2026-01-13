import { useState, useRef, useCallback } from 'react'

export function useDeleteConfirm<T extends { id?: number | null }>() {
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const deleteButtonRefs = useRef<Map<number, HTMLButtonElement>>(new Map())

  const handleDeleteClick = useCallback((item: T) => {
    if (item.id != null) {
      setDeletingId(item.id)
    }
  }, [])

  const handleDeleteCancel = useCallback(() => {
    setDeletingId(null)
  }, [])

  const setButtonRef = useCallback((id: number, el: HTMLButtonElement | null) => {
    if (el) {
      deleteButtonRefs.current.set(id, el)
    }
  }, [])

  const getButtonRef = useCallback((id: number) => {
    return deleteButtonRefs.current.get(id) || null
  }, [])

  const resetDeleting = useCallback(() => {
    setDeletingId(null)
  }, [])

  return {
    deletingId,
    handleDeleteClick,
    handleDeleteCancel,
    setButtonRef,
    getButtonRef,
    resetDeleting,
  }
}
