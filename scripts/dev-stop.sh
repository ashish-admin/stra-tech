#!/bin/bash

# LokDarpan Development Stop Script
# Gracefully stops all development services

echo "🛑 Stopping LokDarpan Development Environment..."

# Function to kill processes on a specific port
kill_port() {
    local port=$1
    local service_name=$2
    
    local processes=$(lsof -ti:$port 2>/dev/null || echo "")
    if [ ! -z "$processes" ]; then
        echo "🔄 Stopping $service_name on port $port..."
        echo "$processes" | xargs kill -TERM 2>/dev/null || true
        
        # Wait for graceful shutdown
        sleep 3
        
        # Force kill if still running
        local remaining=$(lsof -ti:$port 2>/dev/null || echo "")
        if [ ! -z "$remaining" ]; then
            echo "⚠️  Force stopping $service_name..."
            echo "$remaining" | xargs kill -9 2>/dev/null || true
        fi
        
        echo "✅ $service_name stopped"
    else
        echo "ℹ️  No $service_name process found on port $port"
    fi
}

# Stop backend (Flask)
kill_port 5000 "Backend (Flask)"

# Stop frontend (Vite)  
kill_port 5173 "Frontend (Vite)"
kill_port 5174 "Frontend (Vite alternative)"

# Clean up any other Node/Python processes
echo "🧹 Cleaning up development processes..."

# Kill any remaining flask/npm processes
pkill -f "flask.*run" 2>/dev/null || true
pkill -f "npm.*dev" 2>/dev/null || true
pkill -f "vite" 2>/dev/null || true

# Clean up log files if they exist
if [ -d "logs" ]; then
    echo "🗑️  Cleaning up log files..."
    rm -f logs/backend.pid logs/frontend.pid
fi

echo "✅ All LokDarpan development services stopped"
echo "💡 To restart, run: ./scripts/dev-start.sh"