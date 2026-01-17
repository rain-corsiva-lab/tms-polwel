@echo off
echo 🚀 POLWEL Staging Deployment for aaPanel

echo.
echo [INFO] Building project with staging environment...

REM Check if staging env file exists
if not exist ".env.staging" (
    echo [ERROR] .env.staging file not found!
    echo Please make sure you have created .env.staging with correct API URL
    pause
    exit /b 1
)

if not exist "polwel-backend\.env.staging" (
    echo [ERROR] polwel-backend\.env.staging file not found!
    echo Please make sure you have created polwel-backend\.env.staging with correct database URL
    pause
    exit /b 1
)

echo.
echo [INFO] Building frontend for staging...
call npm run build:staging

if %errorlevel% neq 0 (
    echo [ERROR] Frontend build failed!
    pause
    exit /b 1
)

echo.
echo [INFO] Building backend...
cd polwel-backend
call npm run build

if %errorlevel% neq 0 (
    echo [ERROR] Backend build failed!
    pause
    exit /b 1
)

cd ..

echo.
echo [INFO] Creating deployment package...
if exist deployment-package rmdir /s /q deployment-package
mkdir deployment-package
mkdir deployment-package\frontend
mkdir deployment-package\backend
mkdir deployment-package\config

REM Copy frontend files
xcopy /e /i dist\* deployment-package\frontend\

REM Copy backend files
xcopy /e /i polwel-backend\dist\* deployment-package\backend\
copy polwel-backend\package.json deployment-package\backend\
copy polwel-backend\package-lock.json deployment-package\backend\
xcopy /e /i polwel-backend\prisma deployment-package\backend\prisma\
copy polwel-backend\.env.staging deployment-package\backend\.env

REM Copy configuration files
copy ecosystem.config.js deployment-package\config\
copy aapanel-setup.sh deployment-package\config\

echo.
echo ✅ Deployment package created successfully!
echo.
echo 📁 Files ready for upload:
echo    - deployment-package\frontend\* → Upload to your domain folder in aaPanel
echo    - deployment-package\backend\* → Upload to a backend folder
echo    - deployment-package\config\* → Configuration files
echo.
echo 🔧 Next steps:
echo 1. Upload deployment-package\frontend\* to /www/wwwroot/polwel-pdms.customized3.corsivalab.xyz/
echo 2. Upload deployment-package\backend\* to /www/wwwroot/polwel-backend/
echo 3. SSH to your server and run:
echo    cd /www/wwwroot/polwel-backend
echo    npm install --production
echo    npx prisma generate
echo    npx prisma migrate deploy
echo    pm2 start ecosystem.config.js --name polwel-backend
echo.
echo 4. In aaPanel, set up reverse proxy:
echo    - Proxy Name: API
echo    - Target URL: http://127.0.0.1:3001
echo    - Proxy Directory: /api
echo.
echo 🌐 Test URLs after deployment:
echo    - Frontend: https://polwel-pdms.customized3.corsivalab.xyz
echo    - API Health: https://polwel-pdms.customized3.corsivalab.xyz/api/health
echo    - Env Check: https://polwel-pdms.customized3.corsivalab.xyz/env-check.html
echo.

pause
