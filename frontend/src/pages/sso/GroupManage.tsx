import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Plus } from 'lucide-react'
import { DeleteConfirmCard } from '@/components/DeleteConfirmCard'
import { useDeleteConfirm } from '@/hooks/useDeleteConfirm'
import {
  Button, Input, Card, CardContent, CardHeader, CardTitle,
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableActions, TableActionButton,
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
  Label, Switch,
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui-tw'
import request from '@/api/request'

interface Tenant {
  id: number
  name: string
}

interface Group {
  id: number
  tenant_id: number
  name: string
  description: string
  status: number
  created_at: string
  tenant?: Tenant
}

const GroupManage = () => {
  const { t } = useTranslation()
  const [groups, setGroups] = useState<Group[]>([])
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [tenantFilter, setTenantFilter] = useState<string>('all')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingGroup, setEditingGroup] = useState<Group | null>(null)
  const [form, setForm] = useState({ tenant_id: 0, name: '', description: '', status: 1 })
  const { deletingId, handleDeleteClick, handleDeleteCancel, setButtonRef, getButtonRef, resetDeleting } = useDeleteConfirm<Group>()

  const fetchGroups = async () => {
    try {
      const tenantId = tenantFilter === 'all' ? undefined : Number(tenantFilter)
      const res: any = await request.get('/sso/groups', { params: { page: 1, page_size: 10, tenant_id: tenantId } })
      setGroups(res.list || [])
    } catch (error) {
      console.error(error)
    }
  }

  const fetchTenants = async () => {
    try {
      const res: any = await request.get('/sso/tenants', { params: { page_size: 100 } })
      setTenants(res.list || [])
    } catch (error) {
      console.error(error)
    }
  }

  useEffect(() => {
    fetchGroups()
    fetchTenants()
  }, [tenantFilter])

  const handleCreate = () => {
    setEditingGroup(null)
    setForm({ tenant_id: tenants[0]?.id || 0, name: '', description: '', status: 1 })
    setDialogOpen(true)
  }

  const handleEdit = (group: Group) => {
    setEditingGroup(group)
    setForm({ tenant_id: group.tenant_id, name: group.name, description: group.description, status: group.status })
    setDialogOpen(true)
  }

  const handleDeleteConfirm = async (group: Group) => {
    try {
      await request.delete(`/sso/groups/${group.id}`)
      toast.success(t('sso.common.deleteSuccess'))
      resetDeleting()
      fetchGroups()
    } catch (error: any) {
      toast.error(error.message || t('sso.common.operationFailed'))
      resetDeleting()
    }
  }

  const handleSubmit = async () => {
    try {
      if (editingGroup) {
        await request.put(`/sso/groups/${editingGroup.id}`, form)
        toast.success(t('sso.common.updateSuccess'))
      } else {
        await request.post('/sso/groups', form)
        toast.success(t('sso.common.createSuccess'))
      }
      setDialogOpen(false)
      fetchGroups()
    } catch (error: any) {
      toast.error(error.message || t('sso.common.operationFailed'))
    }
  }

  const handleStatusChange = async (group: Group, checked: boolean) => {
    try {
      await request.put(`/sso/groups/${group.id}`, { ...group, status: checked ? 1 : 0 })
      toast.success(t('sso.common.statusUpdateSuccess'))
      fetchGroups()
    } catch (error: any) {
      toast.error(error.message || t('sso.common.operationFailed'))
    }
  }

  return (
    <div className="p-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{t('sso.group.title')}</CardTitle>
          <div className="flex gap-2">
            <Select value={tenantFilter} onValueChange={setTenantFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder={t('sso.group.selectTenant')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('sso.group.allTenants')}</SelectItem>
                {tenants.map(t => <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button onClick={handleCreate}>
              <Plus className="w-4 h-4 mr-2" />
              {t('sso.group.create')}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('sso.common.id')}</TableHead>
                <TableHead>{t('sso.group.tenant')}</TableHead>
                <TableHead>{t('sso.group.name')}</TableHead>
                <TableHead>{t('sso.group.description')}</TableHead>
                <TableHead>{t('sso.common.status')}</TableHead>
                <TableHead>{t('sso.common.operation')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {groups.map((group) => (
                <TableRow key={group.id}>
                  <TableCell>{group.id}</TableCell>
                  <TableCell>{tenants.find(t => t.id === group.tenant_id)?.name || '-'}</TableCell>
                  <TableCell>{group.name}</TableCell>
                  <TableCell>{group.description || '-'}</TableCell>
                  <TableCell>
                    <Switch
                      checked={group.status === 1}
                      onCheckedChange={(checked) => handleStatusChange(group, checked)}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="relative">
                      <TableActions>
                        <TableActionButton variant="edit" onClick={() => handleEdit(group)} />
                        <TableActionButton
                          variant="delete"
                          ref={(el) => setButtonRef(group.id, el)}
                          onClick={() => handleDeleteClick(group)}
                        />
                      </TableActions>
                      <DeleteConfirmCard
                        isOpen={deletingId === group.id}
                        message={t('sso.group.deleteConfirm')}
                        onConfirm={() => handleDeleteConfirm(group)}
                        onCancel={handleDeleteCancel}
                        buttonRef={getButtonRef(group.id)}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingGroup ? t('sso.group.edit') : t('sso.group.create')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>{t('sso.group.tenant')}</Label>
              <Select
                value={String(form.tenant_id)}
                onValueChange={(value) => setForm({ ...form, tenant_id: Number(value) })}
                disabled={!!editingGroup}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('sso.group.selectTenant')} />
                </SelectTrigger>
                <SelectContent>
                  {tenants.map(t => <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t('sso.group.name')}</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder={t('sso.group.namePlaceholder')} />
            </div>
            <div className="space-y-2">
              <Label>{t('sso.group.description')}</Label>
              <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder={t('sso.group.descriptionPlaceholder')} />
            </div>
            <div className="flex items-center justify-between">
              <Label>{t('sso.common.status')}</Label>
              <Switch
                checked={form.status === 1}
                onCheckedChange={(checked) => setForm({ ...form, status: checked ? 1 : 0 })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>{t('common.cancel')}</Button>
            <Button onClick={handleSubmit}>{t('common.confirm')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default GroupManage
