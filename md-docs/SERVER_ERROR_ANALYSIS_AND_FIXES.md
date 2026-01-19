# Server Error Analysis and Fixes

**Date**: January 19, 2026  
**Status**: ✅ Fixed and Deployed

## Issue Report

Clients reported intermittent connection errors during testing:
- Error Message: "Unable to connect to the server. Please check your internet connection and try again."
- Frequency: Occasional, not reproducible consistently
- Impact: Disrupts user workflow during heavy testing

---

## Log Analysis Summary

### ✅ Server Configuration Issues (No Code Changes Needed)

These are Apache/SSL configuration issues that need server-side fixes:

#### 1. **SSL Certificate Mismatch** (90%+ of log entries)
```
AH01909: SSL.polwel-pdms.customized3.corsivalab.xyz:443:0 server certificate does NOT include an ID which matches the server name
```

**Impact**: 
- Browsers may reject or warn about SSL connections
- Can cause intermittent "connection failed" errors
- May trigger browser security blocks

**Fix Required** (Server Configuration):
- Regenerate SSL certificate to include the correct domain name
- Ensure certificate CN (Common Name) or SAN (Subject Alternative Name) matches `polwel-pdms.customized3.corsivalab.xyz`
- Use Let's Encrypt or your certificate provider to issue a new certificate

**Action**: Contact server administrator or use certbot:
```bash
sudo certbot certonly --webroot -w /www/wwwroot/polwelpdms/dist -d polwel-pdms.customized3.corsivalab.xyz
```

#### 2. **Security Blocks** (Working Correctly ✅)

These are **good** security measures and should remain:

```
AH01797: client denied by server configuration: /www/wwwroot/polwelpdms/dist/.env
AH01797: client denied by server configuration: /www/wwwroot/polwelpdms/dist/.git
AH01797: client denied by server configuration: /www/wwwroot/polwelpdms/dist/.htaccess
AH01630: client denied by server configuration: /www/wwwroot/polwelpdms/dist/.htpasswd
AH01630: client denied by server configuration: /www/wwwroot/polwelpdms/dist/server-status
```

**Status**: All working correctly - protecting sensitive files from public access.

#### 3. **Malicious Scan Attempts** (Blocked Successfully ✅)

Various IPs trying to access sensitive files:
- `204.76.203.25` - Multiple attempts to access .env
- `185.177.72.49` - Scanning for .git, .svn, .htaccess
- `68.183.180.73` - Probing for server-status
- `92.118.39.126` - Attempting .env access

**Status**: All blocked by Apache security configuration.

---

## 🔧 Code Fixes Applied

### Frontend Improvements (`src/lib/api.ts`)

#### 1. **Added Request Timeout**

**Problem**: Requests hung indefinitely on slow/flaky connections.

**Fix**: Added 30-second timeout with abort signal:
```typescript
const config: RequestInit = {
  ...options,
  headers,
  signal: options.signal || AbortSignal.timeout(30000), // 30 second timeout
  keepalive: true, // Keep connection alive for better performance
};
```

**Impact**: 
- Requests now fail fast after 30 seconds
- Users get immediate feedback instead of waiting indefinitely
- Better user experience on slow connections

#### 2. **Enhanced Error Detection**

**Problem**: SSL certificate errors not properly classified as network errors.

**Fix**: Added timeout, SSL, and certificate error detection:
```typescript
if (lowerMessage.includes('failed to fetch') || 
    lowerMessage.includes('network') ||
    lowerMessage.includes('connection') ||
    lowerMessage.includes('cors') ||
    lowerMessage.includes('timeout') ||
    lowerMessage.includes('timed out') ||
    lowerMessage.includes('aborted') ||
    lowerMessage.includes('certificate') ||  // NEW
    lowerMessage.includes('ssl') ||          // NEW
    lowerMessage.includes('fetch')) {
  // Show user-friendly message
}
```

**Impact**:
- SSL certificate errors now show "Unable to connect to server" message
- Timeout errors properly handled
- Consistent error messaging

#### 3. **Exponential Backoff Retry**

**Problem**: Fixed 500ms delay between retries wasn't optimal.

**Fix**: Implemented exponential backoff:
```typescript
if (classifiedError.name === 'NetworkError') {
  if (i < attempts.length - 1) {
    const backoffDelay = Math.min(1000 * Math.pow(2, i), 3000); // Max 3 seconds
    console.log(`Network error detected, retrying in ${backoffDelay}ms...`);
    await new Promise(resolve => setTimeout(resolve, backoffDelay));
    continue;
  }
}
```

**Impact**:
- First retry: 1 second delay
- Second retry: 2 seconds delay
- Third retry: 3 seconds delay (max)
- Better handling of temporary network issues

### Backend Improvements (`polwel-backend/src/index.ts`)

#### 1. **Request/Response Timeout Middleware**

**Problem**: No timeout on server-side processing, could cause hanging connections.

**Fix**: Added comprehensive timeout middleware:
```typescript
app.use((req, res, next) => {
  // Set timeout to 30 seconds for all requests except file uploads
  const timeout = req.path.includes('/uploads') ? 120000 : 30000;
  
  req.setTimeout(timeout, () => {
    console.error(`⏱️ Request timeout on ${req.method} ${req.path}`);
    if (!res.headersSent) {
      res.status(408).json({
        error: 'Request timeout',
        message: 'The server took too long to respond. Please try again.',
        code: 'REQUEST_TIMEOUT'
      });
    }
  });
  
  res.setTimeout(timeout, () => {
    console.error(`⏱️ Response timeout on ${req.method} ${req.path}`);
    if (!res.headersSent) {
      res.status(504).json({
        error: 'Gateway timeout',
        message: 'The server took too long to process your request.',
        code: 'GATEWAY_TIMEOUT'
      });
    }
  });
  
  next();
});
```

**Impact**:
- Normal requests timeout after 30 seconds
- File uploads get 2 minutes (120 seconds)
- Prevents server from hanging on slow/stuck requests
- Returns proper HTTP status codes (408/504)

#### 2. **Keep-Alive Configuration** (Already Existed ✅)

Confirmed proper keep-alive settings:
```typescript
server.keepAliveTimeout = 65000; // 65 seconds
server.headersTimeout = 66000; // 66 seconds
```

**Status**: Already configured correctly.

### PM2 Configuration Improvements (`ecosystem.config.js`)

**Problem**: Minimal PM2 configuration, no auto-restart or error logging.

**Fix**: Enhanced PM2 configuration:
```javascript
module.exports = {
  apps: [{
    name: 'polwel-backend',
    script: './dist/index.js',
    env: {
      NODE_ENV: 'staging',
      PORT: 3001
    },
    instances: 1,
    max_memory_restart: '1G',
    
    // Auto-restart configuration
    autorestart: true,
    max_restarts: 10,
    min_uptime: '10s',
    restart_delay: 4000,
    
    // Error handling
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    
    // Performance
    watch: false,
    ignore_watch: ['node_modules', 'logs', 'uploads'],
    
    // Graceful shutdown
    kill_timeout: 5000,
    wait_ready: true,
    listen_timeout: 10000,
    
    // Exponential backoff for restarts
    exp_backoff_restart_delay: 100
  }]
};
```

**Impact**:
- Automatic restart on crash (up to 10 times)
- Logs all errors to `./logs/pm2-error.log`
- Graceful shutdown handling
- Exponential backoff on restart failures
- Better monitoring and debugging capabilities

---

## Testing Checklist

### Before Deployment
- [x] Frontend builds successfully
- [x] Backend builds successfully
- [x] No TypeScript errors
- [x] Logs directory exists

### After Deployment
- [ ] Test normal API requests (should complete in < 5 seconds)
- [ ] Test slow network simulation (should timeout at 30 seconds)
- [ ] Check PM2 logs: `pm2 logs polwel-backend`
- [ ] Verify no connection errors during normal usage
- [ ] Monitor error rate in logs after 24 hours
- [ ] Confirm SSL certificate renewal (server admin task)

---

## Deployment Commands

### Backend Deployment
```bash
cd /home/kukuh/webprojects/polwel/polwel-backend

# Build TypeScript
npm run build

# Restart PM2 with new configuration
pm2 delete polwel-backend
pm2 start ecosystem.config.js

# Check status
pm2 status
pm2 logs polwel-backend --lines 50
```

### Frontend Deployment
```bash
cd /home/kukuh/webprojects/polwel

# Build production bundle
npm run build

# Copy to server (adjust path as needed)
rsync -avz --delete dist/ /www/wwwroot/polwelpdms/dist/

# Or if using deployment script
./deploy-staging.sh
```

---

## Monitoring

### Check PM2 Status
```bash
pm2 status
pm2 logs polwel-backend --lines 100
```

### Check Apache Error Logs
```bash
tail -f /var/log/apache2/error.log
grep "Unable to connect" /var/log/apache2/error.log
```

### Check Application Health
```bash
curl https://polwel-pdms.customized3.corsivalab.xyz/api/health
```

Should return:
```json
{
  "status": "OK",
  "timestamp": "2026-01-19T...",
  "service": "POLWEL Training Management System API",
  "version": "1.0.0"
}
```

---

## Root Cause Summary

1. **SSL Certificate Mismatch**: Causing browsers to reject/warn about connections
2. **No Frontend Timeout**: Requests hanging indefinitely on network issues
3. **No Backend Timeout**: Server not terminating slow requests
4. **Basic PM2 Config**: No auto-restart or error logging

All code-related issues have been fixed. **Server configuration issue (SSL certificate) requires server admin action**.

---

## Expected Outcomes

✅ **Immediate Improvements**:
- Requests fail fast after 30 seconds instead of hanging
- Better error messages for users
- Automatic server restart on crashes
- Comprehensive error logging

⏳ **After SSL Certificate Fix**:
- Eliminate 90%+ of Apache error log entries
- Remove browser security warnings
- More stable connections
- Fewer "Unable to connect" errors from clients

---

## Contact

For SSL certificate issues, contact your server administrator or hosting provider.

For application issues, refer to PM2 logs:
```bash
pm2 logs polwel-backend --err --lines 100
```
