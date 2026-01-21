import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { Plus, Trash2, GripVertical, Settings, Workflow } from 'lucide-react'
import { DeleteConfirmCard } from '@/components/DeleteConfirmCard'
import { useDeleteConfirm } from '@/hooks/useDeleteConfirm'
import { usePagination } from '@/hooks/usePagination'
import {
  getApprovalFlows,
  createApprovalFlow,
  updateApprovalFlow,
  deleteApprovalFlow,
  getFlowNodes,
  saveFlowNodes,
  saveFlowNodesWithConnections,
  publishApprovalFlow,
  ApprovalFlow,
  FlowNode,
  NodeConnection,
  FLOW_NODE_TYPES,
  APPROVER_TYPES,
} from '@/api/ticket'
import { getRoleList, Role } from '@/api/role'
import { getUsers, User } from '@/api/user'
import FlowEditor from '@/components/ticket/FlowEditor'
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
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Card,
  CardContent,
  Tabs,
  TabsList,
  TabsTrigger,
} from '@/components/ui-tw'

const FlowManage = () => {
  const [roles, setRoles] = useState<Role[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [nodesDialogOpen, setNodesDialogOpen] = useState(false)
  const [editing, setEditing] = useState<ApprovalFlow | null>(null)
  const [formData, setFormData] = useState({ name: '', description: '', enabled: true })
  const [nodes, setNodes] = useState<FlowNode[]>([])
  const [connections, setConnections] = useState<NodeConnection[]>([])
  const [editorMode, setEditorMode] = useState<'list' | 'visual'>('list')
  const { deletingId, handleDeleteClick, handleDeleteCancel, setButtonRef, getButtonRef, resetDeleting } = useDeleteConfirm<ApprovalFlow>()

  const { data: flows, loading, total, page, pageSize, handlePageChange, refresh } = usePagination<ApprovalFlow>({
    fetchFn: getApprovalFlows,
    defaultPageSize: 10,
  })

  useEffect(() => {
    loadOptions()
  }, [])

  const loadOptions = async () => {
    try {
      const [rolesRes, usersRes] = await Promise.all([
        getRoleList({ page: 1, page_size: 1000 }),
        getUsers({ page: 1, page_size: 1000 }),
      ])
      setRoles(rolesRes.list || [])
      setUsers(usersRes.list || [])
    } catch {
      // ignore
    }
  }

  const handleCreate = () => {
    setEditing(null)
    setFormData({ name: '', description: '', enabled: true })
    setDialogOpen(true)
  }

  const handleEdit = (flow: ApprovalFlow) => {
    setEditing(flow)
    setFormData({ name: flow.name, description: flow.description || '', enabled: flow.enabled })
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!formData.name) {
      toast.error('请输入流程名称')
      return
    }
    try {
      if (editing) {
        await updateApprovalFlow(editing.id!, formData)
        toast.success('更新成功')
      } else {
        await createApprovalFlow(formData)
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

  const handlePublish = async (flow: ApprovalFlow) => {
    try {
      await publishApprovalFlow(flow.id!)
      toast.success('发布成功')
      refresh()
    } catch {
      toast.error('发布失败')
    }
  }

  const handleEditNodes = async (flow: ApprovalFlow) => {
    setEditing(flow)
    try {
      const data = await getFlowNodes(flow.id!)
      setNodes(data)
    } catch {
      setNodes([])
    }
    setNodesDialogOpen(true)
  }

  const handleAddNode = () => {
    setNodes([
      ...nodes,
      {
        flow_id: editing!.id!,
        node_type: 'approve',
        name: '',
        approver_type: 'role',
        approver_value: '',
        sort_order: nodes.length + 1,
        position_x: 0,
        position_y: 0,
      },
    ])
  }

  const handleNodeChange = (index: number, key: keyof FlowNode, value: any) => {
    const newNodes = [...nodes]
    newNodes[index] = { ...newNodes[index], [key]: value }
    setNodes(newNodes)
  }

  const handleRemoveNode = (index: number) => {
    setNodes(nodes.filter((_, i) => i !== index))
  }

  const handleSaveNodes = async () => {
    if (!editing) return
    // 验证节点
    for (const node of nodes) {
      if (!node.name) {
        toast.error('请填写所有节点名称')
        return
      }
      if (node.node_type !== 'condition' && node.node_type !== 'cc' && !node.approver_value) {
        toast.error('请为所有审批节点配置审批人')
        return
      }
    }
    try {
      if (editorMode === 'visual' && connections.length > 0) {
        await saveFlowNodesWithConnections(editing.id!, { nodes, connections })
      } else {
        await saveFlowNodes(editing.id!, nodes)
      }
      toast.success('保存成功')
      setNodesDialogOpen(false)
    } catch {
      toast.error('保存失败')
    }
  }

  const handleFlowEditorChange = useCallback((newNodes: FlowNode[], newConnections: NodeConnection[]) => {
    setNodes(newNodes)
    setConnections(newConnections)
  }, [])

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
              <TableHead>描述</TableHead>
              <TableHead className="w-20">版本</TableHead>
              <TableHead className="w-24">状态</TableHead>
              <TableHead className="w-48">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableEmpty colSpan={6} loading />
            ) : flows.length === 0 ? (
              <TableEmpty colSpan={6} />
            ) : (
              flows.map((flow) => (
                <TableRow key={flow.id}>
                  <TableCell className="font-medium">{flow.id}</TableCell>
                  <TableCell>{flow.name}</TableCell>
                  <TableCell className="text-muted-foreground">{flow.description || '-'}</TableCell>
                  <TableCell>v{flow.version}</TableCell>
                  <TableCell><Badge variant={flow.enabled ? 'default' : 'secondary'}>{flow.enabled ? '启用' : '禁用'}</Badge></TableCell>
                  <TableCell>
                    <div className="relative">
                      <TableActions>
                        <TableActionButton variant="settings" icon={<Settings className="h-4 w-4" />} onClick={() => handleEditNodes(flow)} title="配置节点" />
                        <TableActionButton variant="edit" onClick={() => handleEdit(flow)} />
                        <TableActionButton onClick={() => handlePublish(flow)}>发布</TableActionButton>
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

      {/* 新建/编辑流程对话框 */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>{editing ? '编辑审批流程' : '新建审批流程'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>名称 *</Label>
              <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="请输入流程名称" />
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

      {/* 节点配置对话框 */}
      <Dialog open={nodesDialogOpen} onOpenChange={setNodesDialogOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle>配置审批节点 - {editing?.name}</DialogTitle>
              <Tabs value={editorMode} onValueChange={(v) => setEditorMode(v as 'list' | 'visual')}>
                <TabsList>
                  <TabsTrigger value="list">
                    <GripVertical className="h-4 w-4 mr-1" />列表模式
                  </TabsTrigger>
                  <TabsTrigger value="visual">
                    <Workflow className="h-4 w-4 mr-1" />可视化
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto">
            {editorMode === 'visual' ? (
              <FlowEditor
                nodes={nodes}
                roles={roles.map((r) => ({ id: r.id!, name: r.name }))}
                users={users.map((u) => ({ id: u.id!, username: u.username }))}
                onChange={handleFlowEditorChange}
              />
            ) : (
              <div className="space-y-4 p-1">
                {nodes.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">暂无节点，请点击下方按钮添加</div>
                ) : (
                  nodes.map((node, index) => (
                    <Card key={index}>
                      <CardContent className="pt-4">
                        <div className="flex items-start gap-4">
                          <GripVertical className="h-4 w-4 text-muted-foreground mt-2 cursor-move" />
                          <div className="flex-1 space-y-3">
                            <div className="grid grid-cols-3 gap-3">
                              <div className="space-y-1">
                                <Label className="text-xs">节点名称 *</Label>
                                <Input
                                  placeholder="节点名称"
                                  value={node.name}
                                  onChange={(e) => handleNodeChange(index, 'name', e.target.value)}
                                />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs">节点类型</Label>
                                <Select
                                  value={node.node_type}
                                  onValueChange={(v) => handleNodeChange(index, 'node_type', v)}
                                >
                                  <SelectTrigger><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    {Object.entries(FLOW_NODE_TYPES).map(([key, label]) => (
                                      <SelectItem key={key} value={key}>{label}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs">审批人类型</Label>
                                <Select
                                  value={node.approver_type || 'role'}
                                  onValueChange={(v) => handleNodeChange(index, 'approver_type', v)}
                                  disabled={node.node_type === 'condition' || node.node_type === 'cc'}
                                >
                                  <SelectTrigger><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    {Object.entries(APPROVER_TYPES).map(([key, label]) => (
                                      <SelectItem key={key} value={key}>{label}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">审批人/值</Label>
                              {node.approver_type === 'role' ? (
                                <Select
                                  value={node.approver_value || 'none'}
                                  onValueChange={(v) => handleNodeChange(index, 'approver_value', v === 'none' ? '' : v)}
                                >
                                  <SelectTrigger><SelectValue placeholder="选择角色" /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="none">请选择</SelectItem>
                                    {roles.filter(r => r.id != null && r.id !== 0).map((role) => (
                                      <SelectItem key={role.id} value={String(role.id)}>{role.name}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              ) : node.approver_type === 'user' ? (
                                <Select
                                  value={node.approver_value || 'none'}
                                  onValueChange={(v) => handleNodeChange(index, 'approver_value', v === 'none' ? '' : v)}
                                >
                                  <SelectTrigger><SelectValue placeholder="选择用户" /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="none">请选择</SelectItem>
                                    {users.filter(u => u.id != null && u.id !== 0).map((user) => (
                                      <SelectItem key={user.id} value={String(user.id)}>{user.username}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              ) : (
                                <Input
                                  placeholder="输入表单字段名"
                                  value={node.approver_value || ''}
                                  onChange={(e) => handleNodeChange(index, 'approver_value', e.target.value)}
                                />
                              )}
                            </div>
                            {node.node_type === 'condition' && (
                              <div className="space-y-1">
                                <Label className="text-xs">条件配置 (JSON)</Label>
                                <Input
                                  placeholder='{"field": "amount", "operator": ">", "value": "1000"}'
                                  value={node.condition || ''}
                                  onChange={(e) => handleNodeChange(index, 'condition', e.target.value)}
                                />
                              </div>
                            )}
                          </div>
                          <Button variant="ghost" size="icon" onClick={() => handleRemoveNode(index)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
                <Button variant="outline" className="w-full" onClick={handleAddNode}>
                  <Plus className="h-4 w-4 mr-2" />添加节点
                </Button>
              </div>
            )}
          </div>

          <DialogFooter className="border-t pt-4">
            <Button variant="outline" onClick={() => setNodesDialogOpen(false)}>取消</Button>
            <Button onClick={handleSaveNodes}>保存节点</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default FlowManage
