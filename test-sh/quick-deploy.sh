#!/bin/bash

# Quick Deploy Script for POLWEL
# Usage: ./quick-deploy.sh [local|staging|production]

ENVIRONMENT=${1:-local}

echo "🚀 Quick Deploy for POLWEL - Environment: $ENVIRONMENT"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Validate environment
if [[ ! "$ENVIRONMENT" =~ ^(local|staging|production)$ ]]; then
    print_error "Invalid environment. Use: local, staging, or production"
    exit 1
fi

# Check if environment files exist
if [ ! -f "polwel-backend/.env.$ENVIRONMENT" ]; then
    print_error "Environment file polwel-backend/.env.$ENVIRONMENT not found!"
    exit 1
fi

if [ ! -f ".env.$ENVIRONMENT" ]; then
    print_error "Frontend environment file .env.$ENVIRONMENT not found!"
    exit 1
fi

print_status "Building backend..."
cd polwel-backend
npm install
npm run build

if [ $? -ne 0 ]; then
    print_error "Backend build failed!"
    exit 1
fi

print_status "Building frontend for $ENVIRONMENT..."
cd ..
npm install
npm run build:$ENVIRONMENT

if [ $? -ne 0 ]; then
    print_error "Frontend build failed!"
    exit 1
fi

print_status "✅ Build completed successfully!"

if [ "$ENVIRONMENT" = "local" ]; then
    print_status "Starting local development..."
    echo ""
    echo "To start the application locally:"
    echo "1. Backend: cd polwel-backend && npm run start:local"
    echo "2. Frontend: npm run preview"
    echo ""
    echo "Or use PM2:"
    echo "pm2 start polwel-backend/ecosystem.config.js --only polwel-backend-local"
else
    print_warning "For $ENVIRONMENT deployment:"
    echo ""
    echo "1. Upload built files to your server"
    echo "2. Copy environment file: polwel-backend/.env.$ENVIRONMENT to server"
    echo "3. Install dependencies: npm install --production"
    echo "4. Run migrations: npx prisma migrate deploy"
    echo "5. Start service: systemctl start polwel-backend"
    echo ""
    echo "Files to upload:"
    echo "📁 Backend: polwel-backend/dist/* → /var/www/polwel/backend/"
    echo "📁 Frontend: dist/* → /var/www/polwel/frontend/"
    echo "📄 Config: polwel-backend/.env.$ENVIRONMENT → /var/www/polwel/backend/.env"
fi

print_status "🎉 Deployment preparation completed!"
