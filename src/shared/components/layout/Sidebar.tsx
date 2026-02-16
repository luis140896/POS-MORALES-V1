import { NavLink } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { RootState } from '@/app/store'
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  FolderTree,
  Warehouse,
  FileText,
  Users,
  BarChart3,
  Settings,
  ChevronLeft,
  Store,
  UtensilsCrossed,
  ChefHat,
} from 'lucide-react'

interface SidebarProps {
  isOpen: boolean
  isMobile?: boolean
  onToggle: () => void
  onClose?: () => void
}

const menuItems = [
  { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/pos', icon: ShoppingCart, label: 'Punto de Venta', allowedRoles: ['ADMIN', 'CAJERO', 'SUPERVISOR'] },
  { path: '/tables', icon: UtensilsCrossed, label: 'Mesas', allowedRoles: ['ADMIN', 'CAJERO', 'SUPERVISOR', 'MESERO'] },
  { path: '/kitchen', icon: ChefHat, label: 'Cocina', allowedRoles: ['ADMIN', 'COCINERO', 'SUPERVISOR', 'CAJERO'] },
  { path: '/products', icon: Package, label: 'Productos', allowedRoles: ['ADMIN', 'INVENTARIO'] },
  { path: '/categories', icon: FolderTree, label: 'Categorías', allowedRoles: ['ADMIN', 'INVENTARIO'] },
  { path: '/inventory', icon: Warehouse, label: 'Inventario', allowedRoles: ['ADMIN', 'INVENTARIO'] },
  { path: '/invoices', icon: FileText, label: 'Facturas', allowedRoles: ['ADMIN', 'CAJERO', 'SUPERVISOR'] },
  { path: '/customers', icon: Users, label: 'Clientes', allowedRoles: ['ADMIN', 'CAJERO', 'SUPERVISOR'] },
  { path: '/reports', icon: BarChart3, label: 'Reportes', allowedRoles: ['ADMIN', 'SUPERVISOR', 'REPORTES'] },
  { path: '/users', icon: Users, label: 'Usuarios', allowedRoles: ['ADMIN'] },
  { path: '/settings', icon: Settings, label: 'Configuración', allowedRoles: ['ADMIN', 'SUPERVISOR'] },
]

const Sidebar = ({ isOpen, isMobile = false, onToggle, onClose }: SidebarProps) => {
  const { company } = useSelector((state: RootState) => state.settings)
  const { user } = useSelector((state: RootState) => state.auth)

  const canAccess = (item: any) => {
    if (!item.allowedRoles || item.allowedRoles.length === 0) return true
    const role = (user as any)?.role
    return role ? item.allowedRoles.includes(role) : false
  }

  // On mobile: always show labels when open, slide from left
  const showLabels = isMobile ? isOpen : isOpen

  return (
    <aside
      className={`fixed left-0 top-0 h-full shadow-soft z-30 transition-all duration-300 ${
        isMobile
          ? `w-64 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`
          : (isOpen ? 'w-64' : 'w-20')
      }`}
      style={{ backgroundColor: 'var(--color-sidebar, #ffffff)' }}
    >
      <div className="flex flex-col h-full">
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-primary-100">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 bg-gradient-to-r from-primary-600 to-primary-700 rounded-xl flex items-center justify-center shadow-soft overflow-hidden flex-shrink-0">
              {company.logoUrl ? (
                <img
                  src={company.logoUrl}
                  alt="Logo"
                  className="w-full h-full object-cover"
                />
              ) : (
                <Store className="w-5 h-5 text-white" />
              )}
            </div>
            {showLabels && (
              <span className="font-bold text-gray-800 truncate">
                {company.companyName}
              </span>
            )}
          </div>
          {!isMobile && (
            <button
              onClick={onToggle}
              className="p-2 rounded-lg hover:bg-primary-50 text-gray-500 transition-colors"
            >
              <ChevronLeft className={`w-5 h-5 transition-transform ${!isOpen ? 'rotate-180' : ''}`} />
            </button>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 px-3 overflow-y-auto scrollbar-thin">
          <ul className="space-y-1">
            {menuItems.filter(canAccess).map((item) => (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  onClick={() => isMobile && onClose?.()}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 touch-target ${
                      isActive
                        ? 'bg-gradient-to-r from-primary-600 to-primary-700 text-white shadow-soft'
                        : 'text-gray-600 hover:bg-primary-50 hover:text-primary-700'
                    }`
                  }
                >
                  <item.icon className="w-5 h-5 flex-shrink-0" />
                  {showLabels && <span className="truncate">{item.label}</span>}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        {/* Footer */}
        {showLabels && (
          <div className="p-4 border-t border-primary-100">
            <p className="text-xs text-gray-400 text-center">
              POS Morales v1.0.0
            </p>
          </div>
        )}
      </div>
    </aside>
  )
}

export default Sidebar
