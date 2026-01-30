import api from './axiosInstance'
import { User, Role } from '@/types'

export interface CreateUserRequest {
  username: string
  email: string
  password: string
  fullName: string
  roleId: number
  isActive?: boolean
}

export interface UpdateUserRequest {
  email?: string
  fullName?: string
  roleId?: number
  isActive?: boolean
}

export const userService = {
  getAll: () => api.get<User[]>('/users'),

  getById: (id: number) => api.get<User>(`/users/${id}`),

  create: (data: CreateUserRequest) => api.post<User>('/users', data),

  update: (id: number, data: UpdateUserRequest) => api.put<User>(`/users/${id}`, data),

  delete: (id: number) => api.delete(`/users/${id}`),

  changePassword: (id: number, newPassword: string) =>
    api.post(`/users/${id}/change-password`, { newPassword }),

  getRoles: () => api.get<Role[]>('/roles'),
}
