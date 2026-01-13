const TABS_KEY = 'tabs'
const ACTIVE_KEY = 'activeTabKey'

export interface TabItem {
  key: string
  path: string
  title: string
  closable?: boolean
}

export const tabsStorage = {
  get: (): TabItem[] => {
    try {
      const stored = localStorage.getItem(TABS_KEY)
      if (stored) {
        return JSON.parse(stored)
      }
    } catch (error) {
      console.error('Failed to get tabs from storage:', error)
    }
    // 默认返回首页标签
    return [
      {
        key: '/dashboard',
        path: '/dashboard',
        title: '', // title 不再使用，显示时会通过路径动态翻译
        closable: false,
      },
    ]
  },
  set: (tabs: TabItem[]): void => {
    try {
      localStorage.setItem(TABS_KEY, JSON.stringify(tabs))
    } catch (error) {
      console.error('Failed to save tabs to storage:', error)
    }
  },
  getActiveKey: (): string => {
    try {
      return localStorage.getItem(ACTIVE_KEY) || '/dashboard'
    } catch (error) {
      console.error('Failed to get active key from storage:', error)
      return '/dashboard'
    }
  },
  setActiveKey: (key: string): void => {
    try {
      localStorage.setItem(ACTIVE_KEY, key)
    } catch (error) {
      console.error('Failed to save active key to storage:', error)
    }
  },
  remove: (): void => {
    localStorage.removeItem(TABS_KEY)
    localStorage.removeItem(ACTIVE_KEY)
  },
}
