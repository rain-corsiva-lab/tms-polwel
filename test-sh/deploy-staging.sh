#!/bin/bash

# POLWEL Deployment Script for Staging Server
# Usage: ./deploy-staging.sh

set -e

echo "🚀 Starting POLWEL Staging Deployment..."

# Configuration
SERVER_USER="root"  # Change to your server username
SERVER_HOST="polwel-pdms.customized3.corsivalab.xyz"
PROJECT_DIR="/var/www/polwel"
BACKEND_DIR="$PROJECT_DIR/polwel-backend"
FRONTEND_DIR="$PROJECT_DIR/polwel-frontend"
DOMAIN="polwel-pdms.customized3.corsivalab.xyz"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if SSH key exists
if [ ! -f ~/.ssh/id_rsa ]; then
    print_warning "SSH key not found. You'll need to enter password for each SSH command."
fi

print_status "Building project locally..."

# Build backend
print_status "Building backend..."
cd polwel-backend
npm install
npm run build

# Build frontend with staging environment
print_status "Building frontend for staging..."
cd ../
VITE_API_URL=https://$DOMAIN/api npm run build

# Create deployment package
print_status "Creating deployment package..."
tar -czf polwel-staging.tar.gz \
    polwel-backend/dist \
    polwel-backend/package.json \
    polwel-backend/package-lock.json \
    polwel-backend/prisma \
    polwel-backend/.env.staging \
    dist

print_status "Uploading to staging server..."
scp polwel-staging.tar.gz $SERVER_USER@$SERVER_HOST:/tmp/

print_status "Deploying on staging server..."
ssh $SERVER_USER@$SERVER_HOST << 'ENDSSH'
set -e

# Navigate to project directory
cd /var/www
sudo mkdir -p polwel
cd polwel

# Backup current deployment
if [ -d "current" ]; then
    sudo mv current backup-$(date +%Y%m%d_%H%M%S)
fi

# Extract new deployment
sudo tar -xzf /tmp/polwel-staging.tar.gz
sudo mkdir -p current
sudo mv polwel-backend/dist current/backend
sudo mv polwel-backend/package*.json current/backend/
sudo mv polwel-backend/prisma current/backend/
sudo mv polwel-backend/.env.staging current/backend/.env
sudo mv dist current/frontend

# Install backend dependencies
cd current/backend
sudo npm install --production

# Setup database
sudo npm run db:generate
sudo npm run db:deploy

# Set proper permissions
sudo chown -R www-data:www-data /var/www/polwel
sudo chmod -R 755 /var/www/polwel

# Restart services
sudo systemctl restart polwel-backend
sudo systemctl reload apache2

echo "✅ Deployment completed successfully!"
ENDSSH

# Cleanup
rm polwel-staging.tar.gz

print_status "🎉 Staging deployment completed!"
print_status "Frontend: https://$DOMAIN"
print_status "Backend API: https://$DOMAIN/api"

echo ""
print_warning "Don't forget to:"
print_warning "1. Update database credentials in .env.staging"
print_warning "2. Set up SSL certificate"
print_warning "3. Configure email settings if needed"
