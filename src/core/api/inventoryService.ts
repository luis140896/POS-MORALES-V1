import api from './axiosInstance'
import { Inventory, InventoryMovement } from '@/types'

export const inventoryService = {
  getAll: () => api.get<Inventory[]>('/inventory'),
  
  getByProductId: (productId: number) => 
    api.get<Inventory>(`/inventory/product/${productId}`),
  
  getLowStock: () => api.get<Inventory[]>('/inventory/low-stock'),
  
  getOutOfStock: () => api.get<Inventory[]>('/inventory/out-of-stock'),
  
  addStock: (productId: number, quantity: number, reason?: string) =>
    api.post<Inventory>(`/inventory/product/${productId}/add`, null, {
      params: { quantity, reason }
    }),
  
  removeStock: (productId: number, quantity: number, reason?: string) =>
    api.post<Inventory>(`/inventory/product/${productId}/remove`, null, {
      params: { quantity, reason }
    }),
  
  updateLimits: (productId: number, minStock: number, maxStock: number, location?: string) =>
    api.put<Inventory>(`/inventory/product/${productId}/limits`, null, {
      params: { minStock, maxStock, location }
    }),
  
  getMovementsByProduct: (productId: number) =>
    api.get<InventoryMovement[]>(`/inventory/movements/product/${productId}`),
  
  getMovementsByDateRange: (start: string, end: string) =>
    api.get<InventoryMovement[]>(`/inventory/movements?start=${start}&end=${end}`),
}
