import { useState, useEffect } from 'react'
import { Plus, Search, Edit2, Trash2, Filter, X, Loader2, Image, ArrowUp, ArrowDown, Package } from 'lucide-react'
import toast from 'react-hot-toast'
import Button from '@/shared/components/ui/Button'
import Input from '@/shared/components/ui/Input'
import MoneyInput from '@/shared/components/ui/MoneyInput'
import { productService } from '@/core/api/productService'
import { categoryService } from '@/core/api/categoryService'
import { inventoryService } from '@/core/api/inventoryService'
import { Product, Category } from '@/types'

interface ProductFormData {
  code: string
  barcode: string
  name: string
  description: string
  categoryId: number | ''
  costPrice: number | ''
  salePrice: number | ''
  unit: string
  taxRate: number
  isActive: boolean
  initialStock: number
  minStock: number
  maxStock: number
  imageUrl: string
}

const initialFormData: ProductFormData = {
  code: '',
  barcode: '',
  name: '',
  description: '',
  categoryId: '',
  costPrice: '',
  salePrice: '',
  unit: 'UND',
  taxRate: 0,
  isActive: true,
  initialStock: 0,
  minStock: 0,
  maxStock: 999999,
  imageUrl: ''
}

interface StockAdjustData {
  product: Product
  type: 'add' | 'remove'
}

const ProductsPage = () => {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [formData, setFormData] = useState<ProductFormData>(initialFormData)
  const [saving, setSaving] = useState(false)
  // Stock adjustment state
  const [stockAdjust, setStockAdjust] = useState<StockAdjustData | null>(null)
  const [adjustQuantity, setAdjustQuantity] = useState('')
  const [adjustReason, setAdjustReason] = useState('')
  const [adjusting, setAdjusting] = useState(false)
  const [filterCategory, setFilterCategory] = useState<number | ''>('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all')
  const [showFilters, setShowFilters] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)

  useEffect(() => {
    fetchData()
  }, [])

  const normalizeProduct = (p: any): Product => {
    const categoryId = p?.category?.id ?? p?.categoryId
    const categoryName = p?.category?.name ?? p?.categoryName
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
      categoryId: Number(categoryId ?? 0),
      category: categoryId ? ({ id: Number(categoryId), name: categoryName ?? '' } as any) : undefined,
      inventory: inventory as any,
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchTerm) {
        searchProducts()
      } else {
        fetchProducts()
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [searchTerm])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [productsRes, categoriesRes] = await Promise.all([
        productService.getAll(),
        categoryService.getActive()
      ])
      const list = (productsRes as any).content || productsRes
      setProducts((list as any[]).map(normalizeProduct))
      setCategories(categoriesRes as Category[])
    } catch (error) {
      console.error('Error loading data:', error)
      toast.error('Error al cargar productos')
    } finally {
      setLoading(false)
    }
  }

  const fetchProducts = async () => {
    try {
      const res = await productService.getAll()
      const list = (res as any).content || res
      setProducts((list as any[]).map(normalizeProduct))
    } catch (error) {
      console.error('Error loading products:', error)
    }
  }

  const searchProducts = async () => {
    try {
      const res = await productService.search(searchTerm)
      setProducts((res as any[]).map(normalizeProduct))
    } catch (error) {
      console.error('Error searching products:', error)
    }
  }

  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(value)

  const openNewProduct = () => {
    setSelectedProduct(null)
    setFormData(initialFormData)
    setShowModal(true)
  }

  const openEditProduct = (product: Product) => {
    setSelectedProduct(product)
    setFormData({
      code: product.code,
      barcode: product.barcode || '',
      name: product.name,
      description: product.description || '',
      categoryId: (product.category?.id ?? (product as any).categoryId) || '',
      costPrice: product.costPrice,
      salePrice: product.salePrice,
      unit: product.unit || 'UND',
      taxRate: product.taxRate || 0,
      isActive: product.isActive,
      initialStock: product.inventory?.quantity || 0,
      minStock: product.inventory?.minStock || 0,
      maxStock: product.inventory?.maxStock || 999999,
      imageUrl: product.imageUrl || ''
    })
    setShowModal(true)
  }

  const handleDelete = async (product: Product) => {
    if (!confirm(`¿Eliminar el producto "${product.name}"?`)) return
    
    try {
      await productService.delete(product.id)
      toast.success('Producto eliminado')
      fetchProducts()
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error al eliminar producto')
    }
  }

  const openStockAdjust = (product: Product, type: 'add' | 'remove') => {
    setStockAdjust({ product, type })
    setAdjustQuantity('')
    setAdjustReason('')
  }

  const handleStockAdjust = async () => {
    if (!stockAdjust || !adjustQuantity) return
    
    const qty = parseFloat(adjustQuantity)
    if (qty <= 0) {
      toast.error('La cantidad debe ser mayor a 0')
      return
    }

    if (stockAdjust.type === 'remove') {
      const currentStock = stockAdjust.product.inventory?.quantity || 0
      if (qty > currentStock) {
        toast.error('No hay suficiente stock disponible')
        return
      }
    }

    setAdjusting(true)
    try {
      if (stockAdjust.type === 'add') {
        await inventoryService.addStock(stockAdjust.product.id, qty, adjustReason || undefined)
        toast.success('Stock agregado correctamente')
      } else {
        await inventoryService.removeStock(stockAdjust.product.id, qty, adjustReason || undefined)
        toast.success('Stock reducido correctamente')
      }
      setStockAdjust(null)
      fetchProducts()
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error al ajustar stock')
    } finally {
      setAdjusting(false)
    }
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingImage(true)
    try {
      const res = await productService.uploadImage(file)
      const url = (res as any)?.url || (res as any)?.data?.url
      if (url) {
        setFormData(prev => ({ ...prev, imageUrl: url }))
        toast.success('Imagen subida correctamente')
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error al subir imagen')
    } finally {
      setUploadingImage(false)
      e.target.value = ''
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      // Validar que categoryId sea válido
      if (!formData.categoryId) {
        toast.error('Debe seleccionar una categoría')
        setSaving(false)
        return
      }

      const categoryIdNum = Number(formData.categoryId)
      
      if (selectedProduct) {
        // Para actualización, enviar solo los campos que el backend espera
        const updateData = {
          code: formData.code || undefined,
          barcode: formData.barcode || undefined,
          name: formData.name,
          description: formData.description || undefined,
          categoryId: categoryIdNum,
          imageUrl: formData.imageUrl || undefined,
          costPrice: Number(formData.costPrice),
          salePrice: Number(formData.salePrice),
          unit: formData.unit,
          taxRate: Number(formData.taxRate),
          isActive: formData.isActive
        }
        await productService.update(selectedProduct.id, updateData)
        
        // Actualizar límites de stock si cambiaron
        const currentMinStock = selectedProduct.inventory?.minStock || 0
        const currentMaxStock = selectedProduct.inventory?.maxStock || 999999
        if (formData.minStock !== currentMinStock || formData.maxStock !== currentMaxStock) {
          await inventoryService.updateLimits(
            selectedProduct.id,
            Number(formData.minStock),
            Number(formData.maxStock)
          )
        }
        toast.success('Producto actualizado')
      } else {
        // Para creación, incluir datos de stock inicial
        const createData = {
          code: formData.code || undefined,
          barcode: formData.barcode || undefined,
          name: formData.name,
          description: formData.description || undefined,
          categoryId: categoryIdNum,
          imageUrl: formData.imageUrl || undefined,
          costPrice: Number(formData.costPrice),
          salePrice: Number(formData.salePrice),
          unit: formData.unit,
          taxRate: Number(formData.taxRate),
          isActive: formData.isActive,
          initialStock: Number(formData.initialStock),
          minStock: Number(formData.minStock),
          maxStock: Number(formData.maxStock)
        }
        await productService.create(createData)
        toast.success('Producto creado')
      }
      
      setShowModal(false)
      fetchProducts()
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error al guardar producto')
    } finally {
      setSaving(false)
    }
  }

  const filteredProducts = products
    .filter((p) => {
      if (filterCategory && (p.category?.id ?? (p as any).categoryId) !== filterCategory) return false
      if (filterStatus === 'active' && !p.isActive) return false
      if (filterStatus === 'inactive' && p.isActive) return false
      return true
    })
    .sort((a, b) => {
      const catA = (a.category?.name || '').toLowerCase()
      const catB = (b.category?.name || '').toLowerCase()
      if (catA !== catB) return catA.localeCompare(catB)
      return a.name.localeCompare(b.name)
    })

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Productos</h1>
          <p className="text-gray-500">Gestiona tu catálogo de productos</p>
        </div>
        <Button variant="primary" onClick={openNewProduct}>
          <Plus size={20} />
          Nuevo Producto
        </Button>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Buscar por nombre o código..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input-field pl-12"
              />
            </div>
            <Button variant="secondary" onClick={() => setShowFilters(!showFilters)}>
              <Filter size={20} />
              Filtros {(filterCategory || filterStatus !== 'all') ? `(${[filterCategory ? 1 : 0, filterStatus !== 'all' ? 1 : 0].reduce((a, b) => a + b, 0)})` : ''}
            </Button>
          </div>
          {showFilters && (
            <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-gray-100">
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-500 whitespace-nowrap">Categoría:</label>
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value ? Number(e.target.value) : '')}
                  className="input-field py-1.5 px-2 text-sm w-[180px]"
                >
                  <option value="">Todas</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-500 whitespace-nowrap">Estado:</label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as 'all' | 'active' | 'inactive')}
                  className="input-field py-1.5 px-2 text-sm w-[140px]"
                >
                  <option value="all">Todos</option>
                  <option value="active">Activos</option>
                  <option value="inactive">Inactivos</option>
                </select>
              </div>
              {(filterCategory || filterStatus !== 'all') && (
                <button
                  onClick={() => { setFilterCategory(''); setFilterStatus('all') }}
                  className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1"
                >
                  <X size={14} /> Limpiar filtros
                </button>
              )}
              <span className="text-xs text-gray-400 ml-auto">
                {filteredProducts.length} producto(s)
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Products Table */}
      <div className="card overflow-hidden p-0">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
          </div>
        ) : products.length === 0 ? (
          <div className="flex items-center justify-center py-12 text-gray-400">
            No se encontraron productos
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="bg-primary-50">
                <th className="table-header">Código</th>
                <th className="table-header">Producto</th>
                <th className="table-header">Categoría</th>
                <th className="table-header text-right">Costo</th>
                <th className="table-header text-right">Precio Venta</th>
                <th className="table-header text-right">Margen</th>
                <th className="table-header text-center">Stock</th>
                <th className="table-header text-center">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((product) => {
                const margin = product.costPrice > 0 
                  ? ((product.salePrice - product.costPrice) / product.costPrice * 100).toFixed(1)
                  : '0'
                return (
                  <tr key={product.id} className="hover:bg-primary-50/50 transition-colors">
                    <td className="table-cell font-mono text-sm">{product.code}</td>
                    <td className="table-cell">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center text-lg">
                          {product.imageUrl ? (
                            <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover rounded-lg" />
                          ) : '📦'}
                        </div>
                        <span className="font-medium">{product.name}</span>
                      </div>
                    </td>
                    <td className="table-cell">
                      <span className="badge badge-info">{product.category?.name || '-'}</span>
                    </td>
                    <td className="table-cell text-right">{formatCurrency(product.costPrice)}</td>
                    <td className="table-cell text-right font-semibold text-primary-600">
                      {formatCurrency(product.salePrice)}
                    </td>
                    <td className="table-cell text-right text-green-600">{margin}%</td>
                    <td className="table-cell text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => openStockAdjust(product, 'remove')}
                          className="p-1 rounded hover:bg-red-100 text-red-500 transition-colors"
                          title="Salida de stock"
                        >
                          <ArrowDown size={14} />
                        </button>
                        <span className={`font-semibold min-w-[40px] ${
                          (product.inventory?.quantity || 0) === 0 ? 'text-red-600' :
                          (product.inventory?.quantity || 0) <= (product.inventory?.minStock || 10) ? 'text-amber-600' :
                          'text-green-600'
                        }`}>
                          {product.inventory?.quantity || 0}
                        </span>
                        <button
                          onClick={() => openStockAdjust(product, 'add')}
                          className="p-1 rounded hover:bg-green-100 text-green-500 transition-colors"
                          title="Entrada de stock"
                        >
                          <ArrowUp size={14} />
                        </button>
                      </div>
                    </td>
                    <td className="table-cell">
                      <div className="flex items-center justify-center gap-2">
                        <button 
                          onClick={() => openEditProduct(product)}
                          className="p-2 rounded-lg hover:bg-primary-100 text-gray-500 transition-colors"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button 
                          onClick={() => handleDelete(product)}
                          className="p-2 rounded-lg hover:bg-red-100 text-red-500 transition-colors"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Product Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="modal-content-lg p-6 animate-scale-in">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-800">
                {selectedProduct ? 'Editar Producto' : 'Nuevo Producto'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Código"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  placeholder="Auto (ej: PRD-0001)"
                />
                <Input
                  label="Código de Barras"
                  value={formData.barcode}
                  onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                />
              </div>

              <Input
                label="Nombre *"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Categoría *</label>
                <select
                  value={formData.categoryId}
                  onChange={(e) => setFormData({ ...formData, categoryId: Number(e.target.value) })}
                  className="input-field"
                  required
                >
                  <option value="">Seleccionar...</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <MoneyInput
                  label="Precio Costo"
                  value={formData.costPrice}
                  onChange={(val) => setFormData({ ...formData, costPrice: val })}
                  required
                />
                <MoneyInput
                  label="Precio Venta"
                  value={formData.salePrice}
                  onChange={(val) => setFormData({ ...formData, salePrice: val })}
                  required
                />
              </div>

              {/* Imagen del producto */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Imagen del Producto</label>
                <div className="flex items-center gap-4">
                  <div className="w-24 h-24 bg-primary-50 rounded-xl flex items-center justify-center overflow-hidden border-2 border-dashed border-primary-200 relative">
                    {formData.imageUrl ? (
                      <img src={formData.imageUrl} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <Image className="w-8 h-8 text-primary-300" />
                    )}
                    {uploadingImage && (
                      <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                        <Loader2 className="w-6 h-6 animate-spin text-primary-600" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 space-y-2">
                    <div>
                      <label className="inline-flex items-center gap-2 px-3 py-2 bg-primary-50 text-primary-700 rounded-lg cursor-pointer hover:bg-primary-100 transition-colors text-sm font-medium">
                        <Image size={16} />
                        Subir imagen
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/gif,image/webp"
                          className="hidden"
                          onChange={handleImageUpload}
                          disabled={uploadingImage}
                        />
                      </label>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400">o</span>
                      <Input
                        value={formData.imageUrl}
                        onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                        placeholder="URL de imagen..."
                      />
                    </div>
                    <p className="text-xs text-gray-400">JPG, PNG, GIF, WebP. Máx 5MB</p>
                  </div>
                </div>
              </div>

              {/* Stock - siempre visible */}
              <div className="border-t pt-4">
                <h4 className="font-medium text-gray-700 mb-3">
                  {selectedProduct ? 'Configuración de Stock' : 'Stock Inicial'}
                </h4>
                <div className="grid grid-cols-3 gap-4">
                  <Input
                    label={selectedProduct ? "Stock Actual" : "Stock Inicial"}
                    type="number"
                    min="0"
                    value={formData.initialStock}
                    onChange={(e) => setFormData({ ...formData, initialStock: Number(e.target.value) })}
                    disabled={!!selectedProduct}
                  />
                  <Input
                    label="Stock Mínimo"
                    type="number"
                    min="0"
                    value={formData.minStock}
                    onChange={(e) => setFormData({ ...formData, minStock: Number(e.target.value) })}
                  />
                  <Input
                    label="Stock Máximo"
                    type="number"
                    min="0"
                    value={formData.maxStock}
                    onChange={(e) => setFormData({ ...formData, maxStock: Number(e.target.value) })}
                  />
                </div>
                {selectedProduct && (
                  <p className="text-xs text-gray-500 mt-2">
                    💡 También puedes ajustar el stock desde la tabla de productos usando los botones +/-
                  </p>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="secondary" onClick={() => setShowModal(false)}>
                  Cancelar
                </Button>
                <Button type="submit" variant="primary" disabled={saving}>
                  {saving ? <><Loader2 className="w-5 h-5 animate-spin" /> Guardando...</> : 'Guardar'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Stock Adjustment Modal */}
      {stockAdjust && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md animate-scale-in">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-800">
                {stockAdjust.type === 'add' ? 'Entrada de Stock' : 'Salida de Stock'}
              </h3>
              <button onClick={() => setStockAdjust(null)} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>

            <div className="mb-4 p-3 bg-primary-50 rounded-xl flex items-center gap-3">
              <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center">
                {stockAdjust.product.imageUrl ? (
                  <img src={stockAdjust.product.imageUrl} alt="" className="w-full h-full object-cover rounded-lg" />
                ) : (
                  <Package className="w-6 h-6 text-primary-400" />
                )}
              </div>
              <div>
                <p className="font-medium text-gray-800">{stockAdjust.product.name}</p>
                <p className="text-sm text-gray-500">Stock actual: <span className="font-semibold">{stockAdjust.product.inventory?.quantity || 0}</span></p>
              </div>
            </div>

            <div className="space-y-4">
              <Input
                label="Cantidad *"
                type="number"
                min="0.01"
                step="0.01"
                value={adjustQuantity}
                onChange={(e) => setAdjustQuantity(e.target.value)}
                required
              />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Razón (opcional)</label>
                <textarea
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  className="input-field min-h-[80px]"
                  placeholder="Motivo del ajuste..."
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <Button variant="secondary" className="flex-1" onClick={() => setStockAdjust(null)}>
                Cancelar
              </Button>
              <Button 
                variant="primary" 
                className={`flex-1 ${stockAdjust.type === 'add' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}
                onClick={handleStockAdjust}
                disabled={!adjustQuantity || adjusting}
              >
                {adjusting ? <Loader2 className="w-5 h-5 animate-spin" /> : (stockAdjust.type === 'add' ? 'Agregar' : 'Retirar')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ProductsPage
