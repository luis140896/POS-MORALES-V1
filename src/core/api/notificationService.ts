import api from './axiosInstance'
import { Notification, PaginatedResponse } from '@/types'

export const notificationService = {
  getAll: (page = 0, size = 20) =>
    api.get<PaginatedResponse<Notification>>(`/notifications?page=${page}&size=${size}`),

  getUnreadCount: () =>
    api.get<{ count: number }>('/notifications/unread'),

  getUnreadList: () =>
    api.get<Notification[]>('/notifications/unread/list'),

  markAsRead: (id: number) =>
    api.put(`/notifications/${id}/read`),

  markAllAsRead: () =>
    api.put<{ marked: number }>('/notifications/read-all'),
}
