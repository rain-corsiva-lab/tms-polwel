/**
 * CASL-based Permission Middleware
 * 
 * Middleware for checking permissions using CASL abilities
 */

import { Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma';
import { defineAbilityFor, type AppAbility } from '../lib/casl';
import type { Action, Subject } from '../lib/casl/types';

// Extend Request interface to include ability
declare global {
  namespace Express {
    interface Request {
      ability?: AppAbility;
      user?: {
        userId: string;
        email: string;
        role: string;
        organizationId?: string;
        permissions?: any[] | Set<string>;
      };
    }
  }
}

/**
 * Middleware to load user permissions and attach CASL ability to request
 * Should be used after authenticateToken middleware
 */
export const loadAbility = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  if (!req.user) {
    // No user authenticated, create empty ability
    req.ability = defineAbilityFor(undefined, undefined);
    next();
    return;
  }

  try {
    // Load user permissions from database if not already cached
    if (!req.user.permissions) {
      const userPerms = await prisma.userPermission.findMany({
        where: { userId: req.user.userId, granted: true },
        select: { permissionName: true }
      });
      req.user.permissions = userPerms;
    }

    // Convert permissions to array if it's a Set or other iterable
    let permissionsArray: any[] = [];
    if (Array.isArray(req.user.permissions)) {
      permissionsArray = req.user.permissions;
    } else if (req.user.permissions && typeof req.user.permissions[Symbol.iterator] === 'function') {
      // It's an iterable (like Set), convert to array
      permissionsArray = Array.from(req.user.permissions as any);
    }

    // Create ability based on role and permissions
    req.ability = defineAbilityFor(req.user.role, permissionsArray);
    
    next();
  } catch (error) {
    console.error('Error loading ability:', error);
    res.status(500).json({
      error: 'Internal server error',
      code: 'ABILITY_LOAD_FAILED'
    });
  }
};

/**
 * Middleware to check if user can perform action on subject
 * Usage: requireAbility('view', 'User')
 */
export const requireAbility = (action: Action, subject: Subject) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.ability) {
      res.status(500).json({
        error: 'Ability not loaded. Ensure loadAbility middleware is used first.',
        code: 'ABILITY_NOT_LOADED'
      });
      return;
    }

    if (req.ability.can(action, subject)) {
      next();
      return;
    }

    res.status(403).json({
      error: 'Forbidden - insufficient permissions',
      code: 'INSUFFICIENT_PERMISSIONS',
      required: { action, subject }
    });
  };
};

/**
 * Middleware to check if user can perform ANY of the specified actions
 * Usage: requireAnyAbility([['view', 'User'], ['edit', 'User']])
 */
export const requireAnyAbility = (permissions: Array<[Action, Subject]>) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.ability) {
      res.status(500).json({
        error: 'Ability not loaded. Ensure loadAbility middleware is used first.',
        code: 'ABILITY_NOT_LOADED'
      });
      return;
    }

    const hasAnyPermission = permissions.some(([action, subject]) => 
      req.ability!.can(action, subject)
    );

    if (hasAnyPermission) {
      next();
      return;
    }

    res.status(403).json({
      error: 'Forbidden - insufficient permissions',
      code: 'INSUFFICIENT_PERMISSIONS',
      required: permissions
    });
  };
};

/**
 * Middleware to check if user can perform ALL of the specified actions
 * Usage: requireAllAbilities([['view', 'User'], ['edit', 'User']])
 */
export const requireAllAbilities = (permissions: Array<[Action, Subject]>) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.ability) {
      res.status(500).json({
        error: 'Ability not loaded. Ensure loadAbility middleware is used first.',
        code: 'ABILITY_NOT_LOADED'
      });
      return;
    }

    const hasAllPermissions = permissions.every(([action, subject]) => 
      req.ability!.can(action, subject)
    );

    if (hasAllPermissions) {
      next();
      return;
    }

    res.status(403).json({
      error: 'Forbidden - insufficient permissions',
      code: 'INSUFFICIENT_PERMISSIONS',
      required: permissions
    });
  };
};
