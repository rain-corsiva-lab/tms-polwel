# Backend TypeScript Compilation Fixes

## Issues Identified:

1. **Missing TypeScript type definitions** for Express, CORS, Morgan, JSONWebToken
2. **AuthenticatedRequest interface** missing query, params, body properties
3. **Duplicate AuthenticatedRequest** definitions in some files
4. **Missing @types packages** on the server

## Fixes to Apply:

### 1. Install Missing Type Definitions
Run this on your server:
```bash
cd /www/wwwroot/polwelpdms/polwel-backend
npm install --save-dev @types/express @types/cors @types/morgan @types/jsonwebtoken @types/node
```

### 2. Fix AuthenticatedRequest Interface
The AuthenticatedRequest interface needs to properly extend Express.Request with all its properties.

### 3. Remove Duplicate Interfaces
Some controllers redefine AuthenticatedRequest instead of importing from middleware.

### 4. Fix TypeScript Configuration
Ensure tsconfig.json has proper type definitions.

## Commands to Run on Server:

```bash
# 1. Navigate to backend directory
cd /www/wwwroot/polwelpdms/polwel-backend

# 2. Install missing type definitions
npm install --save-dev @types/express @types/cors @types/morgan @types/jsonwebtoken @types/node @types/bcrypt

# 3. Clean and rebuild
rm -rf dist
npm run build

# 4. If successful, restart PM2
pm2 restart polwel-backend
```

## Local Fixes to Upload:

The main fix is updating the AuthenticatedRequest interface to properly extend Request with all its properties.
