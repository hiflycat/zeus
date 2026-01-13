import { useState, useEffect, useMemo, useRef, useLayoutEffect, Fragment } from 'react'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import { Plus, Search, ChevronRight, ChevronDown } from 'lucide-react'
import { DeleteConfirmCard } from '@/components/DeleteConfirmCard'
import { getMenuList, createMenu, updateMenu, deleteMenu, Menu, MenuListParams, MenuListResponse } from '@/api/menu'
import { usePagination } from '@/hooks/usePagination'
import { iconMap, iconList } from '@/components/IconSelector'
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
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
  Switch,
  ScrollArea,
  Pagination,
} from '@/components/ui-tw'

const MenuList = () => {
  const { t } = useTranslation()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingMenu, setEditingMenu] = useState<Menu | null>(null)
  const [expandedRows, setExpandedRows] = useState<number[]>([])
  const [deletingMenuId, setDeletingMenuId] = useState<number | null>(null)
  const deleteConfirmRef = useRef<HTMLDivElement>(null)
  const deleteButtonRefs = useRef<Map<number, HTMLButtonElement>>(new Map())

  // 点击外部关闭确认卡片
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (deletingMenuId && deleteConfirmRef.current && !deleteConfirmRef.current.contains(event.target as Node)) {
        const button = deleteButtonRefs.current.get(deletingMenuId)
        if (button && button.contains(event.target as Node)) {
          return
        }
        setDeletingMenuId(null)
      }
    }
    if (deletingMenuId) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => {
        document.removeEventListener('mousedown', handleClickOutside)
      }
    }
  }, [deletingMenuId])
  const [columnWidths, setColumnWidths] = useState<number[]>([])
  const [topMenus, setTopMenus] = useState<Menu[]>([])
  const hiddenTableRef = useRef<HTMLTableElement>(null)
  const [formData, setFormData] = useState({
    name: '',
    path: '',
    component: '',
    icon: '',
    parent_id: 0,
    sort: 0,
    status: 1,
  })

  const {
    data: menus,
    loading,
    total,
    page,
    pageSize,
    searchKeyword,
    handlePageChange,
    handleSearch,
    handleSearchSubmit,
    refresh,
  } = usePagination<Menu>({
    fetchFn: async (params) => {
      const menusRes = await getMenuList(params as MenuListParams)
      // 如果返回的是分页数据，直接返回
      if (menusRes && typeof menusRes === 'object' && 'list' in menusRes) {
        return menusRes as MenuListResponse
      }
      // 如果返回的是树形结构数组，转换为分页格式（这种情况不应该发生，因为带了分页参数）
      return {
        list: Array.isArray(menusRes) ? menusRes : [],
        total: Array.isArray(menusRes) ? menusRes.length : 0,
        page: params.page || 1,
        page_size: params.page_size || 10,
      }
    },
    defaultPageSize: 10,
  })

  // 构建菜单树（仅用于显示，分页数据可能不完整）
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

  // 扁平化菜单树（包含所有子菜单，用于计算列宽）
  const flattenMenus = (tree: any[], level = 0): any[] => {
    let result: any[] = []
    for (const menu of tree) {
      result.push({ ...menu, _level: level })
      if (menu.children?.length > 0) {
        result = result.concat(flattenMenus(menu.children, level + 1))
      }
    }
    return result
  }

  const allFlatMenus = useMemo(() => flattenMenus(menuTree), [menuTree])

  // 计算列宽
  useLayoutEffect(() => {
    if (hiddenTableRef.current && allFlatMenus.length > 0) {
      const table = hiddenTableRef.current
      const headerCells = table.querySelectorAll('thead th')
      const widths: number[] = []
      headerCells.forEach((cell) => {
        widths.push((cell as HTMLElement).offsetWidth)
      })
      // 只在列宽有变化时更新
      if (widths.length > 0 && JSON.stringify(widths) !== JSON.stringify(columnWidths)) {
        setColumnWidths(widths)
      }
    }
  }, [allFlatMenus, columnWidths])

  // 过滤菜单（后端已搜索，这里只需要构建树形结构）
  // 如果树形结构为空，则显示扁平列表
  const filteredMenuTree = useMemo(() => {
    // 如果树形结构有数据，使用树形结构
    if (menuTree.length > 0) {
      return menuTree
    }
    // 如果树形结构为空（可能是分页数据不完整，比如当前页只有子菜单没有父菜单），直接显示扁平列表
    // 按 sort 排序
    const sortedMenus = [...menus].sort((a, b) => (a.sort || 0) - (b.sort || 0))
    return sortedMenus.map(menu => ({ ...menu, children: [] }))
  }, [menuTree, menus])

  // 获取所有顶级菜单（用于父菜单选择）
  useEffect(() => {
    getMenuList() // 不带分页参数，获取树形结构菜单
      .then(res => {
        // res 是树形结构数组，需要扁平化
        const flattenMenus = (menus: Menu[]): Menu[] => {
          let result: Menu[] = []
          for (const menu of menus) {
            result.push(menu)
            if (menu.children && menu.children.length > 0) {
              result = result.concat(flattenMenus(menu.children))
            }
          }
          return result
        }
        const allMenus = Array.isArray(res) ? flattenMenus(res) : []
        setTopMenus(allMenus.filter(m => !m.parent_id || m.parent_id === 0))
      })
      .catch(() => {})
  }, [])

  const handleCreate = (parentId: number = 0) => {
    setEditingMenu(null)
    setFormData({
      name: '',
      path: '',
      component: '',
      icon: '',
      parent_id: parentId,
      sort: 0,
      status: 1,
    })
    setDialogOpen(true)
  }

  const handleEdit = (menu: Menu) => {
    setEditingMenu(menu)
    setFormData({
      name: menu.name,
      path: menu.path || '',
      component: menu.component || '',
      icon: menu.icon || '',
      parent_id: menu.parent_id || 0,
      sort: menu.sort || 0,
      status: menu.status,
    })
    setDialogOpen(true)
  }

  const handleDeleteClick = (menu: Menu) => {
    setDeletingMenuId(menu.id!)
  }

  const handleDeleteConfirm = async (menu: Menu) => {
    try {
      await deleteMenu(menu.id!)
      toast.success(t('menu.deleteSuccess'))
      setDeletingMenuId(null)
      refresh()
    } catch (error: any) {
      // 错误提示已在响应拦截器中根据错误码显示
      setDeletingMenuId(null)
    }
  }

  const handleDeleteCancel = () => {
    setDeletingMenuId(null)
  }

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast.error(t('menu.nameRequired'))
      return
    }
    try {
      if (editingMenu) {
        await updateMenu(editingMenu.id!, formData)
        toast.success(t('menu.updateSuccess'))
      } else {
        await createMenu(formData)
        toast.success(t('menu.createSuccess'))
      }
      setDialogOpen(false)
      refresh()
    } catch (error: any) {
      // 错误提示已在响应拦截器中根据错误码显示
    }
  }

  const handleStatusChange = async (menu: Menu, checked: boolean) => {
    try {
      await updateMenu(menu.id!, { ...menu, status: checked ? 1 : 0 })
      toast.success(t('menu.statusUpdateSuccess'))
      refresh()
    } catch (error: any) {
      // 错误提示已在响应拦截器中根据错误码显示
    }
  }

  const toggleExpand = (id: number) => {
    setExpandedRows(prev =>
      prev.includes(id)
        ? prev.filter(rowId => rowId !== id)
        : [...prev, id]
    )
  }

  // 渲染表格行
  const renderMenuRow = (menu: any, level = 0) => {
    const hasChildren = menu.children?.length > 0
    const isExpanded = expandedRows.includes(menu.id)
    const IconComponent = iconMap[menu.icon]

    return (
      <Fragment key={menu.id}>
        <TableRow>
          <TableCell style={{ paddingLeft: level * 24 + 16 }}>
            <div className="flex items-center gap-2 whitespace-nowrap">
              {hasChildren ? (
                <button onClick={() => toggleExpand(menu.id)} className="p-0.5 hover:bg-accent rounded">
                  {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                </button>
              ) : (
                <div className="w-5" />
              )}
              <span className="font-medium">{menu.id}</span>
            </div>
          </TableCell>
          <TableCell>
            <div className="flex items-center gap-2 whitespace-nowrap">
              {IconComponent && <IconComponent className="h-3.5 w-3.5 text-muted-foreground" />}
              <span>{menu.name}</span>
            </div>
          </TableCell>
          <TableCell className="text-muted-foreground whitespace-nowrap">{menu.path || '-'}</TableCell>
          <TableCell className="text-muted-foreground whitespace-nowrap">{menu.component || '-'}</TableCell>
          <TableCell className="whitespace-nowrap">{menu.sort}</TableCell>
          <TableCell>
            <Switch
              checked={menu.status === 1}
              onCheckedChange={(checked) => handleStatusChange(menu, checked)}
            />
          </TableCell>
          <TableCell>
            <div className="relative">
              <TableActions>
                <TableActionButton variant="edit" onClick={() => handleEdit(menu)} />
                <TableActionButton 
                  variant="delete" 
                  ref={(el) => {
                    if (el && menu.id) {
                      deleteButtonRefs.current.set(menu.id, el)
                    }
                  }}
                  onClick={() => handleDeleteClick(menu)} 
                />
              </TableActions>
              <DeleteConfirmCard
                isOpen={deletingMenuId === menu.id}
                message={t('menu.deleteConfirm', { name: menu.name })}
                onConfirm={() => handleDeleteConfirm(menu)}
                onCancel={handleDeleteCancel}
                buttonRef={deleteButtonRefs.current.get(menu.id!) || null}
              />
            </div>
          </TableCell>
        </TableRow>
        {hasChildren && isExpanded && menu.children.map((child: any) => renderMenuRow(child, level + 1))}
      </Fragment>
    )
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={`${t('common.search')}...`}
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
        <Button onClick={() => handleCreate()}>
          <Plus className="h-4 w-4 mr-2" />
          {t('menu.createMenu')}
        </Button>
      </div>

      {/* 隐藏的表格，用于计算列宽 */}
      <div className="absolute invisible overflow-hidden" style={{ height: 0, width: 'auto' }}>
        <table ref={hiddenTableRef} className="w-auto">
          <thead>
            <tr>
              <th className="whitespace-nowrap px-4 py-2">ID</th>
              <th className="whitespace-nowrap px-4 py-2">{t('menu.name')}</th>
              <th className="whitespace-nowrap px-4 py-2">{t('menu.path')}</th>
              <th className="whitespace-nowrap px-4 py-2">{t('menu.component')}</th>
              <th className="whitespace-nowrap px-4 py-2">{t('menu.sort')}</th>
              <th className="whitespace-nowrap px-4 py-2">{t('common.status')}</th>
              <th className="whitespace-nowrap px-4 py-2">{t('common.operation')}</th>
            </tr>
          </thead>
          <tbody>
            {allFlatMenus.map((menu) => {
              const IconComponent = iconMap[menu.icon]
              return (
                <tr key={`hidden-${menu.id}`}>
                  <td className="whitespace-nowrap px-4 py-2" style={{ paddingLeft: menu._level * 24 + 16 }}>
                    <div className="flex items-center gap-2">
                      <div className="w-5" />
                      <span>{menu.id}</span>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-4 py-2">
                    <div className="flex items-center gap-2">
                      {IconComponent && <IconComponent className="h-4 w-4" />}
                      <span>{menu.name}</span>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-4 py-2">{menu.path || '-'}</td>
                  <td className="whitespace-nowrap px-4 py-2">{menu.component || '-'}</td>
                  <td className="whitespace-nowrap px-4 py-2">{menu.sort}</td>
                  <td className="whitespace-nowrap px-4 py-2">状态</td>
                  <td className="whitespace-nowrap px-4 py-2">
                    <div className="flex items-center gap-1" style={{ width: 80 }}>操作按钮</div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Table */}
      <div className="rounded-lg border bg-card overflow-x-auto">
        <Table className="text-sm" style={{ tableLayout: columnWidths.length > 0 ? 'fixed' : 'auto' }}>
          <TableHeader>
            <TableRow>
              <TableHead style={columnWidths[0] ? { width: columnWidths[0] } : undefined}>ID</TableHead>
              <TableHead style={columnWidths[1] ? { width: columnWidths[1] } : undefined}>{t('menu.name')}</TableHead>
              <TableHead style={columnWidths[2] ? { width: columnWidths[2] } : undefined}>{t('menu.path')}</TableHead>
              <TableHead style={columnWidths[3] ? { width: columnWidths[3] } : undefined}>{t('menu.component')}</TableHead>
              <TableHead style={columnWidths[4] ? { width: columnWidths[4] } : undefined}>{t('menu.sort')}</TableHead>
              <TableHead style={columnWidths[5] ? { width: columnWidths[5] } : undefined}>{t('common.status')}</TableHead>
              <TableHead style={columnWidths[6] ? { width: columnWidths[6] } : undefined}>{t('common.operation')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableEmpty colSpan={7} loading />
            ) : menus.length === 0 ? (
              <TableEmpty colSpan={7} />
            ) : filteredMenuTree.length === 0 ? (
              <TableEmpty colSpan={7} />
            ) : (
              filteredMenuTree.map(menu => renderMenuRow(menu))
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
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingMenu ? t('menu.editMenu') : t('menu.createMenu')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('menu.name')} *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder={t('menu.nameRequired')}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('menu.path')}</Label>
                <Input
                  value={formData.path}
                  onChange={(e) => setFormData(prev => ({ ...prev, path: e.target.value }))}
                  placeholder="/user"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('menu.component')}</Label>
                <Input
                  value={formData.component}
                  onChange={(e) => setFormData(prev => ({ ...prev, component: e.target.value }))}
                  placeholder="user/List"
                />
              </div>
              <div className="space-y-2">
                <Label>{t('menu.icon')}</Label>
                <Select
                  value={formData.icon}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, icon: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('menu.icon')}>
                      {formData.icon && (
                        <div className="flex items-center gap-2">
                          {iconMap[formData.icon] && (() => {
                            const Icon = iconMap[formData.icon]
                            return <Icon className="h-4 w-4" />
                          })()}
                          <span>{formData.icon}</span>
                        </div>
                      )}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <ScrollArea className="h-[200px]">
                      {iconList.map((icon) => {
                        const Icon = iconMap[icon]
                        return (
                          <SelectItem key={icon} value={icon}>
                            <div className="flex items-center gap-2">
                              <Icon className="h-4 w-4" />
                              <span>{icon}</span>
                            </div>
                          </SelectItem>
                        )
                      })}
                    </ScrollArea>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('menu.parent')}</Label>
                <Select
                  value={formData.parent_id.toString()}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, parent_id: parseInt(value) }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('menu.parent')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">{t('menu.noParent')}</SelectItem>
                    {topMenus.filter(m => m.id !== editingMenu?.id).map((menu) => (
                      <SelectItem key={menu.id} value={(menu.id ?? 0).toString()}>
                        {menu.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t('menu.sort')}</Label>
                <Input
                  type="number"
                  value={formData.sort}
                  onChange={(e) => setFormData(prev => ({ ...prev, sort: parseInt(e.target.value) || 0 }))}
                  placeholder="0"
                />
              </div>
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

export default MenuList
