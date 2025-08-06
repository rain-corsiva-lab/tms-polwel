// Protected Route Component for React
// Save this as: src/components/ProtectedRoute.tsx in your frontend project

import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../utils/auth';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRoles?: string[];
  fallbackPath?: string;
  organizationId?: string;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredRoles = [],
  fallbackPath = '/login',
  organizationId
}) => {
  const { isAuthenticated, user, hasRole, canAccessOrganization } = useAuth();
  const location = useLocation();

  // Check if user is authenticated
  if (!isAuthenticated || !user) {
    // Redirect to login with return URL
    return <Navigate to={fallbackPath} state={{ from: location }} replace />;
  }

  // Check if user account is active
  if (user.status !== 'ACTIVE') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100">
              <svg className="h-6 w-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h3 className="mt-2 text-sm font-medium text-gray-900">Account Pending</h3>
            <p className="mt-1 text-sm text-gray-500">
              Your account is {user.status.toLowerCase()}. Please contact an administrator.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Check role-based access
  if (requiredRoles.length > 0 && !hasRole(requiredRoles)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
              <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636M5.636 18.364l12.728-12.728" />
              </svg>
            </div>
            <h3 className="mt-2 text-sm font-medium text-gray-900">Access Denied</h3>
            <p className="mt-1 text-sm text-gray-500">
              You don't have permission to access this page.
            </p>
            <p className="mt-1 text-xs text-gray-400">
              Required: {requiredRoles.join(', ')} | Your role: {user.role}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Check organization-specific access
  if (organizationId && !canAccessOrganization(organizationId)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
              <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-2m-2 0H7m5 0v-5a2 2 0 00-2-2H7a2 2 0 00-2 2v5m5 0v-2a1 1 0 00-1-1h-1a1 1 0 00-1 1v2m5-10V7a2 2 0 00-2-2H7a2 2 0 00-2 2v3m10 0h-5m5 0h2" />
              </svg>
            </div>
            <h3 className="mt-2 text-sm font-medium text-gray-900">Organization Access Denied</h3>
            <p className="mt-1 text-sm text-gray-500">
              You don't have access to this organization's data.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // All checks passed, render the protected content
  return <>{children}</>;
};

// Role-based component wrapper
interface RoleBasedProps {
  children: React.ReactNode;
  requiredRoles: string[];
  fallback?: React.ReactNode;
}

export const RoleBased: React.FC<RoleBasedProps> = ({
  children,
  requiredRoles,
  fallback = null
}) => {
  const { hasRole } = useAuth();

  if (!hasRole(requiredRoles)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};

// Example usage component
export const ExampleUsage: React.FC = () => {
  return (
    <div className="space-y-4">
      {/* Admin-only content */}
      <RoleBased requiredRoles={['POLWEL']}>
        <div className="bg-red-50 border border-red-200 rounded p-4">
          <h3 className="text-red-800 font-medium">Admin Only Section</h3>
          <p className="text-red-600">This content is only visible to POLWEL users.</p>
        </div>
      </RoleBased>

      {/* Training Coordinator and Admin content */}
      <RoleBased requiredRoles={['POLWEL', 'TRAINING_COORDINATOR']}>
        <div className="bg-blue-50 border border-blue-200 rounded p-4">
          <h3 className="text-blue-800 font-medium">Management Section</h3>
          <p className="text-blue-600">Visible to POLWEL and Training Coordinators.</p>
        </div>
      </RoleBased>

      {/* All authenticated users */}
      <div className="bg-green-50 border border-green-200 rounded p-4">
        <h3 className="text-green-800 font-medium">General Section</h3>
        <p className="text-green-600">Visible to all authenticated users.</p>
      </div>
    </div>
  );
};
