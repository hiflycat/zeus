import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios'
import { toast } from 'sonner'
import { tokenStorage } from '@/utils/token'
import { useAuthStore } from '@/store/auth'

// 创建 axios 实例
const request: AxiosInstance = axios.create({
  baseURL: '/api/v1',
  timeout: 10000,
})

// 请求拦截器
request.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = tokenStorage.get()
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`
    }
    // 添加当前角色ID到请求头
    const { currentRoleId } = useAuthStore.getState()
    if (currentRoleId && config.headers) {
      config.headers['X-Current-Role-ID'] = currentRoleId.toString()
    }
    return config
  },
  (error: AxiosError) => {
    return Promise.reject(error)
  }
)

// 响应拦截器
request.interceptors.response.use(
  (response) => {
    const res = response.data
    // 如果返回的状态码为 200，说明接口请求成功
    if (res.code === 200) {
      return res.data
    } else {
      // 根据业务错误码显示错误提示
      const errorMessage = res.message || '请求失败'
      switch (res.code) {
        case 400:
          toast.error(errorMessage)
          break
        case 401:
          toast.error(errorMessage)
          tokenStorage.remove()
          useAuthStore.getState().logout()
          window.location.href = '/login'
          break
        case 403:
          toast.error(errorMessage)
          break
        case 404:
          toast.error(errorMessage)
          break
        case 500:
          toast.error(errorMessage)
          break
        default:
          toast.error(errorMessage)
      }
      // 抛出错误，包含错误码和消息
      const error = new Error(errorMessage) as any
      error.code = res.code
      return Promise.reject(error)
    }
  },
  (error: AxiosError<any>) => {
    if (error.response) {
      const res = error.response.data
      // 如果响应中有业务错误码，使用业务错误码
      if (res?.code) {
        const errorMessage = res.message || '请求失败'
        switch (res.code) {
          case 400:
            toast.error(errorMessage)
            break
          case 401:
            toast.error(errorMessage)
            tokenStorage.remove()
            useAuthStore.getState().logout()
            window.location.href = '/login'
            break
          case 403:
            toast.error(errorMessage)
            break
          case 404:
            toast.error(errorMessage)
            break
          case 500:
            toast.error(errorMessage)
            break
          default:
            toast.error(errorMessage)
        }
      } else {
        // 否则使用 HTTP 状态码
        switch (error.response.status) {
          case 401:
            toast.error('未授权，请先登录')
            tokenStorage.remove()
            useAuthStore.getState().logout()
            window.location.href = '/login'
            break
          case 403:
            toast.error('权限不足')
            break
          case 404:
            toast.error('请求的资源不存在')
            break
          case 500:
            toast.error('服务器内部错误')
            break
          default:
            toast.error(res?.message || '请求失败')
        }
      }
    } else if (error.request) {
      toast.error('网络错误，请检查网络连接')
    } else {
      toast.error('请求配置错误')
    }
    return Promise.reject(error)
  }
)

export default request
