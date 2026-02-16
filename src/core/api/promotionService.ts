import api from './axiosInstance'

export interface Promotion {
  id: number
  name: string
  description?: string
  discountPercent: number
  scheduleType: 'DAILY' | 'WEEKLY' | 'SPECIFIC_DATE'
  daysOfWeek?: string
  startDate?: string
  endDate?: string
  isActive: boolean
  applyToAllProducts: boolean
  priority: number
  createdAt: string
  updatedAt: string
}

export interface CreatePromotionRequest {
  name: string
  description?: string
  discountPercent: number
  scheduleType: 'DAILY' | 'WEEKLY' | 'SPECIFIC_DATE'
  daysOfWeek?: string
  startDate?: string
  endDate?: string
  isActive?: boolean
  applyToAllProducts?: boolean
  priority?: number
}

export interface UpdatePromotionRequest {
  name?: string
  description?: string
  discountPercent?: number
  scheduleType?: 'DAILY' | 'WEEKLY' | 'SPECIFIC_DATE'
  daysOfWeek?: string
  startDate?: string
  endDate?: string
  isActive?: boolean
  applyToAllProducts?: boolean
  priority?: number
}

export const promotionService = {
  getAll: () => api.get<Promotion[]>('/promotions'),
  
  getById: (id: number) => api.get<Promotion>(`/promotions/${id}`),
  
  getActive: () => api.get<Promotion[]>('/promotions/active'),
  
  getToday: () => api.get<Promotion>('/promotions/today'),
  
  create: (promotion: CreatePromotionRequest) => api.post<Promotion>('/promotions', promotion),
  
  update: (id: number, promotion: UpdatePromotionRequest) => api.put<Promotion>(`/promotions/${id}`, promotion),
  
  toggle: (id: number) => api.patch<Promotion>(`/promotions/${id}/toggle`),
  
  delete: (id: number) => api.delete(`/promotions/${id}`),
}
