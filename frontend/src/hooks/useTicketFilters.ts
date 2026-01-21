import { useState, useEffect } from 'react'
import { getEnabledTicketTypes, TicketType } from '@/api/ticket'

export function useTicketFilters() {
  const [statusFilter, setStatusFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [ticketTypes, setTicketTypes] = useState<TicketType[]>([])

  useEffect(() => {
    getEnabledTicketTypes().then(setTicketTypes)
  }, [])

  const resetFilters = () => {
    setStatusFilter('')
    setTypeFilter('')
  }

  return {
    statusFilter,
    setStatusFilter,
    typeFilter,
    setTypeFilter,
    ticketTypes,
    resetFilters,
  }
}
