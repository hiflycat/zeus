import request from './request'

export interface LoginParams {
  username: string
  password: string
}

export interface LoginResponse {
  token: string
  id_token?: string
  user: {
    id: number
    username: string
    email: string
    avatar?: string
  }
}

export interface UserInfo {
  id: number
  username: string
  email: string
  avatar?: string
  phone?: string
  status: number
  roles: any[]
}

// 登录
export const login = (params: LoginParams): Promise<LoginResponse> => {
  return request.post('/auth/login', params)
}

// 获取当前用户信息
export const getCurrentUser = (): Promise<UserInfo> => {
  return request.get('/auth/me')
}

// 登出
export const logout = (): Promise<void> => {
  return request.post('/auth/logout')
}

// 获取用户菜单
export const getUserMenus = (): Promise<any[]> => {
  return request.get('/auth/menus')
}

// 服务器信息接口
export interface ServerInfo {
  name: string
  oidc?: {
    enabled: boolean
    auth_url?: string
    issuer?: string
    client_id?: string
    redirect_url?: string
    scopes?: string
  }
}

// 获取服务器信息
export const getServerInfo = (): Promise<ServerInfo> => {
  return request.get('/server/info')
}

// 修改密码请求参数
export interface ChangePasswordParams {
  old_password: string
  new_password: string
  confirm_password: string
}

// 修改密码
export const changePassword = (params: ChangePasswordParams): Promise<void> => {
  return request.post('/auth/change-password', params)
}

// OIDC 相关接口
export interface OIDCEnabledResponse {
  enabled: boolean
}

export interface OIDCAuthURLResponse {
  auth_url: string
  state: string
}

// OIDC 回调登录
export const oidcCallback = (code: string): Promise<LoginResponse> => {
  return request.get('/auth/oidc/callback', { params: { code } })
}
