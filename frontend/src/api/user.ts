import request from './request'

export interface User {
  id?: number
  username: string
  password?: string
  email: string
  avatar?: string
  phone?: string
  status: number
  roles?: any[]
  role_ids?: number[]
}

export interface UserListParams {
  page?: number
  page_size?: number
  keyword?: string
}

export interface UserListResponse {
  list: User[]
  total: number
  page: number
  page_size: number
}

// 获取用户列表
export const getUserList = (params: UserListParams): Promise<UserListResponse> => {
  return request.get('/users', { params })
}

// 获取用户详情
export const getUserById = (id: number): Promise<User> => {
  return request.get(`/users/${id}`)
}

// 创建用户
export const createUser = (data: User): Promise<User> => {
  return request.post('/users', data)
}

// 更新用户
export const updateUser = (id: number, data: User): Promise<void> => {
  return request.put(`/users/${id}`, data)
}

// 删除用户
export const deleteUser = (id: number): Promise<void> => {
  return request.delete(`/users/${id}`)
}

// 分配角色
export const assignRoles = (id: number, roleIds: number[]): Promise<void> => {
  return request.post(`/users/${id}/roles`, { role_ids: roleIds })
}
