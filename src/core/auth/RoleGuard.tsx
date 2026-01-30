import { Navigate } from 'react-router-dom'
import { ReactNode } from 'react'
import { useSelector } from 'react-redux'
import { RootState } from '@/app/store'

interface RoleGuardProps {
  allowedRoles?: string[]
  requiredPermissions?: string[]
  children: ReactNode
}

const RoleGuard = ({ allowedRoles, requiredPermissions, children }: RoleGuardProps) => {
  const { user } = useSelector((state: RootState) => state.auth)

  const role = user?.role
  const permissions = user?.permissions || []

  const roleOk = !allowedRoles || allowedRoles.length === 0 || (role ? allowedRoles.includes(role) : false)
  const permOk =
    !requiredPermissions ||
    requiredPermissions.length === 0 ||
    requiredPermissions.every((p) => permissions.includes(p))

  if (!roleOk || !permOk) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}

export default RoleGuard
