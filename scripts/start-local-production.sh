#!/bin/bash

# Start LokDarpan locally with production configuration
# This script runs the application locally using the enhanced configuration

set -e

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║        LokDarpan Local Production Environment               ║${NC}"
echo -e "${BLUE}║        Political Intelligence Platform Testing             ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check if we're in the right directory
if [ ! -f "CLAUDE.md" ]; then
    echo -e "${RED}Error: Please run this script from the LokDarpan root directory${NC}"
    exit 1
fi

# Load environment variables
if [ -f ".env.production-enhanced" ]; then
    echo -e "${GREEN}[1/8] Loading enhanced production environment...${NC}"
    set -a
    source .env.production-enhanced
    set +a
    echo -e "${GREEN}✓ Environment loaded${NC}"
else
    echo -e "${RED}Error: .env.production-enhanced not found${NC}"
    exit 1
fi

# Check database connection
echo -e "${GREEN}[2/8] Checking database connection...${NC}"
DB_URL=${DATABASE_URL:-"postgresql://postgres:amuktha@localhost/lokdarpan_db"}

# Try to connect to database
if command -v psql &> /dev/null; then
    if psql "$DB_URL" -c "SELECT 1;" &> /dev/null; then
        echo -e "${GREEN}✓ Database connection successful${NC}"
    else
        echo -e "${YELLOW}⚠ Database connection failed, using fallback configuration${NC}"
        export DATABASE_URL="postgresql://postgres:amuktha@localhost/lokdarpan_db"
    fi
else
    echo -e "${YELLOW}⚠ psql not available, assuming database is configured${NC}"
fi

# Check Redis connection
echo -e "${GREEN}[3/8] Checking Redis connection...${NC}"
if command -v redis-cli &> /dev/null; then
    if redis-cli ping &> /dev/null; then
        echo -e "${GREEN}✓ Redis connection successful${NC}"
    else
        echo -e "${YELLOW}⚠ Redis not available, using local fallback${NC}"
        export REDIS_URL="redis://localhost:6379/0"
        export CELERY_BROKER_URL="redis://localhost:6379/1"
        export CELERY_RESULT_BACKEND="redis://localhost:6379/2"
    fi
else
    echo -e "${YELLOW}⚠ redis-cli not available, assuming Redis is configured${NC}"
fi

# Check if backend virtual environment exists
echo -e "${GREEN}[4/8] Setting up backend environment...${NC}"
if [ -d "backend/venv" ]; then
    echo -e "${GREEN}✓ Virtual environment found${NC}"
else
    echo -e "${YELLOW}⚠ Virtual environment not found, please run:${NC}"
    echo "  cd backend && python -m venv venv && source venv/bin/activate && pip install -r requirements.txt"
    exit 1
fi

# Start backend
echo -e "${GREEN}[5/8] Starting backend server...${NC}"
cd backend

# Activate virtual environment
if [ -f "venv/bin/activate" ]; then
    source venv/bin/activate
elif [ -f "venv/Scripts/activate" ]; then
    source venv/Scripts/activate
else
    echo -e "${RED}Error: Cannot find virtual environment activation script${NC}"
    exit 1
fi

# Set Flask environment
export FLASK_APP=app:create_app
export FLASK_ENV=production

# Run database migrations
echo -e "${BLUE}Running database migrations...${NC}"
flask db upgrade 2>/dev/null || echo -e "${YELLOW}⚠ Migration failed or not needed${NC}"

# Start backend in background
echo -e "${BLUE}Starting Flask backend on http://localhost:5000${NC}"
nohup flask run --host=0.0.0.0 --port=5000 > ../logs/backend.log 2>&1 &
BACKEND_PID=$!
echo $BACKEND_PID > ../logs/backend.pid
echo -e "${GREEN}✓ Backend started (PID: $BACKEND_PID)${NC}"

# Return to root directory
cd ..

# Wait for backend to start
echo -e "${GREEN}[6/8] Waiting for backend to initialize...${NC}"
sleep 5

# Test backend health
for i in {1..10}; do
    if curl -s http://localhost:5000/api/v1/status > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Backend is responding${NC}"
        break
    fi
    if [ $i -eq 10 ]; then
        echo -e "${RED}✗ Backend failed to start${NC}"
        cat logs/backend.log | tail -10
        exit 1
    fi
    echo -e "${YELLOW}  Waiting for backend... ($i/10)${NC}"
    sleep 2
done

# Start frontend
echo -e "${GREEN}[7/8] Starting frontend server...${NC}"
cd frontend

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}Installing frontend dependencies...${NC}"
    npm install
fi

# Start frontend in background
echo -e "${BLUE}Starting Vite frontend on http://localhost:5173${NC}"
nohup npm run dev > ../logs/frontend.log 2>&1 &
FRONTEND_PID=$!
echo $FRONTEND_PID > ../logs/frontend.pid
echo -e "${GREEN}✓ Frontend started (PID: $FRONTEND_PID)${NC}"

# Return to root directory
cd ..

# Wait for frontend to start
echo -e "${GREEN}[8/8] Waiting for frontend to initialize...${NC}"
sleep 5

# Test frontend health
for i in {1..10}; do
    if curl -s http://localhost:5173 > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Frontend is responding${NC}"
        break
    fi
    if [ $i -eq 10 ]; then
        echo -e "${RED}✗ Frontend failed to start${NC}"
        cat logs/frontend.log | tail -10
        exit 1
    fi
    echo -e "${YELLOW}  Waiting for frontend... ($i/10)${NC}"
    sleep 2
done

# Create logs directory
mkdir -p logs

# Success message
echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                    🚀 SUCCESS! 🚀                           ║${NC}"
echo -e "${GREEN}║            LokDarpan is now running locally!                ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}Access your Political Intelligence Platform:${NC}"
echo -e "  🌐 Frontend: ${GREEN}http://localhost:5173${NC}"
echo -e "  🔧 Backend API: ${GREEN}http://localhost:5000${NC}"
echo -e "  📊 API Status: ${GREEN}http://localhost:5000/api/v1/status${NC}"
echo ""
echo -e "${BLUE}Default Login Credentials:${NC}"
echo -e "  👤 Username: ${YELLOW}ashish${NC}"
echo -e "  🔑 Password: ${YELLOW}password${NC}"
echo ""
echo -e "${BLUE}Available Features:${NC}"
echo -e "  ✅ Ward-level political analytics"
echo -e "  ✅ Real-time sentiment analysis"
echo -e "  ✅ Competitive intelligence tracking"
echo -e "  ✅ Interactive geographic mapping"
echo -e "  ✅ Political Strategist AI (with fallback responses)"
echo -e "  ✅ Strategic briefings and alerts"
echo ""
echo -e "${BLUE}Management Commands:${NC}"
echo -e "  📋 View backend logs: ${YELLOW}tail -f logs/backend.log${NC}"
echo -e "  📋 View frontend logs: ${YELLOW}tail -f logs/frontend.log${NC}"
echo -e "  🔄 Restart services: ${YELLOW}./scripts/restart-local.sh${NC}"
echo -e "  ⏹️  Stop services: ${YELLOW}./scripts/stop-local.sh${NC}"
echo -e "  🏥 Health check: ${YELLOW}./scripts/health-check-local.sh${NC}"
echo ""
echo -e "${BLUE}Next Steps:${NC}"
echo -e "1. Open your browser to ${GREEN}http://localhost:5173${NC}"
echo -e "2. Login with the credentials above"
echo -e "3. Explore the dashboard features"
echo -e "4. Test the Political Strategist module"
echo -e "5. Try different ward selections on the map"
echo ""
echo -e "${YELLOW}Note: AI services will use template fallback responses${NC}"
echo -e "${YELLOW}      To enable full AI features, configure service account authentication${NC}"
echo ""
echo -e "${GREEN}LokDarpan is ready for political intelligence operations! 🗳️✨${NC}"