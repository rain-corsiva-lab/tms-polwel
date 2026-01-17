@echo off
setlocal enabledelayedexpansion

REM Quick Deploy Script for POLWEL (Windows)
REM Usage: quick-deploy.bat [local|staging|production]

set ENVIRONMENT=%1
if "%ENVIRONMENT%"=="" set ENVIRONMENT=local

echo 🚀 Quick Deploy for POLWEL - Environment: %ENVIRONMENT%

REM Validate environment
if not "%ENVIRONMENT%"=="local" if not "%ENVIRONMENT%"=="staging" if not "%ENVIRONMENT%"=="production" (
    echo [ERROR] Invalid environment. Use: local, staging, or production
    exit /b 1
)

REM Check if environment files exist
if not exist "polwel-backend\.env.%ENVIRONMENT%" (
    echo [ERROR] Environment file polwel-backend\.env.%ENVIRONMENT% not found!
    exit /b 1
)

if not exist ".env.%ENVIRONMENT%" (
    echo [ERROR] Frontend environment file .env.%ENVIRONMENT% not found!
    exit /b 1
)

echo [INFO] Building backend...
cd polwel-backend
call npm install
call npm run build

if %errorlevel% neq 0 (
    echo [ERROR] Backend build failed!
    exit /b 1
)

echo [INFO] Building frontend for %ENVIRONMENT%...
cd ..
call npm install
call npm run build:%ENVIRONMENT%

if %errorlevel% neq 0 (
    echo [ERROR] Frontend build failed!
    exit /b 1
)

echo [INFO] ✅ Build completed successfully!

if "%ENVIRONMENT%"=="local" (
    echo [INFO] Starting local development...
    echo.
    echo To start the application locally:
    echo 1. Backend: cd polwel-backend ^&^& npm run start:local
    echo 2. Frontend: npm run preview
    echo.
    echo Or use PM2:
    echo pm2 start polwel-backend/ecosystem.config.js --only polwel-backend-local
) else (
    echo [WARNING] For %ENVIRONMENT% deployment:
    echo.
    echo 1. Upload built files to your server
    echo 2. Copy environment file: polwel-backend\.env.%ENVIRONMENT% to server
    echo 3. Install dependencies: npm install --production
    echo 4. Run migrations: npx prisma migrate deploy
    echo 5. Start service: systemctl start polwel-backend
    echo.
    echo Files to upload:
    echo 📁 Backend: polwel-backend\dist\* → /var/www/polwel/backend/
    echo 📁 Frontend: dist\* → /var/www/polwel/frontend/
    echo 📄 Config: polwel-backend\.env.%ENVIRONMENT% → /var/www/polwel/backend/.env
)

echo [INFO] 🎉 Deployment preparation completed!
pause
