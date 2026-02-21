import { useState, useEffect } from 'react'
import { Plus, Edit2, Trash2, Power, PowerOff, Calendar, Tag, Percent } from 'lucide-react'
import { promotionService, Promotion, CreatePromotionRequest, UpdatePromotionRequest } from '@/core/api/promotionService'
import { toast } from 'react-hot-toast'
import Button from '@/shared/components/ui/Button'

const PromotionsPage = () => {
  const [promotions, setPromotions] = useState<Promotion[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [selectedPromotion, setSelectedPromotion] = useState<Promotion | null>(null)
  const [saving, setSaving] = useState(false)

  const [formData, setFormData] = useState<CreatePromotionRequest>({
    name: '',
    description: '',
    discountPercent: 10,
    scheduleType: 'WEEKLY',
    daysOfWeek: '[]',
    isActive: true,
    applyToAllProducts: true,
    priority: 0,
  })

  const weekDays = [
    { value: 1, label: 'Lun' },
    { value: 2, label: 'Mar' },
    { value: 3, label: 'Mié' },
    { value: 4, label: 'Jue' },
    { value: 5, label: 'Vie' },
    { value: 6, label: 'Sáb' },
    { value: 7, label: 'Dom' },
  ]

  useEffect(() => {
    fetchPromotions()
  }, [])

  const fetchPromotions = async () => {
    try {
      setLoading(true)
      const res = await promotionService.getAll()
      setPromotions((res as Promotion[]) || [])
    } catch (error) {
      console.error('Error loading promotions:', error)
      toast.error('Error al cargar promociones')
    } finally {
      setLoading(false)
    }
  }

  const openNewPromotion = () => {
    setSelectedPromotion(null)
    setFormData({
      name: '',
      description: '',
      discountPercent: 10,
      scheduleType: 'WEEKLY',
      daysOfWeek: '[]',
      isActive: true,
      applyToAllProducts: true,
      priority: 0,
    })
    setShowModal(true)
  }

  const openEditPromotion = (promotion: Promotion) => {
    setSelectedPromotion(promotion)
    setFormData({
      name: promotion.name,
      description: promotion.description || '',
      discountPercent: promotion.discountPercent,
      scheduleType: promotion.scheduleType,
      daysOfWeek: promotion.daysOfWeek || '[]',
      startDate: promotion.startDate,
      endDate: promotion.endDate,
      isActive: promotion.isActive,
      applyToAllProducts: promotion.applyToAllProducts,
      priority: promotion.priority,
    })
    setShowModal(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim()) {
      toast.error('El nombre es requerido')
      return
    }

    if (formData.scheduleType === 'SPECIFIC_DATE' && (!formData.startDate || !formData.endDate)) {
      toast.error('Las fechas son requeridas para promociones de fecha específica')
      return
    }

    setSaving(true)
    try {
      if (selectedPromotion) {
        await promotionService.update(selectedPromotion.id, formData as UpdatePromotionRequest)
        toast.success('Promoción actualizada')
      } else {
        await promotionService.create(formData)
        toast.success('Promoción creada')
      }
      setShowModal(false)
      fetchPromotions()
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error al guardar promoción')
    } finally {
      setSaving(false)
    }
  }

  const handleToggle = async (promotion: Promotion) => {
    try {
      await promotionService.toggle(promotion.id)
      toast.success(`Promoción ${!promotion.isActive ? 'activada' : 'desactivada'}`)
      fetchPromotions()
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error al cambiar estado')
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('¿Está seguro de eliminar esta promoción?')) return
    try {
      await promotionService.delete(id)
      toast.success('Promoción eliminada')
      fetchPromotions()
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error al eliminar promoción')
    }
  }

  const getDaysOfWeekArray = (): number[] => {
    try {
      return JSON.parse(formData.daysOfWeek || '[]')
    } catch {
      return []
    }
  }

  const toggleDayOfWeek = (day: number) => {
    const days = getDaysOfWeekArray()
    const updated = days.includes(day) ? days.filter(d => d !== day) : [...days, day]
    setFormData({ ...formData, daysOfWeek: JSON.stringify(updated.sort()) })
  }

  const formatSchedule = (promotion: Promotion) => {
    if (promotion.scheduleType === 'DAILY') return 'Todos los días'
    if (promotion.scheduleType === 'WEEKLY') {
      try {
        const days = JSON.parse(promotion.daysOfWeek || '[]')
        return weekDays.filter(wd => days.includes(wd.value)).map(wd => wd.label).join(', ') || 'Sin días'
      } catch {
        return 'Sin días'
      }
    }
    if (promotion.scheduleType === 'SPECIFIC_DATE') {
      return `${promotion.startDate} - ${promotion.endDate}`
    }
    return ''
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Promociones y Descuentos</h1>
          <p className="text-sm text-gray-500 mt-1">Gestiona descuentos programados por día</p>
        </div>
        <Button variant="primary" onClick={openNewPromotion}>
          <Plus size={20} />
          Nueva Promoción
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Cargando promociones...</div>
      ) : promotions.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <Tag className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <p>No hay promociones creadas</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {promotions.map(promo => (
            <div
              key={promo.id}
              className={`card p-5 ${promo.isActive ? 'border-l-4 border-green-500' : 'opacity-60'}`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="font-bold text-gray-800 flex items-center gap-2">
                    {promo.name}
                    {promo.isActive && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">Activa</span>}
                  </h3>
                  {promo.description && <p className="text-sm text-gray-500 mt-1">{promo.description}</p>}
                </div>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-sm">
                  <Percent size={16} className="text-primary-600" />
                  <span className="font-bold text-primary-600">{promo.discountPercent}% de descuento</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Calendar size={16} />
                  <span>{formatSchedule(promo)}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => openEditPromotion(promo)}
                  className="flex-1 btn-icon bg-primary-50 text-primary-600 hover:bg-primary-100"
                >
                  <Edit2 size={16} />
                </button>
                <button
                  onClick={() => handleToggle(promo)}
                  className={`flex-1 btn-icon ${promo.isActive ? 'bg-amber-50 text-amber-600 hover:bg-amber-100' : 'bg-green-50 text-green-600 hover:bg-green-100'}`}
                >
                  {promo.isActive ? <PowerOff size={16} /> : <Power size={16} />}
                </button>
                <button
                  onClick={() => handleDelete(promo.id)}
                  className="flex-1 btn-icon bg-red-50 text-red-600 hover:bg-red-100"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content-lg animate-scale-in max-w-3xl">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200">
              <div>
                <h3 className="text-2xl font-bold text-gray-800">
                  {selectedPromotion ? 'Editar Promoción' : 'Nueva Promoción'}
                </h3>
                <p className="text-sm text-gray-500 mt-1">Define los parámetros de la promoción</p>
              </div>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl font-bold">
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Sección: Información Básica */}
              <div className="bg-gray-50 rounded-xl p-5 space-y-4">
                <h4 className="text-sm font-bold text-gray-700 uppercase tracking-wide flex items-center gap-2">
                  <Tag size={16} />
                  Información Básica
                </h4>
                
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Nombre de la Promoción *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="input-field"
                    placeholder="Ej: Martes de Descuento"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Descripción</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="input-field"
                    rows={3}
                    placeholder="Breve descripción de la promoción..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      <Percent size={14} className="inline mr-1" />
                      Porcentaje de Descuento *
                    </label>
                    <input
                      type="number"
                      value={formData.discountPercent}
                      onChange={(e) => setFormData({ ...formData, discountPercent: parseFloat(e.target.value) || 0 })}
                      className="input-field text-lg font-bold"
                      min="0.01"
                      max="100"
                      step="0.01"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Prioridad</label>
                    <input
                      type="number"
                      value={formData.priority}
                      onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 0 })}
                      className="input-field"
                      min="0"
                      placeholder="0"
                    />
                    <p className="text-xs text-gray-500 mt-1">Mayor = más prioridad</p>
                  </div>
                </div>
              </div>

              {/* Sección: Programación */}
              <div className="bg-primary-50 rounded-xl p-5 space-y-4">
                <h4 className="text-sm font-bold text-gray-700 uppercase tracking-wide flex items-center gap-2">
                  <Calendar size={16} />
                  Programación
                </h4>
                
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Tipo de Programación *</label>
                  <select
                    value={formData.scheduleType}
                    onChange={(e) => setFormData({ ...formData, scheduleType: e.target.value as any })}
                    className="input-field"
                  >
                    <option value="DAILY">🌐 Diario (Todos los días)</option>
                    <option value="WEEKLY">📅 Semanal (Días específicos)</option>
                    <option value="SPECIFIC_DATE">📆 Fecha Específica (Rango)</option>
                  </select>
                </div>

                {formData.scheduleType === 'WEEKLY' && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-3">Selecciona los días de la semana</label>
                    <div className="grid grid-cols-7 gap-3">
                      {weekDays.map(day => (
                        <button
                          key={day.value}
                          type="button"
                          onClick={() => toggleDayOfWeek(day.value)}
                          className={`py-3 px-2 text-sm font-semibold rounded-xl border-2 transition-all shadow-sm ${
                            getDaysOfWeekArray().includes(day.value)
                              ? 'border-primary-600 bg-primary-600 text-white scale-105 shadow-md'
                              : 'border-gray-300 bg-white text-gray-600 hover:border-primary-400 hover:bg-primary-50'
                          }`}
                        >
                          {day.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {formData.scheduleType === 'SPECIFIC_DATE' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Fecha de Inicio *</label>
                      <input
                        type="date"
                        value={formData.startDate || ''}
                        onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                        className="input-field"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Fecha de Fin *</label>
                      <input
                        type="date"
                        value={formData.endDate || ''}
                        onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                        className="input-field"
                        required
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Sección: Estado */}
              <div className="bg-green-50 rounded-xl p-5">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="w-5 h-5 rounded border-gray-300 text-green-600 focus:ring-green-500"
                  />
                  <label htmlFor="isActive" className="text-sm font-semibold text-gray-700">
                    {formData.isActive ? '✅ Activar promoción inmediatamente' : '⏸️ Mantener promoción inactiva'}
                  </label>
                </div>
                <p className="text-xs text-gray-600 mt-2 ml-8">Las promociones inactivas no se aplicarán hasta que las actives manualmente</p>
              </div>

              <div className="flex gap-3 pt-6 border-t border-gray-200 mt-6">
                <Button type="submit" variant="primary" className="flex-1 px-6 py-3" disabled={saving}>
                  {saving ? 'Guardando...' : selectedPromotion ? 'Actualizar' : 'Crear'}
                </Button>
                <Button type="button" variant="secondary" className="px-6 py-3" onClick={() => setShowModal(false)} disabled={saving}>
                  Cancelar
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default PromotionsPage
