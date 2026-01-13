import { useState, useRef, useEffect } from 'react'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import { Plus, Search } from 'lucide-react'
import { DeleteConfirmCard } from '@/components/DeleteConfirmCard'
import { getPermissionList, createPermission, updatePermission, deletePermission, getPermissionResources, Permission, PermissionListParams } from '@/api/permission'
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
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
  Pagination,
} from '@/components/ui-tw'

const PermissionList = () => {
  const { t } = useTranslation()
  const [resources, setResources] = useState<string[]>([])
  const [filterResource, setFilterResource] = useState<string>('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingPermission, setEditingPermission] = useState<Permission | null>(null)
  const [formData, setFormData] = useState({ name: '', api: '', method: 'GET', resource: '', description: '' })
  const [deletingPermissionId, setDeletingPermissionId] = useState<number | null>(null)
  const deleteButtonRefs = useRef<Map<number, HTMLButtonElement>>(new Map())

  const {
    data: permissions,
    loading,
    total,
    page,
    pageSize,
    searchKeyword,
    handlePageChange,
    handleSearch,
    handleSearchSubmit,
    handleParamsChange,
    refresh,
  } = usePagination<Permission>({
    fetchFn: async (params) => {
      const permissionsRes = await getPermissionList(params as PermissionListParams)
      return permissionsRes
    },
    defaultPageSize: 10,
    defaultParams: { resource: '' },
  })

  // 获取资源类型列表（只需要加载一次）
  useEffect(() => {
    getPermissionResources()
      .then(res => setResources(res || []))
      .catch(() => {
        // 错误提示已在响应拦截器中根据错误码显示
      })
  }, [])

  const handleResourceFilterChange = (value: string) => {
    const newResource = value === '__all__' ? '' : value
    setFilterResource(newResource)
    handleParamsChange({ resource: newResource || undefined })
  }

  const handleCreate = () => {
    setEditingPermission(null)
    setFormData({ name: '', api: '', method: 'GET', resource: '', description: '' })
    setDialogOpen(true)
  }

  const handleEdit = (permission: Permission) => {
    setEditingPermission(permission)
    setFormData({
      name: permission.name,
      api: permission.api || '',
      method: permission.method || 'GET',
      resource: permission.resource || '',
      description: permission.description || '',
    })
    setDialogOpen(true)
  }

  const handleDeleteClick = (permission: Permission) => {
    setDeletingPermissionId(permission.id!)
  }

  const handleDeleteConfirm = async (permission: Permission) => {
    try {
      await deletePermission(permission.id!)
      toast.success(t('permission.deleteSuccess'))
      setDeletingPermissionId(null)
      refresh()
    } catch (error: any) {
      // 错误提示已在响应拦截器中根据错误码显示
      setDeletingPermissionId(null)
    }
  }

  const handleDeleteCancel = () => {
    setDeletingPermissionId(null)
  }

  const handleSubmit = async () => {
    if (!formData.name.trim() || !formData.api.trim() || !formData.method.trim()) {
      toast.error(t('permission.nameRequired'))
      return
    }
    try {
      if (editingPermission) {
        await updatePermission(editingPermission.id!, formData)
        toast.success(t('permission.updateSuccess'))
      } else {
        await createPermission(formData)
        toast.success(t('permission.createSuccess'))
      }
      setDialogOpen(false)
      refresh()
    } catch (error: any) {
      // 错误提示已在响应拦截器中根据错误码显示
    }
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('permission.searchPlaceholder')}
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
          <Select value={filterResource || '__all__'} onValueChange={handleResourceFilterChange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder={t('permission.filterResource')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">{t('permission.all')}</SelectItem>
              {resources.map((resource) => (
                <SelectItem key={resource} value={resource}>{resource}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="h-4 w-4 mr-2" />
          {t('permission.createPermission')}
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-lg border bg-card">
        <Table className="text-sm">
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">ID</TableHead>
              <TableHead>{t('permission.name')}</TableHead>
              <TableHead>{t('permission.method')}</TableHead>
              <TableHead>{t('permission.api')}</TableHead>
              <TableHead>{t('permission.resource')}</TableHead>
              <TableHead>{t('common.description')}</TableHead>
              <TableHead className="w-32">{t('common.operation')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableEmpty colSpan={7} loading />
            ) : permissions.length === 0 ? (
              <TableEmpty colSpan={7} />
            ) : (
              permissions.map((permission) => (
                <TableRow key={permission.id}>
                  <TableCell className="font-medium">{permission.id}</TableCell>
                  <TableCell>{permission.name}</TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${
                      permission.method === 'GET' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' :
                      permission.method === 'POST' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' :
                      permission.method === 'PUT' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300' :
                      permission.method === 'DELETE' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300' :
                      'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
                    }`}>{permission.method}</span>
                  </TableCell>
                  <TableCell>
                    <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{permission.api}</code>
                  </TableCell>
                  <TableCell>{permission.resource || '-'}</TableCell>
                  <TableCell className="text-muted-foreground max-w-xs truncate">{permission.description || '-'}</TableCell>
                  <TableCell>
                    <div className="relative">
                      <TableActions>
                        <TableActionButton variant="edit" onClick={() => handleEdit(permission)} />
                        <TableActionButton 
                          variant="delete" 
                          ref={(el) => {
                            if (el && permission.id) {
                              deleteButtonRefs.current.set(permission.id, el)
                            }
                          }}
                          onClick={() => handleDeleteClick(permission)} 
                        />
                      </TableActions>
                      <DeleteConfirmCard
                        isOpen={deletingPermissionId === permission.id}
                        message={t('permission.deleteConfirm', { name: permission.name })}
                        onConfirm={() => handleDeleteConfirm(permission)}
                        onCancel={handleDeleteCancel}
                        buttonRef={deleteButtonRefs.current.get(permission.id!) || null}
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
            <DialogTitle>{editingPermission ? t('permission.editPermission') : t('permission.createPermission')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t('permission.name')} *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder={t('permission.namePlaceholder')}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('permission.method')} *</Label>
              <Select
                value={formData.method}
                onValueChange={(value) => setFormData(prev => ({ ...prev, method: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('permission.selectMethod')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="GET">GET</SelectItem>
                  <SelectItem value="POST">POST</SelectItem>
                  <SelectItem value="PUT">PUT</SelectItem>
                  <SelectItem value="DELETE">DELETE</SelectItem>
                  <SelectItem value="PATCH">PATCH</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t('permission.api')} *</Label>
              <Input
                value={formData.api}
                onChange={(e) => setFormData(prev => ({ ...prev, api: e.target.value }))}
                placeholder={t('permission.apiPlaceholder')}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('permission.resource')}</Label>
              <Select
                value={formData.resource || '__none__'}
                onValueChange={(value) => setFormData(prev => ({ ...prev, resource: value === '__none__' ? '' : value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('permission.filterResource')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">{t('permission.none')}</SelectItem>
                  {resources.map((resource) => (
                    <SelectItem key={resource} value={resource}>{resource}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t('common.description')}</Label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder={t('permission.descriptionPlaceholder')}
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

export default PermissionList
