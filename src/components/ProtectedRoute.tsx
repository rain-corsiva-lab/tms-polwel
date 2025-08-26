import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, Lock, Building } from 'lucide-react';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRoles?: string[];
  organizationId?: string;
}

export function ProtectedRoute({ 
  children, 
  requiredRoles = [], 
  organizationId 
}: ProtectedRouteProps) {
  const location = useLocation();
  
  // Mock auth data - allow access for demo
  const isAuthenticated = true;
  const user = { name: 'Demo User', role: 'POLWEL', organizationId: 'demo-org', status: 'ACTIVE' };
  const loading = false;
  const hasRole = (roles: string[]) => roles.length === 0 || roles.includes('POLWEL');
  const canAccessOrganization = (orgId: string) => true;

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

  // Check if user account is active
  if (user.status !== 'ACTIVE') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <AlertTriangle className="w-12 h-12 mx-auto text-yellow-500 mb-2" />
            <CardTitle className="text-lg">Account Status</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-2">
            <p className="text-muted-foreground">
              Your account is currently <strong>{user.status.toLowerCase()}</strong>.
            </p>
            <p className="text-sm text-muted-foreground">
              Please contact your system administrator for assistance.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Check role-based access
  if (requiredRoles.length > 0 && !hasRole(requiredRoles)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <Lock className="w-12 h-12 mx-auto text-red-500 mb-2" />
            <CardTitle className="text-lg">Access Denied</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-2">
            <p className="text-muted-foreground">
              You don't have permission to access this page.
            </p>
            <p className="text-xs text-muted-foreground">
              Required: {requiredRoles.join(', ')} | Your role: {user.role}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Check organization-specific access
  if (organizationId && !canAccessOrganization(organizationId)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <Building className="w-12 h-12 mx-auto text-red-500 mb-2" />
            <CardTitle className="text-lg">Organization Access Denied</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-muted-foreground">
              You don't have access to this organization's data.
            </p>
          </CardContent>
        </Card>
      </div>
    );
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
  // Mock role check - allow access for demo
  const hasRole = (roles: string[]) => roles.length === 0 || roles.includes('POLWEL');

  if (!hasRole(requiredRoles)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
