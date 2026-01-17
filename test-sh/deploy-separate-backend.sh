#!/bin/bash

# POLWEL TMS - Separate Backend Domain Deployment Script
# Run this script on your server after setting up the new backend domain

echo "🚀 POLWEL TMS - Separate Backend Domain Setup"
echo "=============================================="

# Configuration
FRONTEND_DOMAIN="polwel-pdms.customized3.corsivalab.xyz"
BACKEND_DOMAIN="backend-polwel-pdms.customized3.corsivalab.xyz"
FRONTEND_PATH="/www/wwwroot/polwelpdms"
BACKEND_PATH="/www/wwwroot/backend-polwel-pdms"

echo "📋 Configuration:"
echo "  Frontend: https://$FRONTEND_DOMAIN"
echo "  Backend:  https://$BACKEND_DOMAIN"
echo ""

# Step 1: Create backend directory structure
echo "📁 Step 1: Creating backend directory structure..."
mkdir -p $BACKEND_PATH/polwel-backend
cd $BACKEND_PATH

# Step 2: Copy backend files from old location
echo "📦 Step 2: Copying backend files..."
if [ -d "/www/wwwroot/polwelpdms/polwel-backend" ]; then
    cp -r /www/wwwroot/polwelpdms/polwel-backend/* $BACKEND_PATH/polwel-backend/
    echo "✅ Backend files copied successfully"
else
    echo "⚠️  Original backend directory not found. You'll need to upload files manually."
fi

# Step 3: Install backend dependencies
echo "📦 Step 3: Installing backend dependencies..."
cd $BACKEND_PATH/polwel-backend

# Install missing TypeScript type definitions
npm install --save-dev \
  @types/express \
  @types/cors \
  @types/morgan \
  @types/jsonwebtoken \
  @types/node \
  @types/bcrypt \
  @types/helmet

if [ $? -eq 0 ]; then
    echo "✅ Dependencies installed successfully"
else
    echo "❌ Failed to install dependencies"
    exit 1
fi

# Step 4: Build backend
echo "🔨 Step 4: Building backend..."
rm -rf dist
npm run build

if [ $? -eq 0 ]; then
    echo "✅ Backend built successfully"
else
    echo "❌ Backend build failed"
    exit 1
fi

# Step 5: Update PM2 configuration
echo "🔄 Step 5: Updating PM2 configuration..."

# Stop old backend process if it exists
pm2 delete polwel-backend 2>/dev/null || true

# Start new backend process
pm2 start dist/index.js --name "backend-polwel-pdms" --env staging

if [ $? -eq 0 ]; then
    echo "✅ Backend started with PM2"
    pm2 save
else
    echo "❌ Failed to start backend with PM2"
    exit 1
fi

# Step 6: Test backend
echo "🧪 Step 6: Testing backend..."
sleep 3  # Wait for backend to start

# Test health endpoint
HEALTH_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/health)
if [ "$HEALTH_RESPONSE" = "200" ]; then
    echo "✅ Backend health check passed (localhost:3001)"
else
    echo "⚠️  Backend health check failed (localhost:3001)"
fi

# Test through domain (if accessible)
DOMAIN_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://$BACKEND_DOMAIN/health)
if [ "$DOMAIN_RESPONSE" = "200" ]; then
    echo "✅ Backend domain check passed ($BACKEND_DOMAIN)"
else
    echo "⚠️  Backend domain check failed ($BACKEND_DOMAIN)"
    echo "   This is expected if DNS/Apache isn't configured yet"
fi

# Step 7: Display next steps
echo ""
echo "🎉 Backend deployment completed!"
echo ""
echo "📋 Next Steps:"
echo "1. 🌐 Add domain '$BACKEND_DOMAIN' in aaPanel:"
echo "   - Go to aaPanel → Website → Add Site"
echo "   - Domain: $BACKEND_DOMAIN"
echo "   - Root: $BACKEND_PATH"
echo ""
echo "2. ⚙️  Configure Apache for backend domain:"
echo "   - Copy the backend-domain.conf configuration"
echo "   - Apply it in aaPanel → Website → $BACKEND_DOMAIN → Configuration File"
echo ""
echo "3. ⚙️  Update frontend domain configuration:"
echo "   - Copy the frontend-only.conf configuration"
echo "   - Apply it in aaPanel → Website → $FRONTEND_DOMAIN → Configuration File"
echo ""
echo "4. 📤 Upload updated frontend files:"
echo "   - Upload your newly built dist/ files to $FRONTEND_PATH/dist/"
echo ""
echo "5. 🧪 Test the complete setup:"
echo "   - Frontend: https://$FRONTEND_DOMAIN"
echo "   - Backend: https://$BACKEND_DOMAIN/health"
echo ""
echo "6. 🔒 (Optional) Set up SSL certificates:"
echo "   - certbot --apache -d $BACKEND_DOMAIN"
echo "   - Update frontend .env.staging to use HTTPS"
echo ""

# Step 8: Show current status
echo "📊 Current Status:"
echo "PM2 Processes:"
pm2 status
echo ""
echo "Backend Health (local):"
curl -s http://localhost:3001/health | head -1 || echo "Backend not responding"
echo ""

echo "✅ Deployment script completed!"
echo "📧 Check the logs if you encounter issues:"
echo "   - PM2 logs: pm2 logs backend-polwel-pdms"
echo "   - Apache logs: tail -f /www/wwwlogs/backend_polwel_error.log"
