# HTTP 500 Error Classification Fix

**Date**: January 19, 2026  
**Issue**: Backend returning HTTP 500 errors were being incorrectly classified as "NetworkError"  
**Status**: ✅ Fixed

---

## Problem Description

### Symptoms
- Backend returns HTTP 500 Internal Server Error
- Frontend logs show: `"Network error detected, retrying in 1000ms..."`
- Frontend displays: "Unable to connect to the server. Please check your internet connection and try again."
- Frontend retries the request multiple times (incorrect behavior for 500 errors)

### Root Cause
The error classification logic in `src/lib/api.ts` was checking error **message text** before checking HTTP **status codes**. 

When the backend returned:
```json
{
  "success": false,
  "error": "Network error",
  "message": "HTTP error! status: 500"
}
```

The frontend saw the word "network" in the error message and incorrectly classified it as a `NetworkError`, triggering retry logic that should only apply to true connection failures.

---

## Fixes Applied

### 1. Frontend Error Classification (`src/lib/api.ts`)

#### ✅ Prioritized Status Code Checking

Changed the order of error classification to check HTTP status codes **first**:

```typescript
const classifyAndFormatError = (error: any, endpoint: string): Error => {
  // PRIORITY 1: Check HTTP status codes first (more reliable)
  
  // 500-599: Server Errors
  if (original?.status >= 500 && original?.status < 600) {
    const serverError = new Error(
      original?.data?.message || 
      original?.data?.error || 
      errorMessage || 
      'A server error occurred. Please try again later.'
    );
    serverError.name = 'ServerError';
    console.error('🔴 Server Error (5xx):', {
      status: original.status,
      endpoint,
      message: serverError.message
    });
    return serverError;
  }
  
  // 400-499: Client Errors
  if (original?.status >= 400 && original?.status < 500) {
    // Handle specific codes...
  }
  
  // PRIORITY 2: Check message text for actual network/connection issues
  if (lowerMessage.includes('failed to fetch') || 
      lowerMessage.includes('network request failed') ||
      lowerMessage.includes('connection') ||
      // ... etc
}
```

**Benefits**:
- HTTP status codes are more reliable than parsing error messages
- Prevents false classification of server errors as network errors
- Proper error handling based on actual HTTP response

#### ✅ Enhanced Retry Logic

Updated retry logic to NOT retry on server errors:

```typescript
// Don't retry on server errors (500) - these need to be fixed on backend
if (classifiedError.name === 'ServerError') {
  console.error('🔴 Server error detected - not retrying:', classifiedError.message);
  throw classifiedError;
}

// Don't retry on client errors (400, 404, 409, etc)
if (classifiedError.name === 'ClientError' || 
    classifiedError.name === 'NotFoundError' ||
    classifiedError.name === 'ConflictError' ||
    classifiedError.name === 'ValidationError') {
  throw classifiedError;
}

// ONLY retry on TRUE network errors (connection failures)
if (classifiedError.name === 'NetworkError') {
  if (i < attempts.length - 1) {
    const backoffDelay = Math.min(1000 * Math.pow(2, i), 3000);
    console.log(`🔄 True network error detected, retrying in ${backoffDelay}ms...`);
    await new Promise(resolve => setTimeout(resolve, backoffDelay));
    continue;
  }
}
```

**Benefits**:
- Server errors (500) fail immediately - no unnecessary retries
- Client errors (400, 404) fail immediately - correct behavior
- Only true network failures trigger retry logic
- Better logging with emojis for quick identification

#### ✅ Improved Error Logging

Added more detailed error logging:

```typescript
console.error(`API Request attempt ${i + 1} failed:`, {
  endpoint,
  errorName: classifiedError.name,
  errorMessage: classifiedError.message,
  errorStatus: (error as any)?.status,  // NEW: Show HTTP status
  originalError: error.message,
  token: token ? 'Present' : 'Missing',
  apiBaseUrl: API_BASE_URL,
  environment: import.meta.env.MODE
});
```

### 2. Backend Error Handling (`polwel-backend/src/middleware/errorHandler.ts`)

#### ✅ Enhanced Error Logging

Added comprehensive error context logging:

```typescript
console.error('🔴 Error Handler Triggered:', {
  timestamp: new Date().toISOString(),
  method: req.method,
  path: req.path,
  query: req.query,
  errorName: err.name,
  errorMessage: err.message,
  statusCode: err.statusCode,
  stack: err.stack?.split('\n').slice(0, 5).join('\n'),
});
```

#### ✅ Added Prisma Error Handling

Added specific handling for Prisma database errors:

```typescript
// Prisma errors
if (err.name === 'PrismaClientKnownRequestError') {
  const prismaError = err as any;
  if (prismaError.code === 'P2002') {
    error = { 
      message: 'A record with this value already exists', 
      statusCode: 400, 
      name: 'ValidationError' 
    };
  } else if (prismaError.code === 'P2025') {
    error = { 
      message: 'Record not found', 
      statusCode: 404, 
      name: 'NotFoundError' 
    };
  } else {
    error = { 
      message: 'Database error occurred', 
      statusCode: 500, 
      name: 'DatabaseError' 
    };
  }
}

// Prisma connection errors
if (err.name === 'PrismaClientInitializationError' || 
    err.name === 'PrismaClientRustPanicError') {
  console.error('🔴 Prisma Connection Error:', err);
  error = { 
    message: 'Database connection error. Please try again later.', 
    statusCode: 503, 
    name: 'DatabaseConnectionError' 
  };
}
```

**Benefits**:
- Specific error codes for Prisma errors (P2002 = duplicate, P2025 = not found)
- Database connection errors return 503 (Service Unavailable) instead of 500
- Better error messages for end users

#### ✅ Enhanced Error Response

Improved error response structure:

```typescript
const statusCode = error.statusCode || 500;
const responseBody = {
  success: false,
  error: error.message || 'Server Error',
  code: err.name,  // Include error type name
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
```

### 3. Backend Global Error Handlers (`polwel-backend/src/index.ts`)

#### ✅ Added Unhandled Rejection Handler

```typescript
process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
  console.error('🔴 Unhandled Rejection at:', promise);
  console.error('🔴 Reason:', reason);
  // Don't exit process - log and continue
});
```

#### ✅ Added Uncaught Exception Handler

```typescript
process.on('uncaughtException', (error: Error) => {
  console.error('🔴 Uncaught Exception:', error);
  console.error('🔴 Stack:', error.stack);
  // Log but don't exit - let PM2 handle restart if needed
});
```

#### ✅ Added Server Error Handler

```typescript
server.on('error', (error: any) => {
  console.error('🔴 Server error:', error);
  if (error.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use`);
    process.exit(1);
  }
});
```

**Benefits**:
- Catches unhandled promise rejections (async errors)
- Catches uncaught exceptions (sync errors)
- Prevents app crashes from unhandled errors
- Logs errors for debugging
- PM2 can handle restart if needed

---

## Error Type Classification

### NetworkError (Retry with backoff)
- `failed to fetch` - Connection failed
- `network request failed` - Network unavailable
- `connection refused` - Server not reachable
- `timeout` / `timed out` - Request took too long
- `certificate` / `ssl` - SSL certificate issues

### ServerError (Don't retry - backend issue)
- HTTP 500 - Internal Server Error
- HTTP 501 - Not Implemented
- HTTP 502 - Bad Gateway
- HTTP 503 - Service Unavailable
- HTTP 504 - Gateway Timeout

### ClientError (Don't retry - request issue)
- HTTP 400 - Bad Request
- HTTP 404 - Not Found
- HTTP 409 - Conflict
- HTTP 422 - Validation Error

### AuthenticationError (Don't retry - redirect to login)
- HTTP 401 - Unauthorized
- Token expired
- Invalid credentials

### PermissionError (Don't retry - redirect to 403)
- HTTP 403 - Forbidden
- Missing permissions

---

## Testing

### Test HTTP 500 Error Handling

1. **Simulate backend 500 error**:
   - Temporarily break a controller to throw an error
   - Frontend should show: "A server error occurred. Please try again later."
   - Should NOT retry the request
   - Console should show: `🔴 Server error detected - not retrying`

2. **Simulate true network error**:
   - Stop backend server
   - Frontend should show: "Unable to connect to the server. Please check your internet connection."
   - Should retry with exponential backoff (1s, 2s, 3s)
   - Console should show: `🔄 True network error detected, retrying in Xms...`

3. **Check error logs**:
   - Backend logs should show detailed error context
   - Frontend console should show HTTP status codes
   - PM2 logs: `pm2 logs polwel-backend`

### Verify No Regressions

✅ Test all major features:
- Login/Authentication
- Course listing
- Course creation
- Course run management
- Duplicate course run feature
- File uploads
- Email sending
- Reports generation

---

## Deployment

### Build Status
- ✅ Frontend: Built successfully (3,379.33 kB)
- ✅ Backend: Built successfully (no TypeScript errors)

### Deployment Commands

```bash
# Backend
cd /home/kukuh/webprojects/polwel/polwel-backend
npm run build
pm2 restart polwel-backend

# Frontend
cd /home/kukuh/webprojects/polwel
npm run build
# Copy dist/ to server

# Check logs
pm2 logs polwel-backend --lines 100
```

---

## Expected Outcomes

### Before Fix
- ❌ HTTP 500 errors classified as "NetworkError"
- ❌ Unnecessary retries on server errors
- ❌ Confusing error messages ("check your internet connection" for server errors)
- ❌ Poor logging - hard to debug

### After Fix
- ✅ HTTP 500 errors correctly classified as "ServerError"
- ✅ No retries on server errors (fail fast)
- ✅ Clear error messages ("A server error occurred")
- ✅ Comprehensive logging with emojis for quick scanning
- ✅ Proper Prisma error handling
- ✅ Global error handlers prevent crashes
- ✅ Better debugging with detailed error context

---

## Best Practices Applied

### 1. **Status Code First**
Always check HTTP status codes before parsing error messages.

### 2. **Fail Fast**
Don't retry on errors that won't succeed on retry (500, 400, 404, etc).

### 3. **Exponential Backoff**
Use exponential backoff only for transient network errors.

### 4. **Comprehensive Logging**
Log error type, status, endpoint, and context for debugging.

### 5. **User-Friendly Messages**
Show clear, actionable error messages to users.

### 6. **Error Boundaries**
Catch errors at multiple levels (controller, middleware, global handlers).

### 7. **Graceful Degradation**
Don't crash on unhandled errors - log and continue.

---

## Monitoring

### Key Metrics to Watch

1. **Error Rate by Type**:
   - Count of ServerError (500+)
   - Count of NetworkError
   - Count of ClientError (400+)

2. **Retry Rate**:
   - How often do requests retry?
   - Are retries successful?

3. **Error Distribution**:
   - Which endpoints have most errors?
   - What are common error messages?

### Log Analysis

```bash
# Check for 500 errors
pm2 logs polwel-backend | grep "🔴 Server Error"

# Check for network errors
pm2 logs polwel-backend | grep "🔴 Network Error"

# Check for unhandled errors
pm2 logs polwel-backend | grep "🔴 Unhandled"

# Check error distribution
pm2 logs polwel-backend --lines 1000 | grep "🔴" | sort | uniq -c
```

---

## Related Files

- [src/lib/api.ts](../src/lib/api.ts) - Frontend API client with error classification
- [polwel-backend/src/middleware/errorHandler.ts](../polwel-backend/src/middleware/errorHandler.ts) - Backend error handler
- [polwel-backend/src/index.ts](../polwel-backend/src/index.ts) - Global error handlers
- [SERVER_ERROR_ANALYSIS_AND_FIXES.md](./SERVER_ERROR_ANALYSIS_AND_FIXES.md) - Previous connection error fixes

---

## Summary

The core issue was that HTTP 500 errors were being misclassified as network errors due to checking error message text before HTTP status codes. The fix prioritizes status code checking and adds proper error handling at multiple levels to ensure:

1. ✅ Correct error classification
2. ✅ No unnecessary retries
3. ✅ Clear error messages
4. ✅ Comprehensive logging
5. ✅ Graceful error handling

All features remain working, and the application is more robust and easier to debug.
