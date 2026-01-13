import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, Search, Key, Users, ChevronDown } from 'lucide-react'
import {
  Button, Input, Card, CardContent, CardHeader, CardTitle,
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
  Label, Badge, Switch,
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuCheckboxItem
} from '@/components/ui-tw'
import request from '@/api/request'

interface Tenant {
  id: number
  name: string
}

interface Group {
  id: number
  name: string
  status: number
  tenant_id: number
}

interface SSOUser {
  id: number
  tenant_id: number
  username: string
  email: string
  display_name: string
  phone: string
  status: number
  created_at: string
  tenant?: Tenant
  groups?: Group[]
}

const UserManage = () => {
  const { t } = useTranslation()
  const [users, setUsers] = useState<SSOUser[]>([])
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [groups, setGroups] = useState<Group[]>([])
  const [search, setSearch] = useState('')
  const [tenantFilter, setTenantFilter] = useState<string>('all')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false)
  const [groupDialogOpen, setGroupDialogOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<SSOUser | null>(null)
  const [form, setForm] = useState({ tenant_id: 0, username: '', password: '', email: '', display_name: '', phone: '', status: 1 })
  const [newPassword, setNewPassword] = useState('')
  const [selectedGroups, setSelectedGroups] = useState<number[]>([])

  const fetchUsers = async () => {
    try {
      const tenantId = tenantFilter === 'all' ? undefined : Number(tenantFilter)
      const res: any = await request.get('/sso/users', { params: { page: 1, page_size: 10, username: search, tenant_id: tenantId } })
      setUsers(res.list || [])
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

  const fetchGroups = async () => {
    try {
      const res: any = await request.get('/sso/groups', { params: { page_size: 1000 } })
      setGroups(res.list || [])
    } catch (error) {
      console.error(error)
    }
  }

  useEffect(() => {
    fetchUsers()
    fetchTenants()
    fetchGroups()
  }, [search, tenantFilter])

  const handleCreate = () => {
    setEditingUser(null)
    setForm({ tenant_id: 0, username: '', password: '', email: '', display_name: '', phone: '', status: 1 })
    setSelectedGroups([])
    setDialogOpen(true)
  }

  const handleEdit = (user: SSOUser) => {
    setEditingUser(user)
    setForm({ tenant_id: user.tenant_id, username: user.username, password: '', email: user.email, display_name: user.display_name, phone: user.phone, status: user.status })
    setSelectedGroups(user.groups?.map(g => g.id) || [])
    setDialogOpen(true)
  }

  const handleDelete = async (id: number) => {
    if (!confirm(t('sso.user.deleteConfirm'))) return
    try {
      await request.delete(`/sso/users/${id}`)
      toast.success(t('sso.common.deleteSuccess'))
      fetchUsers()
    } catch (error: any) {
      toast.error(error.message || t('sso.common.operationFailed'))
    }
  }

  const handleSubmit = async () => {
    if (!editingUser && form.password.length < 6) {
      toast.error(t('sso.user.passwordMinLength'))
      return
    }
    if (!editingUser && selectedGroups.length === 0) {
      toast.error(t('sso.user.groupsRequired'))
      return
    }
    const tenantId = editingUser ? form.tenant_id : groups.find(g => g.id === selectedGroups[0])?.tenant_id || 0
    try {
      if (editingUser) {
        await request.put(`/sso/users/${editingUser.id}`, { ...form, group_ids: selectedGroups })
        toast.success(t('sso.common.updateSuccess'))
      } else {
        await request.post('/sso/users', { ...form, tenant_id: tenantId, group_ids: selectedGroups })
        toast.success(t('sso.common.createSuccess'))
      }
      setDialogOpen(false)
      fetchUsers()
    } catch (error: any) {
      toast.error(error.message || t('sso.common.operationFailed'))
    }
  }

  const handleResetPassword = async () => {
    if (!editingUser || !newPassword) return
    if (newPassword.length < 6) {
      toast.error(t('sso.user.passwordMinLength'))
      return
    }
    try {
      await request.post(`/sso/users/${editingUser.id}/reset-password`, { password: newPassword })
      toast.success(t('sso.common.resetSuccess'))
      setPasswordDialogOpen(false)
      setNewPassword('')
    } catch (error: any) {
      toast.error(error.message || t('sso.common.operationFailed'))
    }
  }

  const openPasswordDialog = (user: SSOUser) => {
    setEditingUser(user)
    setNewPassword('')
    setPasswordDialogOpen(true)
  }

  const openGroupDialog = (user: SSOUser) => {
    setEditingUser(user)
    setSelectedGroups(user.groups?.map(g => g.id) || [])
    setGroupDialogOpen(true)
  }

  const handleAssignGroups = async () => {
    if (!editingUser) return
    try {
      await request.post(`/sso/users/${editingUser.id}/groups`, { group_ids: selectedGroups })
      toast.success(t('sso.common.assignSuccess'))
      setGroupDialogOpen(false)
      fetchUsers()
    } catch (error: any) {
      toast.error(error.message || t('sso.common.operationFailed'))
    }
  }

  const handleStatusChange = async (user: SSOUser, checked: boolean) => {
    try {
      await request.put(`/sso/users/${user.id}`, { ...user, status: checked ? 1 : 0, group_ids: user.groups?.map(g => g.id) || [] })
      toast.success(t('sso.common.statusUpdateSuccess'))
      fetchUsers()
    } catch (error: any) {
      toast.error(error.message || t('sso.common.operationFailed'))
    }
  }

  return (
    <div className="p-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{t('sso.user.title')}</CardTitle>
          <div className="flex gap-2">
            <Select value={tenantFilter} onValueChange={setTenantFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder={t('sso.group.selectTenant')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('sso.user.allTenants')}</SelectItem>
                {tenants.map(t => <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('sso.user.searchPlaceholder')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 w-48"
              />
            </div>
            <Button onClick={handleCreate}>
              <Plus className="w-4 h-4 mr-2" />
              {t('sso.user.create')}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('sso.common.id')}</TableHead>
                <TableHead>{t('sso.user.tenant')}</TableHead>
                <TableHead>{t('sso.user.username')}</TableHead>
                <TableHead>{t('sso.user.displayName')}</TableHead>
                <TableHead>{t('sso.user.email')}</TableHead>
                <TableHead>{t('sso.user.groups')}</TableHead>
                <TableHead>{t('sso.common.status')}</TableHead>
                <TableHead>{t('sso.common.operation')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>{user.id}</TableCell>
                  <TableCell>{tenants.find(t => t.id === user.tenant_id)?.name || '-'}</TableCell>
                  <TableCell>{user.username}</TableCell>
                  <TableCell>{user.display_name || '-'}</TableCell>
                  <TableCell>{user.email || '-'}</TableCell>
                  <TableCell>
                    {user.groups?.map(g => <Badge key={g.id} variant="outline" className="mr-1">{g.name}</Badge>)}
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={user.status === 1}
                      onCheckedChange={(checked) => handleStatusChange(user, checked)}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(user)} title={t('common.edit')}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => openPasswordDialog(user)} title={t('sso.user.resetPassword')}>
                        <Key className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => openGroupDialog(user)} title={t('sso.user.assignGroups')}>
                        <Users className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(user.id)} title={t('common.delete')}>
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
            <DialogTitle>{editingUser ? t('sso.user.edit') : t('sso.user.create')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>{t('sso.user.username')}</Label>
              <Input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
            </div>
            {!editingUser && (
              <div className="space-y-2">
                <Label>{t('auth.password')}</Label>
                <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
              </div>
            )}
            <div className="space-y-2">
              <Label>{t('sso.user.displayName')}</Label>
              <Input value={form.display_name} onChange={(e) => setForm({ ...form, display_name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>{t('sso.user.email')}</Label>
              <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>{t('sso.user.phone')}</Label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>{t('sso.user.groups')}</Label>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="w-full justify-between font-normal">
                    {selectedGroups.length > 0 ? (
                      <span className="truncate">
                        {selectedGroups.map(id => groups.find(g => g.id === id)?.name).filter(Boolean).join(', ')}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">{t('sso.user.selectGroups')}</span>
                    )}
                    <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-[var(--radix-dropdown-menu-trigger-width)]">
                  {groups.filter(g => g.status === 1).length === 0 ? (
                    <div className="py-2 px-2 text-sm text-muted-foreground text-center">{t('sso.user.noGroups')}</div>
                  ) : (
                    groups.filter(g => g.status === 1).map(g => (
                      <DropdownMenuCheckboxItem
                        key={g.id}
                        checked={selectedGroups.includes(g.id)}
                        onSelect={(e) => e.preventDefault()}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedGroups([...selectedGroups, g.id])
                          } else {
                            setSelectedGroups(selectedGroups.filter(id => id !== g.id))
                          }
                        }}
                      >
                        {g.name}
                      </DropdownMenuCheckboxItem>
                    ))
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
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

      <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('sso.user.resetPassword')} - {editingUser?.username}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>{t('sso.user.newPassword')}</Label>
              <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder={t('sso.user.newPasswordPlaceholder')} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPasswordDialogOpen(false)}>{t('common.cancel')}</Button>
            <Button onClick={handleResetPassword}>{t('common.confirm')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={groupDialogOpen} onOpenChange={setGroupDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('sso.user.assignGroups')} - {editingUser?.username}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="w-full justify-between font-normal">
                  {selectedGroups.length > 0 ? (
                    <span className="truncate">
                      {selectedGroups.map(id => groups.find(g => g.id === id)?.name).filter(Boolean).join(', ')}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">{t('sso.user.selectGroups')}</span>
                  )}
                  <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-[var(--radix-dropdown-menu-trigger-width)]">
                {groups.length === 0 ? (
                  <div className="py-2 px-2 text-sm text-muted-foreground text-center">{t('sso.user.noGroups')}</div>
                ) : (
                  groups.map(g => (
                    <DropdownMenuCheckboxItem
                      key={g.id}
                      checked={selectedGroups.includes(g.id)}
                      onSelect={(e) => e.preventDefault()}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedGroups([...selectedGroups, g.id])
                        } else {
                          setSelectedGroups(selectedGroups.filter(id => id !== g.id))
                        }
                      }}
                    >
                      {g.name}
                    </DropdownMenuCheckboxItem>
                  ))
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGroupDialogOpen(false)}>{t('common.cancel')}</Button>
            <Button onClick={handleAssignGroups}>{t('common.confirm')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default UserManage
