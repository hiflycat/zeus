import request from './request'

export interface Permission {
  id?: number
  name: string
  api: string
  method: string
  resource: string
  description?: string
}

export interface PermissionListParams {
  page?: number
  page_size?: number
  keyword?: string
  resource?: string
}

export interface PermissionListResponse {
  list: Permission[]
  total: number
  page: number
  page_size: number
}

// 获取权限列表
export const getPermissionList = (params?: PermissionListParams): Promise<PermissionListResponse> => {
  return request.get('/permissions', { params })
}

// 获取权限详情
export const getPermissionById = (id: number): Promise<Permission> => {
  return request.get(`/permissions/${id}`)
}

// 创建权限
export const createPermission = (data: Permission): Promise<Permission> => {
  return request.post('/permissions', data)
}

// 更新权限
export const updatePermission = (id: number, data: Permission): Promise<void> => {
  return request.put(`/permissions/${id}`, data)
}

// 删除权限
export const deletePermission = (id: number): Promise<void> => {
  return request.delete(`/permissions/${id}`)
}

// 获取所有资源类型
export const getResources = (): Promise<string[]> => {
  return request.get('/permissions/resources')
}

// 别名，兼容旧代码
export const getPermissionResources = getResources
