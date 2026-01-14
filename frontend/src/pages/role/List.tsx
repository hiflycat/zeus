import { useState, useEffect, useMemo } from 'react'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import { Plus, Search, ChevronRight, ChevronDown } from 'lucide-react'
import { DeleteConfirmCard } from '@/components/DeleteConfirmCard'
import { useDeleteConfirm } from '@/hooks/useDeleteConfirm'
import { getRoleList, createRole, updateRole, deleteRole, getRolePolicies, assignPolicies, assignMenus, Role, RoleListParams } from '@/api/role'
import { getAllAPIDefinitions, APIDefinition } from '@/api/api-definition'
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
  const [apiDefinitions, setApiDefinitions] = useState<APIDefinition[]>([])
  const [menus, setMenus] = useState<Menu[]>([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editingRole, setEditingRole] = useState<Role | null>(null)
  const [assigningRole, setAssigningRole] = useState<Role | null>(null)
  const [formData, setFormData] = useState({ name: '', description: '', status: 1 })
  const { deletingId, handleDeleteClick, handleDeleteCancel, setButtonRef, getButtonRef, resetDeleting } = useDeleteConfirm<Role>()
  const [selectedAPIs, setSelectedAPIs] = useState<number[]>([])
  const [selectedMenus, setSelectedMenus] = useState<number[]>([])
  const [expandedMenus, setExpandedMenus] = useState<number[]>([])
  const [expandedAPIGroups, setExpandedAPIGroups] = useState<string[]>([])
  const [menuFilter, setMenuFilter] = useState('')
  const [apiFilter, setApiFilter] = useState('')

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

  useEffect(() => {
      Promise.all([
        getAllAPIDefinitions(),
        getMenuList({ page: 1, page_size: 1000 }),
      ])
        .then(([apiRes, menusRes]) => {
          setApiDefinitions(apiRes || [])
          const menuList = Array.isArray(menusRes) ? menusRes : (menusRes.list || [])
          setMenus(menuList)
        })
        .catch(() => {})
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
    } catch (error: any) {}
  }

  const handleAssign = async (role: Role) => {
    setAssigningRole(role)
    // 获取角色已分配的 API 权限
    try {
      const apiIds = await getRolePolicies(role.id!)
      setSelectedAPIs(apiIds || [])
    } catch {
      setSelectedAPIs([])
    }
    setSelectedMenus((role.menus?.map(m => m.id).filter((id): id is number => id !== undefined)) || [])
    // 默认展开所有 API 分组
    const allResources = [...new Set(apiDefinitions.map(a => a.resource || '其他'))]
    setExpandedAPIGroups(allResources)
    // 默认展开所有有子菜单的菜单
    const parentMenuIds = menus.filter(m => menus.some(sub => sub.parent_id === m.id)).map(m => m.id).filter((id): id is number => id !== undefined)
    setExpandedMenus(parentMenuIds)
    setMenuFilter('')
    setApiFilter('')
    setDrawerOpen(true)
  }

  const handleSaveAssign = async () => {
    if (!assigningRole) return
    try {
      await Promise.all([
        assignPolicies(assigningRole.id!, selectedAPIs),
        assignMenus(assigningRole.id!, selectedMenus),
      ])
      toast.success('分配成功')
      setDrawerOpen(false)
      refresh()
    } catch (error: any) {}
  }

  const handleStatusChange = async (role: Role, checked: boolean) => {
    try {
      await updateRole(role.id!, { ...role, status: checked ? 1 : 0 })
      toast.success('状态更新成功')
      refresh()
    } catch (error: any) {}
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

  // 获取菜单的所有子菜单 ID（递归）
  const getAllChildIds = (menu: any): number[] => {
    const ids: number[] = []
    if (menu.children?.length > 0) {
      menu.children.forEach((child: any) => {
        ids.push(child.id)
        ids.push(...getAllChildIds(child))
      })
    }
    return ids
  }

  // 获取菜单的所有父菜单 ID
  const getAllParentIds = (menuId: number): number[] => {
    const ids: number[] = []
    const findParent = (id: number) => {
      const menu = menus.find(m => m.id === id)
      if (menu?.parent_id) {
        ids.push(menu.parent_id)
        findParent(menu.parent_id)
      }
    }
    findParent(menuId)
    return ids
  }

  // 处理菜单选择变化
  const handleMenuCheck = (menu: any, checked: boolean) => {
    const menuId = menu.id ?? 0
    if (checked) {
      // 选中：添加自己 + 所有子菜单 + 所有父菜单
      const childIds = getAllChildIds(menu)
      const parentIds = getAllParentIds(menuId)
      setSelectedMenus(prev => [...new Set([...prev, menuId, ...childIds, ...parentIds])])
    } else {
      // 取消：移除自己 + 所有子菜单
      const childIds = getAllChildIds(menu)
      setSelectedMenus(prev => prev.filter(id => id !== menuId && !childIds.includes(id)))
    }
  }

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

  // 按 resource 分组 API
  const apiGroups = useMemo(() => {
    const groups: { [key: string]: APIDefinition[] } = {}
    apiDefinitions.forEach(a => {
      const resource = a.resource || t('role.other')
      if (!groups[resource]) {
        groups[resource] = []
      }
      groups[resource].push(a)
    })
    return groups
  }, [apiDefinitions, t])

  // 筛选 API 分组
  const filteredAPIGroups = useMemo(() => {
    if (!apiFilter) return apiGroups
    const keyword = apiFilter.toLowerCase()
    const filtered: { [key: string]: APIDefinition[] } = {}
    Object.entries(apiGroups).forEach(([resource, apis]) => {
      if (resource.toLowerCase().includes(keyword)) {
        filtered[resource] = apis
      } else {
        const matchedAPIs = apis.filter(a =>
          a.name.toLowerCase().includes(keyword) ||
          a.path.toLowerCase().includes(keyword) ||
          a.method.toLowerCase().includes(keyword)
        )
        if (matchedAPIs.length > 0) {
          filtered[resource] = matchedAPIs
        }
      }
    })
    return filtered
  }, [apiGroups, apiFilter])

  // 渲染 API 分组
  const renderAPIGroup = (resource: string, apis: APIDefinition[]) => {
    const isExpanded = expandedAPIGroups.includes(resource)
    const groupAPIIds = apis.map(a => a.id ?? 0)
    const selectedInGroup = groupAPIIds.filter(id => selectedAPIs.includes(id))
    const isAllSelected = selectedInGroup.length === apis.length
    const isPartialSelected = selectedInGroup.length > 0 && selectedInGroup.length < apis.length

    return (
      <div key={resource}>
        <div
          className="flex items-center gap-2 py-1.5 px-2 rounded hover:bg-accent cursor-pointer"
          onClick={() => {
            setExpandedAPIGroups(prev =>
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
                setSelectedAPIs(prev => [...new Set([...prev, ...groupAPIIds])])
              } else {
                setSelectedAPIs(prev => prev.filter(id => !groupAPIIds.includes(id)))
              }
            }}
            onClick={(e) => e.stopPropagation()}
          />
          <span className="text-sm font-medium">{resource}</span>
          <Badge variant="secondary" className="ml-auto text-xs">{selectedInGroup.length}/{apis.length}</Badge>
        </div>
        {isExpanded && (
          <div className="ml-6">
            {apis.map(api => {
              const apiId = api.id ?? 0
              return (
                <div
                  key={apiId}
                  className="flex items-center gap-2 py-1.5 px-2 rounded hover:bg-accent"
                >
                  <div className="w-4" />
                  <Checkbox
                    checked={selectedAPIs.includes(apiId)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedAPIs(prev => [...prev, apiId])
                      } else {
                        setSelectedAPIs(prev => prev.filter(id => id !== apiId))
                      }
                    }}
                  />
                  <span className="text-sm">{api.name}</span>
                  <div className="ml-auto flex items-center gap-1">
                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${
                      api.method === 'GET' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' :
                      api.method === 'POST' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' :
                      api.method === 'PUT' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300' :
                      api.method === 'DELETE' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300' :
                      'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
                    }`}>{api.method}</span>
                    <code className="text-xs bg-muted px-1 py-0.5 rounded max-w-[200px] truncate">{api.path}</code>
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
            onCheckedChange={(checked) => handleMenuCheck(menu, !!checked)}
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
                <TabsTrigger value="apis" className="flex-1">{t('role.roleAPIs')}</TabsTrigger>
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
              <TabsContent value="apis" className="mt-4">
                <div className="space-y-4">
                  <Input
                    placeholder={t('role.filterAPI')}
                    value={apiFilter}
                    onChange={(e) => setApiFilter(e.target.value)}
                  />
                  <ScrollArea className="h-[400px] border rounded-md p-2">
                    <div className="space-y-1">
                      {Object.entries(filteredAPIGroups).map(([resource, apis]) =>
                        renderAPIGroup(resource, apis)
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
