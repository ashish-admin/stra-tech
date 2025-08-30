#!/bin/bash

# LokDarpan Enhanced Deployment Rollback Script
# Emergency rollback procedures for production deployment failures

set -e

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
COMPOSE_FILE="docker-compose.production-enhanced.yml"
COMPOSE_FILE_BASIC="docker-compose.production.yml"
ENV_FILE=".env.production-enhanced"
ENV_FILE_BASIC=".env.production"
BACKUP_DIR="backups/$(date +%Y%m%d)"
ROLLBACK_LOG="rollback-$(date +%Y%m%d-%H%M%S).log"

# Function to log with timestamp
log() {
    echo -e "$1" | tee -a "$ROLLBACK_LOG"
}

# Function to create emergency backup
create_emergency_backup() {
    log "${BLUE}[1/6] Creating emergency backup before rollback...${NC}"
    
    mkdir -p "$BACKUP_DIR"
    
    # Backup current environment
    cp "$ENV_FILE" "$BACKUP_DIR/env.backup" 2>/dev/null || log "${YELLOW}⚠ Could not backup environment file${NC}"
    
    # Backup database
    if docker ps --filter "name=lokdarpan-postgres" --format '{{.Names}}' | grep -q "lokdarpan-postgres"; then
        log "${GREEN}Creating database backup...${NC}"
        docker exec lokdarpan-postgres pg_dump -U postgres lokdarpan_db > "$BACKUP_DIR/database.sql"
        log "${GREEN}✓ Database backup created: $BACKUP_DIR/database.sql${NC}"
    else
        log "${YELLOW}⚠ PostgreSQL container not running, skipping database backup${NC}"
    fi
    
    # Backup volumes
    log "${GREEN}Backing up Docker volumes...${NC}"
    docker run --rm -v lokdarpan_postgres_data:/data -v "$(pwd)/$BACKUP_DIR":/backup alpine tar czf /backup/postgres_data.tar.gz -C /data . 2>/dev/null || true
    docker run --rm -v lokdarpan_redis_data:/data -v "$(pwd)/$BACKUP_DIR":/backup alpine tar czf /backup/redis_data.tar.gz -C /data . 2>/dev/null || true
    
    log "${GREEN}✓ Emergency backup completed in $BACKUP_DIR${NC}"
}

# Function to stop enhanced services
stop_enhanced_services() {
    log "${BLUE}[2/6] Stopping enhanced services...${NC}"
    
    if [ -f "$COMPOSE_FILE" ]; then
        log "${YELLOW}Stopping enhanced deployment...${NC}"
        docker-compose -f "$COMPOSE_FILE" down --remove-orphans || log "${YELLOW}⚠ Some containers may not have stopped cleanly${NC}"
        log "${GREEN}✓ Enhanced services stopped${NC}"
    else
        log "${YELLOW}⚠ Enhanced compose file not found, skipping stop${NC}"
    fi
}

# Function to clean up enhanced resources
cleanup_enhanced_resources() {
    log "${BLUE}[3/6] Cleaning up enhanced resources...${NC}"
    
    # Remove enhanced images
    log "${YELLOW}Removing enhanced Docker images...${NC}"
    docker image prune -f || true
    
    # Clean up monitoring containers if they exist
    for container in lokdarpan-prometheus lokdarpan-grafana lokdarpan-traefik; do
        if docker ps -a --filter "name=$container" --format '{{.Names}}' | grep -q "$container"; then
            log "${YELLOW}Removing $container...${NC}"
            docker rm -f "$container" 2>/dev/null || true
        fi
    done
    
    log "${GREEN}✓ Enhanced resources cleaned up${NC}"
}

# Function to restore basic configuration
restore_basic_configuration() {
    log "${BLUE}[4/6] Restoring basic configuration...${NC}"
    
    # Check if basic configuration exists
    if [ ! -f "$COMPOSE_FILE_BASIC" ]; then
        log "${RED}✗ Basic compose file not found: $COMPOSE_FILE_BASIC${NC}"
        log "${RED}Cannot rollback to basic deployment${NC}"
        return 1
    fi
    
    # Restore or create basic environment file
    if [ -f "$ENV_FILE_BASIC" ]; then
        log "${GREEN}Using existing basic environment file${NC}"
    else
        log "${YELLOW}Creating basic environment file from enhanced version...${NC}"
        # Create a simplified version of the environment file
        cat > "$ENV_FILE_BASIC" << 'EOF'
FLASK_ENV=production
SECRET_KEY=ayra
DATABASE_URL=postgresql://postgres:amuktha@localhost/lokdarpan_db
REDIS_URL=redis://localhost:6379/0
CELERY_BROKER_URL=redis://localhost:6379/0
CELERY_RESULT_BACKEND=redis://localhost:6379/0
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
EOF
        log "${GREEN}✓ Basic environment file created${NC}"
    fi
    
    log "${GREEN}✓ Basic configuration prepared${NC}"
}

# Function to start basic services
start_basic_services() {
    log "${BLUE}[5/6] Starting basic services...${NC}"
    
    # Start basic deployment
    log "${YELLOW}Starting basic deployment...${NC}"
    docker-compose -f "$COMPOSE_FILE_BASIC" up -d
    
    # Wait for services to start
    log "${YELLOW}Waiting for services to initialize...${NC}"
    sleep 30
    
    # Check if basic services are running
    if docker ps --filter "name=lokdarpan" --format '{{.Names}}' | wc -l | grep -q "[1-9]"; then
        log "${GREEN}✓ Basic services started successfully${NC}"
    else
        log "${RED}✗ Basic services failed to start${NC}"
        return 1
    fi
}

# Function to validate rollback
validate_rollback() {
    log "${BLUE}[6/6] Validating rollback...${NC}"
    
    # Test basic endpoints
    local max_attempts=10
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if curl -f -s --max-time 10 "http://localhost:5000/api/v1/status" > /dev/null 2>&1; then
            log "${GREEN}✓ Backend API is responding${NC}"
            break
        fi
        
        if [ $attempt -eq $max_attempts ]; then
            log "${RED}✗ Backend API not responding after $max_attempts attempts${NC}"
            return 1
        fi
        
        log "${YELLOW}  Attempt $attempt/$max_attempts...${NC}"
        sleep 5
        attempt=$((attempt + 1))
    done
    
    # Check database connectivity
    if docker-compose -f "$COMPOSE_FILE_BASIC" exec -T postgres pg_isready -U postgres > /dev/null 2>&1; then
        log "${GREEN}✓ Database is accessible${NC}"
    else
        log "${YELLOW}⚠ Database connectivity issues${NC}"
    fi
    
    # Test frontend
    if curl -f -s --max-time 10 "http://localhost:5173" > /dev/null 2>&1; then
        log "${GREEN}✓ Frontend is accessible${NC}"
    else
        log "${YELLOW}⚠ Frontend may need manual restart${NC}"
    fi
    
    log "${GREEN}✓ Rollback validation completed${NC}"
}

# Function to perform emergency rollback
emergency_rollback() {
    log ""
    log "${RED}╔══════════════════════════════════════════════════════════════╗${NC}"
    log "${RED}║                 EMERGENCY ROLLBACK INITIATED                 ║${NC}"
    log "${RED}║               LokDarpan Enhanced Deployment                  ║${NC}"
    log "${RED}╚══════════════════════════════════════════════════════════════╝${NC}"
    log ""
    log "${RED}⚠️  WARNING: This will rollback to basic deployment!${NC}"
    log "${RED}⚠️  Enhanced features will be unavailable!${NC}"
    log ""
    
    # Check if this is a force rollback
    if [ "$1" != "--force" ]; then
        read -p "Are you sure you want to proceed with rollback? (yes/no): " confirm
        if [ "$confirm" != "yes" ]; then
            log "${YELLOW}Rollback cancelled by user${NC}"
            exit 0
        fi
    fi
    
    local steps=(
        "create_emergency_backup"
        "stop_enhanced_services"
        "cleanup_enhanced_resources"
        "restore_basic_configuration"
        "start_basic_services"
        "validate_rollback"
    )
    
    local failed_steps=0
    for step in "${steps[@]}"; do
        if ! $step; then
            ((failed_steps++))
            log "${RED}✗ Step failed: $step${NC}"
        fi
        log ""
    done
    
    # Summary
    log "${BLUE}════════════════════════════════════════════════════════${NC}"
    log "${BLUE}Rollback Summary${NC}"
    log "${BLUE}════════════════════════════════════════════════════════${NC}"
    
    if [ $failed_steps -eq 0 ]; then
        log "${GREEN}✓ Rollback completed successfully!${NC}"
        log "${GREEN}✓ Basic LokDarpan deployment is now active${NC}"
        log ""
        log "${BLUE}Access Information:${NC}"
        log "  Frontend: http://localhost:5173"
        log "  Backend API: http://localhost:5000/api"
        log ""
        log "${YELLOW}Note: Enhanced features are no longer available${NC}"
        log "${YELLOW}Backup created in: $BACKUP_DIR${NC}"
        return 0
    else
        log "${RED}✗ Rollback encountered $failed_steps issues${NC}"
        log "${RED}Manual intervention may be required${NC}"
        log ""
        log "${YELLOW}Recovery Options:${NC}"
        log "1. Check logs: $ROLLBACK_LOG"
        log "2. Restore from backup: $BACKUP_DIR"
        log "3. Manual service restart"
        return 1
    fi
}

# Function to show rollback options
show_rollback_options() {
    echo ""
    echo -e "${BLUE}LokDarpan Enhanced Deployment Rollback Options${NC}"
    echo "=================================================="
    echo ""
    echo -e "${YELLOW}Available Commands:${NC}"
    echo "  $0 emergency           - Emergency rollback to basic deployment"
    echo "  $0 emergency --force   - Force rollback without confirmation"
    echo "  $0 backup              - Create backup only (no rollback)"
    echo "  $0 status              - Check current deployment status"
    echo "  $0 help                - Show this help"
    echo ""
    echo -e "${YELLOW}Emergency Procedures:${NC}"
    echo "1. Database corruption: Restore from $BACKUP_DIR/database.sql"
    echo "2. Configuration issues: Check $ENV_FILE vs $ENV_FILE_BASIC"
    echo "3. Service failures: Use './scripts/health-check.sh' for diagnosis"
    echo ""
    echo -e "${RED}⚠️  WARNING: Rollback will disable enhanced features!${NC}"
    echo ""
}

# Function to create backup only
backup_only() {
    log "${BLUE}Creating backup without rollback...${NC}"
    create_emergency_backup
    log "${GREEN}Backup completed. No rollback performed.${NC}"
}

# Function to check deployment status
check_status() {
    echo -e "${BLUE}Current Deployment Status:${NC}"
    echo "=========================="
    
    if [ -f "$COMPOSE_FILE" ] && docker-compose -f "$COMPOSE_FILE" ps --services > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Enhanced deployment files present${NC}"
        local running_services=$(docker-compose -f "$COMPOSE_FILE" ps --services --filter "status=running" | wc -l)
        echo "  Running enhanced services: $running_services"
    else
        echo -e "${YELLOW}⚠ Enhanced deployment not detected${NC}"
    fi
    
    if [ -f "$COMPOSE_FILE_BASIC" ] && docker-compose -f "$COMPOSE_FILE_BASIC" ps --services > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Basic deployment files present${NC}"
        local running_basic=$(docker-compose -f "$COMPOSE_FILE_BASIC" ps --services --filter "status=running" | wc -l)
        echo "  Running basic services: $running_basic"
    else
        echo -e "${YELLOW}⚠ Basic deployment files not found${NC}"
    fi
    
    echo ""
    echo "Active containers:"
    docker ps --filter "name=lokdarpan" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" || echo "No LokDarpan containers running"
}

# Main execution
case "${1:-help}" in
    "emergency")
        emergency_rollback "$2"
        ;;
    "backup")
        backup_only
        ;;
    "status")
        check_status
        ;;
    "help"|"--help"|"-h")
        show_rollback_options
        ;;
    *)
        echo -e "${RED}Unknown option: $1${NC}"
        show_rollback_options
        exit 1
        ;;
esac