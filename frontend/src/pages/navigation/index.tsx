import { useState, useEffect, useMemo, useRef, useLayoutEffect, Fragment } from 'react'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import { Plus, Search, ChevronRight, ChevronDown, Globe } from 'lucide-react'
import { DeleteConfirmCard } from '@/components/DeleteConfirmCard'
import { useDeleteConfirm } from '@/hooks/useDeleteConfirm'
import {
  getNavigationCategoryList,
  createNavigationCategory,
  updateNavigationCategory,
  deleteNavigationCategory,
  NavigationCategory,
  NavigationCategoryListParams,
  NavigationCategoryListResponse,
  getNavigationList,
  createNavigation,
  updateNavigation,
  deleteNavigation,
  Navigation,
  NavigationListParams,
  NavigationListResponse,
} from '@/api/navigation'
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
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Textarea,
} from '@/components/ui-tw'

const NavigationPage = () => {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState('categories')

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="categories">{t('navigation.categoryManagement')}</TabsTrigger>
          <TabsTrigger value="navigations">{t('navigation.navigationManagement')}</TabsTrigger>
        </TabsList>
        <TabsContent value="categories">
          <CategoryManagement />
        </TabsContent>
        <TabsContent value="navigations">
          <NavigationManagement />
        </TabsContent>
      </Tabs>
    </div>
  )
}

// 网站分类管理组件
const CategoryManagement = () => {
  const { t } = useTranslation()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<NavigationCategory | null>(null)
  const [expandedRows, setExpandedRows] = useState<number[]>([])
  const { deletingId: deletingCategoryId, handleDeleteClick, handleDeleteCancel, setButtonRef, getButtonRef, resetDeleting } = useDeleteConfirm<NavigationCategory>()
  const [columnWidths, setColumnWidths] = useState<number[]>([])
  const [topCategories, setTopCategories] = useState<NavigationCategory[]>([])
  const hiddenTableRef = useRef<HTMLTableElement>(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    icon: '',
    parent_id: 0,
    sort: 0,
  })

  const {
    data: categories,
    loading,
    searchKeyword,
    handleSearch,
    handleSearchSubmit,
    refresh,
  } = usePagination<NavigationCategory>({
    fetchFn: async (params) => {
      const categoriesRes = await getNavigationCategoryList(params as NavigationCategoryListParams)
      if (categoriesRes && typeof categoriesRes === 'object' && 'list' in categoriesRes) {
        return categoriesRes as NavigationCategoryListResponse
      }
      return {
        list: Array.isArray(categoriesRes) ? categoriesRes : [],
        total: Array.isArray(categoriesRes) ? categoriesRes.length : 0,
        page: params.page || 1,
        page_size: params.page_size || 1000,
      }
    },
    defaultPageSize: 1000,
  })

  const buildCategoryTree = (categoryList: NavigationCategory[], parentId: number = 0): any[] => {
    return categoryList
      .filter(c => (c.parent_id || 0) === parentId)
      .sort((a, b) => (a.sort || 0) - (b.sort || 0))
      .map(category => ({
        ...category,
        children: buildCategoryTree(categoryList, category.id!),
      }))
  }

  const categoryTree = useMemo(() => buildCategoryTree(categories), [categories])

  const flattenCategories = (tree: any[], level = 0): any[] => {
    let result: any[] = []
    for (const category of tree) {
      result.push({ ...category, _level: level })
      if (category.children?.length > 0) {
        result = result.concat(flattenCategories(category.children, level + 1))
      }
    }
    return result
  }

  const allFlatCategories = useMemo(() => flattenCategories(categoryTree), [categoryTree])

  useLayoutEffect(() => {
    if (hiddenTableRef.current && allFlatCategories.length > 0) {
      const table = hiddenTableRef.current
      const headerCells = table.querySelectorAll('thead th')
      const widths: number[] = []
      headerCells.forEach((cell) => {
        widths.push((cell as HTMLElement).offsetWidth)
      })
      if (widths.length > 0 && JSON.stringify(widths) !== JSON.stringify(columnWidths)) {
        setColumnWidths(widths)
      }
    }
  }, [allFlatCategories, columnWidths])

  const filteredCategoryTree = useMemo(() => {
    if (categoryTree.length > 0) {
      return categoryTree
    }
    const sortedCategories = [...categories].sort((a, b) => (a.sort || 0) - (b.sort || 0))
    return sortedCategories.map(category => ({ ...category, children: [] }))
  }, [categoryTree, categories])

  useEffect(() => {
    getNavigationCategoryList()
      .then(res => {
        const flattenCategories = (categories: NavigationCategory[]): NavigationCategory[] => {
          let result: NavigationCategory[] = []
          for (const category of categories) {
            result.push(category)
            if (category.children && category.children.length > 0) {
              result = result.concat(flattenCategories(category.children))
            }
          }
          return result
        }
        const allCategories = Array.isArray(res) ? flattenCategories(res) : []
        setTopCategories(allCategories.filter(c => !c.parent_id || c.parent_id === 0))
      })
      .catch(() => {})
  }, [])

  const handleCreate = (parentId: number = 0) => {
    setEditingCategory(null)
    setFormData({
      name: '',
      description: '',
      icon: '',
      parent_id: parentId,
      sort: 0,
    })
    setDialogOpen(true)
  }

  const handleEdit = (category: NavigationCategory) => {
    setEditingCategory(category)
    setFormData({
      name: category.name,
      description: category.description || '',
      icon: category.icon || '',
      parent_id: category.parent_id || 0,
      sort: category.sort || 0,
    })
    setDialogOpen(true)
  }

  const handleDeleteConfirm = async (category: NavigationCategory) => {
    try {
      await deleteNavigationCategory(category.id!)
      toast.success(t('navigation.categoryDeleteSuccess'))
      resetDeleting()
      refresh()
    } catch (error: any) {
      resetDeleting()
    }
  }

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast.error(t('navigation.categoryNameRequired'))
      return
    }
    try {
      // 如果 parent_id 为 0，转换为 null（顶级分类）
      const submitData = {
        ...formData,
        parent_id: formData.parent_id === 0 ? null : formData.parent_id,
      }
      if (editingCategory) {
        await updateNavigationCategory(editingCategory.id!, submitData)
        toast.success(t('navigation.categoryUpdateSuccess'))
      } else {
        await createNavigationCategory(submitData)
        toast.success(t('navigation.categoryCreateSuccess'))
      }
      setDialogOpen(false)
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

  const renderCategoryRow = (category: any, level = 0) => {
    const hasChildren = category.children?.length > 0
    const isExpanded = expandedRows.includes(category.id)
    const IconComponent = iconMap[category.icon]

    return (
      <Fragment key={category.id}>
        <TableRow>
          <TableCell style={{ paddingLeft: level * 24 + 16 }}>
            <div className="flex items-center gap-2 whitespace-nowrap">
              {hasChildren ? (
                <button onClick={() => toggleExpand(category.id)} className="p-0.5 hover:bg-accent rounded">
                  {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                </button>
              ) : (
                <div className="w-5" />
              )}
              <span className="font-medium">{category.id}</span>
            </div>
          </TableCell>
          <TableCell>
            <div className="flex items-center gap-2 whitespace-nowrap">
              {IconComponent ? (
                <IconComponent className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              ) : (
                <Globe className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              )}
              <span>{category.name}</span>
            </div>
          </TableCell>
          <TableCell className="whitespace-nowrap">{category.sort}</TableCell>
          <TableCell>
            <div className="relative">
              <TableActions>
                <TableActionButton variant="edit" onClick={() => handleEdit(category)} />
                <TableActionButton
                  variant="delete"
                  ref={(el) => setButtonRef(category.id!, el)}
                  onClick={() => handleDeleteClick(category)}
                />
              </TableActions>
              <DeleteConfirmCard
                isOpen={deletingCategoryId === category.id}
                message={t('navigation.categoryDeleteConfirm', { name: category.name })}
                onConfirm={() => handleDeleteConfirm(category)}
                onCancel={handleDeleteCancel}
                buttonRef={getButtonRef(category.id!)}
              />
            </div>
          </TableCell>
        </TableRow>
        {hasChildren && isExpanded && category.children.map((child: any) => renderCategoryRow(child, level + 1))}
      </Fragment>
    )
  }

  return (
    <div className="space-y-4">
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
          {t('navigation.createCategory')}
        </Button>
      </div>

      <div className="absolute invisible overflow-hidden" style={{ height: 0, width: 'auto' }}>
        <table ref={hiddenTableRef} className="w-auto">
          <thead>
            <tr>
              <th className="whitespace-nowrap px-4 py-2">ID</th>
              <th className="whitespace-nowrap px-4 py-2">{t('navigation.categoryName')}</th>
              <th className="whitespace-nowrap px-4 py-2">{t('navigation.sort')}</th>
              <th className="whitespace-nowrap px-4 py-2">{t('common.operation')}</th>
            </tr>
          </thead>
          <tbody>
            {allFlatCategories.map((category) => {
              const IconComponent = iconMap[category.icon]
              return (
                <tr key={`hidden-${category.id}`}>
                  <td className="whitespace-nowrap px-4 py-2" style={{ paddingLeft: category._level * 24 + 16 }}>
                    <div className="flex items-center gap-2">
                      <div className="w-5" />
                      <span>{category.id}</span>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-4 py-2">
                    <div className="flex items-center gap-2">
                      {IconComponent ? (
                        <IconComponent className="h-4 w-4" />
                      ) : (
                        <Globe className="h-4 w-4" />
                      )}
                      <span>{category.name}</span>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-4 py-2">{category.sort}</td>
                  <td className="whitespace-nowrap px-4 py-2">
                    <div className="flex items-center gap-1" style={{ width: 80 }}>操作按钮</div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="rounded-lg border bg-card overflow-x-auto">
        <Table className="text-sm" style={{ tableLayout: columnWidths.length > 0 ? 'fixed' : 'auto' }}>
          <TableHeader>
            <TableRow>
              <TableHead style={columnWidths[0] ? { width: columnWidths[0] } : undefined}>ID</TableHead>
              <TableHead style={columnWidths[1] ? { width: columnWidths[1] } : undefined}>{t('navigation.categoryName')}</TableHead>
              <TableHead style={columnWidths[2] ? { width: columnWidths[2] } : undefined}>{t('navigation.sort')}</TableHead>
              <TableHead style={columnWidths[3] ? { width: columnWidths[3] } : undefined}>{t('common.operation')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableEmpty colSpan={4} loading />
            ) : categories.length === 0 ? (
              <TableEmpty colSpan={4} />
            ) : filteredCategoryTree.length === 0 ? (
              <TableEmpty colSpan={4} />
            ) : (
              filteredCategoryTree.map(category => renderCategoryRow(category))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingCategory ? t('navigation.editCategory') : t('navigation.createCategory')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t('navigation.categoryName')} *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder={t('navigation.categoryNameRequired')}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('navigation.description')}</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder={t('navigation.descriptionPlaceholder')}
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('navigation.icon')}</Label>
                <Select
                  value={formData.icon}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, icon: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('navigation.icon')}>
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
              <div className="space-y-2">
                <Label>{t('navigation.sort')}</Label>
                <Input
                  type="number"
                  value={formData.sort}
                  onChange={(e) => setFormData(prev => ({ ...prev, sort: parseInt(e.target.value) || 0 }))}
                  placeholder="0"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t('navigation.parentCategory')}</Label>
              <Select
                value={formData.parent_id.toString()}
                onValueChange={(value) => setFormData(prev => ({ ...prev, parent_id: parseInt(value) }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('navigation.parentCategory')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">{t('navigation.noParent')}</SelectItem>
                  {topCategories.filter(c => c.id !== editingCategory?.id).map((category) => (
                    <SelectItem key={category.id} value={(category.id ?? 0).toString()}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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

// 网站管理组件
const NavigationManagement = () => {
  const { t } = useTranslation()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingNavigation, setEditingNavigation] = useState<Navigation | null>(null)
  const { deletingId: deletingNavigationId, handleDeleteClick, handleDeleteCancel, setButtonRef, getButtonRef, resetDeleting } = useDeleteConfirm<Navigation>()
  const [categories, setCategories] = useState<NavigationCategory[]>([])
  const [imageErrors, setImageErrors] = useState<Set<number>>(new Set())

  useEffect(() => {
    getNavigationCategoryList()
      .then(res => {
        // 展平所有分类（包括子分类），并添加层级信息
        const flattenCategories = (categories: NavigationCategory[], level: number = 0): any[] => {
          let result: any[] = []
          for (const category of categories) {
            // 添加当前分类
            const categoryWithLevel = { ...category, _level: level }
            result.push(categoryWithLevel)
            
            // 递归处理子分类
            if (category.children) {
              if (Array.isArray(category.children) && category.children.length > 0) {
                result = result.concat(flattenCategories(category.children, level + 1))
              }
            }
          }
          return result
        }
        
        const allCategories = Array.isArray(res) ? flattenCategories(res) : []
        setCategories(allCategories)
      })
      .catch(() => {})
  }, [])

  const [formData, setFormData] = useState({
    name: '',
    url: '',
    icon: '',
    description: '',
    category_id: 0,
    sort: 0,
    status: 1,
  })

  const {
    data: navigations,
    loading,
    total,
    page,
    pageSize,
    searchKeyword,
    handlePageChange,
    handleSearch,
    handleSearchSubmit,
    refresh,
  } = usePagination<Navigation>({
    fetchFn: async (params) => {
      const navigationsRes = await getNavigationList(params as NavigationListParams)
      return navigationsRes as NavigationListResponse
    },
    defaultPageSize: 10,
  })

  const handleCreate = () => {
    setEditingNavigation(null)
    setImageErrors(new Set())
    setFormData({
      name: '',
      url: '',
      icon: '',
      description: '',
      category_id: 0,
      sort: 0,
      status: 1,
    })
    setDialogOpen(true)
  }

  const handleEdit = (navigation: Navigation) => {
    setEditingNavigation(navigation)
    setImageErrors(new Set())
    setFormData({
      name: navigation.name,
      url: navigation.url,
      icon: navigation.icon || '',
      description: navigation.description || '',
      category_id: navigation.category_id || 0,
      sort: navigation.sort || 0,
      status: navigation.status,
    })
    setDialogOpen(true)
  }

  const handleDeleteConfirm = async (navigation: Navigation) => {
    try {
      await deleteNavigation(navigation.id!)
      toast.success(t('navigation.navigationDeleteSuccess'))
      resetDeleting()
      refresh()
    } catch (error: any) {
      resetDeleting()
    }
  }

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast.error(t('navigation.navigationNameRequired'))
      return
    }
    if (!formData.url.trim()) {
      toast.error(t('navigation.urlRequired'))
      return
    }
    try {
      if (editingNavigation) {
        await updateNavigation(editingNavigation.id!, formData)
        toast.success(t('navigation.navigationUpdateSuccess'))
      } else {
        await createNavigation(formData)
        toast.success(t('navigation.navigationCreateSuccess'))
      }
      setDialogOpen(false)
      refresh()
    } catch (error: any) {
      // 错误提示已在响应拦截器中根据错误码显示
    }
  }

  const handleStatusChange = async (navigation: Navigation, checked: boolean) => {
    try {
      await updateNavigation(navigation.id!, { ...navigation, status: checked ? 1 : 0 })
      toast.success(t('navigation.statusUpdateSuccess'))
      refresh()
    } catch (error: any) {
      // 错误提示已在响应拦截器中根据错误码显示
    }
  }

  return (
    <div className="space-y-4">
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
        <Button onClick={handleCreate}>
          <Plus className="h-4 w-4 mr-2" />
          {t('navigation.createNavigation')}
        </Button>
      </div>

      <div className="rounded-lg border bg-card overflow-x-auto">
        <Table className="text-sm">
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>{t('navigation.navigationName')}</TableHead>
              <TableHead>{t('navigation.url')}</TableHead>
              <TableHead>{t('navigation.category')}</TableHead>
              <TableHead>{t('navigation.sort')}</TableHead>
              <TableHead>{t('common.status')}</TableHead>
              <TableHead>{t('common.operation')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableEmpty colSpan={7} loading />
            ) : navigations.length === 0 ? (
              <TableEmpty colSpan={7} />
            ) : (
              navigations.map((navigation) => {
                const hasError = imageErrors.has(navigation.id!)
                return (
                  <TableRow key={navigation.id}>
                    <TableCell className="font-medium">{navigation.id}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {navigation.icon && !hasError ? (
                          <img
                            src={navigation.icon}
                            alt={navigation.name}
                            className="h-4 w-4 object-contain flex-shrink-0"
                            onError={() => {
                              setImageErrors(prev => new Set(prev).add(navigation.id!))
                            }}
                          />
                        ) : (
                          <Globe className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        )}
                        <span>{navigation.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      <a href={navigation.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                        {navigation.url}
                      </a>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {navigation.category?.name || '-'}
                    </TableCell>
                    <TableCell>{navigation.sort}</TableCell>
                    <TableCell>
                      <Switch
                        checked={navigation.status === 1}
                        onCheckedChange={(checked) => handleStatusChange(navigation, checked)}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="relative">
                        <TableActions>
                          <TableActionButton variant="edit" onClick={() => handleEdit(navigation)} />
                          <TableActionButton
                            variant="delete"
                            ref={(el) => setButtonRef(navigation.id!, el)}
                            onClick={() => handleDeleteClick(navigation)}
                          />
                        </TableActions>
                        <DeleteConfirmCard
                          isOpen={deletingNavigationId === navigation.id}
                          message={t('navigation.navigationDeleteConfirm', { name: navigation.name })}
                          onConfirm={() => handleDeleteConfirm(navigation)}
                          onCancel={handleDeleteCancel}
                          buttonRef={getButtonRef(navigation.id!)}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingNavigation ? t('navigation.editNavigation') : t('navigation.createNavigation')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('navigation.navigationName')} *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder={t('navigation.navigationNameRequired')}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('navigation.url')} *</Label>
                <Input
                  value={formData.url}
                  onChange={(e) => setFormData(prev => ({ ...prev, url: e.target.value }))}
                  placeholder="https://example.com"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t('navigation.iconUrl')}</Label>
              <Input
                value={formData.icon}
                onChange={(e) => setFormData(prev => ({ ...prev, icon: e.target.value }))}
                placeholder={t('navigation.iconUrlPlaceholder')}
              />
              {formData.icon && (
                <div className="flex items-center gap-2 mt-2">
                  <img
                    src={formData.icon}
                    alt="Preview"
                    className="h-6 w-6 object-contain border rounded"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none'
                    }}
                  />
                  <span className="text-xs text-muted-foreground">{t('navigation.iconPreview')}</span>
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('navigation.category')}</Label>
                <Select
                  value={formData.category_id.toString()}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, category_id: parseInt(value) }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('navigation.category')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">{t('navigation.noCategory')}</SelectItem>
                    {categories.map((category) => {
                      const level = (category as any)._level || 0
                      const indent = level > 0 ? '　'.repeat(level) : ''
                      const prefix = level > 0 ? '└─ ' : ''
                      return (
                        <SelectItem key={category.id} value={(category.id ?? 0).toString()}>
                          {indent}{prefix}{category.name}
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t('navigation.description')}</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder={t('navigation.descriptionPlaceholder')}
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('navigation.sort')}</Label>
                <Input
                  type="number"
                  value={formData.sort}
                  onChange={(e) => setFormData(prev => ({ ...prev, sort: parseInt(e.target.value) || 0 }))}
                  placeholder="0"
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

export default NavigationPage
