#!/bin/bash

# POLWEL Staging Deployment Script
# Executed via Bitbucket Pipelines SSH

# Run entire script as root
sudo bash << 'EOF'
set -e

# Configuration
PROJECT_DIR="/www/wwwroot/polwelpdms"
PM2_PATH="/www/server/nodejs/v20.10.0/bin/pm2"
NODE_PATH="/www/server/nodejs/v20.10.0/bin"

# Add Node to PATH
export PATH="$NODE_PATH:$PATH"

echo "🚀 Starting Staging Deployment..."

# Navigate to project
cd $PROJECT_DIR

# Git configuration & pull from staging branch
git config --global --add safe.directory $PROJECT_DIR
git pull origin staging -X theirs

# Frontend build
echo "📦 Installing frontend dependencies..."
npm install

echo "🎨 Building frontend..."
rm -f dist/.user.ini && npm run build:staging

# Backend build
echo "📦 Installing backend dependencies..."
cd $PROJECT_DIR/polwel-backend
npm install

echo "🔧 Applying Prisma migrations..."
npm run db:deploy

echo "🔧 Generating Prisma client..."
npm run db:generate

echo "📦 Building backend..."
npm run build

# Restart PM2
echo "🔄 Restarting PM2 process..."
$PM2_PATH restart polwel-backend || $PM2_PATH start dist/index.js --name polwel-backend -i 3

echo "✅ Staging deployment completed!"
$PM2_PATH status

EOF
