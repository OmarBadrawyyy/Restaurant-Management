import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface ProtectedRouteProps {
  requiredRole?: string | string[];
}

/**
 * ProtectedRoute component that checks if a user is authenticated
 * and optionally verifies user role/permissions before allowing access
 */
const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ requiredRole }) => {
  const { currentUser, isLoading, isAuthenticated } = useAuth();
  const location = useLocation();

  // If auth is still loading, show loading indicator
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // If not authenticated, redirect to login
  if (!isAuthenticated) {
    // Redirect to login and pass the attempted URL as state for potential redirect back after login
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  // If roles are required, check user role
  if (requiredRole && currentUser) {
    const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
    
    if (!roles.includes(currentUser.role)) {
      // User doesn't have the required role
      return <Navigate to="/unauthorized" replace />;
    }
  }

  // User is authenticated and has required roles (if any)
  return <Outlet />;
};

export default ProtectedRoute; 