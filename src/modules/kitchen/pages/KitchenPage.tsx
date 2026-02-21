import { useState, useEffect, useCallback } from 'react'
import { Clock, ChefHat, CheckCircle2, Loader2, AlertCircle, RefreshCw, UtensilsCrossed } from 'lucide-react'
import toast from 'react-hot-toast'
import { kitchenService, KitchenOrder } from '@/core/api/kitchenService'
import { useSseEvents } from '@/core/hooks/useSseEvents'

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  PENDIENTE: { label: 'Pendiente', color: 'text-orange-700', bg: 'bg-orange-100 border-orange-300', icon: Clock },
  EN_PREPARACION: { label: 'En Preparación', color: 'text-blue-700', bg: 'bg-blue-100 border-blue-300', icon: ChefHat },
  LISTO: { label: 'Listo', color: 'text-green-700', bg: 'bg-green-100 border-green-300', icon: CheckCircle2 },
}

const KitchenPage = () => {
  const [orders, setOrders] = useState<KitchenOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [updatingItem, setUpdatingItem] = useState<number | null>(null)
  const [filter, setFilter] = useState<string>('ALL')

  const fetchOrders = useCallback(async () => {
    try {
      const data = await kitchenService.getPendingOrders()
      setOrders(data)
    } catch {
      toast.error('Error al cargar pedidos')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchOrders()
  }, [fetchOrders])

  // SSE: recargar pedidos automáticamente al recibir eventos
  useSseEvents({
    onNewOrder: () => fetchOrders(),
    onKitchenUpdate: () => fetchOrders(),
    onOrderPaid: () => fetchOrders(),
  })

  // Polling como respaldo cada 15s
  useEffect(() => {
    const interval = setInterval(fetchOrders, 15000)
    return () => clearInterval(interval)
  }, [fetchOrders])

  const handleStatusChange = async (detailId: number, newStatus: string) => {
    setUpdatingItem(detailId)
    try {
      await kitchenService.updateItemStatus(detailId, newStatus)
      await fetchOrders()
      const statusLabel = STATUS_CONFIG[newStatus]?.label || newStatus
      toast.success(`Estado actualizado: ${statusLabel}`)
    } catch {
      toast.error('Error al actualizar estado')
    } finally {
      setUpdatingItem(null)
    }
  }

  const getNextStatus = (current: string): string | null => {
    switch (current) {
      case 'PENDIENTE': return 'EN_PREPARACION'
      case 'EN_PREPARACION': return 'LISTO'
      case 'LISTO': return 'ENTREGADO'
      default: return null
    }
  }

  const getNextStatusLabel = (current: string): string => {
    switch (current) {
      case 'PENDIENTE': return 'Iniciar Preparación'
      case 'EN_PREPARACION': return 'Marcar Listo'
      case 'LISTO': return 'Marcar Entregado'
      default: return ''
    }
  }

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
  }

  const getElapsedMinutes = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime()
    return Math.floor(diff / 60000)
  }

  // Filtrar pedidos
  const filteredOrders = orders.map(order => ({
    ...order,
    items: order.items.filter(item => {
      if (filter === 'ALL') return true
      return item.kitchenStatus === filter
    })
  })).filter(order => order.items.length > 0)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    )
  }

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Encabezado */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-r from-orange-500 to-red-500 rounded-xl flex items-center justify-center">
            <ChefHat className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Cocina</h1>
            <p className="text-sm text-gray-500">{filteredOrders.length} pedido(s) activo(s)</p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Filtros */}
          {['ALL', 'PENDIENTE', 'EN_PREPARACION', 'LISTO'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filter === f
                  ? 'bg-primary-600 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              {f === 'ALL' ? 'Todos' : STATUS_CONFIG[f]?.label || f}
            </button>
          ))}
          <button
            onClick={() => { setLoading(true); fetchOrders() }}
            className="p-2 rounded-lg bg-white border border-gray-200 text-gray-600 hover:bg-gray-100 transition-colors"
            title="Actualizar"
          >
            <RefreshCw size={18} />
          </button>
        </div>
      </div>

      {/* Sin pedidos */}
      {filteredOrders.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
          <UtensilsCrossed size={64} className="mb-4 opacity-30" />
          <p className="text-xl font-medium">Sin pedidos pendientes</p>
          <p className="text-sm mt-1">Los nuevos pedidos aparecerán automáticamente</p>
        </div>
      )}

      {/* Grid de pedidos */}
      <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredOrders.map((order) => {
          const elapsed = getElapsedMinutes(order.createdAt)
          const isPriority = order.isUrgent === true
          const isDelayed = elapsed > 15

          return (
            <div
              key={order.orderId}
              className={`bg-white rounded-2xl shadow-soft border-2 overflow-hidden transition-all ${
                isPriority ? 'border-amber-300' : isDelayed ? 'border-red-300 animate-pulse-slow' : 'border-gray-100'
              }`}
            >
              {/* Cabecera del pedido */}
              <div className={`px-4 py-3 flex items-center justify-between ${
                isPriority ? 'bg-amber-50' : isDelayed ? 'bg-red-50' : 'bg-gray-50'
              }`}>
                <div>
                  <div className="flex items-center gap-2">
                    {order.tableNumber && (
                      <span className="text-lg font-bold text-gray-800">
                        Mesa #{order.tableNumber}
                      </span>
                    )}
                    <span className="text-xs text-gray-500 bg-gray-200 px-2 py-0.5 rounded-full">
                      {order.invoiceNumber}
                    </span>
                    {order.sequenceNumber != null && (
                      <span className="text-xs text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full">
                        Lote #{order.sequenceNumber}
                      </span>
                    )}
                    {isPriority && (
                      <span className="text-xs font-semibold text-amber-800 bg-amber-200 px-2 py-0.5 rounded-full">
                        Prioritario
                      </span>
                    )}
                  </div>
                  {order.waiterName && (
                    <p className="text-xs text-gray-500 mt-0.5">Mesero: {order.waiterName}</p>
                  )}
                  {isPriority && order.urgencyReason && (
                    <p className="text-xs text-amber-800 mt-0.5">Motivo: {order.urgencyReason}</p>
                  )}
                </div>
                <div className="text-right">
                  <div className={`text-sm font-bold ${isPriority ? 'text-amber-700' : isDelayed ? 'text-red-600' : 'text-gray-600'}`}>
                    <Clock size={14} className="inline mr-1" />
                    {formatTime(order.createdAt)}
                  </div>
                  <div className={`text-xs ${isPriority ? 'text-amber-700 font-semibold' : isDelayed ? 'text-red-500 font-bold' : 'text-gray-400'}`}>
                    {elapsed} min
                    {(isPriority || isDelayed) && <AlertCircle size={12} className="inline ml-1" />}
                  </div>
                </div>
              </div>

              {/* Nota general del pedido */}
              {order.orderNotes && (
                <div className="mx-4 mt-2 px-3 py-1.5 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-xs font-medium text-yellow-800">📝 {order.orderNotes}</p>
                </div>
              )}

              {/* Items */}
              <div className="p-4 space-y-3">
                {order.items.map((item) => {
                  const statusConf = STATUS_CONFIG[item.kitchenStatus] || STATUS_CONFIG.PENDIENTE
                  const StatusIcon = statusConf.icon
                  const nextStatus = getNextStatus(item.kitchenStatus)
                  const isUpdating = updatingItem === item.detailId

                  return (
                    <div
                      key={item.detailId}
                      className={`rounded-xl border-2 p-3 transition-all ${statusConf.bg}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-lg font-bold text-gray-800">
                              {Number(item.quantity)}x
                            </span>
                            <span className="font-semibold text-gray-800 break-words whitespace-normal leading-snug">
                              {item.productName}
                            </span>
                          </div>

                          {/* Exigencias/Notas — DESTACADAS */}
                          {item.notes && (
                            <div className="mt-1.5 px-2 py-1 bg-red-50 border border-red-200 rounded-lg">
                              <p className="text-sm font-bold text-red-700">
                                ⚠️ {item.notes}
                              </p>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <StatusIcon size={16} className={statusConf.color} />
                          <span className={`text-xs font-bold ${statusConf.color}`}>
                            {statusConf.label}
                          </span>
                        </div>
                      </div>

                      {/* Botón de siguiente estado */}
                      {nextStatus && (
                        <button
                          onClick={() => handleStatusChange(item.detailId, nextStatus)}
                          disabled={isUpdating}
                          className={`mt-2 w-full py-2 rounded-lg text-sm font-bold text-white transition-all
                            ${item.kitchenStatus === 'PENDIENTE'
                              ? 'bg-blue-600 hover:bg-blue-700'
                              : item.kitchenStatus === 'EN_PREPARACION'
                              ? 'bg-green-600 hover:bg-green-700'
                              : 'bg-gray-600 hover:bg-gray-700'
                            }
                            ${isUpdating ? 'opacity-50 cursor-not-allowed' : 'active:scale-[0.98]'}
                          `}
                        >
                          {isUpdating ? (
                            <Loader2 size={16} className="inline animate-spin mr-1" />
                          ) : null}
                          {getNextStatusLabel(item.kitchenStatus)}
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default KitchenPage
