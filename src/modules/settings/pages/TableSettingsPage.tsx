import { useState, useEffect } from 'react'
import { Plus, X, Edit2, Trash2, Save } from 'lucide-react'
import toast from 'react-hot-toast'
import Button from '@/shared/components/ui/Button'

interface ZoneConfig {
  id: string
  name: string
  color: string
}

interface StatusConfig {
  id: string
  name: string
  label: string
  bgColor: string
  textColor: string
  borderColor: string
}

const DEFAULT_ZONES: ZoneConfig[] = [
  { id: 'INTERIOR', name: 'Interior', color: 'blue' },
  { id: 'TERRAZA', name: 'Terraza', color: 'green' },
  { id: 'BAR', name: 'Bar', color: 'purple' },
  { id: 'VIP', name: 'VIP', color: 'yellow' },
]

const DEFAULT_STATUSES: StatusConfig[] = [
  { id: 'DISPONIBLE', name: 'Disponible', label: 'Disponible', bgColor: 'bg-green-50', textColor: 'text-green-700', borderColor: 'border-green-200' },
  { id: 'OCUPADA', name: 'Ocupada', label: 'Ocupada', bgColor: 'bg-red-50', textColor: 'text-red-700', borderColor: 'border-red-300' },
  { id: 'RESERVADA', name: 'Reservada', label: 'Reservada', bgColor: 'bg-yellow-50', textColor: 'text-yellow-700', borderColor: 'border-yellow-200' },
  { id: 'FUERA_DE_SERVICIO', name: 'Fuera de servicio', label: 'Fuera de servicio', bgColor: 'bg-gray-100', textColor: 'text-gray-500', borderColor: 'border-gray-300' },
]

const TableSettingsPage = () => {
  const [zones, setZones] = useState<ZoneConfig[]>([])
  const [statuses, setStatuses] = useState<StatusConfig[]>([])
  const [editingZone, setEditingZone] = useState<ZoneConfig | null>(null)
  const [editingStatus, setStatusStatus] = useState<StatusConfig | null>(null)
  const [showZoneModal, setShowZoneModal] = useState(false)
  const [showStatusModal, setShowStatusModal] = useState(false)

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = () => {
    const savedZones = localStorage.getItem('table_zones')
    const savedStatuses = localStorage.getItem('table_statuses')
    
    setZones(savedZones ? JSON.parse(savedZones) : DEFAULT_ZONES)
    setStatuses(savedStatuses ? JSON.parse(savedStatuses) : DEFAULT_STATUSES)
  }

  const saveZones = (newZones: ZoneConfig[]) => {
    localStorage.setItem('table_zones', JSON.stringify(newZones))
    setZones(newZones)
    toast.success('Zonas guardadas correctamente')
  }

  const saveStatuses = (newStatuses: StatusConfig[]) => {
    localStorage.setItem('table_statuses', JSON.stringify(newStatuses))
    setStatuses(newStatuses)
    toast.success('Estados guardados correctamente')
  }

  const handleAddZone = () => {
    setEditingZone({ id: `ZONE_${Date.now()}`, name: '', color: 'blue' })
    setShowZoneModal(true)
  }

  const handleEditZone = (zone: ZoneConfig) => {
    setEditingZone({ ...zone })
    setShowZoneModal(true)
  }

  const handleSaveZone = () => {
    if (!editingZone?.name.trim()) {
      toast.error('El nombre de la zona es requerido')
      return
    }

    const existingIndex = zones.findIndex(z => z.id === editingZone.id)
    let newZones: ZoneConfig[]

    if (existingIndex >= 0) {
      newZones = [...zones]
      newZones[existingIndex] = editingZone
    } else {
      newZones = [...zones, editingZone]
    }

    saveZones(newZones)
    setShowZoneModal(false)
    setEditingZone(null)
  }

  const handleDeleteZone = (zoneId: string) => {
    if (!confirm('¿Eliminar esta zona? Las mesas con esta zona quedarán sin clasificar.')) return
    const newZones = zones.filter(z => z.id !== zoneId)
    saveZones(newZones)
  }

  const handleAddStatus = () => {
    setStatusStatus({ 
      id: `STATUS_${Date.now()}`, 
      name: '', 
      label: '',
      bgColor: 'bg-blue-50', 
      textColor: 'text-blue-700', 
      borderColor: 'border-blue-200' 
    })
    setShowStatusModal(true)
  }

  const handleEditStatus = (status: StatusConfig) => {
    setStatusStatus({ ...status })
    setShowStatusModal(true)
  }

  const handleSaveStatus = () => {
    if (!editingStatus?.name.trim()) {
      toast.error('El nombre del estado es requerido')
      return
    }

    const existingIndex = statuses.findIndex(s => s.id === editingStatus.id)
    let newStatuses: StatusConfig[]

    if (existingIndex >= 0) {
      newStatuses = [...statuses]
      newStatuses[existingIndex] = editingStatus
    } else {
      newStatuses = [...statuses, editingStatus]
    }

    saveStatuses(newStatuses)
    setShowStatusModal(false)
    setStatusStatus(null)
  }

  const handleDeleteStatus = (statusId: string) => {
    if (!confirm('¿Eliminar este estado? Las mesas con este estado quedarán sin clasificar.')) return
    const newStatuses = statuses.filter(s => s.id !== statusId)
    saveStatuses(newStatuses)
  }

  const handleRestoreDefaults = () => {
    if (!confirm('¿Restaurar configuración predeterminada? Se perderán las zonas y estados personalizados.')) return
    localStorage.removeItem('table_zones')
    localStorage.removeItem('table_statuses')
    loadSettings()
    toast.success('Configuración restaurada')
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Configuración de Mesas</h1>
          <p className="text-gray-500">Personaliza zonas y estados de las mesas</p>
        </div>
        <Button variant="secondary" onClick={handleRestoreDefaults}>
          Restaurar Predeterminados
        </Button>
      </div>

      {/* Zonas */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-800">Zonas de Mesas</h2>
          <Button variant="primary" size="sm" onClick={handleAddZone}>
            <Plus size={16} /> Agregar Zona
          </Button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {zones.map(zone => (
            <div key={zone.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
              <div className="flex items-center gap-3">
                <div className={`w-4 h-4 rounded-full bg-${zone.color}-500`}></div>
                <span className="font-medium text-gray-700">{zone.name}</span>
              </div>
              <div className="flex gap-2">
                <button onClick={() => handleEditZone(zone)} className="p-1.5 hover:bg-white rounded-lg transition-colors">
                  <Edit2 size={16} className="text-gray-600" />
                </button>
                <button onClick={() => handleDeleteZone(zone.id)} className="p-1.5 hover:bg-white rounded-lg transition-colors">
                  <Trash2 size={16} className="text-red-600" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Estados */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-800">Estados de Mesas</h2>
          <Button variant="primary" size="sm" onClick={handleAddStatus}>
            <Plus size={16} /> Agregar Estado
          </Button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {statuses.map(status => (
            <div key={status.id} className={`flex items-center justify-between p-4 ${status.bgColor} ${status.borderColor} border rounded-xl`}>
              <div>
                <span className={`font-medium ${status.textColor}`}>{status.label}</span>
                <p className="text-xs text-gray-500 mt-0.5">ID: {status.id}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => handleEditStatus(status)} className="p-1.5 hover:bg-white rounded-lg transition-colors">
                  <Edit2 size={16} className="text-gray-600" />
                </button>
                <button onClick={() => handleDeleteStatus(status.id)} className="p-1.5 hover:bg-white rounded-lg transition-colors">
                  <Trash2 size={16} className="text-red-600" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal Zona */}
      {showZoneModal && editingZone && (
        <div className="modal-overlay">
          <div className="modal-content max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-800">
                {zones.some(z => z.id === editingZone.id) ? 'Editar Zona' : 'Nueva Zona'}
              </h3>
              <button onClick={() => { setShowZoneModal(false); setEditingZone(null) }} className="p-1 hover:bg-gray-100 rounded-lg">
                <X size={20} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre de la Zona</label>
                <input
                  type="text"
                  value={editingZone.name}
                  onChange={(e) => setEditingZone({ ...editingZone, name: e.target.value })}
                  className="input-field"
                  placeholder="Ej: Terraza Principal"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
                <select
                  value={editingZone.color}
                  onChange={(e) => setEditingZone({ ...editingZone, color: e.target.value })}
                  className="input-field"
                >
                  <option value="blue">Azul</option>
                  <option value="green">Verde</option>
                  <option value="purple">Morado</option>
                  <option value="yellow">Amarillo</option>
                  <option value="red">Rojo</option>
                  <option value="pink">Rosa</option>
                  <option value="indigo">Índigo</option>
                </select>
              </div>
              <div className="flex gap-3 pt-4">
                <Button variant="primary" className="flex-1" onClick={handleSaveZone}>
                  <Save size={16} /> Guardar
                </Button>
                <Button variant="secondary" onClick={() => { setShowZoneModal(false); setEditingZone(null) }}>
                  Cancelar
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Estado */}
      {showStatusModal && editingStatus && (
        <div className="modal-overlay">
          <div className="modal-content max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-800">
                {statuses.some(s => s.id === editingStatus.id) ? 'Editar Estado' : 'Nuevo Estado'}
              </h3>
              <button onClick={() => { setShowStatusModal(false); setStatusStatus(null) }} className="p-1 hover:bg-gray-100 rounded-lg">
                <X size={20} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del Estado</label>
                <input
                  type="text"
                  value={editingStatus.name}
                  onChange={(e) => setStatusStatus({ ...editingStatus, name: e.target.value, label: e.target.value })}
                  className="input-field"
                  placeholder="Ej: En Limpieza"
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 text-xs">Color Fondo</label>
                  <select
                    value={editingStatus.bgColor}
                    onChange={(e) => setStatusStatus({ ...editingStatus, bgColor: e.target.value })}
                    className="input-field text-xs"
                  >
                    <option value="bg-green-50">Verde</option>
                    <option value="bg-red-50">Rojo</option>
                    <option value="bg-yellow-50">Amarillo</option>
                    <option value="bg-blue-50">Azul</option>
                    <option value="bg-purple-50">Morado</option>
                    <option value="bg-gray-100">Gris</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 text-xs">Color Texto</label>
                  <select
                    value={editingStatus.textColor}
                    onChange={(e) => setStatusStatus({ ...editingStatus, textColor: e.target.value })}
                    className="input-field text-xs"
                  >
                    <option value="text-green-700">Verde</option>
                    <option value="text-red-700">Rojo</option>
                    <option value="text-yellow-700">Amarillo</option>
                    <option value="text-blue-700">Azul</option>
                    <option value="text-purple-700">Morado</option>
                    <option value="text-gray-500">Gris</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 text-xs">Color Borde</label>
                  <select
                    value={editingStatus.borderColor}
                    onChange={(e) => setStatusStatus({ ...editingStatus, borderColor: e.target.value })}
                    className="input-field text-xs"
                  >
                    <option value="border-green-200">Verde</option>
                    <option value="border-red-300">Rojo</option>
                    <option value="border-yellow-200">Amarillo</option>
                    <option value="border-blue-200">Azul</option>
                    <option value="border-purple-200">Morado</option>
                    <option value="border-gray-300">Gris</option>
                  </select>
                </div>
              </div>
              <div className={`p-3 ${editingStatus.bgColor} ${editingStatus.borderColor} border rounded-xl`}>
                <p className="text-sm text-gray-600 mb-1">Vista previa:</p>
                <span className={`font-medium ${editingStatus.textColor}`}>{editingStatus.label || 'Nombre del Estado'}</span>
              </div>
              <div className="flex gap-3 pt-4">
                <Button variant="primary" className="flex-1" onClick={handleSaveStatus}>
                  <Save size={16} /> Guardar
                </Button>
                <Button variant="secondary" onClick={() => { setShowStatusModal(false); setStatusStatus(null) }}>
                  Cancelar
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default TableSettingsPage
