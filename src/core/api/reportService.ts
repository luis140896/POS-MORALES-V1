import api from './axiosInstance'

export interface SalesSummary {
  totalSales: number
  totalTransactions: number
  salesCount: number
  averageTicket: number
  totalProfit: number
  grossProfit: number
  totalCost: number
  profitMargin: number
}

export interface DailySale {
  date: string
  total: number
  count: number
}

export interface TopProduct {
  productId: number
  productName: string
  totalQuantity: number
  totalRevenue: number
}

export interface TopCustomer {
  customerId: number
  customerName: string
  totalPurchases: number
  totalSpent: number
}

export interface CategorySale {
  categoryId: number
  categoryName: string
  totalSales: number
  percentage: number
}

export interface PaymentMethodStat {
  paymentMethod: string
  count: number
  totalSales?: number
  total?: number
  percentage: number
}

export interface InventorySummary {
  totalProducts: number
  lowStockCount: number
  outOfStockCount: number
  totalCostValue: number
  totalSaleValue: number
}

// Dashboard endpoints — accessible to ALL authenticated users
export const dashboardService = {
  getSalesSummary: (startDate: string, endDate: string) =>
    api.get<SalesSummary>(`/dashboard/sales/summary?start=${startDate}&end=${endDate}`),

  getDailySales: (startDate: string, endDate: string) =>
    api.get<DailySale[]>(`/dashboard/sales/daily?startDate=${startDate.split('T')[0]}&endDate=${endDate.split('T')[0]}`),
}

// Report endpoints — restricted to ADMIN, SUPERVISOR, REPORTES
export const reportService = {
  getSalesSummary: (startDate: string, endDate: string) =>
    api.get<SalesSummary>(`/reports/sales/summary?start=${startDate}&end=${endDate}`),

  getDailySales: (startDate: string, endDate: string) =>
    api.get<DailySale[]>(`/reports/sales/daily?startDate=${startDate.split('T')[0]}&endDate=${endDate.split('T')[0]}`),

  getTopProducts: (startDate: string, endDate: string, limit = 10) =>
    api.get<TopProduct[]>(`/reports/products/top?start=${startDate}&end=${endDate}&limit=${limit}`),

  getTopCustomers: (startDate: string, endDate: string, limit = 10) =>
    api.get<TopCustomer[]>(`/reports/customers/top?start=${startDate}&end=${endDate}&limit=${limit}`),

  getSalesByCategory: (startDate: string, endDate: string) =>
    api.get<CategorySale[]>(`/reports/sales/by-category?start=${startDate}&end=${endDate}`),

  getSalesByPaymentMethod: (startDate: string, endDate: string) =>
    api.get<PaymentMethodStat[]>(`/reports/sales/by-payment-method?start=${startDate}&end=${endDate}`),

  getInventorySummary: () =>
    api.get<InventorySummary>('/reports/inventory/value'),
}
