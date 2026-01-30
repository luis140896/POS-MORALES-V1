import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { Menu, Bell, LogOut, User, ChevronDown } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { RootState, AppDispatch } from '@/app/store'
import { logout } from '@/modules/auth/store/authSlice'

interface HeaderProps {
  onMenuClick: () => void
}

const Header = ({ onMenuClick }: HeaderProps) => {
  const dispatch = useDispatch<AppDispatch>()
  const navigate = useNavigate()
  const { user } = useSelector((state: RootState) => state.auth)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleLogout = () => {
    dispatch(logout())
    navigate('/login')
  }

  return (
    <header className="h-16 bg-white/80 backdrop-blur-lg border-b border-primary-100 flex items-center justify-between px-6 sticky top-0 z-20">
      <div className="flex items-center gap-4">
        <button
          onClick={onMenuClick}
          className="p-2 rounded-xl hover:bg-primary-50 text-gray-600 transition-colors lg:hidden"
        >
          <Menu className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-semibold text-gray-800">
          Sistema de Punto de Venta
        </h1>
      </div>

      <div className="flex items-center gap-4">
        {/* Notifications */}
        <button className="p-2 rounded-xl hover:bg-primary-50 text-gray-600 transition-colors relative">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
        </button>

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
