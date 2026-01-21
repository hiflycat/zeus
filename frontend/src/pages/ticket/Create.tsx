import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { ArrowLeft, FileText, Zap } from 'lucide-react'
import {
  createTicket,
  getEnabledTicketTypes,
  getEnabledTicketTemplates,
  getFormFields,
  TicketType,
  TicketTemplate,
  FormField,
} from '@/api/ticket'
import DynamicFormRenderer from '@/components/ticket/DynamicFormRenderer'
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Input,
  Textarea,
  Label,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Badge,
} from '@/components/ui-tw'

const TicketCreate = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [ticketTypes, setTicketTypes] = useState<TicketType[]>([])
  const [quickTemplates, setQuickTemplates] = useState<TicketTemplate[]>([])
  const [formFields, setFormFields] = useState<FormField[]>([])
  const [loadingFields, setLoadingFields] = useState(false)
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type_id: '',
    priority: '2',
  })
  const [dynamicValues, setDynamicValues] = useState<Record<string, any>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)

  const priorityMap: Record<string, string> = {
    '1': t('ticket.priorityLow'),
    '2': t('ticket.priorityMedium'),
    '3': t('ticket.priorityHigh'),
    '4': t('ticket.priorityUrgent'),
  }

  // 加载工单类型
  useEffect(() => {
    getEnabledTicketTypes().then(setTicketTypes)
  }, [])

  // 选择类型后加载快捷模板和表单字段
  useEffect(() => {
    if (!formData.type_id) {
      setQuickTemplates([])
      setFormFields([])
      setDynamicValues({})
      return
    }

    const typeId = parseInt(formData.type_id)
    
    // 加载快捷模板
    getEnabledTicketTemplates(typeId).then(setQuickTemplates)
    
    // 查找对应类型的表单模板
    const selectedType = ticketTypes.find((t) => t.id === typeId)
    if (selectedType?.template_id) {
      setLoadingFields(true)
      getFormFields(selectedType.template_id)
        .then((fields) => {
          setFormFields(fields)
          // 初始化默认值
          const defaultValues: Record<string, any> = {}
          fields.forEach((field) => {
            if (field.default_value) {
              defaultValues[field.name] = field.default_value
            }
          })
          setDynamicValues(defaultValues)
        })
        .finally(() => setLoadingFields(false))
    } else {
      setFormFields([])
      setDynamicValues({})
    }
  }, [formData.type_id, ticketTypes])

  // 当前选中的类型
  const selectedType = useMemo(() => {
    if (!formData.type_id) return null
    return ticketTypes.find((t) => t.id === parseInt(formData.type_id))
  }, [formData.type_id, ticketTypes])

  // 应用快捷模板
  const applyQuickTemplate = (template: TicketTemplate) => {
    setFormData({
      ...formData,
      title: template.name,
      description: template.description || '',
    })
    
    // 解析预设值
    if (template.preset_values) {
      try {
        const presetValues = JSON.parse(template.preset_values)
        setDynamicValues((prev) => ({ ...prev, ...presetValues }))
      } catch {
        // ignore
      }
    }
    
    toast.success(t('ticket.templateApplied'))
  }

  // 验证表单
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}
    
    if (!formData.title.trim()) {
      newErrors.title = t('ticket.titleRequired')
    }
    if (!formData.type_id) {
      newErrors.type_id = t('ticket.typeRequired')
    }
    
    // 验证动态字段
    formFields.forEach((field) => {
      if (field.required) {
        const value = dynamicValues[field.name]
        if (value === undefined || value === null || value === '' || 
            (Array.isArray(value) && value.length === 0)) {
          newErrors[field.name] = t('ticket.fillRequired', { field: field.label })
        }
      }
    })
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      toast.error(t('ticket.checkFormFailed'))
      return
    }
    
    setSubmitting(true)
    try {
      const ticket = await createTicket({
        title: formData.title,
        description: formData.description,
        type_id: parseInt(formData.type_id),
        priority: parseInt(formData.priority),
        // 动态字段数据会在后端处理
        form_data: formFields.length > 0 ? dynamicValues : undefined,
      })
      toast.success(t('ticket.createSuccess'))
      navigate(`/ticket/${ticket.id}`)
    } catch {
      toast.error(t('ticket.createFailed'))
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
        <h1 className="text-xl font-semibold">{t('ticket.create')}</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 左侧：主表单 */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>{t('ticket.ticketInfo')}</CardTitle>
              {selectedType && (
                <CardDescription>
                  {t('ticket.type')}: {selectedType.name}
                  {selectedType.template_id && (
                    <Badge variant="outline" className="ml-2">{t('ticket.customForm')}</Badge>
                  )}
                </CardDescription>
              )}
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* 基础字段 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2 space-y-2">
                    <Label htmlFor="title">
                      {t('ticket.ticketTitle')} <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder={t('ticket.enterTitle')}
                      className={errors.title ? 'border-destructive' : ''}
                    />
                    {errors.title && <p className="text-xs text-destructive">{errors.title}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="type_id">
                      {t('ticket.type')} <span className="text-destructive">*</span>
                    </Label>
                    <Select 
                      value={formData.type_id} 
                      onValueChange={(v) => setFormData({ ...formData, type_id: v })}
                    >
                      <SelectTrigger className={errors.type_id ? 'border-destructive' : ''}>
                        <SelectValue placeholder={t('ticket.selectType')} />
                      </SelectTrigger>
                      <SelectContent>
                        {ticketTypes.filter(t => t.id != null && t.id !== 0).map((type) => (
                          <SelectItem key={type.id} value={String(type.id)}>
                            {type.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.type_id && <p className="text-xs text-destructive">{errors.type_id}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="priority">{t('ticket.priority')}</Label>
                    <Select 
                      value={formData.priority} 
                      onValueChange={(v) => setFormData({ ...formData, priority: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(priorityMap).map(([key, label]) => (
                          <SelectItem key={key} value={key}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* 动态表单字段 */}
                {loadingFields ? (
                  <div className="py-8 text-center text-muted-foreground">
                    <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    {t('ticket.loadingFields')}
                  </div>
                ) : formFields.length > 0 ? (
                  <div className="pt-4 border-t">
                    <h3 className="text-sm font-medium mb-4 flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      {t('ticket.customFields')}
                    </h3>
                    <DynamicFormRenderer
                      fields={formFields}
                      values={dynamicValues}
                      onChange={setDynamicValues}
                      errors={errors}
                    />
                  </div>
                ) : null}

                {/* 描述字段 - 如果没有自定义表单则显示 */}
                {formFields.length === 0 && (
                  <div className="space-y-2">
                    <Label htmlFor="description">{t('ticket.description')}</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder={t('ticket.description')}
                      rows={6}
                    />
                  </div>
                )}

                <div className="flex gap-2 pt-4">
                  <Button type="submit" disabled={submitting}>
                    {submitting ? t('ticket.creating') : t('ticket.create')}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => navigate(-1)}>
                    {t('common.cancel')}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* 右侧：快捷模板 */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Zap className="h-4 w-4" />
                {t('ticket.quickTemplate')}
              </CardTitle>
              <CardDescription>
                {t('ticket.quickTemplateDesc')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!formData.type_id ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  {t('ticket.selectTypeFirst')}
                </p>
              ) : quickTemplates.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  {t('ticket.noQuickTemplate')}
                </p>
              ) : (
                <div className="space-y-2">
                  {quickTemplates.map((template) => (
                    <button
                      key={template.id}
                      type="button"
                      className="w-full text-left p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                      onClick={() => applyQuickTemplate(template)}
                    >
                      <div className="font-medium text-sm">{template.name}</div>
                      {template.description && (
                        <div className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {template.description}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* 类型说明 */}
          {selectedType?.description && (
            <Card className="mt-4">
              <CardHeader>
                <CardTitle className="text-base">{t('ticket.typeDescription')}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {selectedType.description}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

export default TicketCreate
