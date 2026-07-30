import { Request, Response, NextFunction } from 'express';

export interface ApiError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

/**
 * Escapes special HTML characters (&, <, >, ", ', /)
 * to prevent Reflected Cross-Site Scripting (CWE-79 / QID 150084).
 */
export function sanitizeHtmlString(str: string): string {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

export const errorHandler = (
  err: ApiError,
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Server Error';

  // Enhanced error logging with context (sanitized)
  console.error('🔴 Error Handler Triggered:', {
    timestamp: new Date().toISOString(),
    method: req.method,
    path: req.path,
    errorName: err.name,
    errorMessage: err.message,
    statusCode: err.statusCode,
    stack: err.stack?.split('\n').slice(0, 5).join('\n'),
  });

  // Mongoose / Database bad ID
  if (err.name === 'CastError') {
    message = 'Resource not found';
    statusCode = 404;
  }

  // Mongoose / Database duplicate key
  if (err.name === 'MongoError' && (err as any).code === 11000) {
    message = 'Duplicate field value entered';
    statusCode = 400;
  }

  // Validation error
  if (err.name === 'ValidationError') {
    if ((err as any).errors && typeof (err as any).errors === 'object') {
      message = Object.values((err as any).errors)
        .map((val: any) => val.message)
        .join(', ');
    }
    statusCode = 400;
  }

  // Prisma Known Errors
  if (err.name === 'PrismaClientKnownRequestError') {
    const prismaError = err as any;
    if (prismaError.code === 'P2002') {
      message = 'A record with this value already exists';
      statusCode = 400;
    } else if (prismaError.code === 'P2025') {
      message = 'Record not found';
      statusCode = 404;
    } else {
      message = 'Database error occurred';
      statusCode = 500;
    }
  }

  // Prisma connection errors
  if (err.name === 'PrismaClientInitializationError' || err.name === 'PrismaClientRustPanicError') {
    console.error('🔴 Prisma Connection Error:', err);
    message = 'Database connection error. Please try again later.';
    statusCode = 503;
  }

  // Sanitize message returned to client
  const sanitizedMessage = sanitizeHtmlString(message);
  const isDev = process.env.NODE_ENV === 'development';

  const responseBody = {
    success: false,
    error: sanitizedMessage || 'Server Error',
    code: err.name || 'INTERNAL_ERROR',
    ...(isDev && {
      stack: err.stack,
      details: err,
    }),
  };

  res.status(statusCode).json(responseBody);
};

export const createError = (message: string, statusCode: number): ApiError => {
  const error: ApiError = new Error(message);
  error.statusCode = statusCode;
  error.isOperational = true;
  return error;
};
