import { Request, Response, NextFunction } from 'express';
import path from 'path';

// Enhanced interfaces for comprehensive logging
interface RequestLog {
  id: string;
  timestamp: string;
  method: string;
  url: string;
  originalUrl: string;
  baseUrl: string;
  path: string;
  query: Record<string, any>;
  params: Record<string, any>;
  headers: Record<string, any>;
  userAgent?: string;
  ip: string;
  body?: any;
  user?: any;
  source?: {
    file?: string;
    line?: number;
    function?: string;
  };
}

interface ResponseLog {
  id: string;
  timestamp: string;
  statusCode: number;
  statusMessage: string;
  headers: Record<string, any>;
  size?: number;
  duration: number;
  error?: any;
}

// Utility function to extract source location from stack trace
function getSourceLocation(): { file?: string; line?: number; function?: string } {
  const stack = new Error().stack;
  if (!stack) return {};

  const lines = stack.split('\n');
  // Skip the first few lines (Error, getSourceLocation, and middleware functions)
  for (let i = 3; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;
    
    // Look for lines that contain file paths but exclude node_modules
    if (line.includes('.ts:') || line.includes('.js:')) {
      if (!line.includes('node_modules')) {
        const match = line.match(/at\s+(.+?)\s+\((.+):(\d+):(\d+)\)/);
        if (match && match[2] && match[3]) {
          const [, functionName, filePath, lineNumber] = match;
          return {
            function: functionName || 'anonymous',
            file: path.basename(filePath),
            line: parseInt(lineNumber, 10)
          };
        } else {
          // Handle cases without function names
          const simpleMatch = line.match(/at\s+(.+):(\d+):(\d+)/);
          if (simpleMatch && simpleMatch[1] && simpleMatch[2]) {
            const [, filePath, lineNumber] = simpleMatch;
            return {
              file: path.basename(filePath),
              line: parseInt(lineNumber, 10)
            };
          }
        }
      }
    }
  }
  return {};
}

// Generate unique request ID
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Sanitize sensitive data from logs
function sanitizeHeaders(headers: Record<string, any>): Record<string, any> {
  const sanitized = { ...headers };
  
  // Remove or mask sensitive headers
  const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key', 'x-auth-token'];
  sensitiveHeaders.forEach(header => {
    if (sanitized[header]) {
      sanitized[header] = '***MASKED***';
    }
  });
  
  return sanitized;
}

function sanitizeBody(body: any): any {
  if (!body || typeof body !== 'object') return body;
  
  const sanitized = { ...body };
  const sensitiveFields = ['password', 'token', 'secret', 'key', 'auth'];
  
  Object.keys(sanitized).forEach(key => {
    if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
      sanitized[key] = '***MASKED***';
    }
  });
  
  return sanitized;
}

// Main API logging middleware
export const apiLogger = (req: Request, res: Response, next: NextFunction): void => {
  const startTime = Date.now();
  const requestId = generateRequestId();
  
  // Store request ID for correlation
  (req as any).requestId = requestId;
  
  // Get source location
  const source = getSourceLocation();
  
  // Create comprehensive request log
  const requestLog: RequestLog = {
    id: requestId,
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.url,
    originalUrl: req.originalUrl,
    baseUrl: req.baseUrl,
    path: req.path,
    query: req.query as Record<string, any>,
    params: req.params as Record<string, any>,
    headers: sanitizeHeaders(req.headers as Record<string, any>),
    userAgent: req.get('User-Agent') || 'Unknown',
    ip: req.ip || req.connection?.remoteAddress || 'unknown',
    body: sanitizeBody(req.body),
    user: (req as any).user,
    source
  };

  // Enhanced console logging with emojis for browser Network tab
  console.log(`\n🌐 === API REQUEST [${requestId}] ===`);
  console.log(`📍 ${req.method} ${req.originalUrl}`);
  console.log(`🕒 ${requestLog.timestamp}`);
  console.log(`📱 User-Agent: ${requestLog.userAgent || 'Unknown'}`);
  console.log(`🌍 IP: ${requestLog.ip}`);
  
  if (Object.keys(req.query).length > 0) {
    console.log(`❓ Query:`, req.query);
  }
  
  if (Object.keys(req.params).length > 0) {
    console.log(`📋 Params:`, req.params);
  }
  
  if (req.body && Object.keys(req.body).length > 0) {
    console.log(`📦 Body:`, sanitizeBody(req.body));
  }
  
  if (source.file) {
    console.log(`📁 Source: ${source.file}:${source.line} ${source.function ? `(${source.function})` : ''}`);
  }

  // Override res.json to capture response data
  const originalJson = res.json;
  const originalSend = res.send;
  let responseData: any;
  let responseSize: number = 0;

  res.json = function(data: any) {
    responseData = data;
    responseSize = JSON.stringify(data).length;
    return originalJson.call(this, data);
  };

  res.send = function(data: any) {
    if (!responseData) {
      responseData = data;
      responseSize = typeof data === 'string' ? data.length : JSON.stringify(data).length;
    }
    return originalSend.call(this, data);
  };

  // Log response when request finishes
  res.on('finish', () => {
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    const responseLog: ResponseLog = {
      id: requestId,
      timestamp: new Date().toISOString(),
      statusCode: res.statusCode,
      statusMessage: res.statusMessage || '',
      headers: res.getHeaders(),
      size: responseSize,
      duration
    };

    // Enhanced console logging for response
    const statusEmoji = res.statusCode >= 400 ? '❌' : res.statusCode >= 300 ? '⚠️' : '✅';
    console.log(`\n${statusEmoji} === API RESPONSE [${requestId}] ===`);
    console.log(`📊 Status: ${res.statusCode} ${res.statusMessage || ''}`);
    console.log(`⏱️  Duration: ${duration}ms`);
    console.log(`📏 Size: ${responseSize} bytes`);
    
    if (responseData && res.statusCode >= 400) {
      console.log(`💥 Error Response:`, responseData);
    } else if (responseData && process.env.LOG_RESPONSE_BODY === 'true') {
      console.log(`📤 Response:`, responseData);
    }
    
    console.log(`🏁 === END REQUEST [${requestId}] ===\n`);
  });

  next();
};

// Error logging middleware
export const errorLogger = (error: Error, req: Request, res: Response, next: NextFunction): void => {
  const requestId = (req as any).requestId || 'unknown';
  
  console.error(`\n💥 === ERROR [${requestId}] ===`);
  console.error(`🚨 ${error.name}: ${error.message}`);
  console.error(`📍 ${req.method} ${req.originalUrl}`);
  console.error(`🕒 ${new Date().toISOString()}`);
  
  if (error.stack) {
    console.error(`📚 Stack trace:`);
    console.error(error.stack);
  }
  
  console.error(`💥 === END ERROR [${requestId}] ===\n`);
  
  next(error);
};

// Utility function for manual route logging
export const logRoute = (routeName: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const source = getSourceLocation();
    console.log(`🛣️  Route: ${routeName} | Source: ${source.file}:${source.line}`);
    next();
  };
};

// Utility function for database query logging
export const logDatabaseQuery = (model: string, operation: string, data?: any) => {
  const source = getSourceLocation();
  console.log(`🗄️  DB Query: ${model}.${operation} | Source: ${source.file}:${source.line}`);
  if (data && process.env.LOG_DB_QUERIES === 'true') {
    console.log(`📊 Query Data:`, sanitizeBody(data));
  }
};

// Performance logging utility
export const performanceLogger = (operation: string) => {
  const start = Date.now();
  const source = getSourceLocation();
  
  return {
    end: (additionalInfo?: any) => {
      const duration = Date.now() - start;
      console.log(`⚡ Performance: ${operation} took ${duration}ms | Source: ${source.file}:${source.line}`);
      if (additionalInfo) {
        console.log(`📊 Additional Info:`, additionalInfo);
      }
    }
  };
};

// Extend Express Request interface
declare global {
  namespace Express {
    interface Request {
      requestId?: string;
    }
  }
}
