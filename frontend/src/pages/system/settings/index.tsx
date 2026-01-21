import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import { Save, Send, RefreshCw } from 'lucide-react'
import { getSystemConfig, saveSystemConfig, sendTestEmail, getStorageConfig, updateStorageConfig, getNotifyConfig, updateNotifyConfig, StorageConfig, NotifyDingTalkConfig, NotifyWeChatConfig } from '@/api/system'
import { getRoleList, Role } from '@/api/role'
import {
  Button,
  Input,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Label,
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
} from '@/components/ui-tw'
import { ChevronDown } from 'lucide-react'

interface OIDCConfig {
  enabled: boolean
  issuer: string
  client_id: string
  client_secret: string
  redirect_url: string
  scopes: string
  auto_create_user: boolean
  default_roles: number[]
}

interface EmailConfig {
  enabled: boolean
  host: string
  port: number
  username: string
  password: string
  from_addr: string
  use_tls: boolean
  use_ssl: boolean
}

const SystemSettings = () => {
  const { t } = useTranslation()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [testingEmail, setTestingEmail] = useState(false)
  const [testEmail, setTestEmail] = useState('')
  const [roles, setRoles] = useState<Role[]>([])
  const [loadingRoles, setLoadingRoles] = useState(false)

  const [oidcConfig, setOidcConfig] = useState<OIDCConfig>({
    enabled: false,
    issuer: '',
    client_id: '',
    client_secret: '',
    redirect_url: '',
    scopes: 'openid profile email',
    auto_create_user: true,
    default_roles: [],
  })

  const [emailConfig, setEmailConfig] = useState<EmailConfig>({
    enabled: false,
    host: '',
    port: 587,
    username: '',
    password: '',
    from_addr: '',
    use_tls: true,
    use_ssl: false,
  })

  // Storage config state
  const [storageConfig, setStorageConfig] = useState<StorageConfig>({
    provider: 'oss',
    oss: {
      endpoint: '',
      access_key_id: '',
      access_key_secret: '',
      bucket: '',
    },
    s3: {
      region: '',
      access_key_id: '',
      secret_access_key: '',
      bucket: '',
      endpoint: '',
    },
  })

  // Notify config state
  const [dingtalkConfig, setDingtalkConfig] = useState<NotifyDingTalkConfig>({
    enabled: false,
    webhook: '',
    secret: '',
  })

  const [wechatConfig, setWechatConfig] = useState<NotifyWeChatConfig>({
    enabled: false,
    corp_id: '',
    agent_id: '',
    secret: '',
  })

  const fetchConfig = async () => {
    setLoading(true)
    try {
      const [oidcRes, emailRes, storageRes, notifyRes] = await Promise.all([
        getSystemConfig('oidc'),
        getSystemConfig('email'),
        getStorageConfig(),
        getNotifyConfig(),
      ])
      if (oidcRes) {
        setOidcConfig(prev => ({
          ...prev,
          ...oidcRes,
          default_roles: Array.isArray(oidcRes.default_roles) ? oidcRes.default_roles : []
        }))
      }
      if (emailRes) setEmailConfig(prev => ({ ...prev, ...emailRes }))
      if (storageRes?.value) {
        try {
          const parsed = typeof storageRes.value === 'string'
            ? JSON.parse(storageRes.value)
            : storageRes.value
          setStorageConfig(prev => ({ ...prev, ...parsed }))
        } catch (e) {
          // ignore parse error
        }
      }
      if (notifyRes) {
        if (notifyRes.dingtalk) {
          try {
            const parsed = typeof notifyRes.dingtalk === 'string'
              ? JSON.parse(notifyRes.dingtalk)
              : notifyRes.dingtalk
            if (parsed?.Value) {
              const innerParsed = JSON.parse(parsed.Value)
              setDingtalkConfig(prev => ({ ...prev, ...innerParsed }))
            } else {
              setDingtalkConfig(prev => ({ ...prev, ...parsed }))
            }
          } catch (e) {
            // ignore parse error
          }
        }
        if (notifyRes.wechat) {
          try {
            const parsed = typeof notifyRes.wechat === 'string'
              ? JSON.parse(notifyRes.wechat)
              : notifyRes.wechat
            if (parsed?.Value) {
              const innerParsed = JSON.parse(parsed.Value)
              setWechatConfig(prev => ({ ...prev, ...innerParsed }))
            } else {
              setWechatConfig(prev => ({ ...prev, ...parsed }))
            }
          } catch (e) {
            // ignore parse error
          }
        }
      }
    } catch (error) {
    } finally {
      setLoading(false)
    }
  }

  const fetchRoles = async () => {
    setLoadingRoles(true)
    try {
      const res = await getRoleList({ page: 1, page_size: 1000 })
      setRoles((res.list || []).filter(role => role.id))
    } catch (error) {
    } finally {
      setLoadingRoles(false)
    }
  }

  useEffect(() => {
    fetchConfig()
    fetchRoles()
  }, [])

  const handleSaveOIDC = async () => {
    setSaving(true)
    try {
      await saveSystemConfig('oidc', oidcConfig)
      toast.success(t('system.saveSuccess'))
    } catch (error: any) {
    } finally {
      setSaving(false)
    }
  }

  const handleSaveEmail = async () => {
    setSaving(true)
    try {
      await saveSystemConfig('email', emailConfig)
      toast.success(t('system.emailSaveSuccess'))
    } catch (error: any) {
    } finally {
      setSaving(false)
    }
  }

  const handleSaveStorage = async () => {
    setSaving(true)
    try {
      await updateStorageConfig(storageConfig)
      toast.success(t('system.saveSuccess'))
    } catch (error: any) {
    } finally {
      setSaving(false)
    }
  }

  const handleSaveNotify = async () => {
    setSaving(true)
    try {
      await updateNotifyConfig({
        dingtalk: JSON.stringify(dingtalkConfig),
        wechat: JSON.stringify(wechatConfig),
      })
      toast.success(t('system.saveSuccess'))
    } catch (error: any) {
    } finally {
      setSaving(false)
    }
  }

  const handleTestEmail = async () => {
    if (!testEmail.trim()) {
      toast.error(t('system.testEmailRequired'))
      return
    }
    setTestingEmail(true)
    try {
      await sendTestEmail(testEmail)
      toast.success(t('system.sendSuccess'))
    } catch (error: any) {
    } finally {
      setTestingEmail(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="oidc" className="w-full">
        <TabsList>
          <TabsTrigger value="oidc">{t('system.oidcTab')}</TabsTrigger>
          <TabsTrigger value="email">{t('system.emailTab')}</TabsTrigger>
          <TabsTrigger value="storage">{t('system.storageTab', '存储配置')}</TabsTrigger>
          <TabsTrigger value="notify">{t('system.notifyTab', '通知配置')}</TabsTrigger>
        </TabsList>

        {/* OIDC Configuration */}
        <TabsContent value="oidc" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('system.oidcTitle')}</CardTitle>
              <CardDescription>{t('system.oidcDesc')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t('system.enabledStatus')}</Label>
                  <Select
                    value={oidcConfig.enabled ? 'true' : 'false'}
                    onValueChange={(value) => setOidcConfig(prev => ({ ...prev, enabled: value === 'true' }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="true">{t('common.enabled')}</SelectItem>
                      <SelectItem value="false">{t('common.disabled')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t('system.autoCreateUser')}</Label>
                  <Select
                    value={oidcConfig.auto_create_user ? 'true' : 'false'}
                    onValueChange={(value) => setOidcConfig(prev => ({ ...prev, auto_create_user: value === 'true' }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="true">{t('common.enabled')}</SelectItem>
                      <SelectItem value="false">{t('common.disabled')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t('system.issuer')}</Label>
                  <Input
                    value={oidcConfig.issuer}
                    onChange={(e) => setOidcConfig(prev => ({ ...prev, issuer: e.target.value }))}
                    placeholder="https://auth.example.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('system.clientId')}</Label>
                  <Input
                    value={oidcConfig.client_id}
                    onChange={(e) => setOidcConfig(prev => ({ ...prev, client_id: e.target.value }))}
                    placeholder="your-client-id"
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('system.clientSecret')}</Label>
                  <Input
                    type="password"
                    value={oidcConfig.client_secret}
                    onChange={(e) => setOidcConfig(prev => ({ ...prev, client_secret: e.target.value }))}
                    placeholder="your-client-secret"
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('system.redirectUrl')}</Label>
                  <Input
                    value={oidcConfig.redirect_url}
                    onChange={(e) => setOidcConfig(prev => ({ ...prev, redirect_url: e.target.value }))}
                    placeholder="http://localhost:3000/auth/oidc/callback"
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('system.scopes')}</Label>
                  <Input
                    value={oidcConfig.scopes}
                    onChange={(e) => setOidcConfig(prev => ({ ...prev, scopes: e.target.value }))}
                    placeholder="openid profile email"
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('system.defaultRoles')}</Label>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild disabled={loadingRoles}>
                      <Button variant="outline" className="w-full justify-between font-normal">
                        {loadingRoles ? (
                          <span className="text-muted-foreground">{t('common.loading')}</span>
                        ) : oidcConfig.default_roles.length > 0 ? (
                          <span className="truncate">
                            {oidcConfig.default_roles.map(id => {
                              const role = roles.find(r => r.id === id)
                              return role ? role.name : `ID:${id}`
                            }).join(', ')}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">{t('role.selectRole')}</span>
                        )}
                        <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-[var(--radix-dropdown-menu-trigger-width)]">
                      {roles.length === 0 ? (
                        <div className="py-2 px-2 text-sm text-muted-foreground text-center">
                          {t('role.noRoles')}
                        </div>
                      ) : (
                        roles.filter(role => role.id).map((role) => (
                          <DropdownMenuCheckboxItem
                            key={role.id}
                            checked={oidcConfig.default_roles.includes(role.id!)}
                            onSelect={(e) => {
                              e.preventDefault()
                            }}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setOidcConfig(prev => ({
                                  ...prev,
                                  default_roles: [...prev.default_roles, role.id!]
                                }))
                              } else {
                                setOidcConfig(prev => ({
                                  ...prev,
                                  default_roles: prev.default_roles.filter(id => id !== role.id)
                                }))
                              }
                            }}
                          >
                            {role.name}
                          </DropdownMenuCheckboxItem>
                        ))
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
              <div className="flex justify-end">
                <Button onClick={handleSaveOIDC} disabled={saving}>
                  <Save className="h-4 w-4 mr-2" />
                  {t('common.save')}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Email Configuration */}
        <TabsContent value="email" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('system.emailConfigTitle')}</CardTitle>
              <CardDescription>{t('system.emailConfigDesc')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t('system.enabledStatus')}</Label>
                  <Select
                    value={emailConfig.enabled ? 'true' : 'false'}
                    onValueChange={(value) => setEmailConfig(prev => ({ ...prev, enabled: value === 'true' }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="true">{t('common.enabled')}</SelectItem>
                      <SelectItem value="false">{t('common.disabled')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t('system.useTls')}</Label>
                  <Select
                    value={emailConfig.use_tls ? 'true' : 'false'}
                    onValueChange={(value) => setEmailConfig(prev => ({ ...prev, use_tls: value === 'true' }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="true">{t('common.enabled')}</SelectItem>
                      <SelectItem value="false">{t('common.disabled')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t('system.host')}</Label>
                  <Input
                    value={emailConfig.host}
                    onChange={(e) => setEmailConfig(prev => ({ ...prev, host: e.target.value }))}
                    placeholder="smtp.example.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('system.port')}</Label>
                  <Input
                    type="number"
                    value={emailConfig.port}
                    onChange={(e) => setEmailConfig(prev => ({ ...prev, port: parseInt(e.target.value) || 587 }))}
                    placeholder="587"
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('system.username')}</Label>
                  <Input
                    value={emailConfig.username}
                    onChange={(e) => setEmailConfig(prev => ({ ...prev, username: e.target.value }))}
                    placeholder="your-email@example.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('system.password')}</Label>
                  <Input
                    type="password"
                    value={emailConfig.password}
                    onChange={(e) => setEmailConfig(prev => ({ ...prev, password: e.target.value }))}
                    placeholder="your-password"
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('system.fromAddr')}</Label>
                  <Input
                    value={emailConfig.from_addr}
                    onChange={(e) => setEmailConfig(prev => ({ ...prev, from_addr: e.target.value }))}
                    placeholder="noreply@example.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('system.testEmail')}</Label>
                  <div className="flex gap-2">
                    <Input
                      value={testEmail}
                      onChange={(e) => setTestEmail(e.target.value)}
                      placeholder="test@example.com"
                    />
                    <Button variant="outline" onClick={handleTestEmail} disabled={testingEmail}>
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
              <div className="flex justify-end">
                <Button onClick={handleSaveEmail} disabled={saving}>
                  <Save className="h-4 w-4 mr-2" />
                  {t('common.save')}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Storage Configuration */}
        <TabsContent value="storage" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('system.storageTitle', '存储配置')}</CardTitle>
              <CardDescription>{t('system.storageDesc', '配置对象存储服务 (OSS/S3)')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t('system.storageProvider', '存储类型')}</Label>
                  <Select
                    value={storageConfig.provider}
                    onValueChange={(value: 'oss' | 's3') => setStorageConfig(prev => ({ ...prev, provider: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="oss">OSS (阿里云)</SelectItem>
                      <SelectItem value="s3">S3 (AWS)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {storageConfig.provider === 'oss' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Endpoint</Label>
                    <Input
                      value={storageConfig.oss?.endpoint || ''}
                      onChange={(e) => setStorageConfig(prev => ({
                        ...prev,
                        oss: { ...prev.oss!, endpoint: e.target.value }
                      }))}
                      placeholder="oss-cn-hangzhou.aliyuncs.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Access Key ID</Label>
                    <Input
                      value={storageConfig.oss?.access_key_id || ''}
                      onChange={(e) => setStorageConfig(prev => ({
                        ...prev,
                        oss: { ...prev.oss!, access_key_id: e.target.value }
                      }))}
                      placeholder="your-access-key-id"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Access Key Secret</Label>
                    <Input
                      type="password"
                      value={storageConfig.oss?.access_key_secret || ''}
                      onChange={(e) => setStorageConfig(prev => ({
                        ...prev,
                        oss: { ...prev.oss!, access_key_secret: e.target.value }
                      }))}
                      placeholder="your-access-key-secret"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Bucket</Label>
                    <Input
                      value={storageConfig.oss?.bucket || ''}
                      onChange={(e) => setStorageConfig(prev => ({
                        ...prev,
                        oss: { ...prev.oss!, bucket: e.target.value }
                      }))}
                      placeholder="your-bucket-name"
                    />
                  </div>
                </div>
              )}

              {storageConfig.provider === 's3' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Region</Label>
                    <Input
                      value={storageConfig.s3?.region || ''}
                      onChange={(e) => setStorageConfig(prev => ({
                        ...prev,
                        s3: { ...prev.s3!, region: e.target.value }
                      }))}
                      placeholder="us-east-1"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Access Key ID</Label>
                    <Input
                      value={storageConfig.s3?.access_key_id || ''}
                      onChange={(e) => setStorageConfig(prev => ({
                        ...prev,
                        s3: { ...prev.s3!, access_key_id: e.target.value }
                      }))}
                      placeholder="your-access-key-id"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Secret Access Key</Label>
                    <Input
                      type="password"
                      value={storageConfig.s3?.secret_access_key || ''}
                      onChange={(e) => setStorageConfig(prev => ({
                        ...prev,
                        s3: { ...prev.s3!, secret_access_key: e.target.value }
                      }))}
                      placeholder="your-secret-access-key"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Bucket</Label>
                    <Input
                      value={storageConfig.s3?.bucket || ''}
                      onChange={(e) => setStorageConfig(prev => ({
                        ...prev,
                        s3: { ...prev.s3!, bucket: e.target.value }
                      }))}
                      placeholder="your-bucket-name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Endpoint ({t('common.optional', '可选')})</Label>
                    <Input
                      value={storageConfig.s3?.endpoint || ''}
                      onChange={(e) => setStorageConfig(prev => ({
                        ...prev,
                        s3: { ...prev.s3!, endpoint: e.target.value }
                      }))}
                      placeholder="s3.amazonaws.com"
                    />
                  </div>
                </div>
              )}

              <div className="flex justify-end">
                <Button onClick={handleSaveStorage} disabled={saving}>
                  <Save className="h-4 w-4 mr-2" />
                  {t('common.save')}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notify Configuration */}
        <TabsContent value="notify" className="mt-6">
          <div className="space-y-6">
            {/* DingTalk Configuration */}
            <Card>
              <CardHeader>
                <CardTitle>{t('system.dingtalkTitle', '钉钉通知')}</CardTitle>
                <CardDescription>{t('system.dingtalkDesc', '配置钉钉机器人 Webhook 通知')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t('system.enabledStatus')}</Label>
                    <Select
                      value={dingtalkConfig.enabled ? 'true' : 'false'}
                      onValueChange={(value) => setDingtalkConfig(prev => ({ ...prev, enabled: value === 'true' }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="true">{t('common.enabled')}</SelectItem>
                        <SelectItem value="false">{t('common.disabled')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Webhook URL</Label>
                    <Input
                      value={dingtalkConfig.webhook}
                      onChange={(e) => setDingtalkConfig(prev => ({ ...prev, webhook: e.target.value }))}
                      placeholder="https://oapi.dingtalk.com/robot/send?access_token=xxx"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Secret ({t('common.optional', '可选')})</Label>
                    <Input
                      type="password"
                      value={dingtalkConfig.secret}
                      onChange={(e) => setDingtalkConfig(prev => ({ ...prev, secret: e.target.value }))}
                      placeholder="SECxxxx"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* WeChat Configuration */}
            <Card>
              <CardHeader>
                <CardTitle>{t('system.wechatTitle', '企业微信通知')}</CardTitle>
                <CardDescription>{t('system.wechatDesc', '配置企业微信应用消息通知')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t('system.enabledStatus')}</Label>
                    <Select
                      value={wechatConfig.enabled ? 'true' : 'false'}
                      onValueChange={(value) => setWechatConfig(prev => ({ ...prev, enabled: value === 'true' }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="true">{t('common.enabled')}</SelectItem>
                        <SelectItem value="false">{t('common.disabled')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Corp ID</Label>
                    <Input
                      value={wechatConfig.corp_id}
                      onChange={(e) => setWechatConfig(prev => ({ ...prev, corp_id: e.target.value }))}
                      placeholder="your-corp-id"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Agent ID</Label>
                    <Input
                      value={wechatConfig.agent_id}
                      onChange={(e) => setWechatConfig(prev => ({ ...prev, agent_id: e.target.value }))}
                      placeholder="your-agent-id"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Secret</Label>
                    <Input
                      type="password"
                      value={wechatConfig.secret}
                      onChange={(e) => setWechatConfig(prev => ({ ...prev, secret: e.target.value }))}
                      placeholder="your-secret"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button onClick={handleSaveNotify} disabled={saving}>
                <Save className="h-4 w-4 mr-2" />
                {t('common.save')}
              </Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default SystemSettings
