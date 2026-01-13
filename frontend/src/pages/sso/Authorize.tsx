import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { Shield, Check, X, ExternalLink } from 'lucide-react'
import { Button, Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui-tw'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'

interface ClientInfo {
  name: string
  logo_url?: string
  description?: string
}

interface ScopeInfo {
  scope: string
  description: string
}

const SSOAuthorize = () => {
  const { t } = useTranslation()
  const [searchParams] = useSearchParams()
  const [loading, setLoading] = useState(false)
  const [clientInfo, setClientInfo] = useState<ClientInfo | null>(null)
  const [scopes, setScopes] = useState<ScopeInfo[]>([])

  const clientId = searchParams.get('client_id') || ''
  const redirectUri = searchParams.get('redirect_uri') || ''
  const scope = searchParams.get('scope') || 'openid'
  const state = searchParams.get('state') || ''
  const nonce = searchParams.get('nonce') || ''

  useEffect(() => {
    document.title = t('sso.authorize.title')

    // 获取客户端信息
    const fetchClientInfo = async () => {
      try {
        const response = await fetch(`/api/v1/sso/clients/${clientId}`)
        if (response.ok) {
          const data = await response.json()
          setClientInfo(data.data)
        }
      } catch (error) {
        console.error('Failed to fetch client info:', error)
      }
    }

    if (clientId) {
      fetchClientInfo()
    }

    // 解析 scope
    const scopeList = scope.split(' ').map(s => ({
      scope: s,
      description: t(`sso.authorize.scopes.${s}`, { defaultValue: s }),
    }))
    setScopes(scopeList)
  }, [clientId, scope, t])

  const handleAuthorize = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/v1/sso/authorize/confirm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          client_id: clientId,
          redirect_uri: redirectUri,
          scope,
          state,
          nonce,
          approved: true,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || t('sso.authorize.failed'))
      }

      // 重定向到客户端
      if (data.redirect_url) {
        window.location.href = data.redirect_url
      }
    } catch (error: any) {
      toast.error(error.message || t('sso.authorize.failed'))
    } finally {
      setLoading(false)
    }
  }

  const handleDeny = () => {
    // 拒绝授权，重定向回客户端并带上错误
    const url = new URL(redirectUri)
    url.searchParams.set('error', 'access_denied')
    url.searchParams.set('error_description', 'User denied the authorization request')
    if (state) {
      url.searchParams.set('state', state)
    }
    window.location.href = url.toString()
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-4 relative">
      {/* Language Switcher */}
      <div className="absolute top-4 right-4 z-20">
        <LanguageSwitcher />
      </div>
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
              <div className="mx-auto w-16 h-16 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center mb-4 shadow-lg">
                <Shield className="w-8 h-8 text-white" />
              </div>
            </motion.div>
            <CardTitle className="text-xl font-bold">
              {t('sso.authorize.title')}
            </CardTitle>
            <CardDescription>
              {t('sso.authorize.requestAccess', { name: clientInfo?.name || clientId })}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* 客户端信息 */}
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              {clientInfo?.logo_url ? (
                <img src={clientInfo.logo_url} alt={clientInfo.name} className="w-12 h-12 rounded-lg" />
              ) : (
                <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center">
                  <ExternalLink className="w-6 h-6 text-gray-400" />
                </div>
              )}
              <div>
                <div className="font-medium">{clientInfo?.name || clientId}</div>
                {clientInfo?.description && (
                  <div className="text-sm text-gray-500">{clientInfo.description}</div>
                )}
              </div>
            </div>

            {/* 权限列表 */}
            <div>
              <div className="text-sm font-medium text-gray-700 mb-2">{t('sso.authorize.permissionsTitle')}</div>
              <div className="space-y-2">
                {scopes.map((s) => (
                  <div key={s.scope} className="flex items-center gap-2 text-sm">
                    <Check className="w-4 h-4 text-green-500" />
                    <span>{s.description}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 操作按钮 */}
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={handleDeny}
                disabled={loading}
              >
                <X className="w-4 h-4 mr-2" />
                {t('sso.authorize.deny')}
              </Button>
              <Button
                className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700"
                onClick={handleAuthorize}
                disabled={loading}
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    {t('sso.authorize.processing')}
                  </span>
                ) : (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    {t('sso.authorize.approve')}
                  </>
                )}
              </Button>
            </div>

            <p className="text-xs text-gray-400 text-center">
              {t('sso.authorize.afterAuth', { name: clientInfo?.name || t('sso.authorize.thisApp') })}
            </p>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}

export default SSOAuthorize
