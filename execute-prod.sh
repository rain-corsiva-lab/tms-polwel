#!/bin/bash

# POLWEL Production Deployment Script
# Executed via Bitbucket Pipelines SSH

# Run entire script as root
sudo bash << 'EOF'
set -e

# Configuration
PROJECT_DIR="/www/wwwroot/polwelpdms"
PM2_PATH="/www/server/nodejs/v22.11.0/bin/pm2"
NODE_PATH="/www/server/nodejs/v22.11.0/bin"

# Add Node to PATH
export PATH="$NODE_PATH:$PATH"

echo "🚀 Starting Production Deployment..."

# Navigate to project
cd $PROJECT_DIR

# Git configuration & pull
git config --global --add safe.directory $PROJECT_DIR
git pull origin main -X theirs

# Frontend build
echo "📦 Installing frontend dependencies..."
npm install

echo "🎨 Building frontend..."
npm run build:production

# Backend build
echo "📦 Installing backend dependencies..."
cd $PROJECT_DIR/polwel-backend
npm install

echo "🔧 Installing Chrome system libraries for PDF certificate generation..."
apt-get install -y --no-install-recommends \
  libatk1.0-0 libatk-bridge2.0-0 libcups2 libdrm2 libxkbcommon0 \
  libxcomposite1 libxdamage1 libxfixes3 libxrandr2 libgbm1 \
  libnss3 libnspr4 libpango-1.0-0 libpangocairo-1.0-0 \
  libxss1 libxtst6 libxshmfence1 libx11-xcb1 libxcb-dri3-0 \
  ca-certificates fonts-liberation wget 2>/dev/null || true

echo "🔧 Applying Prisma migrations..."
npm run db:deploy

echo "🔧 Generating Prisma client..."
npm run db:generate

echo "📦 Building backend..."
npm run build

# Restart PM2
echo "🔄 Restarting PM2 process..."
$PM2_PATH restart polwel-backend || $PM2_PATH start ecosystem.config.js --name polwel-backend

echo "✅ Production deployment completed!"
$PM2_PATH status

EOF
