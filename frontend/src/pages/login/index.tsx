import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import { Eye, EyeOff, Lock, User, ExternalLink } from 'lucide-react'
import { useAuthStore } from '@/store/auth'
import { getServerInfo, ServerInfo } from '@/api/auth'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { Button, Input, Card, CardContent, CardHeader, CardTitle, CardDescription, Label } from '@/components/ui-tw'

const Login = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { login, isAuthenticated } = useAuthStore()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [serverInfo, setServerInfo] = useState<ServerInfo | null>(null)

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true })
    }
  }, [isAuthenticated, navigate])

  useEffect(() => {
    getServerInfo()
      .then(setServerInfo)
      .catch(console.error)
  }, [])

  useEffect(() => {
    if (serverInfo?.name) {
      document.title = `${t('auth.login')} - ${serverInfo.name}`
    }
  }, [serverInfo, t])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!username.trim() || !password.trim()) {
      toast.error(t('auth.username') + ' / ' + t('auth.password'))
      return
    }
    setLoading(true)
    try {
      await login({ username, password })
      toast.success(t('auth.loginSuccess'))
      navigate('/dashboard', { replace: true })
    } catch (error: any) {
      // 错误提示已在响应拦截器中根据错误码显示
    } finally {
      setLoading(false)
    }
  }

  const handleOIDCLogin = async () => {
    if (!serverInfo?.oidc?.enabled) return

    // 如果有 auth_url 直接使用，否则从 issuer 获取
    const authUrl = serverInfo.oidc.auth_url
    const issuer = serverInfo.oidc.issuer

    if (!authUrl && !issuer) {
      toast.error(t('auth.oidcConfigIncomplete'))
      return
    }

    const state = Math.random().toString(36).substring(7)
    sessionStorage.setItem('oidc_state', state)

    try {
      let authEndpoint: string

      if (authUrl) {
        // 直接使用配置的 auth_url
        authEndpoint = authUrl
      } else {
        // 从 issuer 获取 authorization_endpoint
        const configResponse = await fetch(`${issuer}/.well-known/openid-configuration`)
        const oidcConfig = await configResponse.json()
        authEndpoint = oidcConfig.authorization_endpoint
      }

      const params = new URLSearchParams({
        client_id: serverInfo.oidc.client_id || '',
        redirect_uri: serverInfo.oidc.redirect_url || '',
        response_type: 'code',
        scope: serverInfo.oidc.scopes || 'openid profile email',
        state,
      })

      window.location.href = `${authEndpoint}?${params.toString()}`
    } catch (error) {
      toast.error(t('auth.oidcConfigFailed'))
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4 relative">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-secondary/10 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-md"
      >
        <Card className="border-0 shadow-2xl">
          <CardHeader className="text-center pb-2">
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.3, delay: 0.2 }}
            >
              <div className="mx-auto w-16 h-16 bg-gradient-to-br from-primary to-primary/80 rounded-xl flex items-center justify-center mb-4 shadow-lg">
                <Lock className="w-8 h-8 text-primary-foreground" />
              </div>
            </motion.div>
            <div className="flex items-center justify-center gap-2 mb-2">
              <CardTitle className="text-2xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
                {serverInfo?.name || t('auth.defaultSystemName')}
              </CardTitle>
              <LanguageSwitcher />
            </div>
            <CardDescription>
              {t('auth.login')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">{t('auth.username')}</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="username"
                    type="text"
                    placeholder={t('auth.username')}
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="pl-10"
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">{t('auth.password')}</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder={t('auth.password')}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                    {t('common.loading')}
                  </span>
                ) : t('auth.login')}
              </Button>
            </form>

            {serverInfo?.oidc?.enabled && (
              <>
                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">{t('auth.or')}</span>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={handleOIDCLogin}
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  {t('auth.ssoLogin')}
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        <p className="text-center text-sm text-muted-foreground mt-6">
          © {new Date().getFullYear()} {serverInfo?.name || t('auth.defaultSystemName')}
        </p>
      </motion.div>
    </div>
  )
}

export default Login
