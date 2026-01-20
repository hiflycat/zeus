import { useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { AlertCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui-tw'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'

const SSOError = () => {
  const { t } = useTranslation()
  const [searchParams] = useSearchParams()
  const errorType = searchParams.get('type') || 'unknown'
  const errorMessage = searchParams.get('message') || ''

  useEffect(() => {
    document.title = t('sso.error.title')
  }, [t])

  const getErrorInfo = () => {
    switch (errorType) {
      case 'invalid_client':
        return {
          title: t('sso.error.invalidClient'),
          description: t('sso.error.invalidClientDesc'),
        }
      case 'invalid_redirect_uri':
        return {
          title: t('sso.error.invalidRedirectUri'),
          description: t('sso.error.invalidRedirectUriDesc'),
        }
      case 'access_denied':
        return {
          title: t('sso.error.accessDenied'),
          description: t('sso.error.accessDeniedDesc'),
        }
      default:
        return {
          title: t('sso.error.unknownError'),
          description: errorMessage || t('sso.error.unknownErrorDesc'),
        }
    }
  }

  const errorInfo = getErrorInfo()

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 via-white to-orange-50 p-4 relative">
      <div className="absolute top-4 right-4 z-20">
        <LanguageSwitcher />
      </div>
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-red-100 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-orange-100 rounded-full blur-3xl" />
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
              <div className="mx-auto w-16 h-16 bg-gradient-to-br from-red-500 to-orange-600 rounded-xl flex items-center justify-center mb-4 shadow-lg">
                <AlertCircle className="w-8 h-8 text-white" />
              </div>
            </motion.div>
            <CardTitle className="text-2xl font-bold text-red-600">
              {errorInfo.title}
            </CardTitle>
            <CardDescription className="text-gray-600 mt-2">
              {errorInfo.description}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-sm text-gray-500">
              {t('sso.error.contactAdmin')}
            </p>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-gray-500 mt-6">
          © {new Date().getFullYear()} Zeus SSO
        </p>
      </motion.div>
    </div>
  )
}

export default SSOError
