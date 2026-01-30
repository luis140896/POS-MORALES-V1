import { Navigate, Outlet } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { RootState } from '@/app/store'

const ProtectedRoute = () => {
  const { isAuthenticated, isLoading } = useSelector((state: RootState) => state.auth)

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-bg">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div>
          <p className="text-gray-600">Cargando...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}

export default ProtectedRoute
