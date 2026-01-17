@echo off
echo 🔍 Verifying Environment Configuration

echo.
echo [INFO] Checking if API URL is correctly set in built files...

REM Check if dist folder exists
if not exist "dist" (
    echo [ERROR] dist folder not found. Please run 'npm run build:staging' first.
    pause
    exit /b 1
)

REM Search for localhost references in built files
echo [INFO] Searching for localhost references in built frontend...
findstr /i "localhost" dist\assets\*.js > nul
if %errorlevel% equ 0 (
    echo [WARNING] Found localhost references in built files!
    echo [WARNING] This means the environment variables might not be loaded correctly.
    echo.
    echo Searching for localhost in built files:
    findstr /i /n "localhost" dist\assets\*.js
    echo.
    echo [INFO] Expected to find: polwel-pdms.customized3.corsivalab.xyz
) else (
    echo [SUCCESS] ✅ No localhost references found in built files!
)

echo.
echo [INFO] Checking environment files...

if exist ".env.staging" (
    echo [SUCCESS] ✅ .env.staging exists
    echo [INFO] Contents:
    type .env.staging
) else (
    echo [ERROR] ❌ .env.staging not found!
)

echo.

if exist "polwel-backend\.env.staging" (
    echo [SUCCESS] ✅ polwel-backend\.env.staging exists
    echo [INFO] Contents:
    type polwel-backend\.env.staging
) else (
    echo [ERROR] ❌ polwel-backend\.env.staging not found!
)

echo.
echo [INFO] Verification completed!
echo.
echo If you found localhost references above, the frontend is still using local API.
echo Make sure to build with: npm run build:staging
echo.

pause
