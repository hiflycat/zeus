import { useState, useCallback } from 'react'
import { toast } from 'sonner'
import { Plus, Settings } from 'lucide-react'
import { DeleteConfirmCard } from '@/components/DeleteConfirmCard'
import { useDeleteConfirm } from '@/hooks/useDeleteConfirm'
import { usePagination } from '@/hooks/usePagination'
import {
  getFormTemplates,
  createFormTemplate,
  updateFormTemplate,
  deleteFormTemplate,
  getFormFields,
  saveFormFields,
  FormTemplate,
  FormField,
} from '@/api/ticket'
import FormFieldEditor from '@/components/ticket/FormFieldEditor'
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

const TemplateManage = () => {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [fieldsDialogOpen, setFieldsDialogOpen] = useState(false)
  const [editing, setEditing] = useState<FormTemplate | null>(null)
  const [formData, setFormData] = useState({ name: '', description: '', enabled: true })
  const [fields, setFields] = useState<FormField[]>([])
  const [currentTemplateId, setCurrentTemplateId] = useState<number | null>(null)
  const { deletingId, handleDeleteClick, handleDeleteCancel, setButtonRef, getButtonRef, resetDeleting } = useDeleteConfirm<FormTemplate>()

  const { data: templates, loading, total, page, pageSize, handlePageChange, refresh } = usePagination<FormTemplate>({
    fetchFn: getFormTemplates,
    defaultPageSize: 10,
  })

  const handleCreate = () => {
    setEditing(null)
    setFormData({ name: '', description: '', enabled: true })
    setDialogOpen(true)
  }

  const handleEdit = (template: FormTemplate) => {
    setEditing(template)
    setFormData({
      name: template.name,
      description: template.description || '',
      enabled: template.enabled,
    })
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!formData.name) {
      toast.error('请输入模板名称')
      return
    }
    try {
      if (editing) {
        await updateFormTemplate(editing.id!, formData as FormTemplate)
        toast.success('更新成功')
      } else {
        await createFormTemplate(formData as FormTemplate)
        toast.success('创建成功')
      }
      setDialogOpen(false)
      refresh()
    } catch {
      toast.error('操作失败')
    }
  }

  const handleDeleteConfirm = async (template: FormTemplate) => {
    try {
      await deleteFormTemplate(template.id!)
      toast.success('删除成功')
      resetDeleting()
      refresh()
    } catch {
      resetDeleting()
    }
  }

  const handleEditFields = async (template: FormTemplate) => {
    setCurrentTemplateId(template.id!)
    try {
      const data = await getFormFields(template.id!)
      setFields(data)
      setFieldsDialogOpen(true)
    } catch {
      toast.error('加载字段失败')
    }
  }

  const handleFieldsChange = useCallback((newFields: FormField[]) => {
    setFields(newFields)
  }, [])

  const handleSaveFields = async () => {
    if (!currentTemplateId) return
    // 验证字段
    for (const field of fields) {
      if (!field.name || !field.label) {
        toast.error('字段名称和显示名称不能为空')
        return
      }
    }
    try {
      await saveFormFields(currentTemplateId, fields)
      toast.success('保存成功')
      setFieldsDialogOpen(false)
    } catch {
      toast.error('保存失败')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">表单模板管理</h1>
        <Button onClick={handleCreate}><Plus className="h-4 w-4 mr-2" />新建模板</Button>
      </div>

      <div className="rounded-lg border bg-card">
        <Table className="text-sm">
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">ID</TableHead>
              <TableHead>名称</TableHead>
              <TableHead>描述</TableHead>
              <TableHead className="w-24">状态</TableHead>
              <TableHead className="w-40">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableEmpty colSpan={5} loading />
            ) : templates.length === 0 ? (
              <TableEmpty colSpan={5} />
            ) : (
              templates.map((template) => (
                <TableRow key={template.id}>
                  <TableCell className="font-medium">{template.id}</TableCell>
                  <TableCell>{template.name}</TableCell>
                  <TableCell className="text-muted-foreground">{template.description || '-'}</TableCell>
                  <TableCell>
                    <Badge variant={template.enabled ? 'default' : 'secondary'}>
                      {template.enabled ? '启用' : '禁用'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="relative">
                      <TableActions>
                        <TableActionButton variant="settings" icon={<Settings className="h-4 w-4" />} onClick={() => handleEditFields(template)} title="配置字段" />
                        <TableActionButton variant="edit" onClick={() => handleEdit(template)} />
                        <TableActionButton
                          variant="delete"
                          ref={(el) => setButtonRef(template.id!, el)}
                          onClick={() => handleDeleteClick(template)}
                        />
                      </TableActions>
                      <DeleteConfirmCard
                        isOpen={deletingId === template.id}
                        message={`确定删除模板 "${template.name}" 吗？`}
                        onConfirm={() => handleDeleteConfirm(template)}
                        onCancel={handleDeleteCancel}
                        buttonRef={getButtonRef(template.id!)}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        <Pagination current={page} total={total} pageSize={pageSize} onChange={handlePageChange} />
      </div>

      {/* 新建/编辑模板对话框 */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>{editing ? '编辑模板' : '新建模板'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>名称 *</Label>
              <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="请输入模板名称" />
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

      {/* 字段配置对话框 */}
      <Dialog open={fieldsDialogOpen} onOpenChange={setFieldsDialogOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader><DialogTitle>配置表单字段</DialogTitle></DialogHeader>
          <div className="flex-1 overflow-y-auto pr-2">
            <FormFieldEditor fields={fields} onChange={handleFieldsChange} />
          </div>
          <DialogFooter className="border-t pt-4">
            <Button variant="outline" onClick={() => setFieldsDialogOpen(false)}>取消</Button>
            <Button onClick={handleSaveFields}>保存字段</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default TemplateManage
