import api from './axiosInstance'

export const settingsService = {
  getConfig: () => api.get('/settings'),
  updateConfig: (config: any) => api.put('/settings', config),
}
