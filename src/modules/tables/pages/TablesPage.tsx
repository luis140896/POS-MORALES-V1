import { useState, useEffect, useCallback } from 'react'
import { useSelector } from 'react-redux'
import {
  Plus, X, Users, Clock, Search, Loader2, CreditCard, Banknote,
  Minus, Trash2, ChevronRight, UtensilsCrossed, Coffee, AlertCircle
} from 'lucide-react'
import toast from 'react-hot-toast'
import { RootState } from '@/app/store'
import { tableService, OpenTableRequest, AddTableItemsRequest, PayTableRequest } from '@/core/api/tableService'
import { productService } from '@/core/api/productService'
import { categoryService } from '@/core/api/categoryService'
import { RestaurantTable, TableSession, Product, Category, InvoiceDetail } from '@/types'

const ZONES = ['INTERIOR', 'TERRAZA', 'BAR', 'VIP']

const STATUS_COLORS: Record<string, { bg: string; text: string; border: string; label: string }> = {
  DISPONIBLE: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200', label: 'Disponible' },
  OCUPADA: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-300', label: 'Ocupada' },
  RESERVADA: { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200', label: 'Reservada' },
  FUERA_DE_SERVICIO: { bg: 'bg-gray-100', text: 'text-gray-500', border: 'border-gray-300', label: 'Fuera de servicio' },
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

  // Filters
  const [zoneFilter, setZoneFilter] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<string | null>(null)

  // Selected table
  const [selectedTable, setSelectedTable] = useState<RestaurantTable | null>(null)
  const [activeSession, setActiveSession] = useState<TableSession | null>(null)

  // Modals
  const [showOpenModal, setShowOpenModal] = useState(false)
  const [showAddItemsModal, setShowAddItemsModal] = useState(false)
  const [showPayModal, setShowPayModal] = useState(false)
  const [showCreateTableModal, setShowCreateTableModal] = useState(false)

  // Open table form
  const [guestCount, setGuestCount] = useState(1)
  const [tableNotes, setTableNotes] = useState('')

  // Add items
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null)
  const [itemsToAdd, setItemsToAdd] = useState<{ product: Product; quantity: number }[]>([])

  // Pay form
  const [paymentMethod, setPaymentMethod] = useState<'EFECTIVO' | 'TARJETA_CREDITO'>('EFECTIVO')
  const [amountReceived, setAmountReceived] = useState('')
  const [processing, setProcessing] = useState(false)

  // Create table form
  const [newTableNumber, setNewTableNumber] = useState('')
  const [newTableName, setNewTableName] = useState('')
  const [newTableCapacity, setNewTableCapacity] = useState('4')
  const [newTableZone, setNewTableZone] = useState('INTERIOR')

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
        productService.getAll(),
        categoryService.getActive(),
      ])
      const prodData = prodRes as any
      setProducts(Array.isArray(prodData) ? prodData : prodData?.content || [])
      setCategories(Array.isArray(catRes) ? catRes : [])
    } catch (err) {
      console.error('Error loading products/categories', err)
    }
  }, [])

  useEffect(() => {
    const init = async () => {
      setLoading(true)
      await Promise.all([fetchTables(), fetchProducts()])
      setLoading(false)
    }
    init()
  }, [fetchTables, fetchProducts])

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

  const handleOpenTable = async () => {
    if (!selectedTable) return
    setProcessing(true)
    try {
      const request: OpenTableRequest = { guestCount, notes: tableNotes || undefined }
      const res = await tableService.openTable(selectedTable.id, request)
      setActiveSession(res as TableSession)
      toast.success(`Mesa #${selectedTable.tableNumber} abierta`)
      setShowOpenModal(false)
      setGuestCount(1)
      setTableNotes('')
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
        }))
      }
      const res = await tableService.addItems(selectedTable.id, request)
      setActiveSession(res as TableSession)
      toast.success(`${itemsToAdd.length} producto(s) agregado(s)`)
      setShowAddItemsModal(false)
      setItemsToAdd([])
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

  const handlePayTable = async () => {
    if (!selectedTable || !activeSession) return
    setProcessing(true)
    try {
      const request: PayTableRequest = {
        paymentMethod,
        amountReceived: parseFloat(amountReceived),
      }
      await tableService.payTable(selectedTable.id, request)
      toast.success(`Mesa #${selectedTable.tableNumber} pagada exitosamente`)
      setShowPayModal(false)
      setAmountReceived('')
      setSelectedTable(null)
      setActiveSession(null)
      await fetchTables()
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error al pagar mesa')
    } finally {
      setProcessing(false)
    }
  }

  const handleCreateTable = async () => {
    if (!newTableNumber) return
    setProcessing(true)
    try {
      await tableService.create({
        tableNumber: parseInt(newTableNumber),
        name: newTableName || undefined,
        capacity: parseInt(newTableCapacity) || 4,
        zone: newTableZone,
      })
      toast.success('Mesa creada exitosamente')
      setShowCreateTableModal(false)
      setNewTableNumber('')
      setNewTableName('')
      setNewTableCapacity('4')
      setNewTableZone('INTERIOR')
      await fetchTables()
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error al crear mesa')
    } finally {
      setProcessing(false)
    }
  }

  // ==================== FILTERS ====================

  const filteredTables = tables.filter(t => {
    if (zoneFilter && t.zone !== zoneFilter) return false
    if (statusFilter && t.status !== statusFilter) return false
    return true
  })

  const filteredProducts = products.filter(p => {
    if (!p.isActive) return false
    if (selectedCategory && p.categoryId !== selectedCategory) return false
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      return p.name.toLowerCase().includes(term) || p.code?.toLowerCase().includes(term)
    }
    return true
  })

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
    <div className="flex h-[calc(100vh-4rem)] gap-4 p-4 overflow-hidden">
      {/* Left: Table Grid */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 flex-shrink-0">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Mesas</h1>
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
        <div className="flex gap-2 mb-4 flex-wrap flex-shrink-0">
          <button
            onClick={() => setZoneFilter(null)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              !zoneFilter ? 'bg-primary-600 text-white' : 'bg-white text-gray-600 hover:bg-primary-50'
            }`}
          >
            Todas
          </button>
          {ZONES.map(zone => (
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
          {Object.entries(STATUS_COLORS).map(([status, colors]) => (
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
        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {filteredTables.map(table => {
              const colors = STATUS_COLORS[table.status] || STATUS_COLORS.DISPONIBLE
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
      <div className="w-96 bg-white rounded-2xl shadow-soft flex flex-col flex-shrink-0 overflow-hidden">
        {selectedTable ? (
          <>
            {/* Panel Header */}
            <div className={`p-4 border-b ${STATUS_COLORS[selectedTable.status]?.bg || 'bg-gray-50'}`}>
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-800">
                    Mesa #{selectedTable.tableNumber}
                  </h2>
                  <p className="text-sm text-gray-500">{selectedTable.name} - {selectedTable.zone}</p>
                </div>
                <button
                  onClick={() => { setSelectedTable(null); setActiveSession(null) }}
                  className="p-1.5 rounded-lg hover:bg-white/50 text-gray-400"
                >
                  <X size={18} />
                </button>
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
                        onClick={() => { setShowAddItemsModal(true); setItemsToAdd([]) }}
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
                    {STATUS_COLORS[selectedTable.status]?.label}
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm animate-scale-in">
            <h3 className="text-xl font-bold text-gray-800 mb-4">
              Abrir Mesa #{selectedTable?.tableNumber}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Comensales</label>
                <input
                  type="number"
                  value={guestCount}
                  onChange={(e) => setGuestCount(Math.max(1, parseInt(e.target.value) || 1))}
                  className="input-field"
                  min={1}
                />
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col animate-scale-in">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-xl font-bold text-gray-800">
                Agregar Productos - Mesa #{selectedTable?.tableNumber}
              </h3>
              <button onClick={() => setShowAddItemsModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>

            <div className="flex flex-1 overflow-hidden">
              {/* Products list */}
              <div className="flex-1 flex flex-col border-r overflow-hidden">
                <div className="p-3 border-b">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                      type="text"
                      placeholder="Buscar producto..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="input-field pl-10 text-sm"
                      autoFocus
                    />
                  </div>
                  <div className="flex gap-1 mt-2 overflow-x-auto">
                    <button
                      onClick={() => setSelectedCategory(null)}
                      className={`px-2 py-1 rounded-lg text-xs font-medium whitespace-nowrap ${
                        !selectedCategory ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      Todos
                    </button>
                    {categories.map(cat => (
                      <button
                        key={cat.id}
                        onClick={() => setSelectedCategory(cat.id === selectedCategory ? null : cat.id)}
                        className={`px-2 py-1 rounded-lg text-xs font-medium whitespace-nowrap ${
                          selectedCategory === cat.id ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {cat.name}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                  {filteredProducts.map(product => (
                    <button
                      key={product.id}
                      onClick={() => addProductToList(product)}
                      className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-primary-50 transition-colors text-left"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{product.name}</p>
                        <p className="text-xs text-gray-500">{product.code}</p>
                      </div>
                      <span className="text-sm font-semibold text-primary-600 ml-2">
                        {formatCurrency(product.salePrice)}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Cart */}
              <div className="w-64 flex flex-col">
                <div className="p-3 border-b">
                  <h4 className="font-semibold text-gray-700 text-sm">
                    Por agregar ({itemsToAdd.length})
                  </h4>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                  {itemsToAdd.map(item => (
                    <div key={item.product.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{item.product.name}</p>
                        <p className="text-xs text-gray-500">{formatCurrency(item.product.salePrice * item.quantity)}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => updateItemQuantity(item.product.id, -1)}
                          className="p-0.5 rounded hover:bg-gray-200"
                        >
                          <Minus size={12} />
                        </button>
                        <span className="text-xs font-bold w-5 text-center">{item.quantity}</span>
                        <button
                          onClick={() => updateItemQuantity(item.product.id, 1)}
                          className="p-0.5 rounded hover:bg-gray-200"
                        >
                          <Plus size={12} />
                        </button>
                        <button
                          onClick={() => removeItemFromList(item.product.id)}
                          className="p-0.5 rounded hover:bg-red-100 text-gray-400 hover:text-red-500 ml-1"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    </div>
                  ))}
                  {itemsToAdd.length === 0 && (
                    <p className="text-center text-xs text-gray-400 py-8">
                      Selecciona productos de la lista
                    </p>
                  )}
                </div>
                <div className="p-3 border-t">
                  <button
                    onClick={handleAddItems}
                    disabled={processing || itemsToAdd.length === 0}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-colors disabled:opacity-50 text-sm font-medium"
                  >
                    {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChevronRight size={16} />}
                    {processing ? 'Agregando...' : 'Confirmar'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Pay Modal */}
      {showPayModal && activeSession && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md animate-scale-in">
            <h3 className="text-xl font-bold text-gray-800 mb-4">
              Cobrar Mesa #{selectedTable?.tableNumber}
            </h3>

            <div className="bg-primary-50 rounded-xl p-4 mb-4">
              <div className="flex justify-between text-lg font-bold text-primary-700">
                <span>Total a pagar</span>
                <span>{formatCurrency(activeSession.total || 0)}</span>
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
                      setPaymentMethod('TARJETA_CREDITO')
                      setAmountReceived(String(activeSession.total || 0))
                    }}
                    className={`flex items-center justify-center gap-2 p-3 rounded-xl border-2 transition-colors ${
                      paymentMethod === 'TARJETA_CREDITO' ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-gray-200 text-gray-600'
                    }`}
                  >
                    <CreditCard size={18} />
                    Tarjeta
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
                    min={activeSession.total || 0}
                  />
                  {parseFloat(amountReceived) >= (activeSession.total || 0) && (
                    <div className="flex justify-between text-lg font-bold text-green-600 mt-2">
                      <span>Cambio</span>
                      <span>{formatCurrency(parseFloat(amountReceived) - (activeSession.total || 0))}</span>
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
                disabled={processing || parseFloat(amountReceived) < (activeSession.total || 0)}
                className="flex-1 px-4 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {processing ? <Loader2 className="w-5 h-5 animate-spin" /> : <CreditCard size={18} />}
                {processing ? 'Procesando...' : 'Confirmar Pago'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Table Modal */}
      {showCreateTableModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm animate-scale-in">
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
                    onChange={(e) => setNewTableZone(e.target.value)}
                    className="input-field"
                  >
                    {ZONES.map(z => <option key={z} value={z}>{z}</option>)}
                  </select>
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
    </div>
  )
}

export default TablesPage
