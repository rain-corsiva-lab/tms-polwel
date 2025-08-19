import { Request, Response, NextFunction } from 'express';
import path from 'path';

export interface RequestLog {
  id: string;
  timestamp: string;
  method: string;
  url: string;
  originalUrl: string;
  headers: any;
  query: any;
  body: any;
  ip: string;
  userAgent: string;
  userId?: string;
  startTime: number;
}

export interface ResponseLog {
  requestId: string;
  statusCode: number;
  headers: any;
  body?: any;
  duration: number;
  timestamp: string;
  error?: {
    message: string;
    stack: string;
    file: string;
    line: number;
  };
}

// Generate unique request ID
const generateRequestId = (): string => {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// Extract file and line from stack trace
const getSourceLocation = (stack?: string): { file: string; line: number } => {
  if (!stack) return { file: 'unknown', line: 0 };
  
  const stackLines = stack.split('\n');
  // Look for the first line that contains our source files (not node_modules)
  for (const line of stackLines) {
    if (line.includes('/src/') || line.includes('\\src\\')) {
      const match = line.match(/([^\\\/]+\.ts):(\d+):\d+/);
      if (match && match[1] && match[2]) {
        return {
          file: match[1],
          line: parseInt(match[2], 10)
        };
      }
    }
  }
  
  return { file: 'unknown', line: 0 };
};

// Format log data for console
const formatConsoleLog = (prefix: string, data: any, color: string = '37'): void => {
  const timestamp = new Date().toISOString();
  console.log(`\x1b[${color}m[${timestamp}] ${prefix}\x1b[0m`);
  console.log(`\x1b[${color}m${JSON.stringify(data, null, 2)}\x1b[0m`);
  console.log(`\x1b[${color}m${'='.repeat(80)}\x1b[0m`);
};

// Advanced API logging middleware
export const apiLogger = (req: Request, res: Response, next: NextFunction): void => {
  const requestId = generateRequestId();
  const startTime = Date.now();
  
  // Add request ID to request object
  (req as any).requestId = requestId;
  
  // Prepare request log
  const requestLog: RequestLog = {
    id: requestId,
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.url,
    originalUrl: req.originalUrl,
    headers: {
      ...req.headers,
      authorization: req.headers.authorization ? '[REDACTED]' : undefined
    },
    query: req.query,
    body: req.method !== 'GET' ? (req.body || {}) : undefined,
    ip: req.ip || req.connection.remoteAddress || 'unknown',
    userAgent: req.get('User-Agent') || 'unknown',
    userId: (req as any).user?.id,
    startTime
  };

  // Log request
  formatConsoleLog(`🔵 INCOMING REQUEST [${requestId}]`, requestLog, '36');

  // Add custom headers for debugging
  res.setHeader('X-Request-ID', requestId);
  res.setHeader('X-API-Version', '1.0.0');
  res.setHeader('X-Service', 'POLWEL-TMS');
  res.setHeader('X-Timestamp', new Date().toISOString());

  // Store original res.json and res.send
  const originalJson = res.json.bind(res);
  const originalSend = res.send.bind(res);
  const originalStatus = res.status.bind(res);

  let responseBody: any;
  let statusCode = 200;

  // Override res.status to capture status code
  res.status = function(code: number) {
    statusCode = code;
    return originalStatus(code);
  };

  // Override res.json to capture response
  res.json = function(body: any) {
    responseBody = body;
    
    // Add debug info to response
    const debugInfo = {
      requestId,
      timestamp: new Date().toISOString(),
      processingTime: Date.now() - startTime,
      endpoint: req.originalUrl,
      method: req.method,
      statusCode,
      sourceFile: getSourceLocation(new Error().stack).file,
      sourceLine: getSourceLocation(new Error().stack).line
    };

    // Add debug headers
    res.setHeader('X-Debug-Info', JSON.stringify(debugInfo));
    res.setHeader('X-Processing-Time', `${Date.now() - startTime}ms`);
    res.setHeader('X-Source-File', debugInfo.sourceFile);
    res.setHeader('X-Source-Line', debugInfo.sourceLine.toString());

    // Enhanced response body with debug info
    let enhancedBody = body;
    if (typeof body === 'object' && body !== null) {
      enhancedBody = {
        ...body,
        _debug: process.env.NODE_ENV !== 'production' ? debugInfo : undefined
      };
    }

    return originalJson(enhancedBody);
  };

  // Override res.send to capture non-JSON responses
  res.send = function(body: any) {
    if (!responseBody) {
      responseBody = body;
    }
    return originalSend(body);
  };

  // Capture response when finished
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    
    const responseLog: ResponseLog = {
      requestId,
      statusCode: res.statusCode,
      headers: res.getHeaders(),
      body: responseBody,
      duration,
      timestamp: new Date().toISOString()
    };

    // Choose color based on status code
    const color = res.statusCode >= 500 ? '31' : // Red for 5xx
                  res.statusCode >= 400 ? '33' : // Yellow for 4xx
                  res.statusCode >= 300 ? '36' : // Cyan for 3xx
                  '32'; // Green for 2xx

    formatConsoleLog(`🔴 OUTGOING RESPONSE [${requestId}]`, responseLog, color);
  });

  next();
};

// Error logging middleware
export const errorLogger = (err: Error, req: Request, res: Response, next: NextFunction): void => {
  const requestId = (req as any).requestId || 'unknown';
  const sourceLocation = getSourceLocation(err.stack);
  
  const errorLog = {
    requestId,
    timestamp: new Date().toISOString(),
    error: {
      name: err.name,
      message: err.message,
      stack: err.stack,
      file: sourceLocation.file,
      line: sourceLocation.line
    },
    request: {
      method: req.method,
      url: req.originalUrl,
      headers: {
        ...req.headers,
        authorization: req.headers.authorization ? '[REDACTED]' : undefined
      },
      body: req.body,
      query: req.query,
      params: req.params
    },
    user: (req as any).user ? {
      id: (req as any).user.id,
      email: (req as any).user.email,
      role: (req as any).user.role
    } : null
  };

  // Log error with red color
  formatConsoleLog(`💥 ERROR [${requestId}]`, errorLog, '31');

  // Add error info to response headers
  res.setHeader('X-Error-ID', requestId);
  res.setHeader('X-Error-File', sourceLocation.file);
  res.setHeader('X-Error-Line', sourceLocation.line.toString());
  res.setHeader('X-Error-Timestamp', new Date().toISOString());

  next(err);
};

// Route-specific logging decorator
export const logRoute = (routeName: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const requestId = (req as any).requestId || 'unknown';
    
    console.log(`\x1b[35m[${new Date().toISOString()}] 🛣️  ROUTE: ${routeName} [${requestId}]\x1b[0m`);
    console.log(`\x1b[35mEndpoint: ${req.method} ${req.originalUrl}\x1b[0m`);
    console.log(`\x1b[35mHandler: ${routeName}\x1b[0m`);
    
    // Add route info to response headers
    res.setHeader('X-Route-Handler', routeName);
    
    next();
  };
};

// Database query logging (for Prisma)
export const logDatabaseQuery = (model: string, operation: string, data?: any) => {
  const timestamp = new Date().toISOString();
  const sourceLocation = getSourceLocation(new Error().stack);
  
  const queryLog = {
    timestamp,
    model,
    operation,
    data: data ? JSON.stringify(data).substring(0, 500) : undefined,
    sourceFile: sourceLocation.file,
    sourceLine: sourceLocation.line
  };
  
  formatConsoleLog(`🗄️  DATABASE QUERY`, queryLog, '34');
};

// Performance monitoring
export const performanceLogger = (operationName: string) => {
  return async <T>(operation: () => Promise<T>): Promise<T> => {
    const start = Date.now();
    const sourceLocation = getSourceLocation(new Error().stack);
    
    try {
      const result = await operation();
      const duration = Date.now() - start;
      
      const perfLog = {
        timestamp: new Date().toISOString(),
        operation: operationName,
        duration,
        status: 'success',
        sourceFile: sourceLocation.file,
        sourceLine: sourceLocation.line
      };
      
      formatConsoleLog(`⚡ PERFORMANCE [${operationName}]`, perfLog, '33');
      return result;
    } catch (error) {
      const duration = Date.now() - start;
      
      const perfLog = {
        timestamp: new Date().toISOString(),
        operation: operationName,
        duration,
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
        sourceFile: sourceLocation.file,
        sourceLine: sourceLocation.line
      };
      
      formatConsoleLog(`💥 PERFORMANCE ERROR [${operationName}]`, perfLog, '31');
      throw error;
    }
  };
};
