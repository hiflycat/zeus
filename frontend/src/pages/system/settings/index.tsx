import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import { Save, Send, RefreshCw } from 'lucide-react'
import { getSystemConfig, saveSystemConfig, sendTestEmail } from '@/api/system'
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

  const fetchConfig = async () => {
    setLoading(true)
    try {
      const [oidcRes, emailRes] = await Promise.all([
        getSystemConfig('oidc'),
        getSystemConfig('email'),
      ])
      if (oidcRes) {
        setOidcConfig(prev => ({
          ...prev,
          ...oidcRes,
          // 确保 default_roles 始终是数组
          default_roles: Array.isArray(oidcRes.default_roles) ? oidcRes.default_roles : []
        }))
      }
      if (emailRes) setEmailConfig(prev => ({ ...prev, ...emailRes }))
    } catch (error) {
    } finally {
      setLoading(false)
    }
  }

  // 获取角色列表
  const fetchRoles = async () => {
    setLoadingRoles(true)
    try {
      const res = await getRoleList({ page: 1, page_size: 1000 })
      // 过滤掉 code 为空或 undefined 的角色
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
      // 错误提示已在响应拦截器中根据错误码显示
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
      // 错误提示已在响应拦截器中根据错误码显示
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
      // 错误提示已在响应拦截器中根据错误码显示
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
      </Tabs>
    </div>
  )
}

export default SystemSettings
