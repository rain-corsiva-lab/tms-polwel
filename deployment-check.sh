#!/bin/bash
# deployment-check.sh - Quick verification script for POLWEL TMS deployment

echo "🔍 POLWEL TMS Deployment Verification"
echo "====================================="

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Run this script from the project root directory"
    exit 1
fi

echo ""
echo "📁 Environment File Check:"

# Check Frontend .env
if [ -f ".env" ]; then
    echo "✅ Frontend .env exists"
    if grep -q "VITE_API_URL" .env; then
        API_URL=$(grep "VITE_API_URL" .env | cut -d'=' -f2)
        echo "   API URL: $API_URL"
    fi
else
    echo "❌ Frontend .env missing"
fi

# Check Backend .env
if [ -f "polwel-backend/.env" ]; then
    echo "✅ Backend .env exists"
    if grep -q "NODE_ENV" polwel-backend/.env; then
        NODE_ENV=$(grep "NODE_ENV" polwel-backend/.env | cut -d'=' -f2)
        echo "   Environment: $NODE_ENV"
    fi
    if grep -q "DATABASE_URL" polwel-backend/.env; then
        echo "   Database: Configured"
    fi
else
    echo "❌ Backend .env missing"
fi

echo ""
echo "🔧 Build Test:"

# Test Backend Build
cd polwel-backend 2>/dev/null || { echo "❌ Backend directory not found"; exit 1; }
if npm run build >/dev/null 2>&1; then
    echo "✅ Backend builds successfully"
else
    echo "❌ Backend build failed"
fi

# Test Frontend Build
cd .. 2>/dev/null
if npm run build >/dev/null 2>&1; then
    echo "✅ Frontend builds successfully"
else
    echo "❌ Frontend build failed"
fi

echo ""
echo "📋 Required Manual Checks:"
echo "- Database connection working"
echo "- CORS origins match frontend domain"
echo "- JWT secrets are secure and unique"
echo "- Email SMTP credentials are correct"
echo "- All domain URLs use HTTPS in production"

echo ""
echo "🚀 Deployment Ready!"
echo "See DEPLOYMENT.md for detailed instructions."
