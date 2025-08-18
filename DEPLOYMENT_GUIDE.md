# POLWEL TMS - Complete Staging Server Setup Guide

## Prerequisites

### Server Requirements
- Ubuntu 20.04+ or CentOS 8+
- Node.js 18+ and npm
- PostgreSQL 12+
- Apache 2.4+
- SSL certificate (recommended)
- Domain: polwel-pdms.customized3.corsivalab.xyz

## Step 1: Initial Server Setup

### 1.1 Connect to your server
```bash
ssh root@polwel-pdms.customized3.corsivalab.xyz
```

### 1.2 Update system packages
```bash
apt update && apt upgrade -y
```

### 1.3 Install required packages
```bash
# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
apt install -y nodejs

# Install PostgreSQL
apt install -y postgresql postgresql-contrib

# Install Apache and modules
apt install -y apache2
a2enmod rewrite
a2enmod proxy
a2enmod proxy_http
a2enmod headers
a2enmod ssl
a2enmod expires
a2enmod deflate

# Install PM2 for process management (alternative to systemd)
npm install -g pm2
```

## Step 2: Database Setup

### 2.1 Create PostgreSQL database and user
```bash
sudo -u postgres psql

-- In PostgreSQL shell:
CREATE DATABASE polwel_staging_db;
CREATE USER staging_user WITH ENCRYPTED PASSWORD 'your_secure_password_here';
GRANT ALL PRIVILEGES ON DATABASE polwel_staging_db TO staging_user;
ALTER USER staging_user CREATEDB;
\q
```

### 2.2 Configure PostgreSQL (optional - for remote access)
```bash
# Edit postgresql.conf
nano /etc/postgresql/12/main/postgresql.conf
# Change: listen_addresses = 'localhost'

# Edit pg_hba.conf
nano /etc/postgresql/12/main/pg_hba.conf
# Add: host polwel_staging_db staging_user 127.0.0.1/32 md5

# Restart PostgreSQL
systemctl restart postgresql
```

## Step 3: Project Directory Setup

### 3.1 Create project directories
```bash
mkdir -p /var/www/polwel/backend
mkdir -p /var/www/polwel/frontend
mkdir -p /var/www/polwel/logs
chown -R www-data:www-data /var/www/polwel
```

## Step 4: Deploy Backend

### 4.1 Upload backend files
From your local machine, build and upload:
```bash
# Build locally
cd polwel-backend
npm run build

# Upload to server (using SCP or FTP)
scp -r dist/* root@polwel-pdms.customized3.corsivalab.xyz:/var/www/polwel/backend/
scp package.json package-lock.json root@polwel-pdms.customized3.corsivalab.xyz:/var/www/polwel/backend/
scp -r prisma root@polwel-pdms.customized3.corsivalab.xyz:/var/www/polwel/backend/
scp .env.staging root@polwel-pdms.customized3.corsivalab.xyz:/var/www/polwel/backend/.env
```

### 4.2 Install dependencies and setup database
```bash
cd /var/www/polwel/backend
npm install --production

# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate deploy

# Optional: Seed database
npx prisma db seed
```

### 4.3 Update environment file
```bash
nano /var/www/polwel/backend/.env
```

Update with your actual values:
```env
NODE_ENV=staging
PORT=3001
DATABASE_URL="postgresql://staging_user:your_secure_password_here@localhost:5432/polwel_staging_db"
JWT_SECRET=your_very_secure_jwt_secret_key_here
CORS_ORIGIN=https://polwel-pdms.customized3.corsivalab.xyz
```

### 4.4 Set up systemd service
```bash
# Copy service file
cp /path/to/uploaded/systemd/polwel-backend.service /etc/systemd/system/

# Enable and start service
systemctl daemon-reload
systemctl enable polwel-backend
systemctl start polwel-backend

# Check status
systemctl status polwel-backend
```

## Step 5: Deploy Frontend

### 5.1 Build and upload frontend
From your local machine:
```bash
# Build for staging
npm run build:staging

# Upload to server
scp -r dist/* root@polwel-pdms.customized3.corsivalab.xyz:/var/www/polwel/frontend/
```

## Step 6: Configure Apache

### 6.1 Create virtual host
```bash
# Copy the virtual host configuration
cp /path/to/uploaded/apache-config/polwel-staging.conf /etc/apache2/sites-available/

# Enable the site
a2ensite polwel-staging.conf

# Disable default site (optional)
a2dissite 000-default.conf

# Test configuration
apache2ctl configtest

# Restart Apache
systemctl restart apache2
```

### 6.2 Configure firewall
```bash
# Enable UFW firewall
ufw enable

# Allow necessary ports
ufw allow 22    # SSH
ufw allow 80    # HTTP
ufw allow 443   # HTTPS

# Check status
ufw status
```

## Step 7: SSL Certificate Setup (Recommended)

### 7.1 Using Let's Encrypt (Free)
```bash
# Install Certbot
apt install -y certbot python3-certbot-apache

# Get certificate
certbot --apache -d polwel-pdms.customized3.corsivalab.xyz

# Auto-renewal
crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

### 7.2 Using Custom SSL Certificate
If you have a custom SSL certificate:
```bash
# Upload certificate files to server
mkdir -p /etc/ssl/polwel
cp your-certificate.crt /etc/ssl/polwel/
cp your-private.key /etc/ssl/polwel/
cp ca-bundle.crt /etc/ssl/polwel/

# Update Apache configuration
nano /etc/apache2/sites-available/polwel-staging.conf
# Update SSL paths in the file

# Restart Apache
systemctl restart apache2
```

## Step 8: Monitoring and Logs

### 8.1 Set up log rotation
```bash
nano /etc/logrotate.d/polwel

# Add:
/var/www/polwel/logs/*.log {
    daily
    rotate 30
    compress
    delaycompress
    missingok
    notifempty
    create 644 www-data www-data
    postrotate
        systemctl reload polwel-backend
    endscript
}
```

### 8.2 Monitor services
```bash
# Check backend status
systemctl status polwel-backend

# Check backend logs
journalctl -u polwel-backend -f

# Check Apache logs
tail -f /var/log/apache2/polwel_error.log
tail -f /var/log/apache2/polwel_access.log

# Check database connections
sudo -u postgres psql -c "SELECT * FROM pg_stat_activity WHERE datname='polwel_staging_db';"
```

## Step 9: Performance Optimization

### 9.1 Configure PM2 (Alternative to systemd)
```bash
# Install PM2 globally
npm install -g pm2

# Create PM2 ecosystem file
nano /var/www/polwel/backend/ecosystem.config.js
```

```javascript
module.exports = {
  apps: [{
    name: 'polwel-backend',
    script: './dist/index.js',
    cwd: '/var/www/polwel/backend',
    env: {
      NODE_ENV: 'staging',
      PORT: 3001
    },
    instances: 2,
    exec_mode: 'cluster',
    watch: false,
    max_memory_restart: '1G',
    error_file: '/var/www/polwel/logs/backend-error.log',
    out_file: '/var/www/polwel/logs/backend-out.log',
    log_file: '/var/www/polwel/logs/backend-combined.log'
  }]
};
```

```bash
# Start with PM2
cd /var/www/polwel/backend
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save
pm2 startup
```

## Step 10: Testing Deployment

### 10.1 Test API endpoints
```bash
# Test health endpoint
curl -X GET https://polwel-pdms.customized3.corsivalab.xyz/api/health

# Test with authentication (replace with actual token)
curl -X GET https://polwel-pdms.customized3.corsivalab.xyz/api/partners \
  -H "Authorization: Bearer your_jwt_token"
```

### 10.2 Test frontend
Visit: https://polwel-pdms.customized3.corsivalab.xyz

## Step 11: Backup Strategy

### 11.1 Database backup script
```bash
nano /var/www/polwel/scripts/backup-db.sh
```

```bash
#!/bin/bash
BACKUP_DIR="/var/www/polwel/backups"
DATE=$(date +%Y%m%d_%H%M%S)
DB_NAME="polwel_staging_db"
DB_USER="staging_user"

mkdir -p $BACKUP_DIR

# Create database backup
pg_dump -U $DB_USER -h localhost $DB_NAME > $BACKUP_DIR/polwel_backup_$DATE.sql

# Keep only last 7 days of backups
find $BACKUP_DIR -name "polwel_backup_*.sql" -mtime +7 -delete

echo "Backup completed: polwel_backup_$DATE.sql"
```

```bash
chmod +x /var/www/polwel/scripts/backup-db.sh

# Add to crontab for daily backups
crontab -e
# Add: 0 2 * * * /var/www/polwel/scripts/backup-db.sh
```

## Troubleshooting

### Common Issues

1. **Backend not starting:**
   ```bash
   journalctl -u polwel-backend -f
   # Check logs for errors
   ```

2. **Database connection issues:**
   ```bash
   # Test database connection
   psql -U staging_user -h localhost -d polwel_staging_db
   ```

3. **Apache proxy issues:**
   ```bash
   # Check Apache error logs
   tail -f /var/log/apache2/polwel_error.log
   
   # Test backend directly
   curl http://localhost:3001/health
   ```

4. **Permission issues:**
   ```bash
   chown -R www-data:www-data /var/www/polwel
   chmod -R 755 /var/www/polwel
   ```

## Maintenance Commands

```bash
# Update application
systemctl stop polwel-backend
# Upload new files
systemctl start polwel-backend

# Database migrations
cd /var/www/polwel/backend
npx prisma migrate deploy

# View logs
journalctl -u polwel-backend -f
tail -f /var/log/apache2/polwel_access.log

# Restart services
systemctl restart polwel-backend
systemctl restart apache2
```

## Security Checklist

- [ ] Server is updated with latest security patches
- [ ] PostgreSQL has strong passwords
- [ ] JWT secrets are long and random
- [ ] SSL certificate is installed and working
- [ ] Firewall is configured properly
- [ ] File permissions are set correctly
- [ ] Database backups are working
- [ ] Log rotation is configured
- [ ] Non-root user is used for application
- [ ] Security headers are enabled in Apache

## URLs

- **Frontend:** https://polwel-pdms.customized3.corsivalab.xyz
- **API:** https://polwel-pdms.customized3.corsivalab.xyz/api
- **Health Check:** https://polwel-pdms.customized3.corsivalab.xyz/api/health

---

**Note:** Replace placeholder values (passwords, secrets, etc.) with actual secure values before deployment.
