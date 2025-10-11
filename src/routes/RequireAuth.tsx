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

export function RequireRole({ role }: { role: 'manager' | 'employee' }) {
  const auth = useAuth();
  const location = useLocation();

  if (!auth.isAuthenticated) {
    const params = new URLSearchParams({ next: location.pathname + location.search, role });
    return <Navigate to={`/login?${params.toString()}`} replace />;
  }

  if (auth.role !== role) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
