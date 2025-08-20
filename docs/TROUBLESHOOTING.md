# LokDarpan Troubleshooting Guide

## Overview

This comprehensive troubleshooting guide covers common issues, error codes, and resolution steps for LokDarpan Phase 3, including the Political Strategist system.

## Quick Diagnostics

### System Health Check

```bash
#!/bin/bash
# Quick system health check script

echo "=== LokDarpan System Health Check ==="
echo "Timestamp: $(date)"
echo

# 1. Service Status
echo "1. Service Status:"
systemctl is-active --quiet lokdarpan-api && echo "✅ API Service: Running" || echo "❌ API Service: Failed"
systemctl is-active --quiet lokdarpan-worker && echo "✅ Celery Worker: Running" || echo "❌ Celery Worker: Failed"
systemctl is-active --quiet lokdarpan-beat && echo "✅ Celery Beat: Running" || echo "❌ Celery Beat: Failed"
systemctl is-active --quiet postgresql && echo "✅ PostgreSQL: Running" || echo "❌ PostgreSQL: Failed"
systemctl is-active --quiet redis-server && echo "✅ Redis: Running" || echo "❌ Redis: Failed"
systemctl is-active --quiet nginx && echo "✅ Nginx: Running" || echo "❌ Nginx: Failed"

# 2. Database Connectivity
echo -e "\n2. Database Connectivity:"
if sudo -u lokdarpan psql "$DATABASE_URL" -c "SELECT 1;" >/dev/null 2>&1; then
    echo "✅ Database: Connected"
else
    echo "❌ Database: Connection Failed"
fi

# 3. Redis Connectivity
echo -e "\n3. Redis Connectivity:"
if redis-cli ping >/dev/null 2>&1; then
    echo "✅ Redis: Connected"
else
    echo "❌ Redis: Connection Failed"
fi

# 4. API Health
echo -e "\n4. API Health:"
if curl -s -f http://localhost:8000/api/v1/health >/dev/null 2>&1; then
    echo "✅ API: Healthy"
else
    echo "❌ API: Unhealthy"
fi

# 5. Strategist System
echo -e "\n5. Political Strategist:"
if curl -s -f http://localhost:8000/api/v1/strategist/status >/dev/null 2>&1; then
    echo "✅ Strategist: Available"
else
    echo "❌ Strategist: Unavailable"
fi

# 6. Resource Usage
echo -e "\n6. Resource Usage:"
echo "Memory: $(free -h | grep 'Mem:' | awk '{print $3 "/" $2}')"
echo "Disk: $(df -h / | tail -1 | awk '{print $3 "/" $2 " (" $5 " used)"}')"
echo "Load: $(uptime | awk -F'load average:' '{print $2}')"

echo -e "\n=== End Health Check ==="
```

## Common Issues by Category

### 1. Application Startup Issues

#### Issue: Flask App Won't Start

**Symptoms**:
- `ImportError: cannot import name 'strategist'`
- `ModuleNotFoundError: No module named 'app'`
- Service fails to start

**Diagnosis**:
```bash
# Check service logs
sudo journalctl -u lokdarpan-api -f --no-pager

# Verify Python environment
sudo -u lokdarpan /opt/lokdarpan/backend/venv/bin/python -c "import app; print('App import OK')"

# Check environment variables
sudo -u lokdarpan printenv | grep -E "(DATABASE_URL|REDIS_URL|SECRET_KEY)"
```

**Resolution**:
```bash
# Reinstall dependencies
cd /opt/lokdarpan/backend
sudo -u lokdarpan ./venv/bin/pip install -r requirements.txt

# Apply database migrations
sudo -u lokdarpan ./venv/bin/flask db upgrade

# Restart services
sudo systemctl restart lokdarpan-api lokdarpan-worker
```

#### Issue: Port Already in Use

**Symptoms**:
- `Address already in use`
- Service fails to bind to port

**Diagnosis**:
```bash
# Check what's using the port
sudo lsof -i :8000
sudo netstat -tulpn | grep :8000
```

**Resolution**:
```bash
# Kill process using the port
sudo kill -9 $(sudo lsof -t -i:8000)

# Or change port in configuration
sudo systemctl edit lokdarpan-api
# Add: [Service]
#      Environment="PORT=8001"
```

### 2. Database Issues

#### Issue: Database Connection Failed

**Symptoms**:
- `psql: FATAL: database "lokdarpan_production" does not exist`
- `Connection refused`
- `Authentication failed`

**Diagnosis**:
```bash
# Test direct connection
psql "$DATABASE_URL"

# Check PostgreSQL status
sudo systemctl status postgresql
sudo journalctl -u postgresql -f

# Verify database exists
sudo -u postgres psql -l | grep lokdarpan
```

**Resolution**:
```bash
# Create database if missing
sudo -u postgres createdb lokdarpan_production

# Reset user permissions
sudo -u postgres psql << EOF
DROP USER IF EXISTS lokdarpan;
CREATE USER lokdarpan WITH PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE lokdarpan_production TO lokdarpan;
EOF

# Apply migrations
cd /opt/lokdarpan/backend
sudo -u lokdarpan ./venv/bin/flask db upgrade
```

#### Issue: Alembic Multiple Heads

**Symptoms**:
- `Multiple heads detected`
- Migration fails

**Diagnosis**:
```bash
cd /opt/lokdarpan/backend
sudo -u lokdarpan ./venv/bin/flask db heads
sudo -u lokdarpan ./venv/bin/flask db history
```

**Resolution**:
```bash
# Merge conflicting heads
sudo -u lokdarpan ./venv/bin/flask db merge -m "merge heads" <head1> <head2>
sudo -u lokdarpan ./venv/bin/flask db upgrade
```

### 3. Political Strategist Issues

#### Issue: AI Service Unavailable (STRATEGIST_001)

**Symptoms**:
- API returns `AI service unavailable`
- Strategist endpoints return 503
- No AI responses generated

**Diagnosis**:
```bash
# Check API keys
echo "Gemini Key: ${GEMINI_API_KEY:0:10}..."
echo "Perplexity Key: ${PERPLEXITY_API_KEY:0:10}..."

# Test Gemini API directly
curl -H "Authorization: Bearer $GEMINI_API_KEY" \
  "https://generativelanguage.googleapis.com/v1/models"

# Check strategist logs
sudo journalctl -u lokdarpan-api | grep -i strategist
```

**Resolution**:
```bash
# Verify API keys are set correctly
sudo -u lokdarpan grep -E "GEMINI|PERPLEXITY" /opt/lokdarpan/backend/.env

# Test API connectivity
curl -f https://generativelanguage.googleapis.com/v1/models \
  -H "Authorization: Bearer $GEMINI_API_KEY"

# Restart services
sudo systemctl restart lokdarpan-api

# Check strategist status
curl -s http://localhost:8000/api/v1/strategist/status | jq
```

#### Issue: Analysis Timeout (STRATEGIST_002)

**Symptoms**:
- Requests timeout after 30+ seconds
- Browser shows loading indefinitely
- 504 Gateway Timeout errors

**Diagnosis**:
```bash
# Check system resources
top -b -n1 | head -20
free -h
df -h

# Monitor active requests
curl -s http://localhost:8000/api/v1/strategist/status | jq '.active_analyses'

# Check network latency to AI services
ping -c 5 generativelanguage.googleapis.com
```

**Resolution**:
```bash
# Increase timeout in configuration
sudo -u lokdarpan sed -i 's/AI_TIMEOUT_SECONDS=30/AI_TIMEOUT_SECONDS=60/' \
  /opt/lokdarpan/backend/.env

# Optimize system resources
sudo systemctl restart lokdarpan-worker

# Clear stuck analyses
redis-cli DEL "strategist:active:*"

# Restart API service
sudo systemctl restart lokdarpan-api
```

#### Issue: SSE Streaming Problems (STRATEGIST_008)

**Symptoms**:
- Real-time updates not working
- Browser shows connection errors
- Events not reaching frontend

**Diagnosis**:
```bash
# Test SSE endpoint directly
curl -N -H "Accept: text/event-stream" \
  "http://localhost:8000/api/v1/strategist/feed?ward=Jubilee%20Hills"

# Check Nginx configuration
sudo nginx -t
sudo nginx -s reload

# Monitor SSE connections
netstat -an | grep :8000 | grep ESTABLISHED
```

**Resolution**:
```bash
# Update Nginx for SSE support
sudo tee /etc/nginx/conf.d/sse.conf << EOF
location /api/v1/strategist/feed {
    proxy_pass http://localhost:8000;
    proxy_set_header Connection '';
    proxy_http_version 1.1;
    proxy_buffering off;
    proxy_cache off;
    proxy_read_timeout 24h;
}
EOF

sudo systemctl reload nginx

# Restart API service
sudo systemctl restart lokdarpan-api
```

### 4. Performance Issues

#### Issue: High Memory Usage

**Symptoms**:
- System running out of memory
- Services getting killed by OOM killer
- Slow response times

**Diagnosis**:
```bash
# Check memory usage by service
sudo systemctl status lokdarpan-api | grep Memory
sudo systemctl status lokdarpan-worker | grep Memory

# Monitor memory over time
watch -n 5 'free -h && echo && ps aux --sort=-%mem | head -10'

# Check for memory leaks
sudo journalctl | grep -i "killed process"
```

**Resolution**:
```bash
# Restart services to free memory
sudo systemctl restart lokdarpan-worker
sudo systemctl restart lokdarpan-api

# Optimize Celery worker settings
sudo systemctl edit lokdarpan-worker
# Add:
# [Service]
# Environment="CELERY_WORKER_MAX_MEMORY_PER_CHILD=500000"

# Clear Redis cache if too large
redis-cli info memory
redis-cli FLUSHDB

# Add memory limits to systemd services
sudo systemctl edit lokdarpan-api
# Add:
# [Service]
# MemoryMax=2G
# MemoryHigh=1.5G
```

#### Issue: High CPU Usage

**Symptoms**:
- System load consistently high
- Slow API responses
- Services timing out

**Diagnosis**:
```bash
# Check CPU usage by process
top -c -b -n1 | head -20
htop

# Monitor specific services
pidstat -p $(pgrep -f lokdarpan) 1 5

# Check Celery worker utilization
sudo -u lokdarpan /opt/lokdarpan/backend/venv/bin/celery \
  -A celery_worker.celery inspect stats
```

**Resolution**:
```bash
# Reduce Celery worker concurrency
sudo systemctl edit lokdarpan-worker
# Add:
# [Service]
# Environment="CELERY_WORKER_CONCURRENCY=2"

# Optimize database queries
sudo -u postgres psql lokdarpan_production << EOF
SELECT query, mean_exec_time, calls 
FROM pg_stat_statements 
ORDER BY mean_exec_time DESC LIMIT 10;
EOF

# Add CPU limits
sudo systemctl edit lokdarpan-api
# Add:
# [Service]
# CPUQuota=200%
```

### 5. Network and Connectivity Issues

#### Issue: CORS Errors

**Symptoms**:
- Browser console shows CORS errors
- API requests failing from frontend
- `Access-Control-Allow-Origin` errors

**Diagnosis**:
```bash
# Check current CORS configuration
sudo -u lokdarpan grep CORS /opt/lokdarpan/backend/.env

# Test from browser network tab
# Check response headers
```

**Resolution**:
```bash
# Update CORS origins
sudo -u lokdarpan sed -i 's|CORS_ORIGINS=.*|CORS_ORIGINS=https://lokdarpan.com,https://www.lokdarpan.com|' \
  /opt/lokdarpan/backend/.env

# For development, allow localhost ports
sudo -u lokdarpan sed -i 's|CORS_ORIGINS=.*|CORS_ORIGINS=http://localhost:5173,http://localhost:5174,http://127.0.0.1:5173|' \
  /opt/lokdarpan/backend/.env

sudo systemctl restart lokdarpan-api
```

#### Issue: Rate Limiting Errors (STRATEGIST_004)

**Symptoms**:
- `Rate limit exceeded` errors
- 429 HTTP status codes
- Users blocked from making requests

**Diagnosis**:
```bash
# Check current rate limit status
redis-cli KEYS "rate_limit:*"
redis-cli GET "rate_limit:strategist:user_123"

# Monitor rate limit hits
redis-cli MONITOR | grep rate_limit
```

**Resolution**:
```bash
# Clear specific user's rate limit
redis-cli DEL "rate_limit:strategist:192.168.1.100"

# Clear all rate limits (emergency)
redis-cli DEL $(redis-cli KEYS "rate_limit:*")

# Increase rate limits temporarily
sudo -u lokdarpan sed -i 's/STRATEGIST_RATE_LIMIT=10/STRATEGIST_RATE_LIMIT=20/' \
  /opt/lokdarpan/backend/.env

sudo systemctl restart lokdarpan-api
```

### 6. Frontend Issues

#### Issue: Frontend Build Failures

**Symptoms**:
- `npm run build` fails
- Missing dependencies
- TypeScript errors

**Diagnosis**:
```bash
cd /opt/lokdarpan/frontend

# Check Node.js version
node --version
npm --version

# Check for dependency issues
npm audit
npm outdated
```

**Resolution**:
```bash
# Clean install dependencies
rm -rf node_modules package-lock.json
npm install

# Fix audit issues
npm audit fix

# Build with verbose output
npm run build -- --verbose
```

#### Issue: Environment Variable Problems

**Symptoms**:
- API calls going to wrong URL
- Features not enabled/disabled correctly
- Configuration not loading

**Diagnosis**:
```bash
# Check environment variables in build
cd /opt/lokdarpan/frontend
cat .env.production

# Verify variables are available at runtime
grep -r "VITE_" dist/
```

**Resolution**:
```bash
# Verify all required variables are set
cat << EOF > .env.production
VITE_API_BASE_URL=https://api.lokdarpan.com
VITE_SSE_ENDPOINT=https://api.lokdarpan.com/api/v1/strategist/feed
VITE_STRATEGIST_ENABLED=true
EOF

# Rebuild frontend
npm run build
```

## Error Code Reference

### Backend API Error Codes

| Code | Description | Resolution |
|------|-------------|------------|
| `API_001` | Database connection failed | Check DATABASE_URL, restart PostgreSQL |
| `API_002` | Redis connection failed | Check REDIS_URL, restart Redis |
| `API_003` | Authentication required | Check session/cookies |
| `API_004` | Rate limit exceeded | Clear rate limits or increase limits |
| `API_005` | Invalid request parameters | Validate input parameters |

### Political Strategist Error Codes

| Code | Description | Resolution |
|------|-------------|------------|
| `STRATEGIST_001` | AI service unavailable | Check API keys, test connectivity |
| `STRATEGIST_002` | Analysis timeout | Increase timeout, check resources |
| `STRATEGIST_003` | Invalid ward parameter | Validate ward name format |
| `STRATEGIST_004` | Rate limit exceeded | Clear rate limits |
| `STRATEGIST_005` | Content filtering triggered | Review content, adjust filters |
| `STRATEGIST_006` | Authentication required | Check login status |
| `STRATEGIST_007` | Cache operation failed | Clear cache, restart Redis |
| `STRATEGIST_008` | SSE connection error | Check proxy config, restart services |

### Frontend Error Codes

| Code | Description | Resolution |
|------|-------------|------------|
| `FE_001` | API connection failed | Check VITE_API_BASE_URL |
| `FE_002` | Authentication expired | Clear cookies, re-login |
| `FE_003` | Component render error | Check error boundaries, browser console |
| `FE_004` | Network timeout | Check network connectivity |

## Advanced Debugging

### Log Analysis

```bash
# Centralized log viewing
sudo journalctl -f --no-pager \
  -u lokdarpan-api \
  -u lokdarpan-worker \
  -u lokdarpan-beat

# Filter for specific issues
sudo journalctl -u lokdarpan-api | grep -i "strategist\|error\|exception"

# Export logs for analysis
sudo journalctl -u lokdarpan-api --since "1 hour ago" > /tmp/api-logs.txt
```

### Database Debugging

```bash
# Monitor active queries
sudo -u postgres psql lokdarpan_production << EOF
SELECT pid, now() - pg_stat_activity.query_start AS duration, query 
FROM pg_stat_activity 
WHERE (now() - pg_stat_activity.query_start) > interval '5 minutes';
EOF

# Check database locks
sudo -u postgres psql lokdarpan_production << EOF
SELECT blocked_locks.pid AS blocked_pid,
       blocked_activity.usename AS blocked_user,
       blocking_locks.pid AS blocking_pid,
       blocking_activity.usename AS blocking_user,
       blocked_activity.query AS blocked_statement,
       blocking_activity.query AS current_statement_in_blocking_process
FROM pg_catalog.pg_locks blocked_locks
JOIN pg_catalog.pg_stat_activity blocked_activity ON blocked_activity.pid = blocked_locks.pid
JOIN pg_catalog.pg_locks blocking_locks ON blocking_locks.locktype = blocked_locks.locktype
JOIN pg_catalog.pg_stat_activity blocking_activity ON blocking_activity.pid = blocking_locks.pid
WHERE NOT blocked_locks.GRANTED;
EOF
```

### Performance Profiling

```bash
# CPU profiling
sudo perf record -g -p $(pgrep -f lokdarpan-api) -- sleep 30
sudo perf report

# Memory profiling with py-spy (install if needed)
sudo py-spy record -o profile.svg -d 30 -p $(pgrep -f lokdarpan-api)

# API response time monitoring
curl -w "@curl-format.txt" -o /dev/null -s "http://localhost:8000/api/v1/strategist/status"

# Create curl-format.txt:
cat << EOF > curl-format.txt
     time_namelookup:  %{time_namelookup}\n
        time_connect:  %{time_connect}\n
     time_appconnect:  %{time_appconnect}\n
    time_pretransfer:  %{time_pretransfer}\n
       time_redirect:  %{time_redirect}\n
  time_starttransfer:  %{time_starttransfer}\n
                     ----------\n
          time_total:  %{time_total}\n
EOF
```

## Emergency Procedures

### Complete System Recovery

```bash
#!/bin/bash
# Emergency recovery script

echo "Starting emergency recovery..."

# 1. Stop all services
sudo systemctl stop lokdarpan-api lokdarpan-worker lokdarpan-beat nginx

# 2. Clear caches
redis-cli FLUSHALL

# 3. Reset permissions
sudo chown -R lokdarpan:lokdarpan /opt/lokdarpan

# 4. Restart infrastructure services
sudo systemctl restart postgresql redis-server

# 5. Apply database migrations
cd /opt/lokdarpan/backend
sudo -u lokdarpan ./venv/bin/flask db upgrade

# 6. Start application services
sudo systemctl start lokdarpan-api lokdarpan-worker lokdarpan-beat

# 7. Start web server
sudo systemctl start nginx

# 8. Verify health
sleep 10
curl -f http://localhost:8000/api/v1/health

echo "Recovery complete. Check logs for any remaining issues."
```

### Backup and Restore

```bash
# Emergency backup
sudo -u lokdarpan pg_dump "$DATABASE_URL" | gzip > emergency_backup_$(date +%Y%m%d_%H%M%S).sql.gz

# Restore from backup
gunzip -c backup_file.sql.gz | sudo -u lokdarpan psql "$DATABASE_URL"
```

## Monitoring and Alerting

### Set Up Basic Monitoring

```bash
# Install monitoring tools
sudo apt install -y htop iotop sysstat

# Set up log rotation
sudo tee /etc/logrotate.d/lokdarpan << EOF
/var/log/lokdarpan/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 lokdarpan lokdarpan
    postrotate
        systemctl reload lokdarpan-api
    endscript
}
EOF

# Create monitoring script
sudo tee /opt/lokdarpan/scripts/monitor.sh << 'EOF'
#!/bin/bash
# Basic monitoring script

# Check critical services
services=("lokdarpan-api" "lokdarpan-worker" "postgresql" "redis-server" "nginx")
for service in "${services[@]}"; do
    if ! systemctl is-active --quiet "$service"; then
        echo "ALERT: $service is not running" | mail -s "Service Alert" admin@lokdarpan.com
    fi
done

# Check disk space
disk_usage=$(df / | tail -1 | awk '{print $5}' | sed 's/%//')
if [ $disk_usage -gt 85 ]; then
    echo "ALERT: Disk usage is ${disk_usage}%" | mail -s "Disk Alert" admin@lokdarpan.com
fi

# Check memory usage
mem_usage=$(free | grep Mem | awk '{printf "%.0f", $3/$2 * 100.0}')
if [ $mem_usage -gt 85 ]; then
    echo "ALERT: Memory usage is ${mem_usage}%" | mail -s "Memory Alert" admin@lokdarpan.com
fi
EOF

chmod +x /opt/lokdarpan/scripts/monitor.sh

# Add to crontab
(crontab -l 2>/dev/null; echo "*/5 * * * * /opt/lokdarpan/scripts/monitor.sh") | crontab -
```

## Contact and Escalation

### Support Contacts

- **Development Team**: dev@lokdarpan.com
- **System Administration**: sysadmin@lokdarpan.com
- **Emergency Contact**: +91-XXX-XXX-XXXX

### Escalation Path

1. **Level 1**: Check this troubleshooting guide
2. **Level 2**: Review application logs and system metrics
3. **Level 3**: Contact development team with logs and error details
4. **Level 4**: Emergency escalation for critical system failures

### Information to Collect Before Escalating

```bash
# Collect system information
cat << EOF > /tmp/system-info.txt
System Information Report - $(date)
====================================

Hostname: $(hostname)
OS: $(cat /etc/os-release | grep PRETTY_NAME)
Uptime: $(uptime)

Service Status:
$(systemctl status lokdarpan-api --no-pager)

Recent Logs (last 100 lines):
$(sudo journalctl -u lokdarpan-api --no-pager -n 100)

System Resources:
$(free -h)
$(df -h)

Network Status:
$(ss -tulpn | grep :8000)

Environment:
$(sudo -u lokdarpan printenv | grep -E "(DATABASE|REDIS|GEMINI|PERPLEXITY)")
EOF

echo "System information collected in /tmp/system-info.txt"
```

---

**Note**: This troubleshooting guide should be updated regularly as new issues are discovered and resolved. Keep it synchronized with system changes and deployment updates.