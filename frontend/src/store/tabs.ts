import { create } from 'zustand'
import { tabsStorage, TabItem } from '@/utils/tabsStorage'

interface TabsState {
  tabs: TabItem[]
  activeKey: string
  addTab: (tab: TabItem) => void
  removeTab: (key: string) => string | undefined
  setActiveKey: (key: string) => void
  clearTabs: () => void
}

// 从 localStorage 初始化状态
const initialTabs = tabsStorage.get()
const initialActiveKey = tabsStorage.getActiveKey()

export const useTabsStore = create<TabsState>((set, get) => ({
  tabs: initialTabs,
  activeKey: initialActiveKey,

  addTab: (tab: TabItem) => {
    const { tabs } = get()
    // 检查标签是否已存在
    const existingTab = tabs.find((t) => t.key === tab.key)
    if (!existingTab) {
      const newTabs = [...tabs, tab]
      set({
        tabs: newTabs,
        activeKey: tab.key,
      })
      // 持久化到 localStorage
      tabsStorage.set(newTabs)
      tabsStorage.setActiveKey(tab.key)
    } else {
      // 如果已存在，只切换激活状态
      set({ activeKey: tab.key })
      tabsStorage.setActiveKey(tab.key)
    }
  },

  removeTab: (key: string) => {
    const { tabs, activeKey } = get()
    
    // 如果尝试关闭首页，不允许关闭
    if (key === '/dashboard') {
      return activeKey
    }
    
    const newTabs = tabs.filter((tab) => tab.key !== key)
    
    // 如果关闭的是当前激活的标签，需要切换到其他标签
    let newActiveKey = activeKey
    if (activeKey === key && newTabs.length > 0) {
      const currentIndex = tabs.findIndex((tab) => tab.key === key)
      // 优先切换到右侧的标签，如果没有则切换到左侧
      if (currentIndex < tabs.length - 1) {
        newActiveKey = tabs[currentIndex + 1].key
      } else if (currentIndex > 0) {
        newActiveKey = tabs[currentIndex - 1].key
      } else {
        // 如果没有其他标签，默认切换到首页
        newActiveKey = '/dashboard'
      }
    } else if (activeKey === key && newTabs.length === 0) {
      // 如果关闭后没有标签了，切换到首页
      newActiveKey = '/dashboard'
    }
    
    set({
      tabs: newTabs,
      activeKey: newActiveKey,
    })
    
    // 持久化到 localStorage
    tabsStorage.set(newTabs)
    tabsStorage.setActiveKey(newActiveKey)
    
    return newActiveKey
  },

  setActiveKey: (key: string) => {
    set({ activeKey: key })
    tabsStorage.setActiveKey(key)
  },

  clearTabs: () => {
    const defaultTabs = [
      {
        key: '/dashboard',
        path: '/dashboard',
        title: '', // title 不再使用，显示时会通过路径动态翻译
        closable: false,
      },
    ]
    set({
      tabs: defaultTabs,
      activeKey: '/dashboard',
    })
    // 清除 localStorage
    tabsStorage.set(defaultTabs)
    tabsStorage.setActiveKey('/dashboard')
  },
}))
