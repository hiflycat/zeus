import { useState, useEffect, useMemo, useRef, Fragment } from 'react'
import { 
  Globe, 
  ChevronDown, 
  ExternalLink,
  Layers,
  Search,
  X
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { getNavigationCategoryList, getNavigationList, NavigationCategory, Navigation } from '@/api/navigation'
import { iconMap } from '@/components/IconSelector'

const elasticThemes = [
  { 
    color: '#FDB022', 
    bg: 'bg-[#FFFAF4] dark:bg-[#1A1612]', 
    iconBg: 'bg-[#FDB022]', 
    text: 'text-[#344054] dark:text-slate-200',
    desc: 'text-[#475467] dark:text-slate-400',
    badge: 'bg-[#FDB022]',
    border: 'border-[#FEDF89] dark:border-[#B54708]/30',
    pattern: 'text-[#FDB022]'
  },
  { 
    color: '#C11574', 
    bg: 'bg-[#FFF1F6] dark:bg-[#1A1216]', 
    iconBg: 'bg-[#C11574]', 
    text: 'text-[#344054] dark:text-slate-200',
    desc: 'text-[#475467] dark:text-slate-400',
    badge: 'bg-[#C11574]',
    border: 'border-[#FCCEEE] dark:border-[#9B1158]/30',
    pattern: 'text-[#C11574]'
  },
  { 
    color: '#067647', 
    bg: 'bg-[#F6FEF9] dark:bg-[#121A16]', 
    iconBg: 'bg-[#067647]', 
    text: 'text-[#344054] dark:text-slate-200',
    desc: 'text-[#475467] dark:text-slate-400',
    badge: 'bg-[#067647]',
    border: 'border-[#ABEFC6] dark:border-[#054F31]/30',
    pattern: 'text-[#067647]'
  },
  { 
    color: '#175CD3', 
    bg: 'bg-[#F5FAFF] dark:bg-[#12161A]', 
    iconBg: 'bg-[#175CD3]', 
    text: 'text-[#344054] dark:text-slate-200',
    desc: 'text-[#475467] dark:text-slate-400',
    badge: 'bg-[#175CD3]',
    border: 'border-[#B2DDFF] dark:border-[#154EBB]/30',
    pattern: 'text-[#175CD3]'
  },
]

const Dashboard = () => {
  const { t } = useTranslation()
  const [categories, setCategories] = useState<NavigationCategory[]>([])
  const [navigations, setNavigations] = useState<Navigation[]>([])
  const [loading, setLoading] = useState(true)
  const [imageErrors, setImageErrors] = useState<Set<number>>(new Set())
  const [expandedCategories, setExpandedCategories] = useState<Set<number>>(new Set())
  const [searchKeyword, setSearchKeyword] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const [categoriesRes, navigationsRes] = await Promise.all([
        getNavigationCategoryList(),
        getNavigationList({ page_size: 1000 }),
      ])
      setCategories(Array.isArray(categoriesRes) ? categoriesRes : [])
      setNavigations(navigationsRes?.list || [])
    } catch (error) {
      console.error('Failed to load navigation data:', error)
    } finally {
      setLoading(false)
    }
  }

  // 默认展开所有分类（仅在首次加载数据后执行一次）
  const hasInitializedExpansion = useRef(false)
  useEffect(() => {
    if (categories.length > 0 && !hasInitializedExpansion.current) {
      const allCategoryIds = new Set<number>()
      const collectCategoryIds = (cats: NavigationCategory[]) => {
        cats.forEach(cat => {
          if (cat.id) allCategoryIds.add(cat.id)
          if (cat.children) collectCategoryIds(cat.children)
        })
      }
      collectCategoryIds(categories)
      setExpandedCategories(allCategoryIds)
      hasInitializedExpansion.current = true
    }
  }, [categories])

  const navigationsByCategory = useMemo(() => {
    const map = new Map<number | null, Navigation[]>()
    categories.forEach(cat => { if (cat.id) map.set(cat.id, []) })
    map.set(null, [])
    navigations.filter(nav => nav.status === 1).forEach(nav => {
      const categoryId = nav.category_id || null
      const list = map.get(categoryId) || []
      list.push(nav)
      map.set(categoryId, list)
    })
    return map
  }, [categories, navigations])

  const getOwnNavigations = (categoryId: number): Navigation[] => {
    return (navigationsByCategory.get(categoryId) || []).sort((a, b) => (a.sort || 0) - (b.sort || 0))
  }

  // 搜索过滤函数
  const filterNavigations = (navs: Navigation[]): Navigation[] => {
    if (!searchKeyword.trim()) return navs
    const keyword = searchKeyword.toLowerCase().trim()
    return navs.filter(nav => 
      nav.name.toLowerCase().includes(keyword) || 
      nav.url.toLowerCase().includes(keyword) ||
      (nav.description && nav.description.toLowerCase().includes(keyword))
    )
  }

  const hasNavigationsInTree = (category: NavigationCategory): boolean => {
    const navs = navigationsByCategory.get(category.id!) || []
    if (navs.length > 0) return true
    if (category.children) {
      return category.children.some(child => hasNavigationsInTree(child))
    }
    return false
  }

  const toggleCategory = (categoryId: number) => {
    setExpandedCategories(prev => {
      const next = new Set(prev)
      if (next.has(categoryId)) next.delete(categoryId)
      else next.add(categoryId)
      return next
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="h-10 w-10 border-[3px] border-[#005a9e] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#090B11] selection:bg-[#005a9e]/10 selection:text-[#005a9e]">
      <main className="max-w-[1600px] mx-auto px-8 py-12">
        {/* Page Header */}
        <div className="text-center mb-8 space-y-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tighter text-center">
              {t('dashboard.devopsCenter')}
            </h1>
            <p className="text-base md:text-lg font-medium text-slate-500 dark:text-slate-400 max-w-2xl mx-auto tracking-tight mt-2">
              {t('dashboard.oneStopPlatform')}
            </p>
          </div>
          
          {/* Search Box */}
          <div className="max-w-2xl mx-auto relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              placeholder="搜索网站标题或网址..."
              className="w-full pl-12 pr-10 py-3 bg-white dark:bg-[#11141D] border border-slate-200 dark:border-slate-800 rounded-none text-sm font-medium text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#005a9e]/20 focus:border-[#005a9e] transition-all"
            />
            {searchKeyword && (
              <button
                onClick={() => setSearchKeyword('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"
              >
                <X className="w-4 h-4 text-slate-400" />
              </button>
            )}
          </div>
        </div>

        {/* Main Resource Sections */}
        <div className="space-y-4">
          {categories.map((category, idx) => {
            const theme = elasticThemes[idx % elasticThemes.length]
            
            const renderCategory = (cat: NavigationCategory, level: number = 0) => {
              if (!hasNavigationsInTree(cat)) return null
              
              const ownNavs = getOwnNavigations(cat.id!)
              const filteredOwnNavs = filterNavigations(ownNavs)
              const isExpanded = expandedCategories.has(cat.id!)
              const CategoryIcon = cat.icon && iconMap[cat.icon] ? iconMap[cat.icon] : Layers

              // 子分类处理逻辑：由主分类统一管理布局
              if (level > 0) return null;

              const subCategories = cat.children || []
              
              // 计算所有子分类的过滤后数量
              const totalFilteredSubNavs = subCategories.reduce((sum, sub) => {
                if (!expandedCategories.has(sub.id!)) return sum
                return sum + filterNavigations(getOwnNavigations(sub.id!)).length
              }, 0)
              
              // 如果搜索时没有匹配结果，隐藏该分类
              if (searchKeyword.trim() && filteredOwnNavs.length === 0 && totalFilteredSubNavs === 0) {
                return null
              }

              return (
                <Fragment key={cat.id}>
                  <section className="scroll-mt-24">
                    {/* Header Card */}
                    <div 
                      onClick={() => toggleCategory(cat.id!)}
                      className={cn(
                        "flex flex-col md:flex-row md:items-center justify-between p-4 cursor-pointer transition-all duration-300",
                        "rounded-none shadow-sm border",
                        theme.bg, theme.border,
                        isExpanded ? "mb-0 border-b-0" : "mb-6",
                        "relative overflow-hidden group"
                      )}
                    >
                      {/* Subtle Dot Pattern */}
                      <div className="absolute right-0 top-0 w-48 h-full opacity-[0.04] dark:opacity-[0.08] pointer-events-none" 
                        style={{ backgroundImage: 'radial-gradient(circle, currentColor 1.2px, transparent 1.2px)', backgroundSize: '12px 12px', color: theme.color }} 
                      />

                      <div className="flex flex-1 flex-col md:flex-row md:items-center gap-4 md:gap-8 relative z-10">
                        {/* 1. 主分类显示区域 */}
                        <div className="flex items-center gap-4 group/title select-none">
                          <div className={cn(
                            "w-12 h-12 rounded-none flex items-center justify-center shrink-0 transition-transform duration-500 group-hover/title:scale-105 shadow-sm",
                            theme.iconBg
                          )}>
                            <CategoryIcon className="w-6 h-6 text-white" strokeWidth={2} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className={cn("text-[16px] font-bold tracking-tight", theme.text)}>
                                {cat.name}
                              </h3>
                              <span className={cn("flex items-center justify-center w-5 h-5 rounded-none text-[9px] font-bold text-white shadow-sm", theme.badge)}>
                                {searchKeyword.trim() ? filteredOwnNavs.length : ownNavs.length}
                              </span>
                            </div>
                            <p className={cn("text-[12px] font-medium opacity-80 mt-0.5", theme.desc)}>
                              {cat.description || `Explore ${cat.name}`}
                            </p>
                          </div>
                        </div>

                        {/* 2. 子分类标签区域 */}
                        {subCategories.length > 0 && (
                          <div className="flex flex-wrap gap-2 py-2 md:py-0 border-t md:border-t-0 border-black/5">
                            {subCategories.map(sub => {
                              const isSubExpanded = expandedCategories.has(sub.id!)
                              const subNavs = getOwnNavigations(sub.id!)
                              if (subNavs.length === 0 && (!sub.children || sub.children.length === 0)) return null
                              
                              return (
                                <button
                                  key={sub.id}
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    const isSubExpanded = expandedCategories.has(sub.id!)
                                    // 点击子分类：如果要展开子分类，确保父分类也同步展开
                                    if (!isExpanded && !isSubExpanded) {
                                      toggleCategory(cat.id!)
                                    }
                                    toggleCategory(sub.id!)
                                  }}
                                  className={cn(
                                    "px-3 py-1.5 text-[11px] font-bold transition-all border flex items-center gap-2 select-none",
                                    isSubExpanded 
                                      ? [theme.iconBg, "text-white border-transparent shadow-md scale-105"] 
                                      : "bg-white/50 dark:bg-black/20 text-slate-600 dark:text-slate-300 border-black/5 hover:bg-white dark:hover:bg-white/10"
                                  )}
                                >
                                  {sub.name}
                                  <span className={cn(
                                    "px-1.5 py-0.5 rounded-none text-[9px]",
                                    isSubExpanded ? "bg-white/20" : "bg-black/5 dark:bg-white/5"
                                  )}>
                                    {searchKeyword.trim() ? filterNavigations(subNavs).length : subNavs.length}
                                  </span>
                                </button>
                              )
                            })}
                          </div>
                        )}
                      </div>
                      
                      {/* 3. 右侧主分类折叠按钮 */}
                      <div className="flex items-center gap-4 relative z-10 mr-2 self-end md:self-auto mt-2 md:mt-0">
                        <button 
                          onClick={() => toggleCategory(cat.id!)}
                          className={cn(
                            "w-8 h-8 rounded-none flex items-center justify-center transition-all duration-300 bg-white/50 dark:bg-black/20",
                            theme.text
                          )}
                        >
                          <ChevronDown className={cn("w-4 h-4 transition-transform duration-500", isExpanded ? "rotate-180" : "rotate-0")} />
                        </button>
                      </div>
                    </div>

                    {/* Content Section */}
                    {isExpanded && (
                      <div className={cn(
                        "p-4 pt-6 space-y-8 animate-in fade-in slide-in-from-top-2 duration-300",
                        "border border-t-0 border-slate-200 dark:border-slate-800 bg-white dark:bg-[#11141D] mb-8"
                      )}>
                        
                        {/* A. 主分类关联网站 */}
                        {filteredOwnNavs.length > 0 && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3">
                            {filteredOwnNavs.map((nav) => {
                              const hasError = imageErrors.has(nav.id!)
                              return (
                                <a
                                  key={nav.id}
                                  href={nav.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className={cn(
                                    "flex items-center gap-3 p-3 bg-white dark:bg-[#11141D] border border-slate-100 dark:border-slate-800/50",
                                    "rounded-none transition-all duration-200 hover:shadow-md hover:border-[#005a9e]/20 group"
                                  )}
                                >
                                  <div className="shrink-0 w-10 h-10 bg-slate-50 dark:bg-white/5 rounded-none flex items-center justify-center border border-slate-100 dark:border-slate-800/50 overflow-hidden group-hover:bg-white transition-colors">
                                    {nav.icon && !hasError ? (
                                      <img src={nav.icon} alt="" className="w-full h-full object-contain p-2" onError={() => setImageErrors(prev => new Set(prev).add(nav.id!))} />
                                    ) : (
                                      <Globe className="w-5 h-5 text-slate-300 dark:text-slate-600" strokeWidth={1.5} />
                                    )}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <h4 className="text-[13px] font-bold text-slate-800 dark:text-slate-200 truncate group-hover:text-[#005a9e] transition-colors leading-tight">{nav.name}</h4>
                                    <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium truncate mt-0.5">{nav.description || nav.name}</p>
                                  </div>
                                  <ExternalLink className="shrink-0 w-3 h-3 text-slate-300 group-hover:text-[#005a9e] transition-all opacity-40 group-hover:opacity-100" />
                                </a>
                              )
                            })}
                          </div>
                        )}

                        {/* B. 已展开的子分类网站列表 (显示在主分类网站下面) */}
                        {subCategories.map(sub => {
                          const isSubExpanded = expandedCategories.has(sub.id!)
                          const subNavs = getOwnNavigations(sub.id!)
                          const filteredSubNavs = filterNavigations(subNavs)
                          if (!isSubExpanded || filteredSubNavs.length === 0) return null

                          return (
                            <div key={sub.id} className="space-y-4 animate-in fade-in slide-in-from-left-2 duration-300">
                              <div className="flex items-center gap-3">
                                <div className={cn("w-1 h-4", theme.iconBg)} />
                                <h4 className="text-[13px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider">{sub.name}</h4>
                                <span className="text-[10px] text-slate-400 font-bold">{filteredSubNavs.length} ITEMS</span>
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3">
                                {filteredSubNavs.map((nav) => {
                                  const hasError = imageErrors.has(nav.id!)
                                  return (
                                    <a
                                      key={nav.id}
                                      href={nav.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className={cn(
                                        "flex items-center gap-3 p-3 bg-slate-50/50 dark:bg-slate-800/20 border border-slate-100 dark:border-slate-800/50",
                                        "rounded-none transition-all duration-200 hover:shadow-md hover:border-[#005a9e]/20 group"
                                      )}
                                    >
                                      <div className="shrink-0 w-10 h-10 bg-white dark:bg-[#11141D] rounded-none flex items-center justify-center border border-slate-100 dark:border-slate-800/50 overflow-hidden transition-colors">
                                        {nav.icon && !hasError ? (
                                          <img src={nav.icon} alt="" className="w-full h-full object-contain p-2" onError={() => setImageErrors(prev => new Set(prev).add(nav.id!))} />
                                        ) : (
                                          <Globe className="w-5 h-5 text-slate-300 dark:text-slate-600" strokeWidth={1.5} />
                                        )}
                                      </div>
                                      <div className="min-w-0 flex-1">
                                        <h4 className="text-[13px] font-bold text-slate-800 dark:text-slate-200 truncate group-hover:text-[#005a9e] transition-colors leading-tight">{nav.name}</h4>
                                        <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium truncate mt-0.5">{nav.description || nav.name}</p>
                                      </div>
                                      <ExternalLink className="shrink-0 w-3 h-3 text-slate-300 group-hover:text-[#005a9e] transition-all opacity-40 group-hover:opacity-100" />
                                    </a>
                                  )
                                })}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </section>
                </Fragment>
              )
            }

            return renderCategory(category)
          })}
        </div>

      </main>
    </div>
  )
}

export default Dashboard
