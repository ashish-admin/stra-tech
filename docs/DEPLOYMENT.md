# LokDarpan Phase 3 Deployment Guide

## Overview

This guide covers deployment of LokDarpan Phase 3 with the Political Strategist system, including multi-model AI integration, SSE streaming, and enhanced security features.

## Prerequisites

### System Requirements
- **OS**: Ubuntu 22.04+ or CentOS 8+
- **Memory**: 16GB RAM minimum (32GB recommended for production)
- **CPU**: 8 cores minimum (16 cores recommended)
- **Storage**: 500GB SSD (1TB recommended)
- **Network**: Stable internet for AI service integration

### Service Dependencies
- **PostgreSQL**: 14+ with PostGIS extension
- **Redis**: 6.0+ for caching and Celery broker
- **Nginx**: 1.18+ for reverse proxy and load balancing
- **Node.js**: 18+ for frontend build process
- **Python**: 3.11+ for backend services

### External Service Requirements
- **Google Cloud**: Gemini 2.5 Pro API access
- **Perplexity AI**: API subscription for enhanced intelligence
- **SSL Certificate**: For HTTPS in production

## Environment Configuration

### Backend Environment Variables

Create `/opt/lokdarpan/backend/.env`:

```env
# Flask Configuration
FLASK_ENV=production
SECRET_KEY=<generate-secure-key>
FLASK_APP=app:create_app

# Database Configuration
DATABASE_URL=postgresql://lokdarpan:secure_password@localhost/lokdarpan_production
DATABASE_POOL_SIZE=20
DATABASE_MAX_OVERFLOW=50

# Redis Configuration
REDIS_URL=redis://localhost:6379/0
CELERY_BROKER_URL=redis://localhost:6379/0
CELERY_RESULT_BACKEND=redis://localhost:6379/1

# Security Configuration
CORS_ORIGINS=https://lokdarpan.com,https://www.lokdarpan.com
SESSION_COOKIE_SECURE=true
SESSION_COOKIE_HTTPONLY=true
SESSION_COOKIE_SAMESITE=Strict

# AI Service Configuration (REQUIRED FOR PHASE 3)
GEMINI_API_KEY=<your-gemini-api-key>
PERPLEXITY_API_KEY=<your-perplexity-api-key>
AI_RATE_LIMIT_PER_MINUTE=100
AI_TIMEOUT_SECONDS=30

# Political Strategist Configuration
STRATEGIST_ENABLED=true
STRATEGIST_MODE=production
STRATEGIST_CACHE_TTL=300
STRATEGIST_MAX_CONCURRENT_ANALYSES=5
STRATEGIST_ENABLE_SSE=true

# Monitoring & Observability
ENABLE_METRICS=true
METRICS_PORT=8001
LOG_LEVEL=INFO
STRUCTURED_LOGGING=true

# Rate Limiting
RATE_LIMIT_STORAGE_URL=redis://localhost:6379/2
DEFAULT_RATE_LIMIT=1000/hour
API_RATE_LIMIT=100/minute
STRATEGIST_RATE_LIMIT=10/minute

# Performance Configuration
WORKER_PROCESSES=4
WORKER_CONNECTIONS=1000
WORKER_TIMEOUT=120
```

### Frontend Environment Variables

Create `/opt/lokdarpan/frontend/.env.production`:

```env
VITE_API_BASE_URL=https://api.lokdarpan.com
VITE_SSE_ENDPOINT=https://api.lokdarpan.com/api/v1/strategist/feed
VITE_APP_VERSION=3.0.0
VITE_ENABLE_ANALYTICS=true
VITE_STRATEGIST_ENABLED=true
```

## Deployment Steps

### 1. System Preparation

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install system dependencies
sudo apt install -y python3.11 python3.11-venv python3.11-dev \
    postgresql-14 postgresql-contrib postgresql-14-postgis-3 \
    redis-server nginx git curl build-essential \
    libpq-dev libssl-dev libffi-dev

# Install Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Create system user
sudo useradd -r -m -s /bin/bash lokdarpan
sudo mkdir -p /opt/lokdarpan
sudo chown lokdarpan:lokdarpan /opt/lokdarpan
```

### 2. Database Setup

```bash
# Configure PostgreSQL
sudo -u postgres psql << EOF
CREATE USER lokdarpan WITH PASSWORD 'secure_password';
CREATE DATABASE lokdarpan_production OWNER lokdarpan;
GRANT ALL PRIVILEGES ON DATABASE lokdarpan_production TO lokdarpan;
\c lokdarpan_production
CREATE EXTENSION postgis;
CREATE EXTENSION pg_trgm;
EOF

# Configure Redis
sudo systemctl enable redis-server
sudo systemctl start redis-server

# Verify services
sudo systemctl status postgresql
sudo systemctl status redis-server
```

### 3. Application Deployment

```bash
# Switch to lokdarpan user
sudo -u lokdarpan -i

# Clone repository
cd /opt/lokdarpan
git clone https://github.com/your-org/lokdarpan.git .
git checkout feature/phase3-political-strategist

# Backend setup
cd backend
python3.11 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt

# Environment configuration
cp .env.example .env
# Edit .env with production values

# Database migration
export FLASK_APP=app:create_app
flask db upgrade

# Frontend setup
cd ../frontend
npm ci --production
npm run build

# Verify build
ls -la dist/
```

### 4. Systemd Service Configuration

#### Backend API Service

Create `/etc/systemd/system/lokdarpan-api.service`:

```ini
[Unit]
Description=LokDarpan API Server
After=network.target postgresql.service redis-server.service
Requires=postgresql.service redis-server.service

[Service]
Type=exec
User=lokdarpan
Group=lokdarpan
WorkingDirectory=/opt/lokdarpan/backend
Environment=PATH=/opt/lokdarpan/backend/venv/bin
EnvironmentFile=/opt/lokdarpan/backend/.env
ExecStart=/opt/lokdarpan/backend/venv/bin/gunicorn \
    --workers 4 \
    --worker-class gevent \
    --worker-connections 1000 \
    --timeout 120 \
    --bind 127.0.0.1:8000 \
    --access-logfile /var/log/lokdarpan/access.log \
    --error-logfile /var/log/lokdarpan/error.log \
    --capture-output \
    'app:create_app()'

Restart=always
RestartSec=5
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=lokdarpan-api

# Security settings
NoNewPrivileges=yes
PrivateTmp=yes
ProtectSystem=strict
ProtectHome=yes
ReadWritePaths=/opt/lokdarpan

[Install]
WantedBy=multi-user.target
```

#### Celery Worker Service

Create `/etc/systemd/system/lokdarpan-worker.service`:

```ini
[Unit]
Description=LokDarpan Celery Worker
After=network.target redis-server.service
Requires=redis-server.service

[Service]
Type=exec
User=lokdarpan
Group=lokdarpan
WorkingDirectory=/opt/lokdarpan/backend
Environment=PATH=/opt/lokdarpan/backend/venv/bin
EnvironmentFile=/opt/lokdarpan/backend/.env
ExecStart=/opt/lokdarpan/backend/venv/bin/celery \
    -A celery_worker.celery worker \
    --loglevel=info \
    --concurrency=4 \
    --max-tasks-per-child=1000

Restart=always
RestartSec=10
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=lokdarpan-worker

# Security settings
NoNewPrivileges=yes
PrivateTmp=yes
ProtectSystem=strict
ProtectHome=yes
ReadWritePaths=/opt/lokdarpan

[Install]
WantedBy=multi-user.target
```

#### Celery Beat Service

Create `/etc/systemd/system/lokdarpan-beat.service`:

```ini
[Unit]
Description=LokDarpan Celery Beat Scheduler
After=network.target lokdarpan-worker.service
Requires=lokdarpan-worker.service

[Service]
Type=exec
User=lokdarpan
Group=lokdarpan
WorkingDirectory=/opt/lokdarpan/backend
Environment=PATH=/opt/lokdarpan/backend/venv/bin
EnvironmentFile=/opt/lokdarpan/backend/.env
ExecStart=/opt/lokdarpan/backend/venv/bin/celery \
    -A celery_worker.celery beat \
    --loglevel=info \
    --schedule=/opt/lokdarpan/backend/celerybeat-schedule

Restart=always
RestartSec=10
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=lokdarpan-beat

# Security settings
NoNewPrivileges=yes
PrivateTmp=yes
ProtectSystem=strict
ProtectHome=yes
ReadWritePaths=/opt/lokdarpan

[Install]
WantedBy=multi-user.target
```

### 5. Nginx Configuration

Create `/etc/nginx/sites-available/lokdarpan`:

```nginx
# Rate limiting zones
limit_req_zone $binary_remote_addr zone=api:10m rate=100r/m;
limit_req_zone $binary_remote_addr zone=strategist:10m rate=10r/m;

# Upstream backend
upstream lokdarpan_backend {
    server 127.0.0.1:8000 max_fails=3 fail_timeout=30s;
    keepalive 32;
}

server {
    listen 443 ssl http2;
    server_name lokdarpan.com www.lokdarpan.com;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/lokdarpan.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/lokdarpan.com/privkey.pem;
    ssl_session_timeout 5m;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers on;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options DENY always;
    add_header X-Content-Type-Options nosniff always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Logging
    access_log /var/log/nginx/lokdarpan-access.log combined;
    error_log /var/log/nginx/lokdarpan-error.log warn;

    # Frontend static files
    location / {
        root /opt/lokdarpan/frontend/dist;
        try_files $uri $uri/ /index.html;
        
        # Caching for static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    # API routes
    location /api/ {
        limit_req zone=api burst=20 nodelay;
        
        proxy_pass http://lokdarpan_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Connection settings
        proxy_connect_timeout 30s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        proxy_buffering off;
        
        # For SSE support
        proxy_cache off;
        proxy_set_header Connection '';
        proxy_http_version 1.1;
        chunked_transfer_encoding off;
    }

    # Strategist API with enhanced rate limiting
    location /api/v1/strategist/ {
        limit_req zone=strategist burst=5 nodelay;
        
        proxy_pass http://lokdarpan_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Extended timeouts for AI processing
        proxy_connect_timeout 60s;
        proxy_send_timeout 120s;
        proxy_read_timeout 120s;
        proxy_buffering off;
        
        # SSE streaming support
        proxy_cache off;
        proxy_set_header Connection '';
        proxy_http_version 1.1;
        chunked_transfer_encoding off;
    }

    # Health check endpoint (no rate limiting)
    location /api/v1/health {
        proxy_pass http://lokdarpan_backend;
        proxy_set_header Host $host;
        access_log off;
    }

    # Security: Block access to sensitive files
    location ~ /\. {
        deny all;
    }
    
    location ~ \.(py|pyc|pyo|pyd|env)$ {
        deny all;
    }
}

# HTTP to HTTPS redirect
server {
    listen 80;
    server_name lokdarpan.com www.lokdarpan.com;
    return 301 https://$server_name$request_uri;
}
```

### 6. Logging Configuration

```bash
# Create log directories
sudo mkdir -p /var/log/lokdarpan
sudo chown lokdarpan:lokdarpan /var/log/lokdarpan

# Logrotate configuration
sudo tee /etc/logrotate.d/lokdarpan << EOF
/var/log/lokdarpan/*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 644 lokdarpan lokdarpan
    postrotate
        systemctl reload lokdarpan-api
    endscript
}
EOF
```

### 7. SSL Certificate Setup

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Obtain SSL certificate
sudo certbot --nginx -d lokdarpan.com -d www.lokdarpan.com

# Auto-renewal setup
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer
```

### 8. Service Startup

```bash
# Enable and start services
sudo systemctl daemon-reload
sudo systemctl enable lokdarpan-api lokdarpan-worker lokdarpan-beat
sudo systemctl start lokdarpan-api lokdarpan-worker lokdarpan-beat

# Enable and configure Nginx
sudo ln -s /etc/nginx/sites-available/lokdarpan /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl enable nginx
sudo systemctl reload nginx

# Verify all services
sudo systemctl status lokdarpan-api
sudo systemctl status lokdarpan-worker
sudo systemctl status lokdarpan-beat
sudo systemctl status nginx
```

## Health Checks and Monitoring

### System Health Verification

```bash
# API health check
curl -f https://lokdarpan.com/api/v1/health

# Strategist system status
curl -f https://lokdarpan.com/api/v1/strategist/status

# Database connectivity
sudo -u lokdarpan psql $DATABASE_URL -c "SELECT 1;"

# Redis connectivity
redis-cli ping

# Celery worker status
sudo -u lokdarpan /opt/lokdarpan/backend/venv/bin/celery \
    -A celery_worker.celery inspect active
```

### Monitoring Setup

```bash
# Install monitoring tools
sudo apt install -y htop iotop nethogs

# System resource monitoring
cat << 'EOF' > /opt/lokdarpan/scripts/health-check.sh
#!/bin/bash
# LokDarpan Health Check Script

echo "=== System Health Check ==="
echo "Timestamp: $(date)"
echo

# Memory usage
echo "Memory Usage:"
free -h

# CPU load
echo -e "\nCPU Load:"
uptime

# Disk usage
echo -e "\nDisk Usage:"
df -h /opt/lokdarpan

# Service status
echo -e "\nService Status:"
systemctl is-active lokdarpan-api
systemctl is-active lokdarpan-worker
systemctl is-active lokdarpan-beat

# API health
echo -e "\nAPI Health:"
curl -s -f http://localhost:8000/api/v1/health | jq .status || echo "API unhealthy"

# Database connection
echo -e "\nDatabase:"
sudo -u lokdarpan psql $DATABASE_URL -c "SELECT 1;" > /dev/null && echo "Connected" || echo "Failed"

# Redis connection
echo -e "\nRedis:"
redis-cli ping

echo -e "\n=== End Health Check ==="
EOF

chmod +x /opt/lokdarpan/scripts/health-check.sh
```

## Production Optimization

### Performance Tuning

```bash
# PostgreSQL optimization (add to postgresql.conf)
sudo tee -a /etc/postgresql/14/main/postgresql.conf << EOF

# LokDarpan optimizations
shared_buffers = 4GB
effective_cache_size = 12GB
maintenance_work_mem = 1GB
checkpoint_completion_target = 0.9
wal_buffers = 16MB
default_statistics_target = 100
random_page_cost = 1.1
effective_io_concurrency = 200
work_mem = 64MB
min_wal_size = 2GB
max_wal_size = 8GB
EOF

# Redis optimization (add to redis.conf)
sudo tee -a /etc/redis/redis.conf << EOF

# LokDarpan optimizations
maxmemory 2gb
maxmemory-policy allkeys-lru
save 900 1
save 300 10
save 60 10000
EOF

# Restart services to apply changes
sudo systemctl restart postgresql
sudo systemctl restart redis-server
```

### Security Hardening

```bash
# Firewall configuration
sudo ufw enable
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw deny 8000/tcp  # Block direct backend access

# Fail2ban for brute force protection
sudo apt install -y fail2ban

sudo tee /etc/fail2ban/jail.local << EOF
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5

[nginx-http-auth]
enabled = true

[nginx-limit-req]
enabled = true

[sshd]
enabled = true
EOF

sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

## Troubleshooting

### Common Issues

#### 1. AI Service Connection Failures
```bash
# Check API keys
sudo -u lokdarpan grep -E "GEMINI|PERPLEXITY" /opt/lokdarpan/backend/.env

# Test connectivity
curl -H "Authorization: Bearer $GEMINI_API_KEY" \
    https://generativelanguage.googleapis.com/v1/models
```

#### 2. High Memory Usage
```bash
# Monitor Celery workers
ps aux | grep celery
sudo systemctl restart lokdarpan-worker
```

#### 3. SSE Connection Issues
```bash
# Check Nginx SSE configuration
sudo nginx -t
sudo systemctl reload nginx

# Verify backend SSE support
curl -H "Accept: text/event-stream" \
    https://lokdarpan.com/api/v1/strategist/feed
```

### Log Analysis

```bash
# Application logs
sudo journalctl -u lokdarpan-api -f
sudo journalctl -u lokdarpan-worker -f

# Nginx logs
sudo tail -f /var/log/nginx/lokdarpan-error.log

# System logs
sudo dmesg -T
```

## Backup and Recovery

### Database Backup

```bash
# Daily backup script
cat << 'EOF' > /opt/lokdarpan/scripts/backup-db.sh
#!/bin/bash
BACKUP_DIR="/opt/lokdarpan/backups"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR

pg_dump $DATABASE_URL | gzip > $BACKUP_DIR/lokdarpan_$DATE.sql.gz

# Keep only last 7 days
find $BACKUP_DIR -name "lokdarpan_*.sql.gz" -mtime +7 -delete
EOF

chmod +x /opt/lokdarpan/scripts/backup-db.sh

# Add to crontab
sudo -u lokdarpan crontab -e
# Add: 0 2 * * * /opt/lokdarpan/scripts/backup-db.sh
```

### Application Backup

```bash
# Configuration backup
tar -czf /opt/lokdarpan/backups/config_$(date +%Y%m%d).tar.gz \
    /opt/lokdarpan/backend/.env \
    /opt/lokdarpan/frontend/.env.production \
    /etc/nginx/sites-available/lokdarpan \
    /etc/systemd/system/lokdarpan-*
```

## Scaling Considerations

### Horizontal Scaling

For high-traffic deployments:

1. **Load Balancer**: Use HAProxy or AWS ALB
2. **Multiple App Instances**: Scale API servers horizontally
3. **Dedicated Celery Workers**: Separate workers by task type
4. **Redis Clustering**: For high-availability caching
5. **PostgreSQL Replication**: Master-slave setup for read scaling

### Monitoring and Alerting

Consider implementing:
- **Prometheus + Grafana**: For metrics and dashboards
- **Sentry**: For error tracking and alerting
- **DataDog/New Relic**: For comprehensive APM
- **Custom health checks**: For political strategist components

---

**Deployment Checklist:**
- [ ] All environment variables configured
- [ ] Database migrated and seeded
- [ ] SSL certificates installed
- [ ] All services started and enabled
- [ ] Health checks passing
- [ ] Monitoring configured
- [ ] Backup scripts set up
- [ ] Security hardening applied
- [ ] Load testing completed
- [ ] Documentation updated