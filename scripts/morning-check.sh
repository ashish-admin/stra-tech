#!/bin/bash

# LokDarpan Smart Morning Command Sequence
# Purpose: 5-minute project state verification for rapid development awareness
# Based on: August 24, 2025 brainstorming session insights

echo "🌅 LokDarpan Morning Health Check - $(date)"
echo "================================================"

# Set environment
export DATABASE_URL="postgresql://postgres:amuktha@localhost/lokdarpan_db"
cd /mnt/c/Users/amukt/Projects/LokDarpan

echo "1️⃣ System Health Check..."
echo "----------------------------------------"

# Backend health verification
echo "🔧 Backend API:"
if curl -s http://localhost:5000/api/v1/status > /dev/null 2>&1; then
    echo "  ✅ Backend responding at :5000"
else
    echo "  ❌ Backend not responding - Start with: cd backend && flask run"
fi

# Frontend development server check
echo "🎨 Frontend Server:"
if curl -s http://localhost:5173 > /dev/null 2>&1; then
    echo "  ✅ Frontend responsive at :5173"
else
    echo "  ❌ Frontend not responding - Start with: cd frontend && npm run dev"
fi

# Database connectivity
echo "💾 Database Connection:"
if psql "$DATABASE_URL" -c "SELECT count(*) as total_posts FROM post;" > /dev/null 2>&1; then
    POST_COUNT=$(psql "$DATABASE_URL" -c "SELECT count(*) FROM post;" -t 2>/dev/null | tr -d ' ')
    echo "  ✅ Database connected ($POST_COUNT posts)"
else
    echo "  ❌ Database connection failed - Check PostgreSQL service"
fi

echo ""
echo "2️⃣ Feature Integration Status..."
echo "----------------------------------------"

# Political Strategist operational check
echo "🧠 Strategic AI:"
if curl -s "http://localhost:5000/api/v1/strategist/status" > /dev/null 2>&1; then
    echo "  ✅ Political Strategist operational"
else
    echo "  ❌ Strategic AI not responding - Check AI services"
fi

# SSE streaming health
echo "📡 Real-time Streaming:"
if timeout 3 curl -s -N -H "Accept: text/event-stream" "http://localhost:5000/api/v1/strategist/feed?ward=All" > /dev/null 2>&1; then
    echo "  ✅ SSE streaming functional"
else
    echo "  ⚠️  SSE streaming check timed out (may be normal)"
fi

# Critical API endpoints verification
echo "🔌 Critical Endpoints:"
for endpoint in "/api/v1/trends" "/api/v1/pulse/All" "/api/v1/competitive-analysis"; do
    if curl -s "http://localhost:5000${endpoint}" > /dev/null 2>&1; then
        echo "  ✅ ${endpoint}"
    else
        echo "  ❌ ${endpoint}"
    fi
done

echo ""
echo "3️⃣ Component UI Accessibility..."
echo "----------------------------------------"

# Check if frontend builds successfully
echo "🏗️  Build Health:"
cd frontend
if npm run build > /dev/null 2>&1; then
    echo "  ✅ Frontend builds without errors"
else
    echo "  ❌ Build issues detected - Run 'npm run build' for details"
fi
cd ..

# Manual verification prompts
echo "📱 UI Components (verify manually):"
echo "  → Dashboard: http://localhost:5173"
echo "  → Check: Ward selection dropdown functions"
echo "  → Check: All 5 dashboard tabs load"
echo "  → Check: Strategic analysis triggers successfully"
echo "  → Check: Error boundaries protect against failures"

echo ""
echo "4️⃣ Recent Development Activity..."
echo "----------------------------------------"

# Recent commits
echo "📊 Recent Development:"
git log --oneline -5 --pretty=format:"  %h %s" 2>/dev/null || echo "  No git history available"

# Untracked files
echo "📁 Untracked Files:"
UNTRACKED_COUNT=$(git status --porcelain 2>/dev/null | grep "^??" | wc -l)
if [ "$UNTRACKED_COUNT" -gt 0 ]; then
    echo "  ⚠️  $UNTRACKED_COUNT untracked files (potential new features)"
    git status --porcelain | grep "^??" | head -3 | sed 's/^??/    New:/'
else
    echo "  ✅ No untracked files"
fi

# Modified files
echo "🔧 Modified Files:"
MODIFIED_COUNT=$(git status --porcelain 2>/dev/null | grep "^.M" | wc -l)
if [ "$MODIFIED_COUNT" -gt 0 ]; then
    echo "  ⚠️  $MODIFIED_COUNT modified files require attention"
    git status --porcelain | grep "^.M" | head -3 | sed 's/^.M/    Modified:/'
else
    echo "  ✅ No uncommitted modifications"
fi

echo ""
echo "5️⃣ System Resources & Performance..."
echo "----------------------------------------"

# System resources
echo "💻 System Resources:"
if command -v free &> /dev/null; then
    MEMORY=$(free -h 2>/dev/null | grep Mem | awk '{print $3 "/" $2}' 2>/dev/null)
    echo "  Memory: ${MEMORY:-Unknown}"
else
    echo "  Memory: Check not available on this system"
fi

DISK=$(df -h . 2>/dev/null | tail -1 | awk '{print $5 " used"}' 2>/dev/null)
echo "  Disk: ${DISK:-Unknown}"

# Development processes
echo "⚡ Active Processes:"
PROCESS_COUNT=$(ps aux 2>/dev/null | grep -E "(flask|npm|node)" | grep -v grep | wc -l)
echo "  Dev processes running: $PROCESS_COUNT"

# Database size
echo "💾 Database Size:"
if psql "$DATABASE_URL" -c "SELECT pg_size_pretty(pg_database_size('lokdarpan_db'));" > /dev/null 2>&1; then
    DB_SIZE=$(psql "$DATABASE_URL" -c "SELECT pg_size_pretty(pg_database_size('lokdarpan_db'));" -t 2>/dev/null | tr -d ' ')
    echo "  Database size: $DB_SIZE"
else
    echo "  Database size: Unable to determine"
fi

echo ""
echo "✅ Morning Health Check Complete!"
echo "================================================"
echo "⏱️  Review any ❌ items above before starting development"
echo "📋 Use this information to fill your Daily Project Snapshot"
echo "🚀 Ready for productive development session!"

# Quick integration gap check
echo ""
echo "🔍 Quick Integration Gap Check:"
echo "  Run: docs/daily-routine/integration-audit-checklist.md"
echo "  Next: Create daily snapshot from template"