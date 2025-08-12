import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { authService, User } from '@/lib/auth';

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  logout: () => Promise<void>;
  loading: boolean;
  hasRole: (roles: string[]) => boolean;
  canAccessOrganization: (orgId: string) => boolean;
  apiRequest: (endpoint: string, options?: RequestInit) => Promise<any>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Check authentication status on mount
  useEffect(() => {
    const checkAuth = () => {
      const authenticated = authService.isAuthenticated();
      const userData = authService.getUser();
      
      setIsAuthenticated(authenticated);
      setUser(userData);
      setLoading(false);
    };

    checkAuth();
  }, []);

  const login = async (email: string, password: string, rememberMe: boolean = false) => {
    try {
      const response = await authService.login(email, password, rememberMe);
      setIsAuthenticated(true);
      setUser(response.user);
    } catch (error) {
      setIsAuthenticated(false);
      setUser(null);
      throw error;
    }
  };

  const logout = async () => {
    await authService.logout();
    setIsAuthenticated(false);
    setUser(null);
  };

  const hasRole = (roles: string[]) => authService.hasRole(roles);
  const canAccessOrganization = (orgId: string) => authService.canAccessOrganization(orgId);
  const apiRequest = authService.apiRequest.bind(authService);

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        user,
        login,
        logout,
        loading,
        hasRole,
        canAccessOrganization,
        apiRequest,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
