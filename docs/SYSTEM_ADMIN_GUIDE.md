# LokDarpan System Administrator Guide
*Production Operations Manual for Political Intelligence Platform*

## 🎯 Overview

This guide covers production operations, monitoring, troubleshooting, and maintenance procedures for the LokDarpan political intelligence platform. Designed for system administrators managing production deployments.

## 📋 Table of Contents

1. [**System Architecture**](#system-architecture)
2. [**Daily Operations**](#daily-operations)
3. [**Monitoring & Alerting**](#monitoring--alerting)
4. [**Backup & Recovery**](#backup--recovery)
5. [**Security Management**](#security-management)
6. [**Performance Optimization**](#performance-optimization)
7. [**Troubleshooting**](#troubleshooting)
8. [**Emergency Procedures**](#emergency-procedures)

## 🏗️ System Architecture

### **Production Infrastructure**
```
┌─────────────────────────────────────────────────────────┐
│                    GCP e2-standard-2                    │
│                   2 vCPU, 8GB RAM, 50GB SSD            │
├─────────────────────────────────────────────────────────┤
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────────┐   │
│  │   Traefik   │ │ PostgreSQL  │ │      Redis      │   │
│  │  (Gateway)  │ │    (DB)     │ │    (Cache)      │   │
│  └─────────────┘ └─────────────┘ └─────────────────┘   │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────────┐   │
│  │   Backend   │ │  Frontend   │ │     Celery      │   │
│  │   (Flask)   │ │   (React)   │ │   (Workers)     │   │
│  └─────────────┘ └─────────────┘ └─────────────────┘   │
│  ┌─────────────────────────────────────────────────┐   │
│  │         Monitoring Stack                        │   │
│  │      Prometheus + Grafana                       │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

### **Service Dependencies**
```yaml
Service Hierarchy:
├── Traefik (Entry Point)
├── PostgreSQL (Database)
├── Redis (Cache & Queue)
├── Backend API (Flask + Gunicorn)
├── Frontend (React + Nginx)
├── Celery Workers (Background Tasks)
├── Prometheus (Metrics Collection)
└── Grafana (Visualization)
```

### **Network Configuration**
- **HTTP/HTTPS**: Ports 80/443 (Traefik)
- **SSH**: Port 22 (Restricted)
- **PostgreSQL**: Port 5432 (Localhost only)
- **Redis**: Port 6379 (Localhost only)
- **Monitoring**: Ports 9090/3000 (Internal)

## 🔄 Daily Operations

### **Morning Health Check Routine**
```bash
#!/bin/bash
# Daily health check script

echo "=== LokDarpan Daily Health Check ==="
date

# 1. System health
./scripts/health-check.sh

# 2. Resource usage
echo "=== Resource Usage ==="
docker stats --no-stream

# 3. Service status
echo "=== Service Status ==="
docker-compose -f docker-compose.production-enhanced.yml ps

# 4. Database status
echo "=== Database Status ==="
docker-compose -f docker-compose.production-enhanced.yml exec -T postgres pg_isready -U postgres

# 5. Recent alerts
echo "=== Recent Logs (Last 50 lines) ==="
docker-compose -f docker-compose.production-enhanced.yml logs --tail=50 backend | grep ERROR

# 6. Backup status
echo "=== Backup Status ==="
ls -la backups/ | head -5
```

### **Key Performance Indicators (KPIs)**
Monitor these metrics daily:
- **System Uptime**: Target >99.9%
- **API Response Time**: Target <200ms (95th percentile)
- **Database Connections**: Monitor active vs. max
- **Memory Usage**: Keep below 80%
- **Disk Space**: Keep below 80%
- **AI Service Success Rate**: Monitor API calls

### **Daily Maintenance Tasks**
```bash
# 1. Log rotation
docker-compose -f docker-compose.production-enhanced.yml exec backend logrotate /etc/logrotate.d/lokdarpan

# 2. Database maintenance
docker-compose -f docker-compose.production-enhanced.yml exec postgres vacuum analyze;

# 3. Redis memory optimization
docker-compose -f docker-compose.production-enhanced.yml exec redis redis-cli memory doctor

# 4. Clear temporary files
find /tmp -name "*lokdarpan*" -mtime +1 -delete

# 5. Update system packages (weekly)
sudo apt update && sudo apt upgrade -y
```

## 📊 Monitoring & Alerting

### **Monitoring Stack Access**
```bash
# Grafana Dashboard
https://your-domain.com:3000
Username: admin
Password: [from environment variable]

# Prometheus Metrics
https://your-domain.com:9090

# Application Health
https://your-domain.com/api/v1/health/detailed
```

### **Critical Alerts Setup**

#### **1. System-Level Alerts**
```yaml
# High-priority alerts
- name: critical_system_alerts
  rules:
    - alert: HighCPUUsage
      expr: cpu_usage_percent > 80
      for: 5m
      annotations:
        summary: "Critical CPU usage detected"
        
    - alert: HighMemoryUsage
      expr: memory_usage_percent > 85
      for: 3m
      annotations:
        summary: "Critical memory usage"
        
    - alert: DiskSpaceLow
      expr: disk_usage_percent > 90
      for: 1m
      annotations:
        summary: "Disk space critically low"
```

#### **2. Application-Level Alerts**
```yaml
# Application performance alerts
- name: lokdarpan_app_alerts
  rules:
    - alert: BackendAPIDown
      expr: up{job="lokdarpan-backend"} == 0
      for: 30s
      annotations:
        summary: "Backend API is down"
        
    - alert: DatabaseConnectionFailure
      expr: postgresql_active_connections == 0
      for: 1m
      annotations:
        summary: "Database connection lost"
        
    - alert: AIServiceFailure
      expr: increase(ai_service_errors_total[5m]) > 10
      for: 2m
      annotations:
        summary: "AI services experiencing failures"
```

#### **3. Political Intelligence Alerts**
```yaml
# Campaign-critical alerts
- name: political_intelligence_alerts
  rules:
    - alert: NewsIngestionStopped
      expr: increase(news_articles_processed_total[30m]) == 0
      for: 15m
      annotations:
        summary: "News ingestion has stopped"
        
    - alert: StrategistAnalysisBacklog
      expr: strategist_pending_queue_size > 50
      for: 10m
      annotations:
        summary: "Political analysis queue backing up"
```

### **Dashboard Configuration**

#### **Main Operations Dashboard**
```json
{
  "dashboard": {
    "title": "LokDarpan Operations",
    "panels": [
      {
        "title": "System Overview",
        "targets": [
          "up{job=~'.*lokdarpan.*'}",
          "rate(http_requests_total[5m])",
          "histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))"
        ]
      },
      {
        "title": "Political Intelligence",
        "targets": [
          "strategist_analyses_completed_total",
          "news_articles_processed_total",
          "ward_data_updates_total"
        ]
      }
    ]
  }
}
```

## 💾 Backup & Recovery

### **Automated Backup Strategy**

#### **Daily Backups**
```bash
#!/bin/bash
# /scripts/backup-daily.sh

BACKUP_DIR="/backups/$(date +%Y%m%d)"
mkdir -p "$BACKUP_DIR"

# 1. Database backup
echo "Backing up PostgreSQL database..."
docker-compose -f docker-compose.production-enhanced.yml exec -T postgres \
  pg_dump -U postgres lokdarpan_db | gzip > "$BACKUP_DIR/database.sql.gz"

# 2. Redis backup
echo "Backing up Redis data..."
docker-compose -f docker-compose.production-enhanced.yml exec -T redis \
  redis-cli save
docker cp lokdarpan-redis:/data/dump.rdb "$BACKUP_DIR/redis.rdb"

# 3. Configuration backup
echo "Backing up configuration..."
cp .env.production-enhanced "$BACKUP_DIR/"
cp docker-compose.production-enhanced.yml "$BACKUP_DIR/"

# 4. Application data
echo "Backing up application data..."
tar -czf "$BACKUP_DIR/app-data.tar.gz" backend/data/ frontend/public/data/

# 5. Upload to GCS (if configured)
if [ -n "$GCS_BACKUP_BUCKET" ]; then
  gsutil -m cp -r "$BACKUP_DIR" "gs://$GCS_BACKUP_BUCKET/daily/"
fi

echo "Backup completed: $BACKUP_DIR"
```

#### **Weekly Full Backup**
```bash
#!/bin/bash
# /scripts/backup-weekly.sh

BACKUP_DIR="/backups/weekly/$(date +%Y-W%U)"
mkdir -p "$BACKUP_DIR"

# Full system backup including volumes
docker run --rm -v lokdarpan_postgres_data:/data -v "$BACKUP_DIR":/backup \
  alpine tar czf /backup/postgres-volume.tar.gz -C /data .

docker run --rm -v lokdarpan_redis_data:/data -v "$BACKUP_DIR":/backup \
  alpine tar czf /backup/redis-volume.tar.gz -C /data .

# System configuration
cp -r /etc/systemd/system/lokdarpan* "$BACKUP_DIR/"
cp -r monitoring/ "$BACKUP_DIR/"

echo "Weekly backup completed: $BACKUP_DIR"
```

### **Recovery Procedures**

#### **Database Recovery**
```bash
#!/bin/bash
# Restore database from backup

BACKUP_FILE="$1"
if [ -z "$BACKUP_FILE" ]; then
  echo "Usage: $0 <backup-file.sql.gz>"
  exit 1
fi

# 1. Stop application
docker-compose -f docker-compose.production-enhanced.yml stop backend celery-worker

# 2. Create database backup (just in case)
docker-compose -f docker-compose.production-enhanced.yml exec -T postgres \
  pg_dump -U postgres lokdarpan_db > "pre-restore-backup-$(date +%Y%m%d-%H%M%S).sql"

# 3. Drop and recreate database
docker-compose -f docker-compose.production-enhanced.yml exec -T postgres \
  psql -U postgres -c "DROP DATABASE IF EXISTS lokdarpan_db;"
docker-compose -f docker-compose.production-enhanced.yml exec -T postgres \
  psql -U postgres -c "CREATE DATABASE lokdarpan_db;"

# 4. Restore from backup
zcat "$BACKUP_FILE" | docker-compose -f docker-compose.production-enhanced.yml exec -T postgres \
  psql -U postgres -d lokdarpan_db

# 5. Restart services
docker-compose -f docker-compose.production-enhanced.yml start backend celery-worker

echo "Database recovery completed"
```

#### **Full System Recovery**
```bash
#!/bin/bash
# Complete system recovery from backup

BACKUP_DATE="$1"
if [ -z "$BACKUP_DATE" ]; then
  echo "Usage: $0 <YYYYMMDD>"
  exit 1
fi

BACKUP_DIR="/backups/$BACKUP_DATE"

# 1. Stop all services
docker-compose -f docker-compose.production-enhanced.yml down

# 2. Restore configuration
cp "$BACKUP_DIR/.env.production-enhanced" .
cp "$BACKUP_DIR/docker-compose.production-enhanced.yml" .

# 3. Restore volumes
docker run --rm -v lokdarpan_postgres_data:/data -v "$BACKUP_DIR":/backup \
  alpine sh -c "cd /data && tar xzf /backup/postgres-volume.tar.gz"

docker run --rm -v lokdarpan_redis_data:/data -v "$BACKUP_DIR":/backup \
  alpine sh -c "cd /data && tar xzf /backup/redis-volume.tar.gz"

# 4. Restart services
docker-compose -f docker-compose.production-enhanced.yml up -d

# 5. Validate recovery
./scripts/validate-deployment.sh

echo "Full system recovery completed"
```

## 🔐 Security Management

### **Security Hardening Checklist**

#### **System-Level Security**
- [ ] **Firewall Configuration**: UFW enabled with restricted ports
- [ ] **SSH Hardening**: Key-based auth, fail2ban configured
- [ ] **System Updates**: Automated security updates enabled
- [ ] **User Management**: Non-root container execution
- [ ] **File Permissions**: Proper ownership and permissions

#### **Application Security**
- [ ] **SSL/TLS**: Let's Encrypt certificates auto-renewal
- [ ] **Authentication**: Session-based with secure cookies
- [ ] **API Security**: Rate limiting and CORS configured
- [ ] **Database Security**: SSL connections and access logging
- [ ] **Secret Management**: Environment variables encrypted

### **Security Monitoring**
```bash
# Daily security checks
#!/bin/bash

# 1. Check for failed login attempts
echo "=== Failed SSH Attempts ==="
grep "Failed password" /var/log/auth.log | tail -10

# 2. Check firewall status
echo "=== Firewall Status ==="
sudo ufw status

# 3. Check SSL certificate expiry
echo "=== SSL Certificate Status ==="
docker-compose -f docker-compose.production-enhanced.yml exec traefik \
  cat /etc/traefik/acme/acme.json | grep -o '"main":"[^"]*"' | head -5

# 4. Check for suspicious API requests
echo "=== API Security Events ==="
docker-compose -f docker-compose.production-enhanced.yml logs backend | \
  grep -E "(401|403|429)" | tail -10

# 5. Database connection audit
echo "=== Database Connections ==="
docker-compose -f docker-compose.production-enhanced.yml exec -T postgres \
  psql -U postgres -c "SELECT datname, usename, client_addr, state FROM pg_stat_activity;"
```

### **Security Incident Response**

#### **Suspected Breach**
```bash
# 1. Immediate isolation
sudo ufw deny in
docker-compose -f docker-compose.production-enhanced.yml stop traefik

# 2. Capture evidence
./scripts/backup-daily.sh  # Preserve current state
docker-compose -f docker-compose.production-enhanced.yml logs > "incident-logs-$(date +%Y%m%d-%H%M%S).log"

# 3. Security assessment
grep -r "ALERT\|CRITICAL\|BREACH" /var/log/
docker-compose -f docker-compose.production-enhanced.yml exec -T postgres \
  psql -U postgres -c "SELECT * FROM pg_stat_activity;"

# 4. Recovery steps
# - Change all passwords
# - Regenerate API keys
# - Review access logs
# - Update security rules
```

## ⚡ Performance Optimization

### **Database Performance**

#### **Regular Maintenance**
```sql
-- Weekly database maintenance
-- Run via: docker-compose exec -T postgres psql -U postgres -d lokdarpan_db

-- 1. Update statistics
ANALYZE;

-- 2. Rebuild indexes
REINDEX DATABASE lokdarpan_db;

-- 3. Clean up old data
DELETE FROM post WHERE created_at < NOW() - INTERVAL '90 days';
DELETE FROM epaper WHERE created_at < NOW() - INTERVAL '90 days';

-- 4. Vacuum tables
VACUUM FULL;

-- 5. Check slow queries
SELECT query, calls, total_time, mean_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;
```

#### **Query Optimization**
```sql
-- Add missing indexes for political intelligence queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_post_ward_created 
ON post(ward_id, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_post_sentiment_date 
ON post(sentiment, created_at DESC) WHERE sentiment IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_epaper_publication_date 
ON epaper(publication_date DESC, publication_name);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_leader_mention_entity 
ON leader_mention(entity_name, mentioned_at DESC);
```

### **Cache Optimization**

#### **Redis Performance Tuning**
```bash
# Monitor Redis performance
docker-compose -f docker-compose.production-enhanced.yml exec redis redis-cli info memory
docker-compose -f docker-compose.production-enhanced.yml exec redis redis-cli info stats

# Cache hit rate analysis
docker-compose -f docker-compose.production-enhanced.yml exec redis redis-cli info stats | grep keyspace

# Clear unused keys
docker-compose -f docker-compose.production-enhanced.yml exec redis redis-cli --scan --pattern "*:expired*" | xargs -r redis-cli del
```

#### **Application Cache Strategy**
```python
# Cache configuration for political intelligence
CACHE_STRATEGIES = {
    'ward_demographics': {
        'ttl': 86400,  # 24 hours - stable data
        'key_pattern': 'ward:{ward_id}:demographics'
    },
    'news_analysis': {
        'ttl': 1800,   # 30 minutes - timely intelligence
        'key_pattern': 'analysis:{ward}:{date}'
    },
    'strategist_reports': {
        'ttl': 600,    # 10 minutes - fresh AI analysis
        'key_pattern': 'strategist:{ward}:{depth}:{timestamp}'
    },
    'api_responses': {
        'ttl': 300,    # 5 minutes - live data
        'key_pattern': 'api:{endpoint}:{params_hash}'
    }
}
```

### **System Performance Monitoring**
```bash
# Performance monitoring script
#!/bin/bash

echo "=== System Performance Report ==="
echo "Generated: $(date)"

# 1. CPU usage
echo "=== CPU Usage ==="
mpstat 1 5

# 2. Memory usage
echo "=== Memory Usage ==="
free -h
echo ""
ps aux --sort=-%mem | head -10

# 3. Disk I/O
echo "=== Disk I/O ==="
iostat -x 1 3

# 4. Network statistics
echo "=== Network Stats ==="
netstat -i

# 5. Docker container stats
echo "=== Container Performance ==="
docker stats --no-stream

# 6. Database performance
echo "=== Database Performance ==="
docker-compose -f docker-compose.production-enhanced.yml exec -T postgres \
  psql -U postgres -d lokdarpan_db -c "
    SELECT schemaname, tablename, n_tup_ins, n_tup_upd, n_tup_del, n_live_tup, n_dead_tup
    FROM pg_stat_user_tables
    ORDER BY n_live_tup DESC
    LIMIT 10;"
```

## 🚨 Emergency Procedures

### **Service Recovery**

#### **Backend API Recovery**
```bash
#!/bin/bash
# Backend service emergency recovery

echo "Starting backend emergency recovery..."

# 1. Check service status
docker-compose -f docker-compose.production-enhanced.yml ps backend

# 2. View recent logs
docker-compose -f docker-compose.production-enhanced.yml logs --tail=100 backend

# 3. Restart backend service
docker-compose -f docker-compose.production-enhanced.yml restart backend

# 4. Wait and test
sleep 30
curl -f http://localhost/api/v1/health || {
    echo "Backend still not responding, attempting full restart..."
    docker-compose -f docker-compose.production-enhanced.yml stop backend
    docker-compose -f docker-compose.production-enhanced.yml start backend
    sleep 30
}

# 5. Final health check
./scripts/health-check.sh
```

#### **Database Emergency Recovery**
```bash
#!/bin/bash
# Database emergency recovery

echo "Starting database emergency recovery..."

# 1. Check database status
docker-compose -f docker-compose.production-enhanced.yml exec -T postgres pg_isready -U postgres

# 2. If database is corrupted, restore from backup
if [ $? -ne 0 ]; then
    echo "Database is not responding, initiating recovery from backup..."
    
    # Find latest backup
    LATEST_BACKUP=$(ls -t /backups/*/database.sql.gz | head -1)
    
    if [ -n "$LATEST_BACKUP" ]; then
        echo "Restoring from: $LATEST_BACKUP"
        ./scripts/restore-database.sh "$LATEST_BACKUP"
    else
        echo "No backup found, manual intervention required"
        exit 1
    fi
fi

# 3. Database maintenance
docker-compose -f docker-compose.production-enhanced.yml exec -T postgres \
  psql -U postgres -d lokdarpan_db -c "VACUUM ANALYZE;"

echo "Database recovery completed"
```

### **Complete System Recovery**
```bash
#!/bin/bash
# Nuclear option - complete system restart

echo "EMERGENCY: Initiating complete system recovery"

# 1. Create emergency backup
./scripts/backup-daily.sh

# 2. Stop all services
docker-compose -f docker-compose.production-enhanced.yml down

# 3. Clean up resources
docker system prune -f
docker volume prune -f

# 4. Restart with fresh containers
docker-compose -f docker-compose.production-enhanced.yml pull
docker-compose -f docker-compose.production-enhanced.yml up -d

# 5. Wait for services
sleep 60

# 6. Comprehensive validation
./scripts/validate-deployment.sh

echo "Complete system recovery finished"
```

### **Data Recovery Procedures**

#### **Point-in-Time Recovery**
```bash
#!/bin/bash
# Restore system to specific point in time

TARGET_DATE="$1"
if [ -z "$TARGET_DATE" ]; then
    echo "Usage: $0 YYYY-MM-DD"
    echo "Available backups:"
    ls -la /backups/ | grep "^d"
    exit 1
fi

# Convert date to backup directory format
BACKUP_DATE=$(date -d "$TARGET_DATE" +%Y%m%d)
BACKUP_DIR="/backups/$BACKUP_DATE"

if [ ! -d "$BACKUP_DIR" ]; then
    echo "Backup for $TARGET_DATE not found in $BACKUP_DIR"
    exit 1
fi

echo "Restoring system to $TARGET_DATE..."
./scripts/restore-full-system.sh "$BACKUP_DATE"
```

## 📞 Support & Escalation

### **Support Levels**

#### **Level 1: Automated Recovery**
- Health check scripts identify and resolve common issues
- Automated service restarts for transient failures
- Cache clearing and basic optimization

#### **Level 2: Administrator Intervention**
- Manual service recovery procedures
- Database maintenance and optimization
- Configuration updates and security patches

#### **Level 3: Emergency Response**
- Complete system recovery from backup
- Security incident response
- Data recovery procedures

### **Escalation Procedures**
1. **Check monitoring dashboards** for system health
2. **Review recent logs** for error patterns
3. **Execute appropriate recovery procedures** based on issue type
4. **Document incident** and resolution steps
5. **Update procedures** based on lessons learned

### **Emergency Contacts**
- **System Health**: Use built-in health dashboards
- **Security Issues**: Follow security incident procedures
- **Data Loss**: Execute backup recovery procedures
- **Service Outage**: Use service recovery scripts

---

## 📊 Appendix

### **Useful Commands Reference**
```bash
# System status
./scripts/health-check.sh
docker-compose -f docker-compose.production-enhanced.yml ps
docker stats --no-stream

# Logs
docker-compose -f docker-compose.production-enhanced.yml logs -f [service]
tail -f /var/log/lokdarpan/*.log

# Database
docker-compose -f docker-compose.production-enhanced.yml exec -T postgres psql -U postgres -d lokdarpan_db
./scripts/backup-daily.sh

# Performance
htop
iostat -x 1 5
free -h

# Security
sudo ufw status
grep "Failed" /var/log/auth.log
```

### **Configuration Files**
- **Main Config**: `.env.production-enhanced`
- **Docker Compose**: `docker-compose.production-enhanced.yml`
- **Monitoring**: `monitoring/prometheus/prometheus.yml`
- **Backup Scripts**: `scripts/backup-*.sh`
- **Health Checks**: `scripts/health-check.sh`

**LokDarpan System Administration - Complete Operations Manual** 🛠️✨