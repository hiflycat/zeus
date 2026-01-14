import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import { Plus, Search } from 'lucide-react'
import { DeleteConfirmCard } from '@/components/DeleteConfirmCard'
import { useDeleteConfirm } from '@/hooks/useDeleteConfirm'
import { getAPIDefinitionList, createAPIDefinition, updateAPIDefinition, deleteAPIDefinition, getAPIResources, APIDefinition, APIDefinitionListParams } from '@/api/api-definition'
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

const APIList = () => {
  const { t } = useTranslation()
  const [resources, setResources] = useState<string[]>([])
  const [filterResource, setFilterResource] = useState<string>('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingAPI, setEditingAPI] = useState<APIDefinition | null>(null)
  const [formData, setFormData] = useState({ name: '', path: '', method: 'GET', resource: '', description: '' })
  const { deletingId, handleDeleteClick, handleDeleteCancel, setButtonRef, getButtonRef, resetDeleting } = useDeleteConfirm<APIDefinition>()

  const {
    data: apiDefinitions,
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
  } = usePagination<APIDefinition>({
    fetchFn: async (params) => {
      const res = await getAPIDefinitionList(params as APIDefinitionListParams)
      return res
    },
    defaultPageSize: 10,
    defaultParams: { resource: '' },
  })

  useEffect(() => {
    getAPIResources()
      .then(res => setResources(res || []))
      .catch(() => {})
  }, [])

  const handleResourceFilterChange = (value: string) => {
    const newResource = value === '__all__' ? '' : value
    setFilterResource(newResource)
    handleParamsChange({ resource: newResource || undefined })
  }

  const handleCreate = () => {
    setEditingAPI(null)
    setFormData({ name: '', path: '', method: 'GET', resource: '', description: '' })
    setDialogOpen(true)
  }

  const handleEdit = (api: APIDefinition) => {
    setEditingAPI(api)
    setFormData({
      name: api.name,
      path: api.path || '',
      method: api.method || 'GET',
      resource: api.resource || '',
      description: api.description || '',
    })
    setDialogOpen(true)
  }

  const handleDeleteConfirm = async (api: APIDefinition) => {
    try {
      await deleteAPIDefinition(api.id!)
      toast.success(t('api.deleteSuccess'))
      resetDeleting()
      refresh()
    } catch (error: any) {
      resetDeleting()
    }
  }

  const handleSubmit = async () => {
    if (!formData.name.trim() || !formData.path.trim() || !formData.method.trim()) {
      toast.error(t('api.nameRequired'))
      return
    }
    try {
      if (editingAPI) {
        await updateAPIDefinition(editingAPI.id!, formData)
        toast.success(t('api.updateSuccess'))
      } else {
        await createAPIDefinition(formData)
        toast.success(t('api.createSuccess'))
      }
      setDialogOpen(false)
      refresh()
    } catch (error: any) {}
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('api.searchPlaceholder')}
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
              <SelectValue placeholder={t('api.filterResource')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">{t('api.all')}</SelectItem>
              {resources.map((resource) => (
                <SelectItem key={resource} value={resource}>{resource}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="h-4 w-4 mr-2" />
          {t('api.createAPI')}
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-lg border bg-card">
        <Table className="text-sm">
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">ID</TableHead>
              <TableHead>{t('api.name')}</TableHead>
              <TableHead>{t('api.method')}</TableHead>
              <TableHead>{t('api.path')}</TableHead>
              <TableHead>{t('api.resource')}</TableHead>
              <TableHead>{t('common.description')}</TableHead>
              <TableHead className="w-32">{t('common.operation')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableEmpty colSpan={7} loading />
            ) : apiDefinitions.length === 0 ? (
              <TableEmpty colSpan={7} />
            ) : (
              apiDefinitions.map((api) => (
                <TableRow key={api.id}>
                  <TableCell className="font-medium">{api.id}</TableCell>
                  <TableCell>{api.name}</TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${
                      api.method === 'GET' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' :
                      api.method === 'POST' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' :
                      api.method === 'PUT' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300' :
                      api.method === 'DELETE' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300' :
                      'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
                    }`}>{api.method}</span>
                  </TableCell>
                  <TableCell>
                    <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{api.path}</code>
                  </TableCell>
                  <TableCell>{api.resource || '-'}</TableCell>
                  <TableCell className="text-muted-foreground max-w-xs truncate">{api.description || '-'}</TableCell>
                  <TableCell>
                    <div className="relative">
                      <TableActions>
                        <TableActionButton variant="edit" onClick={() => handleEdit(api)} />
                        <TableActionButton
                          variant="delete"
                          ref={(el) => setButtonRef(api.id!, el)}
                          onClick={() => handleDeleteClick(api)}
                        />
                      </TableActions>
                      <DeleteConfirmCard
                        isOpen={deletingId === api.id}
                        message={t('api.deleteConfirm', { name: api.name })}
                        onConfirm={() => handleDeleteConfirm(api)}
                        onCancel={handleDeleteCancel}
                        buttonRef={getButtonRef(api.id!)}
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
            <DialogTitle>{editingAPI ? t('api.editAPI') : t('api.createAPI')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t('api.name')} *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder={t('api.namePlaceholder')}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('api.method')} *</Label>
              <Select
                value={formData.method}
                onValueChange={(value) => setFormData(prev => ({ ...prev, method: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('api.selectMethod')} />
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
              <Label>{t('api.path')} *</Label>
              <Input
                value={formData.path}
                onChange={(e) => setFormData(prev => ({ ...prev, path: e.target.value }))}
                placeholder={t('api.pathPlaceholder')}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('api.resource')}</Label>
              <Select
                value={formData.resource || '__none__'}
                onValueChange={(value) => setFormData(prev => ({ ...prev, resource: value === '__none__' ? '' : value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('api.filterResource')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">{t('api.none')}</SelectItem>
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
                placeholder={t('api.descriptionPlaceholder')}
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

export default APIList
