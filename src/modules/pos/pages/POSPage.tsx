import { useState, useEffect, useCallback } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Search, Plus, Minus, Trash2, CreditCard, Banknote, X, Loader2, User, UserPlus, Printer, Grid3X3, LayoutGrid, Grid2X2, UtensilsCrossed } from 'lucide-react'
import toast from 'react-hot-toast'
import { RootState } from '@/app/store'
import { addItem, removeItem, incrementQuantity, decrementQuantity, clearCart, setCustomer, selectCartTotal } from '../store/cartSlice'
import Button from '@/shared/components/ui/Button'
import { productService } from '@/core/api/productService'
import { categoryService } from '@/core/api/categoryService'
import { customerService } from '@/core/api/customerService'
import { invoiceService } from '@/core/api/invoiceService'
import { tableService } from '@/core/api/tableService'
import { Product, Category, Customer, RestaurantTable } from '@/types'

interface ProductWithCategory extends Product {
  categoryId: number
}

interface InvoiceConfirmModalProps {
  show: boolean
  completedInvoice: any
  onPrint: () => void
  onClose: () => void
  formatCurrency: (value: number) => string
}

const InvoiceConfirmModal = ({
  show,
  completedInvoice,
  onPrint,
  onClose,
  formatCurrency,
}: InvoiceConfirmModalProps) => {
  if (!show || !completedInvoice) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md animate-scale-in">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-gray-800">¡Venta Completada!</h3>
          <p className="text-gray-500 mt-1">Factura N° {completedInvoice.invoiceNumber}</p>
        </div>

        <div className="bg-gray-50 rounded-xl p-4 mb-6 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Cliente:</span>
            <span className="font-medium">{completedInvoice.customer?.fullName || 'Cliente General'}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Método:</span>
            <span>{completedInvoice.paymentMethod}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Items:</span>
            <span>{completedInvoice.details?.length || 0} productos</span>
          </div>
          <div className="flex justify-between text-lg font-bold pt-2 border-t border-gray-200">
            <span>Total:</span>
            <span className="text-primary-600">{formatCurrency(completedInvoice.total)}</span>
          </div>
        </div>

        <div className="space-y-3">
          <button
            onClick={onPrint}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-colors"
          >
            <Printer size={20} />
            Imprimir Factura
          </button>
          <button
            onClick={onClose}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors"
          >
            <X size={20} />
            Cerrar sin Imprimir
          </button>
        </div>
      </div>
    </div>
  )
}

interface CustomerSelectionModalProps {
  show: boolean
  customerId: number | null
  customerSearch: string
  setCustomerSearch: (value: string) => void
  filteredCustomers: Customer[]
  onClose: () => void
  onSelectCustomer: (customer: Customer | null) => void
  onOpenNewCustomer: () => void
}

const CustomerSelectionModal = ({
  show,
  customerId,
  customerSearch,
  setCustomerSearch,
  filteredCustomers,
  onClose,
  onSelectCustomer,
  onOpenNewCustomer,
}: CustomerSelectionModalProps) => {
  if (!show) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md max-h-[80vh] flex flex-col animate-scale-in">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-gray-800">Seleccionar Cliente</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={24} />
          </button>
        </div>

        <div className="relative mb-4">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Buscar por nombre, documento o teléfono..."
            value={customerSearch}
            onChange={(e) => setCustomerSearch(e.target.value)}
            className="input-field pl-12"
            autoFocus
          />
        </div>

        <div className="flex-1 overflow-y-auto space-y-2">
          <button
            onClick={() => onSelectCustomer(null)}
            className={`w-full p-3 rounded-xl text-left transition-colors ${
              customerId === null ? 'bg-primary-100 border-2 border-primary-500' : 'bg-gray-50 hover:bg-primary-50'
            }`}
          >
            <p className="font-medium text-gray-800">Cliente General</p>
            <p className="text-sm text-gray-500">Sin datos de cliente</p>
          </button>

          {filteredCustomers.map((customer) => (
            <button
              key={customer.id}
              onClick={() => onSelectCustomer(customer)}
              className={`w-full p-3 rounded-xl text-left transition-colors ${
                customerId === customer.id ? 'bg-primary-100 border-2 border-primary-500' : 'bg-gray-50 hover:bg-primary-50'
              }`}
            >
              <p className="font-medium text-gray-800">{customer.fullName}</p>
              <p className="text-sm text-gray-500">
                {customer.documentType} {customer.documentNumber}
                {customer.phone && ` • ${customer.phone}`}
              </p>
            </button>
          ))}

          {filteredCustomers.length === 0 && customerSearch && (
            <div className="text-center py-8 text-gray-400">No se encontraron clientes</div>
          )}
        </div>

        <div className="mt-4 pt-4 border-t border-primary-100">
          <button
            onClick={onOpenNewCustomer}
            className="w-full flex items-center justify-center gap-2 p-3 bg-primary-50 text-primary-600 rounded-xl hover:bg-primary-100 transition-colors"
          >
            <UserPlus size={20} />
            <span className="font-medium">Crear Nuevo Cliente</span>
          </button>
        </div>
      </div>
    </div>
  )
}

interface NewCustomerModalProps {
  show: boolean
  newCustomerData: {
    fullName: string
    documentType: string
    documentNumber: string
    phone: string
  }
  setNewCustomerData: (data: { fullName: string; documentType: string; documentNumber: string; phone: string }) => void
  savingCustomer: boolean
  onClose: () => void
  onCreate: () => void
}

const NewCustomerModal = ({
  show,
  newCustomerData,
  setNewCustomerData,
  savingCustomer,
  onClose,
  onCreate,
}: NewCustomerModalProps) => {
  if (!show) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md animate-scale-in">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-gray-800">Nuevo Cliente</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
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
            onClick={onClose}
            className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={onCreate}
            disabled={savingCustomer || !newCustomerData.fullName.trim()}
            className="flex-1 px-4 py-3 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {savingCustomer ? <Loader2 className="w-5 h-5 animate-spin" /> : <UserPlus size={20} />}
            {savingCustomer ? 'Guardando...' : 'Crear y Seleccionar'}
          </button>
        </div>
      </div>
    </div>
  )
}

type CardSize = 'small' | 'medium' | 'large'

interface CategoriesPanelProps {
  cardSize: CardSize
  setCardSize: (size: CardSize) => void
  categories: Category[]
  selectedCategory: number | null
  setSelectedCategory: (categoryId: number | null) => void
  organizing: boolean
  onStartOrganize: () => void
  onAcceptOrganize: () => void
  onCancelOrganize: () => void
  onReorderCategory: (activeId: number, overId: number) => void
}

const CategoriesPanel = ({
  cardSize,
  setCardSize,
  categories,
  selectedCategory,
  setSelectedCategory,
  organizing,
  onStartOrganize,
  onAcceptOrganize,
  onCancelOrganize,
  onReorderCategory,
}: CategoriesPanelProps) => {
  const [draggingCategoryId, setDraggingCategoryId] = useState<number | null>(null)

  return (
    <div className="flex flex-col gap-2 mb-4 flex-shrink-0">
      <div className="flex items-center justify-between gap-2">
        <div className="flex gap-1 bg-white rounded-xl p-1 flex-shrink-0">
          <button
            onClick={() => setCardSize('small')}
            className={`p-2 rounded-lg transition-colors ${cardSize === 'small' ? 'bg-primary-100 text-primary-600' : 'text-gray-400 hover:text-gray-600'}`}
            title="Vista compacta"
          >
            <Grid3X3 size={18} />
          </button>
          <button
            onClick={() => setCardSize('medium')}
            className={`p-2 rounded-lg transition-colors ${cardSize === 'medium' ? 'bg-primary-100 text-primary-600' : 'text-gray-400 hover:text-gray-600'}`}
            title="Vista normal"
          >
            <Grid2X2 size={18} />
          </button>
          <button
            onClick={() => setCardSize('large')}
            className={`p-2 rounded-lg transition-colors ${cardSize === 'large' ? 'bg-primary-100 text-primary-600' : 'text-gray-400 hover:text-gray-600'}`}
            title="Vista grande"
          >
            <LayoutGrid size={18} />
          </button>
        </div>
        {!organizing ? (
          <button
            onClick={onStartOrganize}
            className="px-3 py-2 rounded-xl bg-white text-gray-600 hover:text-primary-600 hover:bg-primary-50 transition-colors text-sm font-medium"
            title="Organizar categorías"
          >
            Organizar
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={onCancelOrganize}
              className="px-3 py-2 rounded-xl bg-white text-gray-600 hover:text-gray-800 hover:bg-gray-50 transition-colors text-sm font-medium"
              title="Cancelar"
            >
              Cancelar
            </button>
            <button
              onClick={onAcceptOrganize}
              className="px-3 py-2 rounded-xl bg-primary-600 text-white hover:bg-primary-700 transition-colors text-sm font-medium"
              title="Aceptar"
            >
              Aceptar
            </button>
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl shadow-soft p-3 h-auto max-h-[220px] overflow-y-auto inline-block w-fit max-w-full border border-gray-100">
        <div className="flex flex-wrap gap-3 pb-3">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all border ${
              selectedCategory === null
                ? 'bg-gradient-to-r from-primary-600 to-primary-700 text-white shadow-soft border-primary-600'
                : 'bg-white text-gray-700 hover:bg-primary-50 border-gray-200 hover:border-primary-300'
            }`}
            title="Todos"
          >
            <span className="flex-shrink-0">🏷️</span>
            <span className="text-xs font-medium whitespace-normal break-words leading-tight">Todos</span>
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              draggable={organizing}
              onDragStart={() => {
                if (!organizing) return
                setDraggingCategoryId(cat.id)
              }}
              onDragEnd={() => {
                if (!organizing) return
                setDraggingCategoryId(null)
              }}
              onDragOver={(e) => {
                if (!organizing) return
                if (draggingCategoryId === null || draggingCategoryId === cat.id) return
                e.preventDefault()
              }}
              onDrop={(e) => {
                if (!organizing) return
                if (draggingCategoryId === null || draggingCategoryId === cat.id) return
                e.preventDefault()
                onReorderCategory(draggingCategoryId, cat.id)
                setDraggingCategoryId(null)
              }}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all border ${
                selectedCategory === cat.id
                  ? 'bg-gradient-to-r from-primary-600 to-primary-700 text-white shadow-soft border-primary-600'
                  : 'bg-white text-gray-700 hover:bg-primary-50 border-gray-200 hover:border-primary-300'
              }`}
              title={cat.name}
            >
              <span className="flex-shrink-0">{cat.imageUrl || '📦'}</span>
              <span className="text-xs font-medium whitespace-normal break-words leading-tight">{cat.name}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

interface PaymentModalProps {
  show: boolean
  paymentMethod: 'EFECTIVO' | 'TARJETA_CREDITO'
  subtotal: number
  discountAmount: number
  total: number
  amountReceived: string
  setAmountReceived: (value: string) => void
  processing: boolean
  onClose: () => void
  onConfirm: () => Promise<void>
  formatCurrency: (value: number) => string
}

const PaymentModal = ({
  show,
  paymentMethod,
  subtotal,
  discountAmount,
  total,
  amountReceived,
  setAmountReceived,
  processing,
  onClose,
  onConfirm,
  formatCurrency,
}: PaymentModalProps) => {
  if (!show) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md animate-scale-in">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-gray-800">
            Pago con {paymentMethod === 'EFECTIVO' ? 'Efectivo' : 'Tarjeta'}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            disabled={processing}
          >
            <X size={24} />
          </button>
        </div>

        <div className="space-y-4 mb-6">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Subtotal</span>
            <span>{formatCurrency(subtotal)}</span>
          </div>
          {discountAmount > 0 && (
            <div className="flex justify-between text-sm text-green-600">
              <span>Descuento</span>
              <span>-{formatCurrency(discountAmount)}</span>
            </div>
          )}
          <div className="flex justify-between text-lg font-bold border-t pt-2">
            <span>Total a pagar</span>
            <span className="text-primary-600">{formatCurrency(total)}</span>
          </div>

          {paymentMethod === 'EFECTIVO' ? (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Monto recibido</label>
                <input
                  type="number"
                  value={amountReceived}
                  onChange={(e) => setAmountReceived(e.target.value)}
                  className="input-field"
                  min={total}
                />
              </div>
              {parseFloat(amountReceived) >= total && (
                <div className="flex justify-between text-lg font-bold text-green-600">
                  <span>Cambio</span>
                  <span>{formatCurrency(parseFloat(amountReceived) - total)}</span>
                </div>
              )}
            </>
          ) : (
            <div className="p-4 bg-primary-50 rounded-xl text-center">
              <CreditCard className="w-12 h-12 mx-auto text-primary-600 mb-2" />
              <p className="text-sm text-gray-600">El pago se procesará con tarjeta</p>
              <p className="text-xs text-gray-400 mt-1">El monto exacto será cobrado al cliente</p>
            </div>
          )}
        </div>

        <div className="space-y-3">
          <Button
            variant="primary"
            className="w-full"
            disabled={processing || (paymentMethod === 'EFECTIVO' && parseFloat(amountReceived) < total)}
            onClick={onConfirm}
          >
            {processing ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Procesando...
              </>
            ) : (
              'Confirmar Venta'
            )}
          </Button>
          <Button variant="secondary" className="w-full" onClick={onClose} disabled={processing}>
            Cancelar
          </Button>
        </div>
      </div>
    </div>
  )
}

const POSPage = () => {
  const dispatch = useDispatch()
  const { items, customerName, customerId, discount, discountType, notes } = useSelector((state: RootState) => state.cart)
  const { subtotal, discountAmount, total, itemCount } = useSelector(selectCartTotal)
  
  const [products, setProducts] = useState<ProductWithCategory[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [showCustomerModal, setShowCustomerModal] = useState(false)
  const [customerSearch, setCustomerSearch] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<'EFECTIVO' | 'TARJETA_CREDITO'>('EFECTIVO')
  const [amountReceived, setAmountReceived] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [cardSize, setCardSize] = useState<CardSize>('medium')
  const [showNewCustomerModal, setShowNewCustomerModal] = useState(false)
  const [newCustomerData, setNewCustomerData] = useState({ fullName: '', documentType: 'CC', documentNumber: '', phone: '' })
  const [savingCustomer, setSavingCustomer] = useState(false)
  const [completedInvoice, setCompletedInvoice] = useState<any>(null)
  const [showInvoiceConfirmModal, setShowInvoiceConfirmModal] = useState(false)

  // Table selection for POS
  const [tables, setTables] = useState<RestaurantTable[]>([])
  const [selectedTableId, setSelectedTableId] = useState<number | null>(null)
  const [showTableSelector, setShowTableSelector] = useState(false)

  const [isOrganizingCategories, setIsOrganizingCategories] = useState(false)
  const [draftCategoryOrder, setDraftCategoryOrder] = useState<number[] | null>(null)

  const fetchTables = useCallback(async () => {
    try {
      const res = await tableService.getAll()
      const allTables = Array.isArray(res) ? res : []
      setTables(allTables.filter((t: RestaurantTable) => t.isActive).sort((a: RestaurantTable, b: RestaurantTable) => a.tableNumber - b.tableNumber))
    } catch { /* tables module may not be available */ }
  }, [])

  useEffect(() => {
    fetchData()
    fetchTables()
  }, [])

  const normalizeProduct = (p: any): ProductWithCategory => {
    const categoryId = p?.category?.id ?? p?.categoryId ?? 0
    const stockQuantity = p?.inventory?.quantity ?? p?.stockQuantity
    const minStock = p?.inventory?.minStock ?? p?.minStock
    const maxStock = p?.inventory?.maxStock ?? p?.maxStock
    const location = p?.inventory?.location ?? p?.location

    const inventory = (stockQuantity !== undefined || minStock !== undefined || maxStock !== undefined || location !== undefined)
      ? {
          quantity: Number(stockQuantity ?? 0),
          minStock: Number(minStock ?? 0),
          maxStock: Number(maxStock ?? 999999),
          location: location,
        }
      : undefined

    return {
      ...(p as Product),
      categoryId: Number(categoryId),
      category: p?.category,
      inventory: inventory as any,
    }
  }

  const fetchData = async () => {
    try {
      setLoading(true)
      const [productsRes, categoriesRes, customersRes] = await Promise.all([
        productService.getActive(),
        categoryService.getActive(),
        customerService.getAll()
      ])
      setProducts((productsRes as any[]).map(normalizeProduct))
      setCategories(categoriesRes as Category[])
      // Filtrar solo clientes activos
      const allCustomers = ((customersRes as any).content || customersRes) as Customer[]
      setCustomers(allCustomers.filter((c: Customer) => c.isActive !== false))
    } catch (error) {
      console.error('Error loading data:', error)
      toast.error('Error al cargar productos')
    } finally {
      setLoading(false)
    }
  }

  const filteredCustomers = customers.filter(c =>
    c.fullName?.toLowerCase().includes(customerSearch.toLowerCase()) ||
    c.documentNumber?.includes(customerSearch) ||
    c.phone?.includes(customerSearch)
  )

  const selectCustomer = (customer: Customer | null) => {
    if (customer) {
      dispatch(setCustomer({ id: customer.id, name: customer.fullName }))
    } else {
      dispatch(setCustomer({ id: null, name: 'Cliente General' }))
    }
    setShowCustomerModal(false)
    setCustomerSearch('')
  }

  const filteredProducts = products.filter(p => 
    (selectedCategory === null || p.categoryId === selectedCategory) &&
    (p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.code.includes(searchTerm))
  )

  const categoriesToShow: Category[] = (() => {
    if (!isOrganizingCategories || !draftCategoryOrder) return categories
    const byId = new Map(categories.map(c => [c.id, c]))
    const ordered: Category[] = []
    for (const id of draftCategoryOrder) {
      const cat = byId.get(id)
      if (cat) ordered.push(cat)
    }
    return ordered
  })()

  const handleStartOrganizeCategories = () => {
    setIsOrganizingCategories(true)
    setDraftCategoryOrder(categories.map(c => c.id))
  }

  const handleCancelOrganizeCategories = () => {
    setIsOrganizingCategories(false)
    setDraftCategoryOrder(null)
  }

  const handleAcceptOrganizeCategories = async () => {
    if (!draftCategoryOrder?.length) {
      handleCancelOrganizeCategories()
      return
    }

    try {
      await categoryService.reorder({ categoryIds: draftCategoryOrder })
      toast.success('Orden de categorías guardado')
      setIsOrganizingCategories(false)
      setDraftCategoryOrder(null)
      fetchData()
    } catch (error: any) {
      console.error('Error reordering categories:', error)
      toast.error(error.response?.data?.message || 'No se pudo guardar el orden de categorías')
    }
  }

  const handleReorderCategoryDraft = (activeId: number, overId: number) => {
    if (!isOrganizingCategories || !draftCategoryOrder) return
    if (activeId === overId) return

    const fromIndex = draftCategoryOrder.indexOf(activeId)
    const toIndex = draftCategoryOrder.indexOf(overId)
    if (fromIndex === -1 || toIndex === -1) return

    const next = [...draftCategoryOrder]
    const [moved] = next.splice(fromIndex, 1)
    next.splice(toIndex, 0, moved)
    setDraftCategoryOrder(next)
  }

  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(value)

  const gridClasses = {
    small: 'grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6',
    medium: 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4',
    large: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
  }

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
      dispatch(setCustomer({ id: newCustomer.id, name: newCustomer.fullName }))
      setShowNewCustomerModal(false)
      setShowCustomerModal(false)
      setNewCustomerData({ fullName: '', documentType: 'CC', documentNumber: '', phone: '' })
      toast.success('Cliente creado y seleccionado')
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error al crear cliente')
    } finally {
      setSavingCustomer(false)
    }
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  const selectedTable = tables.find(t => t.id === selectedTableId) || null

  const handleConfirmSale = async () => {
    setProcessing(true)
    try {
      // If a table is selected and it's available, open table + add items + pay via table flow
      if (selectedTableId && selectedTable && selectedTable.status === 'DISPONIBLE') {
        // Open table
        await tableService.openTable(selectedTableId, {
          guestCount: 1,
          customerId: customerId,
        })

        // Add items
        await tableService.addItems(selectedTableId, {
          items: items.map(item => ({
            productId: item.id,
            quantity: item.quantity,
            unitPrice: item.price,
          }))
        })

        // Pay table
        const result = await tableService.payTable(selectedTableId, {
          paymentMethod: paymentMethod,
          amountReceived: parseFloat(amountReceived),
          discountPercent: discountType === 'percent' ? discount : 0,
          notes: notes || undefined,
        })

        const invoiceDetail = await invoiceService.getById((result as any).id)
        setCompletedInvoice(invoiceDetail)
        dispatch(clearCart())
        setSelectedTableId(null)
        setShowPaymentModal(false)
        setShowInvoiceConfirmModal(true)
        fetchData()
        fetchTables()
      } else if (selectedTableId && selectedTable && selectedTable.status === 'OCUPADA') {
        // Table already occupied: add items to existing session and pay
        await tableService.addItems(selectedTableId, {
          items: items.map(item => ({
            productId: item.id,
            quantity: item.quantity,
            unitPrice: item.price,
          }))
        })

        const result = await tableService.payTable(selectedTableId, {
          paymentMethod: paymentMethod,
          amountReceived: parseFloat(amountReceived),
          discountPercent: discountType === 'percent' ? discount : 0,
          notes: notes || undefined,
        })

        const invoiceDetail = await invoiceService.getById((result as any).id)
        setCompletedInvoice(invoiceDetail)
        dispatch(clearCart())
        setSelectedTableId(null)
        setShowPaymentModal(false)
        setShowInvoiceConfirmModal(true)
        fetchData()
        fetchTables()
      } else {
        // Normal POS sale (no table)
        const saleRequest = {
          customerId: customerId,
          paymentMethod: paymentMethod,
          discountPercent: discountType === 'percent' ? discount : 0,
          amountReceived: parseFloat(amountReceived),
          notes: notes,
          details: items.map(item => ({
            productId: item.id,
            quantity: item.quantity,
            unitPrice: item.price,
            discountAmount: 0
          }))
        }

        const result = await invoiceService.createSale(saleRequest)
        const invoiceDetail = await invoiceService.getById((result as any).id)
        setCompletedInvoice(invoiceDetail)
        dispatch(clearCart())
        setShowPaymentModal(false)
        setShowInvoiceConfirmModal(true)
        fetchData()
      }
    } catch (error: any) {
      console.error('Error processing sale:', error)
      toast.error(error.response?.data?.message || 'Error al procesar la venta')
    } finally {
      setProcessing(false)
    }
  }

  const handlePrintInvoice = () => {
    if (!completedInvoice) return
    const printWindow = window.open('', '_blank')
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Factura ${completedInvoice.invoiceNumber}</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 20px; max-width: 300px; margin: 0 auto; }
              .header { text-align: center; margin-bottom: 20px; border-bottom: 1px dashed #000; padding-bottom: 10px; }
              .header h1 { margin: 0; font-size: 18px; }
              .info { margin-bottom: 15px; font-size: 12px; }
              .info div { margin: 3px 0; }
              .items { border-top: 1px dashed #000; border-bottom: 1px dashed #000; padding: 10px 0; margin: 10px 0; }
              .item { display: flex; justify-content: space-between; font-size: 12px; margin: 5px 0; }
              .totals { font-size: 12px; }
              .totals div { display: flex; justify-content: space-between; margin: 3px 0; }
              .total-final { font-size: 16px; font-weight: bold; border-top: 1px dashed #000; padding-top: 10px; margin-top: 10px; }
              .footer { text-align: center; margin-top: 20px; font-size: 10px; color: #666; }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>FACTURA DE VENTA</h1>
              <p>N° ${completedInvoice.invoiceNumber}</p>
            </div>
            <div class="info">
              <div>Fecha: ${formatDate(completedInvoice.createdAt)}</div>
              <div>Cliente: ${completedInvoice.customer?.fullName || completedInvoice.customerName || 'Cliente General'}</div>
              <div>Método: ${completedInvoice.paymentMethod}</div>
            </div>
            <div class="items">
              ${completedInvoice.details?.map((d: any) => `<div class="item"><span>${d.quantity} x ${d.productName}</span><span>${formatCurrency(d.subtotal)}</span></div>`).join('')}
            </div>
            <div class="totals">
              <div><span>Subtotal:</span><span>${formatCurrency(completedInvoice.subtotal)}</span></div>
              ${completedInvoice.discountAmount > 0 ? `<div><span>Descuento:</span><span>-${formatCurrency(completedInvoice.discountAmount)}</span></div>` : ''}
              <div class="total-final"><span>TOTAL:</span><span>${formatCurrency(completedInvoice.total)}</span></div>
            </div>
            <div class="footer">¡Gracias por su compra!</div>
          </body>
        </html>
      `)
      printWindow.document.close()
      printWindow.print()
    }
  }

  return (
    <div className="h-[calc(100vh-7rem)] flex flex-col lg:flex-row gap-6 animate-fade-in overflow-hidden overflow-x-hidden">
      {/* Left Panel - Products */}
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
        {/* Search */}
        <div className="relative mb-3 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Buscar por nombre o código..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input-field pl-10 py-2 text-sm"
          />
        </div>

        <CategoriesPanel
          cardSize={cardSize}
          setCardSize={setCardSize}
          categories={categoriesToShow}
          selectedCategory={selectedCategory}
          setSelectedCategory={setSelectedCategory}
          organizing={isOrganizingCategories}
          onStartOrganize={handleStartOrganizeCategories}
          onAcceptOrganize={handleAcceptOrganizeCategories}
          onCancelOrganize={handleCancelOrganizeCategories}
          onReorderCategory={handleReorderCategoryDraft}
        />

        {/* Products Grid */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="h-full flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="h-full flex items-center justify-center text-gray-400">
              <p>No se encontraron productos</p>
            </div>
          ) : (
            <div className={`grid ${gridClasses[cardSize]} gap-4`}>
              {filteredProducts.map((product) => {
                const stock = product.inventory?.quantity || 0
                const cartItem = items.find(i => i.id === product.id)
                const cartQty = cartItem?.quantity || 0
                const availableStock = stock - cartQty
                const isOutOfStock = availableStock <= 0

                return (
                  <button
                    key={product.id}
                    onClick={() => {
                      if (isOutOfStock) {
                        toast.error(`Sin stock disponible para ${product.name}`)
                        return
                      }
                      dispatch(addItem({ 
                        id: product.id, 
                        code: product.code, 
                        name: product.name, 
                        price: product.salePrice 
                      }))
                    }}
                    disabled={stock === 0}
                    className={`bg-white rounded-2xl shadow-sm hover:shadow-md border border-gray-200 p-4 text-left transition-all duration-200 ${
                      stock === 0 
                        ? 'opacity-50 cursor-not-allowed' 
                        : 'hover:border-primary-300 hover:scale-[1.02]'
                    } ${cartQty > 0 ? 'ring-2 ring-primary-200 border-primary-300' : ''}`}
                  >
                    <div className="w-full h-24 bg-gradient-to-br from-primary-50 to-gray-50 rounded-xl mb-3 flex items-center justify-center text-3xl overflow-hidden">
                      {product.imageUrl ? (
                        <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover rounded-xl" />
                      ) : '📦'}
                    </div>
                    <p className="text-[11px] text-gray-400 mb-0.5 font-mono">{product.code}</p>
                    <p className="font-semibold text-gray-800 text-sm line-clamp-2 mb-2 leading-snug">{product.name}</p>
                    <div className="flex items-center justify-between mt-auto">
                      <p className="text-primary-600 font-bold text-base">{formatCurrency(product.salePrice)}</p>
                      <span className={`text-[11px] px-2.5 py-1 rounded-full font-medium ${
                        stock === 0 ? 'bg-red-100 text-red-700 border border-red-200' :
                        stock <= (product.inventory?.minStock || 5) ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                        'bg-green-50 text-green-700 border border-green-200'
                      }`}>
                        {stock === 0 ? 'Agotado' : `${stock} uds`}
                      </span>
                    </div>
                    {cartQty > 0 && (
                      <div className="mt-2 flex items-center justify-center">
                        <span className="text-xs bg-primary-100 text-primary-700 px-2.5 py-0.5 rounded-full font-semibold">
                          {cartQty} en carrito
                        </span>
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Right Panel - Cart (FIXED) */}
      <div className="w-full lg:w-96 flex-shrink-0 bg-white rounded-2xl shadow-soft flex flex-col min-w-0">
        {/* Header */}
        <div className="p-4 border-b border-primary-100">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-semibold text-gray-800">Carrito</h2>
            {items.length > 0 && (
              <button
                onClick={() => dispatch(clearCart())}
                className="text-red-500 hover:text-red-600 text-sm"
              >
                Limpiar
              </button>
            )}
          </div>
          <button 
            onClick={() => setShowCustomerModal(true)}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-primary-600 transition-colors"
          >
            <User size={16} />
            <span>{customerName}</span>
            {customerId !== null && (
              <span className="text-xs text-gray-400">(ID: {customerId})</span>
            )}
            <span className="text-xs text-primary-500">(cambiar)</span>
          </button>
          {/* Table selector */}
          {tables.length > 0 && (
            <div className="relative mt-2">
              <button
                onClick={() => setShowTableSelector(!showTableSelector)}
                className={`flex items-center gap-2 text-sm transition-colors w-full ${
                  selectedTableId
                    ? 'text-primary-600 font-medium'
                    : 'text-gray-500 hover:text-primary-600'
                }`}
              >
                <UtensilsCrossed size={16} />
                <span>{selectedTable ? `Mesa #${selectedTable.tableNumber} - ${selectedTable.name}` : 'Sin mesa (venta directa)'}</span>
                <span className="text-xs text-primary-500">(cambiar)</span>
              </button>
              {showTableSelector && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-30 max-h-48 overflow-y-auto">
                  <button
                    onClick={() => { setSelectedTableId(null); setShowTableSelector(false) }}
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-primary-50 transition-colors ${
                      !selectedTableId ? 'bg-primary-50 text-primary-700 font-medium' : 'text-gray-700'
                    }`}
                  >
                    Sin mesa (venta directa)
                  </button>
                  {tables.filter(t => t.status === 'DISPONIBLE' || t.status === 'OCUPADA').map(t => (
                    <button
                      key={t.id}
                      onClick={() => { setSelectedTableId(t.id); setShowTableSelector(false) }}
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-primary-50 transition-colors flex items-center justify-between ${
                        selectedTableId === t.id ? 'bg-primary-50 text-primary-700 font-medium' : 'text-gray-700'
                      }`}
                    >
                      <span>Mesa #{t.tableNumber} - {t.name}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                        t.status === 'DISPONIBLE' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {t.status === 'DISPONIBLE' ? 'Libre' : 'Ocupada'}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {items.length === 0 ? (
            <div className="h-full flex items-center justify-center text-gray-400">
              <p>Carrito vacío</p>
            </div>
          ) : (
            items.map((item) => {
              const product = products.find(p => p.id === item.id)
              const maxStock = product?.inventory?.quantity || 0
              const canIncrement = item.quantity < maxStock

              return (
                <div key={item.id} className="flex items-center gap-3 p-3 bg-primary-50 rounded-xl">
                  <div className="flex-1">
                    <p className="font-medium text-gray-800 text-sm">{item.name}</p>
                    <p className="text-primary-600 font-semibold">{formatCurrency(item.price)}</p>
                    <p className="text-xs text-gray-400">Stock: {maxStock}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => dispatch(decrementQuantity(item.id))}
                      className="w-8 h-8 rounded-lg bg-white flex items-center justify-center hover:bg-primary-100"
                    >
                      <Minus size={16} />
                    </button>
                    <span className="w-8 text-center font-medium">{item.quantity}</span>
                    <button
                      onClick={() => {
                        if (!canIncrement) {
                          toast.error('Stock máximo alcanzado')
                          return
                        }
                        dispatch(incrementQuantity(item.id))
                      }}
                      className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        canIncrement ? 'bg-white hover:bg-primary-100' : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      }`}
                    >
                      <Plus size={16} />
                    </button>
                    <button
                      onClick={() => dispatch(removeItem(item.id))}
                      className="w-8 h-8 rounded-lg bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-100"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Totals */}
        <div className="p-4 border-t border-primary-100 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Subtotal ({itemCount} items)</span>
            <span className="font-medium">{formatCurrency(subtotal)}</span>
          </div>
          {discountAmount > 0 && (
            <div className="flex justify-between text-sm text-green-600">
              <span>Descuento</span>
              <span>-{formatCurrency(discountAmount)}</span>
            </div>
          )}
          <div className="flex justify-between text-lg font-bold pt-2 border-t border-primary-100">
            <span>Total</span>
            <span className="text-primary-600">{formatCurrency(total)}</span>
          </div>
        </div>

        {/* Payment Buttons */}
        <div className="p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Button 
              variant="secondary" 
              disabled={items.length === 0}
              onClick={() => {
                setPaymentMethod('EFECTIVO')
                setAmountReceived(total.toString())
                setShowPaymentModal(true)
              }}
            >
              <Banknote size={20} />
              Efectivo
            </Button>
            <Button 
              variant="primary" 
              disabled={items.length === 0}
              onClick={() => {
                setPaymentMethod('TARJETA_CREDITO')
                setAmountReceived(total.toString())
                setShowPaymentModal(true)
              }}
            >
              <CreditCard size={20} />
              Tarjeta
            </Button>
          </div>
          {items.length > 0 && (
            <Button 
              variant="secondary"
              className="w-full text-red-500 border-red-200 hover:bg-red-50"
              onClick={() => {
                if (confirm('¿Está seguro de cancelar esta venta? Se perderán todos los productos del carrito.')) {
                  dispatch(clearCart())
                  toast.success('Venta cancelada')
                }
              }}
            >
              <X size={20} />
              Cancelar Venta
            </Button>
          )}
        </div>
      </div>

      <PaymentModal
        show={showPaymentModal}
        paymentMethod={paymentMethod}
        subtotal={subtotal}
        discountAmount={discountAmount}
        total={total}
        amountReceived={amountReceived}
        setAmountReceived={setAmountReceived}
        processing={processing}
        onClose={() => setShowPaymentModal(false)}
        onConfirm={handleConfirmSale}
        formatCurrency={formatCurrency}
      />

      <CustomerSelectionModal
        show={showCustomerModal}
        customerId={customerId}
        customerSearch={customerSearch}
        setCustomerSearch={setCustomerSearch}
        filteredCustomers={filteredCustomers}
        onClose={() => {
          setShowCustomerModal(false)
          setCustomerSearch('')
        }}
        onSelectCustomer={selectCustomer}
        onOpenNewCustomer={() => setShowNewCustomerModal(true)}
      />

      <NewCustomerModal
        show={showNewCustomerModal}
        newCustomerData={newCustomerData}
        setNewCustomerData={setNewCustomerData}
        savingCustomer={savingCustomer}
        onClose={() => setShowNewCustomerModal(false)}
        onCreate={handleCreateCustomer}
      />

      <InvoiceConfirmModal
        show={showInvoiceConfirmModal}
        completedInvoice={completedInvoice}
        onPrint={handlePrintInvoice}
        onClose={() => {
          setShowInvoiceConfirmModal(false)
          setCompletedInvoice(null)
        }}
        formatCurrency={formatCurrency}
      />
    </div>
  )
}

export default POSPage
