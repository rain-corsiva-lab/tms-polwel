# 🚀 POLWEL TMS - Complete Separate Backend Domain Setup

## 📋 Overview

**Current Status:**
- ✅ Frontend built with new backend URL: `https://backend-polwel-pdms.customized3.corsivalab.xyz/api`
- ✅ Apache configurations ready
- ✅ Backend compilation errors fixed
- ✅ Deployment script created

**Next Steps:**
- ⏳ Set up new backend domain in aaPanel
- ⏳ Deploy backend to new location
- ⏳ Test complete system

## 🎯 Architecture

```
Frontend Domain: polwel-pdms.customized3.corsivalab.xyz
├── Serves: React SPA (static files)
├── Location: /www/wwwroot/polwelpdms/dist/
└── Apache: Frontend-only configuration

Backend Domain: backend-polwel-pdms.customized3.corsivalab.xyz  
├── Serves: API endpoints
├── Location: /www/wwwroot/backend-polwel-pdms/polwel-backend/
├── Apache: Proxy to localhost:3001
└── PM2: backend-polwel-pdms process
```

## 🚀 Quick Deployment Guide

### 1. aaPanel Setup (5 minutes)

1. **Add Backend Domain:**
   - aaPanel → Website → Add Site
   - Domain: `backend-polwel-pdms.customized3.corsivalab.xyz`
   - Root: `/www/wwwroot/backend-polwel-pdms`

2. **Backend Apache Config:**
   ```apache
   <VirtualHost *:80>
       ServerName backend-polwel-pdms.customized3.corsivalab.xyz
       DocumentRoot /www/wwwroot/backend-polwel-pdms
       
       # Proxy all requests to Node.js
       ProxyPreserveHost On
       ProxyPass / http://localhost:3001/
       ProxyPassReverse / http://localhost:3001/
       
       # CORS headers for frontend
       Header always set Access-Control-Allow-Origin "https://polwel-pdms.customized3.corsivalab.xyz"
       Header always set Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS"
       Header always set Access-Control-Allow-Headers "Content-Type, Authorization"
       Header always set Access-Control-Allow-Credentials "true"
       
       # Handle OPTIONS requests
       RewriteEngine On
       RewriteCond %{REQUEST_METHOD} OPTIONS
       RewriteRule ^(.*)$ $1 [R=200,L]
   </VirtualHost>
   ```

3. **Frontend Apache Config:**
   ```apache
   <VirtualHost *:80>
       ServerName polwel-pdms.customized3.corsivalab.xyz
       DocumentRoot /www/wwwroot/polwelpdms/dist
       
       # Serve static files
       <Directory "/www/wwwroot/polwelpdms/dist">
           Options -Indexes +FollowSymLinks
           AllowOverride All
           Require all granted
       </Directory>
       
       # SPA routing
       RewriteEngine On
       RewriteCond %{REQUEST_FILENAME} !-f
       RewriteCond %{REQUEST_FILENAME} !-d
       RewriteRule . /index.html [L]
   </VirtualHost>
   ```

### 2. Deploy Backend (Use Script)

**Upload and run the deployment script:**

```bash
# Upload deploy-separate-backend.sh to server
# Make executable and run
chmod +x deploy-separate-backend.sh
./deploy-separate-backend.sh
```

**Or manual deployment:**

```bash
# 1. Create directories
mkdir -p /www/wwwroot/backend-polwel-pdms/polwel-backend

# 2. Copy backend files
cp -r /www/wwwroot/polwelpdms/polwel-backend/* /www/wwwroot/backend-polwel-pdms/polwel-backend/

# 3. Install dependencies
cd /www/wwwroot/backend-polwel-pdms/polwel-backend
npm install --save-dev @types/express @types/cors @types/morgan @types/jsonwebtoken @types/node @types/bcrypt @types/helmet

# 4. Build
npm run build

# 5. Update PM2
pm2 delete polwel-backend
pm2 start dist/index.js --name "backend-polwel-pdms" --env staging
pm2 save
```

### 3. Upload Frontend

Upload your built `dist/` folder to `/www/wwwroot/polwelpdms/dist/`

### 4. Test Everything

```bash
# Backend health check
curl https://backend-polwel-pdms.customized3.corsivalab.xyz/health

# Frontend
# Open: https://polwel-pdms.customized3.corsivalab.xyz
```

## 🔧 Files Ready for Deployment

### ✅ Environment Configuration
- `.env.staging` updated with new backend URL
- Frontend built with: `https://backend-polwel-pdms.customized3.corsivalab.xyz/api`

### ✅ Apache Configurations
- `backend-domain.conf` - Backend proxy configuration
- `frontend-only.conf` - Frontend static file serving

### ✅ Deployment Automation
- `deploy-separate-backend.sh` - Complete backend deployment script

### ✅ Code Fixes
- Backend TypeScript compilation errors resolved
- AuthenticatedRequest interface fixed
- All dependencies ready

## 🎉 Benefits of This Setup

1. **Clean Separation**: Frontend and backend completely independent
2. **Easy Debugging**: Separate logs, separate processes
3. **Scalability**: Can scale frontend and backend independently
4. **Security**: Better isolation between components
5. **Maintenance**: Easier updates and deployments

## 📞 Support

**If you encounter issues:**

1. **Check PM2**: `pm2 status` and `pm2 logs backend-polwel-pdms`
2. **Check Apache**: `tail -f /www/wwwlogs/backend_polwel_error.log`
3. **Test endpoints**: Start with `/health` endpoint
4. **CORS issues**: Verify Origin headers match exactly

**Quick Commands:**
```bash
# Restart backend
pm2 restart backend-polwel-pdms

# Check backend status
curl localhost:3001/health

# View logs
pm2 logs backend-polwel-pdms --lines 50
```

---

🚀 **Ready to deploy!** Follow the steps above to complete your separate backend domain setup.
