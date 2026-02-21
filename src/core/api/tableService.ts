import api from './axiosInstance'
import { RestaurantTable, TableSession, Invoice } from '@/types'

export interface CreateTableRequest {
  tableNumber: number
  name?: string
  capacity?: number
  zone?: string
  displayOrder?: number
}

export interface UpdateTableRequest {
  tableNumber?: number
  name?: string
  capacity?: number
  zone?: string
  displayOrder?: number
  isActive?: boolean
}

export interface OpenTableRequest {
  guestCount?: number
  customerId?: number | null
  notes?: string
}

export interface AddTableItemsRequest {
  items: {
    productId: number
    quantity: number
    unitPrice: number
    discountAmount?: number
    notes?: string
  }[]
  priority?: boolean
  priorityReason?: string
}

export interface PayTableRequest {
  paymentMethod: string
  amountReceived: number
  discountPercent?: number
  serviceChargePercent?: number
  deliveryChargeAmount?: number
  notes?: string
}

export const tableService = {
  // CRUD
  getAll: () => api.get<RestaurantTable[]>('/tables'),

  getById: (id: number) => api.get<RestaurantTable>(`/tables/${id}`),

  create: (request: CreateTableRequest) => api.post<RestaurantTable>('/tables', request),

  update: (id: number, request: UpdateTableRequest) => api.put<RestaurantTable>(`/tables/${id}`, request),

  delete: (id: number) => api.delete(`/tables/${id}`),

  changeStatus: (id: number, status: string) => api.put<RestaurantTable>(`/tables/${id}/status`, { status }),

  // Sessions
  openTable: (id: number, request: OpenTableRequest) => api.post<TableSession>(`/tables/${id}/open`, request),

  addItems: (id: number, request: AddTableItemsRequest) => api.post<TableSession>(`/tables/${id}/add-items`, request),

  removeItem: (id: number, detailId: number) => api.delete<TableSession>(`/tables/${id}/items/${detailId}`),

  payTable: (id: number, request: PayTableRequest) => api.post<Invoice>(`/tables/${id}/pay`, request),

  releaseTable: (id: number) => api.post<RestaurantTable>(`/tables/${id}/release`),

  getActiveSession: (id: number) => api.get<TableSession>(`/tables/${id}/session`),

  getActiveSessions: () => api.get<TableSession[]>('/tables/sessions/active'),
}
