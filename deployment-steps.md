# POLWEL TMS Deployment Steps for aaPanel

## Current Server Structure
```
/www/wwwroot/polwelpdms/
├── dist/                     # Frontend build files (from local /dist)
├── polwel-backend/          # Backend source and build
│   └── dist/               # Backend compiled files
├── package.json
└── other files...
```

## Step 1: Ensure Directory Structure

Make sure your server has the correct structure:

```bash
# SSH to your server and check/create directories
ssh root@polwel-pdms.customized3.corsivalab.xyz

# Check if directories exist
ls -la /www/wwwroot/polwelpdms/
ls -la /www/wwwroot/polwelpdms/dist/
ls -la /www/wwwroot/polwelpdms/polwel-backend/dist/

# If dist directory doesn't exist, create it
mkdir -p /www/wwwroot/polwelpdms/dist
```

## Step 2: Upload Frontend Files

From your local machine:
```bash
# Build frontend locally first
npm run build:staging

# Upload the dist folder contents to server
# Using aaPanel File Manager: Upload contents of local /dist to server /www/wwwroot/polwelpdms/dist/
# OR using SCP:
# scp -r dist/* root@polwel-pdms.customized3.corsivalab.xyz:/www/wwwroot/polwelpdms/dist/
```

## Step 3: Apply Apache Configuration

1. **Upload the fixed configuration via aaPanel:**
   - Go to **aaPanel → Website → polwel-pdms.customized3.corsivalab.xyz**
   - Click **"Configuration File"** tab
   - Replace the entire content with the fixed `polwel-staging.conf`
   - **Save** the configuration

2. **OR manually copy the config:**
   ```bash
   # Copy the updated config
   cp /www/wwwroot/polwelpdms/apache-config/polwel-staging.conf /www/server/panel/vhost/apache/polwel-pdms.customized3.corsivalab.xyz.conf
   
   # Test configuration
   apache2ctl configtest
   
   # Reload Apache
   systemctl reload apache2
   ```

## Step 4: Verify Backend is Running

```bash
# Check PM2 status
pm2 status

# If backend is not running, start it
cd /www/wwwroot/polwelpdms/polwel-backend
pm2 start ecosystem.config.js

# Check if backend responds locally
curl http://localhost:3001/health
```

## Step 5: Test Everything

1. **Frontend Access:**
   ```bash
   curl -I http://polwel-pdms.customized3.corsivalab.xyz/
   # Should return 200 OK and serve index.html
   ```

2. **Health Check:**
   ```bash
   curl http://polwel-pdms.customized3.corsivalab.xyz/health
   # Should return: {"status":"OK",...}
   ```

3. **API Endpoints:**
   ```bash
   curl "http://polwel-pdms.customized3.corsivalab.xyz/api/polwel-users?page=1&limit=10"
   # Should return proper API response (may need authentication)
   ```

4. **SPA Routing:**
   - Open browser: `http://polwel-pdms.customized3.corsivalab.xyz/polwel-users`
   - Should load the React app, not 404

## Current Configuration Summary

The fixed Apache configuration now:
- ✅ Serves frontend from `/www/wwwroot/polwelpdms/dist/`
- ✅ Proxies API calls to backend running on port 3001
- ✅ Handles SPA routing correctly
- ✅ Uses correct log paths for aaPanel
- ✅ SSL section commented out (until certificate is ready)
- ✅ No missing file dependencies

## Troubleshooting

If you still get errors:

1. **Check if frontend files exist:**
   ```bash
   ls -la /www/wwwroot/polwelpdms/dist/index.html
   ```

2. **Check Apache logs:**
   ```bash
   tail -f /www/wwwlogs/polwel_error.log
   tail -f /www/wwwlogs/polwel_access.log
   ```

3. **Check backend logs:**
   ```bash
   pm2 logs polwel-backend
   ```

4. **Verify configuration syntax:**
   ```bash
   apache2ctl configtest
   ```

## Next Steps

Once everything works on HTTP:
1. Set up SSL certificate via aaPanel
2. Uncomment and configure SSL section
3. Enable HTTPS redirect
