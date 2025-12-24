import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

/**
 * Route protection based on roles
 * 
 * Usage:
 * <RoleProtectedRoute requiredRole="admin">...</RoleProtectedRoute>
 * <RoleProtectedRoute allowedRoles={['admin', 'manager']}>...</RoleProtectedRoute>
 * 
 * @param {React.ReactNode} children - The component to render if authorized
 * @param {string} requiredRole - Single required role (mutually exclusive with allowedRoles)
 * @param {Array<string>} allowedRoles - Array of allowed roles (mutually exclusive with requiredRole)
 */
export default function RoleProtectedRoute({ children, requiredRole, allowedRoles }) {
  const { user, isAuthenticated, loading, getUserRole, hasRole, hasAnyRole } = useAuth();

  // Show loading state
  if (loading) {
    return <div style={{ textAlign: 'center', marginTop: '50px' }}>Loading...</div>;
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  const userRole = getUserRole();

  // Check authorization based on props
  let isAuthorized = false;

  if (requiredRole) {
    // Single role requirement
    isAuthorized = hasRole(requiredRole);
  } else if (allowedRoles && Array.isArray(allowedRoles) && allowedRoles.length > 0) {
    // Multiple roles allowed
    isAuthorized = hasAnyRole(allowedRoles);
  } else {
    // No role requirement specified - allow access (shouldn't happen, but be safe)
    console.warn('RoleProtectedRoute: No role requirement specified. Allowing access.');
    isAuthorized = true;
  }

  if (!isAuthorized) {
    // Redirect to dashboard with error message
    return (
      <Navigate 
        to="/dashboard" 
        replace 
        state={{ 
          error: `Access denied. This page requires ${requiredRole || allowedRoles?.join(' or ') || 'specific'} role. Your role: ${userRole}` 
        }} 
      />
    );
  }

  return children;
}
