import { Request, Response, NextFunction } from 'express';

export interface ApiError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

export const errorHandler = (
  err: ApiError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let error = { ...err };
  error.message = err.message;

  // Enhanced error logging with more context
  console.error('🔴 Error Handler Triggered:', {
    timestamp: new Date().toISOString(),
    method: req.method,
    path: req.path,
    query: req.query,
    errorName: err.name,
    errorMessage: err.message,
    statusCode: err.statusCode,
    stack: err.stack?.split('\n').slice(0, 5).join('\n'), // First 5 lines of stack
  });

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    const message = 'Resource not found';
    error = { message, statusCode: 404, name: 'CastError', isOperational: true };
  }

  // Mongoose duplicate key
  if (err.name === 'MongoError' && (err as any).code === 11000) {
    const message = 'Duplicate field value entered';
    error = { message, statusCode: 400, name: 'ValidationError', isOperational: true };
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const message = Object.values((err as any).errors).map((val: any) => val.message).join(', ');
    error = { message, statusCode: 400, name: 'ValidationError', isOperational: true };
  }
  
  // Prisma errors
  if (err.name === 'PrismaClientKnownRequestError') {
    const prismaError = err as any;
    if (prismaError.code === 'P2002') {
      error = { message: 'A record with this value already exists', statusCode: 400, name: 'ValidationError', isOperational: true };
    } else if (prismaError.code === 'P2025') {
      error = { message: 'Record not found', statusCode: 404, name: 'NotFoundError', isOperational: true };
    } else {
      error = { message: 'Database error occurred', statusCode: 500, name: 'DatabaseError', isOperational: false };
    }
  }
  
  // Prisma connection errors
  if (err.name === 'PrismaClientInitializationError' || err.name === 'PrismaClientRustPanicError') {
    console.error('🔴 Prisma Connection Error:', err);
    error = { message: 'Database connection error. Please try again later.', statusCode: 503, name: 'DatabaseConnectionError', isOperational: false };
  }

  const statusCode = error.statusCode || 500;
  const responseBody = {
    success: false,
    error: error.message || 'Server Error',
    code: err.name,
    ...(process.env.NODE_ENV === 'development' && { 
      stack: err.stack,
      details: err 
    }),
  };

  console.error('🔴 Error Response:', {
    statusCode,
    body: responseBody
  });

  res.status(statusCode).json(responseBody);
};

export const createError = (message: string, statusCode: number): ApiError => {
  const error: ApiError = new Error(message);
  error.statusCode = statusCode;
  error.isOperational = true;
  return error;
};
