import request from './request'

export interface Menu {
  id?: number
  parent_id?: number | null
  name: string
  path: string
  icon?: string
  component?: string
  sort: number
  status: number
  children?: Menu[]
}

export interface MenuListParams {
  page?: number
  page_size?: number
  keyword?: string
}

export interface MenuListResponse {
  list: Menu[]
  total: number
  page: number
  page_size: number
}

// 获取菜单列表
// 如果带分页参数，返回分页数据
// 如果不带分页参数，返回树形结构
export const getMenuList = (params?: MenuListParams): Promise<MenuListResponse | Menu[]> => {
  return request.get('/menus', { params })
}

// 获取菜单详情
export const getMenuById = (id: number): Promise<Menu> => {
  return request.get(`/menus/${id}`)
}

// 创建菜单
export const createMenu = (data: Menu): Promise<Menu> => {
  return request.post('/menus', data)
}

// 更新菜单
export const updateMenu = (id: number, data: Partial<Menu>): Promise<void> => {
  return request.put(`/menus/${id}`, data)
}

// 删除菜单
export const deleteMenu = (id: number): Promise<void> => {
  return request.delete(`/menus/${id}`)
}
