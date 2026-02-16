import api from './axiosInstance'
import { Invoice, PaginatedResponse } from '@/types'

export interface SaleDetailRequest {
  productId: number
  quantity: number
  unitPrice: number
  discountAmount?: number
  notes?: string
}

export interface CreateSaleRequest {
  customerId?: number | null
  paymentMethod: string
  discountPercent?: number
  serviceChargePercent?: number
  deliveryChargeAmount?: number
  amountReceived: number
  notes?: string
  details: SaleDetailRequest[]
}

export interface VoidInvoiceRequest {
  reason: string
}

export interface TodayStats {
  totalSales: number
  salesCount: number
}

export const invoiceService = {
  getAll: (page = 0, size = 200) => 
    api.get<PaginatedResponse<Invoice>>(`/invoices?page=${page}&size=${size}&sort=createdAt,desc`),
  
  getById: (id: number) => api.get<Invoice>(`/invoices/${id}`),
  
  getByInvoiceNumber: (invoiceNumber: string) => 
    api.get<Invoice>(`/invoices/number/${invoiceNumber}`),
  
  getByCustomer: (customerId: number) => 
    api.get<Invoice[]>(`/invoices/customer/${customerId}`),
  
  getTodaySales: () => api.get<Invoice[]>('/invoices/today'),
  
  getByDateRange: (start: string, end: string) =>
    api.get<Invoice[]>(`/invoices/date-range?start=${start}&end=${end}`),
  
  getTodayStats: () => api.get<TodayStats>('/invoices/stats/today'),
  
  createSale: (request: CreateSaleRequest) => 
    api.post<Invoice>('/invoices', request),
  
  voidInvoice: (id: number, request: VoidInvoiceRequest) =>
    api.post<Invoice>(`/invoices/${id}/void`, request),
}
