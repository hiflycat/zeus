import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, Search } from 'lucide-react'
import {
  Button, Input, Card, CardContent, CardHeader, CardTitle,
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
  Label, Switch
} from '@/components/ui-tw'
import request from '@/api/request'

interface Tenant {
  id: number
  name: string
  domain: string
  status: number
  created_at: string
}

const TenantManage = () => {
  const { t } = useTranslation()
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [search, setSearch] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null)
  const [form, setForm] = useState({ name: '', domain: '', status: 1 })

  const fetchTenants = async () => {
    try {
      const res: any = await request.get('/sso/tenants', { params: { page: 1, page_size: 10, name: search } })
      setTenants(res.list || [])
    } catch (error) {
      console.error(error)
    }
  }

  useEffect(() => {
    fetchTenants()
  }, [search])

  const handleCreate = () => {
    setEditingTenant(null)
    setForm({ name: '', domain: '', status: 1 })
    setDialogOpen(true)
  }

  const handleEdit = (tenant: Tenant) => {
    setEditingTenant(tenant)
    setForm({ name: tenant.name, domain: tenant.domain, status: tenant.status })
    setDialogOpen(true)
  }

  const handleDelete = async (id: number) => {
    if (!confirm(t('sso.tenant.deleteConfirm'))) return
    try {
      await request.delete(`/sso/tenants/${id}`)
      toast.success(t('sso.common.deleteSuccess'))
      fetchTenants()
    } catch (error: any) {
      toast.error(error.message || t('sso.common.operationFailed'))
    }
  }

  const handleSubmit = async () => {
    try {
      if (editingTenant) {
        await request.put(`/sso/tenants/${editingTenant.id}`, form)
        toast.success(t('sso.common.updateSuccess'))
      } else {
        await request.post('/sso/tenants', form)
        toast.success(t('sso.common.createSuccess'))
      }
      setDialogOpen(false)
      fetchTenants()
    } catch (error: any) {
      toast.error(error.message || t('sso.common.operationFailed'))
    }
  }

  const handleStatusChange = async (tenant: Tenant, checked: boolean) => {
    try {
      await request.put(`/sso/tenants/${tenant.id}`, { ...tenant, status: checked ? 1 : 0 })
      toast.success(t('sso.common.statusUpdateSuccess'))
      fetchTenants()
    } catch (error: any) {
      toast.error(error.message || t('sso.common.operationFailed'))
    }
  }

  return (
    <div className="p-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{t('sso.tenant.title')}</CardTitle>
          <div className="flex gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('sso.tenant.searchPlaceholder')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 w-64"
              />
            </div>
            <Button onClick={handleCreate}>
              <Plus className="w-4 h-4 mr-2" />
              {t('sso.tenant.create')}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('sso.common.id')}</TableHead>
                <TableHead>{t('sso.tenant.name')}</TableHead>
                <TableHead>{t('sso.tenant.domain')}</TableHead>
                <TableHead>{t('sso.common.status')}</TableHead>
                <TableHead>{t('sso.common.operation')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tenants.map((tenant) => (
                <TableRow key={tenant.id}>
                  <TableCell>{tenant.id}</TableCell>
                  <TableCell>{tenant.name}</TableCell>
                  <TableCell>{tenant.domain || '-'}</TableCell>
                  <TableCell>
                    <Switch
                      checked={tenant.status === 1}
                      onCheckedChange={(checked) => handleStatusChange(tenant, checked)}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(tenant)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(tenant.id)}>
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
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
            <DialogTitle>{editingTenant ? t('sso.tenant.edit') : t('sso.tenant.create')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>{t('sso.tenant.name')}</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder={t('sso.tenant.namePlaceholder')}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('sso.tenant.domain')}</Label>
              <Input
                value={form.domain}
                onChange={(e) => setForm({ ...form, domain: e.target.value })}
                placeholder={t('sso.tenant.domainPlaceholder')}
              />
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

export default TenantManage
