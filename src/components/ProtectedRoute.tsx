import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, Lock, Building } from "lucide-react";
import Forbidden from "@/pages/Forbidden";
import { toCanonicalPermission } from "@/lib/permissionMapping";

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRoles?: string[];
  organizationId?: string;
  requiredPermissions?: string[];
}

export function ProtectedRoute({ children, requiredRoles = [], organizationId, requiredPermissions = [] }: ProtectedRouteProps) {
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

  // Permission checks (client-side convenience; backend remains source of truth)
  if (requiredPermissions.length > 0) {
    const raw = (user as any)?.permissions;
    // Only enforce on the client if we actually have a permissions list.
    // If not present, let the backend enforce so we don't block valid users by mistake.
    if (Array.isArray(raw) && raw.length > 0) {
      const userPerms = new Set(
        raw
          .map((perm: any) => {
            const permName = typeof perm === "string" ? perm : perm?.permissionName;
            if (!permName) {
              return null;
            }
            return toCanonicalPermission(permName).toLowerCase();
          })
          .filter((value): value is string => Boolean(value))
      );

      const needs = requiredPermissions.map((perm) => toCanonicalPermission(perm).toLowerCase());
      const ok = needs.every((p) => userPerms.has(p));
      if (!ok) return <Navigate to="/403" replace />;
    }
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
