import { useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
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
  const { t } = useTranslation()
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
      toast.error(t('ticket.templateManage.nameRequired'))
      return
    }
    try {
      if (editing) {
        await updateFormTemplate(editing.id!, formData as FormTemplate)
        toast.success(t('ticket.updateSuccess'))
      } else {
        await createFormTemplate(formData as FormTemplate)
        toast.success(t('ticket.createSuccess'))
      }
      setDialogOpen(false)
      refresh()
    } catch {
      toast.error(t('ticket.operationFailed'))
    }
  }

  const handleDeleteConfirm = async (template: FormTemplate) => {
    try {
      await deleteFormTemplate(template.id!)
      toast.success(t('ticket.deleteSuccess'))
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
      toast.error(t('ticket.loadFieldsFailed'))
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
        toast.error(t('ticket.templateManage.fieldNameRequired'))
        return
      }
    }
    try {
      await saveFormFields(currentTemplateId, fields)
      toast.success(t('ticket.updateSuccess'))
      setFieldsDialogOpen(false)
    } catch {
      toast.error(t('ticket.operationFailed'))
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">{t('ticket.templateManage.title')}</h1>
        <Button onClick={handleCreate}><Plus className="h-4 w-4 mr-2" />{t('ticket.templateManage.create')}</Button>
      </div>

      <div className="rounded-lg border bg-card">
        <Table className="text-sm">
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">ID</TableHead>
              <TableHead>{t('ticket.templateManage.name')}</TableHead>
              <TableHead>{t('ticket.templateManage.description')}</TableHead>
              <TableHead className="w-24">{t('common.status')}</TableHead>
              <TableHead className="w-40">{t('common.operation')}</TableHead>
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
                      {template.enabled ? t('common.enabled') : t('common.disabled')}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="relative">
                      <TableActions>
                        <TableActionButton variant="settings" icon={<Settings className="h-4 w-4" />} onClick={() => handleEditFields(template)} title={t('ticket.templateManage.configFields')} />
                        <TableActionButton variant="edit" onClick={() => handleEdit(template)} />
                        <TableActionButton
                          variant="delete"
                          ref={(el) => setButtonRef(template.id!, el)}
                          onClick={() => handleDeleteClick(template)}
                        />
                      </TableActions>
                      <DeleteConfirmCard
                        isOpen={deletingId === template.id}
                        message={t('ticket.templateManage.deleteConfirm', { name: template.name })}
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
          <DialogHeader><DialogTitle>{editing ? t('ticket.templateManage.edit') : t('ticket.templateManage.create')}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t('ticket.templateManage.name')} *</Label>
              <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder={t('ticket.templateManage.nameRequired')} />
            </div>
            <div className="space-y-2">
              <Label>{t('ticket.templateManage.description')}</Label>
              <Textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder={t('ticket.templateManage.description')} />
            </div>
            <div className="flex items-center justify-between">
              <Label>{t('common.enabled')}</Label>
              <Switch checked={formData.enabled} onCheckedChange={(v) => setFormData({ ...formData, enabled: v })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>{t('common.cancel')}</Button>
            <Button onClick={handleSave}>{t('common.save')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 字段配置对话框 */}
      <Dialog open={fieldsDialogOpen} onOpenChange={setFieldsDialogOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader><DialogTitle>{t('ticket.templateManage.configFields')}</DialogTitle></DialogHeader>
          <div className="flex-1 overflow-y-auto pr-2">
            <FormFieldEditor fields={fields} onChange={handleFieldsChange} />
          </div>
          <DialogFooter className="border-t pt-4">
            <Button variant="outline" onClick={() => setFieldsDialogOpen(false)}>{t('common.cancel')}</Button>
            <Button onClick={handleSaveFields}>{t('ticket.templateManage.saveFields')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default TemplateManage
