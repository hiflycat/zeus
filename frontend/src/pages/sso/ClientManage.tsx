import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Plus, Copy, Eye, EyeOff } from 'lucide-react'
import { DeleteConfirmCard } from '@/components/DeleteConfirmCard'
import { useDeleteConfirm } from '@/hooks/useDeleteConfirm'
import {
  Button, Input, Card, CardContent, CardHeader, CardTitle,
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableActions, TableActionButton, TableEmpty,
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
  Label, Badge, Switch,
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui-tw'
import request from '@/api/request'

interface Tenant {
  id: number
  name: string
}

interface OIDCClient {
  id: number
  tenant_id: number
  client_id: string
  client_secret: string
  name: string
  description: string
  root_url: string
  allowed_scopes: string
  grant_types: string
  access_token_ttl: number
  refresh_token_ttl: number
  status: number
  created_at: string
}

const ClientManage = () => {
  const { t } = useTranslation()
  const [clients, setClients] = useState<OIDCClient[]>([])
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [tenantFilter, setTenantFilter] = useState<string>('all')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingClient, setEditingClient] = useState<OIDCClient | null>(null)
  const [showSecret, setShowSecret] = useState<Record<number, boolean>>({})
  const { deletingId, handleDeleteClick, handleDeleteCancel, setButtonRef, getButtonRef, resetDeleting } = useDeleteConfirm<OIDCClient>()
  const [form, setForm] = useState({
    tenant_id: 0,
    client_id: '',
    client_secret: '',
    name: '',
    description: '',
    root_url: '',
    allowed_scopes: 'openid profile email',
    grant_types: 'authorization_code',
    access_token_ttl: 3600,
    refresh_token_ttl: 86400,
    status: 1
  })

  const fetchClients = async () => {
    try {
      const tenantId = tenantFilter === 'all' ? undefined : Number(tenantFilter)
      const res: any = await request.get('/sso/clients', { params: { page: 1, page_size: 10, tenant_id: tenantId } })
      setClients(res.list || [])
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
    fetchClients()
    fetchTenants()
  }, [tenantFilter])

  const generateClientId = () => {
    return 'client_' + Math.random().toString(36).substring(2, 15)
  }

  const generateClientSecret = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0
      return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16)
    })
  }

  const handleCreate = () => {
    setEditingClient(null)
    setForm({
      tenant_id: tenants[0]?.id || 0,
      client_id: generateClientId(),
      client_secret: generateClientSecret(),
      name: '',
      description: '',
      root_url: '',
      allowed_scopes: 'openid profile email',
      grant_types: 'authorization_code',
      access_token_ttl: 3600,
      refresh_token_ttl: 86400,
      status: 1
    })
    setDialogOpen(true)
  }

  const handleEdit = (client: OIDCClient) => {
    setEditingClient(client)
    setForm({
      tenant_id: client.tenant_id,
      client_id: client.client_id,
      client_secret: client.client_secret,
      name: client.name,
      description: client.description,
      root_url: client.root_url || '',
      allowed_scopes: client.allowed_scopes,
      grant_types: client.grant_types,
      access_token_ttl: client.access_token_ttl,
      refresh_token_ttl: client.refresh_token_ttl,
      status: client.status
    })
    setDialogOpen(true)
  }

  const handleDeleteConfirm = async (client: OIDCClient) => {
    try {
      await request.delete(`/sso/clients/${client.id}`)
      toast.success(t('sso.common.deleteSuccess'))
      resetDeleting()
      fetchClients()
    } catch (error: any) {
      toast.error(error.message || t('sso.common.operationFailed'))
      resetDeleting()
    }
  }

  const handleSubmit = async () => {
    try {
      if (editingClient) {
        await request.put(`/sso/clients/${editingClient.id}`, form)
        toast.success(t('sso.common.updateSuccess'))
      } else {
        await request.post('/sso/clients', form)
        toast.success(t('sso.common.createSuccess'))
      }
      setDialogOpen(false)
      fetchClients()
    } catch (error: any) {
      toast.error(error.message || t('sso.common.operationFailed'))
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success(t('sso.client.copied'))
  }

  const handleStatusChange = async (client: OIDCClient, checked: boolean) => {
    try {
      await request.put(`/sso/clients/${client.id}`, { ...client, status: checked ? 1 : 0 })
      toast.success(t('sso.common.statusUpdateSuccess'))
      fetchClients()
    } catch (error: any) {
      toast.error(error.message || t('sso.common.operationFailed'))
    }
  }

  return (
    <div className="p-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{t('sso.client.title')}</CardTitle>
          <div className="flex gap-2">
            <Select value={tenantFilter} onValueChange={setTenantFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder={t('sso.client.selectTenant')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('sso.client.allTenants')}</SelectItem>
                {tenants.map(tenant => <SelectItem key={tenant.id} value={String(tenant.id)}>{tenant.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button onClick={handleCreate}>
              <Plus className="w-4 h-4 mr-2" />
              {t('sso.client.create')}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('sso.client.tenant')}</TableHead>
                <TableHead>{t('sso.client.name')}</TableHead>
                <TableHead>{t('sso.client.clientId')}</TableHead>
                <TableHead>{t('sso.client.clientSecret')}</TableHead>
                <TableHead>{t('sso.client.grantTypes')}</TableHead>
                <TableHead>{t('sso.common.status')}</TableHead>
                <TableHead>{t('sso.common.operation')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clients.length === 0 ? (
                <TableEmpty colSpan={7} message={t('common.noData')} />
              ) : (
                clients.map((client) => (
                <TableRow key={client.id}>
                  <TableCell>{tenants.find(tenant => tenant.id === client.tenant_id)?.name || '-'}</TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{client.name}</div>
                      <div className="text-sm text-muted-foreground">{client.description}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <code className="text-sm bg-muted px-2 py-1 rounded">{client.client_id}</code>
                      <Button variant="ghost" size="sm" onClick={() => copyToClipboard(client.client_id)}>
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <code className="text-sm bg-muted px-2 py-1 rounded">
                        {showSecret[client.id] ? client.client_secret : '••••••••'}
                      </code>
                      <Button variant="ghost" size="sm" onClick={() => setShowSecret({ ...showSecret, [client.id]: !showSecret[client.id] })}>
                        {showSecret[client.id] ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => copyToClipboard(client.client_secret)}>
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{client.grant_types}</Badge>
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={client.status === 1}
                      onCheckedChange={(checked) => handleStatusChange(client, checked)}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="relative">
                      <TableActions>
                        <TableActionButton variant="edit" onClick={() => handleEdit(client)} />
                        <TableActionButton
                          variant="delete"
                          ref={(el) => setButtonRef(client.id, el)}
                          onClick={() => handleDeleteClick(client)}
                        />
                      </TableActions>
                      <DeleteConfirmCard
                        isOpen={deletingId === client.id}
                        message={t('sso.client.deleteConfirm')}
                        onConfirm={() => handleDeleteConfirm(client)}
                        onCancel={handleDeleteCancel}
                        buttonRef={getButtonRef(client.id)}
                      />
                    </div>
                  </TableCell>
                </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingClient ? t('sso.client.edit') : t('sso.client.create')}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label>{t('sso.client.tenant')}</Label>
              <Select
                value={String(form.tenant_id)}
                onValueChange={(value) => setForm({ ...form, tenant_id: Number(value) })}
                disabled={!!editingClient}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('sso.client.selectTenant')} />
                </SelectTrigger>
                <SelectContent>
                  {tenants.map(tenant => <SelectItem key={tenant.id} value={String(tenant.id)}>{tenant.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t('sso.client.name')}</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>{t('sso.client.clientId')}</Label>
              <Input value={form.client_id} onChange={(e) => setForm({ ...form, client_id: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>{t('sso.client.clientSecret')}</Label>
              <Input value={form.client_secret} onChange={(e) => setForm({ ...form, client_secret: e.target.value })} />
            </div>
            <div className="col-span-2 space-y-2">
              <Label>{t('sso.client.rootUrl')}</Label>
              <Input
                value={form.root_url}
                onChange={(e) => setForm({ ...form, root_url: e.target.value })}
                placeholder="https://app.example.com"
              />
            </div>
            <div className="space-y-2">
              <Label>{t('sso.client.allowedScopes')}</Label>
              <Input value={form.allowed_scopes} onChange={(e) => setForm({ ...form, allowed_scopes: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>{t('sso.client.grantTypes')}</Label>
              <Input value={form.grant_types} onChange={(e) => setForm({ ...form, grant_types: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>{t('sso.client.accessTokenTtl')}</Label>
              <Input type="number" value={form.access_token_ttl} onChange={(e) => setForm({ ...form, access_token_ttl: Number(e.target.value) })} />
            </div>
            <div className="space-y-2">
              <Label>{t('sso.client.refreshTokenTtl')}</Label>
              <Input type="number" value={form.refresh_token_ttl} onChange={(e) => setForm({ ...form, refresh_token_ttl: Number(e.target.value) })} />
            </div>
            <div className="col-span-2 space-y-2">
              <Label>{t('sso.client.description')}</Label>
              <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="col-span-2 flex items-center justify-between">
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

export default ClientManage
