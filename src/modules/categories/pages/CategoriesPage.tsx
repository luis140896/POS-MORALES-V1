import { useState, useEffect } from 'react'
import { Plus, Edit2, Trash2, X, Loader2, Package } from 'lucide-react'
import toast from 'react-hot-toast'
import Button from '@/shared/components/ui/Button'
import Input from '@/shared/components/ui/Input'
import { categoryService } from '@/core/api/categoryService'
import { productService } from '@/core/api/productService'
import { Category, Product } from '@/types'

interface CategoryFormData {
  name: string
  description: string
  imageUrl: string
  parentId: number | null
  displayOrder: number
  isActive: boolean
}

const initialFormData: CategoryFormData = {
  name: '',
  description: '',
  imageUrl: '',
  parentId: null,
  displayOrder: 0,
  isActive: true
}

const CategoriesPage = () => {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null)
  const [formData, setFormData] = useState<CategoryFormData>(initialFormData)
  const [saving, setSaving] = useState(false)
  const [showProductsModal, setShowProductsModal] = useState(false)
  const [categoryProducts, setCategoryProducts] = useState<Product[]>([])
  const [loadingProducts, setLoadingProducts] = useState(false)
  const [viewingCategory, setViewingCategory] = useState<Category | null>(null)

  const iconOptions = [
    // Frutas
    '�', '�', '🍋', '🍌', '🍇', '🍓', '🍑', '�', '�', '🍍',
    '🍉', '🍒', '🍐', '�', '🥥',
    // Verduras
    '🥑', '🥕', '🥒', '🥬', '🥦', '🧅', '🧄', '�', '�', '🥔',
    '🌶️', '🫑', '🥮',
    // Carnes y Proteínas
    '🥩', '🍗', '🍖', '🥓', '🍳', '🥚', '🐟', '🦐', '🦞', '🦑',
    // Lácteos y Panadería
    '🥛', '🧀', '🧈', '🥖', '�', '🥐', '🥯', '�', '🍰', '🎂',
    // Bebidas
    '�', '�', '☕', '🍵', '�', '🍺', '🍷', '�', '�', '🍹',
    // Snacks y Dulces
    '🍫', '🍬', '🍭', '🍪', '�', '🌰', '�', '🧂', '🍯', '🥫',
    // Comidas Preparadas
    '🍕', '🍔', '🌮', '🌯', '🥗', '🍜', '🍝', '🍛', '🍱', '�',
    // Otros
    '🏷️', '�', '�', '🧴', '🧼', '🧻', '�', '🧹', '🌿', '❄️'
  ]

  useEffect(() => {
    fetchCategories()
  }, [])

  const handleToggleActive = async (category: Category) => {
    try {
      await categoryService.update(category.id, { isActive: !category.isActive })
      toast.success(`Categoría ${!category.isActive ? 'activada' : 'desactivada'}`)
      fetchCategories()
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error al actualizar estado')
    }
  }

  const fetchCategories = async () => {
    try {
      setLoading(true)
      const res = await categoryService.getAll()
      const cats = (res as Category[]) || []

      const enriched = await Promise.all(
        cats.map(async (cat) => {
          try {
            const products = await productService.getByCategory(cat.id)
            const count = Array.isArray(products) ? products.length : 0
            return { ...cat, productCount: count }
          } catch {
            return { ...cat, productCount: cat.productCount ?? 0 }
          }

        })
      )

      setCategories(enriched)
    } catch (error) {
      console.error('Error loading categories:', error)
      toast.error('Error al cargar categorías')
    } finally {
      setLoading(false)
    }
  }

  const openNewCategory = () => {
    setSelectedCategory(null)
    setFormData(initialFormData)
    setShowModal(true)
  }

  const openEditCategory = (category: Category) => {
    setSelectedCategory(category)
    setFormData({
      name: category.name,
      description: category.description || '',
      imageUrl: category.imageUrl || '',
      parentId: category.parentId || null,
      displayOrder: category.displayOrder || 0,
      isActive: category.isActive
    })
    setShowModal(true)
  }

  const handleDelete = async (category: Category) => {
    if (!confirm(`¿Eliminar la categoría "${category.name}"?`)) return
    
    try {
      await categoryService.delete(category.id)
      toast.success('Categoría eliminada')
      fetchCategories()
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error al eliminar categoría')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      if (selectedCategory) {
        await categoryService.update(selectedCategory.id, formData)
        toast.success('Categoría actualizada')
      } else {
        await categoryService.create(formData)
        toast.success('Categoría creada')
      }
      
      setShowModal(false)
      fetchCategories()
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error al guardar categoría')
    } finally {
      setSaving(false)
    }
  }

  const viewCategoryProducts = async (category: Category) => {
    setViewingCategory(category)
    setShowProductsModal(true)
    setLoadingProducts(true)
    try {
      const res = await productService.getByCategory(category.id)
      setCategoryProducts(res as Product[])
    } catch (error) {
      console.error('Error loading products:', error)
      toast.error('Error al cargar productos')
    } finally {
      setLoadingProducts(false)
    }
  }

  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(value)

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Categorías</h1>
          <p className="text-gray-500">Organiza tus productos por categorías</p>
        </div>
        <Button variant="primary" onClick={openNewCategory}>
          <Plus size={20} />
          Nueva Categoría
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
        </div>
      ) : categories.length === 0 ? (
        <div className="flex items-center justify-center py-12 text-gray-400">
          No hay categorías registradas
        </div>
      ) : (
        <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {categories.map((category) => (
            <div key={category.id} className="card hover:scale-[1.02] transition-transform p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center text-xl flex-shrink-0">
                  {category.imageUrl || '📦'}
                </div>
                <div className="flex gap-1">
                  <button 
                    onClick={() => openEditCategory(category)}
                    className="p-1.5 rounded-lg hover:bg-primary-100 text-gray-400 transition-colors"
                  >
                    <Edit2 size={14} />
                  </button>
                  <button 
                    onClick={() => handleDelete(category)}
                    className="p-1.5 rounded-lg hover:bg-red-100 text-red-400 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              <h3 className="font-semibold text-gray-800 text-sm truncate" title={category.name}>{category.name}</h3>
              <p className="text-gray-400 text-xs mb-2 line-clamp-1">{category.description || 'Sin descripción'}</p>
              <div className="flex items-center justify-between pt-2 border-t border-primary-100">
                <button 
                  onClick={() => viewCategoryProducts(category)}
                  className="flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700 transition-colors"
                >
                  <Package size={12} />
                  <span>{category.productCount || 0}</span>
                </button>
                <button
                  onClick={() => handleToggleActive(category)}
                  className={`text-xs px-2 py-0.5 rounded-full transition-colors ${category.isActive ? 'bg-green-100 text-green-600 hover:bg-green-200' : 'bg-red-100 text-red-600 hover:bg-red-200'}`}
                  title="Cambiar estado"
                >
                  {category.isActive ? 'Activa' : 'Inactiva'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Products Modal */}
      {showProductsModal && viewingCategory && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-2xl max-h-[80vh] flex flex-col animate-scale-in">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-xl font-bold text-gray-800">
                  Productos en "{viewingCategory.name}"
                </h3>
                <p className="text-sm text-gray-500">{categoryProducts.length} productos encontrados</p>
              </div>
              <button 
                onClick={() => {
                  setShowProductsModal(false)
                  setViewingCategory(null)
                  setCategoryProducts([])
                }} 
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={24} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {loadingProducts ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
                </div>
              ) : categoryProducts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                  <Package size={48} className="mb-2 opacity-50" />
                  <p>No hay productos en esta categoría</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {categoryProducts.map((product: any) => (
                    <div key={product.id} className="flex items-center gap-4 p-3 bg-gray-50 rounded-xl hover:bg-primary-50 transition-colors">
                      <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center text-xl">
                        {product.imageUrl ? (
                          <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover rounded-lg" />
                        ) : '📦'}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-800">{product.name}</p>
                        <p className="text-xs text-gray-500">Código: {product.code}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-primary-600">{formatCurrency(product.salePrice)}</p>
                        <p className="text-xs text-gray-500">
                          Stock: {product.stockQuantity ?? product.inventory?.quantity ?? 0}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-4 pt-4 border-t">
              <Button 
                variant="secondary" 
                className="w-full"
                onClick={() => {
                  setShowProductsModal(false)
                  setViewingCategory(null)
                  setCategoryProducts([])
                }}
              >
                Cerrar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Category Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="modal-content p-6 animate-scale-in">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-800">
                {selectedCategory ? 'Editar Categoría' : 'Nueva Categoría'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="Nombre *"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="input-field min-h-[80px]"
                  placeholder="Descripción de la categoría..."
                />
              </div>

              <Input
                label="Icono/Emoji"
                value={formData.imageUrl}
                onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                placeholder="🏷️"
              />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Elegir icono</label>
                <div className="grid grid-cols-10 gap-2">
                  {iconOptions.map((icon, index) => (
                    <button
                      key={`${icon}-${index}`}
                      type="button"
                      onClick={() => setFormData({ ...formData, imageUrl: icon })}
                      className={`h-9 w-9 rounded-lg border flex items-center justify-center text-lg transition-colors ${
                        formData.imageUrl === icon
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-gray-200 hover:bg-gray-50'
                      }`}
                      title={icon}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Categoría Padre</label>
                <select
                  value={formData.parentId || ''}
                  onChange={(e) => setFormData({ ...formData, parentId: e.target.value ? Number(e.target.value) : null })}
                  className="input-field"
                >
                  <option value="">Ninguna (categoría raíz)</option>
                  {categories.filter(c => c.id !== selectedCategory?.id).map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="categoryIsActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-300"
                />
                <label htmlFor="categoryIsActive" className="text-sm text-gray-700">Categoría activa</label>
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
    </div>
  )
}

export default CategoriesPage
