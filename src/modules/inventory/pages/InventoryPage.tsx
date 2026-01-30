import { useState, useEffect } from 'react'
import { Search, AlertTriangle, Package, ArrowUp, ArrowDown, Filter, X, Loader2, Edit2, Image } from 'lucide-react'
import toast from 'react-hot-toast'
import Button from '@/shared/components/ui/Button'
import Input from '@/shared/components/ui/Input'
import { inventoryService } from '@/core/api/inventoryService'
import { productService } from '@/core/api/productService'
import { categoryService } from '@/core/api/categoryService'
import { Inventory, Category } from '@/types'

interface AdjustModalData {
  inventory: Inventory
  type: 'add' | 'remove'
}

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
  minStock: 0,
  maxStock: 999999,
  imageUrl: ''
}

const InventoryPage = () => {
  const [inventory, setInventory] = useState<Inventory[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [adjustModal, setAdjustModal] = useState<AdjustModalData | null>(null)
  const [adjustQuantity, setAdjustQuantity] = useState('')
  const [adjustReason, setAdjustReason] = useState('')
  const [processing, setProcessing] = useState(false)
  const [categories, setCategories] = useState<Category[]>([])
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingItem, setEditingItem] = useState<Inventory | null>(null)
  const [formData, setFormData] = useState<ProductFormData>(initialFormData)
  const [saving, setSaving] = useState(false)

  const getProductId = (item: any): number | undefined => item?.product?.id ?? item?.productId
  const getProductCode = (item: any): string => item?.product?.code ?? item?.productCode ?? ''
  const getProductName = (item: any): string => item?.product?.name ?? item?.productName ?? ''

  useEffect(() => {
    fetchInventory()
    fetchCategories()
  }, [])

  const fetchCategories = async () => {
    try {
      const res = await categoryService.getActive()
      setCategories(res as Category[])
    } catch (error) {
      console.error('Error loading categories:', error)
    }
  }

  const fetchInventory = async () => {
    try {
      setLoading(true)
      const res = await inventoryService.getAll()
      // La respuesta puede venir como array directo o con .data
      const data = Array.isArray(res) ? res : (res as any).data || []
      // Normalizar para que el UI soporte tanto Inventory con product anidado
      // como InventoryResponse (productId/productCode/productName)
      const normalized = (data as any[]).map((item) => {
        if (item?.product) return item
        const productId = item?.productId
        if (!productId) return item
        return {
          ...item,
          product: {
            id: productId,
            code: item?.productCode,
            name: item?.productName,
          },
        }
      })
      setInventory(normalized)
    } catch (error) {
      console.error('Error loading inventory:', error)
      toast.error('Error al cargar inventario')
    } finally {
      setLoading(false)
    }
  }

  const lowStock = inventory.filter(i => i.quantity <= i.minStock && i.quantity > 0).length
  const outOfStock = inventory.filter(i => i.quantity === 0).length

  const getStockStatus = (item: Inventory) => {
    if (item.quantity === 0) return { color: 'bg-red-500', text: 'Sin stock' }
    if (item.quantity <= item.minStock) return { color: 'bg-amber-500', text: 'Stock bajo' }
    return { color: 'bg-green-500', text: 'Normal' }
  }

  const filteredInventory = inventory.filter((i: any) => {
    const term = searchTerm.toLowerCase()
    return getProductCode(i).toLowerCase().includes(term) || getProductName(i).toLowerCase().includes(term)
  })

  const openAdjustModal = (inv: Inventory, type: 'add' | 'remove') => {
    setAdjustModal({ inventory: inv, type })
    setAdjustQuantity('')
    setAdjustReason('')
  }

  const handleAdjust = async () => {
    if (!adjustModal || !adjustQuantity) return
    
    const qty = parseFloat(adjustQuantity)
    if (qty <= 0) {
      toast.error('La cantidad debe ser mayor a 0')
      return
    }

    setProcessing(true)
    try {
      const productId = getProductId(adjustModal.inventory)
      if (!productId) {
        toast.error('Producto no encontrado')
        setProcessing(false)
        return
      }
      
      if (adjustModal.type === 'add') {
        await inventoryService.addStock(productId, qty, adjustReason || undefined)
        toast.success('Stock agregado correctamente')
      } else {
        if (qty > adjustModal.inventory.quantity) {
          toast.error('No hay suficiente stock disponible')
          setProcessing(false)
          return
        }
        await inventoryService.removeStock(productId, qty, adjustReason || undefined)
        toast.success('Stock reducido correctamente')
      }
      setAdjustModal(null)
      fetchInventory()
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error al ajustar inventario')
    } finally {
      setProcessing(false)
    }
  }

  const openEditModal = async (item: Inventory) => {
    const productId = getProductId(item)
    if (!productId) {
      toast.error('Producto no encontrado')
      return
    }
    
    try {
      const productRes = await productService.getById(productId)
      const product = productRes as any
      
      setEditingItem(item)
      setFormData({
        code: product.code || '',
        barcode: product.barcode || '',
        name: product.name || '',
        description: product.description || '',
        categoryId: product.categoryId || product.category?.id || '',
        costPrice: product.costPrice || 0,
        salePrice: product.salePrice || 0,
        unit: product.unit || 'UND',
        taxRate: product.taxRate || 0,
        isActive: product.isActive ?? true,
        minStock: item.minStock || 0,
        maxStock: item.maxStock || 999999,
        imageUrl: product.imageUrl || ''
      })
      setShowEditModal(true)
    } catch (error) {
      console.error('Error loading product:', error)
      toast.error('Error al cargar datos del producto')
    }
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingItem) return
    
    const productId = getProductId(editingItem)
    if (!productId) {
      toast.error('Producto no encontrado')
      return
    }

    setSaving(true)
    try {
      if (!formData.categoryId) {
        toast.error('Debe seleccionar una categoría')
        setSaving(false)
        return
      }

      const updateData = {
        code: formData.code,
        barcode: formData.barcode || undefined,
        name: formData.name,
        description: formData.description || undefined,
        categoryId: Number(formData.categoryId),
        imageUrl: formData.imageUrl || undefined,
        costPrice: Number(formData.costPrice),
        salePrice: Number(formData.salePrice),
        unit: formData.unit,
        taxRate: Number(formData.taxRate),
        isActive: formData.isActive
      }
      
      await productService.update(productId, updateData)
      
      // Actualizar límites de stock
      await inventoryService.updateLimits(
        productId,
        Number(formData.minStock),
        Number(formData.maxStock)
      )
      
      toast.success('Producto actualizado correctamente')
      setShowEditModal(false)
      setEditingItem(null)
      fetchInventory()
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error al actualizar producto')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Inventario</h1>
          <p className="text-gray-500">Control y gestión de stock</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card flex items-center gap-4">
          <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center">
            <Package className="w-6 h-6 text-primary-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-800">{inventory.length}</p>
            <p className="text-gray-500 text-sm">Productos totales</p>
          </div>
        </div>
        <div className="card flex items-center gap-4 border-l-4 border-amber-500">
          <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-amber-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-amber-600">{lowStock}</p>
            <p className="text-gray-500 text-sm">Stock bajo</p>
          </div>
        </div>
        <div className="card flex items-center gap-4 border-l-4 border-red-500">
          <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-red-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-red-600">{outOfStock}</p>
            <p className="text-gray-500 text-sm">Sin stock</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Buscar por código o nombre..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-field pl-12"
            />
          </div>
          <Button variant="secondary">
            <Filter size={20} />
            Filtrar
          </Button>
        </div>
      </div>

      {/* Inventory Table */}
      <div className="card overflow-hidden p-0">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
          </div>
        ) : filteredInventory.length === 0 ? (
          <div className="flex items-center justify-center py-12 text-gray-400">
            No se encontraron productos
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="bg-primary-50">
                <th className="table-header">Código</th>
                <th className="table-header">Producto</th>
                <th className="table-header text-center">Stock Actual</th>
                <th className="table-header text-center">Mínimo</th>
                <th className="table-header text-center">Máximo</th>
                <th className="table-header">Ubicación</th>
                <th className="table-header text-center">Estado</th>
                <th className="table-header text-center">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredInventory.map((item) => {
                const status = getStockStatus(item)
                return (
                  <tr key={item.id} className="hover:bg-primary-50/50 transition-colors">
                    <td className="table-cell font-mono text-sm">{getProductCode(item)}</td>
                    <td className="table-cell font-medium">{getProductName(item)}</td>
                    <td className="table-cell text-center">
                      <span className={`font-bold ${item.quantity <= item.minStock ? 'text-red-600' : 'text-gray-800'}`}>
                        {item.quantity}
                      </span>
                    </td>
                    <td className="table-cell text-center text-gray-500">{item.minStock}</td>
                    <td className="table-cell text-center text-gray-500">{item.maxStock}</td>
                    <td className="table-cell">{item.location || '-'}</td>
                    <td className="table-cell text-center">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs text-white ${status.color}`}>
                        {status.text}
                      </span>
                    </td>
                    <td className="table-cell">
                      <div className="flex items-center justify-center gap-2">
                        <button 
                          onClick={() => openEditModal(item)}
                          className="p-2 rounded-lg hover:bg-primary-100 text-primary-600 transition-colors" 
                          title="Editar producto"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button 
                          onClick={() => openAdjustModal(item, 'add')}
                          className="p-2 rounded-lg hover:bg-green-100 text-green-600 transition-colors" 
                          title="Entrada"
                        >
                          <ArrowUp size={18} />
                        </button>
                        <button 
                          onClick={() => openAdjustModal(item, 'remove')}
                          className="p-2 rounded-lg hover:bg-red-100 text-red-600 transition-colors" 
                          title="Salida"
                        >
                          <ArrowDown size={18} />
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

      {/* Edit Product Modal */}
      {showEditModal && editingItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl p-6 w-full max-w-2xl animate-scale-in my-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-800">Editar Producto</h3>
              <button onClick={() => { setShowEditModal(false); setEditingItem(null) }} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Código *"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  required
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
                <Input
                  label="Precio Costo *"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.costPrice}
                  onChange={(e) => setFormData({ ...formData, costPrice: e.target.value ? Number(e.target.value) : '' })}
                  required
                />
                <Input
                  label="Precio Venta *"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.salePrice}
                  onChange={(e) => setFormData({ ...formData, salePrice: e.target.value ? Number(e.target.value) : '' })}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Imagen del Producto</label>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-primary-50 rounded-xl flex items-center justify-center overflow-hidden border-2 border-dashed border-primary-200">
                    {formData.imageUrl ? (
                      <img src={formData.imageUrl} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <Image className="w-6 h-6 text-primary-300" />
                    )}
                  </div>
                  <div className="flex-1">
                    <Input
                      label=""
                      value={formData.imageUrl}
                      onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                      placeholder="https://ejemplo.com/imagen.jpg"
                    />
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-medium text-gray-700 mb-3">Configuración de Stock</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Stock Actual</label>
                    <input
                      type="number"
                      value={editingItem.quantity}
                      className="input-field bg-gray-100"
                      disabled
                    />
                  </div>
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
                <p className="text-xs text-amber-600 mt-2">
                  Para modificar el stock actual, use los botones de Entrada/Salida
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="secondary" onClick={() => { setShowEditModal(false); setEditingItem(null) }}>
                  Cancelar
                </Button>
                <Button type="submit" variant="primary" disabled={saving}>
                  {saving ? <><Loader2 className="w-5 h-5 animate-spin" /> Guardando...</> : 'Guardar Cambios'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Adjust Modal */}
      {adjustModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md animate-scale-in">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-800">
                {adjustModal.type === 'add' ? 'Entrada de Stock' : 'Salida de Stock'}
              </h3>
              <button onClick={() => setAdjustModal(null)} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>

            <div className="mb-4 p-3 bg-primary-50 rounded-lg">
              <p className="font-medium">{getProductName(adjustModal.inventory)}</p>
              <p className="text-sm text-gray-500">Stock actual: {adjustModal.inventory.quantity}</p>
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
              <Button variant="secondary" className="flex-1" onClick={() => setAdjustModal(null)}>
                Cancelar
              </Button>
              <Button 
                variant="primary" 
                className={`flex-1 ${adjustModal.type === 'add' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}
                onClick={handleAdjust}
                disabled={!adjustQuantity || processing}
              >
                {processing ? <Loader2 className="w-5 h-5 animate-spin" /> : (adjustModal.type === 'add' ? 'Agregar' : 'Retirar')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default InventoryPage
