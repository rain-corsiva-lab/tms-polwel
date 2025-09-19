import { useMemo } from "react";
import { useAuth } from "./useAuth";

// Simple permission helper hook used by components to check permissions
export function usePermission() {
  const { user } = useAuth();

  const perms = useMemo(() => {
    const raw = (user as any)?.permissions;
    const set = new Set<string>();
    
    // POLWEL users have all permissions
    if (user?.role === 'POLWEL') {
      // Add common permissions that POLWEL should have
      const polwelPermissions = [
        'users.view', 'users.create', 'users.edit', 'users.delete',
        'trainers.view', 'trainers.create', 'trainers.edit', 'trainers.delete',
        'clients.view', 'clients.create', 'clients.edit', 'clients.delete',
        'courses.view', 'courses.create', 'courses.edit', 'courses.delete',
        'venues.view', 'venues.create', 'venues.edit', 'venues.delete',
        'bookings.view', 'bookings.create', 'bookings.edit', 'bookings.delete',
        'reports.view', 'reports.create', 'reports.edit', 'reports.delete',
        'calendar.view', 'calendar.create', 'calendar.edit', 'calendar.delete'
      ];
      polwelPermissions.forEach(p => set.add(p));
    }
    
    if (!Array.isArray(raw)) {
      console.debug('usePermission: permissions not array:', raw, 'role:', user?.role);
      return set;
    }

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

    console.debug('usePermission: final permissions set:', Array.from(set), 'role:', user?.role);
    return set;
  }, [user]);

  const has = (permission: string) => {
    if (!permission) return false;
    
    // POLWEL users have all permissions
    if (user?.role === 'POLWEL') return true;
    
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
    
    // POLWEL users have all permissions
    if (user?.role === 'POLWEL') return true;
    
    return permissions.some((p) => has(p));
  };

  const hasAll = (permissions: string[]) => {
    if (!Array.isArray(permissions) || permissions.length === 0) return true;
    
    // POLWEL users have all permissions
    if (user?.role === 'POLWEL') return true;
    
    return permissions.every((p) => has(p));
  };

  const list = () => Array.from(perms.values());

  return { has, hasAny, hasAll, list };
}
