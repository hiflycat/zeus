import { useAuthStore } from '@/store/auth'

/**
 * 检查用户是否有指定权限
 */
export const hasPermission = (resource: string, action: string): boolean => {
  const { user } = useAuthStore.getState()
  if (!user || !user.roles) {
    return false
  }

  // 检查用户的所有角色权限
  for (const role of user.roles) {
    if (role.permissions) {
      for (const permission of role.permissions) {
        if (permission.resource === resource && permission.action === action) {
          return true
        }
      }
    }
  }

  return false
}

/**
 * 检查用户是否有指定资源权限（任意操作）
 */
export const hasResourcePermission = (resource: string): boolean => {
  const { user } = useAuthStore.getState()
  if (!user || !user.roles) {
    return false
  }

  for (const role of user.roles) {
    if (role.permissions) {
      for (const permission of role.permissions) {
        if (permission.resource === resource) {
          return true
        }
      }
    }
  }

  return false
}
