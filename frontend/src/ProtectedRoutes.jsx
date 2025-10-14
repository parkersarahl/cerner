// src/components/ProtectedRoute.js
import React from 'react';
import { Navigate } from 'react-router-dom';

/**
 * Protected Route Component
 * Checks if user is authenticated and has required role
 * 
 * @param {React.ReactNode} children - Component to render if authorized
 * @param {string[]} requiredRoles - Array of roles that can access (optional)
 */
const ProtectedRoute = ({ children, requiredRoles = [] }) => {
  // Check if user is authenticated
  const token = localStorage.getItem('token');
  
  if (!token) {
    // Not authenticated - redirect to login
    return <Navigate to="/login" replace />;
  }

  // If specific roles are required, check them
  if (requiredRoles.length > 0) {
    try {
      const roles = JSON.parse(localStorage.getItem('roles') || '[]');
      
      // Check if user has at least one of the required roles
      const hasRequiredRole = requiredRoles.some(role => roles.includes(role));
      
      if (!hasRequiredRole) {
        // User doesn't have required role - show unauthorized page
        return (
          <div className="min-h-screen flex items-center justify-center bg-gray-100">
            <div className="bg-white p-8 rounded-lg shadow-md max-w-md">
              <h2 className="text-2xl font-bold text-red-600 mb-4">Access Denied</h2>
              <p className="text-gray-700 mb-4">
                You do not have permission to access this page.
              </p>
              <p className="text-sm text-gray-600 mb-4">
                Required roles: {requiredRoles.join(', ')}
              </p>
              <button
                onClick={() => window.location.href = '/frontpage'}
                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
              >
                Go to Home
              </button>
            </div>
          </div>
        );
      }
    } catch (error) {
      console.error('Error checking roles:', error);
      return <Navigate to="/login" replace />;
    }
  }

  // User is authenticated and authorized
  return children;
};

export default ProtectedRoute;


/**
 * Higher-level component that combines auth check with role check
 * 
 * Example usage:
 * <ProtectedRoute requiredRoles={['provider', 'admin']}>
 *   <EpicSearch />
 * </ProtectedRoute>
 */