import { useEffect, useMemo, useState } from 'react'
import { Plus, Search, Edit2, Trash2, Shield, X, Loader2, Check, Lock } from 'lucide-react'
import toast from 'react-hot-toast'
import Button from '@/shared/components/ui/Button'
import Input from '@/shared/components/ui/Input'
import { roleService, CreateRoleRequest } from '@/core/api/roleService'
import { Role } from '@/types'

type ModuleKey =
  | 'pos'
  | 'products'
  | 'categories'
  | 'inventory'
  | 'invoices'
  | 'customers'
  | 'tables'
  | 'kitchen'
  | 'reports'
  | 'users'
  | 'roles'
  | 'settings'

const MODULE_PERMISSIONS: Record<ModuleKey, { label: string; color: string; permissions: string[] }> = {
  pos: { label: 'POS', color: 'bg-green-100 text-green-700', permissions: ['pos.sell', 'pos.discount', 'pos.void'] },
  products: { label: 'Productos', color: 'bg-blue-100 text-blue-700', permissions: ['products.view', 'products.create', 'products.edit', 'products.delete'] },
  categories: { label: 'Categorías', color: 'bg-indigo-100 text-indigo-700', permissions: ['categories.view', 'categories.create', 'categories.edit', 'categories.delete'] },
  inventory: { label: 'Inventario', color: 'bg-amber-100 text-amber-700', permissions: ['inventory.view', 'inventory.adjust'] },
  invoices: { label: 'Facturas', color: 'bg-purple-100 text-purple-700', permissions: ['invoices.view', 'invoices.void'] },
  customers: { label: 'Clientes', color: 'bg-pink-100 text-pink-700', permissions: ['customers.view', 'customers.create', 'customers.edit'] },
  tables: { label: 'Mesas', color: 'bg-orange-100 text-orange-700', permissions: ['tables.view', 'tables.open', 'tables.add_items', 'tables.pay', 'tables.add_notes'] },
  kitchen: { label: 'Cocina', color: 'bg-red-100 text-red-700', permissions: ['kitchen.view', 'kitchen.update_status'] },
  reports: { label: 'Reportes', color: 'bg-cyan-100 text-cyan-700', permissions: ['reports.view', 'reports.export'] },
  users: { label: 'Usuarios', color: 'bg-gray-100 text-gray-700', permissions: ['users.view', 'users.manage'] },
  roles: { label: 'Roles', color: 'bg-violet-100 text-violet-700', permissions: ['roles.view', 'roles.create', 'roles.edit', 'roles.delete'] },
  settings: { label: 'Configuración', color: 'bg-slate-100 text-slate-700', permissions: ['settings.view', 'settings.edit'] },
}

interface RoleFormData {
  name: string
  description: string
  permissions: string[]
}

const initialFormData: RoleFormData = {
  name: '',
  description: '',
  permissions: [],
}

const RolesPage = () => {
  const [roles, setRoles] = useState<Role[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  const [showModal, setShowModal] = useState(false)
  const [selectedRole, setSelectedRole] = useState<Role | null>(null)
  const [formData, setFormData] = useState<RoleFormData>(initialFormData)
  const [saving, setSaving] = useState(false)

  const fetchRoles = async () => {
    try {
      setLoading(true)
      const res = await roleService.getAll()
      setRoles((res as Role[]) || [])
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Error al cargar roles')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRoles()
  }, [])

  const openNewRole = () => {
    setSelectedRole(null)
    setFormData(initialFormData)
    setShowModal(true)
  }

  const openEditRole = (role: Role) => {
    setSelectedRole(role)
    setFormData({
      name: role.name,
      description: role.description || '',
      permissions: role.permissions || [],
    })
    setShowModal(true)
  }

  const handleDelete = async (role: Role) => {
    if (role.isSystem) {
      toast.error('No se puede eliminar un rol de sistema')
      return
    }
    if (!confirm(`¿Eliminar el rol "${role.name}"?`)) return

    try {
      await roleService.delete(role.id)
      toast.success('Rol eliminado')
      fetchRoles()
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Error al eliminar rol')
    }
  }

  const toggleModule = (key: ModuleKey) => {
    const perms = MODULE_PERMISSIONS[key].permissions
    const hasAny = perms.some((p) => formData.permissions.includes(p))
    if (hasAny) {
      setFormData({
        ...formData,
        permissions: formData.permissions.filter((p) => !perms.includes(p)),
      })
    } else {
      const next = new Set(formData.permissions)
      perms.forEach((p) => next.add(p))
      setFormData({
        ...formData,
        permissions: Array.from(next),
      })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name.trim()) {
      toast.error('El nombre del rol es requerido')
      return
    }

    setSaving(true)
    try {
      if (selectedRole) {
        if (selectedRole.isSystem && formData.name.trim().toUpperCase() !== selectedRole.name) {
          toast.error('No se puede cambiar el nombre de un rol de sistema')
          setSaving(false)
          return
        }
        await roleService.update(selectedRole.id, {
          name: formData.name,
          description: formData.description || undefined,
          permissions: formData.permissions,
        })
        toast.success('Rol actualizado')
      } else {
        const payload: CreateRoleRequest = {
          name: formData.name,
          description: formData.description || undefined,
          permissions: formData.permissions,
        }
        await roleService.create(payload)
        toast.success('Rol creado')
      }

      setShowModal(false)
      fetchRoles()
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Error al guardar rol')
    } finally {
      setSaving(false)
    }
  }

  const filteredRoles = useMemo(() => {
    const t = searchTerm.toLowerCase()
    return roles.filter((r) => r.name.toLowerCase().includes(t) || (r.description || '').toLowerCase().includes(t))
  }, [roles, searchTerm])

  const getModuleBadges = (role: Role) => {
    const perms = role.permissions || []
    const keys = (Object.keys(MODULE_PERMISSIONS) as ModuleKey[]).filter((k) =>
      MODULE_PERMISSIONS[k].permissions.some((p) => perms.includes(p))
    )
    return keys
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Roles</h1>
          <p className="text-gray-500">Control total de roles y módulos</p>
        </div>
        <Button variant="primary" onClick={openNewRole}>
          <Plus size={20} /> Nuevo Rol
        </Button>
      </div>

      <div className="card">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Buscar roles..."
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
        ) : filteredRoles.length === 0 ? (
          <div className="flex items-center justify-center py-12 text-gray-400">No se encontraron roles</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="bg-primary-50">
                <th className="table-header">Rol</th>
                <th className="table-header">Módulos</th>
                <th className="table-header text-center">Sistema</th>
                <th className="table-header text-center">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredRoles.map((role) => {
                const mods = getModuleBadges(role)
                return (
                  <tr key={role.id} className="hover:bg-primary-50/50 transition-colors">
                    <td className="table-cell">
                      <div>
                        <p className="font-medium text-gray-800 flex items-center gap-2">
                          <Shield size={14} className="text-primary-600" /> {role.name}
                        </p>
                        <p className="text-xs text-gray-500 line-clamp-1">{role.description || 'Sin descripción'}</p>
                      </div>
                    </td>
                    <td className="table-cell">
                      <div className="flex flex-wrap gap-1">
                        {mods.slice(0, 6).map((m) => (
                          <span key={m} className={`text-[10px] px-1.5 py-0.5 rounded ${MODULE_PERMISSIONS[m].color}`}>
                            {MODULE_PERMISSIONS[m].label}
                          </span>
                        ))}
                        {mods.length > 6 && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">+{mods.length - 6}</span>
                        )}
                      </div>
                    </td>
                    <td className="table-cell text-center">
                      <span className={`badge ${role.isSystem ? 'badge-info' : 'badge-warning'}`}>{role.isSystem ? 'Sí' : 'No'}</span>
                    </td>
                    <td className="table-cell">
                      <div className="flex items-center justify-center gap-2">
                        <button onClick={() => openEditRole(role)} className="p-2 rounded-lg hover:bg-primary-100 text-gray-500">
                          <Edit2 size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete(role)}
                          className="p-2 rounded-lg hover:bg-red-100 text-red-500 disabled:opacity-50"
                          disabled={!!role.isSystem}
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

      {/* Role Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="modal-content-lg p-6 animate-scale-in">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-800">{selectedRole ? 'Editar Rol' : 'Nuevo Rol'}</h3>
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
                disabled={!!selectedRole?.isSystem}
              />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="input-field min-h-[80px]"
                  placeholder="Descripción del rol..."
                />
              </div>

              <div>
                <p className="text-sm font-semibold text-gray-700 mb-2">Módulos y permisos</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {(Object.keys(MODULE_PERMISSIONS) as ModuleKey[]).map((key) => {
                    const perms = MODULE_PERMISSIONS[key].permissions
                    const enabled = perms.some((p) => formData.permissions.includes(p))
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => toggleModule(key)}
                        className={`p-3 rounded-xl border-2 text-left transition-all ${
                          enabled ? 'border-primary-500 bg-primary-50 ring-2 ring-primary-200' : 'border-gray-200 hover:border-gray-300 bg-white'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className={`text-xs font-semibold ${enabled ? 'text-primary-700' : 'text-gray-700'}`}>{MODULE_PERMISSIONS[key].label}</span>
                          {enabled ? <Check size={14} className="text-green-600" /> : <Lock size={14} className="text-gray-400" />}
                        </div>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {perms.slice(0, 2).map((p) => (
                            <span key={p} className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">
                              {p}
                            </span>
                          ))}
                          {perms.length > 2 && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">+{perms.length - 2}</span>
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="secondary" onClick={() => setShowModal(false)}>
                  Cancelar
                </Button>
                <Button type="submit" variant="primary" disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" /> Guardando...
                    </>
                  ) : (
                    'Guardar'
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default RolesPage
