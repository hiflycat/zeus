import { useState, useCallback } from 'react'
import { FormField, FORM_FIELD_TYPES } from '@/api/ticket'
import {
  Button,
  Input,
  Label,
  Textarea,
  Switch,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Tabs,
  TabsList,
  TabsTrigger,
} from '@/components/ui-tw'
import { Plus, Trash2, GripVertical, ChevronDown, ChevronUp, Copy, Eye, Settings2 } from 'lucide-react'

interface FormFieldEditorProps {
  fields: FormField[]
  onChange: (fields: FormField[]) => void
}

// 字段类型图标/颜色
const fieldTypeStyles: Record<string, string> = {
  text: 'bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800',
  textarea: 'bg-indigo-50 border-indigo-200 dark:bg-indigo-950 dark:border-indigo-800',
  number: 'bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800',
  date: 'bg-orange-50 border-orange-200 dark:bg-orange-950 dark:border-orange-800',
  datetime: 'bg-amber-50 border-amber-200 dark:bg-amber-950 dark:border-amber-800',
  select: 'bg-purple-50 border-purple-200 dark:bg-purple-950 dark:border-purple-800',
  multiselect: 'bg-violet-50 border-violet-200 dark:bg-violet-950 dark:border-violet-800',
  user: 'bg-cyan-50 border-cyan-200 dark:bg-cyan-950 dark:border-cyan-800',
  attachment: 'bg-rose-50 border-rose-200 dark:bg-rose-950 dark:border-rose-800',
  money: 'bg-emerald-50 border-emerald-200 dark:bg-emerald-950 dark:border-emerald-800',
}

export default function FormFieldEditor({ fields, onChange }: FormFieldEditorProps) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null)
  const [viewMode, setViewMode] = useState<'list' | 'preview'>('list')

  const handleAddField = (type: string) => {
    const newField: FormField = {
      name: `field_${Date.now()}`,
      label: FORM_FIELD_TYPES[type as keyof typeof FORM_FIELD_TYPES] || '新字段',
      field_type: type,
      required: false,
      sort_order: fields.length + 1,
    }
    onChange([...fields, newField])
    setExpandedIndex(fields.length)
  }

  const handleFieldChange = useCallback((index: number, updates: Partial<FormField>) => {
    const newFields = [...fields]
    newFields[index] = { ...newFields[index], ...updates }
    onChange(newFields)
  }, [fields, onChange])

  const handleRemoveField = useCallback((index: number) => {
    const newFields = fields.filter((_, i) => i !== index)
    // 重新计算 sort_order
    newFields.forEach((f, i) => { f.sort_order = i + 1 })
    onChange(newFields)
    if (expandedIndex === index) {
      setExpandedIndex(null)
    }
  }, [fields, onChange, expandedIndex])

  const handleDuplicateField = useCallback((index: number) => {
    const field = fields[index]
    const newField: FormField = {
      ...field,
      id: undefined,
      name: `${field.name}_copy`,
      label: `${field.label} (副本)`,
      sort_order: fields.length + 1,
    }
    onChange([...fields, newField])
  }, [fields, onChange])

  const handleMoveField = useCallback((index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return
    if (direction === 'down' && index === fields.length - 1) return

    const newFields = [...fields]
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    ;[newFields[index], newFields[targetIndex]] = [newFields[targetIndex], newFields[index]]
    
    // 重新计算 sort_order
    newFields.forEach((f, i) => { f.sort_order = i + 1 })
    onChange(newFields)
    setExpandedIndex(targetIndex)
  }, [fields, onChange])

  // 预览模式渲染
  const renderPreview = (field: FormField) => {
    switch (field.field_type) {
      case 'text':
        return <Input placeholder={field.placeholder || `请输入${field.label}`} disabled />
      case 'textarea':
        return <Textarea placeholder={field.placeholder || `请输入${field.label}`} disabled rows={3} />
      case 'number':
        return <Input type="number" placeholder={field.placeholder || '0'} disabled />
      case 'date':
        return <Input type="date" disabled />
      case 'datetime':
        return <Input type="datetime-local" disabled />
      case 'select':
      case 'multiselect':
        return (
          <Select disabled>
            <SelectTrigger>
              <SelectValue placeholder={field.placeholder || '请选择'} />
            </SelectTrigger>
          </Select>
        )
      case 'user':
        return (
          <Select disabled>
            <SelectTrigger>
              <SelectValue placeholder="选择用户" />
            </SelectTrigger>
          </Select>
        )
      case 'attachment':
        return (
          <div className="border-2 border-dashed rounded-lg p-4 text-center text-muted-foreground">
            点击或拖拽上传附件
          </div>
        )
      case 'money':
        return (
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">¥</span>
            <Input className="pl-7" type="number" placeholder="0.00" disabled />
          </div>
        )
      default:
        return <Input placeholder={field.placeholder} disabled />
    }
  }

  return (
    <div className="space-y-4">
      {/* 工具栏 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'list' | 'preview')}>
            <TabsList>
              <TabsTrigger value="list">
                <Settings2 className="h-4 w-4 mr-1" />编辑
              </TabsTrigger>
              <TabsTrigger value="preview">
                <Eye className="h-4 w-4 mr-1" />预览
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        <div className="text-sm text-muted-foreground">
          共 {fields.length} 个字段
        </div>
      </div>

      {viewMode === 'preview' ? (
        // 预览模式
        <Card>
          <CardHeader>
            <CardTitle className="text-base">表单预览</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {fields.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">暂无字段</div>
            ) : (
              fields.map((field, index) => (
                <div key={index} className="space-y-2">
                  <Label>
                    {field.label}
                    {field.required && <span className="text-destructive ml-1">*</span>}
                  </Label>
                  {renderPreview(field)}
                </div>
              ))
            )}
          </CardContent>
        </Card>
      ) : (
        // 编辑模式
        <div className="flex gap-4">
          {/* 左侧：字段类型选择 */}
          <div className="w-40 shrink-0 space-y-2">
            <div className="text-sm font-medium mb-2">添加字段</div>
            {Object.entries(FORM_FIELD_TYPES).map(([key, label]) => (
              <Button
                key={key}
                variant="outline"
                size="sm"
                className={`w-full justify-start text-xs ${fieldTypeStyles[key]}`}
                onClick={() => handleAddField(key)}
              >
                <Plus className="h-3 w-3 mr-1" />
                {label}
              </Button>
            ))}
          </div>

          {/* 右侧：字段列表 */}
          <div className="flex-1 space-y-2">
            {fields.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
                从左侧选择字段类型添加
              </div>
            ) : (
              fields.map((field, index) => (
                <Card
                  key={field.id || index}
                  className={`transition-all ${fieldTypeStyles[field.field_type] || ''} ${expandedIndex === index ? 'ring-2 ring-primary' : ''}`}
                >
                  <CardContent className="p-3">
                    {/* 字段头部 */}
                    <div className="flex items-center gap-2">
                      <GripVertical className="h-4 w-4 text-muted-foreground cursor-move shrink-0" />
                      
                      <div
                        className="flex-1 flex items-center gap-2 cursor-pointer"
                        onClick={() => setExpandedIndex(expandedIndex === index ? null : index)}
                      >
                        <span className="font-medium">{field.label || '未命名字段'}</span>
                        <span className="text-xs text-muted-foreground">({FORM_FIELD_TYPES[field.field_type as keyof typeof FORM_FIELD_TYPES]})</span>
                        {field.required && <span className="text-xs text-destructive">必填</span>}
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => handleMoveField(index, 'up')}
                          disabled={index === 0}
                        >
                          <ChevronUp className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => handleMoveField(index, 'down')}
                          disabled={index === fields.length - 1}
                        >
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => handleDuplicateField(index)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => handleRemoveField(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => setExpandedIndex(expandedIndex === index ? null : index)}
                        >
                          {expandedIndex === index ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>

                    {/* 展开的配置面板 */}
                    {expandedIndex === index && (
                      <div className="mt-4 pt-4 border-t space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label className="text-xs">字段名称 (英文)</Label>
                            <Input
                              value={field.name}
                              onChange={(e) => handleFieldChange(index, { name: e.target.value })}
                              placeholder="field_name"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-xs">显示名称</Label>
                            <Input
                              value={field.label}
                              onChange={(e) => handleFieldChange(index, { label: e.target.value })}
                              placeholder="请输入显示名称"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label className="text-xs">字段类型</Label>
                            <Select
                              value={field.field_type}
                              onValueChange={(v) => handleFieldChange(index, { field_type: v })}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {Object.entries(FORM_FIELD_TYPES).map(([key, label]) => (
                                  <SelectItem key={key} value={key}>{label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label className="text-xs">占位提示</Label>
                            <Input
                              value={field.placeholder || ''}
                              onChange={(e) => handleFieldChange(index, { placeholder: e.target.value })}
                              placeholder="请输入..."
                            />
                          </div>
                        </div>

                        {(field.field_type === 'select' || field.field_type === 'multiselect') && (
                          <div className="space-y-2">
                            <Label className="text-xs">选项配置 (每行一个选项)</Label>
                            <Textarea
                              value={field.options || ''}
                              onChange={(e) => handleFieldChange(index, { options: e.target.value })}
                              placeholder="选项1&#10;选项2&#10;选项3"
                              rows={3}
                            />
                          </div>
                        )}

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label className="text-xs">默认值</Label>
                            <Input
                              value={field.default_value || ''}
                              onChange={(e) => handleFieldChange(index, { default_value: e.target.value })}
                              placeholder="默认值"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-xs">显示条件 (JSON)</Label>
                            <Input
                              value={field.show_condition || ''}
                              onChange={(e) => handleFieldChange(index, { show_condition: e.target.value })}
                              placeholder='{"field":"type","value":"A"}'
                            />
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={field.required}
                              onCheckedChange={(v) => handleFieldChange(index, { required: v })}
                            />
                            <Label className="text-xs">必填</Label>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
