#!/bin/bash

# Server-side fix script for TypeScript compilation errors
# Run this on your server: /www/wwwroot/polwelpdms/polwel-backend/

echo "🔧 Installing missing TypeScript type definitions..."

# Install all missing @types packages
npm install --save-dev \
  @types/express \
  @types/cors \
  @types/morgan \
  @types/jsonwebtoken \
  @types/node \
  @types/bcrypt \
  @types/helmet

echo "✅ Type definitions installed"

echo "🧹 Cleaning previous build..."
rm -rf dist

echo "🔨 Building TypeScript..."
npm run build

if [ $? -eq 0 ]; then
    echo "✅ Build successful!"
    echo "🔄 Restarting PM2 process..."
    pm2 restart polwel-backend
    echo "🎉 Backend updated and restarted!"
else
    echo "❌ Build failed. Check errors above."
    exit 1
fi

echo "🧪 Testing health endpoint..."
curl -s http://localhost:3001/health | head -1
