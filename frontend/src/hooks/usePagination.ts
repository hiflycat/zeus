import { useState, useEffect, useCallback, useRef, useMemo } from 'react'

export interface PaginationParams {
  page: number
  page_size: number
  keyword?: string
  [key: string]: any
}

export interface PaginationResponse<T> {
  list: T[]
  total: number
  page: number
  page_size: number
}

export interface UsePaginationOptions<T> {
  fetchFn: (params: PaginationParams) => Promise<PaginationResponse<T>>
  defaultPageSize?: number
  defaultParams?: Record<string, any>
  immediate?: boolean
}

export function usePagination<T>({
  fetchFn,
  defaultPageSize = 10,
  defaultParams = {},
  immediate = true,
}: UsePaginationOptions<T>) {
  const [data, setData] = useState<T[]>([])
  const [loading, setLoading] = useState(immediate)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(defaultPageSize)
  const [searchKeyword, setSearchKeyword] = useState('')
  const [extraParams, setExtraParams] = useState<Record<string, any>>(defaultParams)
  const isInitialMount = useRef(true)
  const hasDataRef = useRef(false)
  const fetchFnRef = useRef(fetchFn)
  const extraParamsRef = useRef(extraParams)
  const searchKeywordRef = useRef(searchKeyword)

  // 更新 ref，避免依赖项变化
  useEffect(() => {
    fetchFnRef.current = fetchFn
  }, [fetchFn])

  useEffect(() => {
    extraParamsRef.current = extraParams
  }, [extraParams])

  useEffect(() => {
    searchKeywordRef.current = searchKeyword
  }, [searchKeyword])

  const fetchData = useCallback(async (silent = false) => {
    // 如果不是首次加载且已有数据，静默加载
    if (silent || (!isInitialMount.current && hasDataRef.current)) {
      // 静默加载，不改变 loading 状态
    } else {
      setLoading(true)
    }

    try {
      const params: PaginationParams = {
        page,
        page_size: pageSize,
        keyword: searchKeywordRef.current || undefined,
        ...extraParamsRef.current,
      }
      const response = await fetchFnRef.current(params)
      setData(response.list || [])
      setTotal(response.total || 0)
      hasDataRef.current = (response.list || []).length > 0
    } catch (error) {
      console.error('Fetch data error:', error)
      throw error
    } finally {
      setLoading(false)
      isInitialMount.current = false
    }
  }, [page, pageSize])

  // 使用序列化来比较 extraParams，避免对象引用变化导致的重复请求
  // 对键进行排序，确保相同内容的对象序列化结果一致
  const extraParamsStr = useMemo(() => {
    const sortedKeys = Object.keys(extraParams).sort()
    const sortedParams: Record<string, any> = {}
    sortedKeys.forEach(key => {
      sortedParams[key] = extraParams[key]
    })
    return JSON.stringify(sortedParams)
  }, [extraParams])

  // 初始加载或参数变化时获取数据（已有数据时静默加载，避免闪烁）
  useEffect(() => {
    if (immediate) {
      // 如果已有数据，静默加载；否则显示加载状态
      fetchData(hasDataRef.current)
    }
  }, [page, pageSize, extraParamsStr, fetchData, immediate])

  const handlePageChange = useCallback((newPage: number, newPageSize: number) => {
    setPage(newPage)
    setPageSize(newPageSize)
  }, [])

  const handleSearch = useCallback((keyword: string) => {
    setSearchKeyword(keyword)
  }, [])

  // 回车搜索
  const handleSearchSubmit = useCallback(() => {
    if (page === 1) {
      // 如果已有数据，静默加载；否则显示加载状态
      fetchData(hasDataRef.current)
    } else {
      setPage(1)
    }
  }, [page, fetchData])

  const handleParamsChange = useCallback((params: Record<string, any>) => {
    setExtraParams(prev => {
      // 检查参数是否真的改变了
      const newParams = { ...prev, ...params }
      const prevStr = JSON.stringify(prev)
      const newStr = JSON.stringify(newParams)
      if (prevStr === newStr) {
        return prev // 如果内容相同，返回原对象，避免不必要的更新
      }
      return newParams
    })
    setPage(1)
  }, [])

  const refresh = useCallback((silent = false) => {
    fetchData(silent)
  }, [fetchData])

  return {
    data,
    loading,
    total,
    page,
    pageSize,
    searchKeyword,
    handlePageChange,
    handleSearch,
    handleSearchSubmit,
    handleParamsChange,
    refresh,
  }
}
