import request from './request'

export interface NavigationCategory {
  id?: number
  parent_id?: number | null
  name: string
  description?: string
  icon?: string
  sort: number
  children?: NavigationCategory[]
}

export interface Navigation {
  id?: number
  category_id?: number | null
  name: string
  url: string
  icon?: string
  description?: string
  sort: number
  status: number
  category?: NavigationCategory
}

export interface NavigationCategoryListParams {
  page?: number
  page_size?: number
  keyword?: string
}

export interface NavigationCategoryListResponse {
  list: NavigationCategory[]
  total: number
  page: number
  page_size: number
}

export interface NavigationListParams {
  page?: number
  page_size?: number
  keyword?: string
  category_id?: number
}

export interface NavigationListResponse {
  list: Navigation[]
  total: number
  page: number
  page_size: number
}

// 获取网站分类列表
// 如果带分页参数，返回分页数据
// 如果不带分页参数，返回树形结构
export const getNavigationCategoryList = (params?: NavigationCategoryListParams): Promise<NavigationCategoryListResponse | NavigationCategory[]> => {
  return request.get('/navigation-categories', { params })
}

// 获取网站分类详情
export const getNavigationCategoryById = (id: number): Promise<NavigationCategory> => {
  return request.get(`/navigation-categories/${id}`)
}

// 创建网站分类
export const createNavigationCategory = (data: NavigationCategory): Promise<NavigationCategory> => {
  return request.post('/navigation-categories', data)
}

// 更新网站分类
export const updateNavigationCategory = (id: number, data: Partial<NavigationCategory>): Promise<void> => {
  return request.put(`/navigation-categories/${id}`, data)
}

// 删除网站分类
export const deleteNavigationCategory = (id: number): Promise<void> => {
  return request.delete(`/navigation-categories/${id}`)
}

// 获取网站列表（分页）
export const getNavigationList = (params?: NavigationListParams): Promise<NavigationListResponse> => {
  return request.get('/navigations', { params })
}

// 获取网站详情
export const getNavigationById = (id: number): Promise<Navigation> => {
  return request.get(`/navigations/${id}`)
}

// 创建网站
export const createNavigation = (data: Navigation): Promise<Navigation> => {
  return request.post('/navigations', data)
}

// 更新网站
export const updateNavigation = (id: number, data: Partial<Navigation>): Promise<void> => {
  return request.put(`/navigations/${id}`, data)
}

// 删除网站
export const deleteNavigation = (id: number): Promise<void> => {
  return request.delete(`/navigations/${id}`)
}
