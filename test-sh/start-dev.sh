#!/bin/bash

# POLWEL Local Development Setup & Start Script
# ============================================

set -e

PROJECT_ROOT="/media/kukuh/7aa48e4a-0345-4928-bb19-a622aa156169/webprojects/polwel"
BACKEND_DIR="$PROJECT_ROOT/polwel-backend"

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║          🚀 POLWEL Local Development Startup                 ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# Check if database exists
echo "📦 Checking database..."
DB_CHECK=$(docker exec laradock-mysql-1 mysql -uroot -proot -e "SHOW DATABASES LIKE 'polwel_local';" 2>/dev/null | grep -c polwel_local || true)

if [ "$DB_CHECK" -eq "0" ]; then
    echo "⚠️  Database polwel_local not found. Creating..."
    docker exec laradock-mysql-1 mysql -uroot -proot -e "CREATE DATABASE polwel_local CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;" 2>/dev/null
    echo "✅ Database created"
    
    echo "🔄 Running Prisma migrations..."
    cd "$BACKEND_DIR"
    NODE_ENV=local npx prisma migrate deploy
    echo "✅ Migrations completed"
else
    echo "✅ Database exists"
fi

# Check if Prisma client is generated
if [ ! -d "$BACKEND_DIR/node_modules/@prisma/client" ]; then
    echo "⚠️  Prisma client not found. Generating..."
    cd "$BACKEND_DIR"
    npx prisma generate
    echo "✅ Prisma client generated"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎯 Starting POLWEL Development Servers"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📡 Backend (Express + Prisma): http://localhost:3001"
echo "🌐 Frontend (React + Vite):    http://localhost:8080"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Kill any existing processes on ports
echo "🧹 Cleaning up ports..."
lsof -ti:3001 | xargs kill -9 2>/dev/null || true
lsof -ti:8080 | xargs kill -9 2>/dev/null || true
sleep 1

# Start backend in background
echo "🚀 Starting backend server..."
cd "$BACKEND_DIR"
NODE_ENV=local npm run dev:local > /tmp/polwel-backend.log 2>&1 &
BACKEND_PID=$!
echo "   PID: $BACKEND_PID"
sleep 3

# Check if backend started successfully
if ! kill -0 $BACKEND_PID 2>/dev/null; then
    echo "❌ Backend failed to start. Check /tmp/polwel-backend.log"
    exit 1
fi

# Start frontend
echo "🚀 Starting frontend server..."
cd "$PROJECT_ROOT"
npm run dev

# Cleanup on exit
trap "echo ''; echo '🛑 Shutting down servers...'; kill $BACKEND_PID 2>/dev/null; echo '✅ Servers stopped';" EXIT
