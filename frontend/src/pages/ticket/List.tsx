import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Plus, Search, Eye } from 'lucide-react'
import { DeleteConfirmCard } from '@/components/DeleteConfirmCard'
import { useDeleteConfirm } from '@/hooks/useDeleteConfirm'
import { usePagination } from '@/hooks/usePagination'
import {
  getTickets,
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
  const { deletingId, handleDeleteClick, handleDeleteCancel, setButtonRef, getButtonRef, resetDeleting } = useDeleteConfirm<Ticket>()

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
    fetchFn: async (params) => {
      const queryParams: TicketListParams = {
        ...params,
        status: statusFilter || undefined,
        type_id: typeFilter ? parseInt(typeFilter) : undefined,
      }
      return await getTickets(queryParams)
    },
    defaultPageSize: 10,
  })

  useEffect(() => {
    getEnabledTicketTypes().then(setTicketTypes)
  }, [])

  useEffect(() => {
    refresh()
  }, [statusFilter, typeFilter])

  const handleCreate = () => {
    navigate('/ticket/create')
  }

  const handleView = (ticket: Ticket) => {
    navigate(`/ticket/${ticket.id}`)
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
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
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="状态筛选" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">全部状态</SelectItem>
              {Object.entries(statusMap).map(([key, { label }]) => (
                <SelectItem key={key} value={key}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="类型筛选" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">全部类型</SelectItem>
              {ticketTypes.map((type) => (
                <SelectItem key={type.id} value={type.id!.toString()}>{type.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="h-4 w-4 mr-2" />
          创建工单
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>ID</TableHead>
            <TableHead>标题</TableHead>
            <TableHead>类型</TableHead>
            <TableHead>优先级</TableHead>
            <TableHead>状态</TableHead>
            <TableHead>创建人</TableHead>
            <TableHead>创建时间</TableHead>
            <TableHead className="text-right">操作</TableHead>
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
                <TableCell>#{ticket.id}</TableCell>
                <TableCell className="font-medium">{ticket.title}</TableCell>
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
                <TableCell>{ticket.created_at ? new Date(ticket.created_at).toLocaleString() : '-'}</TableCell>
                <TableCell className="text-right">
                  <TableActions>
                    <TableActionButton onClick={() => handleView(ticket)}>
                      <Eye className="h-4 w-4" />
                    </TableActionButton>
                    <TableActionButton
                      variant="delete"
                      ref={(el) => setButtonRef(ticket.id!, el)}
                      onClick={() => handleDeleteClick(ticket)}
                    />
                  </TableActions>
                  <DeleteConfirmCard
                    isOpen={deletingId === ticket.id}
                    message={`确定要删除工单 "${ticket.title}" 吗？`}
                    buttonRef={getButtonRef(ticket.id!)}
                    onConfirm={() => handleDeleteConfirm(ticket)}
                    onCancel={handleDeleteCancel}
                  />
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {total > pageSize && (
        <Pagination
          current={page}
          total={total}
          pageSize={pageSize}
          onChange={handlePageChange}
        />
      )}
    </div>
  )
}

export default TicketList
