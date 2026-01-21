import { useState, useEffect } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { toast } from 'sonner'
import { ArrowLeft, Send, Check, X, Upload, Download, Trash2, MessageSquare, Clock, Edit } from 'lucide-react'
import {
  getTicketById,
  submitTicket,
  approveTicket,
  completeTicket,
  cancelTicket,
  updateTicket,
  getAttachments,
  uploadAttachment,
  getAttachmentDownloadUrl,
  deleteAttachment,
  getComments,
  createComment,
  deleteComment,
  getFlowNodes,
  getApprovalRecords,
  checkCanApprove,
  Ticket,
  Attachment,
  TicketComment,
  ApprovalRecord,
  FlowNode,
} from '@/api/ticket'
import { useAuthStore } from '@/store/auth'
import { useTabsStore } from '@/store/tabs'
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  Textarea,
  Input,
  Label,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Separator,
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

const priorityMap: Record<number, string> = {
  1: '低',
  2: '中',
  3: '高',
  4: '紧急',
}

const TicketDetail = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const { removeTab, updateTabTitle } = useTabsStore()
  const { user } = useAuthStore()
  const [ticket, setTicket] = useState<Ticket | null>(null)
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [comments, setComments] = useState<TicketComment[]>([])
  const [approvalRecords, setApprovalRecords] = useState<ApprovalRecord[]>([])
  const [flowNodes, setFlowNodes] = useState<FlowNode[]>([])
  const [loading, setLoading] = useState(true)
  const [approveDialogOpen, setApproveDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [approveComment, setApproveComment] = useState('')
  const [isApproving, setIsApproving] = useState(true)
  const [canApprove, setCanApprove] = useState(false)
  const [newComment, setNewComment] = useState('')
  const [editForm, setEditForm] = useState({ title: '', description: '' })

  const isCreator = ticket?.creator_id === user?.id
  const isAdmin = !!user?.roles?.some((role: any) => role?.name === 'admin')
  const canEdit = ticket?.status === 'draft' && (isCreator || isAdmin)
  const canSubmit = ticket?.status === 'draft' && (isCreator || isAdmin)
  const canComplete = ticket?.status === 'processing' || isAdmin
  const canCancel = ['draft', 'pending'].includes(ticket?.status || '') && (isCreator || isAdmin)

  const loadTicket = async () => {
    if (!id) return
    try {
      const data = await getTicketById(parseInt(id))
      setTicket(data)
      setEditForm({ title: data.title, description: data.description || '' })
      await loadFlowNodes(data.flow_id)
      if (data.title) {
        updateTabTitle(location.pathname, data.title)
      }
    } catch {
      toast.error('加载工单失败')
    } finally {
      setLoading(false)
    }
  }

  const handleBack = () => {
    const nextKey = removeTab(location.pathname)
    if (nextKey) {
      navigate(nextKey, { replace: true, state: { closedTabKey: location.pathname } })
    } else {
      navigate('/ticket/list', { replace: true, state: { closedTabKey: location.pathname } })
    }
  }

  const loadAttachments = async () => {
    if (!id) return
    try {
      const data = await getAttachments(parseInt(id))
      setAttachments(data || [])
    } catch {
      // ignore
    }
  }

  const loadComments = async () => {
    if (!id) return
    try {
      const data = await getComments(parseInt(id))
      setComments(data || [])
    } catch {
      // ignore
    }
  }

  const loadApprovalRecords = async () => {
    if (!id) return
    try {
      const data = await getApprovalRecords(parseInt(id))
      setApprovalRecords(data || [])
    } catch {
      // ignore
    }
  }

  const loadFlowNodes = async (flowId?: number) => {
    if (!flowId) {
      setFlowNodes([])
      return
    }
    try {
      const nodes = await getFlowNodes(flowId)
      setFlowNodes(nodes || [])
    } catch {
      setFlowNodes([])
    }
  }

  const checkApprovePermission = async () => {
    if (!id) return
    try {
      if (isAdmin) {
        setCanApprove(true)
        return
      }
      const { can_approve } = await checkCanApprove(parseInt(id))
      setCanApprove(can_approve)
    } catch {
      setCanApprove(false)
    }
  }

  useEffect(() => {
    loadTicket()
    loadAttachments()
    loadComments()
    loadApprovalRecords()
    checkApprovePermission()
  }, [id])

  const handleSubmit = async () => {
    if (!ticket) return
    try {
      await submitTicket(ticket.id!)
      toast.success('工单已提交')
      loadTicket()
      checkApprovePermission()
    } catch {
      toast.error('提交失败')
    }
  }

  const handleApprove = async (approved: boolean) => {
    if (!ticket) return
    try {
      await approveTicket(ticket.id!, { approved, comment: approveComment })
      toast.success(approved ? '已通过' : '已拒绝')
      setApproveDialogOpen(false)
      setApproveComment('')
      loadTicket()
      loadApprovalRecords()
      checkApprovePermission()
    } catch {
      toast.error('操作失败')
    }
  }

  const handleComplete = async () => {
    if (!ticket) return
    try {
      await completeTicket(ticket.id!)
      toast.success('工单已完成')
      loadTicket()
    } catch {
      toast.error('操作失败')
    }
  }

  const handleCancel = async () => {
    if (!ticket) return
    try {
      await cancelTicket(ticket.id!)
      toast.success('工单已取消')
      loadTicket()
    } catch {
      toast.error('操作失败')
    }
  }

  const handleEdit = async () => {
    if (!ticket) return
    try {
      await updateTicket(ticket.id!, editForm)
      toast.success('更新成功')
      setEditDialogOpen(false)
      loadTicket()
    } catch {
      toast.error('更新失败')
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !ticket) return
    try {
      await uploadAttachment(ticket.id!, file)
      toast.success('上传成功')
      loadAttachments()
    } catch {
      toast.error('上传失败')
    }
    e.target.value = ''
  }

  const handleDownload = async (attachment: Attachment) => {
    try {
      const { url } = await getAttachmentDownloadUrl(attachment.id!)
      window.open(url, '_blank')
    } catch {
      toast.error('获取下载链接失败')
    }
  }

  const handleDeleteAttachment = async (attachment: Attachment) => {
    try {
      await deleteAttachment(attachment.id!)
      toast.success('删除成功')
      loadAttachments()
    } catch {
      toast.error('删除失败')
    }
  }

  const handleAddComment = async () => {
    if (!ticket || !newComment.trim()) return
    try {
      await createComment(ticket.id!, { content: newComment })
      toast.success('评论成功')
      setNewComment('')
      loadComments()
    } catch {
      toast.error('评论失败')
    }
  }

  const handleDeleteComment = async (comment: TicketComment) => {
    try {
      await deleteComment(comment.id!)
      toast.success('删除成功')
      loadComments()
    } catch {
      toast.error('删除失败')
    }
  }

  if (loading) {
    return <div className="flex justify-center py-8">加载中...</div>
  }

  if (!ticket) {
    return <div className="flex justify-center py-8">工单不存在</div>
  }

  const formFields = ticket?.type?.template?.fields || []
  const dataMap = new Map<number, string>()
  ticket?.data?.forEach((item) => {
    dataMap.set(item.field_id, item.value)
  })

  const formatFieldValue = (field: any, rawValue?: string) => {
    if (!rawValue) return '-'
    if (field?.field_type === 'multiselect' || field?.field_type === 'attachment') {
      try {
        const parsed = JSON.parse(rawValue)
        if (Array.isArray(parsed)) {
          return parsed.join(', ')
        }
        return typeof parsed === 'object' ? JSON.stringify(parsed) : String(parsed)
      } catch {
        return rawValue
      }
    }
    if (field?.field_type === 'money') {
      return `¥${rawValue}`
    }
    return rawValue
  }

  const sortedFlowNodes = flowNodes.slice().sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
  const approvedNodeIds = new Set(approvalRecords.map((record) => record.node_id))
  const currentNodeId = ticket?.current_node_id
  const currentIndex = currentNodeId
    ? sortedFlowNodes.findIndex((node) => node.id === currentNodeId)
    : -1

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={handleBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-xl font-semibold">工单详情 #{ticket.id}</h1>
        <Badge variant={statusMap[ticket.status]?.variant || 'default'}>
          {statusMap[ticket.status]?.label || ticket.status}
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{ticket.title}</CardTitle>
                {canEdit && (
                  <Button variant="ghost" size="icon" onClick={() => setEditDialogOpen(true)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="prose max-w-none">
                <p className="whitespace-pre-wrap">{ticket.description || '无描述'}</p>
              </div>
            </CardContent>
          </Card>

          {formFields.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>表单内容</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {formFields
                    .slice()
                    .sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0))
                    .map((field: any) => (
                      <div key={field.id} className="space-y-1">
                        <Label className="text-xs text-muted-foreground">{field.label}</Label>
                        <div className="text-sm">
                          {formatFieldValue(field, dataMap.get(field.id))}
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                评论 ({comments.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="添加评论..."
                  rows={2}
                  className="flex-1"
                />
                <Button onClick={handleAddComment} disabled={!newComment.trim()}>
                  发送
                </Button>
              </div>
              {comments.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-4">暂无评论</p>
              ) : (
                <div className="space-y-3">
                  {comments.map((comment) => (
                    <div key={comment.id} className="flex gap-3 p-3 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm">{comment.user?.username || '未知用户'}</span>
                          <span className="text-xs text-muted-foreground">
                            {comment.created_at ? new Date(comment.created_at).toLocaleString() : ''}
                          </span>
                        </div>
                        <p className="text-sm whitespace-pre-wrap">{comment.content}</p>
                      </div>
                      {comment.user_id === user?.id && (
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteComment(comment)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                审批记录 ({approvalRecords.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {approvalRecords.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-4">暂无审批记录</p>
              ) : (
                <div className="space-y-3">
                  {approvalRecords.map((record) => (
                    <div key={record.id} className="flex gap-3 p-3 border rounded-lg">
                      <div className={`w-2 h-2 mt-2 rounded-full ${record.result === 'approved' ? 'bg-green-500' : 'bg-red-500'}`} />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm">{record.approver?.username || '未知用户'}</span>
                          <Badge variant={record.result === 'approved' ? 'default' : 'destructive'} className="text-xs">
                            {record.result === 'approved' ? '通过' : '拒绝'}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {record.node?.name || ''}
                          </span>
                        </div>
                        {record.comment && (
                          <p className="text-sm text-muted-foreground">{record.comment}</p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          {record.created_at ? new Date(record.created_at).toLocaleString() : ''}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>附件 ({attachments.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-end mb-4">
                <label className="cursor-pointer">
                  <input type="file" className="hidden" onChange={handleFileUpload} />
                  <Button variant="outline" size="sm" asChild>
                    <span><Upload className="h-4 w-4 mr-2" />上传</span>
                  </Button>
                </label>
              </div>
              {attachments.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-4">暂无附件</p>
              ) : (
                <div className="space-y-2">
                  {attachments.map((att) => (
                    <div key={att.id} className="flex items-center justify-between p-2 border rounded">
                      <span className="text-sm truncate">{att.file_name}</span>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="icon" onClick={() => handleDownload(att)}>
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteAttachment(att)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>工单信息</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">类型</span>
                <span>{ticket.type?.name || '-'}</span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-muted-foreground">优先级</span>
                <span>{priorityMap[ticket.priority] || '-'}</span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-muted-foreground">创建人</span>
                <span>{ticket.creator?.username || '-'}</span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-muted-foreground">创建时间</span>
                <span className="text-sm">{ticket.created_at ? new Date(ticket.created_at).toLocaleString() : '-'}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>流程节点</CardTitle>
            </CardHeader>
            <CardContent>
              {sortedFlowNodes.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-2">无流程节点</p>
              ) : (
                <div className="space-y-2">
                  {sortedFlowNodes.map((node, index) => {
                    const isCurrent = currentNodeId === node.id
                    const isCompleted = approvedNodeIds.has(node.id || 0)
                    const isFuture = currentIndex >= 0 && index > currentIndex
                    return (
                      <div key={node.id || node.name} className="flex items-center gap-2">
                        <span
                          className={[
                            'h-2 w-2 rounded-full',
                            isCurrent ? 'bg-blue-500' : isCompleted ? 'bg-green-500' : isFuture ? 'bg-amber-400' : 'bg-gray-300',
                          ].join(' ')}
                        />
                        <div className="flex-1 text-sm">
                          <span className={isCurrent ? 'font-medium text-primary' : ''}>{node.name}</span>
                          {isCurrent && <span className="ml-2 text-xs text-primary">当前</span>}
                          {isCompleted && !isCurrent && <span className="ml-2 text-xs text-muted-foreground">已完成</span>}
                          {!isCompleted && !isCurrent && isFuture && (
                            <span className="ml-2 text-xs text-amber-600">后续</span>
                          )}
                          {!isCompleted && !isCurrent && !isFuture && currentIndex === -1 && (
                            <span className="ml-2 text-xs text-muted-foreground">未开始</span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>操作</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {canSubmit && (
                <Button className="w-full" onClick={handleSubmit}>
                  <Send className="h-4 w-4 mr-2" />提交审批
                </Button>
              )}
              {ticket.status === 'pending' && (canApprove || isAdmin) && (
                <>
                  <Button className="w-full" onClick={() => { setIsApproving(true); setApproveDialogOpen(true) }}>
                    <Check className="h-4 w-4 mr-2" />通过
                  </Button>
                  <Button variant="destructive" className="w-full" onClick={() => { setIsApproving(false); setApproveDialogOpen(true) }}>
                    <X className="h-4 w-4 mr-2" />拒绝
                  </Button>
                </>
              )}
              {canComplete && (
                <Button className="w-full" onClick={handleComplete}>
                  <Check className="h-4 w-4 mr-2" />完成
                </Button>
              )}
              {canCancel && (
                <Button variant="outline" className="w-full" onClick={handleCancel}>
                  取消工单
                </Button>
              )}
              {!canSubmit && !canApprove && !canComplete && !canCancel && ticket.status !== 'pending' && (
                <p className="text-sm text-muted-foreground text-center">暂无可用操作</p>
              )}
              {ticket.status === 'pending' && !canApprove && (
                <p className="text-sm text-muted-foreground text-center">等待审批人处理</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isApproving ? '通过审批' : '拒绝审批'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>审批意见</Label>
              <Textarea
                value={approveComment}
                onChange={(e) => setApproveComment(e.target.value)}
                placeholder="请输入审批意见..."
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveDialogOpen(false)}>取消</Button>
            <Button variant={isApproving ? 'default' : 'destructive'} onClick={() => handleApprove(isApproving)}>
              确认
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>编辑工单</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>标题</Label>
              <Input
                value={editForm.title}
                onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
              />
            </div>
            <div>
              <Label>描述</Label>
              <Textarea
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                rows={6}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>取消</Button>
            <Button onClick={handleEdit}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default TicketDetail
