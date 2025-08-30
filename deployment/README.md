# LokDarpan Phase 1 - API and Networking Deployment Guide

## 🌐 Production-Ready Deployment Strategy

This guide provides comprehensive instructions for deploying LokDarpan's political intelligence platform with advanced networking, SSL/TLS security, and geographic optimization for Indian campaign teams.

## 📋 Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                          Internet                                │
└─────────────────────┬───────────────────────────────────────────┘
                      │ HTTPS Traffic
┌─────────────────────▼───────────────────────────────────────────┐
│                 Traefik v3.0                                    │
│        (Reverse Proxy + SSL Termination)                       │
│   • Automatic Let's Encrypt SSL                                │
│   • Rate Limiting & Security Headers                           │
│   • Geographic IP Filtering                                    │
│   • Real-time SSE Streaming Support                           │
└─────────────────────┬───────────────────────────────────────────┘
                      │ Internal Routing
┌─────────────────────▼───────────────────────────────────────────┐
│                 Application Layer                               │
│ ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐   │
│ │   React UI      │  │   Flask API     │  │   Celery Jobs   │   │
│ │ Political       │  │ Political       │  │ News Ingestion  │   │
│ │ Dashboard       │  │ Strategist      │  │ AI Analysis     │   │
│ └─────────────────┘  └─────────────────┘  └─────────────────┘   │
└─────────────────────┬───────────────────────────────────────────┘
                      │ Data Layer
┌─────────────────────▼───────────────────────────────────────────┐
│              Data & Caching Layer                               │
│ ┌─────────────────┐              ┌─────────────────┐            │
│ │  PostgreSQL 15  │              │    Redis 7      │            │
│ │ Electoral Data  │              │ Session Cache   │            │
│ │ News Analytics  │              │ Rate Limiting   │            │
│ │ Indian Timezone │              │ Task Queue      │            │
│ └─────────────────┘              └─────────────────┘            │
└─────────────────────────────────────────────────────────────────┘
```

## 🚀 Quick Start Deployment

### Prerequisites

1. **Google Cloud Project** with billing enabled
2. **Domain name** pointed to your deployment
3. **Required API keys**:
   - Google Gemini 2.5 Pro API key
   - Perplexity AI API key  
   - News API key (optional)
   - Twitter/X Bearer Token (optional)

### Step 1: Environment Setup

```bash
# Clone repository
git clone <your-repo-url> lokdarpan
cd lokdarpan

# Copy and customize environment file
cp deployment/production.env.template .env

# Edit .env with your configuration
nano .env
```

### Step 2: Infrastructure Deployment

```bash
# Make deployment script executable
chmod +x deployment/scripts/deploy.sh

# Run full deployment (includes GCP infrastructure)
./deployment/scripts/deploy.sh

# Or run deployment without GCP setup
SKIP_GCP=true ./deployment/scripts/deploy.sh
```

### Step 3: Validation

```bash
# Make validation script executable
chmod +x deployment/scripts/validate-deployment.sh

# Run comprehensive validation
./deployment/scripts/validate-deployment.sh

# Or run specific validation tests
./deployment/scripts/validate-deployment.sh api
./deployment/scripts/validate-deployment.sh sse
./deployment/scripts/validate-deployment.sh performance
```

## 🔧 Manual Deployment Steps

### 1. Network Infrastructure Setup (GCP)

#### Create VPC and Firewall Rules

```bash
# Set project
export GOOGLE_CLOUD_PROJECT=your-project-id
gcloud config set project $GOOGLE_CLOUD_PROJECT

# Deploy infrastructure
gcloud deployment-manager deployments create lokdarpan-infrastructure \
    --config=deployment/gcp-infrastructure.yml

# Get static IP
export STATIC_IP=$(gcloud compute addresses describe lokdarpan-static-ip \
    --region=asia-south1 --format="value(address)")

echo "Configure DNS A record: your-domain.com -> $STATIC_IP"
```

#### Alternative: Manual GCP Setup

```bash
# Create VPC network
gcloud compute networks create lokdarpan-vpc --subnet-mode=custom

# Create subnet in Mumbai region
gcloud compute networks subnets create lokdarpan-subnet \
    --network=lokdarpan-vpc \
    --range=10.1.0.0/24 \
    --region=asia-south1

# Create firewall rules
gcloud compute firewall-rules create lokdarpan-allow-http-https \
    --network=lokdarpan-vpc \
    --allow=tcp:80,tcp:443 \
    --source-ranges=0.0.0.0/0 \
    --target-tags=lokdarpan-web

gcloud compute firewall-rules create lokdarpan-allow-ssh \
    --network=lokdarpan-vpc \
    --allow=tcp:22 \
    --source-ranges=YOUR_IP_RANGE \
    --target-tags=lokdarpan-ssh

# Create compute instance
gcloud compute instances create lokdarpan-app-01 \
    --zone=asia-south1-a \
    --machine-type=e2-standard-4 \
    --subnet=lokdarpan-subnet \
    --address=$STATIC_IP \
    --boot-disk-size=100GB \
    --boot-disk-type=pd-ssd \
    --image-family=ubuntu-2204-lts \
    --image-project=ubuntu-os-cloud \
    --tags=lokdarpan-web,lokdarpan-ssh \
    --metadata-from-file startup-script=deployment/scripts/startup.sh
```

### 2. Server Preparation

#### Connect to Server

```bash
# SSH to your server
gcloud compute ssh lokdarpan-app-01 --zone=asia-south1-a

# Or use regular SSH
ssh -i your-key.pem user@$STATIC_IP
```

#### Install Docker and Dependencies

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose v2
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" \
    -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Create application directories
sudo mkdir -p /opt/lokdarpan/{data,logs,backups}
sudo mkdir -p /opt/lokdarpan/data/{postgres,redis,prometheus}
sudo chown -R $USER:$USER /opt/lokdarpan

# Set timezone to India
sudo timedatectl set-timezone Asia/Kolkata
```

### 3. Application Deployment

#### Clone and Configure

```bash
# Clone application
cd /opt/lokdarpan
git clone <your-repo-url> app
cd app

# Create environment file
cp deployment/production.env.template .env

# Edit configuration
nano .env
```

#### Deploy with Docker Compose

```bash
# Deploy infrastructure services first
docker-compose -f docker-compose.production-network.yml up -d postgres redis

# Wait for services to be ready
sleep 30

# Run database migrations
docker-compose -f docker-compose.production-network.yml run --rm backend flask db upgrade

# Deploy application services
docker-compose -f docker-compose.production-network.yml up -d backend celery-worker celery-beat

# Deploy frontend and proxy
docker-compose -f docker-compose.production-network.yml up -d frontend traefik

# Deploy monitoring
docker-compose -f docker-compose.production-network.yml up -d prometheus healthcheck
```

### 4. SSL/TLS Certificate Setup

#### Automatic Let's Encrypt (Recommended)

SSL certificates are automatically generated by Traefik using Let's Encrypt. Ensure:

1. DNS is properly configured
2. Ports 80 and 443 are open
3. Domain is accessible from the internet

#### Manual Certificate Setup (Optional)

```bash
# Generate certificate manually if needed
sudo certbot certonly --standalone -d your-domain.com -d www.your-domain.com

# Copy certificates to Docker volume
sudo cp /etc/letsencrypt/live/your-domain.com/* /opt/lokdarpan/deployment/ssl/
```

### 5. DNS Configuration

Configure the following DNS records:

```
A     lokdarpan.com                  YOUR_STATIC_IP
A     www.lokdarpan.com              YOUR_STATIC_IP  
A     api.lokdarpan.com              YOUR_STATIC_IP
A     admin.lokdarpan.com            YOUR_STATIC_IP
A     metrics.lokdarpan.com          YOUR_STATIC_IP
```

## 📊 API Endpoints

### Public Endpoints

```
GET  /api/v1/status                 # System status
GET  /api/v1/health                 # Health check
GET  /api/v1/time                   # Server time
GET  /api/v1/geojson                # Ward boundaries
```

### Authentication

```
POST /api/v1/login                  # User login
POST /api/v1/logout                 # User logout
GET  /api/v1/user                   # Current user info
```

### Political Data APIs

```
GET  /api/v1/posts                  # News posts
GET  /api/v1/trends                 # Sentiment trends
GET  /api/v1/competitive-analysis   # Party analysis
GET  /api/v1/pulse/{ward}           # Ward-specific insights
GET  /api/v1/alerts/{ward}          # Political alerts
```

### Political Strategist APIs

```
GET  /api/v1/strategist/health                    # AI service health
GET  /api/v1/strategist/{ward}?depth={level}     # Strategic analysis
GET  /api/v1/strategist/stream?ward={ward}       # SSE streaming
```

**Analysis Depth Levels:**
- `quick`: Fast overview analysis (5-10 seconds)
- `standard`: Comprehensive analysis (15-30 seconds)
- `deep`: Detailed multi-model analysis (30-60 seconds)

### SSE Streaming

Real-time political intelligence streaming via Server-Sent Events:

```javascript
const eventSource = new EventSource('/api/v1/strategist/stream?ward=Jubilee Hills');

eventSource.onmessage = function(event) {
    const data = JSON.parse(event.data);
    console.log('Political Intelligence Update:', data);
};

eventSource.addEventListener('analysis_start', function(event) {
    console.log('Analysis started:', event.data);
});

eventSource.addEventListener('analysis_complete', function(event) {
    console.log('Analysis complete:', JSON.parse(event.data));
});
```

## 🔒 Security Configuration

### Network Security

#### Firewall Rules (UFW)

```bash
# Configure UFW firewall
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp      # SSH
sudo ufw allow 80/tcp      # HTTP (redirects to HTTPS)
sudo ufw allow 443/tcp     # HTTPS
sudo ufw --force enable
```

#### Fail2Ban Configuration

```bash
# Install and configure Fail2Ban
sudo apt install fail2ban

# Create custom jail
sudo tee /etc/fail2ban/jail.local << EOF
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 3

[sshd]
enabled = true
port = 22
filter = sshd
logpath = /var/log/auth.log
maxretry = 3

[traefik-auth]
enabled = true
port = http,https
filter = traefik-auth
logpath = /opt/lokdarpan/logs/access.log
maxretry = 5
EOF

# Start Fail2Ban
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

### Application Security

#### Environment Variables

```bash
# Generate secure keys
export SECRET_KEY=$(openssl rand -base64 32)
export DB_PASSWORD=$(openssl rand -base64 24)

# Create authentication hashes for admin access
export TRAEFIK_ADMIN_AUTH=$(htpasswd -nb admin your_admin_password)
export METRICS_AUTH=$(htpasswd -nb metrics your_metrics_password)
```

#### API Rate Limiting

Rate limiting is configured in Traefik:

- **Standard APIs**: 100 requests/minute
- **Heavy Operations**: 20 requests/minute  
- **Authentication**: 10 requests/minute
- **SSE Streaming**: 20 connections/minute

## ⚡ Performance Optimization

### Geographic Optimization for Indian Users

1. **Server Location**: Asia South 1 (Mumbai) region
2. **CDN Configuration**: Regional content delivery
3. **Database Timezone**: Asia/Kolkata
4. **Caching Strategy**: Redis with LRU eviction
5. **Connection Pooling**: PostgreSQL connection optimization

### Database Performance

```sql
-- Key PostgreSQL optimizations applied
ALTER SYSTEM SET shared_buffers = '256MB';
ALTER SYSTEM SET effective_cache_size = '1GB'; 
ALTER SYSTEM SET maintenance_work_mem = '64MB';
ALTER SYSTEM SET checkpoint_completion_target = 0.7;
ALTER SYSTEM SET wal_buffers = '16MB';
ALTER SYSTEM SET default_statistics_target = 100;
ALTER SYSTEM SET random_page_cost = 1.1;
SELECT pg_reload_conf();
```

### Redis Optimization

```bash
# Redis configuration optimized for campaign data
CONFIG SET maxmemory 512mb
CONFIG SET maxmemory-policy allkeys-lru
CONFIG SET timeout 300
CONFIG SET tcp-keepalive 300
```

## 📈 Monitoring and Health Checks

### Health Check Endpoints

```
GET /api/v1/health                  # Overall system health
GET /api/v1/health/database         # Database connectivity
GET /api/v1/health/redis           # Redis connectivity  
GET /api/v1/strategist/health      # AI services health
```

### Prometheus Metrics

Access metrics at `https://metrics.your-domain.com`:

- Application performance metrics
- Database connection metrics
- Redis cache hit rates
- API response times
- Error rates and status codes

### Log Aggregation

Logs are collected in `/opt/lokdarpan/logs/`:

```bash
# View application logs
docker logs lokdarpan-backend

# View Traefik access logs  
tail -f /opt/lokdarpan/deployment/logs/access.log

# View system health
docker logs lokdarpan-healthcheck
```

## 🔄 Backup and Disaster Recovery

### Automated Backup System

Daily backups are configured via cron:

```bash
# View backup schedule
crontab -l

# Manual backup
/opt/lokdarpan/deployment/scripts/backup.sh

# Restore from backup
/opt/lokdarpan/deployment/scripts/restore.sh backup_name
```

### Database Backup

```bash
# Manual database backup
docker-compose exec postgres pg_dump -U postgres lokdarpan_db > backup.sql

# Restore database
docker-compose exec -T postgres psql -U postgres lokdarpan_db < backup.sql
```

## 🧪 Testing and Validation

### Automated Testing

```bash
# Run full validation suite
./deployment/scripts/validate-deployment.sh

# Test specific components
./deployment/scripts/validate-deployment.sh api
./deployment/scripts/validate-deployment.sh ssl
./deployment/scripts/validate-deployment.sh performance
./deployment/scripts/validate-deployment.sh sse
```

### Manual Testing

#### API Endpoint Testing

```bash
# Test public endpoints
curl -i https://your-domain.com/api/v1/status
curl -i https://your-domain.com/api/v1/health

# Test authentication
curl -X POST -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"password"}' \
  -c cookies.txt https://your-domain.com/api/v1/login

# Test authenticated endpoints
curl -b cookies.txt https://your-domain.com/api/v1/posts

# Test SSE streaming
curl -N -H "Accept: text/event-stream" \
  https://your-domain.com/api/v1/strategist/stream?ward=Jubilee%20Hills
```

#### Performance Testing

```bash
# Load testing with Apache Bench
ab -n 100 -c 10 https://your-domain.com/api/v1/status

# SSL/TLS testing
nmap --script ssl-enum-ciphers -p 443 your-domain.com
```

## 🚨 Troubleshooting

### Common Issues

#### SSL Certificate Problems

```bash
# Check certificate status
openssl s_client -connect your-domain.com:443 -servername your-domain.com

# View Traefik logs for certificate issues
docker logs lokdarpan-traefik

# Force certificate renewal
docker-compose exec traefik traefik version
```

#### Database Connection Issues

```bash
# Check database health
docker exec lokdarpan-postgres pg_isready -U postgres

# View database logs
docker logs lokdarpan-postgres

# Reset database connections
docker-compose restart backend
```

#### High CPU/Memory Usage

```bash
# Monitor resource usage
docker stats

# Check system resources
htop
df -h
free -h

# Restart memory-intensive services
docker-compose restart celery-worker
```

### Service Management

```bash
# View all services
docker-compose -f docker-compose.production-network.yml ps

# Restart specific service
docker-compose -f docker-compose.production-network.yml restart backend

# View service logs
docker-compose -f docker-compose.production-network.yml logs -f backend

# Update application
git pull
docker-compose -f docker-compose.production-network.yml up -d --build
```

## 📞 Support and Maintenance

### Regular Maintenance Tasks

1. **Weekly**: Review system logs and performance metrics
2. **Monthly**: Update Docker images and security patches  
3. **Quarterly**: Review and rotate API keys
4. **As needed**: Scale resources based on usage patterns

### Monitoring Alerts

Configure alerts for:

- High error rates (>5%)
- Slow response times (>2 seconds)
- Database connection failures
- SSL certificate expiration
- Disk space usage (>80%)

### Scaling Considerations

For high-traffic deployments:

1. **Load Balancer**: Add multiple application instances
2. **Database**: Consider Cloud SQL with read replicas
3. **Caching**: Implement Redis Cluster
4. **CDN**: Configure global content delivery
5. **Monitoring**: Add detailed APM tools

---

## 🎯 Next Steps

After successful deployment:

1. ✅ Configure monitoring alerts
2. ✅ Set up team access and permissions  
3. ✅ Train campaign team on system usage
4. ✅ Schedule regular maintenance windows
5. ✅ Plan disaster recovery procedures
6. ✅ Set up development/staging environments
7. ✅ Configure CI/CD pipelines for updates

**🎉 Your LokDarpan political intelligence platform is now ready for production use!**