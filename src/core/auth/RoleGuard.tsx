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

  const roleName =
    typeof (user as any)?.role === 'string' ? ((user as any)?.role as string) : ((user as any)?.role?.name as string)

  const permissions =
    ((user as any)?.permissions as string[] | undefined) || ((user as any)?.role?.permissions as string[] | undefined) || []

  if (roleName === 'ADMIN') {
    return <>{children}</>
  }

  const roleOk =
    !allowedRoles || allowedRoles.length === 0 || (roleName ? allowedRoles.includes(roleName) : false)
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
