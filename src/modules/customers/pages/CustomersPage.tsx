import { useState, useEffect } from 'react'
import { Plus, Search, Edit2, Trash2, X, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import Button from '@/shared/components/ui/Button'
import Input from '@/shared/components/ui/Input'
import { customerService } from '@/core/api/customerService'
import { Customer } from '@/types'

interface CustomerFormData {
  documentType: string
  documentNumber: string
  fullName: string
  email: string
  phone: string
  address: string
  city: string
  notes: string
  creditLimit: number
  isActive: boolean
}

const initialFormData: CustomerFormData = {
  documentType: 'CC',
  documentNumber: '',
  fullName: '',
  email: '',
  phone: '',
  address: '',
  city: '',
  notes: '',
  creditLimit: 0,
  isActive: true
}

const CustomersPage = () => {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [formData, setFormData] = useState<CustomerFormData>(initialFormData)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchCustomers()
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchTerm) {
        searchCustomers()
      } else {
        fetchCustomers()
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [searchTerm])

  const fetchCustomers = async () => {
    try {
      setLoading(true)
      const res = await customerService.getAll()
      const allCustomers = (res as any).content || res
      // Filtrar solo clientes activos
      setCustomers(allCustomers.filter((c: Customer) => c.isActive !== false))
    } catch (error) {
      console.error('Error loading customers:', error)
      toast.error('Error al cargar clientes')
    } finally {
      setLoading(false)
    }
  }

  const searchCustomers = async () => {
    try {
      const res = await customerService.search(searchTerm)
      // Filtrar solo clientes activos en búsqueda también
      setCustomers((res as Customer[]).filter((c: Customer) => c.isActive !== false))
    } catch (error) {
      console.error('Error searching customers:', error)
    }
  }

  const openNewCustomer = () => {
    setSelectedCustomer(null)
    setFormData(initialFormData)
    setShowModal(true)
  }

  const openEditCustomer = (customer: Customer) => {
    setSelectedCustomer(customer)
    setFormData({
      documentType: customer.documentType || 'CC',
      documentNumber: customer.documentNumber || '',
      fullName: customer.fullName,
      email: customer.email || '',
      phone: customer.phone || '',
      address: customer.address || '',
      city: customer.city || '',
      notes: customer.notes || '',
      creditLimit: customer.creditLimit || 0,
      isActive: customer.isActive
    })
    setShowModal(true)
  }

  const handleDelete = async (customer: Customer) => {
    if (!confirm(`¿Desactivar el cliente "${customer.fullName}"? El cliente será marcado como inactivo.`)) return
    
    try {
      await customerService.delete(customer.id)
      toast.success('Cliente desactivado correctamente')
      // Actualizar la lista local inmediatamente
      setCustomers(prev => prev.filter(c => c.id !== customer.id))
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error al desactivar cliente')
    }
  }

  const validateForm = (): boolean => {
    // Validar nombre requerido
    if (!formData.fullName.trim()) {
      toast.error('El nombre completo es requerido')
      return false
    }

    // Validar email si se proporciona
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      toast.error('El formato del email no es válido')
      return false
    }

    // Validar documento - solo números
    if (formData.documentNumber && !/^\d+$/.test(formData.documentNumber)) {
      toast.error('El número de documento debe contener solo números')
      return false
    }

    // Validar longitud de documento (6-15 dígitos para flexibilidad)
    if (formData.documentNumber && (formData.documentNumber.length < 6 || formData.documentNumber.length > 15)) {
      toast.error('El número de documento debe tener entre 6 y 15 dígitos')
      return false
    }

    // Validar teléfono - solo números si se proporciona
    if (formData.phone && !/^\d+$/.test(formData.phone.replace(/[\s-]/g, ''))) {
      toast.error('El teléfono debe contener solo números')
      return false
    }

    // Validar longitud de teléfono (7-15 dígitos)
    if (formData.phone) {
      const phoneDigits = formData.phone.replace(/[\s-]/g, '')
      if (phoneDigits.length < 7 || phoneDigits.length > 15) {
        toast.error('El teléfono debe tener entre 7 y 15 dígitos')
        return false
      }
    }

    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return
    
    setSaving(true)

    try {
      if (selectedCustomer) {
        await customerService.update(selectedCustomer.id, formData)
        toast.success('Cliente actualizado')
      } else {
        await customerService.create(formData)
        toast.success('Cliente creado')
      }
      
      setShowModal(false)
      fetchCustomers()
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error al guardar cliente')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Clientes</h1>
          <p className="text-gray-500">Gestiona tu base de clientes</p>
        </div>
        <Button variant="primary" onClick={openNewCustomer}>
          <Plus size={20} /> Nuevo Cliente
        </Button>
      </div>

      <div className="card">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input 
            type="text" 
            placeholder="Buscar por nombre, documento o teléfono..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input-field pl-12" 
          />
        </div>
      </div>

      <div className="card overflow-hidden p-0">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
          </div>
        ) : customers.length === 0 ? (
          <div className="flex items-center justify-center py-12 text-gray-400">
            No se encontraron clientes
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="bg-primary-50">
                <th className="table-header">Cliente</th>
                <th className="table-header">Documento</th>
                <th className="table-header">Teléfono</th>
                <th className="table-header">Email</th>
                <th className="table-header text-center">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((customer) => (
                <tr key={customer.id} className="hover:bg-primary-50/50 transition-colors">
                  <td className="table-cell font-medium">{customer.fullName}</td>
                  <td className="table-cell">{customer.documentType} {customer.documentNumber}</td>
                  <td className="table-cell">{customer.phone || '-'}</td>
                  <td className="table-cell">{customer.email || '-'}</td>
                  <td className="table-cell">
                    <div className="flex items-center justify-center gap-2">
                      <button 
                        onClick={() => openEditCustomer(customer)}
                        className="p-2 rounded-lg hover:bg-primary-100 text-gray-500"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button 
                        onClick={() => handleDelete(customer)}
                        className="p-2 rounded-lg hover:bg-red-100 text-red-500"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Customer Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="modal-content-lg p-6 animate-scale-in">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-800">
                {selectedCustomer ? 'Editar Cliente' : 'Nuevo Cliente'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="Nombre Completo *"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                required
              />

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipo Doc.</label>
                  <select
                    value={formData.documentType}
                    onChange={(e) => setFormData({ ...formData, documentType: e.target.value })}
                    className="input-field"
                  >
                    <option value="CC">CC</option>
                    <option value="NIT">NIT</option>
                    <option value="CE">CE</option>
                    <option value="TI">TI</option>
                    <option value="PP">Pasaporte</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <Input
                    label="Número de Documento"
                    value={formData.documentNumber}
                    onChange={(e) => setFormData({ ...formData, documentNumber: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Teléfono"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
                <Input
                  label="Email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>

              <Input
                label="Dirección"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              />

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Ciudad"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                />
                <Input
                  label="Límite de Crédito"
                  type="number"
                  min="0"
                  value={formData.creditLimit}
                  onChange={(e) => setFormData({ ...formData, creditLimit: Number(e.target.value) })}
                />
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

export default CustomersPage
