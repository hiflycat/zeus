import request from './request'

export interface Role {
  id?: number
  name: string
  description?: string
  status: number
  menus?: any[]
}

export interface RoleListParams {
  page?: number
  page_size?: number
  keyword?: string
}

export interface RoleListResponse {
  list: Role[]
  total: number
  page: number
  page_size: number
}

// 获取角色列表
export const getRoleList = (params?: RoleListParams): Promise<RoleListResponse> => {
  return request.get('/roles', { params })
}

// 获取角色详情
export const getRoleById = (id: number): Promise<Role> => {
  return request.get(`/roles/${id}`)
}

// 创建角色
export const createRole = (data: Role): Promise<Role> => {
  return request.post('/roles', data)
}

// 更新角色
export const updateRole = (id: number, data: Role): Promise<void> => {
  return request.put(`/roles/${id}`, data)
}

// 删除角色
export const deleteRole = (id: number): Promise<void> => {
  return request.delete(`/roles/${id}`)
}

// 获取角色的 API 权限 ID 列表
export const getRolePolicies = (id: number): Promise<number[]> => {
  return request.get(`/roles/${id}/policies`)
}

// 分配 API 权限
export const assignPolicies = (id: number, apiDefIds: number[]): Promise<void> => {
  return request.post(`/roles/${id}/policies`, { api_def_ids: apiDefIds })
}

// 分配菜单
export const assignMenus = (id: number, menuIds: number[]): Promise<void> => {
  return request.post(`/roles/${id}/menus`, { menu_ids: menuIds })
}
