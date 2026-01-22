#!/bin/bash
# Safe backend startup script - kills existing process if needed

PORT=3001

echo "🚀 Starting POLWEL Backend..."

# Check if port is already in use
if lsof -ti :$PORT > /dev/null 2>&1; then
    echo "⚠️  Port $PORT is already in use"
    PID=$(lsof -ti :$PORT)
    echo "📝 Process $PID is using port $PORT"
    
    # Check if it's our backend
    if ps -p $PID -o cmd= | grep -q "polwel-backend"; then
        echo "🔄 Found existing backend process, killing it..."
        kill -9 $PID
        sleep 2
        echo "✅ Killed old backend process"
    else
        echo "❌ Port $PORT is being used by another application:"
        ps -p $PID -o pid,cmd
        echo ""
        echo "Please stop that application or change the backend port"
        exit 1
    fi
fi

echo "✅ Port $PORT is free"
echo "🔧 Starting backend in development mode..."
echo ""

# Start the backend
npm run dev
