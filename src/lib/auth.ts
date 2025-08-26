// Authentication service for POLWEL Training Management System
import { toast } from "sonner";

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
  private tokenKey = 'polwel_access_token';
  private refreshTokenKey = 'polwel_refresh_token';
  private userKey = 'polwel_user_data';
  private lastActivityKey = 'polwel_last_activity';
  private refreshTokenTimer: NodeJS.Timeout | null = null;
  private sessionCheckTimer: NodeJS.Timeout | null = null;

  constructor(apiUrl: string = import.meta.env.VITE_API_URL || 'http://localhost:3001/api') {
    this.apiUrl = apiUrl;
    this.initializeSessionManagement();
  }

  private initializeSessionManagement(): void {
    // Only start session management if we're in browser environment
    if (typeof window === 'undefined') return;

    // Check session less frequently to avoid interference
    this.sessionCheckTimer = setInterval(() => {
      this.checkSession();
    }, 5 * 60 * 1000); // Check every 5 minutes instead of 1 minute

    this.trackUserActivity();
    
    // Only schedule refresh if we have a token
    const token = this.getToken();
    if (token) {
      this.scheduleTokenRefresh();
    }
  }

  private trackUserActivity(): void {
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    const updateActivity = () => {
      if (this.isAuthenticated()) {
        localStorage.setItem(this.lastActivityKey, Date.now().toString());
      }
    };

    events.forEach(event => {
      document.addEventListener(event, updateActivity, true);
    });
  }

  private checkSession(): void {
    const token = this.getToken();
    if (!token) {
      return; // No token, but don't auto-redirect
    }

    // First check if token is actually expired
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Date.now() / 1000;
      
      if (payload.exp && payload.exp <= currentTime) {
        console.log('Session check: Token is expired');
        this.handleSessionExpiry();
        return;
      }
    } catch (error) {
      console.error('Error checking token expiry:', error);
      this.handleSessionExpiry();
      return;
    }

    // Check inactivity timeout
    const lastActivity = localStorage.getItem(this.lastActivityKey);
    if (lastActivity) {
      const timeSinceLastActivity = Date.now() - parseInt(lastActivity);
      const maxInactivity = 60 * 60 * 1000; // 60 minutes

      if (timeSinceLastActivity > maxInactivity) {
        console.log('Session expired due to inactivity');
        this.handleSessionExpiry();
        return;
      }
    }

    // Only refresh if token is really close to expiry
    if (token && this.isTokenNearExpiry(token)) {
      console.log('Token near expiry, refreshing...');
      this.refreshToken().catch(err => {
        console.error('Failed to refresh token:', err);
        this.handleSessionExpiry();
      });
    }
  }

  private handleSessionExpiry(): void {
    console.log('Handling session expiry...');
    this.clearTokens();
    
    // Show toast notification
    toast.error('Your session has expired. Please log in again.');
    
    // Only redirect if not already on login page
    if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
      console.log('Redirecting to login page...');
      // Use replace to avoid back button issues
      window.location.replace('/login');
    }
  }

  private isTokenNearExpiry(token: string): boolean {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Date.now() / 1000;
      const timeUntilExpiry = payload.exp - currentTime;
      // Only refresh when really close (2 minutes instead of 5)
      return timeUntilExpiry < 120; // 2 minutes
    } catch {
      return true;
    }
  }

  private scheduleTokenRefresh(): void {
    const token = this.getToken();
    if (!token) return;

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Date.now() / 1000;
      const timeUntilRefresh = (payload.exp - currentTime - 300) * 1000;

      if (timeUntilRefresh > 0) {
        this.refreshTokenTimer = setTimeout(() => {
          this.refreshToken().then(() => {
            this.scheduleTokenRefresh();
          });
        }, timeUntilRefresh);
      }
    } catch (error) {
      console.error('Error scheduling token refresh:', error);
    }
  }

  private clearTimers(): void {
    if (this.refreshTokenTimer) {
      clearTimeout(this.refreshTokenTimer);
      this.refreshTokenTimer = null;
    }
    if (this.sessionCheckTimer) {
      clearInterval(this.sessionCheckTimer);
      this.sessionCheckTimer = null;
    }
  }

  isAuthenticated(): boolean {
    const token = this.getToken();
    const user = this.getUser();
    
    if (!token || !user) return false;

    try {
      const parts = token.split('.');
      if (parts.length !== 3) return false;

      const payload = JSON.parse(atob(parts[1]));
      const currentTime = Date.now() / 1000;

      // Check if token is expired
      if (!payload.exp || payload.exp <= currentTime) {
        console.log('Token expired, clearing session...');
        this.handleSessionExpiry();
        return false;
      }

      // Check if user ID matches
      if (payload.userId && payload.userId !== user.id) {
        console.warn('Token user ID mismatch');
        this.clearTokens();
        return false;
      }

      // Check if user is active
      if (user.status !== 'ACTIVE') {
        console.warn('User not active:', user.status);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Token validation error:', error);
      this.clearTokens();
      return false;
    }
  }

  private clearTokens(): void {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.refreshTokenKey);
    localStorage.removeItem(this.userKey);
    localStorage.removeItem(this.lastActivityKey);
    this.clearTimers();
  }

  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  getRefreshToken(): string | null {
    return localStorage.getItem(this.refreshTokenKey);
  }

  getUser(): User | null {
    const userData = localStorage.getItem(this.userKey);
    return userData ? JSON.parse(userData) : null;
  }

  async login(email: string, password: string, rememberMe: boolean = false): Promise<AuthResponse> {
    try {
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
      
      localStorage.setItem(this.tokenKey, data.accessToken);
      localStorage.setItem(this.userKey, JSON.stringify(data.user));
      localStorage.setItem(this.lastActivityKey, Date.now().toString());
      
      if (data.refreshToken) {
        localStorage.setItem(this.refreshTokenKey, data.refreshToken);
      }

      this.scheduleTokenRefresh();

      toast.success(`Welcome back, ${data.user.name}!`);
      return data;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Login failed';
      toast.error(errorMessage);
      throw error;
    }
  }

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

    this.clearTokens();
    toast.success('Logged out successfully');
  }

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
        this.clearTokens();
        return null;
      }

      const data = await response.json();
      
      localStorage.setItem(this.tokenKey, data.accessToken);
      localStorage.setItem(this.lastActivityKey, Date.now().toString());
      
      if (data.user) {
        localStorage.setItem(this.userKey, JSON.stringify(data.user));
      }

      this.scheduleTokenRefresh();
      
      return data.accessToken;
    } catch (error) {
      console.error('Token refresh failed:', error);
      this.clearTokens();
      return null;
    }
  }

  async apiRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
    let token = this.getToken();
    const user = this.getUser();

    // If no token or user, redirect to login
    if (!token || !user) {
      this.handleSessionExpiry();
      throw new Error('Authentication required - no token or user data');
    }

    // First attempt with current token
    try {
      const response = await fetch(`${this.apiUrl}${endpoint}`, {
        ...options,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      // If 401/403, try to refresh token once
      if (response.status === 401 || response.status === 403) {
        const errorData = await response.json().catch(() => ({ error: 'Authentication error' }));
        
        console.log('Token invalid, attempting refresh...', errorData);
        
        // Check if it's specifically a token expiration error
        if (errorData.code === 'TOKEN_EXPIRED' || errorData.error?.includes('expired')) {
          console.log('Token expired, attempting refresh...');
          const newToken = await this.refreshToken();
          
          if (newToken) {
            console.log('Token refreshed successfully, retrying request...');
            const retryResponse = await fetch(`${this.apiUrl}${endpoint}`, {
              ...options,
              headers: {
                'Authorization': `Bearer ${newToken}`,
                'Content-Type': 'application/json',
                ...options.headers,
              },
            });
            
            if (retryResponse.ok) {
              return retryResponse.json();
            } else {
              const retryError = await retryResponse.json().catch(() => ({ error: 'Request failed after token refresh' }));
              console.error('Request failed after token refresh:', retryError);
              this.handleSessionExpiry();
              throw new Error('Session expired - please login again');
            }
          } else {
            console.error('Token refresh failed, redirecting to login');
            this.handleSessionExpiry();
            throw new Error('Session expired - please login again');
          }
        } else {
          // Not a token expiration error, but still auth error
          console.error('Authentication error:', errorData);
          this.handleSessionExpiry();
          throw new Error('Authentication failed - please login again');
        }
      }

      if (response.ok) {
        return response.json();
      } else {
        const error = await response.json().catch(() => ({ error: 'Request failed' }));
        throw new Error(error.message || error.error || `Request failed with status ${response.status}`);
      }
    } catch (error) {
      // Check if it's a network/connection error vs auth error
      if (error instanceof Error) {
        if (error.message.includes('fetch') || error.message.includes('network')) {
          throw new Error('Network error - please check your connection');
        }
        if (error.message.includes('expired') || error.message.includes('Authentication')) {
          // Already handled above, just re-throw
          throw error;
        }
      }
      throw error;
    }
  }

  hasRole(requiredRoles: string[]): boolean {
    const user = this.getUser();
    return user ? requiredRoles.includes(user.role) : false;
  }

  canAccessOrganization(organizationId: string): boolean {
    const user = this.getUser();
    if (!user) return false;
    
    if (user.role === 'POLWEL') return true;
    return user.organizationId === organizationId;
  }

  // Method to check if current token is expired
  isTokenExpired(): boolean {
    const token = this.getToken();
    if (!token) return true;

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Date.now() / 1000;
      return !payload.exp || payload.exp <= currentTime;
    } catch {
      return true;
    }
  }

  // Method to get token expiration time
  getTokenExpirationTime(): Date | null {
    const token = this.getToken();
    if (!token) return null;

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.exp ? new Date(payload.exp * 1000) : null;
    } catch {
      return null;
    }
  }

  destroy(): void {
    this.clearTimers();
  }
}

export const authService = new AuthService();
