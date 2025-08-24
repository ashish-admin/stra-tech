# LokDarpan Process Management & Development Environment Guide

**CRITICAL FINDING**: The "frontend launch issues" experienced are **process management problems**, not code defects. This guide provides systematic diagnosis and resolution for development environment issues.

## Executive Summary

Analysis of the LokDarpan development environment revealed that frontend launch failures are caused by:
1. **Port collision syndrome** - Multiple orphaned processes
2. **Service dependency chain failures** - Wrong startup order
3. **Environment configuration conflicts** - Inconsistent API endpoints
4. **Dependency corruption** - Missing or broken Node modules
5. **Database connection issues** - PostgreSQL not ready

**None of these are code defects** - they are all process management and configuration issues with proven solutions.

---

## Development Environment Process Management Failures

### 1. Port Collision Syndrome (Most Common)

**Root Cause**: Previous development sessions leave orphaned Vite processes running on different ports

**Evidence from System Analysis**:
```bash
# Current system shows multiple Vite instances
node     9201 amuktha   26u  IPv6  71184      0t0  TCP *:5173 (LISTEN)
node    16002 amuktha   26u  IPv6  95149      0t0  TCP *:5174 (LISTEN)
node    39624 amuktha   27u  IPv6 294130      0t0  TCP *:5175 (LISTEN)
```

**Impact**: New frontend instances fail to bind to expected ports, causing "startup failed" errors

**Symptoms**:
- `EADDRINUSE: address already in use :::5173`
- Frontend appears to start but browser shows connection refused
- Multiple npm/vite processes in `ps aux` output
- Inconsistent port assignments across restarts

**Diagnostic Commands**:
```bash
# Check all development ports
lsof -i :5000 -i :5173 -i :5174 -i :5175

# Count Vite processes (should be 1 or 0)
ps aux | grep vite | grep -v grep | wc -l

# Check for port binding conflicts
netstat -tulpn | grep -E ":5173|:5174|:5175"

# Identify orphaned processes
ps aux | grep -E "(flask|vite|npm)" | grep -v grep
```

**Resolution (Immediate)**:
```bash
# Emergency port cleanup
pkill -f "vite"
pkill -f "npm.*dev"
sleep 3

# Force kill remaining processes on development ports
for port in 5173 5174 5175; do
    lsof -ti:$port | xargs kill -9 2>/dev/null || true
done

# Verify cleanup
lsof -i :5173 -i :5174 -i :5175
```

**Prevention**:
```bash
# Always use the cleanup script before starting
./scripts/dev-stop.sh
./scripts/dev-start.sh

# OR create a restart alias
alias lokdarpan-restart="./scripts/dev-stop.sh && sleep 2 && ./scripts/dev-start.sh"
```

### 2. Service Dependency Chain Failure

**Root Cause**: Frontend Vite proxy requires backend Flask server to be ready and responding

**Configuration Dependencies**:
- Vite config hardcoded: `target: 'http://localhost:5000'`
- Backend must be on port 5000 exactly
- Database connection must be established
- Environment variables must be loaded

**Failure Chain**:
```
Frontend starts → Vite proxy attempts connection → Backend not ready → Proxy fails → API calls fail
```

**Symptoms**:
- Frontend loads but shows "Network Error" or blank screens
- Browser console: `Failed to fetch` or `Connection refused`
- API calls return `ERR_CONNECTION_REFUSED`
- Backend responds to direct curl but not through proxy

**Diagnostic Commands**:
```bash
# Test backend readiness
curl -f http://localhost:5000/api/v1/status || echo "Backend not ready"

# Check if Flask process is running
ps aux | grep flask | grep -v grep

# Test database connectivity from backend
cd backend && python -c "
import os
from app import create_app
app = create_app()
with app.app_context():
    from app.extensions import db
    result = db.engine.execute('SELECT 1')
    print('Database connection OK')
"

# Check environment loading
cd backend && source venv/bin/activate && python -c "
import os
print('DATABASE_URL:', os.environ.get('DATABASE_URL', 'NOT_SET'))
print('SECRET_KEY:', os.environ.get('SECRET_KEY', 'NOT_SET')[:10] + '...')
"
```

**Resolution**:
```bash
# Systematic startup in correct order
echo "🔄 Starting services in correct order..."

# 1. Stop everything first
pkill -f "flask|vite|npm.*dev"
sleep 3

# 2. Start backend first
cd backend
source venv/bin/activate
export FLASK_APP=app:create_app
export DATABASE_URL="postgresql://postgres:amuktha@localhost/lokdarpan_db"

# Load environment variables
if [ -f ".env" ]; then
    export $(grep -v '^#' .env | xargs)
fi

# Start Flask
flask run --port=5000 &
BACKEND_PID=$!

# 3. Wait for backend to be ready
echo "⏳ Waiting for backend readiness..."
for i in {1..30}; do
    if curl -sf http://localhost:5000/api/v1/status >/dev/null 2>&1; then
        echo "✅ Backend ready on port 5000"
        break
    fi
    sleep 1
    if [ $i -eq 30 ]; then
        echo "❌ Backend failed to start"
        kill $BACKEND_PID 2>/dev/null
        exit 1
    fi
done

# 4. Start frontend
cd ../frontend
echo "VITE_API_BASE_URL=http://localhost:5000" > .env.local
npm run dev &
FRONTEND_PID=$!

# 5. Cleanup on exit
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null" EXIT
echo "✅ Both services started successfully"
echo "🖥️  Frontend: http://localhost:5173"
echo "🔌 Backend: http://localhost:5000"
wait
```

### 3. Environment Configuration Conflicts

**Root Cause**: Multiple environment files with conflicting or missing API base URLs

**Configuration Files Found**:
```
frontend/.env: VITE_API_BASE_URL=  (empty)
frontend/.env.development: VITE_API_BASE_URL="http://localhost:5000"
frontend/.env.local: VITE_API_BASE_URL=http://localhost:5000
```

**Environment Loading Priority** (Vite):
1. `.env.local` (highest priority)
2. `.env.development`
3. `.env`
4. Default values

**Symptoms**:
- API calls going to wrong URLs (localhost:3000, undefined, etc.)
- CORS errors despite backend configuration
- Inconsistent behavior between development sessions
- API base URL showing as empty in browser console

**Diagnostic Commands**:
```bash
cd frontend

# Check all environment files
echo "=== Environment File Analysis ==="
for file in .env .env.local .env.development .env.production; do
    if [ -f "$file" ]; then
        echo "File: $file"
        cat "$file"
        echo
    fi
done

# Check Vite runtime configuration
echo "=== Vite Runtime Config (start dev server and check) ==="
echo "Look for 'API Base Configuration' in console output"

# Test API resolution
node -e "
process.env.NODE_ENV = 'development';
console.log('VITE_API_BASE_URL would resolve to:', 
    process.env.VITE_API_BASE_URL || 
    'undefined (will use proxy)'
)
"
```

**Resolution**:
```bash
cd frontend

# Create authoritative .env.local (overrides all others)
cat > .env.local << 'EOF'
# LokDarpan Development Environment Configuration
# This file takes highest priority and overrides all other .env files

# API Configuration - Backend running on port 5000
VITE_API_BASE_URL=http://localhost:5000

# Debug flag for development
VITE_DEBUG=true

# Environment marker
VITE_ENV=development
EOF

echo "✅ Created authoritative .env.local"

# Verify configuration
echo "Environment verification:"
echo "VITE_API_BASE_URL will be: http://localhost:5000"

# Optional: Clean up conflicting files
read -p "Remove other .env files to prevent conflicts? (y/N): " cleanup
if [[ $cleanup =~ ^[Yy] ]]; then
    rm -f .env .env.development 2>/dev/null
    echo "✅ Cleaned up conflicting environment files"
fi

# Test with fresh start
npm run dev
```

### 4. Node.js Dependency Corruption

**Root Cause**: Node modules become corrupted or incompatible due to version changes, interrupted installs, or cache issues

**Symptoms**:
- `Module not found` errors in browser console
- `Cannot resolve dependency` errors during npm start
- Blank white screen with console errors
- Build failures with cryptic error messages
- Version conflicts between packages

**Diagnostic Commands**:
```bash
cd frontend

# Check for missing or corrupt dependencies
npm list --depth=0 2>/dev/null | grep -E "(UNMET|invalid|missing)" || echo "Dependencies appear OK"

# Check for known problematic packages
npm ls vite react @vitejs/plugin-react

# Verify critical imports
node -e "
try {
    require('vite');
    console.log('✅ Vite import OK');
} catch(e) {
    console.log('❌ Vite import failed:', e.message);
}
"

# Check for cache corruption
npm cache verify

# Look for package-lock.json corruption
if [ -f "package-lock.json" ]; then
    echo "Package lock file exists ($(stat -c%s package-lock.json) bytes)"
    # Verify it's valid JSON
    node -e "JSON.parse(require('fs').readFileSync('package-lock.json'))" 2>/dev/null && echo "✅ Valid JSON" || echo "❌ Corrupted JSON"
fi
```

**Resolution**:
```bash
cd frontend

echo "🔄 Full dependency reset..."

# 1. Complete cleanup
rm -rf node_modules/
rm -f package-lock.json
npm cache clean --force

# 2. Clear npm cache thoroughly
npm cache verify
rm -rf ~/.npm/_cacache 2>/dev/null || true

# 3. Reinstall everything
echo "📦 Reinstalling dependencies..."
npm install

# 4. Verify installation
npm list --depth=0 | head -10
npm ls vite react @vitejs/plugin-react

# 5. Test build
echo "🔨 Testing build..."
npm run build

# 6. Test development server
echo "🚀 Testing development server..."
timeout 10 npm run dev || echo "Dev server test completed"

echo "✅ Dependency reset complete"
```

### 5. Database Connection Issues

**Root Cause**: Backend requires PostgreSQL to be running and database to exist before Flask can start

**Database Dependencies**:
- PostgreSQL service must be running
- Database `lokdarpan_db` must exist
- User `postgres` must have access
- Connection string must be correct

**Symptoms**:
- Backend fails to start with database connection errors
- Flask starts but API calls return 500 Internal Server Error
- Backend logs show `psycopg2.OperationalError`
- Connection refused errors in backend console

**Diagnostic Commands**:
```bash
# Check PostgreSQL service status
systemctl is-active postgresql 2>/dev/null || service postgresql status 2>/dev/null || echo "PostgreSQL status unknown"

# Test direct database connection
psql "postgresql://postgres:amuktha@localhost/lokdarpan_db" -c "SELECT version();" 2>/dev/null && echo "✅ Database connection OK" || echo "❌ Database connection failed"

# Check if database exists
psql "postgresql://postgres:amuktha@localhost" -c "SELECT datname FROM pg_database WHERE datname='lokdarpan_db';" 2>/dev/null

# Test from Python (backend environment)
cd backend && source venv/bin/activate && python -c "
import psycopg2
try:
    conn = psycopg2.connect('postgresql://postgres:amuktha@localhost/lokdarpan_db')
    print('✅ Python PostgreSQL connection OK')
    conn.close()
except Exception as e:
    print('❌ Python PostgreSQL connection failed:', e)
"

# Check backend environment variable
cd backend && echo "DATABASE_URL from backend/.env: $(grep DATABASE_URL .env 2>/dev/null)"
```

**Resolution**:
```bash
echo "🗄️ Database connection resolution..."

# 1. Start PostgreSQL service (varies by system)
echo "Starting PostgreSQL..."
if command -v systemctl >/dev/null; then
    sudo systemctl start postgresql
    sudo systemctl status postgresql --no-pager
elif command -v service >/dev/null; then
    sudo service postgresql start
    sudo service postgresql status
elif command -v brew >/dev/null; then
    brew services start postgresql
else
    echo "⚠️ Please start PostgreSQL manually"
fi

# 2. Create database if it doesn't exist
echo "Creating database if needed..."
if ! psql "postgresql://postgres:amuktha@localhost/lokdarpan_db" -c "SELECT 1;" >/dev/null 2>&1; then
    echo "Database doesn't exist, creating..."
    createdb -h localhost -U postgres lokdarpan_db
    echo "✅ Database created"
else
    echo "✅ Database already exists"
fi

# 3. Verify connection from backend
cd backend
if [ -f "venv/bin/activate" ]; then
    source venv/bin/activate
    
    # Set environment
    export DATABASE_URL="postgresql://postgres:amuktha@localhost/lokdarpan_db"
    
    # Test connection
    python -c "
from app import create_app
app = create_app()
with app.app_context():
    from app.extensions import db
    db.engine.execute('SELECT 1')
    print('✅ Backend database connection verified')
"
    
    # Run migrations
    export FLASK_APP=app:create_app
    flask db upgrade
    echo "✅ Database migrations applied"
else
    echo "❌ Virtual environment not found"
    exit 1
fi

echo "✅ Database connection resolution complete"
```

---

## Automated Health Check Script

<function_calls>
<invoke name="TodoWrite">
<parameter name="todos">[{"content": "Analyze and document process management failure modes", "status": "completed", "activeForm": "Analyzing process management failure modes"}, {"content": "Create comprehensive troubleshooting guide", "status": "completed", "activeForm": "Creating comprehensive troubleshooting guide"}, {"content": "Develop automated health check scripts", "status": "in_progress", "activeForm": "Developing automated health check scripts"}, {"content": "Improve startup scripts with better error handling", "status": "pending", "activeForm": "Improving startup scripts with better error handling"}]