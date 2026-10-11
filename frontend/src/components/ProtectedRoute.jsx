import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function getHomeRouteForRole(role) {
  const normalizedRole = String(role || '').toUpperCase();
  if (normalizedRole === 'ADMIN') return '/admin';
  if (normalizedRole === 'DRIVER') return '/driver';
  if (normalizedRole === 'HOSPITAL_MANAGER') return '/hospital-manager';
  if (normalizedRole === 'PATIENT') return '/dashboard';
  return '/login';
}

export default function ProtectedRoute({ children, roles }) {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const role = String(user.role || '').toUpperCase();
  const allowedRoles = roles?.map((item) => String(item).toUpperCase());

  if (allowedRoles && !allowedRoles.includes(role)) {
    return <Navigate to={getHomeRouteForRole(role)} replace />;
  }

  return children;
}
