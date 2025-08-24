#!/bin/bash

# LokDarpan Development Startup Script
# Enhanced with process management issue detection and resolution
# Ensures consistent port configuration and prevents port conflicts

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

BACKEND_PORT=5000
FRONTEND_PORT=5173

# Error handling
error_exit() {
    echo -e "${RED}❌ Error: $1${NC}" >&2
    cleanup
    exit 1
}

# Enhanced logging
log_info() {
    echo -e "${BLUE}${1}${NC}"
}

log_success() {
    echo -e "${GREEN}${1}${NC}"
}

log_warning() {
    echo -e "${YELLOW}${1}${NC}"
}

log_info "🚀 Starting LokDarpan Development Environment..."

# Enhanced process management functions
detect_orphaned_processes() {
    log_info "🔍 Detecting orphaned processes..."
    
    local vite_count=$(ps aux | grep vite | grep -v grep | wc -l)
    local flask_count=$(ps aux | grep -E "(flask.*run|python.*app)" | grep -v grep | wc -l)
    
    if [ $vite_count -gt 1 ]; then
        log_warning "⚠️  Multiple Vite processes detected ($vite_count). This indicates orphaned processes."
        ps aux | grep vite | grep -v grep | awk '{print "  PID " $2 ": " $11 " " $12 " " $13}'
        return 1
    fi
    
    if [ $flask_count -gt 1 ]; then
        log_warning "⚠️  Multiple Flask processes detected ($flask_count)."
        ps aux | grep -E "(flask.*run|python.*app)" | grep -v grep | awk '{print "  PID " $2 ": " $11 " " $12 " " $13}'
        return 1
    fi
    
    return 0
}

# Function to kill process on port with better error handling
kill_port() {
    local port=$1
    local service_name=${2:-"Unknown"}
    
    log_info "🔍 Checking port $port for $service_name..."
    
    if lsof -ti:$port >/dev/null 2>&1; then
        local process_info=$(lsof -i :$port | grep LISTEN | awk '{print $1 " (PID " $2 ")"}' | head -1)
        log_warning "⚠️  Port $port is in use by $process_info"
        
        # Graceful shutdown first
        lsof -ti:$port | xargs kill -TERM 2>/dev/null || true
        sleep 3
        
        # Force kill if still running
        if lsof -ti:$port >/dev/null 2>&1; then
            log_warning "⚠️  Force killing process on port $port..."
            lsof -ti:$port | xargs kill -9 2>/dev/null || true
            sleep 1
        fi
        
        # Verify port is free
        if lsof -ti:$port >/dev/null 2>&1; then
            error_exit "Failed to free port $port"
        fi
    fi
    
    log_success "✅ Port $port is available"
}

# Enhanced process cleanup
log_info "🧹 Enhanced process cleanup and validation..."

# Detect orphaned processes first
if ! detect_orphaned_processes; then
    log_warning "Orphaned processes detected. Performing comprehensive cleanup..."
    pkill -f "vite" 2>/dev/null || true
    pkill -f "npm.*dev" 2>/dev/null || true
    pkill -f "flask.*run" 2>/dev/null || true
    sleep 3
fi

# Clean up ports with service names
kill_port $BACKEND_PORT "Backend (Flask)"
kill_port $FRONTEND_PORT "Frontend (Vite)"

# Additional port cleanup for common frontend alternatives
for alt_port in 5174 5175; do
    if lsof -ti:$alt_port >/dev/null 2>&1; then
        kill_port $alt_port "Frontend Alternative"
    fi
done

# Enhanced backend environment verification
log_info "🔧 Enhanced backend environment setup..."

cd backend || error_exit "Backend directory not found"

# Check virtual environment
if [ ! -f "venv/bin/activate" ]; then
    error_exit "Virtual environment not found. Please run: python -m venv venv && source venv/bin/activate && pip install -r requirements.txt"
fi

# Test virtual environment activation
if ! source venv/bin/activate; then
    error_exit "Failed to activate virtual environment"
fi

# Verify critical Python dependencies
log_info "🧪 Verifying Python dependencies..."
if ! python -c "import flask" 2>/dev/null; then
    error_exit "Flask not found in virtual environment. Run: pip install -r requirements.txt"
fi

if ! python -c "import sqlalchemy" 2>/dev/null; then
    error_exit "SQLAlchemy not found in virtual environment. Run: pip install -r requirements.txt"
fi

log_success "✅ Python dependencies verified"

# Enhanced environment variable setup
log_info "📋 Setting up environment variables..."

export FLASK_APP=app:create_app
export FLASK_ENV=development

# Enhanced .env file handling
if [ -f ".env" ]; then
    log_info "📄 Loading environment variables from .env..."
    
    # Validate .env file format
    if grep -qE '^[A-Z_]+=.*' .env; then
        # Export variables, filtering out comments and empty lines
        set -a  # Automatically export all variables
        source <(grep -E '^[A-Z_]+=.*' .env | grep -v '^#')
        set +a  # Stop auto-exporting
        log_success "✅ Environment variables loaded"
    else
        log_warning "⚠️  .env file format appears invalid"
    fi
    
    # Verify critical environment variables
    if [ -z "$DATABASE_URL" ]; then
        log_warning "⚠️  DATABASE_URL not set, using default"
        export DATABASE_URL="postgresql://postgres:amuktha@localhost/lokdarpan_db"
    fi
    
    if [ -z "$SECRET_KEY" ]; then
        log_warning "⚠️  SECRET_KEY not set in .env file"
    fi
else
    log_warning "⚠️  .env file not found in backend directory, using defaults"
    export DATABASE_URL="postgresql://postgres:amuktha@localhost/lokdarpan_db"
fi

# Test database connectivity
log_info "🗄️  Testing database connectivity..."
if ! psql "$DATABASE_URL" -c "SELECT 1;" >/dev/null 2>&1; then
    error_exit "Database connection failed. Please ensure PostgreSQL is running and database exists: createdb -h localhost -U postgres lokdarpan_db"
fi
log_success "✅ Database connection verified"

# Enhanced backend startup
log_info "🚀 Starting backend on port $BACKEND_PORT..."

flask run --port=$BACKEND_PORT &
BACKEND_PID=$!

# Enhanced backend readiness check
log_info "⏳ Waiting for backend to be ready..."

# Wait with timeout and progress indication
BACKEND_READY=false
for attempt in {1..30}; do
    if curl -sf "http://localhost:$BACKEND_PORT/api/v1/status" >/dev/null 2>&1; then
        BACKEND_READY=true
        break
    fi
    
    # Show progress every 5 attempts
    if [ $((attempt % 5)) -eq 0 ]; then
        log_info "⏳ Still waiting for backend... (attempt $attempt/30)"
    fi
    
    sleep 1
done

if [ "$BACKEND_READY" = false ]; then
    log_warning "❌ Backend failed to start within 30 seconds"
    
    # Try to get error information
    if ps -p $BACKEND_PID >/dev/null 2>&1; then
        log_info "Backend process is running but not responding. Checking logs..."
    else
        log_info "Backend process died. Possible issues:"
        log_info "  - Port already in use"
        log_info "  - Database connection failed"
        log_info "  - Missing dependencies"
    fi
    
    kill $BACKEND_PID 2>/dev/null || true
    error_exit "Backend startup failed"
fi

# Test API response validity
API_RESPONSE=$(curl -s "http://localhost:$BACKEND_PORT/api/v1/status" 2>/dev/null || echo "{}")
if echo "$API_RESPONSE" | grep -q '"ok":true'; then
    log_success "✅ Backend is ready and responding correctly on port $BACKEND_PORT"
else
    log_warning "⚠️  Backend is responding but API format may be incorrect"
fi

# Enhanced frontend setup
log_info "🚀 Setting up frontend environment..."

cd ../frontend || error_exit "Frontend directory not found"

# Verify Node.js dependencies
log_info "🧪 Verifying Node.js dependencies..."
if [ ! -d "node_modules" ]; then
    error_exit "Node modules not found. Please run: npm install"
fi

if [ ! -d "node_modules/vite" ]; then
    error_exit "Vite not found in node_modules. Please run: npm install"
fi

log_success "✅ Node.js dependencies verified"

# Enhanced environment configuration
log_info "📋 Configuring frontend environment..."

# Create authoritative .env.local file
cat > .env.local << EOF
# LokDarpan Development Environment - Auto-generated by dev-start.sh
# This file takes highest priority and overrides all other .env files

# API Configuration - Backend running on port $BACKEND_PORT
VITE_API_BASE_URL=http://localhost:$BACKEND_PORT

# Development flags
VITE_DEBUG=true
VITE_ENV=development

# Generated at: $(date)
EOF

log_success "✅ Frontend environment configured (.env.local created)"

# Start frontend with enhanced error handling
log_info "🚀 Starting frontend on port $FRONTEND_PORT..."

npm run dev &
FRONTEND_PID=$!

# Wait a moment for frontend to start
sleep 3

# Check if frontend process is still running
if ! ps -p $FRONTEND_PID >/dev/null 2>&1; then
    error_exit "Frontend process died immediately after starting. Check npm dependencies."
fi

# Final validation
log_info "🔍 Performing final system validation..."

# Test frontend accessibility (with retry)
FRONTEND_ACCESSIBLE=false
for attempt in {1..10}; do
    if curl -sf "http://localhost:$FRONTEND_PORT/" >/dev/null 2>&1; then
        FRONTEND_ACCESSIBLE=true
        break
    fi
    sleep 1
done

# Test frontend proxy to backend
PROXY_WORKING=false
if [ "$FRONTEND_ACCESSIBLE" = true ]; then
    if curl -sf "http://localhost:$FRONTEND_PORT/api/v1/status" >/dev/null 2>&1; then
        PROXY_WORKING=true
    fi
fi

echo
log_success "🎉 LokDarpan Development Environment Started Successfully!"
echo "=============================================="
log_info "📱 Frontend: http://localhost:$FRONTEND_PORT $([ "$FRONTEND_ACCESSIBLE" = true ] && echo "✅" || echo "❌")"
log_info "🔌 Backend: http://localhost:$BACKEND_PORT ✅"
log_info "🔗 Proxy: Frontend → Backend $([ "$PROXY_WORKING" = true ] && echo "✅" || echo "❌")"
echo
log_info "🏥 Health Status:"
log_info "  - Backend Process: $(ps -p $BACKEND_PID >/dev/null && echo "Running ✅" || echo "Stopped ❌")"
log_info "  - Frontend Process: $(ps -p $FRONTEND_PID >/dev/null && echo "Running ✅" || echo "Stopped ❌")"
log_info "  - API Connectivity: ✅"
log_info "  - Database Connection: ✅"

if [ "$FRONTEND_ACCESSIBLE" = false ]; then
    log_warning "⚠️  Frontend not accessible yet - may still be starting up"
fi

if [ "$PROXY_WORKING" = false ]; then
    log_warning "⚠️  Frontend-to-backend proxy not working - check Vite configuration"
fi

echo
log_info "💡 Quick Actions:"
log_info "  - Health Check: ./scripts/health-check-dev.sh"
log_info "  - Stop Services: ./scripts/dev-stop.sh"
log_info "  - View Logs: curl -s http://localhost:$BACKEND_PORT/api/v1/status | jq"
echo
log_info "Press Ctrl+C to stop all services"

# Enhanced cleanup function
cleanup() {
    echo
    log_info "🛑 Gracefully shutting down services..."
    
    # Graceful shutdown
    if ps -p $FRONTEND_PID >/dev/null 2>&1; then
        log_info "Stopping frontend process..."
        kill -TERM $FRONTEND_PID 2>/dev/null || true
    fi
    
    if ps -p $BACKEND_PID >/dev/null 2>&1; then
        log_info "Stopping backend process..."
        kill -TERM $BACKEND_PID 2>/dev/null || true
    fi
    
    # Wait for graceful shutdown
    sleep 3
    
    # Force kill if needed
    kill -9 $BACKEND_PID $FRONTEND_PID 2>/dev/null || true
    
    # Final cleanup
    rm -f frontend/.env.local 2>/dev/null || true
    
    log_success "✅ All services stopped cleanly"
    exit 0
}

trap cleanup EXIT INT TERM

# Keep script running
wait