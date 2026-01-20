import { useState, useEffect, useMemo, useRef } from 'react'
import {
  Globe,
  ChevronRight,
  ExternalLink,
  Layers,
  Search,
  X,
  Sparkles
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { getNavigationCategoryList, getNavigationList, NavigationCategory, Navigation } from '@/api/navigation'
import { iconMap } from '@/components/IconSelector'

const categoryColors = [
  { gradient: 'from-blue-500 to-cyan-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20', text: 'text-blue-600 dark:text-blue-400' },
  { gradient: 'from-violet-500 to-purple-400', bg: 'bg-violet-500/10', border: 'border-violet-500/20', text: 'text-violet-600 dark:text-violet-400' },
  { gradient: 'from-emerald-500 to-teal-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', text: 'text-emerald-600 dark:text-emerald-400' },
  { gradient: 'from-orange-500 to-amber-400', bg: 'bg-orange-500/10', border: 'border-orange-500/20', text: 'text-orange-600 dark:text-orange-400' },
  { gradient: 'from-rose-500 to-pink-400', bg: 'bg-rose-500/10', border: 'border-rose-500/20', text: 'text-rose-600 dark:text-rose-400' },
]

const Dashboard = () => {
  const { t } = useTranslation()
  const [categories, setCategories] = useState<NavigationCategory[]>([])
  const [navigations, setNavigations] = useState<Navigation[]>([])
  const [loading, setLoading] = useState(true)
  const [imageErrors, setImageErrors] = useState<Set<number>>(new Set())
  const [expandedCategories, setExpandedCategories] = useState<Set<number>>(new Set())
  const [searchKeyword, setSearchKeyword] = useState('')
  const [activeCategory, setActiveCategory] = useState<number | null>(null)

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

  const totalNavCount = useMemo(() => navigations.filter(n => n.status === 1).length, [navigations])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-primary to-primary/60 animate-pulse" />
            <Sparkles className="absolute -top-1 -right-1 h-5 w-5 text-primary motion-safe:animate-bounce" />
          </div>
          <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/5 via-background to-muted/30 border border-border/50 mb-8">
        <div className="absolute inset-0 bg-grid-pattern opacity-[0.02]" />
        <div className="relative px-6 py-8 md:px-8 md:py-10">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Layers className="h-5 w-5" />
                </div>
                <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">
                  {t('dashboard.devopsCenter')}
                </h1>
              </div>
              <p className="text-muted-foreground max-w-lg">
                {t('dashboard.oneStopPlatform')}
              </p>
              <div className="flex items-center gap-4 pt-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-primary/10 text-xs font-semibold text-primary">{categories.length}</span>
                  <span>{t('dashboard.categories')}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-500/10 text-xs font-semibold text-emerald-600 dark:text-emerald-400">{totalNavCount}</span>
                  <span>{t('dashboard.sites')}</span>
                </div>
              </div>
            </div>

            {/* Search */}
            <div className="w-full md:w-80">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  placeholder={t('dashboard.searchPlaceholder')}
                  aria-label={t('dashboard.searchPlaceholder')}
                  className="w-full h-10 pl-10 pr-10 rounded-xl bg-background/80 backdrop-blur-sm border border-border/50 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all"
                />
                {searchKeyword && (
                  <button
                    onClick={() => setSearchKeyword('')}
                    aria-label={t('dashboard.clearSearch')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-muted rounded-md transition-colors"
                  >
                    <X className="h-3 w-3 text-muted-foreground" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Category Pills */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => setActiveCategory(null)}
          className={cn(
            "px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer",
            activeCategory === null
              ? "bg-primary text-primary-foreground shadow-md"
              : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
        >
          {t('dashboard.all')}
        </button>
        {categories.filter(c => hasNavigationsInTree(c)).map((cat, idx) => {
          const color = categoryColors[idx % categoryColors.length]
          return (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(activeCategory === cat.id ? null : cat.id!)}
              className={cn(
                "px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer",
                activeCategory === cat.id
                  ? `bg-gradient-to-r ${color.gradient} text-white shadow-md`
                  : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              {cat.name}
            </button>
          )
        })}
      </div>

      {/* Navigation Grid */}
      <div className="space-y-6">
        {categories.map((category, idx) => {
          if (!hasNavigationsInTree(category)) return null
          if (activeCategory !== null && activeCategory !== category.id) return null

          const color = categoryColors[idx % categoryColors.length]
          const ownNavs = getOwnNavigations(category.id!)
          const filteredOwnNavs = filterNavigations(ownNavs)
          const subCategories = category.children || []
          const isExpanded = expandedCategories.has(category.id!)
          const CategoryIcon = category.icon && iconMap[category.icon] ? iconMap[category.icon] : Layers

          const totalFilteredSubNavs = subCategories.reduce((sum, sub) => {
            if (!expandedCategories.has(sub.id!)) return sum
            return sum + filterNavigations(getOwnNavigations(sub.id!)).length
          }, 0)

          if (searchKeyword.trim() && filteredOwnNavs.length === 0 && totalFilteredSubNavs === 0) {
            return null
          }

          return (
            <section key={category.id} className="group">
              {/* Category Header */}
              <div
                onClick={() => toggleCategory(category.id!)}
                className={cn(
                  "flex items-center justify-between p-4 rounded-xl cursor-pointer transition-all duration-200",
                  "bg-card/50 backdrop-blur-sm border border-border/50",
                  "hover:bg-card hover:shadow-sm",
                  isExpanded && "rounded-b-none border-b-0"
                )}
              >
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br",
                    color.gradient,
                    "text-white shadow-sm"
                  )}>
                    <CategoryIcon className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-semibold text-foreground">{category.name}</h2>
                      <span className={cn("px-2 py-0.5 rounded-md text-xs font-medium", color.bg, color.text)}>
                        {searchKeyword.trim() ? filteredOwnNavs.length : ownNavs.length}
                      </span>
                    </div>
                    {category.description && (
                      <p className="text-sm text-muted-foreground mt-0.5">{category.description}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {/* Sub-category pills */}
                  {subCategories.length > 0 && (
                    <div className="hidden md:flex items-center gap-1.5">
                      {subCategories.slice(0, 3).map(sub => {
                        const subNavs = getOwnNavigations(sub.id!)
                        if (subNavs.length === 0) return null
                        const isSubExpanded = expandedCategories.has(sub.id!)
                        return (
                          <button
                            key={sub.id}
                            onClick={(e) => {
                              e.stopPropagation()
                              if (!isExpanded) toggleCategory(category.id!)
                              toggleCategory(sub.id!)
                            }}
                            className={cn(
                              "px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer",
                              isSubExpanded
                                ? `${color.bg} ${color.text}`
                                : "bg-muted/50 text-muted-foreground hover:bg-muted"
                            )}
                          >
                            {sub.name}
                          </button>
                        )
                      })}
                      {subCategories.length > 3 && (
                        <span className="text-xs text-muted-foreground">+{subCategories.length - 3}</span>
                      )}
                    </div>
                  )}
                  <ChevronRight className={cn(
                    "h-5 w-5 text-muted-foreground transition-transform duration-200",
                    isExpanded && "rotate-90"
                  )} />
                </div>
              </div>

              {/* Navigation Cards */}
              {isExpanded && (
                <div className="p-4 pt-5 rounded-b-xl border border-t-0 border-border/50 bg-card/30 backdrop-blur-sm space-y-6">
                  {/* Main category navigations */}
                  {filteredOwnNavs.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3">
                      {filteredOwnNavs.map((nav) => (
                        <NavigationCard
                          key={nav.id}
                          nav={nav}
                          hasError={imageErrors.has(nav.id!)}
                          onError={() => setImageErrors(prev => new Set(prev).add(nav.id!))}
                        />
                      ))}
                    </div>
                  )}

                  {/* Sub-category navigations */}
                  {subCategories.map(sub => {
                    const isSubExpanded = expandedCategories.has(sub.id!)
                    const subNavs = getOwnNavigations(sub.id!)
                    const filteredSubNavs = filterNavigations(subNavs)
                    if (!isSubExpanded || filteredSubNavs.length === 0) return null

                    return (
                      <div key={sub.id} className="space-y-3">
                        <div className="flex items-center gap-2">
                          <div className={cn("w-1 h-4 rounded-full bg-gradient-to-b", color.gradient)} />
                          <h3 className="text-sm font-semibold text-foreground">{sub.name}</h3>
                          <span className="text-xs text-muted-foreground">{t('dashboard.siteCount', { count: filteredSubNavs.length })}</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3">
                          {filteredSubNavs.map((nav) => (
                            <NavigationCard
                              key={nav.id}
                              nav={nav}
                              hasError={imageErrors.has(nav.id!)}
                              onError={() => setImageErrors(prev => new Set(prev).add(nav.id!))}
                            />
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </section>
          )
        })}
      </div>

      {/* Empty State */}
      {searchKeyword && categories.every(cat => {
        const ownNavs = filterNavigations(getOwnNavigations(cat.id!))
        const subNavs = (cat.children || []).reduce((sum, sub) => sum + filterNavigations(getOwnNavigations(sub.id!)).length, 0)
        return ownNavs.length === 0 && subNavs === 0
      }) && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted/50 mb-4">
            <Search className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-1">{t('dashboard.noResults')}</h3>
          <p className="text-sm text-muted-foreground">{t('dashboard.tryOtherKeywords')}</p>
        </div>
      )}
    </div>
  )
}

const NavigationCard = ({ nav, hasError, onError }: { nav: Navigation; hasError: boolean; onError: () => void }) => {
  return (
    <a
      href={nav.url}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "group flex items-center gap-3 p-3 rounded-xl cursor-pointer",
        "bg-background/60 backdrop-blur-sm border border-border/50",
        "hover:bg-background hover:shadow-md hover:border-primary/20",
        "transition-all duration-200"
      )}
    >
      <div className="shrink-0 flex h-10 w-10 items-center justify-center rounded-lg bg-muted/50 border border-border/50 overflow-hidden group-hover:border-primary/20 transition-colors">
        {nav.icon && !hasError ? (
          <img src={nav.icon} alt={nav.name} className="w-6 h-6 object-contain" onError={onError} />
        ) : (
          <Globe className="h-5 w-5 text-muted-foreground" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <h4 className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
          {nav.name}
        </h4>
        <p className="text-xs text-muted-foreground truncate mt-0.5">
          {nav.description || nav.url}
        </p>
      </div>
      <ExternalLink className="shrink-0 h-4 w-4 text-muted-foreground/50 group-hover:text-primary transition-colors" />
    </a>
  )
}

export default Dashboard
