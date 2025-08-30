#!/bin/bash

# Stop LokDarpan local production environment

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}Stopping LokDarpan local production environment...${NC}"

# Stop backend
if [ -f "logs/backend.pid" ]; then
    BACKEND_PID=$(cat logs/backend.pid)
    echo -e "${YELLOW}Stopping backend (PID: $BACKEND_PID)...${NC}"
    kill $BACKEND_PID 2>/dev/null || true
    rm -f logs/backend.pid
    echo -e "${GREEN}✓ Backend stopped${NC}"
fi

# Stop frontend  
if [ -f "logs/frontend.pid" ]; then
    FRONTEND_PID=$(cat logs/frontend.pid)
    echo -e "${YELLOW}Stopping frontend (PID: $FRONTEND_PID)...${NC}"
    kill $FRONTEND_PID 2>/dev/null || true
    rm -f logs/frontend.pid
    echo -e "${GREEN}✓ Frontend stopped${NC}"
fi

# Clean up any remaining processes
pkill -f "flask run" 2>/dev/null || true
pkill -f "npm run dev" 2>/dev/null || true

echo -e "${GREEN}✓ LokDarpan local environment stopped${NC}"