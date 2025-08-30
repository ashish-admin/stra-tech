#!/bin/bash

# Enhanced Local deployment script - runs on the VM to deploy the production-ready application
# This script deploys the enhanced production configuration with monitoring, security, and performance optimizations
set -e

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
COMPOSE_FILE="docker-compose.production-enhanced.yml"
ENV_FILE=".env.production-enhanced"
LOG_FILE="/var/log/lokdarpan-deployment.log"

# Function to log with timestamp
log() {
    echo -e "$1"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE" 2>/dev/null || true
}

# Function to check command success
check_success() {
    if [ $? -eq 0 ]; then
        log "${GREEN}✓ $1 successful${NC}"
    else
        log "${RED}✗ $1 failed${NC}"
        exit 1
    fi
}

# Function to wait for service health
wait_for_service() {
    local service=$1
    local url=$2
    local max_attempts=30
    local attempt=1
    
    log "${YELLOW}Waiting for $service to be healthy...${NC}"
    while [ $attempt -le $max_attempts ]; do
        if curl -f -s "$url" > /dev/null 2>&1; then
            log "${GREEN}✓ $service is healthy${NC}"
            return 0
        fi
        log "  Attempt $attempt/$max_attempts..."
        sleep 5
        attempt=$((attempt + 1))
    done
    
    log "${RED}✗ $service failed to become healthy${NC}"
    return 1
}

# Banner
echo ""
log "${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
log "${BLUE}║     LokDarpan Enhanced Production Deployment - Phase 5       ║${NC}"
log "${BLUE}║     Political Intelligence Platform with AI Integration      ║${NC}"
log "${BLUE}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Pre-flight checks
log "${GREEN}[1/12] Running pre-flight checks...${NC}"

# Check Docker
if ! command -v docker &> /dev/null; then
    log "${RED}Docker is not installed. Please run vm-setup-enhanced.sh first${NC}"
    exit 1
fi
check_success "Docker check"

# Check Docker Compose
if ! command -v docker-compose &> /dev/null; then
    log "${RED}Docker Compose is not installed. Please run vm-setup-enhanced.sh first${NC}"
    exit 1
fi
check_success "Docker Compose check"

# Check for enhanced environment file
if [ ! -f "$ENV_FILE" ]; then
    log "${YELLOW}Creating $ENV_FILE from template...${NC}"
    if [ -f "${ENV_FILE}.template" ]; then
        cp "${ENV_FILE}.template" "$ENV_FILE"
        log "${RED}IMPORTANT: Please edit $ENV_FILE with your configuration values:${NC}"
        log "  - Database passwords"
        log "  - API keys (Gemini, Perplexity, News API)"
        log "  - Domain name and SSL email"
        log "  - Redis password"
        log "  - Secret keys"
        exit 1
    else
        log "${RED}Template file ${ENV_FILE}.template not found${NC}"
        exit 1
    fi
fi
check_success "Environment configuration check"

# Load environment variables
log "${GREEN}[2/12] Loading environment configuration...${NC}"
set -a
source "$ENV_FILE"
set +a
check_success "Environment loading"

# Validate critical environment variables
log "${GREEN}[3/12] Validating configuration...${NC}"
REQUIRED_VARS=(
    "DB_PASSWORD"
    "REDIS_PASSWORD"
    "SECRET_KEY"
    "SSL_EMAIL"
    "GEMINI_API_KEY"
    "PERPLEXITY_API_KEY"
)

for var in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!var}" ]; then
        log "${RED}Missing required environment variable: $var${NC}"
        exit 1
    fi
done
check_success "Configuration validation"

# Create necessary directories
log "${GREEN}[4/12] Creating directory structure...${NC}"
mkdir -p backend/logs
mkdir -p backend/data/epaper/{inbox,processed,error}
mkdir -p backend/backups
mkdir -p frontend/logs
mkdir -p letsencrypt
mkdir -p backups
mkdir -p monitoring/{prometheus,grafana/{dashboards,datasources}}
mkdir -p certificates/{postgres,redis}
mkdir -p /var/log/lokdarpan
check_success "Directory creation"

# Set proper permissions
log "${GREEN}[5/12] Setting permissions...${NC}"
chmod -R 755 backend/logs
chmod -R 755 backend/data
chmod -R 755 frontend/logs
chmod -R 755 monitoring
chmod -R 700 certificates
check_success "Permission setting"

# Initialize monitoring configurations if missing
log "${GREEN}[6/12] Setting up monitoring configurations...${NC}"
if [ ! -f monitoring/prometheus/prometheus.yml ]; then
    cat > monitoring/prometheus/prometheus.yml << 'EOF'
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'lokdarpan-backend'
    static_configs:
      - targets: ['backend:5000']
    metrics_path: /metrics

  - job_name: 'postgres'
    static_configs:
      - targets: ['postgres-exporter:9187']

  - job_name: 'redis'
    static_configs:
      - targets: ['redis-exporter:9121']

  - job_name: 'node'
    static_configs:
      - targets: ['node-exporter:9100']

  - job_name: 'cadvisor'
    static_configs:
      - targets: ['cadvisor:8080']
EOF
fi

if [ ! -f monitoring/grafana/datasources/prometheus.yml ]; then
    cat > monitoring/grafana/datasources/prometheus.yml << 'EOF'
apiVersion: 1

datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://prometheus:9090
    isDefault: true
    editable: true
EOF
fi
check_success "Monitoring setup"

# Pull latest images
log "${GREEN}[7/12] Pulling Docker images...${NC}"
docker-compose -f "$COMPOSE_FILE" pull
check_success "Docker image pull"

# Build custom images with enhanced configurations
log "${GREEN}[8/12] Building enhanced application images...${NC}"
docker-compose -f "$COMPOSE_FILE" build --no-cache
check_success "Docker image build"

# Stop existing containers
log "${YELLOW}[9/12] Stopping existing containers...${NC}"
docker-compose -f "$COMPOSE_FILE" down --remove-orphans
check_success "Container cleanup"

# Start infrastructure services first
log "${GREEN}[10/12] Starting infrastructure services...${NC}"
docker-compose -f "$COMPOSE_FILE" up -d postgres redis traefik prometheus grafana
sleep 10
check_success "Infrastructure startup"

# Wait for database to be ready
wait_for_service "PostgreSQL" "localhost:5432" || true

# Start application services
log "${GREEN}[11/12] Starting application services...${NC}"
docker-compose -f "$COMPOSE_FILE" up -d
check_success "Application startup"

# Wait for services to be healthy
log "${YELLOW}Waiting for all services to be healthy...${NC}"
sleep 20

# Run database migrations
log "${GREEN}[12/12] Running database migrations and initialization...${NC}"
docker-compose -f "$COMPOSE_FILE" exec -T backend flask db upgrade
check_success "Database migrations"

# Seed initial data if needed
if [ "${SEED_DATA:-false}" == "true" ]; then
    log "${GREEN}Seeding initial demo data...${NC}"
    docker-compose -f "$COMPOSE_FILE" exec -T backend python scripts/reseed_demo_data.py
    check_success "Data seeding"
fi

# Health checks
log "${BLUE}════════════════════════════════════════════════════════${NC}"
log "${BLUE}Running health checks...${NC}"
log "${BLUE}════════════════════════════════════════════════════════${NC}"

# Check service status
docker-compose -f "$COMPOSE_FILE" ps

# Test critical endpoints
log "${GREEN}Testing service endpoints...${NC}"
wait_for_service "Backend API" "http://localhost/api/v1/status"
wait_for_service "Frontend" "http://localhost"
wait_for_service "Prometheus" "http://localhost:9090/-/healthy"
wait_for_service "Grafana" "http://localhost:3000/api/health"

# Check Political Strategist module
if [ -n "$GEMINI_API_KEY" ] && [ -n "$PERPLEXITY_API_KEY" ]; then
    log "${GREEN}Testing Political Strategist module...${NC}"
    curl -s http://localhost/api/v1/strategist/health | jq '.' || log "${YELLOW}Strategist module not responding${NC}"
fi

# Performance check
log "${GREEN}Running performance check...${NC}"
RESPONSE_TIME=$(curl -o /dev/null -s -w '%{time_total}' http://localhost/api/v1/status)
log "  API Response time: ${RESPONSE_TIME}s"

# Show recent logs
log "${GREEN}Recent application logs:${NC}"
docker-compose -f "$COMPOSE_FILE" logs --tail=20 backend frontend

# Generate deployment report
DEPLOYMENT_ID=$(date +%Y%m%d-%H%M%S)
REPORT_FILE="deployment-report-${DEPLOYMENT_ID}.txt"

cat > "$REPORT_FILE" << EOF
LokDarpan Enhanced Deployment Report
=====================================
Deployment ID: ${DEPLOYMENT_ID}
Date: $(date)
Environment: Production Enhanced
Version: Phase 5 - Ultra-Enhancement Ready

Services Status:
$(docker-compose -f "$COMPOSE_FILE" ps)

Resource Usage:
$(docker stats --no-stream)

Configuration:
- Domain: ${DOMAIN_NAME:-"localhost"}
- SSL Email: ${SSL_EMAIL}
- Database: PostgreSQL 15 with pgvector
- Cache: Redis with password protection
- Workers: Celery with Gunicorn/gevent
- Monitoring: Prometheus + Grafana
- Security: Traefik with SSL/TLS

AI Services:
- Gemini API: $([ -n "$GEMINI_API_KEY" ] && echo "Configured" || echo "Not configured")
- Perplexity API: $([ -n "$PERPLEXITY_API_KEY" ] && echo "Configured" || echo "Not configured")
- News API: $([ -n "$NEWS_API_KEY" ] && echo "Configured" || echo "Not configured")

Endpoints:
- Frontend: https://${DOMAIN_NAME:-"localhost"}
- Backend API: https://${DOMAIN_NAME:-"localhost"}/api
- Monitoring: https://${DOMAIN_NAME:-"localhost"}/grafana
- Metrics: https://${DOMAIN_NAME:-"localhost"}/prometheus

Health Check Results:
- Backend API: $(curl -s -o /dev/null -w "%{http_code}" http://localhost/api/v1/status)
- Frontend: $(curl -s -o /dev/null -w "%{http_code}" http://localhost)
- Database: $(docker-compose -f "$COMPOSE_FILE" exec -T postgres pg_isready > /dev/null 2>&1 && echo "Healthy" || echo "Unhealthy")
- Redis: $(docker-compose -f "$COMPOSE_FILE" exec -T redis redis-cli ping > /dev/null 2>&1 && echo "Healthy" || echo "Unhealthy")
EOF

log "${GREEN}Deployment report saved to: $REPORT_FILE${NC}"

# Success banner
echo ""
log "${GREEN}╔══════════════════════════════════════════════════════════════╗${NC}"
log "${GREEN}║           DEPLOYMENT SUCCESSFUL! 🚀                          ║${NC}"
log "${GREEN}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""

log "${BLUE}Service URLs:${NC}"
log "  📊 Frontend: ${GREEN}https://${DOMAIN_NAME:-"localhost"}${NC}"
log "  🔧 Backend API: ${GREEN}https://${DOMAIN_NAME:-"localhost"}/api${NC}"
log "  📈 Monitoring: ${GREEN}https://${DOMAIN_NAME:-"localhost"}/grafana${NC}"
log "  📉 Metrics: ${GREEN}https://${DOMAIN_NAME:-"localhost"}/prometheus${NC}"
echo ""

log "${BLUE}Database Access:${NC}"
log "  PostgreSQL: localhost:5432"
log "  Redis: localhost:6379"
echo ""

log "${BLUE}Useful Commands:${NC}"
log "  📋 View logs: ${YELLOW}docker-compose -f $COMPOSE_FILE logs -f [service]${NC}"
log "  🔄 Restart services: ${YELLOW}docker-compose -f $COMPOSE_FILE restart${NC}"
log "  ⏹️  Stop services: ${YELLOW}docker-compose -f $COMPOSE_FILE down${NC}"
log "  📊 View status: ${YELLOW}docker-compose -f $COMPOSE_FILE ps${NC}"
log "  🔍 Health check: ${YELLOW}curl https://${DOMAIN_NAME:-"localhost"}/api/v1/health${NC}"
log "  💾 Backup: ${YELLOW}./scripts/backup.sh${NC}"
echo ""

log "${YELLOW}⚠️  Next Steps:${NC}"
log "1. Configure DNS to point ${DOMAIN_NAME:-"your-domain"} to this server's IP"
log "2. Verify SSL certificates are issued correctly"
log "3. Access Grafana at https://${DOMAIN_NAME:-"localhost"}/grafana (admin/admin)"
log "4. Configure alerts in Grafana for monitoring"
log "5. Test Political Strategist at https://${DOMAIN_NAME:-"localhost"}"
log "6. Review security settings in Traefik dashboard"
echo ""

log "${GREEN}Deployment completed successfully at $(date)${NC}"
log "${GREEN}Check $LOG_FILE for detailed logs${NC}"