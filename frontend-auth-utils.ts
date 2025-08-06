// Frontend Authentication Utils for React/TypeScript
// Save this as: src/utils/auth.ts in your frontend project

import React from 'react';

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'POLWEL' | 'TRAINING_COORDINATOR' | 'TRAINER' | 'LEARNER';
  status: 'ACTIVE' | 'INACTIVE' | 'PENDING' | 'LOCKED';
  organizationId?: string;
  department?: string;
  division?: string;
  lastLogin?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  success: boolean;
  accessToken: string;
  refreshToken?: string;
  user: User;
  expiresIn: string;
}

export interface AuthError {
  error: string;
  code?: string;
}

class AuthService {
  private apiUrl: string;
  private tokenKey = 'access_token';
  private refreshTokenKey = 'refresh_token';
  private userKey = 'user_data';

  constructor(apiUrl: string = 'http://localhost:3001/api') {
    this.apiUrl = apiUrl;
  }

  // Check if user is authenticated
  isAuthenticated(): boolean {
    const token = this.getToken();
    if (!token) return false;

    // Check if token is expired (basic check)
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Date.now() / 1000;
      return payload.exp > currentTime;
    } catch {
      return false;
    }
  }

  // Get stored token
  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  // Get stored refresh token
  getRefreshToken(): string | null {
    return localStorage.getItem(this.refreshTokenKey);
  }

  // Get stored user data
  getUser(): User | null {
    const userData = localStorage.getItem(this.userKey);
    return userData ? JSON.parse(userData) : null;
  }

  // Login function
  async login(email: string, password: string, rememberMe: boolean = false): Promise<AuthResponse> {
    const response = await fetch(`${this.apiUrl}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password, rememberMe }),
    });

    if (!response.ok) {
      const error: AuthError = await response.json();
      throw new Error(error.error || 'Login failed');
    }

    const data: AuthResponse = await response.json();
    
    // Store tokens and user data
    localStorage.setItem(this.tokenKey, data.accessToken);
    localStorage.setItem(this.userKey, JSON.stringify(data.user));
    
    if (data.refreshToken) {
      localStorage.setItem(this.refreshTokenKey, data.refreshToken);
    }

    return data;
  }

  // Logout function
  async logout(): Promise<void> {
    const token = this.getToken();
    
    if (token) {
      try {
        await fetch(`${this.apiUrl}/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
      } catch (error) {
        console.error('Logout API call failed:', error);
      }
    }

    // Clear local storage
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.refreshTokenKey);
    localStorage.removeItem(this.userKey);
  }

  // Refresh token
  async refreshToken(): Promise<string | null> {
    const refreshToken = this.getRefreshToken();
    
    if (!refreshToken) {
      return null;
    }

    try {
      const response = await fetch(`${this.apiUrl}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken }),
      });

      if (!response.ok) {
        // Refresh token is invalid, clear storage
        this.logout();
        return null;
      }

      const data = await response.json();
      localStorage.setItem(this.tokenKey, data.accessToken);
      return data.accessToken;
    } catch (error) {
      console.error('Token refresh failed:', error);
      this.logout();
      return null;
    }
  }

  // Make authenticated API requests
  async apiRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
    let token = this.getToken();

    // Try to refresh token if expired
    if (!this.isAuthenticated()) {
      token = await this.refreshToken();
      if (!token) {
        throw new Error('Authentication required');
      }
    }

    const response = await fetch(`${this.apiUrl}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    // If token is invalid, try to refresh once
    if (response.status === 401 || response.status === 403) {
      const newToken = await this.refreshToken();
      if (newToken) {
        // Retry with new token
        const retryResponse = await fetch(`${this.apiUrl}${endpoint}`, {
          ...options,
          headers: {
            'Authorization': `Bearer ${newToken}`,
            'Content-Type': 'application/json',
            ...options.headers,
          },
        });
        
        if (!retryResponse.ok) {
          const error = await retryResponse.json();
          throw new Error(error.error || 'Request failed');
        }
        
        return retryResponse.json();
      } else {
        // Can't refresh, redirect to login
        window.location.href = '/login';
        return;
      }
    }

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Request failed');
    }

    return response.json();
  }

  // Check user role
  hasRole(requiredRoles: string[]): boolean {
    const user = this.getUser();
    return user ? requiredRoles.includes(user.role) : false;
  }

  // Check if user can access organization data
  canAccessOrganization(organizationId: string): boolean {
    const user = this.getUser();
    if (!user) return false;
    
    // POLWEL users can access any organization
    if (user.role === 'POLWEL') return true;
    
    // Other users can only access their own organization
    return user.organizationId === organizationId;
  }
}

// Export singleton instance
export const authService = new AuthService();

// React hook for authentication
export function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = React.useState(authService.isAuthenticated());
  const [user, setUser] = React.useState(authService.getUser());

  const login = async (email: string, password: string, rememberMe: boolean = false) => {
    try {
      const response = await authService.login(email, password, rememberMe);
      setIsAuthenticated(true);
      setUser(response.user);
      return response;
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

  const checkAuth = () => {
    const authenticated = authService.isAuthenticated();
    const userData = authService.getUser();
    setIsAuthenticated(authenticated);
    setUser(userData);
    return authenticated;
  };

  return {
    isAuthenticated,
    user,
    login,
    logout,
    checkAuth,
    hasRole: (roles: string[]) => authService.hasRole(roles),
    canAccessOrganization: (orgId: string) => authService.canAccessOrganization(orgId),
    apiRequest: authService.apiRequest.bind(authService),
  };
}
