import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { ArrowLeft, Send, Check, X, Upload, Download, Trash2 } from 'lucide-react'
import {
  getTicketById,
  submitTicket,
  approveTicket,
  completeTicket,
  cancelTicket,
  getAttachments,
  uploadAttachment,
  getAttachmentDownloadUrl,
  deleteAttachment,
  Ticket,
  Attachment,
} from '@/api/ticket'
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  Textarea,
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
  const [ticket, setTicket] = useState<Ticket | null>(null)
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [loading, setLoading] = useState(true)
  const [approveDialogOpen, setApproveDialogOpen] = useState(false)
  const [approveComment, setApproveComment] = useState('')
  const [isApproving, setIsApproving] = useState(true)

  const loadTicket = async () => {
    if (!id) return
    try {
      const data = await getTicketById(parseInt(id))
      setTicket(data)
    } catch {
      toast.error('加载工单失败')
    } finally {
      setLoading(false)
    }
  }

  const loadAttachments = async () => {
    if (!id) return
    try {
      const data = await getAttachments(parseInt(id))
      setAttachments(data)
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    loadTicket()
    loadAttachments()
  }, [id])

  const handleSubmit = async () => {
    if (!ticket) return
    try {
      await submitTicket(ticket.id!)
      toast.success('工单已提交')
      loadTicket()
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

  if (loading) {
    return <div className="flex justify-center py-8">加载中...</div>
  }

  if (!ticket) {
    return <div className="flex justify-center py-8">工单不存在</div>
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
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
              <CardTitle>{ticket.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose max-w-none">
                <p className="whitespace-pre-wrap">{ticket.description || '无描述'}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>附件</span>
                <label className="cursor-pointer">
                  <input type="file" className="hidden" onChange={handleFileUpload} />
                  <Button variant="outline" size="sm" asChild>
                    <span><Upload className="h-4 w-4 mr-2" />上传</span>
                  </Button>
                </label>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {attachments.length === 0 ? (
                <p className="text-muted-foreground text-sm">暂无附件</p>
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
              <CardTitle>操作</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {ticket.status === 'draft' && (
                <Button className="w-full" onClick={handleSubmit}>
                  <Send className="h-4 w-4 mr-2" />提交审批
                </Button>
              )}
              {ticket.status === 'pending' && (
                <>
                  <Button className="w-full" onClick={() => { setIsApproving(true); setApproveDialogOpen(true) }}>
                    <Check className="h-4 w-4 mr-2" />通过
                  </Button>
                  <Button variant="destructive" className="w-full" onClick={() => { setIsApproving(false); setApproveDialogOpen(true) }}>
                    <X className="h-4 w-4 mr-2" />拒绝
                  </Button>
                </>
              )}
              {ticket.status === 'processing' && (
                <Button className="w-full" onClick={handleComplete}>
                  <Check className="h-4 w-4 mr-2" />完成
                </Button>
              )}
              {['draft', 'pending'].includes(ticket.status) && (
                <Button variant="outline" className="w-full" onClick={handleCancel}>
                  取消工单
                </Button>
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
    </div>
  )
}

export default TicketDetail
