import { useMemo } from "react";
import { useAuth } from "./useAuth";

// Simple permission helper hook used by components to check permissions
export function usePermission() {
  const { user } = useAuth();

  const perms = useMemo(() => {
    const raw = (user as any)?.permissions;
    const set = new Set<string>();
    if (!Array.isArray(raw)) return set;

    for (const item of raw) {
      let s: string | undefined;
      if (!item) continue;
      if (typeof item === 'string') s = item;
      else if (typeof item === 'object') {
        // Common shapes: { permissionName }, { permission }, { name }
        if (typeof item.permissionName === 'string') s = item.permissionName;
        else if (typeof item.permission === 'string') s = item.permission;
        else if (typeof item.name === 'string') s = item.name;
      }
      if (!s) continue;
      const norm = s.toLowerCase();
      set.add(norm);

      // Heuristics: add normalized variants so frontend checks are resilient
      // Replace ':' with '.' and '-' with '.' to match canonical dot-style names
      const dot1 = norm.replace(/:/g, '.');
      const dot2 = norm.replace(/-/g, '.');
      set.add(dot1);
      set.add(dot2);

      // Also add combination where both are replaced
      set.add(dot1.replace(/-/g, '.'));
    }

    return set;
  }, [user]);

  const has = (permission: string) => {
    if (!permission) return false;
    const p = permission.toLowerCase();
    if (perms.has(p)) return true;
    // Support wildcard matching: users.view should match users.* or users
    const parts = p.split('.');
    if (parts.length > 0) {
      const prefix = parts[0];
      if (perms.has(prefix + '.*')) return true;
      if (perms.has(prefix)) return true;
    }
    return false;
  };

  const hasAny = (permissions: string[]) => {
    if (!Array.isArray(permissions) || permissions.length === 0) return false;
    return permissions.some((p) => has(p));
  };

  const hasAll = (permissions: string[]) => {
    if (!Array.isArray(permissions) || permissions.length === 0) return true;
    return permissions.every((p) => has(p));
  };

  const list = () => Array.from(perms.values());

  return { has, hasAny, hasAll, list };
}
