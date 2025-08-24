#!/bin/bash

# LokDarpan Quick Recovery Script
# Fixes common process management issues without full system reset

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${BLUE}${1}${NC}"
}

log_success() {
    echo -e "${GREEN}${1}${NC}"
}

log_warning() {
    echo -e "${YELLOW}${1}${NC}"
}

log_error() {
    echo -e "${RED}${1}${NC}"
}

echo -e "${BLUE}⚡ LokDarpan Quick Recovery${NC}"
echo -e "${BLUE}=========================${NC}"

# Quick diagnosis
log_info "🔍 Quick system diagnosis..."

BACKEND_RUNNING=$(curl -sf http://localhost:5000/api/v1/status >/dev/null 2>&1 && echo "true" || echo "false")
FRONTEND_ACCESSIBLE=$(curl -sf http://localhost:5173/ >/dev/null 2>&1 && echo "true" || echo "false")
VITE_PROCESS_COUNT=$(ps aux | grep vite | grep -v grep | wc -l)
FLASK_PROCESS_COUNT=$(ps aux | grep -E "(flask.*run|python.*app)" | grep -v grep | wc -l)

echo "Current Status:"
echo "  Backend (5000): $([ "$BACKEND_RUNNING" = "true" ] && echo "✅ OK" || echo "❌ DOWN")"
echo "  Frontend (5173): $([ "$FRONTEND_ACCESSIBLE" = "true" ] && echo "✅ OK" || echo "❌ DOWN")"
echo "  Vite Processes: $VITE_PROCESS_COUNT"
echo "  Flask Processes: $FLASK_PROCESS_COUNT"

# Determine recovery strategy
NEEDS_FULL_RESTART="false"
NEEDS_FRONTEND_ONLY="false"
NEEDS_PROCESS_CLEANUP="false"

if [ "$VITE_PROCESS_COUNT" -gt 1 ]; then
    log_warning "⚠️  Multiple Vite processes detected - orphaned processes present"
    NEEDS_PROCESS_CLEANUP="true"
fi

if [ "$FLASK_PROCESS_COUNT" -gt 1 ]; then
    log_warning "⚠️  Multiple Flask processes detected"
    NEEDS_PROCESS_CLEANUP="true"
fi

if [ "$BACKEND_RUNNING" = "false" ]; then
    log_warning "⚠️  Backend not responding - full restart needed"
    NEEDS_FULL_RESTART="true"
elif [ "$FRONTEND_ACCESSIBLE" = "false" ] && [ "$VITE_PROCESS_COUNT" -eq 0 ]; then
    log_warning "⚠️  Frontend not running but backend OK - frontend restart needed"
    NEEDS_FRONTEND_ONLY="true"
fi

# Execute recovery strategy
if [ "$NEEDS_FULL_RESTART" = "true" ]; then
    log_info "🔄 Performing full system restart..."
    
    # Stop everything
    pkill -f "flask|vite|npm.*dev" 2>/dev/null || true
    sleep 3
    
    # Start fresh
    ./scripts/dev-start.sh
    exit $?
    
elif [ "$NEEDS_PROCESS_CLEANUP" = "true" ]; then
    log_info "🧹 Cleaning up orphaned processes..."
    
    # Kill orphaned processes
    pkill -f "vite" 2>/dev/null || true
    pkill -f "npm.*dev" 2>/dev/null || true
    pkill -f "flask.*run" 2>/dev/null || true
    sleep 3
    
    # Restart services
    log_info "🚀 Restarting services..."
    ./scripts/dev-start.sh
    exit $?
    
elif [ "$NEEDS_FRONTEND_ONLY" = "true" ]; then
    log_info "🚀 Restarting frontend only..."
    
    cd frontend || { log_error "❌ Frontend directory not found"; exit 1; }
    
    # Ensure environment is set
    echo "VITE_API_BASE_URL=http://localhost:5000" > .env.local
    
    # Start frontend
    npm run dev &
    FRONTEND_PID=$!
    
    # Wait for frontend
    log_info "⏳ Waiting for frontend to start..."
    sleep 5
    
    if curl -sf http://localhost:5173/ >/dev/null 2>&1; then
        log_success "✅ Frontend restarted successfully"
        echo "📱 Frontend: http://localhost:5173"
        echo "🔌 Backend: http://localhost:5000"
        echo "Press Ctrl+C to stop"
        
        trap "kill $FRONTEND_PID 2>/dev/null || true" EXIT INT TERM
        wait
    else
        log_error "❌ Frontend restart failed"
        kill $FRONTEND_PID 2>/dev/null || true
        exit 1
    fi
    
else
    log_success "🎉 System appears healthy!"
    echo
    echo "Current Status:"
    echo "  📱 Frontend: http://localhost:5173 ✅"
    echo "  🔌 Backend: http://localhost:5000 ✅"
    
    # Test proxy connection
    if curl -sf http://localhost:5173/api/v1/status >/dev/null 2>&1; then
        echo "  🔗 Proxy: Frontend → Backend ✅"
    else
        log_warning "  🔗 Proxy: Frontend → Backend ❌"
        echo
        log_info "💡 Proxy issue detected. Trying to fix..."
        
        cd frontend
        # Recreate environment file
        cat > .env.local << EOF
VITE_API_BASE_URL=http://localhost:5000
VITE_DEBUG=true
EOF
        
        # Find frontend process and restart it
        VITE_PID=$(ps aux | grep vite | grep -v grep | awk '{print $2}' | head -1)
        if [ -n "$VITE_PID" ]; then
            log_info "Restarting frontend to fix proxy..."
            kill $VITE_PID
            sleep 3
            npm run dev &
            log_success "✅ Frontend restarted - proxy should be fixed"
        fi
    fi
    
    echo
    log_info "💡 Available Actions:"
    echo "  • Health Check: ./scripts/health-check-dev.sh"
    echo "  • Full Restart: ./scripts/dev-stop.sh && ./scripts/dev-start.sh"
    echo "  • View API Status: curl -s http://localhost:5000/api/v1/status | jq"
fi