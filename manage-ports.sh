#!/bin/bash

# Script to safely cleanup ports and prevent conflicts

echo "🔧 Port Management Tool for Polwel Project"
echo "========================================="
echo ""

# Function to kill process on specific port
kill_port() {
    local port=$1
    echo "Checking port $port..."
    
    if lsof -i :$port > /dev/null 2>&1; then
        echo "⚠️  Port $port is in use. Killing process..."
        lsof -i :$port | grep -v COMMAND | awk '{print $2}' | xargs kill -9 2>/dev/null
        sleep 1
        echo "✅ Port $port freed"
    else
        echo "✅ Port $port is free"
    fi
}

# Function to show current port usage
show_ports() {
    echo ""
    echo "📊 Current Port Usage:"
    echo "Port 3001 (Backend API):"
    lsof -i :3001 2>/dev/null | tail -1 || echo "  Free"
    echo ""
    echo "Port 8080-8090 (Frontend Dev):"
    lsof -i :8080-8090 2>/dev/null | tail -5 || echo "  Free"
}

# Main menu
case "${1:-menu}" in
    kill-frontend)
        kill_port 8080
        ;;
    kill-backend)
        kill_port 3001
        ;;
    kill-all)
        kill_port 3001
        kill_port 8080
        ;;
    status)
        show_ports
        ;;
    *)
        echo "Usage: $0 {kill-frontend|kill-backend|kill-all|status}"
        echo ""
        echo "Examples:"
        echo "  $0 kill-frontend  - Free up frontend dev port"
        echo "  $0 kill-backend    - Free up backend API port"
        echo "  $0 kill-all        - Free up both ports"
        echo "  $0 status          - Show current port usage"
        echo ""
        show_ports
        ;;
esac
