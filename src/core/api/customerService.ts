import api from './axiosInstance'
import { Customer, PaginatedResponse } from '@/types'

export const customerService = {
  getAll: (page = 0, size = 20) => 
    api.get<PaginatedResponse<Customer>>(`/customers?page=${page}&size=${size}`),
  
  getActive: () => api.get<Customer[]>('/customers/active'),
  
  search: (term: string) => api.get<Customer[]>(`/customers/search?term=${term}`),
  
  getById: (id: number) => api.get<Customer>(`/customers/${id}`),
  
  getByDocument: (documentType: string, documentNumber: string) =>
    api.get<Customer>(`/customers/document/${documentType}/${documentNumber}`),
  
  create: (customer: Partial<Customer>) => api.post<Customer>('/customers', customer),
  
  update: (id: number, customer: Partial<Customer>) => 
    api.put<Customer>(`/customers/${id}`, customer),
  
  delete: (id: number) => api.delete(`/customers/${id}`),
}
