import axios from 'axios'
import type {
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from 'axios'
import { message } from 'ant-design-vue'

/**
 * Axios 实例配置
 */
const DEFAULT_CONFIG: AxiosRequestConfig = {
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 60000,
  withCredentials: true,
}


/**
 * 创建 Axios 实例
 */
const request: AxiosInstance = axios.create(DEFAULT_CONFIG)

/**
 * 全局请求拦截器
 */
request.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // 可以在这里添加 token 等认证信息
    // const token = localStorage.getItem('token')
    // if (token) {
    //   config.headers.Authorization = `Bearer ${token}`
    // }
    return config
  },
  (error) => {
    console.error('请求错误:', error)
    return Promise.reject(error)
  },
)

/**
 * 全局响应拦截器
 */
request.interceptors.response.use(
  (response: AxiosResponse) => {
    const { data } = response

    // 未登录处理
    if (data.code === 40100) {
      // 不是获取用户信息的请求，且不在登录页面，则跳转登录页
      if (
        !response.request.responseURL.includes('user/get/login') &&
        !window.location.pathname.includes('/user/login')
      ) {
        message.warning('请先登录')
        window.location.href = `/user/login?redirect=${window.location.href}`
      }
    }

    return response
  },
  (error) => {
    // HTTP 错误状态码处理
    if (error.response) {
      const status = error.response.status

      switch (status) {
        case 400:
          message.error('请求参数错误')
          break
        case 401:
          message.error('未授权，请登录')
          break
        case 403:
          message.error('拒绝访问')
          break
        case 404:
          message.error('请求资源不存在')
          break
        case 500:
          message.error('服务器内部错误')
          break
        case 502:
          message.error('网关错误')
          break
        case 503:
          message.error('服务不可用')
          break
        case 504:
          message.error('网关超时')
          break
        default:
          message.error(`请求失败: ${error.message}`)
      }
    } else if (error.code === 'ECONNABORTED') {
      message.error('请求超时')
    } else {
      message.error('网络错误，请检查网络连接')
    }

    console.error('响应错误:', error)
    return Promise.reject(error)
  },
)

export default request
