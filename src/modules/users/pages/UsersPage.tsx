import { useState, useEffect } from 'react'
import { Plus, Search, Edit2, Trash2, Shield, X, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import Button from '@/shared/components/ui/Button'
import Input from '@/shared/components/ui/Input'
import { userService, CreateUserRequest } from '@/core/api/userService'
import { User, Role } from '@/types'

interface UserFormData {
  username: string
  email: string
  password: string
  fullName: string
  roleId: number | ''
  isActive: boolean
}

const initialFormData: UserFormData = {
  username: '',
  email: '',
  password: '',
  fullName: '',
  roleId: '',
  isActive: true
}

const UsersPage = () => {
  const [users, setUsers] = useState<User[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [formData, setFormData] = useState<UserFormData>(initialFormData)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [usersRes, rolesRes] = await Promise.all([
        userService.getAll(),
        userService.getRoles()
      ])
      setUsers(usersRes as User[])
      setRoles(rolesRes as Role[])
    } catch (error) {
      console.error('Error loading users:', error)
      toast.error('Error al cargar usuarios')
    } finally {
      setLoading(false)
    }
  }

  const openNewUser = () => {
    setSelectedUser(null)
    setFormData(initialFormData)
    setShowModal(true)
  }

  const openEditUser = (user: User) => {
    setSelectedUser(user)
    setFormData({
      username: user.username,
      email: user.email,
      password: '',
      fullName: user.fullName,
      roleId: user.role?.id || '',
      isActive: user.isActive
    })
    setShowModal(true)
  }

  const handleDelete = async (user: User) => {
    if (!confirm(`¿Eliminar el usuario "${user.fullName}"?`)) return
    
    try {
      await userService.delete(user.id)
      toast.success('Usuario eliminado')
      fetchData()
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error al eliminar usuario')
    }
  }

  const validateForm = (): boolean => {
    // Validar nombre completo
    if (!formData.fullName.trim()) {
      toast.error('El nombre completo es requerido')
      return false
    }

    // Validar username
    if (!formData.username.trim()) {
      toast.error('El nombre de usuario es requerido')
      return false
    }

    // Validar formato de username (sin espacios, caracteres especiales limitados)
    if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) {
      toast.error('El usuario solo puede contener letras, números y guiones bajos')
      return false
    }

    // Validar email
    if (!formData.email.trim()) {
      toast.error('El email es requerido')
      return false
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      toast.error('El formato del email no es válido')
      return false
    }

    // Validar contraseña solo para nuevos usuarios
    if (!selectedUser) {
      if (!formData.password) {
        toast.error('La contraseña es requerida')
        return false
      }
      if (formData.password.length < 6) {
        toast.error('La contraseña debe tener al menos 6 caracteres')
        return false
      }
    }

    // Validar rol
    if (!formData.roleId) {
      toast.error('Debe seleccionar un rol')
      return false
    }

    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return
    
    setSaving(true)

    try {
      const data = {
        ...formData,
        roleId: Number(formData.roleId)
      }

      if (selectedUser) {
        await userService.update(selectedUser.id, {
          email: data.email,
          fullName: data.fullName,
          roleId: data.roleId,
          isActive: data.isActive
        })
        toast.success('Usuario actualizado')
      } else {
        await userService.create(data as CreateUserRequest)
        toast.success('Usuario creado')
      }
      
      setShowModal(false)
      fetchData()
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error al guardar usuario')
    } finally {
      setSaving(false)
    }
  }

  const filteredUsers = users.filter(u =>
    u.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Usuarios</h1>
          <p className="text-gray-500">Gestión de usuarios y permisos</p>
        </div>
        <Button variant="primary" onClick={openNewUser}><Plus size={20} /> Nuevo Usuario</Button>
      </div>

      <div className="card">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Buscar usuarios..."
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
        ) : filteredUsers.length === 0 ? (
          <div className="flex items-center justify-center py-12 text-gray-400">
            No se encontraron usuarios
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="bg-primary-50">
                <th className="table-header">Usuario</th>
                <th className="table-header">Email</th>
                <th className="table-header">Rol</th>
                <th className="table-header text-center">Estado</th>
                <th className="table-header text-center">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-primary-50/50 transition-colors">
                  <td className="table-cell">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-r from-primary-600 to-primary-700 rounded-xl flex items-center justify-center text-white font-medium">
                        {user.fullName?.charAt(0) || 'U'}
                      </div>
                      <div>
                        <p className="font-medium text-gray-800">{user.fullName}</p>
                        <p className="text-sm text-gray-500">@{user.username}</p>
                      </div>
                    </div>
                  </td>
                  <td className="table-cell">{user.email}</td>
                  <td className="table-cell">
                    <span className="inline-flex items-center gap-1 badge badge-info">
                      <Shield size={14} /> {user.role?.name || 'Sin rol'}
                    </span>
                  </td>
                  <td className="table-cell text-center">
                    <span className={`badge ${user.isActive ? 'badge-success' : 'badge-danger'}`}>
                      {user.isActive ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="table-cell">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => openEditUser(user)}
                        className="p-2 rounded-lg hover:bg-primary-100 text-gray-500"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button
                        onClick={() => handleDelete(user)}
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

      {/* User Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md animate-scale-in">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-800">
                {selectedUser ? 'Editar Usuario' : 'Nuevo Usuario'}
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

              <Input
                label="Usuario *"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                required
                disabled={!!selectedUser}
              />

              <Input
                label="Email *"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />

              {!selectedUser && (
                <Input
                  label="Contraseña *"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                />
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rol *</label>
                <select
                  value={formData.roleId}
                  onChange={(e) => setFormData({ ...formData, roleId: Number(e.target.value) })}
                  className="input-field"
                  required
                >
                  <option value="">Seleccionar...</option>
                  {roles.map((role) => (
                    <option key={role.id} value={role.id}>{role.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-300"
                />
                <label htmlFor="isActive" className="text-sm text-gray-700">Usuario activo</label>
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

export default UsersPage
