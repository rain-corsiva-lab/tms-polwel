#!/bin/bash

# POLWEL TMS - CORS Fix Deployment Script
echo "🔧 POLWEL TMS - Fixing CORS Issues"
echo "=================================="

# Configuration
BACKEND_PATH="/www/wwwroot/polwelpdms/polwel-backend"
FRONTEND_PATH="/www/wwwroot/polwelpdms/dist"

echo "📍 Backend Path: $BACKEND_PATH"
echo "📍 Frontend Path: $FRONTEND_PATH"
echo ""

# Step 1: Update backend environment file
echo "🔄 Step 1: Updating backend environment file..."
if [ -f "$BACKEND_PATH/.env.staging" ]; then
    # Backup current environment file
    cp "$BACKEND_PATH/.env.staging" "$BACKEND_PATH/.env.staging.backup"
    echo "✅ Backed up current .env.staging"
    
    # Update CORS configuration
    sed -i 's/CORS_ORIGIN=/CORS_ORIGINS=/g' "$BACKEND_PATH/.env.staging"
    
    # Add FRONTEND_URL if it doesn't exist
    if ! grep -q "FRONTEND_URL=" "$BACKEND_PATH/.env.staging"; then
        echo "FRONTEND_URL=https://polwel-pdms.customized3.corsivalab.xyz" >> "$BACKEND_PATH/.env.staging"
    fi
    
    echo "✅ Updated CORS configuration in .env.staging"
else
    echo "⚠️  .env.staging not found at $BACKEND_PATH"
fi

# Step 2: Copy updated backend files
echo ""
echo "🔄 Step 2: Updating backend files..."

# You'll need to manually copy these files to the server:
echo "📦 Files to upload to $BACKEND_PATH/:"
echo "   - src/index.ts (updated CORS configuration)"
echo "   - .env.staging (updated environment)"

# Step 3: Rebuild backend
echo ""
echo "🔄 Step 3: Rebuilding backend..."
cd "$BACKEND_PATH"

if [ -f "package.json" ]; then
    echo "Building TypeScript..."
    npm run build
    
    if [ $? -eq 0 ]; then
        echo "✅ Backend built successfully"
    else
        echo "❌ Backend build failed"
        exit 1
    fi
else
    echo "⚠️  package.json not found at $BACKEND_PATH"
fi

# Step 4: Restart backend with staging environment
echo ""
echo "🔄 Step 4: Restarting backend..."

# Stop current backend process
pm2 delete polwel-backend 2>/dev/null || true

# Start backend with staging environment
cd "$BACKEND_PATH"
NODE_ENV=staging pm2 start dist/index.js --name "polwel-backend"

if [ $? -eq 0 ]; then
    echo "✅ Backend restarted successfully"
    pm2 save
else
    echo "❌ Failed to restart backend"
    exit 1
fi

# Step 5: Test backend
echo ""
echo "🧪 Step 5: Testing backend..."

sleep 3  # Wait for backend to start

# Test health endpoint
HEALTH_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/health)
if [ "$HEALTH_RESPONSE" = "200" ]; then
    echo "✅ Backend health check passed"
else
    echo "⚠️  Backend health check failed (${HEALTH_RESPONSE})"
fi

# Test CORS with staging domain
CORS_TEST=$(curl -s -o /dev/null -w "%{http_code}" \
    -H "Origin: https://polwel-pdms.customized3.corsivalab.xyz" \
    -H "Access-Control-Request-Method: POST" \
    -H "Access-Control-Request-Headers: Content-Type,Authorization" \
    -X OPTIONS \
    http://localhost:3001/api/auth/login)

if [ "$CORS_TEST" = "200" ]; then
    echo "✅ CORS preflight test passed"
else
    echo "⚠️  CORS preflight test failed (${CORS_TEST})"
fi

# Step 6: Show current status
echo ""
echo "📊 Current Status:"
echo "=================="

echo "PM2 Processes:"
pm2 status

echo ""
echo "Backend Environment:"
if [ -f "$BACKEND_PATH/.env.staging" ]; then
    echo "CORS_ORIGINS: $(grep CORS_ORIGINS $BACKEND_PATH/.env.staging || echo 'Not set')"
    echo "FRONTEND_URL: $(grep FRONTEND_URL $BACKEND_PATH/.env.staging || echo 'Not set')"
    echo "NODE_ENV: $(grep NODE_ENV $BACKEND_PATH/.env.staging || echo 'Not set')"
fi

echo ""
echo "🎉 CORS Fix Deployment Complete!"
echo ""
echo "📋 Next Steps:"
echo "1. Apply the updated Apache configuration (apache-unified-domain.conf)"
echo "2. Upload the new frontend build files to $FRONTEND_PATH"
echo "3. Test login functionality"
echo ""
echo "🧪 Test Commands:"
echo "curl -H 'Origin: https://polwel-pdms.customized3.corsivalab.xyz' https://polwel-pdms.customized3.corsivalab.xyz/api/health"
echo ""
echo "📧 Check logs if issues persist:"
echo "pm2 logs polwel-backend"
echo "tail -f /www/wwwlogs/polwelpdms_error.log"
