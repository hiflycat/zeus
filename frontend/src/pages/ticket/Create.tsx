import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { ArrowLeft } from 'lucide-react'
import { createTicket, getEnabledTicketTypes, TicketType } from '@/api/ticket'
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Textarea,
  Label,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui-tw'

const TicketCreate = () => {
  const navigate = useNavigate()
  const [ticketTypes, setTicketTypes] = useState<TicketType[]>([])
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type_id: '',
    priority: '2',
  })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    getEnabledTicketTypes().then(setTicketTypes)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.title || !formData.type_id) {
      toast.error('请填写必填项')
      return
    }
    setSubmitting(true)
    try {
      const ticket = await createTicket({
        title: formData.title,
        description: formData.description,
        type_id: parseInt(formData.type_id),
        priority: parseInt(formData.priority),
      })
      toast.success('创建成功')
      navigate(`/ticket/${ticket.id}`)
    } catch {
      toast.error('创建失败')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-xl font-semibold">创建工单</h1>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>工单信息</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>标题 *</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="请输入工单标题"
              />
            </div>
            <div>
              <Label>类型 *</Label>
              <Select value={formData.type_id} onValueChange={(v) => setFormData({ ...formData, type_id: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="请选择工单类型" />
                </SelectTrigger>
                <SelectContent>
                  {ticketTypes.map((type) => (
                    <SelectItem key={type.id} value={type.id!.toString()}>{type.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>优先级</Label>
              <Select value={formData.priority} onValueChange={(v) => setFormData({ ...formData, priority: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">低</SelectItem>
                  <SelectItem value="2">中</SelectItem>
                  <SelectItem value="3">高</SelectItem>
                  <SelectItem value="4">紧急</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>描述</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="请输入工单描述"
                rows={6}
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={submitting}>
                {submitting ? '创建中...' : '创建工单'}
              </Button>
              <Button type="button" variant="outline" onClick={() => navigate(-1)}>
                取消
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

export default TicketCreate
