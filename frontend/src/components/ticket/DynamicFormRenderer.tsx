import { useEffect, useState } from 'react'
import { FormField } from '@/api/ticket'
import { getUserList, User } from '@/api/user'
import {
  Input,
  Textarea,
  Label,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Checkbox,
} from '@/components/ui-tw'
import { Upload, X, FileIcon, Calendar } from 'lucide-react'

interface DynamicFormRendererProps {
  fields: FormField[]
  values: Record<string, any>
  onChange: (values: Record<string, any>) => void
  errors?: Record<string, string>
}

export default function DynamicFormRenderer({
  fields,
  values,
  onChange,
  errors = {},
}: DynamicFormRendererProps) {
  const [users, setUsers] = useState<User[]>([])

  // 加载用户列表（如果有用户选择字段）
  useEffect(() => {
    const hasUserField = fields.some((f) => f.field_type === 'user')
    if (hasUserField) {
      getUserList({ page: 1, page_size: 1000 }).then((res) => {
        setUsers(res.list || [])
      })
    }
  }, [fields])

  const handleChange = (fieldName: string, value: any) => {
    onChange({ ...values, [fieldName]: value })
  }

  // 检查字段是否应该显示（基于显示条件）
  const shouldShowField = (field: FormField): boolean => {
    if (!field.show_condition) return true
    try {
      const condition = JSON.parse(field.show_condition)
      const { field: condField, value: condValue, operator = '==' } = condition
      const currentValue = values[condField]
      
      switch (operator) {
        case '==':
        case '=':
          return currentValue === condValue
        case '!=':
          return currentValue !== condValue
        case 'in':
          return Array.isArray(condValue) && condValue.includes(currentValue)
        case 'notIn':
          return Array.isArray(condValue) && !condValue.includes(currentValue)
        default:
          return true
      }
    } catch {
      return true
    }
  }

  // 解析选项（确保返回非空字符串）
  const parseOptions = (optionsStr?: string): string[] => {
    if (!optionsStr) return []
    return optionsStr.split('\n').map((o) => o.trim()).filter((o) => o !== '')
  }

  const renderField = (field: FormField) => {
    if (!shouldShowField(field)) return null

    const value = values[field.name] ?? field.default_value ?? ''
    const error = errors[field.name]
    const commonProps = {
      id: field.name,
      'aria-invalid': !!error,
    }

    switch (field.field_type) {
      case 'text':
        return (
          <Input
            {...commonProps}
            value={value}
            onChange={(e) => handleChange(field.name, e.target.value)}
            placeholder={field.placeholder || `请输入${field.label}`}
            className={error ? 'border-destructive' : ''}
          />
        )

      case 'textarea':
        return (
          <Textarea
            {...commonProps}
            value={value}
            onChange={(e) => handleChange(field.name, e.target.value)}
            placeholder={field.placeholder || `请输入${field.label}`}
            rows={4}
            className={error ? 'border-destructive' : ''}
          />
        )

      case 'number':
        return (
          <Input
            {...commonProps}
            type="number"
            value={value}
            onChange={(e) => handleChange(field.name, e.target.value)}
            placeholder={field.placeholder || '0'}
            className={error ? 'border-destructive' : ''}
          />
        )

      case 'money':
        return (
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">¥</span>
            <Input
              {...commonProps}
              type="number"
              step="0.01"
              value={value}
              onChange={(e) => handleChange(field.name, e.target.value)}
              placeholder="0.00"
              className={`pl-7 ${error ? 'border-destructive' : ''}`}
            />
          </div>
        )

      case 'date':
        return (
          <div className="relative">
            <Input
              {...commonProps}
              type="date"
              value={value}
              onChange={(e) => handleChange(field.name, e.target.value)}
              className={error ? 'border-destructive' : ''}
            />
            <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          </div>
        )

      case 'datetime':
        return (
          <Input
            {...commonProps}
            type="datetime-local"
            value={value}
            onChange={(e) => handleChange(field.name, e.target.value)}
            className={error ? 'border-destructive' : ''}
          />
        )

      case 'select': {
        const options = parseOptions(field.options)
        const hasValidValue = value && options.includes(value)
        return (
          <Select 
            value={hasValidValue ? value : 'none'} 
            onValueChange={(v) => handleChange(field.name, v === 'none' ? '' : v)}
          >
            <SelectTrigger className={error ? 'border-destructive' : ''}>
              <SelectValue placeholder={field.placeholder || '请选择'} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">请选择</SelectItem>
              {options.map((opt) => (
                <SelectItem key={opt} value={opt}>{opt}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )
      }

      case 'multiselect': {
        const options = parseOptions(field.options)
        const selectedValues: string[] = Array.isArray(value) ? value : value ? [value] : []
        
        return (
          <div className={`space-y-2 p-3 border rounded-lg ${error ? 'border-destructive' : ''}`}>
            {options.map((opt) => (
              <div key={opt} className="flex items-center gap-2">
                <Checkbox
                  id={`${field.name}-${opt}`}
                  checked={selectedValues.includes(opt)}
                  onCheckedChange={(checked) => {
                    const newValues = checked
                      ? [...selectedValues, opt]
                      : selectedValues.filter((v) => v !== opt)
                    handleChange(field.name, newValues)
                  }}
                />
                <Label htmlFor={`${field.name}-${opt}`} className="font-normal cursor-pointer">
                  {opt}
                </Label>
              </div>
            ))}
          </div>
        )
      }

      case 'user':
        return (
          <Select 
            value={value?.toString() || 'none'} 
            onValueChange={(v) => handleChange(field.name, v === 'none' ? '' : v)}
          >
            <SelectTrigger className={error ? 'border-destructive' : ''}>
              <SelectValue placeholder="选择用户" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">请选择</SelectItem>
              {users.filter(u => u.id != null && u.id !== 0).map((user) => (
                <SelectItem key={user.id} value={String(user.id)}>
                  {user.username} {user.email ? `(${user.email})` : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )

      case 'attachment': {
        const files: File[] = Array.isArray(value) ? value : []
        
        return (
          <div className="space-y-2">
            <div
              className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:bg-muted/50 transition-colors ${error ? 'border-destructive' : ''}`}
              onClick={() => document.getElementById(`file-${field.name}`)?.click()}
            >
              <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">点击或拖拽上传文件</p>
              <input
                id={`file-${field.name}`}
                type="file"
                multiple
                className="hidden"
                onChange={(e) => {
                  const newFiles = Array.from(e.target.files || [])
                  handleChange(field.name, [...files, ...newFiles])
                }}
              />
            </div>
            {files.length > 0 && (
              <div className="space-y-1">
                {files.map((file, idx) => (
                  <div key={idx} className="flex items-center gap-2 p-2 bg-muted/50 rounded">
                    <FileIcon className="h-4 w-4 text-muted-foreground" />
                    <span className="flex-1 text-sm truncate">{file.name}</span>
                    <button
                      type="button"
                      className="p-1 hover:bg-destructive/10 rounded"
                      onClick={() => {
                        const newFiles = files.filter((_, i) => i !== idx)
                        handleChange(field.name, newFiles)
                      }}
                    >
                      <X className="h-4 w-4 text-destructive" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      }

      default:
        return (
          <Input
            {...commonProps}
            value={value}
            onChange={(e) => handleChange(field.name, e.target.value)}
            placeholder={field.placeholder}
            className={error ? 'border-destructive' : ''}
          />
        )
    }
  }

  // 按 sort_order 排序
  const sortedFields = [...fields].sort((a, b) => a.sort_order - b.sort_order)

  return (
    <div className="space-y-4">
      {sortedFields.map((field) => {
        if (!shouldShowField(field)) return null
        
        return (
          <div key={field.id || field.name} className="space-y-2">
            <Label htmlFor={field.name}>
              {field.label}
              {field.required && <span className="text-destructive ml-1">*</span>}
            </Label>
            {renderField(field)}
            {errors[field.name] && (
              <p className="text-xs text-destructive">{errors[field.name]}</p>
            )}
          </div>
        )
      })}
    </div>
  )
}
