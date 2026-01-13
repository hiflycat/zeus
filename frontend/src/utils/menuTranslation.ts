/**
 * 菜单名称翻译映射
 * 将后端返回的中文菜单名映射到国际化翻译键
 */
const menuNameMap: Record<string, string> = {
  '仪表盘': 'menu.dashboard',
  'Dashboard': 'menu.dashboard',
  '系统管理': 'menu.system',
  'System Management': 'menu.system',
  '用户管理': 'menu.userManagement',
  'User Management': 'menu.userManagement',
  '角色管理': 'menu.roleManagement',
  'Role Management': 'menu.roleManagement',
  '权限管理': 'menu.permissionManagement',
  'Permission Management': 'menu.permissionManagement',
  '菜单管理': 'menu.menuManagement',
  'Menu Management': 'menu.menuManagement',
  '系统设置': 'menu.systemSettings',
  'System Settings': 'menu.systemSettings',
  // SSO 管理
  'SSO 管理': 'sso.title',
  'SSO Management': 'sso.title',
  '租户管理': 'sso.tenantManage',
  'Tenant Management': 'sso.tenantManage',
  'SSO 用户管理': 'sso.userManage',
  'SSO User Management': 'sso.userManage',
  '用户组管理': 'sso.groupManage',
  'Group Management': 'sso.groupManage',
  '应用管理': 'sso.clientManage',
  'Application Management': 'sso.clientManage',
  // 导航管理
  '导航管理': 'navigation.title',
  'Navigation Management': 'navigation.title',
  '网站分类管理': 'navigation.categoryManagement',
  'Category Management': 'navigation.categoryManagement',
  '网站管理': 'navigation.navigationManagement',
  'Navigation Items': 'navigation.navigationManagement',
}

/**
 * 获取菜单的翻译文本
 * @param menuName 菜单名称（从后端获取）
 * @param t 翻译函数
 * @returns 翻译后的菜单名称，如果找不到映射则返回原名称
 */
export const getMenuTranslation = (menuName: string, t: (key: string) => string): string => {
  const translationKey = menuNameMap[menuName]
  if (translationKey) {
    return t(translationKey)
  }
  // 如果找不到映射，返回原名称
  return menuName
}
