import { useState, useEffect, useMemo, useRef } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { 
  Menu, 
  X, 
  ChevronDown, 
  ChevronRight,
  Home,
  Sun,
  Moon,
  LogOut,
  Lock
} from 'lucide-react'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '@/store/auth'
import { useTabsStore } from '@/store/tabs'
import { useThemeStore } from '@/store/theme'
import { iconMap } from '@/components/IconSelector'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { getServerInfo, changePassword, ChangePasswordParams } from '@/api/auth'
import { cn } from '@/lib/utils'
import { getMenuTranslation } from '@/utils/menuTranslation'
import {
  Button,
  Avatar,
  AvatarFallback,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Input,
  Label,
  ScrollArea,
  Badge,
} from '@/components/ui-tw'

const Layout = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const { user, menus, logout, fetchMenus, fetchUserInfo, isAuthenticated, currentRoleId, setCurrentRole } = useAuthStore()
  const { tabs, activeKey, addTab, removeTab, setActiveKey, clearTabs } = useTabsStore()
  const { theme, toggleTheme } = useThemeStore()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const [serverName, setServerName] = useState<string>(t('auth.defaultSystemName'))
  const [changePasswordOpen, setChangePasswordOpen] = useState(false)
  const [passwordForm, setPasswordForm] = useState({ old_password: '', new_password: '', confirm_password: '' })
  const [expandedMenus, setExpandedMenus] = useState<string[]>([])
  const pathnameRef = useRef<string>('')
  const isClosingTabRef = useRef<boolean>(false)
  const closedTabKeyRef = useRef<string | null>(null)
  const initializedRef = useRef<boolean>(false)
  const isSwitchingRoleRef = useRef<boolean>(false)

  // 查找当前路径的父菜单
  const findParentMenus = (path: string, menuList: any[], parents: string[] = []): string[] => {
    for (const menu of menuList) {
      if (menu.path === path) return parents
      if (menu.children && menu.children.length > 0) {
        const newParents = [...parents, menu.path]
        const found = findParentMenus(path, menu.children, newParents)
        if (found.length > 0) return found
      }
    }
    return []
  }

  // 根据路径获取标签标题（支持国际化）
  const getTabTitle = (path: string): string => {
    if (path === '/dashboard') {
      return t('menu.dashboard')
    }
    const findMenuName = (menuPath: string, list: any[]): string => {
      for (const menu of list) {
        if (menu.path === menuPath) return getMenuTranslation(menu.name, t)
        if (menu.children) {
          const found = findMenuName(menuPath, menu.children)
          if (found) return found
        }
      }
      return ''
    }
    return findMenuName(path, menus) || t('menu.page', { defaultValue: '页面' })
  }

  // 根据当前路径自动展开对应的父菜单
  useEffect(() => {
    if (menus.length === 0) return

    // 初始化时或路径变化时展开对应的父菜单
    if (!initializedRef.current || location.pathname !== pathnameRef.current) {
      initializedRef.current = true
      pathnameRef.current = location.pathname

      const parentMenus = findParentMenus(location.pathname, menus)
      if (parentMenus.length > 0) {
        // 合并现有展开的菜单和新的父菜单
        setExpandedMenus(prev => [...new Set([...prev, ...parentMenus])])
      }
    }
  }, [location.pathname, menus])

  // 初始化时恢复标签页状态
  useEffect(() => {
    if (tabs.length > 0 && activeKey && activeKey !== location.pathname) {
      const targetTab = tabs.find((tab) => tab.key === activeKey)
      if (targetTab) navigate(activeKey, { replace: true })
    }
  }, [])

  useEffect(() => {
    if (isAuthenticated && !user) {
      fetchUserInfo().catch(console.error)
    }
    if (isAuthenticated && user && menus.length === 0) {
      fetchMenus().catch(console.error)
    }
  }, [isAuthenticated, user, menus.length, fetchUserInfo, fetchMenus])

  useEffect(() => {
    getServerInfo()
      .then((info) => setServerName(info.name))
      .catch(console.error)
  }, [])

  useEffect(() => {
    if (serverName) document.title = serverName
  }, [serverName])

  // 监听路由变化，自动添加标签页
  useEffect(() => {
    if (location.pathname && location.pathname !== '/login') {
      // 如果正在切换角色，不添加标签
      if (isSwitchingRoleRef.current) {
        if (location.pathname === '/dashboard') {
          // 导航到首页后，重置标志
          isSwitchingRoleRef.current = false
        }
        return
      }
      // 如果当前路径是刚刚关闭的标签，不要重新添加
      if (closedTabKeyRef.current === location.pathname) {
        closedTabKeyRef.current = null
        return
      }
      
      const isParent = menus.some(m => m.path === location.pathname && m.children?.length > 0)
      if (isParent) return

      const existingTab = tabs.find((tab) => tab.key === location.pathname)
      if (!existingTab) {
      // title 不再使用，显示时会通过 getTabTitle 动态翻译
        addTab({ key: location.pathname, path: location.pathname, title: '', closable: location.pathname !== '/dashboard' })
      } else if (activeKey !== location.pathname) {
        setActiveKey(location.pathname)
      }
    }
  }, [location.pathname, menus, tabs, addTab, setActiveKey, activeKey, t])

  const handleMenuClick = (menu: any) => {
    if (menu.children?.length > 0) {
      setExpandedMenus(prev => 
        prev.includes(menu.path) 
          ? prev.filter(p => p !== menu.path)
          : [...prev, menu.path]
      )
    } else {
      navigate(menu.path)
      setMobileSidebarOpen(false)
    }
  }

  const handleTabChange = (key: string) => {
    // 如果正在关闭标签，忽略切换事件
    if (isClosingTabRef.current) {
      return
    }
    setActiveKey(key)
    navigate(key)
  }

  const handleTabClose = (key: string, e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    
    // 设置标记，防止触发 handleTabChange
    isClosingTabRef.current = true
    // 记录被关闭的标签 key，防止 useEffect 重新添加
    closedTabKeyRef.current = key
    
    const newActiveKey = removeTab(key)
    if (newActiveKey) {
      navigate(newActiveKey, { replace: true })
    }
    
    // 延迟重置标记
    setTimeout(() => {
      isClosingTabRef.current = false
    }, 100)
  }

  const handleLogout = async () => {
    clearTabs()
    const needNavigate = await logout()
    if (needNavigate) {
      navigate('/login', { replace: true })
    }
  }

  const handleChangePassword = async () => {
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      toast.error('两次输入的密码不一致')
      return
    }
    if (passwordForm.new_password.length < 6) {
      toast.error('密码长度至少6位')
      return
    }
    try {
      await changePassword(passwordForm as ChangePasswordParams)
      toast.success('密码修改成功')
      setChangePasswordOpen(false)
      setPasswordForm({ old_password: '', new_password: '', confirm_password: '' })
    } catch (error: any) {
      toast.error(error.message || '密码修改失败')
    }
  }

  // 渲染菜单项
  const renderMenuItem = (menu: any, level = 0) => {
    const hasChildren = menu.children?.length > 0
    const isExpanded = expandedMenus.includes(menu.path)
    const isActive = location.pathname === menu.path
    const IconComponent = iconMap[menu.icon]

    return (
      <div key={menu.path}>
        <button
          onClick={() => handleMenuClick(menu)}
          className={cn(
            "w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
            level > 0 && "ml-4",
            isActive
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          )}
        >
          <div className="flex items-center gap-3">
            {IconComponent && <IconComponent className="h-5 w-5" />}
            <span>{getMenuTranslation(menu.name, t)}</span>
          </div>
          {hasChildren && (
            <ChevronRight className={cn("h-4 w-4 transition-transform", isExpanded && "rotate-90")} />
          )}
        </button>
        {hasChildren && isExpanded && (
          <div className="mt-1 space-y-1">
            {[...menu.children].sort((a: any, b: any) => (a.sort || 0) - (b.sort || 0)).map((child: any) => renderMenuItem(child, level + 1))}
          </div>
        )}
      </div>
    )
  }

  const sortedMenus = useMemo(() => {
    return [...menus].sort((a, b) => (a.sort || 0) - (b.sort || 0))
  }, [menus])

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile sidebar overlay */}
      {mobileSidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 bg-sidebar border-r border-sidebar-border transition-transform duration-300 ease-in-out",
        "md:translate-x-0",
        mobileSidebarOpen ? "translate-x-0" : "-translate-x-full",
        !sidebarOpen && "md:-translate-x-full"
      )}>
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="relative flex h-14 items-center justify-center px-4 border-b border-sidebar-border">
            <span className="font-semibold text-sidebar-foreground truncate">{serverName}</span>
            <Button variant="ghost" size="icon" className="absolute right-4 md:hidden" onClick={() => setMobileSidebarOpen(false)}>
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Menu */}
          <ScrollArea className="flex-1 px-3 py-4">
            <nav className="space-y-1">
              {sortedMenus.map(menu => renderMenuItem(menu))}
            </nav>
          </ScrollArea>

          {/* User */}
          <div className="border-t border-sidebar-border p-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-sidebar-accent transition-colors">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>{user?.username?.charAt(0)?.toUpperCase() || 'U'}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 text-left min-w-0">
                    <div className="text-sm font-medium text-sidebar-foreground truncate">{user?.username || '用户'}</div>
                    {user?.roles && user.roles.length > 0 && currentRoleId && (
                      <div className="text-xs text-muted-foreground truncate">
                        {user.roles.find((r: any) => r.id === currentRoleId)?.name || '未选择角色'}
                      </div>
                    )}
                  </div>
                  <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" side="top" className="w-56">
                {user?.roles && user.roles.length > 0 && (
                  <>
                    <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                      当前角色
                    </div>
                    <DropdownMenuRadioGroup value={currentRoleId?.toString() || ''} onValueChange={(value) => {
                      // 标记正在切换角色
                      isSwitchingRoleRef.current = true
                      // 切换角色前关闭所有标签并导航到首页
                      clearTabs()
                      navigate('/dashboard', { replace: true })
                      setCurrentRole(parseInt(value)).catch(console.error)
                    }}>
                      {user.roles.map((role: any) => (
                        <DropdownMenuRadioItem key={role.id} value={role.id.toString()}>
                          <div className="flex items-center justify-between w-full">
                            <span>{role.name}</span>
                            {currentRoleId === role.id ? (
                              <Badge variant="secondary" className="text-xs ml-2">{t('menu.current')}</Badge>
                            ) : (
                              <span className="text-xs text-muted-foreground ml-2">{t('menu.switch')}</span>
                            )}
                          </div>
                        </DropdownMenuRadioItem>
                      ))}
                    </DropdownMenuRadioGroup>
                    <DropdownMenuSeparator />
                  </>
                )}
                <DropdownMenuItem onClick={() => setChangePasswordOpen(true)}>
                  <Lock className="mr-2 h-4 w-4" />
                  {t('auth.changePassword')}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  {t('auth.logout')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className={cn(
        "min-h-screen transition-all duration-300",
        sidebarOpen ? "md:ml-64" : "md:ml-0"
      )}>
        {/* Header */}
        <header className="sticky top-0 z-30 flex h-[4.5rem] items-center gap-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4">
          <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMobileSidebarOpen(true)}>
            <Menu className="h-6 w-6" />
          </Button>
          <Button variant="ghost" size="icon" className="hidden md:flex" onClick={() => setSidebarOpen(!sidebarOpen)}>
            <Menu className="h-6 w-6" />
          </Button>

          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Home className="h-5 w-5" />
            <span>/</span>
            <span className="text-foreground font-medium">
              {tabs.find(t => t.key === activeKey)?.title || t('menu.dashboard')}
            </span>
          </div>

          <div className="flex-1" />

          {/* Actions */}
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <Button variant="ghost" size="icon" onClick={toggleTheme}>
              {theme === 'dark' ? <Sun className="h-6 w-6" /> : <Moon className="h-6 w-6" />}
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>{user?.username?.charAt(0)?.toUpperCase() || 'U'}</AvatarFallback>
                  </Avatar>
                  <span className="hidden sm:inline">{user?.username || '用户'}</span>
                  <ChevronDown className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                {user?.roles && user.roles.length > 0 && (
                  <>
                    <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                      当前角色
                    </div>
                    <DropdownMenuRadioGroup value={currentRoleId?.toString() || ''} onValueChange={(value) => {
                      // 标记正在切换角色
                      isSwitchingRoleRef.current = true
                      // 切换角色前关闭所有标签并导航到首页
                      clearTabs()
                      navigate('/dashboard', { replace: true })
                      setCurrentRole(parseInt(value)).catch(console.error)
                    }}>
                      {user.roles.map((role: any) => (
                        <DropdownMenuRadioItem key={role.id} value={role.id.toString()}>
                          <div className="flex items-center justify-between w-full">
                            <span>{role.name}</span>
                            {currentRoleId === role.id ? (
                              <Badge variant="secondary" className="text-xs ml-2">{t('menu.current')}</Badge>
                            ) : (
                              <span className="text-xs text-muted-foreground ml-2">{t('menu.switch')}</span>
                            )}
                          </div>
                        </DropdownMenuRadioItem>
                      ))}
                    </DropdownMenuRadioGroup>
                    <DropdownMenuSeparator />
                  </>
                )}
                <DropdownMenuItem onClick={() => setChangePasswordOpen(true)}>
                  <Lock className="mr-2 h-4 w-4" />
                  {t('auth.changePassword')}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  {t('auth.logout')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Tabs */}
        {tabs.length > 0 && (
          <div className="flex items-center gap-1 px-4 py-2 border-b bg-muted/30 overflow-x-auto scrollbar-thin">
            {tabs.map(tab => (
              <div
                key={tab.key}
                onClick={() => handleTabChange(tab.key)}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap cursor-pointer",
                  activeKey === tab.key
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-background/50 hover:text-foreground"
                )}
              >
                <span>{getTabTitle(tab.path)}</span>
                {tab.closable && (
                  <span 
                    className="inline-flex items-center justify-center rounded hover:bg-muted p-0.5"
                    onClick={(e) => handleTabClose(tab.key, e)}
                  >
                    <X className="h-3.5 w-3.5 hover:text-destructive" />
                  </span>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Page content */}
        <main className="p-4 md:p-6">
          <Outlet />
        </main>
      </div>

      {/* Change Password Dialog */}
      <Dialog open={changePasswordOpen} onOpenChange={setChangePasswordOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('auth.changePassword')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t('auth.oldPassword')}</Label>
              <Input
                type="password"
                value={passwordForm.old_password}
                onChange={(e) => setPasswordForm(prev => ({ ...prev, old_password: e.target.value }))}
                placeholder={t('auth.oldPassword')}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('auth.newPassword')}</Label>
              <Input
                type="password"
                value={passwordForm.new_password}
                onChange={(e) => setPasswordForm(prev => ({ ...prev, new_password: e.target.value }))}
                placeholder={t('auth.newPassword')}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('auth.confirmPassword')}</Label>
              <Input
                type="password"
                value={passwordForm.confirm_password}
                onChange={(e) => setPasswordForm(prev => ({ ...prev, confirm_password: e.target.value }))}
                placeholder={t('auth.confirmPassword')}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setChangePasswordOpen(false)}>{t('common.cancel')}</Button>
            <Button onClick={handleChangePassword}>{t('common.confirm')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default Layout
