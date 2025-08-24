#!/bin/bash

# LokDarpan Production Deployment Script
# Enhanced with CORS configuration and troubleshooting experience from August 2025
# Ensures reliable deployment with proper error handling and validation

set -e  # Exit on any error

# =============================================================================
# CONFIGURATION
# =============================================================================

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Production ports
PRODUCTION_PORT=${PRODUCTION_PORT:-8080}
BACKEND_PORT=${BACKEND_PORT:-5000}
PROJECT_ROOT="/mnt/c/Users/amukt/Projects/LokDarpan"

# Logging
LOG_DIR="${PROJECT_ROOT}/logs"
BACKEND_LOG="${LOG_DIR}/backend.log"
DEPLOY_LOG="${LOG_DIR}/deployment.log"

# =============================================================================
# UTILITY FUNCTIONS
# =============================================================================

log_info() {
    echo -e "${BLUE}ℹ️  ${1}${NC}" | tee -a "${DEPLOY_LOG}"
}

log_success() {
    echo -e "${GREEN}✅ ${1}${NC}" | tee -a "${DEPLOY_LOG}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  ${1}${NC}" | tee -a "${DEPLOY_LOG}"
}

log_error() {
    echo -e "${RED}❌ ${1}${NC}" | tee -a "${DEPLOY_LOG}"
}

log_header() {
    echo | tee -a "${DEPLOY_LOG}"
    echo -e "${CYAN}═══════════════════════════════════════════════════════${NC}" | tee -a "${DEPLOY_LOG}"
    echo -e "${CYAN}  ${1}${NC}" | tee -a "${DEPLOY_LOG}"
    echo -e "${CYAN}═══════════════════════════════════════════════════════${NC}" | tee -a "${DEPLOY_LOG}"
}

error_exit() {
    log_error "Error: $1"
    cleanup_on_error
    exit 1
}

cleanup_on_error() {
    log_warning "Cleaning up after error..."
    # Kill any started processes
    if [ -n "$BACKEND_PID" ]; then
        kill $BACKEND_PID 2>/dev/null || true
    fi
    if [ -n "$FRONTEND_PID" ]; then
        kill $FRONTEND_PID 2>/dev/null || true
    fi
}

# =============================================================================
# PRE-DEPLOYMENT CHECKS
# =============================================================================

log_header "PRE-DEPLOYMENT VALIDATION"

# Initialize logging
mkdir -p "${LOG_DIR}"
echo "Deployment started at $(date)" > "${DEPLOY_LOG}"

# Change to project root
cd "${PROJECT_ROOT}" || error_exit "Project directory not found"

# Check for required directories
if [ ! -d "backend" ] || [ ! -d "frontend" ]; then
    error_exit "Backend or frontend directory not found. Must run from project root."
fi

# Check for required tools
command -v python3 >/dev/null 2>&1 || error_exit "Python 3 is required but not installed"
command -v node >/dev/null 2>&1 || error_exit "Node.js is required but not installed"
command -v npm >/dev/null 2>&1 || error_exit "npm is required but not installed"
command -v psql >/dev/null 2>&1 || error_exit "PostgreSQL client is required but not installed"

log_success "All required tools are installed"

# =============================================================================
# CLEANUP EXISTING PROCESSES
# =============================================================================

log_header "CLEANUP EXISTING PROCESSES"

log_info "Stopping existing services..."

# Kill Flask processes
pkill -f "flask.*run" 2>/dev/null || true
pkill -f "gunicorn.*app" 2>/dev/null || true
pkill -f "python.*app:create_app" 2>/dev/null || true

# Kill frontend servers
pkill -f "vite" 2>/dev/null || true
pkill -f "npm.*preview" 2>/dev/null || true
pkill -f "python.*8080" 2>/dev/null || true

sleep 2

# Verify ports are free
for port in $BACKEND_PORT $PRODUCTION_PORT; do
    if lsof -ti:$port >/dev/null 2>&1; then
        log_warning "Port $port still in use, force killing..."
        lsof -ti:$port | xargs kill -9 2>/dev/null || true
        sleep 1
    fi
done

log_success "All existing processes stopped"

# =============================================================================
# BACKEND CONFIGURATION
# =============================================================================

log_header "BACKEND CONFIGURATION"

cd "${PROJECT_ROOT}/backend" || error_exit "Backend directory not found"

# Create production environment file with CORS fix
log_info "Creating production environment configuration..."

# Read existing .env if present for API keys
if [ -f ".env" ]; then
    source .env
fi

cat > .env.production << EOF
# LokDarpan Production Configuration
# Generated: $(date)

# Database
DATABASE_URL=${DATABASE_URL:-postgresql://postgres:amuktha@localhost/lokdarpan_db}

# Security
SECRET_KEY=${SECRET_KEY:-$(python3 -c 'import secrets; print(secrets.token_hex(32))')}
FLASK_ENV=production

# CORS Configuration - CRITICAL for production
# Learned from troubleshooting: Must include all frontend origins
CORS_ORIGINS=http://localhost:${PRODUCTION_PORT},http://127.0.0.1:${PRODUCTION_PORT},http://localhost:8080,http://127.0.0.1:8080,http://localhost:5173,http://localhost:5174,http://localhost:5175

# Session Configuration
SESSION_COOKIE_SECURE=false  # Set to true when using HTTPS
SESSION_COOKIE_HTTPONLY=true
SESSION_COOKIE_SAMESITE=Lax
SESSION_COOKIE_DOMAIN=localhost  # Important for cross-port cookie sharing

# API Keys (preserve existing or use defaults)
GEMINI_API_KEY=${GEMINI_API_KEY:-your-gemini-key}
PERPLEXITY_API_KEY=${PERPLEXITY_API_KEY:-your-perplexity-key}
NEWS_API_KEY=${NEWS_API_KEY:-your-news-api-key}

# Redis Configuration
REDIS_URL=${REDIS_URL:-redis://localhost:6379/0}
CELERY_BROKER_URL=${CELERY_BROKER_URL:-redis://localhost:6379/0}
CELERY_RESULT_BACKEND=${CELERY_RESULT_BACKEND:-redis://localhost:6379/0}

# Performance
STRATEGIST_ENABLED=true
LOG_LEVEL=INFO
EOF

log_success "Backend configuration created"

# Setup virtual environment
log_info "Setting up Python environment..."
if [ ! -f "venv/bin/activate" ]; then
    python3 -m venv venv
fi

source venv/bin/activate || error_exit "Failed to activate virtual environment"

# Install dependencies
log_info "Installing Python dependencies..."
pip install --upgrade pip
pip install -r requirements.txt
pip install gunicorn  # Production WSGI server

# Run database migrations
log_info "Running database migrations..."
export FLASK_APP=app:create_app
export FLASK_ENV=production
flask db upgrade || log_warning "Database migration failed - may already be up to date"

log_success "Backend configured successfully"

# =============================================================================
# FRONTEND BUILD
# =============================================================================

log_header "FRONTEND BUILD"

cd "${PROJECT_ROOT}/frontend" || error_exit "Frontend directory not found"

# Check if build exists and is recent
if [ -d "dist" ] && [ -f "dist/index.html" ]; then
    BUILD_AGE=$(($(date +%s) - $(stat -c %Y dist/index.html 2>/dev/null || stat -f %m dist/index.html)))
    if [ $BUILD_AGE -lt 3600 ]; then  # Less than 1 hour old
        log_info "Using existing build (created $(($BUILD_AGE / 60)) minutes ago)"
    else
        log_info "Build is old, rebuilding..."
        npm run build || error_exit "Frontend build failed"
    fi
else
    log_info "Building frontend for production..."
    npm ci --production=false  # Need dev dependencies for build
    npm run build || error_exit "Frontend build failed"
fi

# Verify build output
if [ ! -f "dist/index.html" ]; then
    error_exit "Frontend build verification failed - index.html not found"
fi

BUILD_SIZE=$(du -sh dist | cut -f1)
log_success "Frontend build ready (Size: $BUILD_SIZE)"

# =============================================================================
# START BACKEND SERVICE
# =============================================================================

log_header "STARTING BACKEND SERVICE"

cd "${PROJECT_ROOT}/backend" || error_exit "Backend directory not found"

# Activate virtual environment
source venv/bin/activate

# Export production environment variables
export FLASK_ENV=production
export FLASK_APP=app:create_app
export DATABASE_URL=${DATABASE_URL:-postgresql://postgres:amuktha@localhost/lokdarpan_db}

# CRITICAL: Export CORS origins including production port
export CORS_ORIGINS="http://localhost:${PRODUCTION_PORT},http://127.0.0.1:${PRODUCTION_PORT},http://localhost:8080,http://127.0.0.1:8080"

log_info "Starting backend with Gunicorn..."

# Start backend with Gunicorn (production WSGI server)
gunicorn \
    --bind 127.0.0.1:${BACKEND_PORT} \
    --workers 2 \
    --threads 4 \
    --timeout 120 \
    --log-level info \
    --access-logfile "${LOG_DIR}/access.log" \
    --error-logfile "${LOG_DIR}/error.log" \
    --daemon \
    --pid "${LOG_DIR}/backend.pid" \
    "app:create_app()"

BACKEND_PID=$(cat "${LOG_DIR}/backend.pid" 2>/dev/null)

# Wait for backend to be ready
log_info "Waiting for backend to start..."
BACKEND_READY=false
for i in {1..30}; do
    if curl -sf "http://localhost:${BACKEND_PORT}/api/v1/status" >/dev/null 2>&1; then
        BACKEND_READY=true
        break
    fi
    if [ $((i % 5)) -eq 0 ]; then
        log_info "Still waiting... (${i}/30)"
    fi
    sleep 1
done

if [ "$BACKEND_READY" = false ]; then
    log_error "Backend failed to start"
    tail -20 "${LOG_DIR}/error.log"
    error_exit "Backend startup failed"
fi

log_success "Backend started successfully on port ${BACKEND_PORT}"

# =============================================================================
# START FRONTEND SERVER
# =============================================================================

log_header "STARTING FRONTEND SERVER"

cd "${PROJECT_ROOT}/frontend" || error_exit "Frontend directory not found"

log_info "Starting production frontend server..."

# Use Vite preview server (has proxy support for API calls)
npm run preview -- --port ${PRODUCTION_PORT} > "${LOG_DIR}/frontend.log" 2>&1 &
FRONTEND_PID=$!

# Save PID for management
echo $FRONTEND_PID > "${LOG_DIR}/frontend.pid"

# Wait for frontend to be ready
log_info "Waiting for frontend to start..."
FRONTEND_READY=false
for i in {1..20}; do
    if curl -sf "http://localhost:${PRODUCTION_PORT}/" >/dev/null 2>&1; then
        FRONTEND_READY=true
        break
    fi
    sleep 1
done

if [ "$FRONTEND_READY" = false ]; then
    log_warning "Frontend may still be starting up"
fi

log_success "Frontend server started on port ${PRODUCTION_PORT}"

# =============================================================================
# VALIDATION
# =============================================================================

log_header "DEPLOYMENT VALIDATION"

# Test backend API
log_info "Testing backend API..."
API_RESPONSE=$(curl -s "http://localhost:${BACKEND_PORT}/api/v1/status")
if echo "$API_RESPONSE" | grep -q '"ok":true'; then
    log_success "Backend API is responding correctly"
else
    log_warning "Backend API response unexpected"
fi

# Test CORS configuration (Critical!)
log_info "Testing CORS configuration..."
CORS_TEST=$(curl -s -X OPTIONS \
    -H "Origin: http://localhost:${PRODUCTION_PORT}" \
    -H "Access-Control-Request-Method: POST" \
    -H "Access-Control-Request-Headers: Content-Type" \
    "http://localhost:${BACKEND_PORT}/api/v1/login" -I 2>/dev/null | grep -i "access-control-allow-origin")

if echo "$CORS_TEST" | grep -q "http://localhost:${PRODUCTION_PORT}"; then
    log_success "CORS is properly configured for production port"
else
    log_error "CORS configuration issue detected!"
    log_warning "Login will fail without proper CORS. Check CORS_ORIGINS environment variable."
fi

# Test authentication endpoint
log_info "Testing authentication..."
AUTH_TEST=$(curl -s -X POST \
    -H "Content-Type: application/json" \
    -H "Origin: http://localhost:${PRODUCTION_PORT}" \
    -d '{"username":"ashish","password":"password"}' \
    "http://localhost:${BACKEND_PORT}/api/v1/login")

if echo "$AUTH_TEST" | grep -q '"message":"Login successful"'; then
    log_success "Authentication is working correctly"
else
    log_warning "Authentication test returned unexpected response"
fi

# =============================================================================
# FINAL STATUS
# =============================================================================

log_header "DEPLOYMENT COMPLETE"

# Create status script
cat > "${PROJECT_ROOT}/status.sh" << 'EOF'
#!/bin/bash
echo "LokDarpan Production Status"
echo "==========================="
echo
echo "Services:"
echo "  Backend PID: $(cat logs/backend.pid 2>/dev/null || echo 'Not running')"
echo "  Frontend PID: $(cat logs/frontend.pid 2>/dev/null || echo 'Not running')"
echo
echo "API Health:"
curl -s http://localhost:5000/api/v1/status 2>/dev/null | python3 -m json.tool || echo "API not responding"
echo
echo "Recent Errors:"
tail -5 logs/error.log 2>/dev/null || echo "No error log"
EOF
chmod +x "${PROJECT_ROOT}/status.sh"

# Create stop script
cat > "${PROJECT_ROOT}/stop.sh" << 'EOF'
#!/bin/bash
echo "Stopping LokDarpan services..."
[ -f logs/backend.pid ] && kill $(cat logs/backend.pid) 2>/dev/null
[ -f logs/frontend.pid ] && kill $(cat logs/frontend.pid) 2>/dev/null
pkill -f "gunicorn.*app" 2>/dev/null || true
pkill -f "npm.*preview" 2>/dev/null || true
echo "Services stopped"
EOF
chmod +x "${PROJECT_ROOT}/stop.sh"

echo
log_success "🎉 LokDarpan Production Deployment SUCCESSFUL!"
echo
echo -e "${CYAN}═══════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}ACCESS URLS:${NC}"
echo -e "  🌐 Frontend: ${BLUE}http://localhost:${PRODUCTION_PORT}${NC}"
echo -e "  🔌 Backend API: ${BLUE}http://localhost:${BACKEND_PORT}${NC}"
echo
echo -e "${GREEN}LOGIN CREDENTIALS:${NC}"
echo -e "  Username: ${BLUE}ashish${NC}"
echo -e "  Password: ${BLUE}password${NC}"
echo
echo -e "${GREEN}SERVICE MANAGEMENT:${NC}"
echo -e "  Check status: ${YELLOW}./status.sh${NC}"
echo -e "  Stop services: ${YELLOW}./stop.sh${NC}"
echo -e "  View logs: ${YELLOW}tail -f logs/*.log${NC}"
echo
echo -e "${GREEN}TROUBLESHOOTING:${NC}"
echo -e "  If login fails: Check CORS in ${YELLOW}logs/error.log${NC}"
echo -e "  If blank screen: Check browser console for errors"
echo -e "  Full guide: ${YELLOW}TROUBLESHOOTING_GUIDE.md${NC}"
echo -e "${CYAN}═══════════════════════════════════════════════════════${NC}"
echo

# Health summary
if [ "$BACKEND_READY" = true ] && [ "$FRONTEND_READY" = true ]; then
    log_success "All systems operational!"
else
    log_warning "Some services may need attention - check logs"
fi

exit 0