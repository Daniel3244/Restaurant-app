import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function RequireAuth() {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    const params = new URLSearchParams({ next: location.pathname + location.search });
    return <Navigate to={`/login?${params.toString()}`} replace />;
  }

  return <Outlet />;
}

export function RequireRole({ roles }: { roles: Array<'manager' | 'employee'> }) {
  const auth = useAuth();
  const location = useLocation();

  const allowedRoles = roles;

  if (!auth.isAuthenticated) {
    const params = new URLSearchParams({ next: location.pathname + location.search });
    if (allowedRoles.length > 0) {
      params.set('roles', allowedRoles.join(','));
      params.set('role', allowedRoles[0]);
    }
    return <Navigate to={`/login?${params.toString()}`} replace />;
  }

  if (!auth.role || !allowedRoles.includes(auth.role)) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
