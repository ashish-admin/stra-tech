#!/bin/bash

# LokDarpan Development Startup Script
# Ensures consistent port configuration and prevents port conflicts

set -e

BACKEND_PORT=5000
FRONTEND_PORT=5173

echo "🚀 Starting LokDarpan Development Environment..."

# Function to kill process on port
kill_port() {
    local port=$1
    echo "🔍 Checking port $port..."
    if lsof -ti:$port >/dev/null 2>&1; then
        echo "⚠️  Port $port is in use, terminating existing process..."
        lsof -ti:$port | xargs kill -9 2>/dev/null || true
        sleep 2
    fi
    echo "✅ Port $port is available"
}

# Clean up any existing processes
echo "🧹 Cleaning up existing processes..."
kill_port $BACKEND_PORT
kill_port $FRONTEND_PORT

# Verify backend environment
echo "🔧 Setting up backend environment..."
cd backend
if [ ! -f "venv/bin/activate" ]; then
    echo "❌ Virtual environment not found. Please run: python -m venv venv && source venv/bin/activate && pip install -r requirements.txt"
    exit 1
fi

source venv/bin/activate

# Set environment variables (sourced from backend/.env)
export FLASK_APP=app:create_app
export FLASK_ENV=development
export DATABASE_URL="postgresql://postgres:amuktha@localhost/lokdarpan_db"

# Source backend .env file for complete configuration
if [ -f ".env" ]; then
    echo "📋 Loading environment variables from .env..."
    export $(grep -v '^#' .env | xargs)
else
    echo "⚠️  .env file not found in backend directory"
fi

# Start backend
echo "🚀 Starting backend on port $BACKEND_PORT..."
flask run --port=$BACKEND_PORT &
BACKEND_PID=$!

# Wait for backend to be ready
echo "⏳ Waiting for backend to be ready..."
sleep 3
if ! curl -sf "http://localhost:$BACKEND_PORT/api/v1/status" >/dev/null; then
    echo "❌ Backend failed to start"
    kill $BACKEND_PID 2>/dev/null || true
    exit 1
fi
echo "✅ Backend is ready on port $BACKEND_PORT"

# Start frontend
echo "🚀 Starting frontend on port $FRONTEND_PORT..."
cd ../frontend

# Ensure environment is configured
echo "VITE_API_BASE_URL=http://localhost:$BACKEND_PORT" > .env.local

npm run dev &
FRONTEND_PID=$!

echo "✅ LokDarpan Development Environment Started Successfully!"
echo "📱 Frontend: http://localhost:$FRONTEND_PORT"
echo "🔌 Backend: http://localhost:$BACKEND_PORT"
echo ""
echo "Press Ctrl+C to stop all services"

# Handle cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Shutting down services..."
    kill $BACKEND_PID 2>/dev/null || true
    kill $FRONTEND_PID 2>/dev/null || true
    echo "✅ All services stopped"
}

trap cleanup EXIT INT TERM

# Wait for user to stop
wait