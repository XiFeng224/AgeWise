import axios from 'axios'
import { message } from 'antd'

const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || '/api'

const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
})

const refreshToken = async () => {
  try {
    const currentRefreshToken = localStorage.getItem('refreshToken')
    if (!currentRefreshToken) {
      throw new Error('刷新令牌不存在')
    }

    const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
      refreshToken: currentRefreshToken
    })

    const newAccessToken = response.data?.data?.accessToken
    if (newAccessToken) {
      localStorage.setItem('token', newAccessToken)
      return newAccessToken
    }

    throw new Error(response.data?.error || '刷新令牌失败')
  } catch (error) {
    console.error('刷新令牌错误:', error)
    throw error
  }
}

axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

axiosInstance.interceptors.response.use(
  (response) => {
    const payload = response.data
    if (payload && typeof payload.success === 'boolean' && payload.success === false) {
      return Promise.reject(new Error(payload.error || '请求失败'))
    }
    return response
  },
  async (error) => {
    const originalRequest = error.config

    if (error.response?.status === 401 && !originalRequest?._retry) {
      originalRequest._retry = true

      try {
        const newToken = await refreshToken()
        originalRequest.headers.Authorization = `Bearer ${newToken}`
        return axiosInstance(originalRequest)
      } catch (refreshError) {
        localStorage.removeItem('token')
        localStorage.removeItem('refreshToken')
        localStorage.removeItem('user')

        message.error('登录已过期，请重新登录')
        window.location.href = '/login'
        return Promise.reject(refreshError)
      }
    }

    const backendError = error.response?.data?.error
    if (!error?.config?.suppressGlobalError) {
      message.error(backendError || '网络请求失败，请稍后重试')
    }

    return Promise.reject(error)
  }
)

export default axiosInstance
