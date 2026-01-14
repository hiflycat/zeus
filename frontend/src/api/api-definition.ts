import request from './request'

export interface APIDefinition {
  id?: number
  name: string
  path: string
  method: string
  resource: string
  description?: string
}

export interface APIDefinitionListParams {
  page?: number
  page_size?: number
  keyword?: string
  resource?: string
}

export interface APIDefinitionListResponse {
  list: APIDefinition[]
  total: number
  page: number
  page_size: number
}

// 获取 API 定义列表
export const getAPIDefinitionList = (params?: APIDefinitionListParams): Promise<APIDefinitionListResponse> => {
  return request.get('/api-definitions', { params })
}

// 获取 API 定义详情
export const getAPIDefinitionById = (id: number): Promise<APIDefinition> => {
  return request.get(`/api-definitions/${id}`)
}

// 创建 API 定义
export const createAPIDefinition = (data: APIDefinition): Promise<APIDefinition> => {
  return request.post('/api-definitions', data)
}

// 更新 API 定义
export const updateAPIDefinition = (id: number, data: APIDefinition): Promise<void> => {
  return request.put(`/api-definitions/${id}`, data)
}

// 删除 API 定义
export const deleteAPIDefinition = (id: number): Promise<void> => {
  return request.delete(`/api-definitions/${id}`)
}

// 获取所有资源类型
export const getAPIResources = (): Promise<string[]> => {
  return request.get('/api-definitions/resources')
}

// 获取所有 API 定义（用于角色分配）
export const getAllAPIDefinitions = (): Promise<APIDefinition[]> => {
  return request.get('/api-definitions/all')
}
