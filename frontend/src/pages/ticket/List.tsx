import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Plus, Search, Eye } from 'lucide-react'
import { DeleteConfirmCard } from '@/components/DeleteConfirmCard'
import { useDeleteConfirm } from '@/hooks/useDeleteConfirm'
import { usePagination } from '@/hooks/usePagination'
import {
  getTickets,
  getPendingApprovals,
  getProcessedTickets,
  getCCTickets,
  getEnabledTicketTypes,
  deleteTicket,
  Ticket,
  TicketType,
  TicketListParams,
} from '@/api/ticket'
import {
  Button,
  Input,
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
  TableEmpty,
  TableActionButton,
  TableActions,
  Badge,
  Pagination,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Skeleton,
} from '@/components/ui-tw'

const TicketList = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [ticketTypes, setTicketTypes] = useState<TicketType[]>([])
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [typeFilter, setTypeFilter] = useState<string>('')
  const [activeTab, setActiveTab] = useState<string>('all')
  const { deletingId, handleDeleteClick, handleDeleteCancel, setButtonRef, getButtonRef, resetDeleting } = useDeleteConfirm<Ticket>()

  const statusMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
    draft: { label: t('ticket.statusDraft'), variant: 'secondary' },
    pending: { label: t('ticket.statusPending'), variant: 'default' },
    approved: { label: t('ticket.statusApproved'), variant: 'default' },
    rejected: { label: t('ticket.statusRejected'), variant: 'destructive' },
    processing: { label: t('ticket.statusProcessing'), variant: 'default' },
    completed: { label: t('ticket.statusCompleted'), variant: 'outline' },
    cancelled: { label: t('ticket.statusCancelled'), variant: 'secondary' },
  }

  const priorityMap: Record<number, { label: string; color: string }> = {
    1: { label: t('ticket.priorityLow'), color: 'text-gray-500' },
    2: { label: t('ticket.priorityMedium'), color: 'text-blue-500' },
    3: { label: t('ticket.priorityHigh'), color: 'text-orange-500' },
    4: { label: t('ticket.priorityUrgent'), color: 'text-red-500' },
  }

  const fetchFn = async (params: any) => {
    const queryParams: TicketListParams = {
      ...params,
      status: statusFilter || undefined,
      type_id: typeFilter ? parseInt(typeFilter) : undefined,
    }
    switch (activeTab) {
      case 'pending':
        return await getPendingApprovals(queryParams)
      case 'processed':
        return await getProcessedTickets(queryParams)
      case 'cc':
        return await getCCTickets(queryParams)
      default:
        return await getTickets(queryParams)
    }
  }

  const {
    data: tickets,
    loading,
    total,
    page,
    pageSize,
    searchKeyword,
    handlePageChange,
    handleSearch,
    handleSearchSubmit,
    refresh,
  } = usePagination<Ticket>({
    fetchFn,
    defaultPageSize: 10,
  })

  useEffect(() => {
    getEnabledTicketTypes().then(setTicketTypes)
  }, [])

  useEffect(() => {
    refresh()
  }, [statusFilter, typeFilter, activeTab])

  const handleCreate = () => {
    navigate('/ticket/create')
  }

  const handleView = (ticket: Ticket) => {
    if (!ticket.id) return
    navigate(`/ticket/${ticket.id}`, { state: { tabTitle: ticket.title || t('ticket.detail') } })
  }

  const handleDeleteConfirm = async (ticket: Ticket) => {
    try {
      await deleteTicket(ticket.id!)
      toast.success(t('ticket.deleteSuccess'))
      resetDeleting()
      refresh()
    } catch {
      resetDeleting()
    }
  }

  const renderTable = () => (
    <div className="rounded-lg border bg-card">
      <Table className="text-sm">
        <TableHeader>
          <TableRow>
            <TableHead className="w-16">ID</TableHead>
            <TableHead>{t('ticket.ticketTitle')}</TableHead>
            <TableHead className="w-24">{t('ticket.type')}</TableHead>
            <TableHead className="w-20">{t('ticket.priority')}</TableHead>
            <TableHead className="w-24">{t('ticket.status')}</TableHead>
            <TableHead className="w-24">{t('ticket.creator')}</TableHead>
            <TableHead className="w-40">{t('ticket.createdAt')}</TableHead>
            <TableHead className="w-24 text-right">{t('common.operation')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}>
                <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                <TableCell><Skeleton className="h-4 w-16" /></TableCell>
              </TableRow>
            ))
          ) : tickets.length === 0 ? (
            <TableEmpty colSpan={8} />
          ) : (
            tickets.map((ticket) => (
              <TableRow key={ticket.id}>
                <TableCell className="font-mono text-muted-foreground">#{ticket.id}</TableCell>
                <TableCell className="font-medium max-w-xs truncate">
                  <button
                    type="button"
                    className="text-left hover:text-primary transition-colors"
                    onClick={() => handleView(ticket)}
                  >
                    {ticket.title}
                  </button>
                </TableCell>
                <TableCell>{ticket.type?.name || '-'}</TableCell>
                <TableCell>
                  <span className={priorityMap[ticket.priority]?.color || ''}>
                    {priorityMap[ticket.priority]?.label || '-'}
                  </span>
                </TableCell>
                <TableCell>
                  <Badge variant={statusMap[ticket.status]?.variant || 'default'}>
                    {statusMap[ticket.status]?.label || ticket.status}
                  </Badge>
                </TableCell>
                <TableCell>{ticket.creator?.username || '-'}</TableCell>
                <TableCell className="text-muted-foreground">
                  {ticket.created_at ? new Date(ticket.created_at).toLocaleString() : '-'}
                </TableCell>
                <TableCell className="text-right">
                  <div className="relative">
                    <TableActions>
                      <Button variant="ghost" size="sm" onClick={() => handleView(ticket)}>
                        <Eye className="h-4 w-4 mr-1" />
                        {t('ticket.view')}
                      </Button>
                      {(ticket.status === 'draft' || ticket.status === 'cancelled') && (
                        <TableActionButton
                          variant="delete"
                          ref={(el) => setButtonRef(ticket.id!, el)}
                          onClick={() => handleDeleteClick(ticket)}
                        />
                      )}
                    </TableActions>
                    <DeleteConfirmCard
                      isOpen={deletingId === ticket.id}
                      message={t('ticket.deleteConfirm', { name: ticket.title })}
                      buttonRef={getButtonRef(ticket.id!)}
                      onConfirm={() => handleDeleteConfirm(ticket)}
                      onCancel={handleDeleteCancel}
                    />
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
      <Pagination
        current={page}
        total={total}
        pageSize={pageSize}
        onChange={handlePageChange}
      />
    </div>
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">{t('ticket.list')}</h1>
        <Button onClick={handleCreate}>
          <Plus className="h-4 w-4 mr-2" />
          {t('ticket.create')}
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="all">{t('ticket.tabs.myTickets')}</TabsTrigger>
            <TabsTrigger value="pending">{t('ticket.tabs.pendingApproval')}</TabsTrigger>
            <TabsTrigger value="processed">{t('ticket.tabs.processed')}</TabsTrigger>
            <TabsTrigger value="cc">{t('ticket.tabs.ccToMe')}</TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-4">
            <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
              <Input
                placeholder={t('ticket.filter.search')}
                value={searchKeyword}
                onChange={(e) => handleSearch(e.target.value)}
                className="w-64"
              />
              <Button type="submit" variant="outline" size="icon">
                <Search className="h-4 w-4" />
              </Button>
            </form>
            {activeTab === 'all' && (
              <>
                <Select value={statusFilter || '__all__'} onValueChange={(v) => setStatusFilter(v === '__all__' ? '' : v)}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder={t('ticket.filter.status')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">{t('ticket.filter.allStatus')}</SelectItem>
                    {Object.entries(statusMap).map(([key, { label }]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={typeFilter || '__all__'} onValueChange={(v) => setTypeFilter(v === '__all__' ? '' : v)}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder={t('ticket.filter.type')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">{t('ticket.filter.allTypes')}</SelectItem>
                    {ticketTypes.filter(t => t.id != null && t.id !== 0).map((type) => (
                      <SelectItem key={type.id} value={String(type.id)}>{type.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </>
            )}
          </div>
        </div>

        <TabsContent value="all" className="mt-4">
          {renderTable()}
        </TabsContent>

        <TabsContent value="pending" className="mt-4">
          {renderTable()}
        </TabsContent>

        <TabsContent value="processed" className="mt-4">
          {renderTable()}
        </TabsContent>

        <TabsContent value="cc" className="mt-4">
          {renderTable()}
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default TicketList
