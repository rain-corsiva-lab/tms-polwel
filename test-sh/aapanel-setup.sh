#!/bin/bash

echo "🚀 Setting up POLWEL on aaPanel Server"

# Configuration for your server
DOMAIN="polwel-pdms.customized3.corsivalab.xyz"
FRONTEND_PATH="/www/wwwroot/$DOMAIN"
BACKEND_PATH="/www/wwwroot/polwel-backend"
DB_NAME="polwel"
DB_USER="polwel"
DB_PASS="rzEDMEnpimechG24"

# Colors for output
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

print_status "Setting up directories..."

# Create backend directory if it doesn't exist
sudo mkdir -p $BACKEND_PATH
sudo mkdir -p $BACKEND_PATH/logs

# Set proper permissions for aaPanel
sudo chown -R www:www $FRONTEND_PATH
sudo chown -R www:www $BACKEND_PATH
sudo chmod -R 755 $FRONTEND_PATH
sudo chmod -R 755 $BACKEND_PATH

print_status "Installing Node.js dependencies..."

# Navigate to backend directory
cd $BACKEND_PATH

# Install dependencies
sudo -u www npm install --production

if [ $? -ne 0 ]; then
    print_error "Failed to install npm dependencies"
    exit 1
fi

print_status "Setting up database..."

# Generate Prisma client
sudo -u www npx prisma generate

if [ $? -ne 0 ]; then
    print_error "Failed to generate Prisma client"
    exit 1
fi

# Run database migrations
sudo -u www npx prisma migrate deploy

if [ $? -ne 0 ]; then
    print_warning "Database migration failed. This might be normal for first deployment."
    print_warning "You may need to run 'npx prisma db push' manually if schema doesn't exist"
fi

print_status "Installing PM2 globally..."

# Install PM2 for process management
npm install -g pm2

print_status "Setting up PM2 ecosystem..."

# Create PM2 ecosystem file
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'polwel-backend',
    script: './index.js',
    cwd: '$BACKEND_PATH',
    env: {
      NODE_ENV: 'staging',
      PORT: 3001
    },
    instances: 1,
    exec_mode: 'fork',
    watch: false,
    max_memory_restart: '1G',
    error_file: './logs/backend-error.log',
    out_file: './logs/backend-out.log',
    log_file: './logs/backend-combined.log',
    time: true,
    restart_delay: 5000,
    max_restarts: 10,
    min_uptime: '10s'
  }]
};
EOF

print_status "Starting backend service..."

# Start the backend with PM2
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup

print_status "✅ Setup completed!"
echo ""
print_warning "Next steps in aaPanel:"
echo "1. Go to Website settings for $DOMAIN"
echo "2. Set up reverse proxy:"
echo "   - Proxy Name: API"
echo "   - Target URL: http://127.0.0.1:3001"
echo "   - Proxy Directory: /api"
echo "3. Test the deployment:"
echo "   - Frontend: https://$DOMAIN"
echo "   - API: https://$DOMAIN/api/health"
echo ""
print_status "Useful commands:"
echo "pm2 status          - Check backend status"
echo "pm2 logs polwel-backend - View backend logs"
echo "pm2 restart polwel-backend - Restart backend"
echo "pm2 stop polwel-backend - Stop backend"
