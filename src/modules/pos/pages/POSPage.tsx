import { useState, useEffect, useCallback } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Search, Plus, Minus, Trash2, CreditCard, Banknote, X, Loader2, User, UserPlus, Printer, Grid3X3, LayoutGrid, Grid2X2, UtensilsCrossed, ShoppingCart } from 'lucide-react'
import toast from 'react-hot-toast'
import { RootState } from '@/app/store'
import { addItem, removeItem, incrementQuantity, decrementQuantity, clearCart, setCustomer, selectCartTotal, updateItemNotes } from '../store/cartSlice'
import Button from '@/shared/components/ui/Button'
import { productService } from '@/core/api/productService'
import { categoryService } from '@/core/api/categoryService'
import { customerService } from '@/core/api/customerService'
import { invoiceService } from '@/core/api/invoiceService'
import { tableService } from '@/core/api/tableService'
import { promotionService, Promotion } from '@/core/api/promotionService'
import { Product, Category, Customer, RestaurantTable } from '@/types'
import { printInvoice } from '@/shared/utils/printInvoice'

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
    <div className="modal-overlay">
      <div className="modal-content p-6 animate-scale-in">
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
    <div className="modal-overlay">
      <div className="modal-content p-6 flex flex-col animate-scale-in">
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
    <div className="modal-overlay" style={{ zIndex: 60 }}>
      <div className="modal-content p-6 animate-scale-in">
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
  parentCategoryId: number | null
  onCategoryClick: (catId: number) => void
  onBackToParent: () => void
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
  parentCategoryId,
  onCategoryClick,
  onBackToParent,
  organizing,
  onStartOrganize,
  onAcceptOrganize,
  onCancelOrganize,
  onReorderCategory,
}: CategoriesPanelProps) => {
  const [draggingCategoryId, setDraggingCategoryId] = useState<number | null>(null)

  return (
    <div className="flex flex-col gap-2 mb-3 lg:mb-4 flex-shrink-0">
      <div className="flex items-center justify-between gap-2">
        <div className="hidden sm:flex gap-1 bg-white rounded-xl p-1 flex-shrink-0">
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

      <div className="bg-white rounded-2xl shadow-soft p-2 sm:p-3 h-auto max-h-[120px] sm:max-h-[220px] overflow-y-auto overflow-x-auto w-full border border-gray-100">
        <div className="flex flex-nowrap sm:flex-wrap gap-2 sm:gap-3 pb-1 sm:pb-3">
          {parentCategoryId !== null && (
            <button
              onClick={onBackToParent}
              className="inline-flex items-center gap-1 px-3 py-2.5 rounded-xl transition-all border bg-gray-100 text-gray-700 hover:bg-gray-200 border-gray-300"
              title="Volver"
            >
              <span className="text-xs">←</span>
              <span className="text-xs font-medium">Volver</span>
            </button>
          )}
          <button
            onClick={() => { setSelectedCategory(null); if (parentCategoryId === null) { /* already at root */ } }}
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
              onClick={() => onCategoryClick(cat.id)}
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
  paymentMethod: 'EFECTIVO' | 'TRANSFERENCIA'
  subtotal: number
  discountAmount: number
  total: number
  includeServiceCharge: boolean
  setIncludeServiceCharge: (value: boolean) => void
  includeDelivery: boolean
  setIncludeDelivery: (value: boolean) => void
  deliveryCharge: number
  setDeliveryCharge: (value: number) => void
  totalDiscountPercent: number
  setTotalDiscountPercent: (value: number) => void
  amountReceived: string
  setAmountReceived: (value: string) => void
  processing: boolean
  onClose: () => void
  onConfirm: () => Promise<void>
  onPrintPreBill: () => void
  formatCurrency: (value: number) => string
  items: Array<{ id: number; name: string; price: number; quantity: number; notes?: string }>
  customerName: string
}

const PaymentModal = ({
  show,
  paymentMethod,
  subtotal,
  discountAmount,
  total,
  includeServiceCharge,
  setIncludeServiceCharge,
  includeDelivery,
  setIncludeDelivery,
  deliveryCharge,
  setDeliveryCharge,
  totalDiscountPercent,
  setTotalDiscountPercent,
  amountReceived,
  setAmountReceived,
  processing,
  onClose,
  onConfirm,
  onPrintPreBill,
  formatCurrency,
  items,
  customerName,
}: PaymentModalProps) => {
  if (!show) return null

  const serviceChargeAmount = includeServiceCharge ? total * 0.10 : 0
  const deliveryAmount = includeDelivery ? deliveryCharge : 0
  const totalDiscountAmount = (total * totalDiscountPercent) / 100
  const finalTotal = total + serviceChargeAmount + deliveryAmount - totalDiscountAmount

  const recalcAmount = (svc: boolean, dlv: boolean, dlvCharge: number, discPercent: number) => {
    const svcAmt = svc ? total * 0.10 : 0
    const dlvAmt = dlv ? dlvCharge : 0
    const discAmt = (total * discPercent) / 100
    setAmountReceived((total + svcAmt + dlvAmt - discAmt).toFixed(0))
  }

  return (
    <div className="modal-overlay">
      <div className="modal-content p-6 animate-scale-in">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-gray-800">
            Pago con {paymentMethod === 'EFECTIVO' ? 'Efectivo' : 'Transferencia'}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            disabled={processing}
          >
            <X size={24} />
          </button>
        </div>

        <div className="space-y-3 mb-6">
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

          {/* Opciones adicionales */}
          <div className="space-y-2 py-2 border-t border-b border-gray-100">
            {/* Service charge toggle */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeServiceCharge}
                  onChange={(e) => {
                    setIncludeServiceCharge(e.target.checked)
                    recalcAmount(e.target.checked, includeDelivery, deliveryCharge, totalDiscountPercent)
                  }}
                  className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm font-medium text-gray-700">Servicio (10%)</span>
              </label>
              <span className={`text-sm font-medium ${includeServiceCharge ? 'text-primary-600' : 'text-gray-400'}`}>
                {includeServiceCharge ? formatCurrency(serviceChargeAmount) : '$0'}
              </span>
            </div>

            {/* Delivery charge toggle with editable amount */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeDelivery}
                    onChange={(e) => {
                      setIncludeDelivery(e.target.checked)
                      recalcAmount(includeServiceCharge, e.target.checked, deliveryCharge, totalDiscountPercent)
                    }}
                    className="w-4 h-4 rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                  />
                  <span className="text-sm font-medium text-gray-700">Domicilio</span>
                </label>
                <span className={`text-sm font-medium ${includeDelivery ? 'text-amber-600' : 'text-gray-400'}`}>
                  {includeDelivery ? formatCurrency(deliveryAmount) : '$0'}
                </span>
              </div>
              {includeDelivery && (
                <div className="ml-6">
                  <input
                    type="number"
                    value={deliveryCharge}
                    onChange={(e) => {
                      const val = Math.max(0, parseInt(e.target.value) || 0)
                      setDeliveryCharge(val)
                      recalcAmount(includeServiceCharge, includeDelivery, val, totalDiscountPercent)
                    }}
                    className="w-full text-sm px-2 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    min="0"
                    step="500"
                    placeholder="Valor domicilio"
                  />
                </div>
              )}
            </div>

            {/* Total discount percent */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Descuento adicional (%)</span>
                <span className={`text-sm font-medium ${totalDiscountPercent > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                  {totalDiscountPercent > 0 ? `-${formatCurrency(totalDiscountAmount)}` : '$0'}
                </span>
              </div>
              <div>
                <input
                  type="number"
                  value={totalDiscountPercent}
                  onChange={(e) => {
                    const val = Math.min(100, Math.max(0, parseFloat(e.target.value) || 0))
                    setTotalDiscountPercent(val)
                    recalcAmount(includeServiceCharge, includeDelivery, deliveryCharge, val)
                  }}
                  className="w-full text-sm px-2 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  min="0"
                  max="100"
                  step="5"
                  placeholder="% descuento"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-between text-lg font-bold pt-1">
            <span>Total a pagar</span>
            <span className="text-primary-600">{formatCurrency(finalTotal)}</span>
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
                  min={finalTotal}
                />
              </div>
              {parseFloat(amountReceived) >= finalTotal && (
                <div className="flex justify-between text-lg font-bold text-green-600">
                  <span>Cambio</span>
                  <span>{formatCurrency(parseFloat(amountReceived) - finalTotal)}</span>
                </div>
              )}
            </>
          ) : (
            <div className="p-4 bg-primary-50 rounded-xl text-center">
              <CreditCard className="w-12 h-12 mx-auto text-primary-600 mb-2" />
              <p className="text-sm text-gray-600">El pago se procesará por transferencia</p>
              <p className="text-xs text-gray-400 mt-1">El monto exacto será cobrado al cliente</p>
            </div>
          )}
        </div>

        <div className="space-y-3">
          <Button
            variant="primary"
            className="w-full"
            disabled={processing || (paymentMethod === 'EFECTIVO' && parseFloat(amountReceived) < finalTotal)}
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
          <button
            type="button"
            onClick={onPrintPreBill}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-600 bg-gray-50 border border-gray-200 rounded-xl hover:bg-gray-100 transition-colors"
          >
            <Printer size={16} />
            Imprimir Pre-cuenta
          </button>
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
  const [parentCategoryId, setParentCategoryId] = useState<number | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [showCustomerModal, setShowCustomerModal] = useState(false)
  const [customerSearch, setCustomerSearch] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<'EFECTIVO' | 'TRANSFERENCIA'>('EFECTIVO')
  const [amountReceived, setAmountReceived] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [cardSize, setCardSize] = useState<CardSize>('medium')
  const [showNewCustomerModal, setShowNewCustomerModal] = useState(false)
  const [newCustomerData, setNewCustomerData] = useState({ fullName: '', documentType: 'CC', documentNumber: '', phone: '' })
  const [savingCustomer, setSavingCustomer] = useState(false)
  const [completedInvoice, setCompletedInvoice] = useState<any>(null)
  const [showInvoiceConfirmModal, setShowInvoiceConfirmModal] = useState(false)
  const [includeServiceCharge, setIncludeServiceCharge] = useState(false)
  const [includeDelivery, setIncludeDelivery] = useState(false)
  const [deliveryCharge, setDeliveryCharge] = useState(3000)
  const [totalDiscountPercent, setTotalDiscountPercent] = useState(0)
  const [activePromotion, setActivePromotion] = useState<Promotion | null>(null)

  // Table selection for POS
  const [tables, setTables] = useState<RestaurantTable[]>([])
  const [selectedTableId, setSelectedTableId] = useState<number | null>(null)
  const [showTableSelector, setShowTableSelector] = useState(false)
  const [showMobileCart, setShowMobileCart] = useState(false)

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
    fetchActivePromotion()
  }, [])

  const fetchActivePromotion = async () => {
    try {
      const res = await promotionService.getToday()
      if (res) {
        setActivePromotion(res as Promotion)
        // Sugerir aplicar promoción automáticamente si no hay descuento manual
        if (totalDiscountPercent === 0) {
          setTotalDiscountPercent((res as Promotion).discountPercent)
        }
      }
    } catch {
      // No promotion active today
    }
  }

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

  // Get all child category IDs for a parent
  const getChildCategoryIds = (parentId: number): number[] => {
    const children = categories.filter(c => c.parentId === parentId)
    return children.map(c => c.id)
  }

  const filteredProducts = products.filter(p => {
    if (selectedCategory !== null) {
      // If a specific category is selected, show its products + children's products
      const childIds = getChildCategoryIds(selectedCategory)
      const validIds = [selectedCategory, ...childIds]
      if (!validIds.includes(p.categoryId)) return false
    } else if (parentCategoryId !== null) {
      // Browsing inside a parent: show products of parent + all children
      const childIds = getChildCategoryIds(parentCategoryId)
      const validIds = [parentCategoryId, ...childIds]
      if (!validIds.includes(p.categoryId)) return false
    }
    return p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.code.includes(searchTerm)
  })

  const categoriesToShow: Category[] = (() => {
    let base: Category[]
    if (parentCategoryId !== null) {
      // Show children of the selected parent
      base = categories.filter(c => c.parentId === parentCategoryId)
    } else {
      // Show root categories (no parent) or all if none have parentId
      const hasHierarchy = categories.some(c => c.parentId)
      base = hasHierarchy ? categories.filter(c => !c.parentId) : categories
    }
    if (!isOrganizingCategories || !draftCategoryOrder) return base
    const byId = new Map(base.map(c => [c.id, c]))
    const ordered: Category[] = []
    for (const id of draftCategoryOrder) {
      const cat = byId.get(id)
      if (cat) ordered.push(cat)
    }
    return ordered
  })()

  const handleCategoryClick = (catId: number) => {
    const children = categories.filter(c => c.parentId === catId)
    if (children.length > 0 && parentCategoryId !== catId) {
      // Navigate into this parent category
      setParentCategoryId(catId)
      setSelectedCategory(null)
    } else {
      // Leaf category or already inside parent - toggle selection
      setSelectedCategory(selectedCategory === catId ? null : catId)
    }
  }

  const handleBackToParent = () => {
    setParentCategoryId(null)
    setSelectedCategory(null)
  }

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
    small: 'grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6',
    medium: 'grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5',
    large: 'grid-cols-1 xs:grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
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

  // Send cart items to a table WITHOUT paying (save order and continue)
  const handleSendToTable = async () => {
    if (!selectedTableId || !selectedTable || items.length === 0) return
    setProcessing(true)
    try {
      const tableItems = {
        items: items.map(item => ({
          productId: item.id,
          quantity: item.quantity,
          unitPrice: item.price,
          notes: item.notes || undefined,
        }))
      }

      if (selectedTable.status === 'DISPONIBLE') {
        await tableService.openTable(selectedTableId, {
          guestCount: 1,
          customerId: customerId,
        })
      }

      await tableService.addItems(selectedTableId, tableItems)

      toast.success(`Pedido enviado a Mesa #${selectedTable.tableNumber}`)
      dispatch(clearCart())
      setSelectedTableId(null)
      fetchData()
      fetchTables()
    } catch (error: any) {
      console.error('Error sending to table:', error)
      toast.error(error.response?.data?.message || 'Error al enviar pedido a mesa')
    } finally {
      setProcessing(false)
    }
  }

  const handleConfirmSale = async () => {
    setProcessing(true)
    try {
      if (selectedTableId && selectedTable && (selectedTable.status === 'DISPONIBLE' || selectedTable.status === 'OCUPADA')) {
        // Table flow: open if needed, add items, then pay
        if (selectedTable.status === 'DISPONIBLE') {
          await tableService.openTable(selectedTableId, {
            guestCount: 1,
            customerId: customerId,
          })
        }

        await tableService.addItems(selectedTableId, {
          items: items.map(item => ({
            productId: item.id,
            quantity: item.quantity,
            unitPrice: item.price,
            notes: item.notes || undefined,
          }))
        })

        const result = await tableService.payTable(selectedTableId, {
          paymentMethod: paymentMethod,
          amountReceived: parseFloat(amountReceived),
          discountPercent: (discountType === 'percent' ? discount : 0) + totalDiscountPercent,
          serviceChargePercent: includeServiceCharge ? 10 : 0,
          deliveryChargeAmount: includeDelivery ? deliveryCharge : 0,
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
          discountPercent: (discountType === 'percent' ? discount : 0) + totalDiscountPercent,
          serviceChargePercent: includeServiceCharge ? 10 : 0,
          deliveryChargeAmount: includeDelivery ? deliveryCharge : 0,
          amountReceived: parseFloat(amountReceived),
          notes: notes,
          details: items.map(item => ({
            productId: item.id,
            quantity: item.quantity,
            unitPrice: item.price,
            discountAmount: 0,
            notes: item.notes || undefined
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
    printInvoice(completedInvoice)
  }

  const handlePrintPreBill = () => {
    const serviceChargeAmount = includeServiceCharge ? total * 0.10 : 0
    const deliveryAmount = includeDelivery ? deliveryCharge : 0
    const totalDiscountAmount = (total * totalDiscountPercent) / 100
    const finalTotal = total + serviceChargeAmount + deliveryAmount - totalDiscountAmount
    const combinedDiscountPercent = (discountType === 'percent' ? discount : 0) + totalDiscountPercent
    
    printInvoice({
      invoiceNumber: 'PRE-CUENTA',
      createdAt: new Date().toISOString(),
      customerName: customerName,
      details: items.map(item => ({
        quantity: item.quantity,
        productName: item.name,
        subtotal: item.price * item.quantity,
        notes: item.notes,
      })),
      subtotal,
      discountAmount: discountAmount + totalDiscountAmount,
      discountPercent: combinedDiscountPercent > 0 ? combinedDiscountPercent : undefined,
      serviceChargeAmount: serviceChargeAmount,
      serviceChargePercent: includeServiceCharge ? 10 : 0,
      deliveryChargeAmount: deliveryAmount,
      total: finalTotal,
    }, { isPreBill: true })
  }

  return (
    <div className="flex flex-col lg:flex-row lg:h-[calc(100dvh-7rem)] gap-3 lg:gap-6 animate-fade-in lg:overflow-hidden">
      {/* Left Panel - Products */}
      <div className="flex-1 min-w-0 flex flex-col lg:overflow-hidden">
        {/* Search */}
        <div className="relative mb-3 max-w-full lg:max-w-md">
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
          parentCategoryId={parentCategoryId}
          onCategoryClick={handleCategoryClick}
          onBackToParent={handleBackToParent}
          organizing={isOrganizingCategories}
          onStartOrganize={handleStartOrganizeCategories}
          onAcceptOrganize={handleAcceptOrganizeCategories}
          onCancelOrganize={handleCancelOrganizeCategories}
          onReorderCategory={handleReorderCategoryDraft}
        />

        {/* Products Grid */}
        <div className="lg:flex-1 lg:overflow-y-auto pb-16 lg:pb-0">
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

      {/* Mobile Cart FAB */}
      <button
        onClick={() => setShowMobileCart(true)}
        className="lg:hidden fixed bottom-4 right-4 z-40 w-14 h-14 bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-full shadow-lg flex items-center justify-center active:scale-95 transition-transform"
      >
        <ShoppingCart size={22} />
        {itemCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[22px] h-[22px] bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center px-1">
            {itemCount}
          </span>
        )}
      </button>

      {/* Mobile Cart Backdrop */}
      {showMobileCart && (
        <div className="lg:hidden fixed inset-0 z-40 bg-black/50" onClick={() => setShowMobileCart(false)} />
      )}

      {/* Right Panel - Cart */}
      <div className={`
        ${showMobileCart ? 'translate-x-0' : 'translate-x-full'}
        lg:translate-x-0
        fixed right-0 top-0 h-full w-full sm:w-96 z-50
        lg:relative lg:z-auto lg:h-auto
        lg:w-96 flex-shrink-0 bg-white lg:rounded-2xl shadow-soft flex flex-col min-w-0
        transition-transform duration-300
      `}>
        {/* Cart Header */}
        <div className="p-4 border-b border-primary-100">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <ShoppingCart size={20} />
              Carrito
            </h2>
            <button
              onClick={() => setShowCustomerModal(true)}
              className="flex items-center gap-2 px-3 py-1.5 text-sm bg-primary-50 text-primary-600 rounded-lg hover:bg-primary-100 transition-colors"
            >
              <User size={16} />
              <span className="max-w-[120px] truncate">{customerName}</span>
            </button>
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
                    <input
                      type="text"
                      placeholder="Ej: sin cebolla, salsa extra..."
                      value={item.notes || ''}
                      onChange={(e) => dispatch(updateItemNotes({ id: item.id, notes: e.target.value }))}
                      className="mt-1 w-full text-xs px-2 py-1 border border-gray-200 rounded-lg focus:border-primary-400 focus:ring-1 focus:ring-primary-200 placeholder-gray-300"
                    />
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
                setPaymentMethod('TRANSFERENCIA')
                setAmountReceived(total.toString())
                setShowPaymentModal(true)
              }}
            >
              <CreditCard size={20} />
              Transferencia
            </Button>
          </div>
          {items.length > 0 && selectedTableId && selectedTable && (
            <button
              onClick={handleSendToTable}
              disabled={processing}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-amber-50 text-amber-700 border border-amber-200 rounded-xl hover:bg-amber-100 transition-colors font-medium disabled:opacity-50"
            >
              {processing ? <Loader2 className="w-5 h-5 animate-spin" /> : <UtensilsCrossed size={20} />}
              Enviar a Mesa #{selectedTable.tableNumber}
            </button>
          )}
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
        includeServiceCharge={includeServiceCharge}
        setIncludeServiceCharge={setIncludeServiceCharge}
        includeDelivery={includeDelivery}
        setIncludeDelivery={setIncludeDelivery}
        deliveryCharge={deliveryCharge}
        setDeliveryCharge={setDeliveryCharge}
        totalDiscountPercent={totalDiscountPercent}
        setTotalDiscountPercent={setTotalDiscountPercent}
        amountReceived={amountReceived}
        setAmountReceived={setAmountReceived}
        processing={processing}
        onClose={() => setShowPaymentModal(false)}
        onConfirm={handleConfirmSale}
        onPrintPreBill={handlePrintPreBill}
        formatCurrency={formatCurrency}
        items={items}
        customerName={customerName}
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
