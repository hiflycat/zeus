import { useState, useRef, useEffect } from 'react'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import { Plus, Search } from 'lucide-react'
import { DeleteConfirmCard } from '@/components/DeleteConfirmCard'
import { getUserList, createUser, updateUser, deleteUser, User, UserListParams } from '@/api/user'
import { getRoleList, Role } from '@/api/role'
import { usePagination } from '@/hooks/usePagination'
import {
  Button,
  Input,
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
  TableEmpty,
  TableActionButton,
  TableActions,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Label,
  Switch,
  Badge,
  Pagination,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
} from '@/components/ui-tw'
import { ChevronDown } from 'lucide-react'

const UserList = () => {
  const { t } = useTranslation()
  const [roles, setRoles] = useState<Role[]>([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [formData, setFormData] = useState({ username: '', email: '', password: '', role_ids: [] as number[], status: 1 })
  const [changePassword, setChangePassword] = useState(false)
  const [deletingUserId, setDeletingUserId] = useState<number | null>(null)
  const deleteButtonRefs = useRef<Map<number, HTMLButtonElement>>(new Map())

  const {
    data: users,
    loading,
    total,
    page,
    pageSize,
    searchKeyword,
    handlePageChange,
    handleSearch,
    handleSearchSubmit,
    refresh,
  } = usePagination<User>({
    fetchFn: async (params) => {
      const usersRes = await getUserList(params as UserListParams)
      return usersRes
    },
    defaultPageSize: 10,
  })

  // 获取角色列表（只需要加载一次）
  useEffect(() => {
    getRoleList({ page: 1, page_size: 1000 })
      .then(res => setRoles(res.list || []))
  }, [])

  const handleCreate = () => {
    setEditingUser(null)
    setFormData({ username: '', email: '', password: '', role_ids: [], status: 1 })
    setChangePassword(false)
    setDialogOpen(true)
  }

  const handleEdit = (user: User) => {
    setEditingUser(user)
    setFormData({
      username: user.username,
      email: user.email || '',
      password: '',
      role_ids: user.roles?.map(r => r.id) || [],
      status: user.status,
    })
    setChangePassword(false)
    setDialogOpen(true)
  }

  const handleDeleteClick = (user: User) => {
    setDeletingUserId(user.id!)
  }

  const handleDeleteConfirm = async (user: User) => {
    try {
      await deleteUser(user.id!)
      toast.success(t('user.deleteSuccess'))
      setDeletingUserId(null)
      refresh()
    } catch (error: any) {
      // 错误提示已在响应拦截器中根据错误码显示
      setDeletingUserId(null)
    }
  }

  const handleDeleteCancel = () => {
    setDeletingUserId(null)
  }

  const handleSubmit = async () => {
    if (!formData.username.trim()) {
      toast.error(t('user.usernameRequired'))
      return
    }
    try {
      if (editingUser) {
        const updateData: any = { ...formData }
        if (!changePassword) delete updateData.password
        await updateUser(editingUser.id!, updateData)
        toast.success(t('user.updateSuccess'))
      } else {
        if (!formData.password.trim()) {
          toast.error(t('user.passwordRequired'))
          return
        }
        await createUser(formData)
        toast.success(t('user.createSuccess'))
      }
      setDialogOpen(false)
      refresh()
    } catch (error: any) {
      // 错误提示已在响应拦截器中根据错误码显示
    }
  }

  const handleStatusChange = async (user: User, checked: boolean) => {
    try {
      await updateUser(user.id!, { ...user, status: checked ? 1 : 0 })
      toast.success(t('user.statusUpdateSuccess'))
      refresh()
    } catch (error: any) {
      // 错误提示已在响应拦截器中根据错误码显示
    }
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('common.search') + '...'}
              value={searchKeyword}
              onChange={(e) => handleSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSearchSubmit()
                }
              }}
              className="pl-10"
            />
        </div>
        <Button onClick={handleCreate}>
          <Plus className="h-4 w-4 mr-2" />
          {t('user.createUser')}
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-lg border bg-card">
        <Table className="text-sm">
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">ID</TableHead>
              <TableHead>{t('user.username')}</TableHead>
              <TableHead>{t('user.email')}</TableHead>
              <TableHead>{t('user.roles')}</TableHead>
              <TableHead className="w-24">{t('common.status')}</TableHead>
              <TableHead className="w-32">{t('common.operation')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableEmpty colSpan={6} loading />
            ) : users.length === 0 ? (
              <TableEmpty colSpan={6} />
            ) : (
              users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.id}</TableCell>
                  <TableCell>{user.username}</TableCell>
                  <TableCell className="text-muted-foreground">{user.email || '-'}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {user.roles?.map((role) => (
                        <Badge key={role.id} variant="secondary" className="text-xs">{role.name}</Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={user.status === 1}
                      onCheckedChange={(checked) => handleStatusChange(user, checked)}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="relative">
                      <TableActions>
                        <TableActionButton variant="edit" onClick={() => handleEdit(user)} />
                        <TableActionButton 
                          variant="delete" 
                          ref={(el) => {
                            if (el && user.id) {
                              deleteButtonRefs.current.set(user.id, el)
                            }
                          }}
                          onClick={() => handleDeleteClick(user)} 
                        />
                      </TableActions>
                      <DeleteConfirmCard
                        isOpen={deletingUserId === user.id}
                        message={t('user.deleteConfirm', { username: user.username })}
                        onConfirm={() => handleDeleteConfirm(user)}
                        onCancel={handleDeleteCancel}
                        buttonRef={user.id ? deleteButtonRefs.current.get(user.id) || null : null}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        <Pagination
          current={page}
          total={total}
          pageSize={pageSize}
          onChange={handlePageChange}
        />
      </div>

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingUser ? t('user.editUser') : t('user.createUser')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t('user.username')} *</Label>
              <Input
                value={formData.username}
                onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                placeholder={t('user.username')}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('user.email')}</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                placeholder={t('user.email')}
              />
            </div>
            {editingUser ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>{t('auth.changePassword')}</Label>
                  <Switch checked={changePassword} onCheckedChange={setChangePassword} />
                </div>
                {changePassword && (
                  <Input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                    placeholder={t('auth.newPassword')}
                  />
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <Label>{t('auth.password')} *</Label>
                <Input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                  placeholder={t('auth.password')}
                />
              </div>
            )}
            <div className="space-y-2">
              <Label>{t('user.roles')}</Label>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="w-full justify-between font-normal">
                    {formData.role_ids.length > 0 ? (
                      <span className="truncate">
                        {formData.role_ids.map(id => {
                          const role = roles.find(r => r.id === id)
                          return role ? role.name : `ID:${id}`
                        }).join(', ')}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">{t('user.roles')}</span>
                    )}
                    <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-[var(--radix-dropdown-menu-trigger-width)]">
                  {roles.length === 0 ? (
                    <div className="py-2 px-2 text-sm text-muted-foreground text-center">
                      {t('common.noData')}
                    </div>
                  ) : (
                    roles.filter(role => role.id).map((role) => (
                      <DropdownMenuCheckboxItem
                        key={role.id}
                        checked={formData.role_ids.includes(role.id!)}
                        onSelect={(e) => {
                          e.preventDefault()
                        }}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setFormData(prev => ({
                              ...prev,
                              role_ids: [...prev.role_ids, role.id!]
                            }))
                          } else {
                            setFormData(prev => ({
                              ...prev,
                              role_ids: prev.role_ids.filter(id => id !== role.id)
                            }))
                          }
                        }}
                      >
                        {role.name}
                      </DropdownMenuCheckboxItem>
                    ))
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <div className="flex items-center justify-between">
              <Label>{t('common.status')}</Label>
              <Switch
                checked={formData.status === 1}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, status: checked ? 1 : 0 }))}
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

export default UserList
