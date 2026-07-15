import { useState, useEffect, createContext, useContext, ReactNode, useMemo } from "react";
import { authService, User, AuthResponse, LoginResult, PendingMfaChallenge } from "@/lib/auth";
import { toast } from "sonner";
import { createAbility, type AppAbility } from "@/lib/casl";
import { AbilityContext } from "@/lib/casl";

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  ability: AppAbility;
  pendingMfa: PendingMfaChallenge | null;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<LoginResult>;
  setPendingMfa: (challenge: PendingMfaChallenge | null) => void;
  verifyMfaCode: (code: string) => Promise<AuthResponse>;
  resendMfaCode: () => Promise<PendingMfaChallenge>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  loading: boolean;
  hasRole: (roleOrRoles: string | string[]) => boolean;
  canAccessOrganization: (orgId: string) => boolean;
  apiRequest: (endpoint: string, options?: RequestInit) => Promise<any>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendingMfa, setPendingMfaState] = useState<PendingMfaChallenge | null>(authService.getPendingMfa());

  // Create CASL ability from user
  const ability = useMemo(() => {
    return createAbility(user);
  }, [user]);

  // Check authentication status on mount and set up session monitoring
  useEffect(() => {
    const checkAuth = () => {
      const authenticated = authService.isAuthenticated();
      const userData = authService.getUser();
      const pendingChallenge = authService.getPendingMfa();

      setIsAuthenticated(authenticated);
      setUser(userData);
      setPendingMfaState(pendingChallenge);
      setLoading(false);
    };

    checkAuth();

    // Fetch fresh profile details silently once on mount to update stale cache (e.g. linked org IDs)
    if (authService.isAuthenticated()) {
      authService.refreshUser()
        .then((freshUser) => {
          setUser(freshUser);
        })
        .catch((err) => {
          console.warn("Failed silent user refresh:", err);
        });
    }

    // Set up less frequent auth checks (every 2 minutes instead of 30 seconds)
    const authCheckInterval = setInterval(checkAuth, 2 * 60 * 1000);

    // Listen for storage changes (for cross-tab synchronization)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "polwel_access_token" || e.key === "polwel_user_data" || e.key === "polwel_pending_mfa") {
        checkAuth();
      }
    };

    window.addEventListener("storage", handleStorageChange);
    // Listen for explicit auth update events (dispatched after login)
    const handleAuthUpdated = () => checkAuth();
    window.addEventListener("polwel_auth_updated", handleAuthUpdated as EventListener);

    // Cleanup
    return () => {
      clearInterval(authCheckInterval);
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("polwel_auth_updated", handleAuthUpdated as EventListener);
    };
  }, []);

  const setPendingMfa = (challenge: PendingMfaChallenge | null) => {
    if (challenge) {
      setPendingMfaState(authService.savePendingMfa(challenge));
    } else {
      authService.clearPendingMfa();
      setPendingMfaState(null);
    }
  };

  const login = async (email: string, password: string, rememberMe: boolean = false) => {
    try {
      const result = await authService.login(email, password, rememberMe);

      if ("mfaRequired" in result && result.mfaRequired) {
        setPendingMfa(result);
        setIsAuthenticated(false);
        setUser(null);
        return result;
      }

      const success = result as AuthResponse;
      setPendingMfa(null);
      setIsAuthenticated(true);
      setUser(success.user);
      return success;
    } catch (error) {
      setIsAuthenticated(false);
      setUser(null);
      setPendingMfa(null);
      throw error;
    }
  };

  const verifyMfaCode = async (code: string) => {
    if (!pendingMfa) {
      throw new Error("No verification challenge in progress");
    }

    const result = await authService.verifyMfaCode(pendingMfa.challengeId, code, pendingMfa.rememberMe);
    setPendingMfa(null);
    setIsAuthenticated(true);
    setUser(result.user);
    return result;
  };

  const resendMfaCode = async () => {
    if (!pendingMfa) {
      throw new Error("No verification challenge in progress");
    }

    const updated = await authService.resendMfaCode(pendingMfa.challengeId);
    setPendingMfa(updated);
    return updated;
  };

  const logout = async () => {
    await authService.logout();
    setIsAuthenticated(false);
    setUser(null);
  };

  const refreshUser = async () => {
    try {
      const updatedUser = await authService.refreshUser();
      setUser(updatedUser);
      // The ability will automatically update due to useMemo dependency
      toast.success("Permissions updated");
    } catch (error) {
      console.error("Failed to refresh user permissions:", error);
      toast.error("Failed to refresh permissions");
    }
  };

  const hasRole = (roleOrRoles: string | string[]) => {
    const userObj = authService.getUser();
    if (!userObj) return false;

    const rolesToCheck = Array.isArray(roleOrRoles) ? roleOrRoles : [roleOrRoles];

    // normalize casing
    const normalizedRequired = rolesToCheck.map((r) => String(r).toUpperCase().trim());

    // user may have single role or roles array in future
    const userRoles: string[] = [];
    if ((userObj as any).roles && Array.isArray((userObj as any).roles)) {
      (userObj as any).roles.forEach((r: any) => userRoles.push(String(r).toUpperCase()));
    } else if (userObj.role) {
      userRoles.push(String(userObj.role).toUpperCase());
    }

    // Superuser: POLWEL has access to everything
    if (userRoles.includes("POLWEL")) return true;

    return normalizedRequired.some((req) => userRoles.includes(req));
  };
  const canAccessOrganization = (orgId: string) => authService.canAccessOrganization(orgId);
  const rawApiRequest = authService.apiRequest.bind(authService);
  const apiRequest = async (endpoint: string, options?: RequestInit) => {
    try {
      return await rawApiRequest(endpoint, options);
    } catch (err: any) {
      // If backend returns 403, redirect to /403 (do not logout)
      if (err && (err.status === 403 || err.code === "INSUFFICIENT_PERMISSIONS" || err.code === "ORG_ACCESS_DENIED")) {
        // Do not toast here: navigation may already show guard feedback or component-level handler will toast
        if (typeof window !== "undefined") {
          try {
            // Try to use history API to avoid full reload
            window.history.replaceState({}, "", "/403");
            // Also dispatch a popstate so Router updates if needed
            window.dispatchEvent(new PopStateEvent("popstate"));
          } catch (e) {
            window.location.href = "/403";
          }
          return;
        }
      }
      // For other errors, rethrow
      throw err;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        user,
        ability,
        pendingMfa,
        login,
        setPendingMfa,
        verifyMfaCode,
        resendMfaCode,
        logout,
        refreshUser,
        loading,
        hasRole,
        canAccessOrganization,
        apiRequest,
      }}
    >
      <AbilityContext.Provider value={ability}>{children}</AbilityContext.Provider>
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
