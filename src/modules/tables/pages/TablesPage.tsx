import { useState, useEffect, useCallback } from 'react'
import { useSelector } from 'react-redux'
import {
  Plus, X, Users, Clock, Search, Loader2, CreditCard, Banknote,
  Minus, Trash2, ChevronRight, UtensilsCrossed, Coffee, AlertCircle, Printer, User, UserPlus, Edit2, Truck, ShoppingCart
} from 'lucide-react'
import toast from 'react-hot-toast'
import { RootState } from '@/app/store'
import { tableService, OpenTableRequest, AddTableItemsRequest, PayTableRequest } from '@/core/api/tableService'
import { productService } from '@/core/api/productService'
import { categoryService } from '@/core/api/categoryService'
import { customerService } from '@/core/api/customerService'
import { invoiceService } from '@/core/api/invoiceService'
import { RestaurantTable, TableSession, Product, Category, Customer, InvoiceDetail } from '@/types'

const getHttpErrorMessage = (error: any): string => {
  if (error?.response?.data?.message) {
    return error.response.data.message
  }
  if (error?.message) {
    return error.message
  }
  return 'Error desconocido'
}

const DEFAULT_ZONES = ['INTERIOR', 'TERRAZA', 'BAR', 'VIP']

const DEFAULT_STATUS_COLORS: Record<string, { bg: string; text: string; border: string; label: string }> = {
  DISPONIBLE: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200', label: 'Disponible' },
  OCUPADA: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-300', label: 'Ocupada' },
  RESERVADA: { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200', label: 'Reservada' },
  FUERA_DE_SERVICIO: { bg: 'bg-gray-100', text: 'text-gray-500', border: 'border-gray-300', label: 'Fuera de servicio' },
}

const loadTableZones = (): string[] => {
  const saved = localStorage.getItem('table_zones')
  if (saved) {
    const zones = JSON.parse(saved)
    return zones.map((z: any) => z.id)
  }
  return DEFAULT_ZONES
}

const loadStatusColors = (): Record<string, { bg: string; text: string; border: string; label: string }> => {
  const saved = localStorage.getItem('table_statuses')
  if (saved) {
    const statuses = JSON.parse(saved)
    const result: Record<string, { bg: string; text: string; border: string; label: string }> = {}
    statuses.forEach((s: any) => {
      result[s.id] = {
        bg: s.bgColor,
        text: s.textColor,
        border: s.borderColor,
        label: s.label
      }
    })
    return result
  }
  return DEFAULT_STATUS_COLORS
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(value)
}

const formatTime = (dateStr: string) => {
  const date = new Date(dateStr)
  return date.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
}

const getElapsedMinutes = (dateStr: string) => {
  const diff = Date.now() - new Date(dateStr).getTime()
  return Math.floor(diff / 60000)
}

const TablesPage = () => {
  const { user } = useSelector((state: RootState) => state.auth)

  // Data
  const [tables, setTables] = useState<RestaurantTable[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)

  // Dynamic configs
  const [availableZones] = useState<string[]>(loadTableZones())
  const [statusColors] = useState(loadStatusColors())

  // Filters
  const [zoneFilter, setZoneFilter] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<string | null>(null)

  // Selected table
  const [selectedTable, setSelectedTable] = useState<RestaurantTable | null>(null)
  const [activeSession, setActiveSession] = useState<TableSession | null>(null)

  // Modals
  const [showOpenModal, setShowOpenModal] = useState(false)
  const [showAddItemsModal, setShowAddItemsModal] = useState(false)
  const [showMobileCart, setShowMobileCart] = useState(false)
  const [showPayModal, setShowPayModal] = useState(false)
  const [showCreateTableModal, setShowCreateTableModal] = useState(false)

  // Open table form
  const [guestCount, setGuestCount] = useState(1)
  const [tableNotes, setTableNotes] = useState('')

  // Add items
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null)
  const [itemsToAdd, setItemsToAdd] = useState<{ product: Product; quantity: number; notes?: string }[]>([])
  const [priorityKitchenBatch, setPriorityKitchenBatch] = useState(false)
  const [priorityReason, setPriorityReason] = useState('')

  // Pay form
  const [paymentMethod, setPaymentMethod] = useState<'EFECTIVO' | 'TRANSFERENCIA'>('EFECTIVO')
  const [amountReceived, setAmountReceived] = useState('')
  const [processing, setProcessing] = useState(false)
  const [includeServiceCharge, setIncludeServiceCharge] = useState(false)

  // Customers
  const [customers, setCustomers] = useState<Customer[]>([])
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null)
  const [customerSearch, setCustomerSearch] = useState('')
  const [showCustomerPicker, setShowCustomerPicker] = useState(false)
  const [showNewCustomerModal, setShowNewCustomerModal] = useState(false)
  const [newCustomerData, setNewCustomerData] = useState({ fullName: '', documentType: 'CC', documentNumber: '', phone: '' })
  const [savingCustomer, setSavingCustomer] = useState(false)

  // Invoice printing after pay
  const [completedInvoice, setCompletedInvoice] = useState<any>(null)
  const [showInvoiceModal, setShowInvoiceModal] = useState(false)

  // Delivery charge
  const [includeDelivery, setIncludeDelivery] = useState(false)
  const [deliveryCharge, setDeliveryCharge] = useState(3000)
  const [totalDiscountPercent, setTotalDiscountPercent] = useState(0)

  // Create/Edit table form
  const [newTableNumber, setNewTableNumber] = useState('')
  const [newTableName, setNewTableName] = useState('')
  const [newTableCapacity, setNewTableCapacity] = useState('4')
  const [newTableZone, setNewTableZone] = useState('INTERIOR')
  const [customZone, setCustomZone] = useState('')
  const [showEditTableModal, setShowEditTableModal] = useState(false)
  const [editTableData, setEditTableData] = useState<{ id: number; tableNumber: string; name: string; capacity: string; zone: string }>({ id: 0, tableNumber: '', name: '', capacity: '4', zone: 'INTERIOR' })

  // ==================== DATA FETCHING ====================

  const fetchTables = useCallback(async () => {
    try {
      const res = await tableService.getAll()
      setTables(Array.isArray(res) ? res : [])
    } catch (err) {
      toast.error('Error al cargar mesas')
    }
  }, [])

  const fetchProducts = useCallback(async () => {
    try {
      const [prodRes, catRes] = await Promise.all([
        productService.getActive(),
        categoryService.getActive(),
      ])
      setProducts(Array.isArray(prodRes) ? prodRes : [])
      setCategories(Array.isArray(catRes) ? catRes : [])
    } catch (err) {
      console.error('Error loading products/categories', err)
    }
  }, [])

  const fetchCustomers = useCallback(async () => {
    try {
      const res = await customerService.getAll()
      const allCustomers = ((res as any).content || res) as Customer[]
      setCustomers(allCustomers.filter((c: Customer) => c.isActive !== false))
    } catch (err) {
      console.error('Error loading customers', err)
    }
  }, [])

  useEffect(() => {
    const init = async () => {
      setLoading(true)
      await Promise.all([fetchTables(), fetchProducts(), fetchCustomers()])
      setLoading(false)
    }
    init()
  }, [fetchTables, fetchProducts, fetchCustomers])

  // Polling for table status updates every 30s
  useEffect(() => {
    const interval = setInterval(fetchTables, 30000)
    return () => clearInterval(interval)
  }, [fetchTables])

  // ==================== TABLE ACTIONS ====================

  const handleSelectTable = async (table: RestaurantTable) => {
    setSelectedTable(table)
    if (table.status === 'OCUPADA') {
      try {
        const res = await tableService.getActiveSession(table.id)
        setActiveSession(res as TableSession)
      } catch {
        setActiveSession(table.activeSession || null)
      }
    } else {
      setActiveSession(null)
    }
  }

  const filteredCustomers = customers.filter(c =>
    c.fullName?.toLowerCase().includes(customerSearch.toLowerCase()) ||
    c.documentNumber?.includes(customerSearch) ||
    c.phone?.includes(customerSearch)
  )

  const selectedCustomer = customers.find(c => c.id === selectedCustomerId) || null

  const handleCreateCustomer = async () => {
    if (!newCustomerData.fullName.trim()) {
      toast.error('El nombre es requerido')
      return
    }
    setSavingCustomer(true)
    try {
      const created = await customerService.create(newCustomerData)
      const newCustomer = created as Customer
      setCustomers(prev => [...prev, newCustomer])
      setSelectedCustomerId(newCustomer.id)
      setShowNewCustomerModal(false)
      setNewCustomerData({ fullName: '', documentType: 'CC', documentNumber: '', phone: '' })
      toast.success('Cliente creado y seleccionado')
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error al crear cliente')
    } finally {
      setSavingCustomer(false)
    }
  }

  const handleOpenTable = async () => {
    if (!selectedTable) return
    setProcessing(true)
    try {
      const request: OpenTableRequest = { guestCount, notes: tableNotes || undefined, customerId: selectedCustomerId || undefined }
      const res = await tableService.openTable(selectedTable.id, request)
      setActiveSession(res as TableSession)
      toast.success(`Mesa #${selectedTable.tableNumber} abierta`)
      setShowOpenModal(false)
      setGuestCount(1)
      setTableNotes('')
      setSelectedCustomerId(null)
      await fetchTables()
      // Refresh selected table
      const updated = await tableService.getById(selectedTable.id)
      setSelectedTable(updated as RestaurantTable)
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error al abrir mesa')
    } finally {
      setProcessing(false)
    }
  }

  const handleAddItems = async () => {
    if (!selectedTable || itemsToAdd.length === 0) return
    setProcessing(true)
    try {
      const request: AddTableItemsRequest = {
        items: itemsToAdd.map(i => ({
          productId: i.product.id,
          quantity: i.quantity,
          unitPrice: i.product.salePrice,
          notes: i.notes || undefined,
        })),
        priority: priorityKitchenBatch,
        priorityReason: priorityKitchenBatch ? (priorityReason.trim() || undefined) : undefined,
      }
      const res = await tableService.addItems(selectedTable.id, request)
      setActiveSession(res as TableSession)
      toast.success(`${itemsToAdd.length} producto(s) agregado(s)`)
      setShowAddItemsModal(false)
      setItemsToAdd([])
      setPriorityKitchenBatch(false)
      setPriorityReason('')
      setSearchTerm('')
      await fetchTables()
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error al agregar productos')
    } finally {
      setProcessing(false)
    }
  }

  const handleRemoveItem = async (detailId: number) => {
    if (!selectedTable) return
    try {
      const res = await tableService.removeItem(selectedTable.id, detailId)
      setActiveSession(res as TableSession)
      toast.success('Producto eliminado')
      await fetchTables()
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error al eliminar producto')
    }
  }

  const handleEditTable = async () => {
    if (!editTableData.id) return
    setProcessing(true)
    try {
      await tableService.update(editTableData.id, {
        tableNumber: parseInt(editTableData.tableNumber),
        name: editTableData.name || undefined,
        capacity: parseInt(editTableData.capacity) || 4,
        zone: editTableData.zone,
      })
      toast.success('Mesa actualizada')
      setShowEditTableModal(false)
      await fetchTables()
      if (selectedTable?.id === editTableData.id) {
        const updated = await tableService.getById(editTableData.id)
        setSelectedTable(updated as RestaurantTable)
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error al actualizar mesa')
    } finally {
      setProcessing(false)
    }
  }

  const handleDeleteTable = async (table: RestaurantTable) => {
    if (table.status === 'OCUPADA') {
      toast.error('No se puede eliminar una mesa ocupada')
      return
    }
    if (!confirm(`¿Eliminar Mesa #${table.tableNumber}?`)) return
    try {
      await tableService.delete(table.id)
      toast.success('Mesa eliminada')
      if (selectedTable?.id === table.id) {
        setSelectedTable(null)
        setActiveSession(null)
      }
      await fetchTables()
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error al eliminar mesa')
    }
  }

  const openEditTableModal = (table: RestaurantTable) => {
    setEditTableData({
      id: table.id,
      tableNumber: String(table.tableNumber),
      name: table.name || '',
      capacity: String(table.capacity),
      zone: table.zone || 'INTERIOR',
    })
    setShowEditTableModal(true)
  }

  const handlePayTable = async () => {
    if (!selectedTable || !activeSession) return
    setProcessing(true)
    try {
      const deliveryAmount = includeDelivery ? deliveryCharge : 0
      const request: PayTableRequest = {
        paymentMethod,
        amountReceived: parseFloat(amountReceived),
        discountPercent: totalDiscountPercent,
        serviceChargePercent: includeServiceCharge ? 10 : 0,
        deliveryChargeAmount: deliveryAmount,
      }
      const result = await tableService.payTable(selectedTable.id, request) as any
      // Fetch full invoice for printing
      try {
        const invoiceDetail = await invoiceService.getById(result.id)
        setCompletedInvoice(invoiceDetail)
        setShowInvoiceModal(true)
      } catch {
        setCompletedInvoice(null)
      }
      toast.success(`Mesa #${selectedTable.tableNumber} pagada exitosamente`)
      setShowPayModal(false)
      setAmountReceived('')
      setIncludeDelivery(false)
      setDeliveryCharge(3000)
      setTotalDiscountPercent(0)
      setIncludeServiceCharge(false)
      setSelectedTable(null)
      setActiveSession(null)
      await fetchTables()
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error al pagar mesa')
    } finally {
      setProcessing(false)
    }
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  const getPaymentMethodLabel = (method: string) => {
    switch (method) {
      case 'EFECTIVO': return 'Efectivo'
      case 'TRANSFERENCIA': return 'Transferencia'
      case 'TARJETA_CREDITO': return 'Tarjeta Crédito'
      case 'TARJETA_DEBITO': return 'Tarjeta Débito'
      default: return method
    }
  }

  const handlePrintInvoice = () => {
    if (!completedInvoice) return
    const settings = JSON.parse(localStorage.getItem('pos_settings') || '{}')
    const companyName = settings?.company?.companyName || 'Mi Empresa'
    const inv = completedInvoice
    const printWindow = window.open('', '_blank')
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Factura ${inv.invoiceNumber}</title>
            <style>
              body { font-family: 'Courier New', monospace; padding: 10px; max-width: 300px; margin: 0 auto; font-size: 12px; }
              .header { text-align: center; margin-bottom: 10px; border-bottom: 1px dashed #000; padding-bottom: 8px; }
              .header h1 { margin: 0 0 2px; font-size: 16px; text-transform: uppercase; }
              .header .invoice-num { font-size: 13px; font-weight: bold; }
              .header p { margin: 2px 0; font-size: 11px; }
              .info { margin-bottom: 8px; }
              .info div { margin: 2px 0; }
              .items { border-top: 1px dashed #000; border-bottom: 1px dashed #000; padding: 6px 0; margin: 6px 0; }
              .item { display: flex; justify-content: space-between; margin: 3px 0; }
              .totals div { display: flex; justify-content: space-between; margin: 2px 0; }
              .total-final { font-size: 15px; font-weight: bold; border-top: 2px solid #000; padding-top: 6px; margin-top: 6px; }
              .payment-info { border-top: 1px dashed #000; margin-top: 8px; padding-top: 6px; }
              .footer { text-align: center; margin-top: 15px; font-size: 10px; color: #666; border-top: 1px dashed #000; padding-top: 8px; }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>${companyName}</h1>
              <div class="invoice-num">N° ${inv.invoiceNumber}</div>
              <p>${formatDate(inv.createdAt)}</p>
            </div>
            <div class="info">
              <div>Cliente: ${inv.customer?.fullName || inv.customerName || 'Cliente General'}</div>
              <div>Cajero: ${inv.userName || '-'}</div>
            </div>
            <div class="items">
              ${(inv.details || []).map((d: any) => `<div class="item"><span>${d.quantity} x ${d.productName}</span><span>${formatCurrency(d.subtotal)}</span></div>`).join('')}
            </div>
            <div class="totals">
              <div><span>Subtotal:</span><span>${formatCurrency(inv.subtotal)}</span></div>
              ${inv.discountAmount > 0 ? `<div><span>Descuento:</span><span>-${formatCurrency(inv.discountAmount)}</span></div>` : ''}
              ${inv.serviceChargeAmount > 0 ? `<div><span>Servicio (${inv.serviceChargePercent}%):</span><span>${formatCurrency(inv.serviceChargeAmount)}</span></div>` : ''}
              <div class="total-final"><span>TOTAL:</span><span>${formatCurrency(inv.total)}</span></div>
            </div>
            <div class="payment-info">
              <div><span>Método:</span><span>${getPaymentMethodLabel(inv.paymentMethod)}</span></div>
              ${inv.amountReceived > 0 ? `<div><span>Recibido:</span><span>${formatCurrency(inv.amountReceived)}</span></div>` : ''}
              ${inv.changeAmount > 0 ? `<div style="font-weight:bold;"><span>Cambio:</span><span>${formatCurrency(inv.changeAmount)}</span></div>` : ''}
            </div>
            <div class="footer">
              <p>¡Gracias por su compra!</p>
            </div>
          </body>
        </html>
      `)
      printWindow.document.close()
      printWindow.print()
    }
  }

  const handleCreateTable = async () => {
    if (!newTableNumber) return
    const zone = newTableZone === '__custom__' ? customZone.trim() : newTableZone
    if (!zone) {
      toast.error('Debes especificar una zona')
      return
    }
    setProcessing(true)
    try {
      await tableService.create({
        tableNumber: parseInt(newTableNumber),
        name: newTableName || undefined,
        capacity: parseInt(newTableCapacity) || 4,
        zone,
      })
      toast.success('Mesa creada exitosamente')
      setShowCreateTableModal(false)
      setNewTableNumber('')
      setNewTableName('')
      setNewTableCapacity('4')
      setNewTableZone('INTERIOR')
      setCustomZone('')
      await fetchTables()
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error al crear mesa')
    } finally {
      setProcessing(false)
    }
  }

  // ==================== FILTERS ====================

  const allZones = Array.from(new Set([
    ...availableZones,
    ...tables.map(t => t.zone).filter(Boolean)
  ]))

  const filteredTables = tables.filter(t => {
    if (zoneFilter && t.zone !== zoneFilter) return false
    if (statusFilter && t.status !== statusFilter) return false
    return true
  }).sort((a, b) => a.tableNumber - b.tableNumber)

  // Helper: Get all child category IDs recursively (same logic as POSPage)
  const getChildCategoryIds = (parentId: number): number[] => {
    const children = categories.filter(c => c.parentId === parentId)
    if (children.length === 0) return []
    const childIds = children.map(c => c.id)
    const grandchildIds = children.flatMap(c => getChildCategoryIds(c.id))
    return [...childIds, ...grandchildIds]
  }

  const filteredProducts = products.filter(p => {
    const productCategoryId = p.categoryId || (p.category as any)?.id
    
    if (selectedCategory !== null) {
      // Include products from selected category and all its children (recursive)
      const childIds = getChildCategoryIds(selectedCategory)
      const validIds = [selectedCategory, ...childIds]
      if (!validIds.includes(productCategoryId)) return false
    }
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      return p.name.toLowerCase().includes(term) || p.code?.toLowerCase().includes(term)
    }
    return true
  }).sort((a, b) => a.name.localeCompare(b.name))

  const addProductToList = (product: Product) => {
    setItemsToAdd(prev => {
      const existing = prev.find(i => i.product.id === product.id)
      if (existing) {
        return prev.map(i => i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i)
      }
      return [...prev, { product, quantity: 1 }]
    })
  }

  const updateItemQuantity = (productId: number, delta: number) => {
    setItemsToAdd(prev => {
      return prev.map(i => {
        if (i.product.id === productId) {
          const newQty = i.quantity + delta
          return newQty > 0 ? { ...i, quantity: newQty } : i
        }
        return i
      }).filter(i => i.quantity > 0)
    })
  }

  const removeItemFromList = (productId: number) => {
    setItemsToAdd(prev => prev.filter(i => i.product.id !== productId))
  }

  const isAdmin = (user as any)?.role === 'ADMIN'

  // ==================== RENDER ====================

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    )
  }

  return (
    <div className="flex flex-col lg:flex-row lg:h-[calc(100dvh-7rem)] gap-3 lg:gap-4 lg:overflow-hidden">
      {/* Left: Table Grid */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="flex items-center justify-between mb-3 sm:mb-4 flex-shrink-0">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Mesas</h1>
            <p className="text-sm text-gray-500">
              {tables.filter(t => t.status === 'OCUPADA').length} ocupadas de {tables.length} mesas
            </p>
          </div>
          {isAdmin && (
            <button
              onClick={() => setShowCreateTableModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-colors"
            >
              <Plus size={18} />
              Nueva Mesa
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-3 sm:mb-4 overflow-x-auto pb-1 flex-shrink-0">
          <button
            onClick={() => setZoneFilter(null)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              !zoneFilter ? 'bg-primary-600 text-white' : 'bg-white text-gray-600 hover:bg-primary-50'
            }`}
          >
            Todas
          </button>
          {availableZones.map(zone => (
            <button
              key={zone}
              onClick={() => setZoneFilter(zone === zoneFilter ? null : zone)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                zoneFilter === zone ? 'bg-primary-600 text-white' : 'bg-white text-gray-600 hover:bg-primary-50'
              }`}
            >
              {zone}
            </button>
          ))}
          <div className="w-px bg-gray-200 mx-1" />
          {Object.entries(statusColors).map(([status, colors]) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status === statusFilter ? null : status)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border ${
                statusFilter === status
                  ? `${colors.bg} ${colors.text} ${colors.border}`
                  : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
              }`}
            >
              {colors.label}
            </button>
          ))}
        </div>

        {/* Tables Grid */}
        <div className="lg:flex-1 lg:overflow-y-auto">
          <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {filteredTables.map(table => {
              const colors = statusColors[table.status] || statusColors.DISPONIBLE || DEFAULT_STATUS_COLORS.DISPONIBLE
              const isSelected = selectedTable?.id === table.id
              const elapsed = table.activeSession ? getElapsedMinutes(table.activeSession.openedAt) : 0

              return (
                <button
                  key={table.id}
                  onClick={() => handleSelectTable(table)}
                  className={`relative flex flex-col items-center p-4 rounded-2xl border-2 transition-all hover:shadow-lg ${
                    isSelected
                      ? 'border-primary-500 shadow-lg ring-2 ring-primary-200'
                      : `${colors.border} hover:border-primary-300`
                  } ${colors.bg}`}
                >
                  {/* Table icon */}
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-2 ${
                    table.status === 'OCUPADA' ? 'bg-red-100' : table.status === 'RESERVADA' ? 'bg-yellow-100' : 'bg-green-100'
                  }`}>
                    <UtensilsCrossed size={24} className={colors.text} />
                  </div>

                  {/* Table number */}
                  <span className={`text-lg font-bold ${colors.text}`}>
                    #{table.tableNumber}
                  </span>
                  <span className="text-xs text-gray-500 truncate w-full text-center">
                    {table.name}
                  </span>

                  {/* Capacity */}
                  <div className="flex items-center gap-1 mt-1 text-xs text-gray-400">
                    <Users size={12} />
                    <span>{table.capacity}</span>
                  </div>

                  {/* Occupied info */}
                  {table.status === 'OCUPADA' && table.activeSession && (
                    <div className="mt-2 w-full">
                      <div className="flex items-center justify-center gap-1 text-xs text-red-600">
                        <Clock size={12} />
                        <span>{elapsed} min</span>
                      </div>
                      {table.activeSession.total != null && table.activeSession.total > 0 && (
                        <p className="text-xs font-semibold text-center text-red-700 mt-0.5">
                          {formatCurrency(table.activeSession.total)}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Status badge */}
                  <span className={`mt-2 px-2 py-0.5 rounded-full text-[10px] font-medium ${colors.bg} ${colors.text} border ${colors.border}`}>
                    {colors.label}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Right: Table Detail Panel */}
      <div className={`
        ${selectedTable ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}
        fixed right-0 top-0 h-full w-full sm:w-96 z-50
        lg:relative lg:z-auto lg:h-auto
        lg:w-96 bg-white lg:rounded-2xl shadow-soft flex flex-col flex-shrink-0 overflow-hidden
        transition-transform duration-300
      `}>
        {selectedTable ? (
          <>
            {/* Panel Header */}
            <div className={`p-4 border-b ${statusColors[selectedTable.status]?.bg || 'bg-gray-50'}`}>
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-800">
                    Mesa #{selectedTable.tableNumber}
                  </h2>
                  <p className="text-sm text-gray-500">{selectedTable.name} - {selectedTable.zone}</p>
                </div>
                <div className="flex items-center gap-1">
                  {isAdmin && (
                    <>
                      <button
                        onClick={() => openEditTableModal(selectedTable)}
                        className="p-1.5 rounded-lg hover:bg-white/50 text-gray-500"
                        title="Editar mesa"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => handleDeleteTable(selectedTable)}
                        className="p-1.5 rounded-lg hover:bg-red-100 text-red-400"
                        title="Eliminar mesa"
                      >
                        <Trash2 size={16} />
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => { setSelectedTable(null); setActiveSession(null) }}
                    className="p-1.5 rounded-lg hover:bg-white/50 text-gray-400"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>
            </div>

            {/* Panel Content */}
            <div className="flex-1 overflow-y-auto p-4">
              {selectedTable.status === 'DISPONIBLE' && (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mb-4">
                    <Coffee size={32} className="text-green-500" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-700 mb-2">Mesa Disponible</h3>
                  <p className="text-sm text-gray-500 mb-6">
                    Capacidad: {selectedTable.capacity} personas
                  </p>
                  <button
                    onClick={() => setShowOpenModal(true)}
                    className="flex items-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-colors font-medium"
                  >
                    <UtensilsCrossed size={18} />
                    Abrir Mesa
                  </button>
                </div>
              )}

              {selectedTable.status === 'OCUPADA' && activeSession && (
                <div className="space-y-4">
                  {/* Session info */}
                  <div className="bg-gray-50 rounded-xl p-3 space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Mesero:</span>
                      <span className="font-medium">{activeSession.openedByName}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Abierta:</span>
                      <span className="font-medium">{formatTime(activeSession.openedAt)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Comensales:</span>
                      <span className="font-medium">{activeSession.guestCount}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Factura:</span>
                      <span className="font-medium text-primary-600">{activeSession.invoiceNumber}</span>
                    </div>
                  </div>

                  {/* Order items */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold text-gray-700">Pedido</h4>
                      <button
                        onClick={() => {
                          setShowAddItemsModal(true)
                          setItemsToAdd([])
                          setPriorityKitchenBatch(false)
                          setPriorityReason('')
                        }}
                        className="flex items-center gap-1 px-3 py-1.5 bg-primary-50 text-primary-600 rounded-lg hover:bg-primary-100 transition-colors text-sm font-medium"
                      >
                        <Plus size={14} />
                        Agregar
                      </button>
                    </div>

                    {activeSession.invoice?.details && activeSession.invoice.details.length > 0 ? (
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {activeSession.invoice.details.map((detail: InvoiceDetail) => (
                          <div
                            key={detail.id}
                            className="flex items-center justify-between p-2.5 bg-gray-50 rounded-xl border border-gray-100"
                          >
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-800 truncate">{detail.productName}</p>
                              <p className="text-xs text-gray-500">
                                {detail.quantity} x {formatCurrency(detail.unitPrice)}
                              </p>
                              {detail.notes && (
                                <p className="text-xs font-medium text-red-600 mt-0.5">⚠️ {detail.notes}</p>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold text-gray-700">
                                {formatCurrency(detail.subtotal)}
                              </span>
                              <button
                                onClick={() => handleRemoveItem(detail.id)}
                                className="p-1 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-6 text-gray-400">
                        <AlertCircle size={24} className="mx-auto mb-2 opacity-50" />
                        <p className="text-sm">Sin productos aún</p>
                        <button
                          onClick={async () => {
                            if (!confirm('¿Liberar esta mesa? La sesión se cerrará sin cobrar.')) return
                            try {
                              setProcessing(true)
                              await tableService.releaseTable(selectedTable.id)
                              toast.success('Mesa liberada exitosamente')
                              await fetchTables()
                              setSelectedTable(null)
                            } catch (err: any) {
                              const msg = getHttpErrorMessage(err)
                              toast.error(msg)
                            } finally {
                              setProcessing(false)
                            }
                          }}
                          className="mt-3 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm"
                        >
                          Liberar Mesa
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Totals */}
                  {activeSession.invoice && (
                    <div className="bg-primary-50 rounded-xl p-3 space-y-1.5">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Subtotal</span>
                        <span>{formatCurrency(activeSession.invoice.subtotal || 0)}</span>
                      </div>
                      <div className="flex justify-between text-lg font-bold text-primary-700 pt-1 border-t border-primary-100">
                        <span>Total</span>
                        <span>{formatCurrency(activeSession.invoice.total || 0)}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {(selectedTable.status === 'RESERVADA' || selectedTable.status === 'FUERA_DE_SERVICIO') && (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-4 ${
                    selectedTable.status === 'RESERVADA' ? 'bg-yellow-50' : 'bg-gray-100'
                  }`}>
                    <AlertCircle size={32} className={
                      selectedTable.status === 'RESERVADA' ? 'text-yellow-500' : 'text-gray-400'
                    } />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-700 mb-2">
                    {statusColors[selectedTable.status]?.label || selectedTable.status}
                  </h3>
                  {isAdmin && (
                    <button
                      onClick={() => tableService.changeStatus(selectedTable.id, 'DISPONIBLE').then(() => { fetchTables(); setSelectedTable(null) })}
                      className="mt-4 px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors text-sm"
                    >
                      Marcar como Disponible
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Panel Actions */}
            {selectedTable.status === 'OCUPADA' && activeSession && (
              <div className="p-4 border-t bg-gray-50 space-y-2">
                <button
                  onClick={() => {
                    setShowPayModal(true)
                    setAmountReceived(String(activeSession.total || 0))
                  }}
                  disabled={!activeSession.invoice?.details?.length}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <CreditCard size={18} />
                  Cobrar Mesa
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <UtensilsCrossed size={48} className="mb-4 opacity-30" />
            <p className="text-lg font-medium">Selecciona una mesa</p>
            <p className="text-sm">Haz clic en una mesa para ver su detalle</p>
          </div>
        )}
      </div>

      {/* ==================== MODALS ==================== */}

      {/* Open Table Modal */}
      {showOpenModal && (
        <div className="modal-overlay">
          <div className="modal-content p-5 sm:p-6 sm:max-w-md animate-scale-in">
            <h3 className="text-xl font-bold text-gray-800 mb-4">
              Abrir Mesa #{selectedTable?.tableNumber}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Comensales</label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setGuestCount(Math.max(1, guestCount - 1))}
                    className="w-11 h-11 flex items-center justify-center rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors text-lg font-bold"
                  >
                    −
                  </button>
                  <input
                    type="number"
                    inputMode="numeric"
                    value={guestCount}
                    onChange={(e) => setGuestCount(Math.max(1, parseInt(e.target.value) || 1))}
                    className="input-field text-center text-lg font-bold w-20"
                    min={1}
                  />
                  <button
                    type="button"
                    onClick={() => setGuestCount(guestCount + 1)}
                    className="w-11 h-11 flex items-center justify-center rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors text-lg font-bold"
                  >
                    +
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cliente (opcional)</label>
                <div className="relative">
                  <button
                    onClick={() => setShowCustomerPicker(!showCustomerPicker)}
                    className="w-full flex items-center gap-2 p-3 border border-gray-300 rounded-xl text-sm text-left hover:border-primary-400 transition-colors"
                  >
                    <User size={16} className="text-gray-400" />
                    <span className={selectedCustomer ? 'text-gray-800 font-medium' : 'text-gray-400'}>
                      {selectedCustomer ? selectedCustomer.fullName : 'Cliente General'}
                    </span>
                  </button>
                  {showCustomerPicker && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-30 max-h-72 flex flex-col overflow-hidden">
                      <div className="p-2.5 border-b flex-shrink-0">
                        <input
                          type="text"
                          placeholder="Buscar cliente por nombre o documento..."
                          value={customerSearch}
                          onChange={(e) => setCustomerSearch(e.target.value)}
                          className="input-field text-sm"
                          autoFocus
                        />
                      </div>
                      <div className="flex-1 overflow-y-auto">
                        <button
                          onClick={() => { setSelectedCustomerId(null); setShowCustomerPicker(false); setCustomerSearch('') }}
                          className={`w-full text-left px-3 py-2.5 text-sm hover:bg-primary-50 ${!selectedCustomerId ? 'bg-primary-50 font-medium' : ''}`}
                        >
                          Cliente General
                        </button>
                        {filteredCustomers.map(c => (
                          <button
                            key={c.id}
                            onClick={() => { setSelectedCustomerId(c.id); setShowCustomerPicker(false); setCustomerSearch('') }}
                            className={`w-full text-left px-3 py-2.5 text-sm hover:bg-primary-50 flex items-center justify-between ${selectedCustomerId === c.id ? 'bg-primary-50 font-medium' : ''}`}
                          >
                            <span>{c.fullName}</span>
                            <span className="text-xs text-gray-400">{c.documentNumber}</span>
                          </button>
                        ))}
                      </div>
                      <button
                        onClick={() => { setShowCustomerPicker(false); setShowNewCustomerModal(true) }}
                        className="w-full text-left px-3 py-2.5 text-sm text-primary-600 hover:bg-primary-50 border-t font-medium flex items-center gap-1 flex-shrink-0"
                      >
                        <UserPlus size={14} />
                        Crear Nuevo Cliente
                      </button>
                    </div>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notas (opcional)</label>
                <input
                  type="text"
                  value={tableNotes}
                  onChange={(e) => setTableNotes(e.target.value)}
                  className="input-field"
                  placeholder="Ej: cumpleaños, alergia..."
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowOpenModal(false)}
                className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleOpenTable}
                disabled={processing}
                className="flex-1 px-4 py-3 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {processing ? <Loader2 className="w-5 h-5 animate-spin" /> : <UtensilsCrossed size={18} />}
                {processing ? 'Abriendo...' : 'Abrir Mesa'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Items Modal */}
      {showAddItemsModal && (
        <div className="modal-overlay">
          <div className="fixed inset-4 sm:inset-8 lg:inset-12 bg-white rounded-2xl shadow-2xl flex flex-col animate-scale-in z-50 max-w-6xl mx-auto">
            <div className="p-3 sm:p-4 border-b flex items-center justify-between flex-shrink-0">
              <h3 className="text-lg font-bold text-gray-800">
                Agregar Productos - Mesa #{selectedTable?.tableNumber}
              </h3>
              <button
                onClick={() => {
                  setShowAddItemsModal(false)
                  setShowMobileCart(false)
                  setPriorityKitchenBatch(false)
                  setPriorityReason('')
                }}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <X size={24} />
              </button>
            </div>

            <div className="flex flex-1 min-h-0 overflow-hidden relative">
              {/* Products list - Full width on mobile, left side on desktop */}
              <div className={`${
                showMobileCart ? 'hidden' : 'flex'
              } lg:flex flex-1 flex-col min-h-0 overflow-hidden`}>
                <div className="p-3 sm:p-4 border-b flex-shrink-0">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                      type="text"
                      placeholder="Buscar producto..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="input-field pl-10"
                      autoFocus
                    />
                  </div>
                  <div className="overflow-x-auto mt-3 -mx-3 px-3 sm:-mx-4 sm:px-4">
                    <div className="grid grid-flow-col auto-cols-max grid-rows-2 gap-2 pb-1">
                      <button
                        onClick={() => setSelectedCategory(null)}
                        className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                          !selectedCategory ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        Todos
                      </button>
                      {categories.map(cat => (
                        <button
                          key={cat.id}
                          onClick={() => setSelectedCategory(cat.id === selectedCategory ? null : cat.id)}
                          className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                            selectedCategory === cat.id ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          {cat.name}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-3 sm:p-4">
                  <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
                    {filteredProducts.map(product => (
                      <button
                        key={product.id}
                        onClick={() => addProductToList(product)}
                        className="flex items-center justify-between p-3 rounded-xl hover:bg-primary-50 active:scale-95 transition-all text-left border border-gray-100 hover:border-primary-200"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-gray-800 truncate">{product.name}</p>
                          <p className="text-xs text-gray-500">{product.code}</p>
                        </div>
                        <span className="text-sm font-semibold text-primary-600 ml-3 flex-shrink-0">
                          {formatCurrency(product.salePrice)}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Mobile Cart FAB */}
              <button
                onClick={() => setShowMobileCart(true)}
                className="lg:hidden fixed bottom-6 right-6 z-50 w-16 h-16 bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-full shadow-2xl flex items-center justify-center active:scale-95 transition-transform"
              >
                <ShoppingCart size={24} />
                {itemsToAdd.length > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[24px] h-[24px] bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center px-1.5">
                    {itemsToAdd.length}
                  </span>
                )}
              </button>

              {/* Mobile Cart Backdrop */}
              {showMobileCart && (
                <div className="lg:hidden fixed inset-0 z-40 bg-black/50" onClick={() => setShowMobileCart(false)} />
              )}

              {/* Cart Panel - Slides in on mobile, fixed on desktop */}
              <div className={`${
                showMobileCart ? 'translate-x-0' : 'translate-x-full'
              } lg:translate-x-0
                fixed lg:relative right-0 top-0 h-full w-full sm:w-96 z-50 lg:z-auto
                lg:w-96 lg:border-l flex-shrink-0 bg-white flex flex-col min-w-0
                transition-transform duration-300 lg:transition-none
              `}>
                <div className="p-4 border-b flex-shrink-0">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-gray-700 flex items-center gap-2">
                      <ShoppingCart size={18} />
                      Por agregar ({itemsToAdd.length})
                    </h4>
                    <button
                      onClick={() => setShowMobileCart(false)}
                      className="lg:hidden text-gray-400 hover:text-gray-600 p-1"
                    >
                      <X size={20} />
                    </button>
                  </div>
                  <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={priorityKitchenBatch}
                        onChange={(e) => {
                          setPriorityKitchenBatch(e.target.checked)
                          if (!e.target.checked) {
                            setPriorityReason('')
                          }
                        }}
                        className="w-4 h-4 rounded border-amber-300 text-amber-600 focus:ring-amber-500"
                      />
                      <span className="text-sm font-semibold text-amber-800 flex items-center gap-1">
                        <AlertCircle size={14} /> Marcar como prioritario en cocina
                      </span>
                    </label>
                    {priorityKitchenBatch && (
                      <input
                        type="text"
                        value={priorityReason}
                        onChange={(e) => setPriorityReason(e.target.value)}
                        placeholder="Motivo (opcional): ejemplo cliente apurado"
                        className="mt-2 w-full text-xs px-2.5 py-2 border border-amber-200 rounded-lg focus:border-amber-400 focus:ring-1 focus:ring-amber-200"
                      />
                    )}
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                  {itemsToAdd.map(item => (
                    <div key={item.product.id} className="p-3 bg-gray-50 rounded-xl space-y-2">
                      <div className="flex items-start gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{item.product.name}</p>
                          <p className="text-xs text-gray-500">{formatCurrency(item.product.salePrice * item.quantity)}</p>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => updateItemQuantity(item.product.id, -1)}
                            className="w-7 h-7 rounded-lg bg-white hover:bg-gray-100 flex items-center justify-center transition-colors"
                          >
                            <Minus size={14} />
                          </button>
                          <span className="text-sm font-bold w-8 text-center">{item.quantity}</span>
                          <button
                            onClick={() => updateItemQuantity(item.product.id, 1)}
                            className="w-7 h-7 rounded-lg bg-white hover:bg-gray-100 flex items-center justify-center transition-colors"
                          >
                            <Plus size={14} />
                          </button>
                          <button
                            onClick={() => removeItemFromList(item.product.id)}
                            className="w-7 h-7 rounded-lg hover:bg-red-100 text-gray-400 hover:text-red-500 ml-1 transition-colors flex items-center justify-center"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      </div>
                      <input
                        type="text"
                        placeholder="Ej: sin cebolla, salsa extra..."
                        value={item.notes || ''}
                        onChange={(e) => setItemsToAdd(prev => prev.map(i => i.product.id === item.product.id ? { ...i, notes: e.target.value } : i))}
                        className="w-full text-xs px-2 py-1.5 border border-gray-200 rounded-lg focus:border-primary-400 focus:ring-1 focus:ring-primary-200 placeholder-gray-300"
                      />
                    </div>
                  ))}
                  {itemsToAdd.length === 0 && (
                    <div className="h-full flex items-center justify-center text-gray-400 py-12">
                      <div className="text-center">
                        <ShoppingCart size={32} className="mx-auto mb-2 opacity-30" />
                        <p className="text-sm">Selecciona productos</p>
                      </div>
                    </div>
                  )}
                </div>
                <div className="p-4 border-t flex-shrink-0">
                  <button
                    onClick={handleAddItems}
                    disabled={processing || itemsToAdd.length === 0}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-colors disabled:opacity-50 font-medium"
                  >
                    {processing ? <Loader2 className="w-5 h-5 animate-spin" /> : <ChevronRight size={18} />}
                    {processing ? 'Agregando...' : 'Confirmar'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Pay Modal */}
      {showPayModal && activeSession && (() => {
        const baseTotal = activeSession.total || 0
        const discountAmount = (baseTotal * totalDiscountPercent) / 100
        const svcAmount = includeServiceCharge ? baseTotal * 0.10 : 0
        const deliveryAmount = includeDelivery ? deliveryCharge : 0
        const finalTotal = baseTotal - discountAmount + svcAmount + deliveryAmount
        const recalcAmount = () => {
          const newBase = activeSession.total || 0
          const newDisc = (newBase * totalDiscountPercent) / 100
          const newSvc = includeServiceCharge ? newBase * 0.10 : 0
          const newDel = includeDelivery ? deliveryCharge : 0
          return (newBase - newDisc + newSvc + newDel).toFixed(0)
        }
        return (
        <div className="modal-overlay">
          <div className="modal-content p-6 animate-scale-in">
            <h3 className="text-xl font-bold text-gray-800 mb-4">
              Cobrar Mesa #{selectedTable?.tableNumber}
            </h3>

            <div className="bg-primary-50 rounded-xl p-4 mb-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Subtotal</span>
                <span>{formatCurrency(baseTotal)}</span>
              </div>
              {/* Descuento */}
              <div className="border-t border-primary-100 pt-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">Descuento adicional (%)</label>
                <input
                  type="number"
                  value={totalDiscountPercent}
                  onChange={(e) => {
                    const val = Math.max(0, Math.min(100, parseFloat(e.target.value) || 0))
                    setTotalDiscountPercent(val)
                    setAmountReceived(recalcAmount())
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
                  min="0"
                  max="100"
                  step="1"
                />
                {discountAmount > 0 && (
                  <div className="flex justify-between text-sm text-green-600 mt-1">
                    <span>Descuento ({totalDiscountPercent}%)</span>
                    <span>-{formatCurrency(discountAmount)}</span>
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between py-1 border-t border-primary-100">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeServiceCharge}
                    onChange={(e) => {
                      setIncludeServiceCharge(e.target.checked)
                      const newSvc = e.target.checked ? baseTotal * 0.10 : 0
                      const newTotal = baseTotal + newSvc + deliveryAmount
                      setAmountReceived(newTotal.toFixed(0))
                    }}
                    className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-sm font-medium text-gray-700">Servicio (10%)</span>
                </label>
                <span className={`text-sm font-medium ${includeServiceCharge ? 'text-primary-600' : 'text-gray-400'}`}>
                  {includeServiceCharge ? formatCurrency(svcAmount) : '$0'}
                </span>
              </div>
              <div className="border-t border-primary-100 pt-2">
                <label className="flex items-center gap-2 cursor-pointer mb-2">
                  <input
                    type="checkbox"
                    checked={includeDelivery}
                    onChange={(e) => {
                      setIncludeDelivery(e.target.checked)
                      setAmountReceived(recalcAmount())
                    }}
                    className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-sm font-medium text-gray-700 flex items-center gap-1">
                    <Truck size={14} /> Domicilio
                  </span>
                </label>
                {includeDelivery && (
                  <input
                    type="number"
                    value={deliveryCharge}
                    onChange={(e) => {
                      setDeliveryCharge(parseFloat(e.target.value) || 0)
                      setAmountReceived(recalcAmount())
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
                    min="0"
                    step="1000"
                  />
                )}
                {includeDelivery && (
                  <div className="flex justify-between text-sm text-primary-600 mt-1">
                    <span>Cargo Domicilio</span>
                    <span>+{formatCurrency(deliveryCharge)}</span>
                  </div>
                )}
              </div>
              <div className="flex justify-between text-lg font-bold text-primary-700 pt-1 border-t border-primary-100">
                <span>Total a pagar</span>
                <span>{formatCurrency(finalTotal)}</span>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Método de pago</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setPaymentMethod('EFECTIVO')}
                    className={`flex items-center justify-center gap-2 p-3 rounded-xl border-2 transition-colors ${
                      paymentMethod === 'EFECTIVO' ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-gray-200 text-gray-600'
                    }`}
                  >
                    <Banknote size={18} />
                    Efectivo
                  </button>
                  <button
                    onClick={() => {
                      setPaymentMethod('TRANSFERENCIA')
                      setAmountReceived(String(finalTotal))
                    }}
                    className={`flex items-center justify-center gap-2 p-3 rounded-xl border-2 transition-colors ${
                      paymentMethod === 'TRANSFERENCIA' ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-gray-200 text-gray-600'
                    }`}
                  >
                    <CreditCard size={18} />
                    Transferencia
                  </button>
                </div>
              </div>

              {paymentMethod === 'EFECTIVO' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Monto recibido</label>
                  <input
                    type="number"
                    value={amountReceived}
                    onChange={(e) => setAmountReceived(e.target.value)}
                    className="input-field"
                    min={finalTotal}
                  />
                  {parseFloat(amountReceived) >= finalTotal && (
                    <div className="flex justify-between text-lg font-bold text-green-600 mt-2">
                      <span>Cambio</span>
                      <span>{formatCurrency(parseFloat(amountReceived) - finalTotal)}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowPayModal(false)}
                className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handlePayTable}
                disabled={processing || parseFloat(amountReceived) < finalTotal}
                className="flex-1 px-4 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {processing ? <Loader2 className="w-5 h-5 animate-spin" /> : <CreditCard size={18} />}
                {processing ? 'Procesando...' : 'Confirmar Pago'}
              </button>
            </div>
          </div>
        </div>
        )
      })()}

      {/* Create Table Modal */}
      {showCreateTableModal && (
        <div className="modal-overlay">
          <div className="modal-content p-6 animate-scale-in">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Nueva Mesa</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Número de Mesa *</label>
                <input
                  type="number"
                  value={newTableNumber}
                  onChange={(e) => setNewTableNumber(e.target.value)}
                  className="input-field"
                  placeholder="1"
                  min={1}
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre (opcional)</label>
                <input
                  type="text"
                  value={newTableName}
                  onChange={(e) => setNewTableName(e.target.value)}
                  className="input-field"
                  placeholder="Ej: Mesa VIP 1"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Capacidad</label>
                  <input
                    type="number"
                    value={newTableCapacity}
                    onChange={(e) => setNewTableCapacity(e.target.value)}
                    className="input-field"
                    min={1}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Zona</label>
                  <select
                    value={newTableZone}
                    onChange={(e) => {
                      setNewTableZone(e.target.value)
                      if (e.target.value !== '__custom__') setCustomZone('')
                    }}
                    className="input-field"
                  >
                    {allZones.map(z => <option key={z} value={z}>{z}</option>)}
                    <option value="__custom__">+ Nueva zona...</option>
                  </select>
                  {newTableZone === '__custom__' && (
                    <input
                      type="text"
                      value={customZone}
                      onChange={(e) => setCustomZone(e.target.value.toUpperCase())}
                      className="input-field mt-2"
                      placeholder="Nombre de la nueva zona"
                      autoFocus
                    />
                  )}
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowCreateTableModal(false)}
                className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateTable}
                disabled={processing || !newTableNumber}
                className="flex-1 px-4 py-3 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-colors disabled:opacity-50"
              >
                {processing ? 'Creando...' : 'Crear Mesa'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Table Modal */}
      {showEditTableModal && (
        <div className="modal-overlay">
          <div className="modal-content p-6 animate-scale-in">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Editar Mesa</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Número de Mesa *</label>
                <input
                  type="number"
                  value={editTableData.tableNumber}
                  onChange={(e) => setEditTableData({ ...editTableData, tableNumber: e.target.value })}
                  className="input-field"
                  min={1}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre (opcional)</label>
                <input
                  type="text"
                  value={editTableData.name}
                  onChange={(e) => setEditTableData({ ...editTableData, name: e.target.value })}
                  className="input-field"
                  placeholder="Ej: Mesa VIP 1"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Capacidad</label>
                  <input
                    type="number"
                    value={editTableData.capacity}
                    onChange={(e) => setEditTableData({ ...editTableData, capacity: e.target.value })}
                    className="input-field"
                    min={1}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Zona</label>
                  <select
                    value={editTableData.zone}
                    onChange={(e) => setEditTableData({ ...editTableData, zone: e.target.value })}
                    className="input-field"
                  >
                    {allZones.map(z => <option key={z} value={z}>{z}</option>)}
                  </select>
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowEditTableModal(false)}
                className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleEditTable}
                disabled={processing || !editTableData.tableNumber}
                className="flex-1 px-4 py-3 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-colors disabled:opacity-50"
              >
                {processing ? 'Guardando...' : 'Guardar Cambios'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Customer Modal */}
      {showNewCustomerModal && (
        <div className="modal-overlay" style={{ zIndex: 60 }}>
          <div className="modal-content p-6 animate-scale-in">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-800">Nuevo Cliente</h3>
              <button onClick={() => setShowNewCustomerModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre Completo *</label>
                <input
                  type="text"
                  value={newCustomerData.fullName}
                  onChange={(e) => setNewCustomerData({ ...newCustomerData, fullName: e.target.value })}
                  className="input-field"
                  placeholder="Nombre del cliente"
                  autoFocus
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipo Doc.</label>
                  <select
                    value={newCustomerData.documentType}
                    onChange={(e) => setNewCustomerData({ ...newCustomerData, documentType: e.target.value })}
                    className="input-field"
                  >
                    <option value="CC">CC</option>
                    <option value="NIT">NIT</option>
                    <option value="CE">CE</option>
                    <option value="TI">TI</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Número</label>
                  <input
                    type="text"
                    value={newCustomerData.documentNumber}
                    onChange={(e) => setNewCustomerData({ ...newCustomerData, documentNumber: e.target.value })}
                    className="input-field"
                    placeholder="Documento"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                <input
                  type="text"
                  value={newCustomerData.phone}
                  onChange={(e) => setNewCustomerData({ ...newCustomerData, phone: e.target.value })}
                  className="input-field"
                  placeholder="Teléfono (opcional)"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowNewCustomerModal(false)}
                className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateCustomer}
                disabled={savingCustomer || !newCustomerData.fullName.trim()}
                className="flex-1 px-4 py-3 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {savingCustomer ? <Loader2 className="w-5 h-5 animate-spin" /> : <UserPlus size={20} />}
                {savingCustomer ? 'Guardando...' : 'Crear y Seleccionar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invoice Confirmation Modal (after pay) */}
      {showInvoiceModal && completedInvoice && (
        <div className="modal-overlay">
          <div className="modal-content p-6 animate-scale-in">
            <div className="text-center mb-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <CreditCard size={32} className="text-green-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-800">Pago Completado</h3>
              <p className="text-sm text-gray-500 mt-1">Factura N° {completedInvoice.invoiceNumber}</p>
            </div>

            <div className="bg-gray-50 rounded-xl p-4 space-y-2 mb-4">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Cliente</span>
                <span className="font-medium">{completedInvoice.customer?.fullName || 'Cliente General'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Método</span>
                <span className="font-medium">{completedInvoice.paymentMethod === 'EFECTIVO' ? 'Efectivo' : 'Transferencia'}</span>
              </div>
              <div className="flex justify-between text-lg font-bold text-primary-700 pt-2 border-t">
                <span>Total</span>
                <span>{formatCurrency(completedInvoice.total)}</span>
              </div>
              {completedInvoice.changeAmount > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>Cambio</span>
                  <span className="font-medium">{formatCurrency(completedInvoice.changeAmount)}</span>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <button
                onClick={handlePrintInvoice}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-colors font-medium"
              >
                <Printer size={18} />
                Imprimir Factura
              </button>
              <button
                onClick={() => { setShowInvoiceModal(false); setCompletedInvoice(null) }}
                className="w-full px-4 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors"
              >
                Cerrar sin Imprimir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default TablesPage
