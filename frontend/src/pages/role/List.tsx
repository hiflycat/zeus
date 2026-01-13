import { useState, useEffect, useMemo } from 'react'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import { Plus, Search, ChevronRight, ChevronDown } from 'lucide-react'
import { DeleteConfirmCard } from '@/components/DeleteConfirmCard'
import { useDeleteConfirm } from '@/hooks/useDeleteConfirm'
import { getRoleList, createRole, updateRole, deleteRole, assignPermissions, assignMenus, Role, RoleListParams } from '@/api/role'
import { getPermissionList, Permission } from '@/api/permission'
import { getMenuList, Menu } from '@/api/menu'
import { usePagination } from '@/hooks/usePagination'
import { getMenuTranslation } from '@/utils/menuTranslation'
import { cn } from '@/lib/utils'
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
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerBody,
  DrawerFooter,
  Label,
  Switch,
  Badge,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Checkbox,
  ScrollArea,
  Pagination,
} from '@/components/ui-tw'

const RoleList = () => {
  const { t } = useTranslation()
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [menus, setMenus] = useState<Menu[]>([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editingRole, setEditingRole] = useState<Role | null>(null)
  const [assigningRole, setAssigningRole] = useState<Role | null>(null)
  const [formData, setFormData] = useState({ name: '', description: '', status: 1 })
  const { deletingId, handleDeleteClick, handleDeleteCancel, setButtonRef, getButtonRef, resetDeleting } = useDeleteConfirm<Role>()
  const [selectedPermissions, setSelectedPermissions] = useState<number[]>([])
  const [selectedMenus, setSelectedMenus] = useState<number[]>([])
  const [expandedMenus, setExpandedMenus] = useState<number[]>([])
  const [expandedPermGroups, setExpandedPermGroups] = useState<string[]>([])
  const [menuFilter, setMenuFilter] = useState('')
  const [permissionFilter, setPermissionFilter] = useState('')

  const {
    data: roles,
    loading,
    total,
    page,
    pageSize,
    searchKeyword,
    handlePageChange,
    handleSearch,
    handleSearchSubmit,
    refresh,
  } = usePagination<Role>({
    fetchFn: async (params) => {
      const rolesRes = await getRoleList(params as RoleListParams)
      return rolesRes
    },
    defaultPageSize: 10,
  })

  // 获取权限和菜单列表（只需要加载一次，用于角色配置，获取所有数据）
  useEffect(() => {
      Promise.all([
        getPermissionList({ page: 1, page_size: 1000 }), // 获取所有权限用于角色配置
        getMenuList({ page: 1, page_size: 1000 }), // 带分页参数,获取菜单列表
      ])
        .then(([permissionsRes, menusRes]) => {
          setPermissions(permissionsRes.list || [])
          // 判断返回类型：如果是分页响应则取 list，如果是数组则直接使用
          const menuList = Array.isArray(menusRes) ? menusRes : (menusRes.list || [])
          setMenus(menuList)
        })
        .catch(() => {
          // 错误提示已在响应拦截器中根据错误码显示
        })
  }, [])

  const handleCreate = () => {
    setEditingRole(null)
    setFormData({ name: '', description: '', status: 1 })
    setDialogOpen(true)
  }

  const handleEdit = (role: Role) => {
    setEditingRole(role)
    setFormData({ name: role.name, description: role.description || '', status: role.status })
    setDialogOpen(true)
  }

  const handleDeleteConfirm = async (role: Role) => {
    try {
      await deleteRole(role.id!)
      toast.success(t('role.deleteSuccess'))
      resetDeleting()
      refresh()
    } catch (error: any) {
      resetDeleting()
    }
  }

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast.error(t('role.nameRequired'))
      return
    }
    try {
      if (editingRole) {
        await updateRole(editingRole.id!, formData as any)
        toast.success(t('role.updateSuccess'))
      } else {
        await createRole(formData as any)
        toast.success(t('role.createSuccess'))
      }
      setDialogOpen(false)
      refresh()
    } catch (error: any) {
      // 错误提示已在响应拦截器中根据错误码显示
    }
  }

  const handleAssign = (role: Role) => {
    setAssigningRole(role)
    setSelectedPermissions((role.permissions?.map(p => p.id).filter((id): id is number => id !== undefined)) || [])
    setSelectedMenus((role.menus?.map(m => m.id).filter((id): id is number => id !== undefined)) || [])
    // 默认展开所有权限分组
    const allResources = [...new Set(permissions.map(p => p.resource || '其他'))]
    setExpandedPermGroups(allResources)
    // 默认展开所有有子菜单的菜单
    const parentMenuIds = menus.filter(m => menus.some(sub => sub.parent_id === m.id)).map(m => m.id).filter((id): id is number => id !== undefined)
    setExpandedMenus(parentMenuIds)
    // 清空筛选
    setMenuFilter('')
    setPermissionFilter('')
    setDrawerOpen(true)
  }

  const handleSaveAssign = async () => {
    if (!assigningRole) return
    try {
      await Promise.all([
        assignPermissions(assigningRole.id!, selectedPermissions),
        assignMenus(assigningRole.id!, selectedMenus),
      ])
      toast.success('分配成功')
      setDrawerOpen(false)
      refresh()
    } catch (error: any) {
      // 错误提示已在响应拦截器中根据错误码显示
    }
  }

  const handleStatusChange = async (role: Role, checked: boolean) => {
    try {
      await updateRole(role.id!, { ...role, status: checked ? 1 : 0 })
      toast.success('状态更新成功')
      refresh()
    } catch (error: any) {
      // 错误提示已在响应拦截器中根据错误码显示
    }
  }

  // 构建菜单树
  const buildMenuTree = (menuList: Menu[], parentId: number = 0): any[] => {
    return menuList
      .filter(m => (m.parent_id || 0) === parentId)
      .sort((a, b) => (a.sort || 0) - (b.sort || 0))
      .map(menu => ({
        ...menu,
        children: buildMenuTree(menuList, menu.id),
      }))
  }

  const menuTree = useMemo(() => buildMenuTree(menus), [menus])

  // 筛选菜单
  const filterMenuTree = (tree: any[], keyword: string): any[] => {
    if (!keyword) return tree
    return tree.filter(menu => {
      const match = menu.name.toLowerCase().includes(keyword.toLowerCase())
      const childMatch = menu.children?.length > 0 && filterMenuTree(menu.children, keyword).length > 0
      return match || childMatch
    }).map(menu => ({
      ...menu,
      children: filterMenuTree(menu.children || [], keyword),
    }))
  }

  const filteredMenuTree = useMemo(() => filterMenuTree(menuTree, menuFilter), [menuTree, menuFilter])

  // 按 resource 分组权限
  const permissionGroups = useMemo(() => {
    const groups: { [key: string]: Permission[] } = {}
    permissions.forEach(p => {
      const resource = p.resource || t('role.other')
      if (!groups[resource]) {
        groups[resource] = []
      }
      groups[resource].push(p)
    })
    return groups
  }, [permissions, t])

  // 筛选权限分组（与菜单筛选逻辑一致）
  const filteredPermissionGroups = useMemo(() => {
    if (!permissionFilter) return permissionGroups
    const keyword = permissionFilter.toLowerCase()
    const filtered: { [key: string]: Permission[] } = {}
    Object.entries(permissionGroups).forEach(([resource, perms]) => {
      // 如果资源名称匹配，显示该分组下所有权限
      if (resource.toLowerCase().includes(keyword)) {
        filtered[resource] = perms
      } else {
        // 否则筛选匹配的权限
        const matchedPerms = perms.filter(p =>
          p.name.toLowerCase().includes(keyword) ||
          p.api.toLowerCase().includes(keyword) ||
          p.method.toLowerCase().includes(keyword)
        )
        if (matchedPerms.length > 0) {
          filtered[resource] = matchedPerms
        }
      }
    })
    return filtered
  }, [permissionGroups, permissionFilter])

  // 渲染权限分组
  const renderPermissionGroup = (resource: string, perms: Permission[]) => {
    const isExpanded = expandedPermGroups.includes(resource)
    const groupPermIds = perms.map(p => p.id ?? 0)
    const selectedInGroup = groupPermIds.filter(id => selectedPermissions.includes(id))
    const isAllSelected = selectedInGroup.length === perms.length
    const isPartialSelected = selectedInGroup.length > 0 && selectedInGroup.length < perms.length

    return (
      <div key={resource}>
        <div
          className="flex items-center gap-2 py-1.5 px-2 rounded hover:bg-accent cursor-pointer"
          onClick={() => {
            setExpandedPermGroups(prev =>
              prev.includes(resource)
                ? prev.filter(r => r !== resource)
                : [...prev, resource]
            )
          }}
        >
          {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          <Checkbox
            checked={isAllSelected}
            ref={(el) => {
              if (el) {
                (el as any).indeterminate = isPartialSelected
              }
            }}
            onCheckedChange={(checked) => {
              if (checked) {
                // 选中该分组下所有权限
                setSelectedPermissions(prev => [...new Set([...prev, ...groupPermIds])])
              } else {
                // 取消选中该分组下所有权限
                setSelectedPermissions(prev => prev.filter(id => !groupPermIds.includes(id)))
              }
            }}
            onClick={(e) => e.stopPropagation()}
          />
          <span className="text-sm font-medium">{resource}</span>
          <Badge variant="secondary" className="ml-auto text-xs">{selectedInGroup.length}/{perms.length}</Badge>
        </div>
        {isExpanded && (
          <div className="ml-6">
            {perms.map(permission => {
              const permId = permission.id ?? 0
              return (
                <div
                  key={permId}
                  className="flex items-center gap-2 py-1.5 px-2 rounded hover:bg-accent"
                >
                  <div className="w-4" />
                  <Checkbox
                    checked={selectedPermissions.includes(permId)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedPermissions(prev => [...prev, permId])
                      } else {
                        setSelectedPermissions(prev => prev.filter(id => id !== permId))
                      }
                    }}
                  />
                  <span className="text-sm">{permission.name}</span>
                  <div className="ml-auto flex items-center gap-1">
                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${
                      permission.method === 'GET' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' :
                      permission.method === 'POST' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' :
                      permission.method === 'PUT' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300' :
                      permission.method === 'DELETE' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300' :
                      'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
                    }`}>{permission.method}</span>
                    <code className="text-xs bg-muted px-1 py-0.5 rounded max-w-[200px] truncate">{permission.api}</code>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  // 渲染菜单树节点
  const renderMenuNode = (menu: any, level = 0) => {
    const hasChildren = menu.children?.length > 0
    const menuId = menu.id ?? 0
    const isExpanded = expandedMenus.includes(menuId)
    const isChecked = selectedMenus.includes(menuId)

    return (
      <div key={menuId}>
        <div
          className={cn(
            "flex items-center gap-2 py-1.5 px-2 rounded hover:bg-accent cursor-pointer",
            level > 0 && "ml-6"
          )}
          onClick={() => {
            if (hasChildren) {
              setExpandedMenus(prev =>
                prev.includes(menuId)
                  ? prev.filter(id => id !== menuId)
                  : [...prev, menuId]
              )
            }
          }}
        >
          {hasChildren ? (
            isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />
          ) : (
            <div className="w-4" />
          )}
          <Checkbox
            checked={isChecked}
            onCheckedChange={(checked) => {
              if (checked) {
                setSelectedMenus(prev => [...prev, menuId])
              } else {
                setSelectedMenus(prev => prev.filter(id => id !== menuId))
              }
            }}
            onClick={(e) => e.stopPropagation()}
          />
          <span className="text-sm">{getMenuTranslation(menu.name, t)}</span>
        </div>
        {hasChildren && isExpanded && (
          <div>
            {menu.children.map((child: any) => renderMenuNode(child, level + 1))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('role.searchPlaceholder')}
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
          {t('role.createRole')}
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-lg border bg-card">
        <Table className="text-sm">
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">ID</TableHead>
              <TableHead>{t('role.name')}</TableHead>
              <TableHead>{t('common.description')}</TableHead>
              <TableHead className="w-24">{t('common.status')}</TableHead>
              <TableHead className="w-40">{t('common.operation')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableEmpty colSpan={5} loading />
            ) : roles.length === 0 ? (
              <TableEmpty colSpan={5} />
            ) : (
              roles.map((role) => (
                <TableRow key={role.id}>
                  <TableCell className="font-medium">{role.id}</TableCell>
                  <TableCell>{role.name}</TableCell>
                  <TableCell className="text-muted-foreground">{role.description || '-'}</TableCell>
                  <TableCell>
                    <Switch
                      checked={role.status === 1}
                      onCheckedChange={(checked) => handleStatusChange(role, checked)}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="relative">
                      <TableActions>
                        <TableActionButton variant="settings" onClick={() => handleAssign(role)} />
                        <TableActionButton variant="edit" onClick={() => handleEdit(role)} />
                        <TableActionButton
                          variant="delete"
                          ref={(el) => setButtonRef(role.id!, el)}
                          onClick={() => handleDeleteClick(role)}
                        />
                      </TableActions>
                      <DeleteConfirmCard
                        isOpen={deletingId === role.id}
                        message={t('role.deleteConfirm', { name: role.name })}
                        onConfirm={() => handleDeleteConfirm(role)}
                        onCancel={handleDeleteCancel}
                        buttonRef={getButtonRef(role.id!)}
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

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingRole ? t('role.editRole') : t('role.createRole')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t('role.name')} *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder={t('role.namePlaceholder')}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('common.description')}</Label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder={t('role.descriptionPlaceholder')}
              />
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

      {/* Assign Drawer */}
      <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
        <DrawerContent side="right" className="w-[500px] max-w-full">
          <DrawerHeader>
            <DrawerTitle>{t('role.roleConfig')} - {assigningRole?.name}</DrawerTitle>
          </DrawerHeader>
          <DrawerBody>
            <Tabs defaultValue="menus" className="w-full">
              <TabsList className="w-full">
                <TabsTrigger value="menus" className="flex-1">{t('role.roleMenus')}</TabsTrigger>
                <TabsTrigger value="permissions" className="flex-1">{t('role.rolePermissions')}</TabsTrigger>
              </TabsList>
              <TabsContent value="menus" className="mt-4">
                <div className="space-y-4">
                  <Input
                    placeholder={t('role.filterMenu')}
                    value={menuFilter}
                    onChange={(e) => setMenuFilter(e.target.value)}
                  />
                  <ScrollArea className="h-[400px] border rounded-md p-2">
                    {filteredMenuTree.map(menu => renderMenuNode(menu))}
                  </ScrollArea>
                </div>
              </TabsContent>
              <TabsContent value="permissions" className="mt-4">
                <div className="space-y-4">
                  <Input
                    placeholder={t('role.filterPermission')}
                    value={permissionFilter}
                    onChange={(e) => setPermissionFilter(e.target.value)}
                  />
                  <ScrollArea className="h-[400px] border rounded-md p-2">
                    <div className="space-y-1">
                      {Object.entries(filteredPermissionGroups).map(([resource, perms]) =>
                        renderPermissionGroup(resource, perms)
                      )}
                    </div>
                  </ScrollArea>
                </div>
              </TabsContent>
            </Tabs>
          </DrawerBody>
          <DrawerFooter>
            <Button variant="outline" onClick={() => setDrawerOpen(false)}>{t('common.cancel')}</Button>
            <Button onClick={handleSaveAssign}>{t('common.save')}</Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </div>
  )
}

export default RoleList
