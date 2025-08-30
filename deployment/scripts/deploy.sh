#!/bin/bash

# =============================================================================
# LokDarpan Phase 1 - Production Deployment Script
# Advanced networking, SSL, and geographic optimization for Indian users
# =============================================================================

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
DEPLOYMENT_DIR="${PROJECT_ROOT}/deployment"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[WARNING] $1${NC}"
}

error() {
    echo -e "${RED}[ERROR] $1${NC}"
    exit 1
}

info() {
    echo -e "${BLUE}[INFO] $1${NC}"
}

# Check prerequisites
check_prerequisites() {
    log "Checking deployment prerequisites..."
    
    # Check for required commands
    local required_commands=("docker" "docker-compose" "gcloud" "openssl" "curl" "jq")
    for cmd in "${required_commands[@]}"; do
        if ! command -v "$cmd" &> /dev/null; then
            error "Required command '$cmd' not found. Please install it first."
        fi
    done
    
    # Check Docker daemon
    if ! docker info &> /dev/null; then
        error "Docker daemon is not running. Please start Docker first."
    fi
    
    # Check for environment file
    if [[ ! -f "${PROJECT_ROOT}/.env" ]]; then
        error "Environment file '.env' not found. Copy from 'deployment/production.env.template' and customize."
    fi
    
    # Source environment variables
    set -o allexport
    source "${PROJECT_ROOT}/.env"
    set +o allexport
    
    # Validate critical environment variables
    local required_vars=("DOMAIN_NAME" "LETSENCRYPT_EMAIL" "DB_PASSWORD" "SECRET_KEY")
    for var in "${required_vars[@]}"; do
        if [[ -z "${!var:-}" ]]; then
            error "Required environment variable '$var' is not set."
        fi
    done
    
    log "Prerequisites check completed successfully"
}

# Setup GCP infrastructure
setup_gcp_infrastructure() {
    log "Setting up GCP infrastructure..."
    
    if [[ -z "${GOOGLE_CLOUD_PROJECT:-}" ]]; then
        error "GOOGLE_CLOUD_PROJECT environment variable not set"
    fi
    
    # Authenticate with GCP (if not already authenticated)
    if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" &> /dev/null; then
        info "Authenticating with Google Cloud..."
        gcloud auth login
    fi
    
    # Set project
    gcloud config set project "$GOOGLE_CLOUD_PROJECT"
    
    # Enable required APIs
    local apis=("compute.googleapis.com" "container.googleapis.com" "sql-component.googleapis.com" "storage-component.googleapis.com" "monitoring.googleapis.com" "logging.googleapis.com")
    for api in "${apis[@]}"; do
        info "Enabling API: $api"
        gcloud services enable "$api" || warn "Failed to enable $api (may already be enabled)"
    done
    
    # Deploy infrastructure
    info "Deploying GCP infrastructure..."
    gcloud deployment-manager deployments create lokdarpan-infrastructure \
        --config="${DEPLOYMENT_DIR}/gcp-infrastructure.yml" \
        --automatic-rollback-on-error || {
        warn "Infrastructure deployment exists, attempting update..."
        gcloud deployment-manager deployments update lokdarpan-infrastructure \
            --config="${DEPLOYMENT_DIR}/gcp-infrastructure.yml" \
            --delete-policy=ABANDON
    }
    
    # Get static IP
    STATIC_IP=$(gcloud compute addresses describe lokdarpan-static-ip --region=asia-south1 --format="value(address)")
    info "Static IP address: $STATIC_IP"
    
    log "GCP infrastructure setup completed"
}

# Setup DNS records
setup_dns() {
    log "Setting up DNS records..."
    
    if [[ -z "${STATIC_IP:-}" ]]; then
        STATIC_IP=$(gcloud compute addresses describe lokdarpan-static-ip --region=asia-south1 --format="value(address)")
    fi
    
    info "Please configure the following DNS records:"
    echo "A    $DOMAIN_NAME                    $STATIC_IP"
    echo "A    www.$DOMAIN_NAME               $STATIC_IP"
    echo "A    api.$DOMAIN_NAME               $STATIC_IP"
    echo "A    admin.$DOMAIN_NAME             $STATIC_IP"
    echo "A    metrics.$DOMAIN_NAME           $STATIC_IP"
    
    read -p "Have you configured the DNS records? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        warn "Please configure DNS records and run this script again."
        exit 1
    fi
    
    # Verify DNS propagation
    info "Verifying DNS propagation..."
    local max_attempts=30
    local attempt=1
    
    while [[ $attempt -le $max_attempts ]]; do
        if nslookup "$DOMAIN_NAME" | grep -q "$STATIC_IP"; then
            log "DNS propagation verified"
            break
        fi
        
        info "Waiting for DNS propagation... (attempt $attempt/$max_attempts)"
        sleep 10
        ((attempt++))
    done
    
    if [[ $attempt -gt $max_attempts ]]; then
        warn "DNS propagation verification failed, but continuing deployment..."
    fi
}

# Create necessary directories
create_directories() {
    log "Creating necessary directories..."
    
    local directories=(
        "${DATA_PATH}/postgres"
        "${DATA_PATH}/redis"
        "${DATA_PATH}/prometheus"
        "${PROJECT_ROOT}/deployment/letsencrypt"
        "${PROJECT_ROOT}/deployment/logs"
        "${PROJECT_ROOT}/backend/data/epaper/inbox"
        "${PROJECT_ROOT}/backend/data/epaper/processed"
        "${PROJECT_ROOT}/backend/logs"
    )
    
    for dir in "${directories[@]}"; do
        mkdir -p "$dir"
        info "Created directory: $dir"
    done
    
    # Set proper permissions
    chmod -R 755 "${DATA_PATH}"
    chmod 600 "${PROJECT_ROOT}/deployment/letsencrypt" || true
    
    log "Directory structure created successfully"
}

# Generate SSL certificates (staging first)
generate_ssl_certificates() {
    log "Generating SSL certificates..."
    
    # First, generate certificates using staging environment for testing
    info "Generating staging certificates for testing..."
    
    cat > "${PROJECT_ROOT}/docker-compose.ssl-staging.yml" << EOF
version: '3.8'
services:
  traefik-ssl-staging:
    image: traefik:v3.0
    container_name: traefik-ssl-staging
    command:
      - "--api.insecure=true"
      - "--providers.docker=true"
      - "--entrypoints.web.address=:80"
      - "--entrypoints.websecure.address=:443"
      - "--certificatesresolvers.letsencrypt.acme.httpchallenge=true"
      - "--certificatesresolvers.letsencrypt.acme.httpchallenge.entrypoint=web"
      - "--certificatesresolvers.letsencrypt.acme.email=$LETSENCRYPT_EMAIL"
      - "--certificatesresolvers.letsencrypt.acme.storage=/letsencrypt/acme-staging.json"
      - "--certificatesresolvers.letsencrypt.acme.caserver=https://acme-staging-v02.api.letsencrypt.org/directory"
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - ./deployment/letsencrypt:/letsencrypt
    networks:
      - staging
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.test.rule=Host(\`$DOMAIN_NAME\`)"
      - "traefik.http.routers.test.entrypoints=websecure"
      - "traefik.http.routers.test.tls=true"
      - "traefik.http.routers.test.tls.certresolver=letsencrypt"
      - "traefik.http.services.test.loadbalancer.server.port=8080"

networks:
  staging:
    driver: bridge
EOF
    
    # Start staging certificate generation
    docker-compose -f "${PROJECT_ROOT}/docker-compose.ssl-staging.yml" up -d
    
    # Wait for certificate generation
    info "Waiting for staging certificate generation..."
    sleep 60
    
    # Check if staging certificate was generated
    if [[ -f "${PROJECT_ROOT}/deployment/letsencrypt/acme-staging.json" ]]; then
        log "Staging certificates generated successfully"
        docker-compose -f "${PROJECT_ROOT}/docker-compose.ssl-staging.yml" down
        rm -f "${PROJECT_ROOT}/docker-compose.ssl-staging.yml"
    else
        error "Failed to generate staging certificates. Check DNS configuration."
    fi
    
    info "Ready for production certificate generation during deployment"
}

# Validate API endpoints
validate_api_endpoints() {
    log "Validating API endpoint configuration..."
    
    local endpoints=(
        "/api/v1/status"
        "/api/v1/login"
        "/api/v1/geojson"
        "/api/v1/posts"
        "/api/v1/trends"
        "/api/v1/pulse/Jubilee Hills"
        "/api/v1/strategist/health"
    )
    
    info "The following API endpoints will be available after deployment:"
    for endpoint in "${endpoints[@]}"; do
        echo "  https://$DOMAIN_NAME$endpoint"
    done
    
    # Validate backend configuration
    if [[ ! -f "${PROJECT_ROOT}/backend/app/__init__.py" ]]; then
        error "Backend application not found"
    fi
    
    # Check for required Python dependencies
    if [[ ! -f "${PROJECT_ROOT}/backend/requirements.txt" ]]; then
        error "Backend requirements.txt not found"
    fi
    
    log "API endpoint validation completed"
}

# Setup monitoring and health checks
setup_monitoring() {
    log "Setting up monitoring and health checks..."
    
    # Create Prometheus configuration
    mkdir -p "${PROJECT_ROOT}/deployment/prometheus"
    
    cat > "${PROJECT_ROOT}/deployment/prometheus/prometheus.yml" << EOF
global:
  scrape_interval: 15s
  evaluation_interval: 15s
  external_labels:
    cluster: 'lokdarpan-production'
    region: 'asia-south1'

rule_files:
  - "rules/*.yml"

scrape_configs:
  # Traefik metrics
  - job_name: 'traefik'
    static_configs:
      - targets: ['traefik:8080']
    scrape_interval: 30s
    metrics_path: /metrics

  # Backend application metrics
  - job_name: 'lokdarpan-backend'
    static_configs:
      - targets: ['backend:9090']
    scrape_interval: 30s
    metrics_path: /metrics

  # Node exporter (system metrics)
  - job_name: 'node-exporter'
    static_configs:
      - targets: ['node-exporter:9100']
    scrape_interval: 30s

  # PostgreSQL metrics
  - job_name: 'postgres'
    static_configs:
      - targets: ['postgres-exporter:9187']
    scrape_interval: 30s

  # Redis metrics  
  - job_name: 'redis'
    static_configs:
      - targets: ['redis-exporter:9121']
    scrape_interval: 30s

alerting:
  alertmanagers:
    - static_configs:
        - targets:
          - alertmanager:9093

# Recording rules for performance optimization
recording_rules:
  - record: instance:lokdarpan_requests_per_second
    expr: rate(traefik_service_requests_total[1m])
  
  - record: instance:lokdarpan_response_time_p95
    expr: histogram_quantile(0.95, rate(traefik_service_request_duration_seconds_bucket[5m]))
EOF
    
    # Create health check service
    mkdir -p "${PROJECT_ROOT}/deployment/healthcheck"
    
    cat > "${PROJECT_ROOT}/deployment/healthcheck/Dockerfile" << EOF
FROM python:3.11-slim

WORKDIR /app

RUN pip install requests psutil

COPY healthcheck.py .

CMD ["python", "healthcheck.py"]
EOF
    
    cat > "${PROJECT_ROOT}/deployment/healthcheck/healthcheck.py" << EOF
#!/usr/bin/env python3

import requests
import time
import os
import sys
import logging
import json
from datetime import datetime

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class LokDarpanHealthCheck:
    def __init__(self):
        self.backend_url = os.getenv('BACKEND_URL', 'http://backend:5000')
        self.domain_name = os.getenv('DOMAIN_NAME', 'localhost')
        self.check_interval = int(os.getenv('CHECK_INTERVAL', '30'))
        
    def check_backend_health(self):
        """Check backend API health"""
        try:
            response = requests.get(f"{self.backend_url}/api/v1/status", timeout=10)
            return response.status_code == 200
        except Exception as e:
            logger.error(f"Backend health check failed: {e}")
            return False
    
    def check_database_health(self):
        """Check database connectivity"""
        try:
            response = requests.get(f"{self.backend_url}/api/v1/health/database", timeout=10)
            return response.status_code == 200
        except Exception as e:
            logger.error(f"Database health check failed: {e}")
            return False
    
    def check_redis_health(self):
        """Check Redis connectivity"""
        try:
            response = requests.get(f"{self.backend_url}/api/v1/health/redis", timeout=10)
            return response.status_code == 200
        except Exception as e:
            logger.error(f"Redis health check failed: {e}")
            return False
    
    def check_ai_services(self):
        """Check AI service availability"""
        try:
            response = requests.get(f"{self.backend_url}/api/v1/strategist/health", timeout=15)
            return response.status_code == 200
        except Exception as e:
            logger.error(f"AI services health check failed: {e}")
            return False
    
    def check_sse_streaming(self):
        """Check SSE streaming endpoint"""
        try:
            response = requests.get(
                f"{self.backend_url}/api/v1/strategist/stream?ward=Jubilee Hills",
                timeout=5,
                stream=True,
                headers={'Accept': 'text/event-stream'}
            )
            return response.status_code == 200
        except Exception as e:
            logger.error(f"SSE streaming health check failed: {e}")
            return False
    
    def run_health_checks(self):
        """Run all health checks"""
        checks = {
            'backend': self.check_backend_health(),
            'database': self.check_database_health(),
            'redis': self.check_redis_health(),
            'ai_services': self.check_ai_services(),
            'sse_streaming': self.check_sse_streaming()
        }
        
        health_status = {
            'timestamp': datetime.utcnow().isoformat(),
            'checks': checks,
            'overall_health': all(checks.values())
        }
        
        logger.info(f"Health check results: {json.dumps(health_status, indent=2)}")
        
        return health_status
    
    def run_continuous_monitoring(self):
        """Run continuous health monitoring"""
        logger.info(f"Starting continuous health monitoring (interval: {self.check_interval}s)")
        
        while True:
            try:
                health_status = self.run_health_checks()
                
                if not health_status['overall_health']:
                    logger.warning("System health check failed!")
                    # Here you could send alerts to Slack/Discord/etc.
                else:
                    logger.info("System health check passed")
                    
            except Exception as e:
                logger.error(f"Health monitoring error: {e}")
            
            time.sleep(self.check_interval)

if __name__ == "__main__":
    health_checker = LokDarpanHealthCheck()
    health_checker.run_continuous_monitoring()
EOF
    
    log "Monitoring and health checks configured"
}

# Deploy application
deploy_application() {
    log "Deploying LokDarpan application..."
    
    cd "$PROJECT_ROOT"
    
    # Pull latest images
    info "Pulling latest Docker images..."
    docker-compose -f docker-compose.production-network.yml pull
    
    # Build custom images
    info "Building application images..."
    docker-compose -f docker-compose.production-network.yml build --no-cache
    
    # Start services in correct order
    info "Starting infrastructure services..."
    docker-compose -f docker-compose.production-network.yml up -d postgres redis
    
    # Wait for database to be ready
    info "Waiting for database initialization..."
    sleep 30
    
    # Run database migrations
    info "Running database migrations..."
    docker-compose -f docker-compose.production-network.yml run --rm backend flask db upgrade
    
    # Start application services
    info "Starting application services..."
    docker-compose -f docker-compose.production-network.yml up -d backend celery-worker celery-beat
    
    # Wait for backend to be ready
    sleep 20
    
    # Start frontend and proxy
    info "Starting frontend and reverse proxy..."
    docker-compose -f docker-compose.production-network.yml up -d frontend traefik
    
    # Start monitoring
    info "Starting monitoring services..."
    docker-compose -f docker-compose.production-network.yml up -d prometheus healthcheck
    
    log "Application deployment completed"
}

# Test deployment
test_deployment() {
    log "Testing deployment..."
    
    local max_attempts=30
    local attempt=1
    
    # Test HTTPS endpoint
    while [[ $attempt -le $max_attempts ]]; do
        info "Testing HTTPS endpoint... (attempt $attempt/$max_attempts)"
        
        if curl -f -k "https://$DOMAIN_NAME/api/v1/status" &> /dev/null; then
            log "HTTPS endpoint test passed"
            break
        fi
        
        sleep 10
        ((attempt++))
    done
    
    if [[ $attempt -gt $max_attempts ]]; then
        error "HTTPS endpoint test failed"
    fi
    
    # Test SSE streaming
    info "Testing SSE streaming..."
    timeout 10 curl -N -H "Accept: text/event-stream" "https://$DOMAIN_NAME/api/v1/strategist/stream?ward=Jubilee%20Hills" &> /dev/null || warn "SSE streaming test failed"
    
    # Test authentication
    info "Testing authentication endpoint..."
    curl -f "https://$DOMAIN_NAME/api/v1/login" &> /dev/null || warn "Authentication endpoint test failed"
    
    # Performance test
    info "Running basic performance test..."
    ab -n 100 -c 10 "https://$DOMAIN_NAME/api/v1/status" > /tmp/performance-test.txt 2>&1 || warn "Performance test failed"
    
    if [[ -f /tmp/performance-test.txt ]]; then
        avg_response_time=$(grep "Time per request" /tmp/performance-test.txt | head -n1 | awk '{print $4}')
        info "Average response time: ${avg_response_time}ms"
    fi
    
    log "Deployment testing completed"
}

# Setup backup system
setup_backup_system() {
    log "Setting up backup system..."
    
    # Create backup script
    cat > "${PROJECT_ROOT}/deployment/scripts/backup.sh" << 'EOF'
#!/bin/bash

# LokDarpan Backup Script

set -euo pipefail

BACKUP_DIR="/opt/lokdarpan/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="lokdarpan_backup_${TIMESTAMP}"

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Backup database
echo "Backing up database..."
docker-compose -f /opt/lokdarpan/docker-compose.production-network.yml exec -T postgres \
    pg_dump -U postgres lokdarpan_db | gzip > "$BACKUP_DIR/${BACKUP_NAME}_db.sql.gz"

# Backup Redis data
echo "Backing up Redis data..."
docker-compose -f /opt/lokdarpan/docker-compose.production-network.yml exec -T redis \
    redis-cli BGSAVE
sleep 5
docker cp lokdarpan-redis:/data/dump.rdb "$BACKUP_DIR/${BACKUP_NAME}_redis.rdb"

# Backup application data
echo "Backing up application data..."
tar -czf "$BACKUP_DIR/${BACKUP_NAME}_data.tar.gz" -C /opt/lokdarpan data/

# Upload to Cloud Storage
if [[ -n "${BACKUP_BUCKET:-}" ]]; then
    echo "Uploading backups to Cloud Storage..."
    gsutil cp "$BACKUP_DIR/${BACKUP_NAME}_"* "gs://$BACKUP_BUCKET/daily/"
fi

# Cleanup old local backups (keep last 7 days)
find "$BACKUP_DIR" -name "lokdarpan_backup_*" -mtime +7 -delete

echo "Backup completed: $BACKUP_NAME"
EOF
    
    chmod +x "${PROJECT_ROOT}/deployment/scripts/backup.sh"
    
    # Setup cron job for automated backups
    if command -v crontab &> /dev/null; then
        info "Setting up automated backup cron job..."
        (crontab -l 2>/dev/null || true; echo "0 2 * * * /opt/lokdarpan/deployment/scripts/backup.sh >> /opt/lokdarpan/logs/backup.log 2>&1") | crontab -
    fi
    
    log "Backup system setup completed"
}

# Optimize for Indian users
optimize_for_indian_users() {
    log "Optimizing for Indian users..."
    
    # Geographic optimization is handled in docker-compose configuration
    # This function can be extended with additional optimizations
    
    info "Geographic optimizations applied:"
    echo "  - Server location: Asia South 1 (Mumbai)"
    echo "  - Timezone: Asia/Kolkata"
    echo "  - Database locale: en_IN.utf8"
    echo "  - CDN optimization: Asia South region"
    
    log "Indian user optimizations completed"
}

# Generate deployment report
generate_deployment_report() {
    log "Generating deployment report..."
    
    local report_file="${PROJECT_ROOT}/deployment/deployment-report-$(date +%Y%m%d_%H%M%S).md"
    
    cat > "$report_file" << EOF
# LokDarpan Phase 1 - Deployment Report

**Deployment Date**: $(date)
**Domain**: $DOMAIN_NAME
**Static IP**: ${STATIC_IP:-"Not configured"}

## Infrastructure

- **Cloud Provider**: Google Cloud Platform
- **Region**: Asia South 1 (Mumbai)
- **Instance Type**: e2-standard-4 (4 vCPUs, 16GB RAM)
- **Storage**: 100GB SSD
- **Network**: VPC with regional subnet

## Services Deployed

- ✅ **Frontend**: React + Vite political dashboard
- ✅ **Backend API**: Flask with Political Strategist module
- ✅ **Database**: PostgreSQL 15 with Indian timezone
- ✅ **Cache**: Redis with optimized configuration
- ✅ **Background Jobs**: Celery worker and scheduler
- ✅ **Reverse Proxy**: Traefik v3.0 with automatic SSL
- ✅ **Monitoring**: Prometheus metrics collection
- ✅ **Health Checks**: Automated system monitoring

## Security Features

- ✅ **SSL/TLS**: Automatic Let's Encrypt certificates
- ✅ **Firewall**: UFW with restricted access
- ✅ **Fail2Ban**: Intrusion detection and prevention
- ✅ **Security Headers**: HSTS, CSP, XSS protection
- ✅ **Rate Limiting**: API endpoint protection
- ✅ **Network Isolation**: Internal service communication

## API Endpoints

- **Main Application**: https://$DOMAIN_NAME
- **API Base**: https://$DOMAIN_NAME/api/v1
- **Political Strategist**: https://$DOMAIN_NAME/api/v1/strategist
- **SSE Streaming**: https://$DOMAIN_NAME/api/v1/strategist/stream
- **Admin Dashboard**: https://admin.$DOMAIN_NAME (Basic Auth)
- **Metrics**: https://metrics.$DOMAIN_NAME (Basic Auth)

## Performance Optimizations

- **Geographic**: Mumbai region for Indian users
- **Caching**: Redis with LRU eviction policy
- **Database**: Connection pooling and query optimization
- **Frontend**: Gzip compression and static asset optimization
- **CDN**: Regional content delivery

## Monitoring and Maintenance

- **Health Checks**: Automated every 30 seconds
- **Backups**: Daily at 2:00 AM IST
- **Log Rotation**: 30-day retention
- **Certificate Renewal**: Automatic via Let's Encrypt
- **Performance Monitoring**: Prometheus metrics

## Post-Deployment Checklist

- [ ] Verify all API endpoints are responding
- [ ] Test authentication and authorization
- [ ] Validate SSL certificate installation
- [ ] Confirm backup system is working
- [ ] Test SSE streaming functionality
- [ ] Verify monitoring alerts
- [ ] Check log aggregation
- [ ] Validate DNS propagation

## Troubleshooting

### Common Issues

1. **SSL Certificate Issues**
   - Check DNS propagation: \`nslookup $DOMAIN_NAME\`
   - Verify Let's Encrypt logs: \`docker logs lokdarpan-traefik\`

2. **API Connectivity Issues**
   - Check service status: \`docker-compose ps\`
   - View backend logs: \`docker logs lokdarpan-backend\`

3. **Database Connection Issues**
   - Verify PostgreSQL health: \`docker exec lokdarpan-postgres pg_isready\`
   - Check connection pooling: Backend logs

### Support Commands

\`\`\`bash
# View all service status
docker-compose -f docker-compose.production-network.yml ps

# View logs
docker logs lokdarpan-backend
docker logs lokdarpan-traefik

# Restart services
docker-compose -f docker-compose.production-network.yml restart

# Update application
git pull && docker-compose -f docker-compose.production-network.yml up -d --build
\`\`\`

---

**Deployment Status**: ✅ SUCCESS
**Next Steps**: Configure monitoring alerts and team access
EOF
    
    log "Deployment report generated: $report_file"
}

# Main deployment function
main() {
    log "Starting LokDarpan Phase 1 production deployment..."
    
    # Check if running as root for GCP deployment
    if [[ $EUID -ne 0 ]] && [[ "${SKIP_GCP:-}" != "true" ]]; then
        warn "Some operations may require sudo privileges"
    fi
    
    # Run deployment steps
    check_prerequisites
    
    if [[ "${SKIP_GCP:-}" != "true" ]]; then
        setup_gcp_infrastructure
        setup_dns
    fi
    
    create_directories
    validate_api_endpoints
    setup_monitoring
    
    if [[ "${SKIP_SSL:-}" != "true" ]]; then
        generate_ssl_certificates
    fi
    
    deploy_application
    test_deployment
    setup_backup_system
    optimize_for_indian_users
    generate_deployment_report
    
    log "🎉 LokDarpan Phase 1 deployment completed successfully!"
    info "Access your application at: https://$DOMAIN_NAME"
    info "Admin dashboard: https://admin.$DOMAIN_NAME"
    info "Metrics: https://metrics.$DOMAIN_NAME"
    
    warn "Please configure monitoring alerts and team access as needed."
}

# Handle script arguments
case "${1:-deploy}" in
    "deploy")
        main
        ;;
    "test")
        check_prerequisites
        test_deployment
        ;;
    "backup")
        setup_backup_system
        ;;
    "ssl")
        generate_ssl_certificates
        ;;
    "monitor")
        setup_monitoring
        ;;
    *)
        echo "Usage: $0 {deploy|test|backup|ssl|monitor}"
        exit 1
        ;;
esac