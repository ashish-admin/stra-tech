#!/bin/bash

# LokDarpan Development Environment Health Check Script
# Identifies and diagnoses common process management issues

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Icons
CHECK="✅"
CROSS="❌"
WARNING="⚠️"
INFO="ℹ️"

echo -e "${BLUE}🏥 LokDarpan Development Environment Health Check${NC}"
echo -e "${BLUE}=================================================${NC}"
echo "Timestamp: $(date)"
echo

HEALTH_SCORE=0
TOTAL_CHECKS=0

# Function to update health score
check_result() {
    local status=$1
    local message=$2
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
    
    if [ "$status" = "pass" ]; then
        echo -e "${GREEN}${CHECK} ${message}${NC}"
        HEALTH_SCORE=$((HEALTH_SCORE + 1))
    elif [ "$status" = "warn" ]; then
        echo -e "${YELLOW}${WARNING} ${message}${NC}"
        HEALTH_SCORE=$((HEALTH_SCORE + 1)) # Count warnings as partial pass
    else
        echo -e "${RED}${CROSS} ${message}${NC}"
    fi
}

echo -e "${BLUE}1. Port Collision Analysis${NC}"
echo "Checking for orphaned processes on development ports..."

# Check development ports
BACKEND_PORT_USAGE=$(lsof -i :5000 2>/dev/null || echo "")
FRONTEND_PORTS=(5173 5174 5175)
VITE_PROCESS_COUNT=$(ps aux | grep vite | grep -v grep | wc -l)

if [ -n "$BACKEND_PORT_USAGE" ]; then
    BACKEND_PROCESS=$(echo "$BACKEND_PORT_USAGE" | grep LISTEN | awk '{print $1}' | head -1)
    if [ "$BACKEND_PROCESS" = "flask" ] || [ "$BACKEND_PROCESS" = "python" ]; then
        check_result "pass" "Backend port 5000 - Flask process running normally"
    else
        check_result "fail" "Backend port 5000 - Non-Flask process detected: $BACKEND_PROCESS"
    fi
else
    check_result "warn" "Backend port 5000 - No process detected (backend may not be running)"
fi

# Check frontend ports
ACTIVE_FRONTEND_PORTS=0
for port in "${FRONTEND_PORTS[@]}"; do
    if lsof -i :$port >/dev/null 2>&1; then
        ACTIVE_FRONTEND_PORTS=$((ACTIVE_FRONTEND_PORTS + 1))
        PROCESS_INFO=$(lsof -i :$port | grep LISTEN | awk '{print $1, $2}' | head -1)
        echo -e "${INFO} Frontend port $port - Active ($PROCESS_INFO)"
    fi
done

if [ $ACTIVE_FRONTEND_PORTS -eq 0 ]; then
    check_result "warn" "No frontend processes detected on ports 5173-5175"
elif [ $ACTIVE_FRONTEND_PORTS -eq 1 ]; then
    check_result "pass" "Single frontend process running (optimal)"
else
    check_result "fail" "Multiple frontend processes detected ($ACTIVE_FRONTEND_PORTS) - port collision likely"
fi

if [ $VITE_PROCESS_COUNT -gt 1 ]; then
    check_result "fail" "Multiple Vite processes detected ($VITE_PROCESS_COUNT) - orphaned processes present"
    echo -e "${INFO} Use: pkill -f 'vite' to clean up"
elif [ $VITE_PROCESS_COUNT -eq 1 ]; then
    check_result "pass" "Single Vite process running"
else
    check_result "warn" "No Vite processes detected"
fi

echo

echo -e "${BLUE}2. Service Dependency Chain${NC}"
echo "Checking backend-frontend dependency chain..."

# Test backend API connectivity
if curl -sf http://localhost:5000/api/v1/status >/dev/null 2>&1; then
    check_result "pass" "Backend API responding on port 5000"
    
    # Test API response content
    API_RESPONSE=$(curl -s http://localhost:5000/api/v1/status)
    if echo "$API_RESPONSE" | grep -q '"ok":true'; then
        check_result "pass" "Backend API returning valid status response"
    else
        check_result "fail" "Backend API responding but invalid status format"
    fi
else
    check_result "fail" "Backend API not responding on port 5000"
    echo -e "${INFO} Backend must be running before frontend can start"
fi

# Check for running Flask process
FLASK_PROCESSES=$(ps aux | grep -E "(flask.*run|python.*app)" | grep -v grep | wc -l)
if [ $FLASK_PROCESSES -eq 1 ]; then
    check_result "pass" "Flask backend process running"
elif [ $FLASK_PROCESSES -gt 1 ]; then
    check_result "warn" "Multiple Flask processes detected ($FLASK_PROCESSES)"
else
    check_result "fail" "No Flask backend process found"
fi

# Test frontend proxy connectivity (if frontend is running)
FRONTEND_ACCESSIBLE=false
for port in "${FRONTEND_PORTS[@]}"; do
    if curl -sf http://localhost:$port/ >/dev/null 2>&1; then
        check_result "pass" "Frontend accessible on port $port"
        FRONTEND_ACCESSIBLE=true
        
        # Test proxy functionality
        if curl -sf http://localhost:$port/api/v1/status >/dev/null 2>&1; then
            check_result "pass" "Frontend proxy to backend working on port $port"
        else
            check_result "fail" "Frontend proxy to backend failing on port $port"
        fi
        break
    fi
done

if [ "$FRONTEND_ACCESSIBLE" = false ]; then
    check_result "warn" "No frontend accessible on standard ports"
fi

echo

echo -e "${BLUE}3. Environment Configuration${NC}"
echo "Analyzing environment variable configuration..."

# Check backend environment
if [ -d "backend" ]; then
    cd backend
    
    # Check .env file existence
    if [ -f ".env" ]; then
        check_result "pass" "Backend .env file exists"
        
        # Check critical environment variables
        if grep -q "DATABASE_URL" .env; then
            check_result "pass" "DATABASE_URL configured in backend"
        else
            check_result "fail" "DATABASE_URL missing from backend .env"
        fi
        
        if grep -q "SECRET_KEY" .env; then
            check_result "pass" "SECRET_KEY configured in backend"
        else
            check_result "fail" "SECRET_KEY missing from backend .env"
        fi
    else
        check_result "fail" "Backend .env file missing"
    fi
    
    cd ..
else
    check_result "fail" "Backend directory not found"
fi

# Check frontend environment
if [ -d "frontend" ]; then
    cd frontend
    
    # Count environment files
    ENV_FILE_COUNT=$(find . -maxdepth 1 -name ".env*" | wc -l)
    if [ $ENV_FILE_COUNT -eq 0 ]; then
        check_result "warn" "No frontend environment files found"
    elif [ $ENV_FILE_COUNT -eq 1 ]; then
        check_result "pass" "Single frontend environment file (optimal)"
    else
        check_result "warn" "Multiple frontend environment files ($ENV_FILE_COUNT) - potential conflicts"
        echo -e "${INFO} Files found:"
        find . -maxdepth 1 -name ".env*" | sed 's/^/    /'
    fi
    
    # Check for .env.local (highest priority)
    if [ -f ".env.local" ]; then
        check_result "pass" ".env.local exists (highest priority)"
        if grep -q "VITE_API_BASE_URL.*localhost:5000" .env.local; then
            check_result "pass" "VITE_API_BASE_URL correctly configured"
        else
            check_result "fail" "VITE_API_BASE_URL not configured for localhost:5000"
        fi
    else
        check_result "warn" ".env.local missing (recommended for development)"
    fi
    
    cd ..
else
    check_result "fail" "Frontend directory not found"
fi

echo

echo -e "${BLUE}4. Dependency Health${NC}"
echo "Checking Node.js and Python dependencies..."

# Check backend dependencies
if [ -d "backend" ]; then
    cd backend
    
    # Check virtual environment
    if [ -f "venv/bin/activate" ]; then
        check_result "pass" "Python virtual environment exists"
        
        # Test virtual environment activation
        if source venv/bin/activate && python -c "import flask" 2>/dev/null; then
            check_result "pass" "Python virtual environment functional"
        else
            check_result "fail" "Python virtual environment broken or missing dependencies"
        fi
    else
        check_result "fail" "Python virtual environment missing"
    fi
    
    cd ..
else
    check_result "fail" "Backend directory not accessible"
fi

# Check frontend dependencies
if [ -d "frontend" ]; then
    cd frontend
    
    # Check node_modules
    if [ -d "node_modules" ]; then
        check_result "pass" "Node modules directory exists"
        
        # Check for critical packages
        if [ -d "node_modules/vite" ]; then
            check_result "pass" "Vite package installed"
        else
            check_result "fail" "Vite package missing"
        fi
        
        if [ -d "node_modules/react" ]; then
            check_result "pass" "React package installed"
        else
            check_result "fail" "React package missing"
        fi
    else
        check_result "fail" "Node modules directory missing"
        echo -e "${INFO} Run: npm install"
    fi
    
    # Check package-lock.json
    if [ -f "package-lock.json" ]; then
        check_result "pass" "package-lock.json exists"
        
        # Test if it's valid JSON
        if node -e "JSON.parse(require('fs').readFileSync('package-lock.json'))" 2>/dev/null; then
            check_result "pass" "package-lock.json is valid JSON"
        else
            check_result "fail" "package-lock.json is corrupted"
        fi
    else
        check_result "warn" "package-lock.json missing (may cause version inconsistencies)"
    fi
    
    cd ..
else
    check_result "fail" "Frontend directory not accessible"
fi

echo

echo -e "${BLUE}5. Database Connectivity${NC}"
echo "Testing PostgreSQL database connection..."

# Check PostgreSQL service
if command -v systemctl >/dev/null && systemctl is-active --quiet postgresql 2>/dev/null; then
    check_result "pass" "PostgreSQL service running (systemctl)"
elif command -v service >/dev/null && service postgresql status >/dev/null 2>&1; then
    check_result "pass" "PostgreSQL service running (service)"
elif pgrep -f postgres >/dev/null; then
    check_result "pass" "PostgreSQL process detected"
else
    check_result "fail" "PostgreSQL service not running"
    echo -e "${INFO} Start with: sudo systemctl start postgresql"
fi

# Test database connection
DB_CONNECTION_STRING="postgresql://postgres:amuktha@localhost/lokdarpan_db"
if psql "$DB_CONNECTION_STRING" -c "SELECT 1;" >/dev/null 2>&1; then
    check_result "pass" "Database connection successful"
    
    # Check if database has tables
    TABLE_COUNT=$(psql "$DB_CONNECTION_STRING" -t -c "SELECT count(*) FROM information_schema.tables WHERE table_schema='public';" 2>/dev/null | xargs || echo "0")
    if [ "$TABLE_COUNT" -gt 0 ]; then
        check_result "pass" "Database has $TABLE_COUNT tables (migrated)"
    else
        check_result "warn" "Database exists but no tables found (run migrations)"
    fi
else
    check_result "fail" "Database connection failed"
    echo -e "${INFO} Check if database exists: createdb -h localhost -U postgres lokdarpan_db"
fi

echo

echo -e "${BLUE}6. System Resources${NC}"
echo "Checking system resource usage..."

# Memory usage
MEMORY_USAGE=$(free | grep Mem | awk '{printf "%.1f", $3/$2 * 100.0}')
MEMORY_USAGE_INT=$(echo $MEMORY_USAGE | cut -d. -f1)

if [ "$MEMORY_USAGE_INT" -lt 70 ]; then
    check_result "pass" "Memory usage: ${MEMORY_USAGE}% (healthy)"
elif [ "$MEMORY_USAGE_INT" -lt 85 ]; then
    check_result "warn" "Memory usage: ${MEMORY_USAGE}% (elevated)"
else
    check_result "fail" "Memory usage: ${MEMORY_USAGE}% (critical)"
fi

# Disk usage
DISK_USAGE=$(df -h . | tail -1 | awk '{print $5}' | sed 's/%//')
if [ "$DISK_USAGE" -lt 80 ]; then
    check_result "pass" "Disk usage: ${DISK_USAGE}% (healthy)"
elif [ "$DISK_USAGE" -lt 90 ]; then
    check_result "warn" "Disk usage: ${DISK_USAGE}% (elevated)"
else
    check_result "fail" "Disk usage: ${DISK_USAGE}% (critical)"
fi

# Process count
LOKDARPAN_PROCESSES=$(ps aux | grep -E "(flask|vite|npm)" | grep -v grep | wc -l)
if [ "$LOKDARPAN_PROCESSES" -eq 2 ]; then
    check_result "pass" "Process count: $LOKDARPAN_PROCESSES (optimal - 1 backend, 1 frontend)"
elif [ "$LOKDARPAN_PROCESSES" -lt 2 ]; then
    check_result "warn" "Process count: $LOKDARPAN_PROCESSES (services may not be running)"
else
    check_result "warn" "Process count: $LOKDARPAN_PROCESSES (possible orphaned processes)"
fi

echo

# Health Score Summary
echo -e "${BLUE}📊 Health Score Summary${NC}"
echo "========================================"
HEALTH_PERCENTAGE=$(( (HEALTH_SCORE * 100) / TOTAL_CHECKS ))

echo "Checks Passed: $HEALTH_SCORE/$TOTAL_CHECKS (${HEALTH_PERCENTAGE}%)"

if [ "$HEALTH_PERCENTAGE" -ge 90 ]; then
    echo -e "${GREEN}🎉 System Health: EXCELLENT${NC}"
    echo "Your development environment is in great shape!"
elif [ "$HEALTH_PERCENTAGE" -ge 70 ]; then
    echo -e "${YELLOW}👍 System Health: GOOD${NC}"
    echo "Minor issues detected but system should function normally."
elif [ "$HEALTH_PERCENTAGE" -ge 50 ]; then
    echo -e "${YELLOW}⚠️  System Health: MODERATE${NC}"
    echo "Several issues detected. Address them for optimal performance."
else
    echo -e "${RED}🚨 System Health: CRITICAL${NC}"
    echo "Major issues detected. System may not function properly."
fi

echo

# Recommendations
echo -e "${BLUE}🔧 Recommendations${NC}"
echo "==================="

if [ $VITE_PROCESS_COUNT -gt 1 ]; then
    echo "• Clean up orphaned processes: pkill -f 'vite'"
fi

if ! curl -sf http://localhost:5000/api/v1/status >/dev/null 2>&1; then
    echo "• Start backend: cd backend && source venv/bin/activate && flask run"
fi

if [ ! -f "frontend/.env.local" ]; then
    echo "• Create frontend/.env.local with: VITE_API_BASE_URL=http://localhost:5000"
fi

if [ ! -d "frontend/node_modules" ] || [ ! -d "backend/venv" ]; then
    echo "• Install dependencies: npm install (frontend) and pip install -r requirements.txt (backend)"
fi

if [ "$MEMORY_USAGE_INT" -gt 85 ]; then
    echo "• Free up system memory or close unnecessary applications"
fi

if [ "$DISK_USAGE" -gt 85 ]; then
    echo "• Free up disk space: clean temporary files and caches"
fi

echo
echo -e "${BLUE}💡 Quick Actions${NC}"
echo "================="
echo "• Full system restart: ./scripts/dev-stop.sh && ./scripts/dev-start.sh"
echo "• Clean dependencies: rm -rf frontend/node_modules && npm install"
echo "• Database reset: dropdb lokdarpan_db && createdb lokdarpan_db && flask db upgrade"
echo "• Process cleanup: pkill -f 'flask|vite|npm'"

echo
echo -e "${BLUE}📋 Report Complete${NC}"
echo "==================="
echo "Health check completed at $(date)"
echo "For detailed troubleshooting, see: docs/PROCESS_MANAGEMENT_GUIDE.md"