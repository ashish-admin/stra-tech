#!/bin/bash

# Local health check for LokDarpan development environment

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}LokDarpan Local Health Check${NC}"
echo "=================================="
echo "Generated: $(date)"

failed_checks=0

# Backend health
echo -e "\n${BLUE}Backend Services:${NC}"
if curl -s http://localhost:5000/api/v1/status > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Backend API responding${NC}"
    
    # Get detailed status
    status_response=$(curl -s http://localhost:5000/api/v1/status)
    echo "  Status: $status_response"
else
    echo -e "${RED}✗ Backend API not responding${NC}"
    ((failed_checks++))
fi

# Frontend health
echo -e "\n${BLUE}Frontend Services:${NC}"
if curl -s http://localhost:5173 > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Frontend responding${NC}"
else
    echo -e "${RED}✗ Frontend not responding${NC}"
    ((failed_checks++))
fi

# Database health
echo -e "\n${BLUE}Database Services:${NC}"
if command -v psql &> /dev/null; then
    if psql "postgresql://postgres:amuktha@localhost/lokdarpan_db" -c "SELECT 1;" &> /dev/null; then
        echo -e "${GREEN}✓ PostgreSQL connection working${NC}"
        
        # Get record counts
        post_count=$(psql "postgresql://postgres:amuktha@localhost/lokdarpan_db" -t -c "SELECT count(*) FROM post;" 2>/dev/null | xargs)
        epaper_count=$(psql "postgresql://postgres:amuktha@localhost/lokdarpan_db" -t -c "SELECT count(*) FROM epaper;" 2>/dev/null | xargs)
        echo "  Posts: $post_count | Epapers: $epaper_count"
    else
        echo -e "${YELLOW}⚠ PostgreSQL connection failed${NC}"
        ((failed_checks++))
    fi
else
    echo -e "${YELLOW}⚠ psql not available for database testing${NC}"
fi

# Redis health
echo -e "\n${BLUE}Cache Services:${NC}"
if command -v redis-cli &> /dev/null; then
    if redis-cli ping &> /dev/null; then
        echo -e "${GREEN}✓ Redis responding${NC}"
        
        # Get Redis info
        redis_memory=$(redis-cli info memory | grep used_memory_human | cut -d: -f2 | tr -d '\r')
        echo "  Memory usage: $redis_memory"
    else
        echo -e "${YELLOW}⚠ Redis not responding${NC}"
        ((failed_checks++))
    fi
else
    echo -e "${YELLOW}⚠ redis-cli not available for cache testing${NC}"
fi

# Process status
echo -e "\n${BLUE}Process Status:${NC}"
if [ -f "logs/backend.pid" ]; then
    backend_pid=$(cat logs/backend.pid)
    if ps -p $backend_pid > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Backend process running (PID: $backend_pid)${NC}"
    else
        echo -e "${RED}✗ Backend process not found${NC}"
        ((failed_checks++))
    fi
else
    echo -e "${YELLOW}⚠ Backend PID file not found${NC}"
fi

if [ -f "logs/frontend.pid" ]; then
    frontend_pid=$(cat logs/frontend.pid)
    if ps -p $frontend_pid > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Frontend process running (PID: $frontend_pid)${NC}"
    else
        echo -e "${RED}✗ Frontend process not found${NC}"
        ((failed_checks++))
    fi
else
    echo -e "${YELLOW}⚠ Frontend PID file not found${NC}"
fi

# Test key API endpoints
echo -e "\n${BLUE}API Endpoint Tests:${NC}"
endpoints=(
    "/api/v1/status:System Status"
    "/api/v1/trends?ward=All&days=7:Trends API"
    "/api/v1/posts?city=Jubilee Hills:Posts API"
    "/api/v1/geojson:Ward Boundaries"
)

for endpoint in "${endpoints[@]}"; do
    url=${endpoint%:*}
    name=${endpoint#*:}
    if curl -s -f "http://localhost:5000$url" > /dev/null 2>&1; then
        echo -e "${GREEN}✓ $name${NC}"
    else
        echo -e "${RED}✗ $name${NC}"
        ((failed_checks++))
    fi
done

# System resources
echo -e "\n${BLUE}System Resources:${NC}"

# Memory usage
if command -v free &> /dev/null; then
    memory_info=$(free -h | grep Mem)
    echo "  Memory: $memory_info"
else
    echo -e "${YELLOW}⚠ Memory info not available${NC}"
fi

# Disk usage
df_info=$(df -h . 2>/dev/null | tail -1)
echo "  Disk: $df_info"

# Load average
if [ -f /proc/loadavg ]; then
    load_avg=$(cat /proc/loadavg | cut -d' ' -f1-3)
    echo "  Load: $load_avg"
elif command -v uptime &> /dev/null; then
    load_avg=$(uptime | grep -o 'load average.*' | cut -d' ' -f3-5)
    echo "  Load: $load_avg"
fi

# Summary
echo -e "\n${BLUE}=================================="
if [ $failed_checks -eq 0 ]; then
    echo -e "${GREEN}✅ All health checks passed!${NC}"
    echo -e "${GREEN}LokDarpan is healthy and ready for use${NC}"
    exit 0
else
    echo -e "${YELLOW}⚠ $failed_checks issue(s) detected${NC}"
    echo -e "${YELLOW}Review the issues above and check logs if needed${NC}"
    exit 1
fi