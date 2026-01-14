# POLWEL TMS Environment Configuration Guide

## Overview
This project uses a single `.env` file approach for each environment (best practice).
Each environment has its own `.env` file with environment-specific configurations.

## File Structure

### Frontend (React + Vite)
```
.env                    ← Active environment file (local/staging/production)
.env.staging.example    ← Template for staging deployment
.env.production.example ← Template for production deployment
```

### Backend (Node.js + Express + Prisma)
```
.env                    ← Active environment file (local/staging/production)
.env.staging.example    ← Template for staging deployment
.env.production.example ← Template for production deployment
```

## Local Development Setup

### Prerequisites
- Laragon (or similar local server with MySQL)
- Node.js 18+
- npm

### Setup Steps
1. Ensure MySQL is running (via Laragon)
2. Database `polwel_training` should exist
3. Use existing `.env` files (already configured for local)

### Running Locally
```bash
# Backend
cd polwel-backend
npm install
npm run dev

# Frontend
cd polwel
npm install
npm run dev
```

## Staging Deployment

### 1. Backend Staging Setup
```bash
cd polwel-backend
cp .env.staging.example .env
```

### 2. Edit Backend .env for Staging
```bash
# Required changes for your staging server:
NODE_ENV=staging
DATABASE_URL="mysql://your_staging_db_user:password@localhost:3306/polwel_training"
CORS_ORIGINS=https://your-staging-domain.com
FRONTEND_URL=https://your-staging-domain.com
JWT_SECRET=your-unique-staging-jwt-secret
```

### 3. Frontend Staging Setup
```bash
cd polwel
cp .env.staging.example .env
```

### 4. Edit Frontend .env for Staging
```bash
# Required changes:
VITE_API_URL=https://your-staging-domain.com/api
```

### 5. Deploy Staging
```bash
# Backend
cd polwel-backend
npm install
npm run build
npm start

# Frontend
cd polwel
npm install
npm run build
# Copy dist/ contents to your web server
```

## Production Deployment

### 1. Backend Production Setup
```bash
cd polwel-backend
cp .env.production.example .env
```

### 2. Edit Backend .env for Production
```bash
# Required changes for production:
NODE_ENV=production
DATABASE_URL="mysql://your_prod_db_user:secure_password@localhost:3306/polwel_training"
CORS_ORIGINS=https://your-production-domain.com
FRONTEND_URL=https://your-production-domain.com
JWT_SECRET=your-super-secure-production-jwt-secret
MAIL_HOST=your-production-smtp-host
MAIL_USERNAME=your-production-email
MAIL_PASSWORD=your-production-email-password
MAIL_FROM_ADDRESS=noreply@your-domain.com
```

### 3. Frontend Production Setup
```bash
cd polwel
cp .env.production.example .env
```

### 4. Edit Frontend .env for Production
```bash
# Required changes:
VITE_API_URL=https://your-production-domain.com/api
```

### 5. Deploy Production
```bash
# Backend
cd polwel-backend
npm install
npm run build
npm start

# Frontend
cd polwel
npm install
npm run build
# Copy dist/ contents to your web server
```

## Database Migration

### For Staging/Production Deployment
```bash
cd polwel-backend

# First time setup
npx prisma migrate deploy

# For ongoing updates
npx prisma migrate deploy
npx prisma generate
```

## Important Security Notes

### For Production:
1. **Change JWT Secrets**: Use strong, unique secrets
2. **Use Environment-Specific Emails**: Don't use test emails
3. **Secure Database Credentials**: Use strong passwords
4. **Enable HTTPS**: Ensure all URLs use HTTPS
5. **Review CORS Settings**: Only allow your actual domains

### For Staging:
1. Use staging-specific credentials
2. Test all functionality before production
3. Use staging database (separate from production)

## Troubleshooting

### Common Issues:
1. **CORS Errors**: Check CORS_ORIGINS and FRONTEND_URL match exactly
2. **Database Connection**: Verify DATABASE_URL credentials and database exists
3. **API 404 Errors**: Ensure VITE_API_URL ends with `/api` (no trailing slash on domain)
4. **Email Issues**: Verify SMTP credentials for each environment

### Environment-Specific Checks:
```bash
# Check backend environment
cd polwel-backend
node -e "console.log(process.env.NODE_ENV, process.env.DATABASE_URL)"

# Check frontend environment during build
cd polwel
npm run build  # Check the build output for environment values
```

## File Permissions
Ensure `.env` files are:
- Not committed to version control
- Readable by the application
- Secure (600 permissions on Unix systems)

## Backup Strategy
- Keep secure backups of production `.env` files
- Document all custom configurations
- Test restore procedures
