import axios, { AxiosRequestConfig } from 'axios'

const axiosInstance = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
})

axiosInstance.interceptors.request.use(
  (config) => {
    const url = config.url || ''
    const isAuthEndpoint = url.includes('/auth/login') || url.includes('/auth/refresh') || url.includes('/auth/logout')
    const token = localStorage.getItem('accessToken')
    if (token && !isAuthEndpoint) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

axiosInstance.interceptors.response.use(
  (response) => response.data?.data ?? response.data,
  async (error) => {
    const originalRequest = error.config
    const requestUrl = originalRequest?.url || ''
    const isAuthEndpoint = requestUrl.includes('/auth/login') || requestUrl.includes('/auth/refresh') || requestUrl.includes('/auth/logout')

    if (!isAuthEndpoint && (error.response?.status === 401 || error.response?.status === 403) && originalRequest && !originalRequest._retry) {
      originalRequest._retry = true

      try {
        const refreshToken = localStorage.getItem('refreshToken')
        if (refreshToken) {
          const response = await axios.post('/api/auth/refresh', { refreshToken })
          const { accessToken } = response.data.data

          localStorage.setItem('accessToken', accessToken)
          originalRequest.headers.Authorization = `Bearer ${accessToken}`

          return axiosInstance(originalRequest)
        }
      } catch (refreshError) {
        localStorage.removeItem('user')
        localStorage.removeItem('accessToken')
        localStorage.removeItem('refreshToken')
        window.location.href = '/login'
        return Promise.reject(refreshError)
      }
    }

    return Promise.reject(error)
  }
)

// Wrapper tipado que refleja que el interceptor extrae response.data
const api = {
  get: <T>(url: string, config?: AxiosRequestConfig): Promise<T> => 
    axiosInstance.get(url, config) as Promise<T>,
  
  post: <T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> => 
    axiosInstance.post(url, data, config) as Promise<T>,
  
  put: <T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> => 
    axiosInstance.put(url, data, config) as Promise<T>,
  
  patch: <T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> => 
    axiosInstance.patch(url, data, config) as Promise<T>,
  
  delete: <T>(url: string, config?: AxiosRequestConfig): Promise<T> => 
    axiosInstance.delete(url, config) as Promise<T>,
}

export default api
