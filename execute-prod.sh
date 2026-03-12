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
apt-get update -qq 2>/dev/null || true
# Full Puppeteer-required dependency set (covers all Chrome shared-library errors)
apt-get install -y --no-install-recommends \
  ca-certificates fonts-liberation libappindicator3-1 \
  libasound2 libatk-bridge2.0-0 libatk1.0-0 libcairo2 libcups2 \
  libdbus-1-3 libdrm2 libexpat1 libfontconfig1 libgbm1 \
  libglib2.0-0 libgtk-3-0 libnspr4 libnss3 \
  libpango-1.0-0 libpangocairo-1.0-0 \
  libx11-6 libx11-xcb1 libxcb1 libxcb-dri3-0 \
  libxcomposite1 libxcursor1 libxdamage1 libxext6 libxfixes3 \
  libxi6 libxkbcommon0 libxrandr2 libxrender1 \
  libxshmfence1 libxss1 libxtst6 lsb-release wget xdg-utils 2>/dev/null || true
# Ubuntu 24.04+ renames libasound2 → libasound2t64
apt-get install -y --no-install-recommends libasound2t64 2>/dev/null || true

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
