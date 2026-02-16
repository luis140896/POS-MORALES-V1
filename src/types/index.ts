export interface Category {
  id: number
  name: string
  description?: string
  imageUrl?: string
  parentId?: number | null
  displayOrder: number
  isActive: boolean
  productCount?: number
  createdAt: string
  updatedAt: string
}

export interface Product {
  id: number
  code: string
  barcode?: string
  name: string
  description?: string
  categoryId: number
  category?: Category
  imageUrl?: string
  costPrice: number
  salePrice: number
  unit: string
  taxRate: number
  isActive: boolean
  inventory?: Inventory
  createdAt: string
  updatedAt: string
}

export interface Inventory {
  id: number
  productId: number
  product?: Product
  quantity: number
  minStock: number
  maxStock: number
  location?: string
  lastRestockDate?: string
  updatedAt: string
}

export interface InventoryMovement {
  id: number
  productId: number
  product?: Product
  movementType: 'ENTRADA' | 'SALIDA' | 'AJUSTE'
  quantity: number
  previousQuantity: number
  newQuantity: number
  referenceType?: string
  referenceId?: number
  reason?: string
  userId: number
  createdAt: string
}

export interface Customer {
  id: number
  documentType: string
  documentNumber: string
  fullName: string
  email?: string
  phone?: string
  address?: string
  city?: string
  notes?: string
  creditLimit: number
  currentBalance: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface Invoice {
  id: number
  invoiceNumber: string
  invoiceType: string
  customerId?: number | null
  customerName?: string
  customerDocument?: string
  customer?: Customer
  userId: number
  subtotal: number
  taxAmount: number
  discountAmount: number
  discountPercent: number
  total: number
  paymentMethod?: string
  paymentStatus: 'PAGADO' | 'PENDIENTE' | 'PARCIAL'
  amountReceived: number
  changeAmount: number
  status: 'COMPLETADA' | 'ANULADA' | 'PENDIENTE'
  notes?: string
  voidedBy?: number
  voidedAt?: string
  voidReason?: string
  details?: InvoiceDetail[]
  createdAt: string
  updatedAt: string
}

export interface InvoiceDetail {
  id: number
  invoiceId: number
  productId: number
  product?: Product
  productName: string
  quantity: number
  unitPrice: number
  costPrice: number
  discountAmount: number
  taxAmount: number
  subtotal: number
  notes?: string
  kitchenStatus?: string
  createdAt: string
}

export interface Role {
  id: number
  name: string
  description?: string
  permissions: string[]
  isSystem?: boolean
}

export interface User {
  id: number
  username: string
  email: string
  fullName: string
  role?: Role
  avatarUrl?: string
  isActive: boolean
  lastLogin?: string
  createdAt?: string
  updatedAt?: string
}

// ==================== Tables ====================

export interface RestaurantTable {
  id: number
  tableNumber: number
  name: string
  capacity: number
  status: 'DISPONIBLE' | 'OCUPADA' | 'RESERVADA' | 'FUERA_DE_SERVICIO'
  zone: string
  displayOrder: number
  isActive: boolean
  activeSession?: TableSession | null
  createdAt: string
  updatedAt: string
}

export interface TableSession {
  id: number
  tableId: number
  tableNumber: number
  tableName: string
  invoiceId?: number
  invoiceNumber?: string
  openedByName: string
  openedById: number
  closedByName?: string
  openedAt: string
  closedAt?: string
  guestCount: number
  notes?: string
  status: 'ABIERTA' | 'CERRADA' | 'TRANSFERIDA'
  subtotal?: number
  total?: number
  itemCount?: number
  invoice?: Invoice
}

// ==================== Notifications ====================

export interface Notification {
  id: number
  type: string
  title: string
  message: string
  severity: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL'
  targetRoles: string[]
  referenceType?: string
  referenceId?: number
  isRead: boolean
  readAt?: string
  createdAt: string
}

export interface PaginatedResponse<T> {
  content: T[]
  totalElements: number
  totalPages: number
  size: number
  number: number
  first: boolean
  last: boolean
}

export interface ApiResponse<T> {
  success: boolean
  message?: string
  data: T
  timestamp: string
}
