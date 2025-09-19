import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma';



// Extend Request interface to include user data
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        email: string;
        role: string;
        organizationId?: string;
        permissions?: Set<string>;
      };
    }
  }
}

export interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    email: string;
    role: string;
    organizationId?: string;
    permissions?: Set<string>;
  };
}

// JWT verification middleware
export const authenticateToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  // Allow CORS preflight requests to pass through
  if (req.method === 'OPTIONS') {
    next();
    return;
  }
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      res.status(401).json({ 
        error: 'Access token required',
        code: 'TOKEN_MISSING'
      });
      return;
    }

    const jwtSecret = process.env.JWT_SECRET || 'fallback-secret';
    
    jwt.verify(token, jwtSecret, async (err, decoded) => {
      if (err) {
        let errorCode = 'TOKEN_INVALID';
        let message = 'Invalid token';
        
        if (err.name === 'TokenExpiredError') {
          errorCode = 'TOKEN_EXPIRED';
          message = 'Token has expired';
        } else if (err.name === 'JsonWebTokenError') {
          errorCode = 'TOKEN_MALFORMED';
          message = 'Malformed token';
        }
        
        res.status(403).json({ 
          error: message,
          code: errorCode
        });
        return;
      }

      const payload = decoded as any;
      
      // Verify user still exists and is active
      try {
        const user = await prisma.user.findUnique({
          where: { id: payload.userId },
          select: {
            id: true,
            email: true,
            role: true,
            status: true,
            organizationId: true
          }
        });

        if (!user) {
          res.status(403).json({ 
            error: 'User not found',
            code: 'USER_NOT_FOUND'
          });
          return;
        }

        // TEMPORARILY DISABLE STATUS CHECK - ALLOW ALL USERS
        // if (user.status !== 'ACTIVE') {
        //   res.status(403).json({ 
        //     error: 'Account is not active',
        //     code: 'ACCOUNT_INACTIVE'
        //   });
        //   return;
        // }

        // Add user data to request
        req.user = {
          userId: user.id,
          email: user.email || '', // Provide empty string if email is null
          role: user.role,
          ...(user.organizationId && { organizationId: user.organizationId })
        };

        next();
      } catch (dbError) {
        console.error('Database error during token verification:', dbError);
        res.status(500).json({ 
          error: 'Internal server error',
          code: 'DB_ERROR'
        });
        return;
      }
    });
  } catch (error) {
    console.error('Authentication middleware error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      code: 'AUTH_ERROR'
    });
  }
};

// Legacy middleware for backward compatibility
export const authenticate = authenticateToken;

// Role-based authorization middleware
export const authorizeRoles = (...allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ 
        error: 'Authentication required',
        code: 'NOT_AUTHENTICATED'
      });
      return;
    }

    // Enforce permission checks
    if (!allowedRoles || allowedRoles.length === 0) {
      // no role restriction provided
    } else if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({ 
        error: 'Insufficient permissions',
        code: 'INSUFFICIENT_PERMISSIONS',
        required: allowedRoles,
        current: req.user.role
      });
      return;
    }

    next();
  };
};

// Legacy middleware for backward compatibility
export const authorize = (...roles: string[]) => {
  return authorizeRoles(...roles);
};

// Permission-based authorization middleware
// required can be a single permission (e.g., 'courses.view') or array
export const requirePermissions = (required: string | string[]) => {
  const requiredList = Array.isArray(required) ? required : [required];
  const normalizedRequired = requiredList
    .filter(Boolean)
    .map((p) => String(p).trim().toLowerCase());

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ 
        error: 'Authentication required',
        code: 'NOT_AUTHENTICATED'
      });
      return;
    }

    // For now, only enforce granular permissions for POLWEL users
    if (req.user.role !== 'POLWEL') {
      next();
      return;
    }

    try {
      // Fetch and cache permissions on the request if not present
      if (!req.user.permissions) {
        const userPerms = await prisma.userPermission.findMany({
          where: { userId: req.user.userId, granted: true },
          select: { permissionName: true }
        });
        req.user.permissions = new Set(
          userPerms
            .map((p) => String(p.permissionName || '').toLowerCase())
            .filter((p) => p.includes('.'))
        );
      }

      const userPerms = req.user.permissions || new Set<string>();

      // Check for any match
      const hasPermission = normalizedRequired.some((perm) => userPerms.has(perm));
      if (!hasPermission) {
        res.status(403).json({
          error: 'Forbidden - insufficient permissions',
          code: 'INSUFFICIENT_PERMISSIONS',
          requiredPermissions: normalizedRequired
        });
        return;
      }

      next();
    } catch (e) {
      console.error('Permission check error:', e);
      res.status(500).json({
        error: 'Internal server error',
        code: 'PERMISSION_CHECK_FAILED'
      });
    }
  };
};

// Organization-specific authorization
export const authorizeOrganization = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.user) {
    res.status(401).json({ 
      error: 'Authentication required',
      code: 'NOT_AUTHENTICATED'
    });
    return;
  }

  // Safely read route params (some routes use :id, others use :organizationId)
  const params = req.params || {};
  const requestedOrgId = (params.organizationId ?? params.id) || req.body?.organizationId;

  // If no org id was provided in the request, surface a clear error
  if (!requestedOrgId) {
    // Allow POLWEL to proceed even if no org id present (they have cross-org access)
    if (req.user.role === 'POLWEL') {
      next();
      return;
    }

    res.status(400).json({
      error: 'Organization identifier missing from request',
      code: 'ORG_ID_MISSING'
    });
    return;
  }

  // POLWEL users can access any organization
  if (req.user.role === 'POLWEL') {
    next();
    return;
  }

  // Other users can only access their own organization
  if (req.user.organizationId !== requestedOrgId) {
    res.status(403).json({ 
      error: 'Access denied to this organization',
      code: 'ORG_ACCESS_DENIED'
    });
    return;
  }

  next();
};

// Check if user owns the resource or has admin privileges
export const authorizeOwnershipOrAdmin = (userIdField: string = 'userId') => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ 
        error: 'Authentication required',
        code: 'NOT_AUTHENTICATED'
      });
      return;
    }

    const resourceUserId = req.params[userIdField] || req.body[userIdField];
    
    // Admin users (POLWEL) can access any resource
    if (req.user.role === 'POLWEL') {
      next();
      return;
    }

    // Users can only access their own resources
    if (req.user.userId !== resourceUserId) {
      res.status(403).json({ 
        error: 'Access denied to this resource',
        code: 'RESOURCE_ACCESS_DENIED'
      });
      return;
    }

    next();
  };
};
