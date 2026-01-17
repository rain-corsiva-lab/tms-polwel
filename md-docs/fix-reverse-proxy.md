# Fix Reverse Proxy Configuration for POLWEL TMS

## Problem Identified
The API requests are getting double slashes (//health instead of /health) due to reverse proxy configuration mismatch.

## Root Cause
1. Backend has routes at `/health` and `/api/*`
2. Frontend makes requests to `/api/*` and `/health`
3. Reverse proxy was configured to strip `/api/` prefix, causing path mismatches

## Solution Options

### Option 1: Fix aaPanel Reverse Proxy (Recommended)
If using aaPanel's built-in reverse proxy:

1. **Login to aaPanel**
2. **Go to Website → Your Domain → Reverse Proxy**
3. **Update the configuration:**
   - **Target URL:** `http://127.0.0.1:3001`
   - **Proxy Directory:** `/api`
   - **Advanced Settings:**
     - ✅ Enable "Send Host Header"
     - ✅ Enable "Send IP Header"
     - **Custom Config:** Add this:
       ```apache
       # Health check endpoint
       location /health {
           proxy_pass http://127.0.0.1:3001/health;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
       }
       
       # API endpoints
       location /api/ {
           proxy_pass http://127.0.0.1:3001/api/;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
       }
       ```

### Option 2: Use Apache Virtual Host (Alternative)
If you prefer using pure Apache configuration:

1. **Disable aaPanel reverse proxy for this domain**
2. **Upload the corrected Apache config:**
   ```bash
   # Copy the updated config file
   scp apache-config/polwel-staging.conf root@polwel-pdms.customized3.corsivalab.xyz:/etc/apache2/sites-available/
   
   # Enable the site
   a2ensite polwel-staging.conf
   a2dissite 000-default.conf
   
   # Test and reload
   apache2ctl configtest
   systemctl reload apache2
   ```

### Option 3: Modify Backend Routes (Quick Fix)
Alternatively, modify the backend to have all routes under `/api/`:

1. **Update backend health endpoint:**
   ```typescript
   // Change in backend/src/index.ts
   app.get('/api/health', (req, res) => {
     res.json({
       status: 'OK',
       timestamp: new Date().toISOString(),
       service: 'POLWEL Training Management System API',
       version: '1.0.0',
     });
   });
   ```

2. **Update frontend to call `/api/health`**

## Testing the Fix

After implementing any of these solutions, test the endpoints:

1. **Health Check:**
   ```bash
   curl https://polwel-pdms.customized3.corsivalab.xyz/health
   # Should return: {"status":"OK",...}
   ```

2. **API Endpoint:**
   ```bash
   curl https://polwel-pdms.customized3.corsivalab.xyz/api/auth/me
   # Should return proper response (not 404)
   ```

## Recommended Approach

**Use Option 1 (aaPanel Reverse Proxy)** as it's the most straightforward for your current setup:

1. Login to aaPanel
2. Go to the domain settings
3. Configure reverse proxy properly for both `/health` and `/api/` paths
4. Test the endpoints

This will resolve the double slash issue and ensure proper API routing.
