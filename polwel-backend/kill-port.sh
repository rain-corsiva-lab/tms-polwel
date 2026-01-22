#!/bin/bash
# Script to kill process using a specific port
# Usage: ./kill-port.sh [port_number]

PORT=${1:-3001}

echo "🔍 Checking port $PORT..."

# Find process using the port
PID=$(lsof -ti :$PORT 2>/dev/null)

if [ -z "$PID" ]; then
    echo "✅ Port $PORT is free"
    exit 0
fi

echo "⚠️  Found process $PID using port $PORT"
echo "📝 Process details:"
ps -p $PID -o pid,ppid,cmd

echo ""
read -p "❓ Kill this process? (y/N): " -n 1 -r
echo

if [[ $REPLY =~ ^[Yy]$ ]]; then
    kill -9 $PID
    sleep 1
    
    # Verify it's killed
    if lsof -ti :$PORT > /dev/null 2>&1; then
        echo "❌ Failed to kill process"
        exit 1
    else
        echo "✅ Successfully killed process on port $PORT"
        exit 0
    fi
else
    echo "❌ Cancelled"
    exit 1
fi
