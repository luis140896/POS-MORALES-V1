import api from './axiosInstance'

export interface KitchenItem {
  detailId: number
  productName: string
  quantity: number
  notes: string | null
  kitchenStatus: string
  createdAt: string
}

export interface KitchenOrder {
  orderId: number
  invoiceNumber: string
  tableNumber: number | null
  tableName: string | null
  waiterName: string | null
  orderNotes: string | null
  createdAt: string
  sequenceNumber?: number
  isUrgent?: boolean
  urgencyReason?: string | null
  items: KitchenItem[]
}

export const kitchenService = {
  getPendingOrders: () => api.get<KitchenOrder[]>('/kitchen/orders'),

  updateItemStatus: (detailId: number, status: string) =>
    api.put<KitchenItem>(`/kitchen/orders/items/${detailId}/status`, { status }),
}
