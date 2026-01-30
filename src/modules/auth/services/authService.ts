import api from '@/core/api/axiosInstance'

export const authService = {
  login: (credentials: { username: string; password: string }) =>
    api.post('/auth/login', credentials),

  refreshToken: (refreshToken: string) =>
    api.post('/auth/refresh', { refreshToken }),

  logout: () => api.post('/auth/logout'),
}
