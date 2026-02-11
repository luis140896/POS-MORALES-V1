import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { Menu, Bell, LogOut, User, ChevronDown, Check, AlertTriangle, Info, AlertCircle, XCircle } from 'lucide-react'
import { useState, useRef, useEffect, useCallback } from 'react'
import { RootState, AppDispatch } from '@/app/store'
import { logout } from '@/modules/auth/store/authSlice'
import { notificationService } from '@/core/api/notificationService'
import { Notification } from '@/types'

interface HeaderProps {
  onMenuClick: () => void
}

const SEVERITY_CONFIG: Record<string, { icon: typeof Info; color: string; bg: string }> = {
  INFO: { icon: Info, color: 'text-blue-500', bg: 'bg-blue-50' },
  WARNING: { icon: AlertTriangle, color: 'text-yellow-500', bg: 'bg-yellow-50' },
  ERROR: { icon: AlertCircle, color: 'text-red-500', bg: 'bg-red-50' },
  CRITICAL: { icon: XCircle, color: 'text-red-700', bg: 'bg-red-100' },
}

const timeAgo = (dateStr: string) => {
  const diff = Date.now() - new Date(dateStr).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'Ahora'
  if (minutes < 60) return `Hace ${minutes}m`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `Hace ${hours}h`
  return `Hace ${Math.floor(hours / 24)}d`
}

const Header = ({ onMenuClick }: HeaderProps) => {
  const dispatch = useDispatch<AppDispatch>()
  const navigate = useNavigate()
  const { user } = useSelector((state: RootState) => state.auth)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const notifRef = useRef<HTMLDivElement>(null)

  // Notifications state
  const [unreadCount, setUnreadCount] = useState(0)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loadingNotifs, setLoadingNotifs] = useState(false)

  const fetchUnreadCount = useCallback(async () => {
    try {
      const res = await notificationService.getUnreadCount() as any
      setUnreadCount(res?.count ?? 0)
    } catch {
      // Silently fail - notifications are not critical
    }
  }, [])

  const fetchUnreadList = useCallback(async () => {
    setLoadingNotifs(true)
    try {
      const res = await notificationService.getUnreadList()
      setNotifications(Array.isArray(res) ? res : [])
    } catch {
      setNotifications([])
    } finally {
      setLoadingNotifs(false)
    }
  }, [])

  // Poll unread count every 30s
  useEffect(() => {
    fetchUnreadCount()
    const interval = setInterval(fetchUnreadCount, 30000)
    return () => clearInterval(interval)
  }, [fetchUnreadCount])

  // Fetch list when dropdown opens
  useEffect(() => {
    if (notifOpen) fetchUnreadList()
  }, [notifOpen, fetchUnreadList])

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false)
      }
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setNotifOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleLogout = () => {
    dispatch(logout())
    navigate('/login')
  }

  const handleMarkAsRead = async (id: number) => {
    try {
      await notificationService.markAsRead(id)
      setNotifications(prev => prev.filter(n => n.id !== id))
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch { /* ignore */ }
  }

  const handleMarkAllRead = async () => {
    try {
      await notificationService.markAllAsRead()
      setNotifications([])
      setUnreadCount(0)
    } catch { /* ignore */ }
  }

  const handleNotifClick = (notif: Notification) => {
    handleMarkAsRead(notif.id)
    // Navigate based on reference type
    if (notif.referenceType === 'TABLE') {
      navigate('/tables')
    } else if (notif.referenceType === 'INVOICE') {
      navigate('/invoices')
    } else if (notif.referenceType === 'PRODUCT') {
      navigate('/inventory')
    }
    setNotifOpen(false)
  }

  return (
    <header className="h-14 sm:h-16 bg-white/80 backdrop-blur-lg border-b border-primary-100 flex items-center justify-between px-3 sm:px-6 sticky top-0 z-20">
      <div className="flex items-center gap-2 sm:gap-4">
        <button
          onClick={onMenuClick}
          className="p-2 rounded-xl hover:bg-primary-50 text-gray-600 transition-colors lg:hidden touch-target"
        >
          <Menu className="w-5 h-5" />
        </button>
        <h1 className="text-sm sm:text-lg font-semibold text-gray-800 truncate">
          Sistema de Punto de Venta
        </h1>
      </div>

      <div className="flex items-center gap-4">
        {/* Notifications */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setNotifOpen(!notifOpen)}
            className="p-2 rounded-xl hover:bg-primary-50 text-gray-600 transition-colors relative"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>

          {notifOpen && (
            <div className="absolute right-0 sm:right-0 top-full mt-2 w-[calc(100vw-1.5rem)] sm:w-80 max-w-sm bg-white rounded-xl shadow-hover border border-primary-100 animate-fade-in overflow-hidden -mr-2 sm:mr-0">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                <h3 className="font-semibold text-gray-800 text-sm">Notificaciones</h3>
                {notifications.length > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="text-xs text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1"
                  >
                    <Check size={12} />
                    Marcar todas
                  </button>
                )}
              </div>
              <div className="max-h-80 overflow-y-auto">
                {loadingNotifs ? (
                  <div className="flex items-center justify-center py-8 text-gray-400 text-sm">
                    Cargando...
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                    <Bell size={24} className="mb-2 opacity-30" />
                    <p className="text-sm">Sin notificaciones</p>
                  </div>
                ) : (
                  notifications.map(notif => {
                    const config = SEVERITY_CONFIG[notif.severity] || SEVERITY_CONFIG.INFO
                    const SevIcon = config.icon
                    return (
                      <button
                        key={notif.id}
                        onClick={() => handleNotifClick(notif)}
                        className="w-full flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left border-b border-gray-50 last:border-0"
                      >
                        <div className={`p-1.5 rounded-lg ${config.bg} flex-shrink-0 mt-0.5`}>
                          <SevIcon size={14} className={config.color} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800 truncate">{notif.title}</p>
                          <p className="text-xs text-gray-500 line-clamp-2">{notif.message}</p>
                          <p className="text-[10px] text-gray-400 mt-1">{timeAgo(notif.createdAt)}</p>
                        </div>
                      </button>
                    )
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Menu */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-3 p-2 rounded-xl hover:bg-primary-50 transition-colors"
          >
            <div className="w-9 h-9 bg-gradient-to-r from-primary-600 to-primary-700 rounded-xl flex items-center justify-center text-white font-medium shadow-soft">
              {user?.fullName?.charAt(0) || 'U'}
            </div>
            <div className="hidden md:block text-left">
              <p className="text-sm font-medium text-gray-800">{user?.fullName || 'Usuario'}</p>
              <p className="text-xs text-gray-500">{user?.role || 'Rol'}</p>
            </div>
            <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-hover border border-primary-100 py-2 animate-fade-in">
              <div className="px-4 py-2 border-b border-primary-50">
                <p className="text-sm font-medium text-gray-800">{user?.fullName}</p>
                <p className="text-xs text-gray-500">{user?.email}</p>
              </div>
              <button
                onClick={() => {
                  setDropdownOpen(false)
                  navigate('/settings')
                }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-600 hover:bg-primary-50 transition-colors"
              >
                <User className="w-4 h-4" />
                Mi Perfil
              </button>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Cerrar Sesión
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

export default Header
