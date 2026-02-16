import { useEffect, useRef, useCallback } from 'react'

type SseEventHandler = (data: any) => void

interface UseSseEventsOptions {
  onNewOrder?: SseEventHandler
  onKitchenUpdate?: SseEventHandler
  onOrderPaid?: SseEventHandler
  onConnected?: () => void
  enabled?: boolean
}

export const useSseEvents = (options: UseSseEventsOptions) => {
  const { onNewOrder, onKitchenUpdate, onOrderPaid, onConnected, enabled = true } = options
  const eventSourceRef = useRef<EventSource | null>(null)
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const connect = useCallback(() => {
    if (!enabled) return

    const token = localStorage.getItem('accessToken')
    if (!token) return

    // SSE no soporta headers custom, enviamos token como query param
    const baseUrl = '/api/sse/events'
    const url = `${baseUrl}?token=${encodeURIComponent(token)}`

    const es = new EventSource(url)
    eventSourceRef.current = es

    es.addEventListener('connected', () => {
      onConnected?.()
    })

    es.addEventListener('new_order', (e) => {
      try {
        const data = JSON.parse(e.data)
        onNewOrder?.(data)
      } catch { /* ignorar */ }
    })

    es.addEventListener('kitchen_update', (e) => {
      try {
        const data = JSON.parse(e.data)
        onKitchenUpdate?.(data)
      } catch { /* ignorar */ }
    })

    es.addEventListener('order_paid', (e) => {
      try {
        const data = JSON.parse(e.data)
        onOrderPaid?.(data)
      } catch { /* ignorar */ }
    })

    es.onerror = () => {
      es.close()
      eventSourceRef.current = null
      // Reconectar después de 5 segundos
      reconnectTimeoutRef.current = setTimeout(() => {
        connect()
      }, 5000)
    }
  }, [enabled, onNewOrder, onKitchenUpdate, onOrderPaid, onConnected])

  useEffect(() => {
    connect()
    return () => {
      eventSourceRef.current?.close()
      eventSourceRef.current = null
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
    }
  }, [connect])

  return {
    isConnected: !!eventSourceRef.current,
  }
}
