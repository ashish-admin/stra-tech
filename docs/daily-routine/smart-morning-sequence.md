# Smart Morning Command Sequence for LokDarpan

**Purpose**: 5-minute project state verification sequence to maintain "integration status awareness" during rapid development phases.

**Based on**: August 24, 2025 brainstorming session insight - "Speed of development inversely correlates with state awareness"

---

## 📋 **5-Command Morning Sequence**

### **Command 1: System Health Check**
```bash
# Backend health verification
curl -s http://localhost:5000/api/v1/status | jq '.' || echo "❌ Backend not responding"

# Frontend development server check
curl -s http://localhost:5173 > /dev/null && echo "✅ Frontend responsive" || echo "❌ Frontend not responding"

# Database connectivity
psql "$DATABASE_URL" -c "SELECT count(*) as total_posts FROM post;" 2>/dev/null || echo "❌ Database connection failed"
```

### **Command 2: Feature Integration Status**
```bash
# Political Strategist operational check
curl -s "http://localhost:5000/api/v1/strategist/Jubilee%20Hills?depth=quick" | jq '.status' || echo "❌ Strategist not operational"

# SSE streaming health
curl -N -m 5 -H "Accept: text/event-stream" "http://localhost:5000/api/v1/strategist/feed?ward=All" | head -3 || echo "❌ SSE streaming issues"

# Critical API endpoints verification
for endpoint in "/api/v1/trends" "/api/v1/pulse/All" "/api/v1/competitive-analysis"; do
    curl -s "http://localhost:5000${endpoint}" > /dev/null && echo "✅ ${endpoint}" || echo "❌ ${endpoint}"
done
```

### **Command 3: Component Accessibility Verification**
```bash
# Check if recent components are UI-accessible
cd frontend && npm run build 2>/dev/null | grep -E "(error|failed|Error)" && echo "❌ Build issues detected" || echo "✅ Frontend builds successfully"

# Validate critical routes load
echo "📍 Critical UI components to verify manually:"
echo "  - Dashboard: http://localhost:5173"
echo "  - Ward selection dropdown functional"
echo "  - All 5 tabs load without errors"
echo "  - Strategic analysis triggers successfully"
```

### **Command 4: Recent Development Impact**
```bash
# Show recent commits and their scope
echo "📊 Recent development activity:"
git log --oneline -5 --pretty=format:"%h %s" | sed 's/^/  /'

# Check for untracked files that might indicate new features
echo "📁 Untracked files (potential new features):"
git status --porcelain | grep "^??" | head -5 | sed 's/^/  /'

# Modified files requiring attention
git status --porcelain | grep "^.M" | head -3 | sed 's/^/  Modified: /'
```

### **Command 5: Performance and Resource Check**
```bash
# Check system resource usage
echo "💻 System resources:"
echo "  Memory: $(free -h | grep Mem | awk '{print $3 "/" $2}')"
echo "  Disk: $(df -h . | tail -1 | awk '{print $5 " used"}')"

# Check for long-running processes that might need attention
echo "⚡ Development processes:"
ps aux | grep -E "(flask|npm|node)" | grep -v grep | wc -l | sed 's/^/  Active processes: /'

# Quick database size check
psql "$DATABASE_URL" -c "SELECT pg_size_pretty(pg_database_size('lokdarpan_db'));" 2>/dev/null | tail -1 | sed 's/^/  DB size: /' || echo "  DB size: Unknown"
```

---

## 🚀 **Quick Execution Script**

Save as `scripts/morning-check.sh`:

```bash
#!/bin/bash
echo "🌅 LokDarpan Morning Health Check - $(date)"
echo "================================================"

# Set environment
export DATABASE_URL="postgresql://postgres:amuktha@localhost/lokdarpan_db"
cd /mnt/c/Users/amukt/Projects/LokDarpan

echo "1️⃣ System Health..."
# Command 1 content here

echo -e "\n2️⃣ Feature Integration..."  
# Command 2 content here

echo -e "\n3️⃣ UI Accessibility..."
# Command 3 content here

echo -e "\n4️⃣ Recent Changes..."
# Command 4 content here

echo -e "\n5️⃣ Resources..."
# Command 5 content here

echo -e "\n✅ Morning check complete! Review any ❌ items above."
```

---

## 📈 **Expected Outcomes**

**Daily Intelligence Gathered:**
- System operational status (30 seconds)
- Feature integration completeness (45 seconds)
- UI accessibility confirmation (30 seconds)
- Development momentum awareness (60 seconds)
- Resource constraint awareness (15 seconds)

**Key Benefits:**
- Prevents "floating" component discovery lag
- Early detection of integration gaps
- Maintains development velocity awareness
- Provides structured project state context
- Reduces cognitive load for daily planning

**Success Metrics:**
- ✅ Zero unexpected integration failures
- ✅ All features built are UI-accessible
- ✅ Daily development priorities clear
- ✅ Resource constraints identified early
- ✅ Consistent project state awareness

---

## 🔧 **Customization Notes**

**Adaptation for Different Phases:**
- **Active Development**: Focus on integration verification
- **Bug Fixing**: Emphasize error detection and system health
- **Performance Optimization**: Add performance metrics
- **Pre-Production**: Include security and deployment checks

**Integration with Claude Code:**
- Use `/analyze` command for complex issues discovered
- Use `/troubleshoot` for any ❌ items found
- Use `/improve` for systematic optimization opportunities
- Document findings in Daily Project Snapshot

This morning sequence solves the core challenge: "integration status awareness" during rapid development phases.