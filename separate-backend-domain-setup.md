# POLWEL TMS - Separate Backend Domain Setup Guide

## New Architecture Overview

### Current Setup:
- **Frontend**: https://polwel-pdms.customized3.corsivalab.xyz/
- **Backend**: Mixed with frontend (complex proxy setup)

### New Setup:
- **Frontend**: https://polwel-pdms.customized3.corsivalab.xyz/
- **Backend**: https://backend-polwel-pdms.customized3.corsivalab.xyz/

## Step 1: Update Frontend Configuration

### 1.1 Update Staging Environment File
Update your `.env.staging` file to point to the new backend domain:

```bash
# Staging Environment
VITE_API_URL=https://backend-polwel-pdms.customized3.corsivalab.xyz/api
VITE_APP_NAME=POLWEL Training Management System
VITE_APP_VERSION=1.0.0
```

### 1.2 Rebuild Frontend for Staging
```bash
# Build with new backend URL
npm run build:staging
```

## Step 2: Set Up New Backend Domain in aaPanel

### 2.1 Add New Domain
1. **Login to aaPanel** → Website
2. **Click "Add Site"**
3. **Configure:**
   - **Domain:** `backend-polwel-pdms.customized3.corsivalab.xyz`
   - **Root Directory:** `/www/wwwroot/backend-polwel-pdms`
   - **PHP Version:** Not needed (Node.js backend)
   - **Database:** Not needed for this step

### 2.2 Create Directory Structure
```bash
# SSH to server
ssh root@polwel-pdms.customized3.corsivalab.xyz

# Create backend directory
mkdir -p /www/wwwroot/backend-polwel-pdms
cd /www/wwwroot/backend-polwel-pdms

# Create basic structure
mkdir -p polwel-backend
```

## Step 3: Configure Backend Domain

### 3.1 Create Simple Backend Apache Config
Create this Apache configuration for the backend domain:

```apache
<VirtualHost *:80>
    ServerName backend-polwel-pdms.customized3.corsivalab.xyz
    
    # All requests go to Node.js backend
    ProxyPreserveHost On
    ProxyPass / http://localhost:3001/
    ProxyPassReverse / http://localhost:3001/
    
    # Security Headers
    Header always set X-Content-Type-Options "nosniff"
    Header always set X-Frame-Options "DENY"
    Header always set X-XSS-Protection "1; mode=block"
    Header always set Referrer-Policy "strict-origin-when-cross-origin"
    Header always set Permissions-Policy "camera=(), microphone=(), geolocation=()"
    
    # CORS Headers for frontend domain
    Header always set Access-Control-Allow-Origin "https://polwel-pdms.customized3.corsivalab.xyz"
    Header always set Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS, PATCH"
    Header always set Access-Control-Allow-Headers "Content-Type, Authorization, X-Requested-With"
    Header always set Access-Control-Allow-Credentials "true"
    
    # Handle OPTIONS requests for CORS
    <Location />
        <LimitExcept OPTIONS>
            Require all granted
        </LimitExcept>
    </Location>
    
    # Logs
    ErrorLog /www/wwwlogs/backend_polwel_error.log
    CustomLog /www/wwwlogs/backend_polwel_access.log combined
</VirtualHost>
```

### 3.2 Apply Backend Configuration
1. **In aaPanel:** Website → backend-polwel-pdms.customized3.corsivalab.xyz → Settings
2. **Configuration File tab** → Replace content with above config
3. **Save** configuration

## Step 4: Update Frontend Domain Configuration

### 4.1 Simplify Frontend Apache Config
Now that backend is separate, simplify the frontend config:

```apache
<VirtualHost *:80>
    ServerName polwel-pdms.customized3.corsivalab.xyz
    DocumentRoot /www/wwwroot/polwelpdms/dist
    
    # Frontend - serve static files
    <Directory /www/wwwroot/polwelpdms/dist>
        Options -Indexes +FollowSymLinks
        AllowOverride All
        Require all granted
        
        # Handle React Router (SPA routing)
        RewriteEngine On
        RewriteBase /
        RewriteRule ^index\.html$ - [L]
        RewriteCond %{REQUEST_FILENAME} !-f
        RewriteCond %{REQUEST_FILENAME} !-d
        RewriteRule . /index.html [L]
    </Directory>
    
    # Security Headers
    Header always set X-Content-Type-Options "nosniff"
    Header always set X-Frame-Options "DENY"
    Header always set X-XSS-Protection "1; mode=block"
    Header always set Referrer-Policy "strict-origin-when-cross-origin"
    Header always set Permissions-Policy "camera=(), microphone=(), geolocation=()"
    
    # Compression
    <IfModule mod_deflate.c>
        AddOutputFilterByType DEFLATE text/plain
        AddOutputFilterByType DEFLATE text/html
        AddOutputFilterByType DEFLATE text/xml
        AddOutputFilterByType DEFLATE text/css
        AddOutputFilterByType DEFLATE application/xml
        AddOutputFilterByType DEFLATE application/xhtml+xml
        AddOutputFilterByType DEFLATE application/rss+xml
        AddOutputFilterByType DEFLATE application/javascript
        AddOutputFilterByType DEFLATE application/x-javascript
        AddOutputFilterByType DEFLATE application/json
    </IfModule>
    
    # Cache static assets
    <IfModule mod_expires.c>
        ExpiresActive On
        ExpiresByType text/css "access plus 1 year"
        ExpiresByType application/javascript "access plus 1 year"
        ExpiresByType image/png "access plus 1 year"
        ExpiresByType image/jpg "access plus 1 year"
        ExpiresByType image/jpeg "access plus 1 year"
        ExpiresByType image/gif "access plus 1 year"
        ExpiresByType image/svg+xml "access plus 1 year"
        ExpiresByType image/x-icon "access plus 1 year"
        ExpiresByType application/pdf "access plus 1 month"
        ExpiresByType text/html "access plus 1 day"
    </IfModule>
    
    # Logs
    ErrorLog /www/wwwlogs/polwel_frontend_error.log
    CustomLog /www/wwwlogs/polwel_frontend_access.log combined
</VirtualHost>
```

## Step 5: Deploy Backend to New Domain

### 5.1 Upload Backend Files
```bash
# Copy backend files to new location
ssh root@polwel-pdms.customized3.corsivalab.xyz

# Copy from old location to new
cp -r /www/wwwroot/polwelpdms/polwel-backend/* /www/wwwroot/backend-polwel-pdms/polwel-backend/

# Navigate to new backend location
cd /www/wwwroot/backend-polwel-pdms/polwel-backend
```

### 5.2 Update Backend Environment
Create new staging environment file for backend:

```bash
# Create .env.staging for backend
cat > .env.staging << 'EOF'
# Staging Environment
NODE_ENV=staging
PORT=3001

# Database
DATABASE_URL="postgresql://polwel:rzEDMEnpimechG24@localhost:5432/polwel"

# JWT
JWT_SECRET="your-staging-jwt-secret-key"

# CORS - Updated for new frontend domain
CORS_ORIGIN="https://polwel-pdms.customized3.corsivalab.xyz"
EOF
```

### 5.3 Install Dependencies and Build
```bash
# Install missing type definitions
npm install --save-dev @types/express @types/cors @types/morgan @types/jsonwebtoken @types/node @types/bcrypt @types/helmet

# Clean and build
rm -rf dist
npm run build

# Update PM2 configuration for new location
pm2 delete polwel-backend  # Remove old process
pm2 start dist/index.js --name "backend-polwel-pdms" --env staging

# Save PM2 configuration
pm2 save
```

## Step 6: Update DNS (if needed)

If you're managing DNS yourself, add an A record for:
- **Name:** `backend-polwel-pdms.customized3.corsivalab.xyz`
- **Type:** A
- **Value:** Your server IP address

## Step 7: Testing the New Setup

### 7.1 Test Backend Domain
```bash
# Test backend health
curl http://backend-polwel-pdms.customized3.corsivalab.xyz/health

# Test API endpoint
curl http://backend-polwel-pdms.customized3.corsivalab.xyz/api/polwel-users?page=1&limit=5
```

### 7.2 Upload Updated Frontend
```bash
# From your local machine, upload the rebuilt frontend
# Upload contents of dist/ to /www/wwwroot/polwelpdms/dist/
```

### 7.3 Test Complete Setup
1. **Frontend:** Visit `https://polwel-pdms.customized3.corsivalab.xyz`
2. **Check Network Tab:** API calls should go to `https://backend-polwel-pdms.customized3.corsivalab.xyz/api/*`
3. **Test Login:** Verify authentication works across domains

## Step 8: SSL Certificates (Optional but Recommended)

### 8.1 Get SSL for Backend Domain
```bash
# Install SSL for backend domain
certbot --apache -d backend-polwel-pdms.customized3.corsivalab.xyz
```

### 8.2 Update Frontend Environment to HTTPS
```bash
# Update .env.staging
VITE_API_URL=https://backend-polwel-pdms.customized3.corsivalab.xyz/api
```

## Benefits of This New Setup:

✅ **Clean Separation:** Frontend and backend are completely separate
✅ **Easy Scaling:** Can scale frontend and backend independently  
✅ **Simple Deployment:** No complex proxy rules
✅ **Better Debugging:** Clear separation of concerns
✅ **SSL Ready:** Each domain can have its own SSL certificate
✅ **CORS Handling:** Explicit CORS configuration for security

## Quick Commands Summary:

```bash
# 1. Update frontend environment and rebuild
npm run build:staging

# 2. Add domain in aaPanel
# 3. Copy backend files
cp -r /www/wwwroot/polwelpdms/polwel-backend/* /www/wwwroot/backend-polwel-pdms/polwel-backend/

# 4. Install dependencies and build backend
cd /www/wwwroot/backend-polwel-pdms/polwel-backend
npm install --save-dev @types/express @types/cors @types/morgan @types/jsonwebtoken @types/node @types/bcrypt @types/helmet
npm run build

# 5. Start backend with PM2
pm2 start dist/index.js --name "backend-polwel-pdms" --env staging

# 6. Test everything
curl http://backend-polwel-pdms.customized3.corsivalab.xyz/health
```

This setup will give you a much cleaner and more maintainable staging environment!
