import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Extend Request interface to include user data
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        email: string;
        role: string;
        organizationId?: string;
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

        if (user.status !== 'ACTIVE') {
          res.status(403).json({ 
            error: 'Account is not active',
            code: 'ACCOUNT_INACTIVE'
          });
          return;
        }

        // Add user data to request
        req.user = {
          userId: user.id,
          email: user.email,
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

    if (!allowedRoles.includes(req.user.role)) {
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

// Organization-specific authorization
export const authorizeOrganization = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.user) {
    res.status(401).json({ 
      error: 'Authentication required',
      code: 'NOT_AUTHENTICATED'
    });
    return;
  }

  const requestedOrgId = req.params.organizationId || req.body.organizationId;
  
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
