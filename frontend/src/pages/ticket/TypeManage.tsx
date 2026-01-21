import { useState } from 'react'
import { toast } from 'sonner'
import { Plus } from 'lucide-react'
import { DeleteConfirmCard } from '@/components/DeleteConfirmCard'
import { useDeleteConfirm } from '@/hooks/useDeleteConfirm'
import { usePagination } from '@/hooks/usePagination'
import {
  getTicketTypes,
  createTicketType,
  updateTicketType,
  deleteTicketType,
  TicketType,
} from '@/api/ticket'
import {
  Button,
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Input,
  Textarea,
  Label,
  Switch,
} from '@/components/ui-tw'

const TicketTypeManage = () => {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<TicketType | null>(null)
  const [formData, setFormData] = useState({ name: '', description: '', icon: '', enabled: true })
  const { deletingId, handleDeleteClick, handleDeleteCancel, setButtonRef, getButtonRef, resetDeleting } = useDeleteConfirm<TicketType>()

  const { data: types, loading, total, page, pageSize, handlePageChange, refresh } = usePagination<TicketType>({
    fetchFn: getTicketTypes,
    defaultPageSize: 10,
  })

  const handleCreate = () => {
    setEditing(null)
    setFormData({ name: '', description: '', icon: '', enabled: true })
    setDialogOpen(true)
  }

  const handleEdit = (type: TicketType) => {
    setEditing(type)
    setFormData({ name: type.name, description: type.description || '', icon: type.icon || '', enabled: type.enabled })
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!formData.name) {
      toast.error('请输入类型名称')
      return
    }
    try {
      if (editing) {
        await updateTicketType(editing.id!, formData as TicketType)
        toast.success('更新成功')
      } else {
        await createTicketType(formData as TicketType)
        toast.success('创建成功')
      }
      setDialogOpen(false)
      refresh()
    } catch {
      toast.error('操作失败')
    }
  }

  const handleDeleteConfirm = async (type: TicketType) => {
    try {
      await deleteTicketType(type.id!)
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
        <h1 className="text-xl font-semibold">工单类型管理</h1>
        <Button onClick={handleCreate}>
          <Plus className="h-4 w-4 mr-2" />新建类型
        </Button>
      </div>

      <div className="rounded-lg border bg-card">
        <Table className="text-sm">
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">ID</TableHead>
              <TableHead>名称</TableHead>
              <TableHead>描述</TableHead>
              <TableHead className="w-24">状态</TableHead>
              <TableHead className="w-32">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableEmpty colSpan={5} loading />
            ) : types.length === 0 ? (
              <TableEmpty colSpan={5} />
            ) : (
              types.map((type) => (
                <TableRow key={type.id}>
                  <TableCell className="font-medium">{type.id}</TableCell>
                  <TableCell>{type.name}</TableCell>
                  <TableCell className="text-muted-foreground">{type.description || '-'}</TableCell>
                  <TableCell>
                    <Badge variant={type.enabled ? 'default' : 'secondary'}>
                      {type.enabled ? '启用' : '禁用'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="relative">
                      <TableActions>
                        <TableActionButton variant="edit" onClick={() => handleEdit(type)} />
                        <TableActionButton
                          variant="delete"
                          ref={(el) => setButtonRef(type.id!, el)}
                          onClick={() => handleDeleteClick(type)}
                        />
                      </TableActions>
                      <DeleteConfirmCard
                        isOpen={deletingId === type.id}
                        message={`确定删除工单类型 "${type.name}" 吗？`}
                        onConfirm={() => handleDeleteConfirm(type)}
                        onCancel={handleDeleteCancel}
                        buttonRef={getButtonRef(type.id!)}
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? '编辑工单类型' : '新建工单类型'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>名称 *</Label>
              <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="请输入类型名称" />
            </div>
            <div className="space-y-2">
              <Label>描述</Label>
              <Textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="请输入描述" />
            </div>
            <div className="flex items-center justify-between">
              <Label>启用</Label>
              <Switch checked={formData.enabled} onCheckedChange={(v) => setFormData({ ...formData, enabled: v })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>取消</Button>
            <Button onClick={handleSave}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default TicketTypeManage
