@echo off
REM POLWEL Deployment Script for Windows

echo 🚀 Starting POLWEL Staging Deployment...

REM Configuration
set SERVER_USER=root
set SERVER_HOST=polwel-pdms.customized3.corsivalab.xyz
set DOMAIN=polwel-pdms.customized3.corsivalab.xyz

echo [INFO] Building project locally...

REM Build backend
echo [INFO] Building backend...
cd polwel-backend
call npm install
call npm run build

REM Build frontend with staging environment
echo [INFO] Building frontend for staging...
cd ..
set VITE_API_URL=https://%DOMAIN%/api
call npm run build

echo [INFO] Project built successfully!
echo [INFO] Please manually upload the files to your staging server:
echo.
echo Backend files to upload:
echo - polwel-backend/dist/* → /var/www/polwel/backend/
echo - polwel-backend/package.json → /var/www/polwel/backend/
echo - polwel-backend/prisma/* → /var/www/polwel/backend/prisma/
echo - polwel-backend/.env.staging → /var/www/polwel/backend/.env
echo.
echo Frontend files to upload:
echo - dist/* → /var/www/polwel/frontend/
echo.
echo Next steps:
echo 1. Upload files to server
echo 2. Run: npm install --production
echo 3. Run: npm run db:generate && npm run db:deploy
echo 4. Configure Apache virtual host
echo 5. Restart services

pause
