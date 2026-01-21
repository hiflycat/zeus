import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Plus, Trash2, GripVertical } from 'lucide-react'
import { DeleteConfirmCard } from '@/components/DeleteConfirmCard'
import { useDeleteConfirm } from '@/hooks/useDeleteConfirm'
import { usePagination } from '@/hooks/usePagination'
import {
  getApprovalFlows,
  createApprovalFlow,
  updateApprovalFlow,
  deleteApprovalFlow,
  getApprovalNodes,
  saveApprovalNodes,
  getEnabledTicketTypes,
  ApprovalFlow,
  ApprovalNode,
  TicketType,
} from '@/api/ticket'
import { getRoleList, Role } from '@/api/role'
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
  Label,
  Switch,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Card,
  CardContent,
} from '@/components/ui-tw'

const FlowManage = () => {
  const [ticketTypes, setTicketTypes] = useState<TicketType[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [nodesDialogOpen, setNodesDialogOpen] = useState(false)
  const [editing, setEditing] = useState<ApprovalFlow | null>(null)
  const [formData, setFormData] = useState({ type_id: '', name: '', enabled: true })
  const [nodes, setNodes] = useState<ApprovalNode[]>([])
  const { deletingId, handleDeleteClick, handleDeleteCancel, setButtonRef, getButtonRef, resetDeleting } = useDeleteConfirm<ApprovalFlow>()

  const { data: flows, loading, total, page, pageSize, handlePageChange, refresh } = usePagination<ApprovalFlow>({
    fetchFn: getApprovalFlows,
    defaultPageSize: 10,
  })

  useEffect(() => {
    getEnabledTicketTypes().then(setTicketTypes)
    getRoleList({ page: 1, page_size: 1000 }).then((res) => setRoles(res.list || []))
  }, [])

  const handleCreate = () => {
    setEditing(null)
    setFormData({ type_id: '', name: '', enabled: true })
    setDialogOpen(true)
  }

  const handleEdit = (flow: ApprovalFlow) => {
    setEditing(flow)
    setFormData({ type_id: flow.type_id.toString(), name: flow.name, enabled: flow.enabled })
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!formData.type_id || !formData.name) {
      toast.error('请填写必填项')
      return
    }
    try {
      const data = { ...formData, type_id: parseInt(formData.type_id) } as ApprovalFlow
      if (editing) {
        await updateApprovalFlow(editing.id!, data)
        toast.success('更新成功')
      } else {
        await createApprovalFlow(data)
        toast.success('创建成功')
      }
      setDialogOpen(false)
      refresh()
    } catch {
      toast.error('操作失败')
    }
  }

  const handleDeleteConfirm = async (flow: ApprovalFlow) => {
    try {
      await deleteApprovalFlow(flow.id!)
      toast.success('删除成功')
      resetDeleting()
      refresh()
    } catch {
      resetDeleting()
    }
  }

  const handleEditNodes = async (flow: ApprovalFlow) => {
    setEditing(flow)
    try {
      const data = await getApprovalNodes(flow.id!)
      setNodes(data)
    } catch {
      setNodes([])
    }
    setNodesDialogOpen(true)
  }

  const handleAddNode = () => {
    setNodes([...nodes, { flow_id: editing!.id!, name: '', role_id: 0, approve_type: 'or', sort_order: nodes.length + 1 }])
  }

  const handleRemoveNode = (index: number) => {
    setNodes(nodes.filter((_, i) => i !== index))
  }

  const handleSaveNodes = async () => {
    if (!editing) return
    try {
      await saveApprovalNodes(editing.id!, nodes)
      toast.success('保存成功')
      setNodesDialogOpen(false)
    } catch {
      toast.error('保存失败')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">审批流程管理</h1>
        <Button onClick={handleCreate}><Plus className="h-4 w-4 mr-2" />新建流程</Button>
      </div>

      <div className="rounded-lg border bg-card">
        <Table className="text-sm">
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">ID</TableHead>
              <TableHead>名称</TableHead>
              <TableHead>关联类型</TableHead>
              <TableHead className="w-24">状态</TableHead>
              <TableHead className="w-40">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableEmpty colSpan={5} loading />
            ) : flows.length === 0 ? (
              <TableEmpty colSpan={5} />
            ) : (
              flows.map((flow) => (
                <TableRow key={flow.id}>
                  <TableCell className="font-medium">{flow.id}</TableCell>
                  <TableCell>{flow.name}</TableCell>
                  <TableCell className="text-muted-foreground">{ticketTypes.find((t) => t.id === flow.type_id)?.name || flow.type_id}</TableCell>
                  <TableCell><Badge variant={flow.enabled ? 'default' : 'secondary'}>{flow.enabled ? '启用' : '禁用'}</Badge></TableCell>
                  <TableCell>
                    <div className="relative">
                      <TableActions>
                        <TableActionButton onClick={() => handleEditNodes(flow)}>节点</TableActionButton>
                        <TableActionButton variant="edit" onClick={() => handleEdit(flow)} />
                        <TableActionButton
                          variant="delete"
                          ref={(el) => setButtonRef(flow.id!, el)}
                          onClick={() => handleDeleteClick(flow)}
                        />
                      </TableActions>
                      <DeleteConfirmCard
                        isOpen={deletingId === flow.id}
                        message={`确定删除审批流程 "${flow.name}" 吗？`}
                        onConfirm={() => handleDeleteConfirm(flow)}
                        onCancel={handleDeleteCancel}
                        buttonRef={getButtonRef(flow.id!)}
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
          <DialogHeader><DialogTitle>{editing ? '编辑审批流程' : '新建审批流程'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>名称 *</Label>
              <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="请输入流程名称" />
            </div>
            <div className="space-y-2">
              <Label>关联工单类型 *</Label>
              <Select value={formData.type_id} onValueChange={(v) => setFormData({ ...formData, type_id: v })}>
                <SelectTrigger><SelectValue placeholder="选择工单类型" /></SelectTrigger>
                <SelectContent>
                  {ticketTypes.map((type) => (<SelectItem key={type.id} value={type.id!.toString()}>{type.name}</SelectItem>))}
                </SelectContent>
              </Select>
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

      <Dialog open={nodesDialogOpen} onOpenChange={setNodesDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>编辑审批节点 - {editing?.name}</DialogTitle></DialogHeader>
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {nodes.map((node, index) => (
              <Card key={index}>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-4">
                    <GripVertical className="h-4 w-4 text-muted-foreground" />
                    <div className="flex-1 grid grid-cols-3 gap-4">
                      <Input placeholder="节点名称" value={node.name} onChange={(e) => {
                        const newNodes = [...nodes]
                        newNodes[index].name = e.target.value
                        setNodes(newNodes)
                      }} />
                      <Select value={node.role_id?.toString() || ''} onValueChange={(v) => {
                        const newNodes = [...nodes]
                        newNodes[index].role_id = parseInt(v)
                        setNodes(newNodes)
                      }}>
                        <SelectTrigger><SelectValue placeholder="审批角色" /></SelectTrigger>
                        <SelectContent>
                          {roles.map((role) => (<SelectItem key={role.id} value={role.id!.toString()}>{role.name}</SelectItem>))}
                        </SelectContent>
                      </Select>
                      <Select value={node.approve_type} onValueChange={(v) => {
                        const newNodes = [...nodes]
                        newNodes[index].approve_type = v
                        setNodes(newNodes)
                      }}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="or">或签</SelectItem>
                          <SelectItem value="and">会签</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => handleRemoveNode(index)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            <Button variant="outline" className="w-full" onClick={handleAddNode}>
              <Plus className="h-4 w-4 mr-2" />添加节点
            </Button>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNodesDialogOpen(false)}>取消</Button>
            <Button onClick={handleSaveNodes}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default FlowManage
