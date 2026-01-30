import { useState, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Search, Plus, Minus, Trash2, CreditCard, Banknote, X, Loader2, User } from 'lucide-react'
import toast from 'react-hot-toast'
import { RootState } from '@/app/store'
import { addItem, removeItem, incrementQuantity, decrementQuantity, clearCart, setCustomer, selectCartTotal } from '../store/cartSlice'
import Button from '@/shared/components/ui/Button'
import { productService } from '@/core/api/productService'
import { categoryService } from '@/core/api/categoryService'
import { customerService } from '@/core/api/customerService'
import { invoiceService } from '@/core/api/invoiceService'
import { Product, Category, Customer } from '@/types'

interface ProductWithCategory extends Product {
  categoryId: number
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

  useEffect(() => {
    fetchData()
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
      setCustomers(((customersRes as any).content || customersRes) as Customer[])
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

  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(value)

  return (
    <div className="h-[calc(100vh-7rem)] flex gap-6 animate-fade-in">
      {/* Left Panel - Products */}
      <div className="flex-1 flex flex-col">
        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Buscar por nombre o código..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input-field pl-12"
          />
        </div>

        {/* Categories */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl whitespace-nowrap transition-all ${
              selectedCategory === null
                ? 'bg-gradient-to-r from-primary-600 to-primary-700 text-white shadow-soft'
                : 'bg-white text-gray-600 hover:bg-primary-50'
            }`}
          >
            <span>🏷️</span>
            <span className="text-sm font-medium">Todos</span>
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl whitespace-nowrap transition-all ${
                selectedCategory === cat.id
                  ? 'bg-gradient-to-r from-primary-600 to-primary-700 text-white shadow-soft'
                  : 'bg-white text-gray-600 hover:bg-primary-50'
              }`}
            >
              <span>{cat.imageUrl || '📦'}</span>
              <span className="text-sm font-medium">{cat.name}</span>
            </button>
          ))}
        </div>

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
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
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
                    className={`card hover:scale-[1.02] border-2 p-4 text-left transition-all ${
                      stock === 0 
                        ? 'opacity-50 cursor-not-allowed border-gray-200' 
                        : 'hover:border-primary-300 border-transparent'
                    }`}
                  >
                    <div className="w-full h-20 bg-primary-50 rounded-xl mb-3 flex items-center justify-center text-3xl">
                      {product.imageUrl ? (
                        <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover rounded-xl" />
                      ) : '📦'}
                    </div>
                    <p className="text-xs text-gray-400 mb-1">{product.code}</p>
                    <p className="font-medium text-gray-800 text-sm line-clamp-2 mb-2">{product.name}</p>
                    <div className="flex items-center justify-between">
                      <p className="text-primary-600 font-bold">{formatCurrency(product.salePrice)}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        stock === 0 ? 'bg-red-100 text-red-600' :
                        stock <= (product.inventory?.minStock || 5) ? 'bg-amber-100 text-amber-600' :
                        'bg-green-100 text-green-600'
                      }`}>
                        {stock === 0 ? 'Agotado' : `${stock} uds`}
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Right Panel - Cart */}
      <div className="w-96 bg-white rounded-2xl shadow-soft flex flex-col">
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
            <span className="text-xs text-primary-500">(cambiar)</span>
          </button>
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

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md animate-scale-in">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-800">
                Pago con {paymentMethod === 'EFECTIVO' ? 'Efectivo' : 'Tarjeta'}
              </h3>
              <button 
                onClick={() => setShowPaymentModal(false)} 
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
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Monto recibido
                    </label>
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
                onClick={async () => {
                  setProcessing(true)
                  try {
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
                    toast.success(`Venta ${(result as any).invoiceNumber} completada`)
                    dispatch(clearCart())
                    setShowPaymentModal(false)
                    fetchData() // Refresh products to update stock
                  } catch (error: any) {
                    console.error('Error processing sale:', error)
                    toast.error(error.response?.data?.message || 'Error al procesar la venta')
                  } finally {
                    setProcessing(false)
                  }
                }}
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
              <Button 
                variant="secondary" 
                className="w-full" 
                onClick={() => setShowPaymentModal(false)}
                disabled={processing}
              >
                Cancelar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Customer Selection Modal */}
      {showCustomerModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md max-h-[80vh] flex flex-col animate-scale-in">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-800">Seleccionar Cliente</h3>
              <button 
                onClick={() => {
                  setShowCustomerModal(false)
                  setCustomerSearch('')
                }} 
                className="text-gray-400 hover:text-gray-600"
              >
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
                onClick={() => selectCustomer(null)}
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
                  onClick={() => selectCustomer(customer)}
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
                <div className="text-center py-8 text-gray-400">
                  No se encontraron clientes
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default POSPage
