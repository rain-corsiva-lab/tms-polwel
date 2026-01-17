# POLWEL TMS Manual Deployment Guide

## What We Have Ready:
✅ Frontend built in: `C:\laragon\www\polwel\dist\`
✅ Backend built in: `C:\laragon\www\polwel\polwel-backend\dist\`
✅ Simple Apache config: `C:\laragon\www\polwel\simple-apache-config.conf`

## Step-by-Step Manual Deployment

### Step 1: Upload Frontend Files

1. **Open aaPanel File Manager**
   - Login to your aaPanel: `http://your-server-ip:7800`
   - Go to **File Manager**

2. **Navigate to your domain folder**
   - Go to: `/www/wwwroot/polwelpdms/`

3. **Create/Clear the dist folder**
   - If `dist` folder doesn't exist, create it
   - If it exists, clear all contents inside it

4. **Upload frontend files**
   - Select all files from your local `C:\laragon\www\polwel\dist\` folder
   - Upload them to `/www/wwwroot/polwelpdms/dist/`
   - Make sure you have: `index.html`, `assets/`, `favicon.ico`, etc.

### Step 2: Upload Backend Files

1. **In aaPanel File Manager, navigate to:**
   - `/www/wwwroot/polwelpdms/polwel-backend/`

2. **Create dist folder if it doesn't exist**

3. **Upload backend files**
   - Select all files from your local `C:\laragon\www\polwel\polwel-backend\dist\` folder
   - Upload them to `/www/wwwroot/polwelpdms/polwel-backend/dist/`
   - Make sure you have: `index.js`, `controllers/`, `routes/`, etc.

4. **Upload other backend files**
   - Upload `package.json` from `C:\laragon\www\polwel\polwel-backend\package.json`
   - Upload `node_modules` folder OR run `npm install` on server later

### Step 3: Configure Apache

1. **In aaPanel, go to Website**
   - Click on **Website** in left menu
   - Find your domain: `polwel-pdms.customized3.corsivalab.xyz`
   - Click **Settings** (gear icon)

2. **Go to Configuration File tab**
   - Click **Configuration File** tab
   - You'll see the current Apache config

3. **Replace with our simple config**
   - Copy the entire content from `C:\laragon\www\polwel\simple-apache-config.conf`
   - Replace ALL content in the aaPanel configuration editor
   - Click **Save**

### Step 4: Set Up Environment Variables

1. **Create .env file on server**
   - In aaPanel File Manager, go to `/www/wwwroot/polwelpdms/polwel-backend/`
   - Create new file: `.env`
   - Add this content:
   ```
   # Database
   DATABASE_URL="postgresql://polwel:rzEDMEnpimechG24@localhost:5432/polwel"
   
   # Server
   PORT=3001
   NODE_ENV=staging
   
   # JWT
   JWT_SECRET="your-super-secret-jwt-key-here"
   
   # CORS
   CORS_ORIGIN="https://polwel-pdms.customized3.corsivalab.xyz"
   ```

### Step 5: Install Dependencies and Start Backend

1. **SSH to your server**
   ```bash
   ssh root@polwel-pdms.customized3.corsivalab.xyz
   ```

2. **Navigate to backend directory**
   ```bash
   cd /www/wwwroot/polwelpdms/polwel-backend
   ```

3. **Install dependencies**
   ```bash
   npm install
   ```

4. **Install PM2 globally if not installed**
   ```bash
   npm install -g pm2
   ```

5. **Start the backend with PM2**
   ```bash
   pm2 start dist/index.js --name "polwel-backend"
   ```

6. **Save PM2 configuration**
   ```bash
   pm2 save
   pm2 startup
   ```

### Step 6: Test Everything

1. **Test backend directly**
   ```bash
   curl http://localhost:3001/health
   # Should return: {"status":"OK",...}
   ```

2. **Test frontend**
   - Open browser: `http://polwel-pdms.customized3.corsivalab.xyz`
   - Should load your React app

3. **Test API through proxy**
   ```bash
   curl http://polwel-pdms.customized3.corsivalab.xyz/health
   # Should return: {"status":"OK",...}
   ```

4. **Test SPA routing**
   - Open browser: `http://polwel-pdms.customized3.corsivalab.xyz/polwel-users`
   - Should load the React app (not 404)

### Step 7: Troubleshooting

If something doesn't work:

1. **Check Apache configuration**
   ```bash
   apache2ctl configtest
   ```

2. **Check Apache logs**
   ```bash
   tail -f /www/wwwlogs/polwel_error.log
   tail -f /www/wwwlogs/polwel_access.log
   ```

3. **Check PM2 status**
   ```bash
   pm2 status
   pm2 logs polwel-backend
   ```

4. **Check if directories exist and have files**
   ```bash
   ls -la /www/wwwroot/polwelpdms/dist/
   ls -la /www/wwwroot/polwelpdms/polwel-backend/dist/
   ```

## Success Checklist:
- [ ] Frontend files uploaded to `/www/wwwroot/polwelpdms/dist/`
- [ ] Backend files uploaded to `/www/wwwroot/polwelpdms/polwel-backend/dist/`
- [ ] Apache configuration updated
- [ ] Dependencies installed with `npm install`
- [ ] Backend running with PM2
- [ ] Health check responds: `curl http://localhost:3001/health`
- [ ] Frontend loads: `http://polwel-pdms.customized3.corsivalab.xyz`
- [ ] API proxy works: `http://polwel-pdms.customized3.corsivalab.xyz/health`
- [ ] SPA routing works: Direct URLs load React app

Once all these steps work, your POLWEL TMS will be fully deployed!
