import api from './axiosInstance'
import { Role } from '@/types'

export interface CreateRoleRequest {
  name: string
  description?: string
  permissions: string[]
}

export interface UpdateRoleRequest {
  name?: string
  description?: string
  permissions?: string[]
}

export const roleService = {
  getAll: () => api.get<Role[]>('/roles'),
  create: (data: CreateRoleRequest) => api.post<Role>('/roles', data),
  update: (id: number, data: UpdateRoleRequest) => api.put<Role>(`/roles/${id}`, data),
  delete: (id: number) => api.delete(`/roles/${id}`),
}
