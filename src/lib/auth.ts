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
  permissions?: string[];
}

export interface AuthResponse {
  success: boolean;
  accessToken: string;
  refreshToken?: string;
  user: User;
  expiresIn: string;
}

export interface MfaChallengeResponse {
  success: boolean;
  mfaRequired: true;
  challengeId: string;
  expiresAt: string;
  maskedEmail: string;
  resendCooldownSeconds: number;
  emailDelivery?: boolean;
  resendCount?: number;
}

export interface PendingMfaChallenge extends MfaChallengeResponse {
  email: string;
  rememberMe: boolean;
  createdAt: string;
  resendAvailableAt: string;
}

export type LoginResult = AuthResponse | PendingMfaChallenge;

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
  private pendingMfaKey = 'polwel_pending_mfa';
  private refreshTokenTimer: NodeJS.Timeout | null = null;
  private sessionCheckTimer: NodeJS.Timeout | null = null;
  private suppressExpiryRedirectUntil: number | null = null;

  constructor(apiUrl: string = import.meta.env.VITE_API_URL || 'http://localhost:3001/api') {
    this.apiUrl = apiUrl;
    this.initializeSessionManagement();
  }

  private initializeSessionManagement(): void {
    // Only start session management if we're in browser environment
    if (typeof window === 'undefined') return;

    // TEMPORARILY DISABLE SESSION CHECKING TO DEBUG LOGIN ISSUES
    console.log('Session management temporarily disabled');
    
    // // Check session less frequently to avoid interference
    // this.sessionCheckTimer = setInterval(() => {
    //   this.checkSession();
    // }, 5 * 60 * 1000); // Check every 5 minutes instead of 1 minute

    this.trackUserActivity();
    
    // Only schedule refresh if we have a token
    const token = this.getToken();
    if (token) {
      this.scheduleTokenRefresh();

      // Suppress automatic expiry redirects for a short grace period
      try {
        this.suppressExpiryRedirectUntil = Date.now() + 3000; // 3 seconds
      } catch (e) {}
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
    // If we recently logged in, skip immediate redirect to avoid race conditions
    if (this.suppressExpiryRedirectUntil && Date.now() < this.suppressExpiryRedirectUntil) {
      console.log('Skipping session expiry redirect due to recent login');
      return;
    }

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

      // Check if token is expired - BUT DON'T AUTO-LOGOUT FOR DEBUGGING
      if (!payload.exp || payload.exp <= currentTime) {
        console.log('Token expired, but not auto-logging out for debugging...');
        // this.handleSessionExpiry();
        return false;
      }

      // Check if user ID matches
      if (payload.userId && payload.userId !== user.id) {
        console.warn('Token user ID mismatch');
        // this.clearTokens();
        return false;
      }

      // TEMPORARILY DISABLE STATUS CHECK - ALLOW ALL USERS
      // Check if user is active
      // if (user.status !== 'ACTIVE') {
      //   console.warn('User not active:', user.status);
      //   return false;
      // }

      return true;
    } catch (error) {
      console.error('Token validation error:', error);
      // this.clearTokens();
      return false;
    }
  }

  private clearTokens(): void {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.refreshTokenKey);
    localStorage.removeItem(this.userKey);
    localStorage.removeItem(this.lastActivityKey);
    localStorage.removeItem(this.pendingMfaKey);
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

  /**
   * Refresh user data from backend to get updated permissions
   * Call this after permission changes to update the UI immediately
   */
  async refreshUser(): Promise<User> {
    // Fetch user profile
    const profileResponse = await this.apiRequest('/profile');
    const profileData = profileResponse.data || profileResponse;
    
    // Fetch user permissions separately
    let permissions: string[] = [];
    try {
      const permResponse = await this.apiRequest(`/polwel-users/${profileData.id}`);
      const userDetail = permResponse.user || permResponse.data || permResponse;
      if (userDetail.permissions && Array.isArray(userDetail.permissions)) {
        permissions = userDetail.permissions
          .filter((p: any) => p.granted !== false)
          .map((p: any) => typeof p === 'string' ? p : p.permissionName)
          .filter(Boolean);
      }
    } catch (e) {
      console.warn('Failed to fetch permissions during refresh:', e);
      // Keep existing permissions if fetch fails
      const currentUser = this.getUser();
      permissions = currentUser?.permissions || [];
    }
    
    const userData = {
      ...profileData,
      permissions,
    };
    localStorage.setItem(this.userKey, JSON.stringify(userData));
    this.broadcastAuthUpdate();
    return userData;
  }

  getPendingMfa(): PendingMfaChallenge | null {
    const pending = localStorage.getItem(this.pendingMfaKey);
    if (!pending) {
      return null;
    }

    try {
      const parsed = JSON.parse(pending) as PendingMfaChallenge;
      return parsed.mfaRequired ? parsed : null;
    } catch (error) {
      console.warn('Failed to parse pending MFA challenge', error);
      localStorage.removeItem(this.pendingMfaKey);
      return null;
    }
  }

  savePendingMfa(data: PendingMfaChallenge): PendingMfaChallenge {
    localStorage.setItem(this.pendingMfaKey, JSON.stringify(data));
    return data;
  }

  updatePendingMfa(updates: Partial<PendingMfaChallenge>): PendingMfaChallenge | null {
    const existing = this.getPendingMfa();
    if (!existing) {
      return null;
    }
    const merged = { ...existing, ...updates } as PendingMfaChallenge;
    return this.savePendingMfa(merged);
  }

  clearPendingMfa(): void {
    localStorage.removeItem(this.pendingMfaKey);
  }

  private storeAuthenticatedSession(data: AuthResponse): AuthResponse {
    const userData = {
      ...data.user,
      permissions: data.user.permissions || [],
    };

    localStorage.setItem(this.tokenKey, data.accessToken);
    localStorage.setItem(this.userKey, JSON.stringify(userData));
    localStorage.setItem(this.lastActivityKey, Date.now().toString());

    if (data.refreshToken) {
      localStorage.setItem(this.refreshTokenKey, data.refreshToken);
    } else {
      localStorage.removeItem(this.refreshTokenKey);
    }

    this.clearPendingMfa();
    this.scheduleTokenRefresh();
    this.broadcastAuthUpdate();

    return { ...data, user: userData };
  }

  private broadcastAuthUpdate(): void {
    try {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('polwel_auth_updated'));
      }
    } catch (error) {
      console.warn('Failed to broadcast auth update', error);
    }
  }

  private buildPendingMfa(response: MfaChallengeResponse, email: string, rememberMe: boolean): PendingMfaChallenge {
    const now = Date.now();
    const resendAvailableAt = new Date(now + response.resendCooldownSeconds * 1000).toISOString();

    const pending: PendingMfaChallenge = {
      ...response,
      email,
      rememberMe,
      createdAt: new Date(now).toISOString(),
      resendAvailableAt,
    };

    return this.savePendingMfa(pending);
  }

  async login(email: string, password: string, rememberMe: boolean = false): Promise<LoginResult> {
    try {
      const response = await fetch(`${this.apiUrl}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password, rememberMe }),
      });

  const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        if (payload?.mfaRequired) {
          const pending = this.buildPendingMfa(payload, email, rememberMe);
          toast.success('Verification code sent to your email.');
          return pending;
        }

        const error: AuthError = payload;
        throw new Error(error?.error || 'Login failed');
      }

      if (payload?.mfaRequired) {
        const pending = this.buildPendingMfa(payload, email, rememberMe);
        toast.success('Verification code sent to your email.');
        return pending;
      }

      const data = payload as AuthResponse;

      const stored = this.storeAuthenticatedSession(data);

      console.log('🔐 [AUTH] Login response received:', {
        userRole: stored.user.role,
        permissionsCount: stored.user.permissions?.length || 0,
        permissions: stored.user.permissions,
        environment: import.meta.env.MODE,
      });

      toast.success(`Welcome back, ${stored.user.name}!`);
      return stored;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Login failed';
      toast.error(errorMessage);
      throw error;
    }
  }

  async verifyMfaCode(challengeId: string, code: string, rememberMe: boolean = false): Promise<AuthResponse> {
    const response = await fetch(`${this.apiUrl}/auth/mfa/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ challengeId, code, rememberMe }),
    });

    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      const errorMessage = payload?.error || 'Failed to verify MFA code';
      const error = new Error(errorMessage);
      if (payload?.code) {
        (error as any).code = payload.code;
      }
      if (payload?.attemptsRemaining !== undefined) {
        (error as any).attemptsRemaining = payload.attemptsRemaining;
      }
      throw error;
    }

    this.clearPendingMfa();
    const data = payload as AuthResponse;
    const stored = this.storeAuthenticatedSession(data);
    toast.success('Verification successful. Welcome back!');
    return stored;
  }

  async resendMfaCode(challengeId: string): Promise<PendingMfaChallenge> {
    const response = await fetch(`${this.apiUrl}/auth/mfa/resend`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ challengeId }),
    });

    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      const errorMessage = payload?.error || 'Failed to resend verification code';
      const error = new Error(errorMessage);
      if (payload?.code) {
        (error as any).code = payload.code;
      }
      if (payload?.nextAllowedAt) {
        (error as any).nextAllowedAt = payload.nextAllowedAt;
      }
      throw error;
    }

    const resendCooldown = payload?.resendCooldownSeconds ?? this.getPendingMfa()?.resendCooldownSeconds ?? 60;
    const resendAvailableAt = new Date(Date.now() + resendCooldown * 1000).toISOString();

    const updated = this.updatePendingMfa({
      challengeId: payload.challengeId ?? challengeId,
      expiresAt: payload.expiresAt,
      resendCount: payload.resendCount,
      maskedEmail: payload.maskedEmail,
      resendCooldownSeconds: resendCooldown,
      resendAvailableAt,
      emailDelivery: payload.emailDelivery,
    });

    if (!updated) {
      // If no existing challenge, build a new one using stored email context if available
      const pending = this.getPendingMfa();
      if (pending) {
        return this.savePendingMfa({
          ...pending,
          challengeId: payload.challengeId ?? challengeId,
          expiresAt: payload.expiresAt,
          resendCount: payload.resendCount,
          maskedEmail: payload.maskedEmail ?? pending.maskedEmail,
          resendCooldownSeconds: resendCooldown,
          resendAvailableAt,
          emailDelivery: payload.emailDelivery,
        });
      }

      // Fallback: create minimal structure
      const email = payload.email ?? this.getUser()?.email ?? '';
      return this.buildPendingMfa(
        {
          success: true,
          mfaRequired: true,
          challengeId: payload.challengeId ?? challengeId,
          expiresAt: payload.expiresAt,
          maskedEmail: payload.maskedEmail ?? email,
          resendCooldownSeconds: resendCooldown,
          emailDelivery: payload.emailDelivery,
          resendCount: payload.resendCount,
        },
        email,
        false
      );
    }

    return updated;
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

    // If no token or user, surface a 401 error instead of forcing logout.
    // This avoids race conditions where a login has just stored tokens but
    // another request checks before the auth context updated.
    if (!token || !user) {
      const err = new Error('Authentication required - no token or user data');
      (err as any).status = 401;
      throw err;
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

      // If 401/403, try to refresh token only for expiration errors; otherwise surface 403 to caller
      if (response.status === 401 || response.status === 403) {
        const errorData = await response.json().catch(() => ({ error: 'Authentication error' }));
        
        console.log('Auth error response received:', response.status, errorData);

        // If token expired, attempt refresh and retry
        if (errorData.code === 'TOKEN_EXPIRED' || errorData.error?.includes('expired')) {
          const newToken = await this.refreshToken();
          if (newToken) {
            const retryResponse = await fetch(`${this.apiUrl}${endpoint}`, {
              ...options,
              headers: {
                'Authorization': `Bearer ${newToken}`,
                'Content-Type': 'application/json',
                ...options.headers,
              },
            });

            if (retryResponse.ok) return retryResponse.json();
            const retryError = await retryResponse.json().catch(() => ({ error: 'Request failed after token refresh' }));
            const err = new Error(retryError.error || 'Request failed after token refresh');
            (err as any).status = retryResponse.status;
            throw err;
          }
          const err = new Error('Session expired - please login again');
          (err as any).status = 401;
          throw err;
        }

        // Non-expiry 401/403: surface to caller (do not auto-logout)
        const err = new Error(errorData.error || 'Authentication failed');
        (err as any).status = response.status;
        (err as any).code = errorData.code;
        if (response.status === 403) {
          (err as any).name = 'PermissionError';
        }
        throw err;
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
