import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { Eye, EyeOff, Lock, User } from 'lucide-react'
import { Button, Input, Card, CardContent, CardHeader, CardTitle, CardDescription, Label } from '@/components/ui-tw'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'

interface SSOLoginProps {
  onLogin?: (token: string) => void
}

const SSOLogin = ({ onLogin }: SSOLoginProps) => {
  const { t } = useTranslation()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  // 从 URL 获取参数
  const redirectUri = searchParams.get('redirect') || ''
  const errorType = searchParams.get('error') || ''

  useEffect(() => {
    document.title = t('sso.login.title')
    // 如果有错误参数，统一显示账号密码错误
    if (errorType) {
      toast.error(t('sso.login.failed'))
    }
  }, [t, errorType])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!username.trim() || !password.trim()) {
      toast.error(t('sso.login.fillComplete'))
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/sso/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username,
          password,
          redirect: redirectUri,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(t('sso.login.failed'))
      }

      // 如果有回调地址，重定向回去
      if (data.redirect_url) {
        window.location.href = data.redirect_url
      } else if (redirectUri) {
        window.location.href = redirectUri
      } else if (onLogin) {
        onLogin(data.token)
      } else {
        navigate('/sso/account')
      }

      toast.success(t('sso.login.success'))
    } catch (error: any) {
      toast.error(error.message || t('sso.login.failed'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-4 relative">
      {/* Language Switcher */}
      <div className="absolute top-4 right-4 z-20">
        <LanguageSwitcher />
      </div>
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-100 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-indigo-100 rounded-full blur-3xl" />
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
              <div className="mx-auto w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center mb-4 shadow-lg">
                <Lock className="w-8 h-8 text-white" />
              </div>
            </motion.div>
            <CardTitle className="text-2xl font-bold">
              {t('sso.login.title')}
            </CardTitle>
            <CardDescription>
              {t('sso.login.subtitle')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">{t('sso.login.username')}</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="username"
                    type="text"
                    placeholder={t('sso.login.usernamePlaceholder')}
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="pl-10"
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">{t('sso.login.password')}</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder={t('sso.login.passwordPlaceholder')}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Button type="submit" className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700" disabled={loading}>
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    {t('sso.login.submitting')}
                  </span>
                ) : t('sso.login.submit')}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-gray-500 mt-6">
          © {new Date().getFullYear()} Zeus SSO
        </p>
      </motion.div>
    </div>
  )
}

export default SSOLogin
