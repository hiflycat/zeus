import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store/auth'
import Layout from '@/layouts'

// Loading fallback component
const LoadingFallback = () => (
  <div className="flex items-center justify-center h-screen">
    <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
  </div>
)

// 懒加载页面组件
const Login = lazy(() => import('@/pages/login'))
const OIDCCallback = lazy(() => import('@/pages/oidc-callback'))
const Dashboard = lazy(() => import('@/pages/dashboard'))
const UserList = lazy(() => import('@/pages/user/List'))
const RoleList = lazy(() => import('@/pages/role/List'))
const APIList = lazy(() => import('@/pages/api/List'))
const MenuList = lazy(() => import('@/pages/menu/List'))
const NavigationPage = lazy(() => import('@/pages/navigation'))
const SystemSettings = lazy(() => import('@/pages/system/settings'))

// SSO 页面
const SSOLogin = lazy(() => import('@/pages/sso/Login'))
const SSOAuthorize = lazy(() => import('@/pages/sso/Authorize'))
const SSOAccount = lazy(() => import('@/pages/sso/Account'))
const SSOTenantManage = lazy(() => import('@/pages/sso/TenantManage'))
const SSOUserManage = lazy(() => import('@/pages/sso/UserManage'))
const SSOGroupManage = lazy(() => import('@/pages/sso/GroupManage'))
const SSOClientManage = lazy(() => import('@/pages/sso/ClientManage'))

// 路由守卫组件
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated } = useAuthStore()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

// 路由配置
export const AppRouter = () => {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/auth/oidc/callback" element={<OIDCCallback />} />
        {/* SSO 公开页面 */}
        <Route path="/sso/login" element={<SSOLogin />} />
        <Route path="/sso/authorize" element={<SSOAuthorize />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="system">
            <Route path="user" element={<UserList />} />
            <Route path="role" element={<RoleList />} />
            <Route path="api" element={<APIList />} />
            <Route path="menu" element={<MenuList />} />
            <Route path="navigation" element={<NavigationPage />} />
            <Route path="settings" element={<SystemSettings />} />
          </Route>
          {/* SSO 管理页面 */}
          <Route path="sso">
            <Route path="account" element={<SSOAccount />} />
            <Route path="tenants" element={<SSOTenantManage />} />
            <Route path="users" element={<SSOUserManage />} />
            <Route path="groups" element={<SSOGroupManage />} />
            <Route path="clients" element={<SSOClientManage />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Suspense>
  )
}
