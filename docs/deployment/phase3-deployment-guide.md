# Phase 3 Political Strategist Deployment Guide

## Table of Contents
1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Environment Setup](#environment-setup)
3. [Database Migrations](#database-migrations)
4. [Service Deployment](#service-deployment)
5. [Nginx Configuration](#nginx-configuration)
6. [Redis Setup](#redis-setup)
7. [Monitoring Setup](#monitoring-setup)
8. [Testing & Validation](#testing--validation)
9. [Rollback Procedures](#rollback-procedures)
10. [Post-Deployment Verification](#post-deployment-verification)

## Pre-Deployment Checklist

### System Requirements
- [ ] Python 3.12+
- [ ] PostgreSQL 14+
- [ ] Redis 7.0+
- [ ] Nginx 1.24+
- [ ] Node.js 18+ (for frontend)
- [ ] 4GB+ RAM minimum
- [ ] 20GB+ disk space

### Required API Keys
```bash
# Verify all API keys are available
echo $GEMINI_API_KEY | cut -c1-10      # Should show first 10 chars
echo $PERPLEXITY_API_KEY | cut -c1-10   # Should show first 10 chars
echo $OPENAI_API_KEY | cut -c1-10       # Optional fallback
```

### Backup Current System
```bash
# Backup database
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql

# Backup configuration
cp -r backend/.env backend/.env.backup
cp -r frontend/.env frontend/.env.backup

# Create system snapshot (if using cloud provider)
# AWS: aws ec2 create-snapshot
# GCP: gcloud compute snapshots create
# Azure: az snapshot create
```

## Environment Setup

### 1. Clone Repository & Checkout Release
```bash
git clone https://github.com/lokdarpan/lokdarpan.git
cd lokdarpan
git checkout tags/v3.0.0-phase3
```

### 2. Backend Environment Configuration
```bash
cd backend
cp .env.example .env

# Edit .env with production values
cat > .env << EOL
FLASK_ENV=production
SECRET_KEY=$(python -c 'import secrets; print(secrets.token_hex(32))')
DATABASE_URL=postgresql://user:pass@localhost/lokdarpan_db
REDIS_URL=redis://localhost:6379/0
CELERY_BROKER_URL=redis://localhost:6379/0
CELERY_RESULT_BACKEND=redis://localhost:6379/0

# AI Services
GEMINI_API_KEY=your_production_key
PERPLEXITY_API_KEY=your_production_key
OPENAI_API_KEY=your_production_key  # Optional

# Security
CORS_ORIGINS=https://yourdomain.com
SESSION_COOKIE_SECURE=True
SESSION_COOKIE_HTTPONLY=True
SESSION_COOKIE_SAMESITE=Strict

# Performance
STRATEGIST_CACHE_TTL=3600
SSE_HEARTBEAT_INTERVAL=30
AI_SERVICE_TIMEOUT=30
MAX_CONTENT_LENGTH=16777216  # 16MB
EOL
```

### 3. Install Dependencies
```bash
# Backend
cd backend
python -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt

# Frontend
cd ../frontend
npm ci --production
```

## Database Migrations

### 1. Verify Database Connection
```bash
export FLASK_APP=app:create_app
flask db current  # Show current migration
```

### 2. Apply Phase 3 Migrations
```bash
# Check pending migrations
flask db show

# Apply migrations
flask db upgrade

# Verify migration success
psql $DATABASE_URL -c "SELECT * FROM alembic_version;"
```

### 3. Seed Initial Data (if needed)
```bash
# Only for new deployments
PYTHONPATH=. python scripts/seed_production_data.py
```

## Service Deployment

### 1. Systemd Service Configuration

Create service file: `/etc/systemd/system/lokdarpan-api.service`
```ini
[Unit]
Description=LokDarpan Political Strategist API
After=network.target postgresql.service redis.service
Wants=postgresql.service redis.service

[Service]
Type=notify
User=lokdarpan
Group=lokdarpan
WorkingDirectory=/opt/lokdarpan/backend
Environment="PATH=/opt/lokdarpan/backend/venv/bin"
Environment="FLASK_ENV=production"
EnvironmentFile=/opt/lokdarpan/backend/.env
ExecStart=/opt/lokdarpan/backend/venv/bin/gunicorn \
    -w 4 \
    -b 127.0.0.1:5000 \
    --timeout 120 \
    --worker-class sync \
    --worker-connections 1000 \
    --max-requests 1000 \
    --max-requests-jitter 50 \
    --log-level info \
    --access-logfile /var/log/lokdarpan/access.log \
    --error-logfile /var/log/lokdarpan/error.log \
    "app:create_app()"
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

### 2. Celery Worker Service

Create service file: `/etc/systemd/system/lokdarpan-celery.service`
```ini
[Unit]
Description=LokDarpan Celery Worker
After=network.target redis.service

[Service]
Type=simple
User=lokdarpan
Group=lokdarpan
WorkingDirectory=/opt/lokdarpan/backend
Environment="PATH=/opt/lokdarpan/backend/venv/bin"
EnvironmentFile=/opt/lokdarpan/backend/.env
ExecStart=/opt/lokdarpan/backend/venv/bin/celery \
    -A celery_worker.celery worker \
    --loglevel=info \
    --concurrency=4 \
    --max-tasks-per-child=100
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

### 3. Start Services
```bash
# Reload systemd
sudo systemctl daemon-reload

# Enable and start services
sudo systemctl enable lokdarpan-api lokdarpan-celery
sudo systemctl start lokdarpan-api lokdarpan-celery

# Check status
sudo systemctl status lokdarpan-api
sudo systemctl status lokdarpan-celery
```

## Nginx Configuration

### 1. Create Nginx Site Configuration

`/etc/nginx/sites-available/lokdarpan`
```nginx
upstream lokdarpan_backend {
    server 127.0.0.1:5000;
    keepalive 32;
}

server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;

    # Frontend
    location / {
        root /opt/lokdarpan/frontend/dist;
        try_files $uri $uri/ /index.html;
        expires 1h;
        add_header Cache-Control "public, immutable";
    }

    # API Proxy
    location /api/ {
        proxy_pass http://lokdarpan_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # SSE Streaming Support
    location /api/v1/strategist/feed {
        proxy_pass http://lokdarpan_backend;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_buffering off;
        proxy_cache off;
        chunked_transfer_encoding off;
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
        
        # SSE specific headers
        add_header Content-Type text/event-stream;
        add_header Cache-Control no-cache;
        add_header X-Accel-Buffering no;
    }

    # Health check endpoint
    location /health {
        proxy_pass http://lokdarpan_backend/api/v1/strategist/health;
        access_log off;
    }
}
```

### 2. Enable Site
```bash
sudo ln -s /etc/nginx/sites-available/lokdarpan /etc/nginx/sites-enabled/
sudo nginx -t  # Test configuration
sudo systemctl reload nginx
```

## Redis Setup

### 1. Redis Configuration

Edit `/etc/redis/redis.conf`:
```conf
# Performance
maxmemory 2gb
maxmemory-policy allkeys-lru
tcp-keepalive 60
timeout 300

# Persistence
save 900 1
save 300 10
save 60 10000
dbfilename lokdarpan.rdb
dir /var/lib/redis

# Security
requirepass your_redis_password
bind 127.0.0.1

# Logging
loglevel notice
logfile /var/log/redis/redis-server.log
```

### 2. Start Redis
```bash
sudo systemctl restart redis-server
sudo systemctl enable redis-server

# Test connection
redis-cli -a your_redis_password ping
```

## Monitoring Setup

### 1. Install Monitoring Stack
```bash
# Prometheus
wget https://github.com/prometheus/prometheus/releases/download/v2.45.0/prometheus-2.45.0.linux-amd64.tar.gz
tar xvf prometheus-2.45.0.linux-amd64.tar.gz
sudo mv prometheus-2.45.0.linux-amd64 /opt/prometheus

# Grafana
sudo apt-get install -y software-properties-common
sudo add-apt-repository "deb https://packages.grafana.com/oss/deb stable main"
sudo apt-get update
sudo apt-get install grafana
```

### 2. Configure Prometheus

`/opt/prometheus/prometheus.yml`:
```yaml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'lokdarpan'
    static_configs:
      - targets: ['localhost:5000']
    metrics_path: /api/v1/strategist/metrics
```

### 3. Import Grafana Dashboard
```bash
# Start Grafana
sudo systemctl start grafana-server
sudo systemctl enable grafana-server

# Access at http://localhost:3000
# Import dashboard ID: 15847 (LokDarpan Strategic Intelligence)
```

## Testing & Validation

### 1. API Health Check
```bash
# Check API health
curl https://yourdomain.com/api/v1/strategist/health

# Test authentication
curl -X POST https://yourdomain.com/api/v1/login \
  -H "Content-Type: application/json" \
  -d '{"username":"test","password":"test"}'

# Test strategic analysis
curl https://yourdomain.com/api/v1/strategist/Jubilee%20Hills
```

### 2. SSE Streaming Test
```bash
# Test SSE streaming
curl -N -H "Accept: text/event-stream" \
  https://yourdomain.com/api/v1/strategist/feed

# Should see:
# data: {"type":"connection","status":"connected"...}
# data: {"type":"heartbeat"...}
```

### 3. Performance Test
```bash
# Install Apache Bench
sudo apt-get install apache2-utils

# Load test
ab -n 1000 -c 10 https://yourdomain.com/api/v1/strategist/health
```

### 4. Security Scan
```bash
# SSL Test
nmap --script ssl-cert,ssl-enum-ciphers -p 443 yourdomain.com

# Security headers
curl -I https://yourdomain.com

# OWASP ZAP scan
docker run -t owasp/zap2docker-stable zap-baseline.py \
  -t https://yourdomain.com
```

## Rollback Procedures

### 1. Quick Rollback (< 5 minutes)
```bash
# Stop services
sudo systemctl stop lokdarpan-api lokdarpan-celery

# Restore previous version
cd /opt/lokdarpan
git checkout tags/v2.0.0

# Restore database
psql $DATABASE_URL < backup_latest.sql

# Restart services
sudo systemctl start lokdarpan-api lokdarpan-celery
```

### 2. Full Rollback
```bash
# Complete rollback script
#!/bin/bash
set -e

echo "Starting rollback..."

# Stop all services
sudo systemctl stop lokdarpan-api lokdarpan-celery nginx redis

# Restore code
cd /opt/lokdarpan
git checkout tags/v2.0.0
cd backend && pip install -r requirements.txt
cd ../frontend && npm ci

# Restore database
psql $DATABASE_URL < backup_latest.sql

# Clear Redis cache
redis-cli FLUSHALL

# Start services
sudo systemctl start redis nginx lokdarpan-api lokdarpan-celery

echo "Rollback complete"
```

## Post-Deployment Verification

### 1. Functional Tests
```bash
# Run test suite
cd /opt/lokdarpan/backend
python -m pytest tests/test_strategist.py -v

# Run smoke tests
python scripts/smoke_tests.py
```

### 2. Performance Metrics
```bash
# Check response times
curl -w "@curl-format.txt" -o /dev/null -s \
  https://yourdomain.com/api/v1/strategist/health

# Monitor logs
tail -f /var/log/lokdarpan/*.log
```

### 3. User Acceptance Testing
- [ ] Login functionality works
- [ ] Dashboard loads with data
- [ ] Strategic analysis returns results
- [ ] SSE streaming maintains connection
- [ ] Cache hit rate > 40%
- [ ] Response times < 500ms

## Maintenance Tasks

### Daily
```bash
# Check system health
curl https://yourdomain.com/health

# Review error logs
grep ERROR /var/log/lokdarpan/error.log | tail -20

# Monitor Redis
redis-cli info stats
```

### Weekly
```bash
# Backup database
pg_dump $DATABASE_URL | gzip > backup_$(date +%Y%m%d).sql.gz

# Update dependencies
pip list --outdated
npm outdated

# Security scan
nikto -h https://yourdomain.com
```

### Monthly
```bash
# Performance analysis
python scripts/analyze_performance.py

# Capacity planning
df -h
free -m
htop

# SSL certificate renewal
certbot renew --dry-run
```

## Troubleshooting

### Common Issues

| Issue | Solution |
|-------|----------|
| 502 Bad Gateway | Check if backend service is running: `systemctl status lokdarpan-api` |
| SSE disconnections | Increase nginx timeout: `proxy_read_timeout 86400s;` |
| High memory usage | Adjust worker count: `gunicorn -w 2` |
| Redis connection refused | Check Redis password in .env |
| AI service timeout | Increase AI_SERVICE_TIMEOUT in .env |

### Debug Mode
```bash
# Enable debug logging
export FLASK_ENV=development
export LOG_LEVEL=DEBUG

# Run in foreground
/opt/lokdarpan/backend/venv/bin/python app.py

# Watch logs
journalctl -u lokdarpan-api -f
```

## Support

- Documentation: https://docs.lokdarpan.in
- Issues: https://github.com/lokdarpan/lokdarpan/issues
- Email: support@lokdarpan.in
- Emergency: +91-XXX-XXX-XXXX

---

**Deployment Checklist Summary:**
- [ ] Pre-deployment backups complete
- [ ] Environment variables configured
- [ ] Database migrations applied
- [ ] Services started and healthy
- [ ] Nginx configured with SSL
- [ ] Redis operational with auth
- [ ] Monitoring active
- [ ] Tests passing
- [ ] Performance validated
- [ ] Security scan complete

**Estimated Deployment Time: 2-3 hours**  
**Rollback Time: < 5 minutes**