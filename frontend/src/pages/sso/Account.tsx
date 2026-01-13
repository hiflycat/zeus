import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { User, Mail, Phone, Key, Shield, LogOut, Smartphone, Globe } from 'lucide-react'
import { Button, Input, Card, CardContent, CardHeader, CardTitle, Label, Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui-tw'

interface UserInfo {
  id: number
  username: string
  email: string
  display_name: string
  phone: string
  avatar: string
  tenant: {
    id: number
    name: string
  }
}

interface Session {
  id: string
  ip_address: string
  user_agent: string
  created_at: string
  current: boolean
}

interface AuthorizedApp {
  client_id: string
  name: string
  logo_url?: string
  scopes: string
  authorized_at: string
}

const SSOAccount = () => {
  const { t } = useTranslation()
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null)
  const [sessions, setSessions] = useState<Session[]>([])
  const [authorizedApps, setAuthorizedApps] = useState<AuthorizedApp[]>([])
  const [loading, setLoading] = useState(true)

  // 修改密码表单
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [changingPassword, setChangingPassword] = useState(false)

  useEffect(() => {
    document.title = t('sso.account.title')
    fetchUserInfo()
    fetchSessions()
    fetchAuthorizedApps()
  }, [t])

  const fetchUserInfo = async () => {
    try {
      const response = await fetch('/api/v1/sso/account/me')
      if (response.ok) {
        const data = await response.json()
        setUserInfo(data.data)
      }
    } catch (error) {
      console.error('Failed to fetch user info:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchSessions = async () => {
    try {
      const response = await fetch('/api/v1/sso/account/sessions')
      if (response.ok) {
        const data = await response.json()
        setSessions(data.data || [])
      }
    } catch (error) {
      console.error('Failed to fetch sessions:', error)
    }
  }

  const fetchAuthorizedApps = async () => {
    try {
      const response = await fetch('/api/v1/sso/account/authorized-apps')
      if (response.ok) {
        const data = await response.json()
        setAuthorizedApps(data.data || [])
      }
    } catch (error) {
      console.error('Failed to fetch authorized apps:', error)
    }
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newPassword !== confirmPassword) {
      toast.error(t('sso.account.security.passwordMismatch'))
      return
    }
    if (newPassword.length < 6) {
      toast.error(t('sso.account.security.passwordTooShort'))
      return
    }

    setChangingPassword(true)
    try {
      const response = await fetch('/api/v1/sso/account/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          old_password: oldPassword,
          new_password: newPassword,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.message || t('sso.account.security.changeFailed'))
      }

      toast.success(t('sso.account.security.changeSuccess'))
      setOldPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setChangingPassword(false)
    }
  }

  const handleRevokeSession = async (sessionId: string) => {
    try {
      const response = await fetch(`/api/v1/sso/account/sessions/${sessionId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error(t('sso.account.security.revokeFailed'))
      }

      toast.success(t('sso.account.security.revokeSuccess'))
      fetchSessions()
    } catch (error: any) {
      toast.error(error.message)
    }
  }

  const handleRevokeApp = async (clientId: string) => {
    try {
      const response = await fetch(`/api/v1/sso/account/authorized-apps/${clientId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error(t('sso.account.apps.revokeFailed'))
      }

      toast.success(t('sso.account.apps.revokeSuccess'))
      fetchAuthorizedApps()
    } catch (error: any) {
      toast.error(error.message)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* 用户信息卡片 */}
          <Card className="mb-6">
            <CardHeader>
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                  {userInfo?.display_name?.[0] || userInfo?.username?.[0] || 'U'}
                </div>
                <div>
                  <CardTitle className="text-xl">{userInfo?.display_name || userInfo?.username}</CardTitle>
                  <p className="text-gray-500">@{userInfo?.username}</p>
                  <p className="text-sm text-gray-400">{t('sso.account.tenant')}: {userInfo?.tenant?.name}</p>
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* 标签页 */}
          <Tabs defaultValue="profile" className="space-y-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="profile">
                <User className="w-4 h-4 mr-2" />
                {t('sso.account.tabs.profile')}
              </TabsTrigger>
              <TabsTrigger value="security">
                <Shield className="w-4 h-4 mr-2" />
                {t('sso.account.tabs.security')}
              </TabsTrigger>
              <TabsTrigger value="apps">
                <Globe className="w-4 h-4 mr-2" />
                {t('sso.account.tabs.apps')}
              </TabsTrigger>
            </TabsList>

            {/* 个人资料 */}
            <TabsContent value="profile">
              <Card>
                <CardContent className="pt-6 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>{t('sso.account.profile.username')}</Label>
                      <div className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                        <User className="w-4 h-4 text-gray-400" />
                        <span>{userInfo?.username}</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>{t('sso.account.profile.displayName')}</Label>
                      <div className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                        <User className="w-4 h-4 text-gray-400" />
                        <span>{userInfo?.display_name || '-'}</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>{t('sso.account.profile.email')}</Label>
                      <div className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                        <Mail className="w-4 h-4 text-gray-400" />
                        <span>{userInfo?.email || '-'}</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>{t('sso.account.profile.phone')}</Label>
                      <div className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                        <Phone className="w-4 h-4 text-gray-400" />
                        <span>{userInfo?.phone || '-'}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* 安全设置 */}
            <TabsContent value="security" className="space-y-4">
              {/* 修改密码 */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Key className="w-5 h-5" />
                    {t('sso.account.security.changePassword')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleChangePassword} className="space-y-4">
                    <div className="space-y-2">
                      <Label>{t('sso.account.security.currentPassword')}</Label>
                      <Input
                        type="password"
                        value={oldPassword}
                        onChange={(e) => setOldPassword(e.target.value)}
                        placeholder={t('sso.account.security.currentPasswordPlaceholder')}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>{t('sso.account.security.newPassword')}</Label>
                      <Input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder={t('sso.account.security.newPasswordPlaceholder')}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>{t('sso.account.security.confirmPassword')}</Label>
                      <Input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder={t('sso.account.security.confirmPasswordPlaceholder')}
                      />
                    </div>
                    <Button type="submit" disabled={changingPassword}>
                      {changingPassword ? t('sso.account.security.submitting') : t('sso.account.security.submit')}
                    </Button>
                  </form>
                </CardContent>
              </Card>

              {/* 登录会话 */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Smartphone className="w-5 h-5" />
                    {t('sso.account.security.sessions')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {sessions.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">{t('sso.account.security.noSessions')}</p>
                  ) : (
                    <div className="space-y-3">
                      {sessions.map((session) => (
                        <div key={session.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div>
                            <div className="font-medium flex items-center gap-2">
                              {session.user_agent?.includes('Mobile') ? (
                                <Smartphone className="w-4 h-4" />
                              ) : (
                                <Globe className="w-4 h-4" />
                              )}
                              {session.ip_address}
                              {session.current && (
                                <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">{t('sso.account.security.current')}</span>
                              )}
                            </div>
                            <div className="text-sm text-gray-500">{session.user_agent}</div>
                            <div className="text-xs text-gray-400">{session.created_at}</div>
                          </div>
                          {!session.current && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleRevokeSession(session.id)}
                            >
                              <LogOut className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* 已授权应用 */}
            <TabsContent value="apps">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">{t('sso.account.apps.title')}</CardTitle>
                </CardHeader>
                <CardContent>
                  {authorizedApps.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">{t('sso.account.apps.noApps')}</p>
                  ) : (
                    <div className="space-y-3">
                      {authorizedApps.map((app) => (
                        <div key={app.client_id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-3">
                            {app.logo_url ? (
                              <img src={app.logo_url} alt={app.name} className="w-10 h-10 rounded" />
                            ) : (
                              <div className="w-10 h-10 bg-gray-200 rounded flex items-center justify-center">
                                <Globe className="w-5 h-5 text-gray-400" />
                              </div>
                            )}
                            <div>
                              <div className="font-medium">{app.name}</div>
                              <div className="text-sm text-gray-500">{t('sso.account.apps.scopes')}: {app.scopes}</div>
                              <div className="text-xs text-gray-400">{t('sso.account.apps.authorizedAt')}: {app.authorized_at}</div>
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRevokeApp(app.client_id)}
                          >
                            {t('sso.account.apps.revoke')}
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>
    </div>
  )
}

export default SSOAccount
