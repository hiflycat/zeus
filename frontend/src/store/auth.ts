import { create } from 'zustand'
import { toast } from 'sonner'
import { getCurrentUser, getUserMenus, LoginParams, login, UserInfo, getServerInfo } from '@/api/auth'
import { tokenStorage, loginTypeStorage, idTokenStorage, LoginType } from '@/utils/token'
import { roleStorage } from '@/utils/role'

interface AuthState {
  user: UserInfo | null
  menus: any[]
  token: string | null
  isAuthenticated: boolean
  currentRoleId: number | null
  loginType: LoginType
  login: (params: LoginParams) => Promise<void>
  loginWithToken: (token: string, user?: any) => Promise<void>
  logout: () => Promise<boolean>  // 返回 true 表示需要手动导航
  fetchUserInfo: () => Promise<UserInfo | void>
  fetchMenus: () => Promise<any[] | void>
  setCurrentRole: (roleId: number | null) => Promise<void>
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  menus: [],
  token: tokenStorage.get(),
  isAuthenticated: !!tokenStorage.get(),
  currentRoleId: roleStorage.get(),
  loginType: loginTypeStorage.get(),

  login: async (params: LoginParams) => {
    const response = await login(params)
    tokenStorage.set(response.token)
    loginTypeStorage.set('local')
    set({
      token: response.token,
      user: response.user as UserInfo,
      isAuthenticated: true,
      loginType: 'local',
    })
    // 等待 token 设置完成后再获取用户信息和菜单
    try {
      await get().fetchUserInfo()
      await get().fetchMenus()
    } catch (error) {
      console.error('Failed to fetch user data after login:', error)
      // 即使获取失败也不影响登录流程
    }
  },

  loginWithToken: async (token: string, user?: any) => {
    tokenStorage.set(token)
    // loginType 已在 OIDC callback 中设置
    set({
      token,
      user: user ? user as UserInfo : null,
      isAuthenticated: true,
      loginType: loginTypeStorage.get(),
    })
    // 等待 token 设置完成后再获取用户信息和菜单
    try {
      await get().fetchUserInfo()
      await get().fetchMenus()
    } catch (error) {
      console.error('Failed to fetch user data after login:', error)
      // 即使获取失败也不影响登录流程
    }
  },

  logout: async () => {
    const currentLoginType = get().loginType
    const currentIdToken = idTokenStorage.get()

    // 清除本地状态
    tokenStorage.remove()
    loginTypeStorage.remove()
    idTokenStorage.remove()
    roleStorage.remove()
    set({
      user: null,
      menus: [],
      token: null,
      isAuthenticated: false,
      currentRoleId: null,
      loginType: 'local',
    })

    // 如果是 OIDC 登录，尝试调用 IdP 的 end_session_endpoint
    if (currentLoginType === 'oidc') {
      try {
        const serverInfo = await getServerInfo()
        if (serverInfo.oidc?.enabled && serverInfo.oidc?.issuer) {
          // 从 OIDC discovery 文档获取 end_session_endpoint
          const discoveryUrl = `${serverInfo.oidc.issuer}/.well-known/openid-configuration`
          const discoveryRes = await fetch(discoveryUrl)
          const discovery = await discoveryRes.json()

          if (discovery.end_session_endpoint) {
            const logoutUrl = new URL(discovery.end_session_endpoint)
            if (currentIdToken) {
              logoutUrl.searchParams.set('id_token_hint', currentIdToken)
            }
            if (serverInfo.oidc.client_id) {
              logoutUrl.searchParams.set('client_id', serverInfo.oidc.client_id)
            }
            logoutUrl.searchParams.set('post_logout_redirect_uri', `${window.location.origin}/login`)
            window.location.href = logoutUrl.toString()
            // 返回 false 表示不需要手动导航，IdP 会重定向
            return false
          }
        }
      } catch (error) {
        console.error('Failed to get OIDC config for logout:', error)
      }
    }
    // 返回 true 表示需要手动导航到登录页
    return true
  },

  fetchUserInfo: async () => {
    try {
      const user = await getCurrentUser()
      // 如果用户有角色且当前没有选中角色，默认选中第一个角色
      let currentRoleId = get().currentRoleId || roleStorage.get()
      if (!currentRoleId && user.roles && user.roles.length > 0) {
        currentRoleId = user.roles[0].id
        roleStorage.set(currentRoleId)
      }
      // 验证当前角色ID是否在用户角色列表中
      if (currentRoleId && user.roles) {
        const roleExists = user.roles.some((role: any) => role.id === currentRoleId)
        if (!roleExists) {
          // 如果当前角色不在用户角色列表中，重置为第一个角色
          currentRoleId = user.roles.length > 0 ? user.roles[0].id : null
          roleStorage.set(currentRoleId)
        }
      }
      set({ user, currentRoleId })
      return user
    } catch (error) {
      console.error('Failed to fetch user info:', error)
      throw error
    }
  },

  fetchMenus: async () => {
    try {
      const menus = await getUserMenus()
      set({ menus })
      return menus
    } catch (error) {
      console.error('Failed to fetch menus:', error)
      // 如果获取菜单失败，设置为空数组，避免重复请求
      set({ menus: [] })
      throw error
    }
  },

  setCurrentRole: async (roleId: number | null) => {
    // 保存到 localStorage
    roleStorage.set(roleId)
    set({ currentRoleId: roleId })
    
    // 获取角色名称用于提示
    const user = get().user
    const roleName = user?.roles?.find((r: any) => r.id === roleId)?.name || '角色'
    
    // 切换角色后重新获取菜单
    try {
      await get().fetchMenus()
      toast.success(`已切换到角色：${roleName}`)
    } catch (error) {
      console.error('Failed to fetch menus after role change:', error)
      toast.error('切换角色失败')
    }
  },
}))
