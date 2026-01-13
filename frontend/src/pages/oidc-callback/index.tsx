import { useEffect, useState, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import { Loader2, CheckCircle, XCircle } from 'lucide-react'
import { oidcCallback } from '@/api/auth'
import { useAuthStore } from '@/store/auth'
import { loginTypeStorage, idTokenStorage } from '@/utils/token'
import { Card, CardContent } from '@/components/ui-tw'

const OIDCCallback = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { loginWithToken } = useAuthStore()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState(t('oidc.verifying'))
  const hasProcessedRef = useRef(false) // 防止重复处理

  useEffect(() => {
    // 如果已经处理过，直接返回
    if (hasProcessedRef.current) {
      return
    }

    const handleCallback = async () => {
      const code = searchParams.get('code')
      const error = searchParams.get('error')
      const errorDescription = searchParams.get('error_description')

      if (error) {
        hasProcessedRef.current = true
        setStatus('error')
        setMessage(errorDescription || error || t('oidc.loginFailed'))
        toast.error(errorDescription || error || t('oidc.loginFailed'))
        setTimeout(() => navigate('/login', { replace: true }), 3000)
        return
      }

      if (!code) {
        hasProcessedRef.current = true
        setStatus('error')
        setMessage(t('oidc.missingCode'))
        toast.error(t('oidc.missingCode'))
        setTimeout(() => navigate('/login', { replace: true }), 3000)
        return
      }

      // 标记为已处理，防止重复请求
      hasProcessedRef.current = true

      try {
        const response = await oidcCallback(code)
        if (response.token) {
          loginTypeStorage.set('oidc')
          if (response.id_token) {
            idTokenStorage.set(response.id_token)
          }
          loginWithToken(response.token)
          setStatus('success')
          setMessage(t('oidc.loginSuccess'))
          toast.success(t('auth.loginSuccess'))
          setTimeout(() => navigate('/dashboard', { replace: true }), 1500)
        } else {
          throw new Error(t('oidc.noToken'))
        }
      } catch (error: any) {
        setStatus('error')
        setMessage(error.message || t('oidc.loginFailed'))
        // 错误提示已在响应拦截器中根据错误码显示
        setTimeout(() => navigate('/login', { replace: true }), 3000)
      }
    }

    handleCallback()
  }, [searchParams, navigate, loginWithToken, t])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4">
      <Card className="w-full max-w-sm">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center gap-4 text-center">
            {status === 'loading' && (
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
            )}
            {status === 'success' && (
              <CheckCircle className="h-12 w-12 text-green-500" />
            )}
            {status === 'error' && (
              <XCircle className="h-12 w-12 text-destructive" />
            )}
            <p className="text-lg font-medium">{message}</p>
            {status === 'error' && (
              <p className="text-sm text-muted-foreground">{t('oidc.returningToLogin')}</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default OIDCCallback
