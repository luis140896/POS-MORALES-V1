import axios from 'axios'

export const authService = {
  login: async (credentials: { username: string; password: string }) => {
    const response = await axios.post('/api/auth/login', credentials)
    return response.data?.data ?? response.data
  },

  refreshToken: async (refreshToken: string) => {
    const response = await axios.post('/api/auth/refresh', { refreshToken })
    return response.data?.data ?? response.data
  },

  logout: async () => {
    const response = await axios.post('/api/auth/logout')
    return response.data?.data ?? response.data
  },
}
