import { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useSelector, useDispatch } from 'react-redux'
import { RootState, AppDispatch } from './store'
import { fetchSettings } from '@/modules/settings/store/settingsSlice'
import MainLayout from '@/shared/components/layout/MainLayout'
import LoginPage from '@/modules/auth/pages/LoginPage'
import DashboardPage from '@/modules/dashboard/pages/DashboardPage'
import POSPage from '@/modules/pos/pages/POSPage'
import ProductsPage from '@/modules/products/pages/ProductsPage'
import CategoriesPage from '@/modules/categories/pages/CategoriesPage'
import InventoryPage from '@/modules/inventory/pages/InventoryPage'
import InvoicesPage from '@/modules/invoices/pages/InvoicesPage'
import CustomersPage from '@/modules/customers/pages/CustomersPage'
import ReportsPage from '@/modules/reports/pages/ReportsPage'
import UsersPage from '@/modules/users/pages/UsersPage'
import RolesPage from '@/modules/roles/pages/RolesPage'
import PromotionsPage from '@/modules/promotions/pages/PromotionsPage'
import SettingsPage from '@/modules/settings/pages/SettingsPage'
import TableSettingsPage from '@/modules/settings/pages/TableSettingsPage'
import TablesPage from '@/modules/tables/pages/TablesPage'
import KitchenPage from '@/modules/kitchen/pages/KitchenPage'
import ProtectedRoute from '@/core/auth/ProtectedRoute'
import RoleGuard from '@/core/auth/RoleGuard'

// Función para convertir hex a HSL
const hexToHSL = (hex: string): { h: number; s: number; l: number } => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (!result) return { h: 270, s: 70, l: 60 }
  
  let r = parseInt(result[1], 16) / 255
  let g = parseInt(result[2], 16) / 255
  let b = parseInt(result[3], 16) / 255
  
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  let h = 0, s = 0
  const l = (max + min) / 2

  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break
      case g: h = ((b - r) / d + 2) / 6; break
      case b: h = ((r - g) / d + 4) / 6; break
    }
  }
  
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) }
}

function App() {
  const dispatch = useDispatch<AppDispatch>()
  const { isAuthenticated } = useSelector((state: RootState) => state.auth)
  const { theme } = useSelector((state: RootState) => state.settings)

  // Fetch settings from backend when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      dispatch(fetchSettings())
    }
  }, [isAuthenticated, dispatch])

  // Aplicar colores del tema dinámicamente
  useEffect(() => {
    const root = document.documentElement
    const primary = hexToHSL(theme.primaryColor)
    const secondary = hexToHSL(theme.secondaryColor)
    
    // Aplicar variables CSS para el color primario
    root.style.setProperty('--color-primary-50', `hsl(${primary.h}, ${primary.s}%, 97%)`)
    root.style.setProperty('--color-primary-100', `hsl(${primary.h}, ${primary.s}%, 94%)`)
    root.style.setProperty('--color-primary-200', `hsl(${primary.h}, ${primary.s}%, 86%)`)
    root.style.setProperty('--color-primary-300', `hsl(${primary.h}, ${primary.s}%, 76%)`)
    root.style.setProperty('--color-primary-400', `hsl(${primary.h}, ${primary.s}%, 66%)`)
    root.style.setProperty('--color-primary-500', `hsl(${primary.h}, ${primary.s}%, ${primary.l}%)`)
    root.style.setProperty('--color-primary-600', `hsl(${primary.h}, ${primary.s}%, ${Math.max(primary.l - 10, 10)}%)`)
    root.style.setProperty('--color-primary-700', `hsl(${primary.h}, ${primary.s}%, ${Math.max(primary.l - 20, 10)}%)`)
    root.style.setProperty('--color-primary-800', `hsl(${primary.h}, ${primary.s}%, ${Math.max(primary.l - 30, 10)}%)`)
    root.style.setProperty('--color-primary-900', `hsl(${primary.h}, ${primary.s}%, ${Math.max(primary.l - 40, 10)}%)`)
    
    // Aplicar color secundario
    root.style.setProperty('--color-secondary', theme.secondaryColor)
    root.style.setProperty('--color-secondary-light', `hsl(${secondary.h}, ${secondary.s}%, ${Math.min(secondary.l + 20, 90)}%)`)
    root.style.setProperty('--color-secondary-dark', `hsl(${secondary.h}, ${secondary.s}%, ${Math.max(secondary.l - 20, 10)}%)`)
    
    // Aplicar color de fondo
    root.style.setProperty('--color-background', theme.backgroundColor)
    document.body.style.background = `linear-gradient(135deg, ${theme.backgroundColor} 0%, hsl(${primary.h}, ${primary.s}%, 94%) 50%, ${theme.backgroundColor} 100%)`
    
    // Aplicar color de tarjetas
    const cardColor = theme.cardColor || '#ffffff'
    root.style.setProperty('--color-card', cardColor)
    
    // Aplicar color del sidebar
    const sidebarColor = theme.sidebarColor || '#ffffff'
    root.style.setProperty('--color-sidebar', sidebarColor)
  }, [theme.primaryColor, theme.secondaryColor, theme.backgroundColor, theme.cardColor, theme.sidebarColor])

  return (
    <Routes>
      <Route 
        path="/login" 
        element={isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />} 
      />
      
      <Route element={<ProtectedRoute />}>
        <Route element={<MainLayout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route
            path="/pos"
            element={
              <RoleGuard requiredPermissions={['pos.sell']}>
                <POSPage />
              </RoleGuard>
            }
          />
          <Route
            path="/tables"
            element={
              <RoleGuard requiredPermissions={['tables.view']}>
                <TablesPage />
              </RoleGuard>
            }
          />
          <Route
            path="/products"
            element={
              <RoleGuard requiredPermissions={['products.view']}>
                <ProductsPage />
              </RoleGuard>
            }
          />
          <Route
            path="/categories"
            element={
              <RoleGuard requiredPermissions={['categories.view']}>
                <CategoriesPage />
              </RoleGuard>
            }
          />
          <Route
            path="/inventory"
            element={
              <RoleGuard requiredPermissions={['inventory.view']}>
                <InventoryPage />
              </RoleGuard>
            }
          />
          <Route
            path="/invoices"
            element={
              <RoleGuard requiredPermissions={['invoices.view']}>
                <InvoicesPage />
              </RoleGuard>
            }
          />
          <Route
            path="/customers"
            element={
              <RoleGuard requiredPermissions={['customers.view']}>
                <CustomersPage />
              </RoleGuard>
            }
          />
          <Route
            path="/reports"
            element={
              <RoleGuard requiredPermissions={['reports.view']}>
                <ReportsPage />
              </RoleGuard>
            }
          />
          <Route
            path="/users"
            element={
              <RoleGuard requiredPermissions={['users.manage']}>
                <UsersPage />
              </RoleGuard>
            }
          />
          <Route
            path="/roles"
            element={
              <RoleGuard requiredPermissions={['users.manage']}>
                <RolesPage />
              </RoleGuard>
            }
          />
          <Route
            path="/promotions"
            element={
              <RoleGuard requiredPermissions={['promotions.manage']}>
                <PromotionsPage />
              </RoleGuard>
            }
          />
          <Route
            path="/kitchen"
            element={
              <RoleGuard requiredPermissions={['kitchen.view']}>
                <KitchenPage />
              </RoleGuard>
            }
          />
          <Route
            path="/settings"
            element={
              <RoleGuard requiredPermissions={['settings.view']}>
                <SettingsPage />
              </RoleGuard>
            }
          />
          <Route
            path="/settings/tables"
            element={
              <RoleGuard requiredPermissions={['settings.view']}>
                <TableSettingsPage />
              </RoleGuard>
            }
          />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
