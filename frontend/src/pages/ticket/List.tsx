import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Plus, Search, Eye } from 'lucide-react'
import { DeleteConfirmCard } from '@/components/DeleteConfirmCard'
import { useDeleteConfirm } from '@/hooks/useDeleteConfirm'
import { usePagination } from '@/hooks/usePagination'
import {
  getTickets,
  getMyTickets,
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
} from '@/components/ui-tw'

const statusMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  draft: { label: '草稿', variant: 'secondary' },
  pending: { label: '待审批', variant: 'default' },
  approved: { label: '已通过', variant: 'default' },
  rejected: { label: '已拒绝', variant: 'destructive' },
  processing: { label: '处理中', variant: 'default' },
  completed: { label: '已完成', variant: 'outline' },
  cancelled: { label: '已取消', variant: 'secondary' },
}

const priorityMap: Record<number, { label: string; color: string }> = {
  1: { label: '低', color: 'text-gray-500' },
  2: { label: '中', color: 'text-blue-500' },
  3: { label: '高', color: 'text-orange-500' },
  4: { label: '紧急', color: 'text-red-500' },
}

const TicketList = () => {
  const navigate = useNavigate()
  const [ticketTypes, setTicketTypes] = useState<TicketType[]>([])
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [typeFilter, setTypeFilter] = useState<string>('')
  const [activeTab, setActiveTab] = useState<string>('all')
  const { deletingId, handleDeleteClick, handleDeleteCancel, setButtonRef, getButtonRef, resetDeleting } = useDeleteConfirm<Ticket>()

  const fetchFn = async (params: any) => {
    const queryParams: TicketListParams = {
      ...params,
      status: statusFilter || undefined,
      type_id: typeFilter ? parseInt(typeFilter) : undefined,
    }
    switch (activeTab) {
      case 'my':
        return await getMyTickets(queryParams)
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
    navigate(`/ticket/${ticket.id}`, { state: { tabTitle: ticket.title || '工单详情' } })
  }

  const handleDeleteConfirm = async (ticket: Ticket) => {
    try {
      await deleteTicket(ticket.id!)
      toast.success('删除成功')
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
            <TableHead>标题</TableHead>
            <TableHead className="w-24">类型</TableHead>
            <TableHead className="w-20">优先级</TableHead>
            <TableHead className="w-24">状态</TableHead>
            <TableHead className="w-24">创建人</TableHead>
            <TableHead className="w-40">创建时间</TableHead>
            <TableHead className="w-24 text-right">操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell colSpan={8} className="text-center py-8">加载中...</TableCell>
            </TableRow>
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
                        查看
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
                      message={`确定要删除工单 "${ticket.title}" 吗？`}
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
        <h1 className="text-xl font-semibold">工单列表</h1>
        <Button onClick={handleCreate}>
          <Plus className="h-4 w-4 mr-2" />
          创建工单
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="all">全部工单</TabsTrigger>
            <TabsTrigger value="my">我创建的</TabsTrigger>
            <TabsTrigger value="pending">待我审批</TabsTrigger>
            <TabsTrigger value="processed">我已处理</TabsTrigger>
            <TabsTrigger value="cc">抄送我的</TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-4">
            <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
              <Input
                placeholder="搜索工单标题..."
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
                    <SelectValue placeholder="状态筛选" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">全部状态</SelectItem>
                    {Object.entries(statusMap).map(([key, { label }]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={typeFilter || '__all__'} onValueChange={(v) => setTypeFilter(v === '__all__' ? '' : v)}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="类型筛选" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">全部类型</SelectItem>
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

        <TabsContent value="my" className="mt-4">
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
