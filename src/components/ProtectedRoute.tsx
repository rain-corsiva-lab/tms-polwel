import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, Lock, Building } from "lucide-react";

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRoles?: string[];
  organizationId?: string;
}

export function ProtectedRoute({ children, requiredRoles = [], organizationId }: ProtectedRouteProps) {
  const { isAuthenticated, user, loading, hasRole, canAccessOrganization } = useAuth();
  const location = useLocation();

  // Show loading state while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  // Role checks
  if (requiredRoles && requiredRoles.length > 0 && !hasRole(requiredRoles)) {
    return <Navigate to="/403" replace />;
  }

  // Organization checks
  if (organizationId && !canAccessOrganization(organizationId)) {
    return <Navigate to="/403" replace />;
  }

  // All checks passed, render the protected content
  return <>{children}</>;
}

// Role-based component wrapper
interface RoleBasedProps {
  children: ReactNode;
  requiredRoles: string[];
  fallback?: ReactNode;
}

export function RoleBased({ children, requiredRoles, fallback = null }: RoleBasedProps) {
  const { hasRole } = useAuth();

  if (!hasRole(requiredRoles)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
