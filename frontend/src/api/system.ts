import request from './request'

// OIDC 配置接口
export interface OIDCConfig {
  enabled: boolean
  issuer: string
  client_id: string
  client_secret: string
  redirect_url: string
  scopes: string
  auto_create_user: boolean
  default_roles: string[]
}

// 获取 OIDC 配置
export const getOIDCConfig = (): Promise<OIDCConfig> => {
  return request.get('/system-config/oidc')
}

// 更新 OIDC 配置
export const updateOIDCConfig = (config: OIDCConfig): Promise<void> => {
  return request.put('/system-config/oidc', config)
}

export interface EmailConfig {
  enabled: boolean
  host: string
  port: number
  username: string
  password: string
  from: string
  from_addr: string
  use_tls: boolean
  use_ssl: boolean
}

// 获取邮箱配置
export const getEmailConfig = (): Promise<EmailConfig> => {
  return request.get('/system-config/email')
}

// 更新邮箱配置
export const updateEmailConfig = (data: EmailConfig): Promise<void> => {
  return request.put('/system-config/email', data)
}

// 测试邮箱配置
export const testEmail = (to: string): Promise<void> => {
  return request.post('/system-config/email/test', { to })
}

// 通用系统配置获取
export const getSystemConfig = (key: string): Promise<any> => {
  return request.get(`/system-config/${key}`)
}

// 通用系统配置保存
export const saveSystemConfig = (key: string, data: any): Promise<void> => {
  return request.put(`/system-config/${key}`, data)
}

// 发送测试邮件（兼容旧接口）
export const sendTestEmail = (to: string): Promise<void> => {
  return testEmail(to)
}

// 存储配置接口
export interface StorageConfig {
  provider: 'oss' | 's3'
  oss?: {
    endpoint: string
    access_key_id: string
    access_key_secret: string
    bucket: string
  }
  s3?: {
    region: string
    access_key_id: string
    secret_access_key: string
    bucket: string
    endpoint?: string
  }
}

// 获取存储配置
export const getStorageConfig = (): Promise<{ value: StorageConfig | null }> => {
  return request.get('/system-config/storage')
}

// 更新存储配置
export const updateStorageConfig = (config: StorageConfig): Promise<void> => {
  return request.put('/system-config/storage', { value: JSON.stringify(config) })
}

// 通知配置接口
export interface NotifyDingTalkConfig {
  enabled: boolean
  webhook: string
  secret: string
}

export interface NotifyWeChatConfig {
  enabled: boolean
  corp_id: string
  agent_id: string
  secret: string
}

export interface NotifyConfig {
  dingtalk: NotifyDingTalkConfig | null
  wechat: NotifyWeChatConfig | null
}

// 获取通知配置
export const getNotifyConfig = (): Promise<NotifyConfig> => {
  return request.get('/system-config/notify')
}

// 更新通知配置
export const updateNotifyConfig = (config: { dingtalk?: string; wechat?: string }): Promise<void> => {
  return request.put('/system-config/notify', config)
}
