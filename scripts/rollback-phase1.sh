#!/bin/bash

###############################################################################
# LokDarpan Phase 1 Frontend Rollback Script
# Emergency and planned rollback procedures for production deployment
# Ensures campaign continuity during critical political operations
###############################################################################

set -euo pipefail

# Script configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
ROLLBACK_TARGET="${1:-}"
ROLLBACK_TYPE="${2:-emergency}"
ROLLBACK_TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
LOG_FILE="${PROJECT_ROOT}/logs/rollback_${ROLLBACK_TIMESTAMP}.log"

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Rollback configuration
declare -A ROLLBACK_CONFIGS
ROLLBACK_CONFIGS[max_emergency_time]=900      # 15 minutes
ROLLBACK_CONFIGS[max_planned_time]=3600       # 60 minutes
ROLLBACK_CONFIGS[backup_retention_days]=7     # Keep backups for 7 days
ROLLBACK_CONFIGS[health_check_timeout]=30     # 30 seconds

###############################################################################
# Utility Functions
###############################################################################

log() {
    local level="$1"
    shift
    local message="$*"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    case "$level" in
        "INFO")  echo -e "${GREEN}[INFO]${NC} ${timestamp}: $message" | tee -a "$LOG_FILE" ;;
        "WARN")  echo -e "${YELLOW}[WARN]${NC} ${timestamp}: $message" | tee -a "$LOG_FILE" ;;
        "ERROR") echo -e "${RED}[ERROR]${NC} ${timestamp}: $message" | tee -a "$LOG_FILE" ;;
        "DEBUG") echo -e "${BLUE}[DEBUG]${NC} ${timestamp}: $message" | tee -a "$LOG_FILE" ;;
        "CRITICAL") echo -e "${RED}[CRITICAL]${NC} ${timestamp}: $message" | tee -a "$LOG_FILE" ;;
    esac
}

show_usage() {
    cat << EOF
LokDarpan Phase 1 Frontend Rollback Script

Usage: $0 [ROLLBACK_TARGET] [ROLLBACK_TYPE]

ROLLBACK_TARGET:
  - Git commit hash (e.g., abc123def)
  - Docker image tag (e.g., lokdarpan/frontend:production-20250829_143000)
  - 'previous' to rollback to last known good deployment
  - 'backup' to rollback to latest backup

ROLLBACK_TYPE:
  - emergency (default): Fast rollback with minimal checks (< 15 minutes)
  - planned: Comprehensive rollback with full validation (< 60 minutes)

Examples:
  $0 previous emergency                    # Quick rollback to previous version
  $0 abc123def planned                     # Planned rollback to specific commit
  $0 lokdarpan/frontend:backup planned     # Rollback to backup image

EOF
}

validate_rollback_request() {
    log "INFO" "Validating rollback request..."
    
    if [[ -z "$ROLLBACK_TARGET" ]]; then
        log "ERROR" "Rollback target not specified"
        show_usage
        exit 1
    fi
    
    if [[ ! "$ROLLBACK_TYPE" =~ ^(emergency|planned)$ ]]; then
        log "ERROR" "Invalid rollback type. Use 'emergency' or 'planned'"
        exit 1
    fi
    
    # Emergency rollback confirmation
    if [[ "$ROLLBACK_TYPE" == "emergency" ]]; then
        log "CRITICAL" "🚨 EMERGENCY ROLLBACK INITIATED 🚨"
        log "WARN" "This will immediately stop current deployment and rollback"
        
        if [[ -t 0 ]]; then  # Only prompt if running interactively
            read -t 10 -p "Continue emergency rollback? (y/N): " confirm || confirm="n"
            if [[ "$confirm" != "y" ]]; then
                log "INFO" "Emergency rollback cancelled by user"
                exit 0
            fi
        fi
    fi
    
    # Planned rollback confirmation
    if [[ "$ROLLBACK_TYPE" == "planned" ]]; then
        log "WARN" "⚠️  PLANNED ROLLBACK INITIATED ⚠️"
        log "INFO" "This will perform comprehensive rollback with validation"
        
        if [[ -t 0 ]]; then  # Only prompt if running interactively
            read -p "Continue planned rollback? (y/N): " confirm
            if [[ "$confirm" != "y" ]]; then
                log "INFO" "Planned rollback cancelled by user"
                exit 0
            fi
        fi
    fi
    
    log "INFO" "Rollback request validation completed ✅"
}

###############################################################################
# Environment Detection and Backup Functions
###############################################################################

detect_current_deployment() {
    log "INFO" "Detecting current deployment state..."
    
    # Check if Docker containers are running
    local current_containers=$(docker ps --filter "name=lokdarpan-frontend" --format "{{.Names}}" 2>/dev/null || echo "")
    
    if [[ -n "$current_containers" ]]; then
        log "INFO" "Active containers found: $current_containers"
        
        # Get current image tag
        local current_image=$(docker ps --filter "name=lokdarpan-frontend" --format "{{.Image}}" | head -n 1)
        export CURRENT_IMAGE_TAG="$current_image"
        log "INFO" "Current image tag: $current_image"
    else
        log "WARN" "No active LokDarpan containers detected"
        export CURRENT_IMAGE_TAG=""
    fi
    
    # Check Docker Compose files
    local compose_files=$(find "$PROJECT_ROOT" -name "docker-compose.*.yml" 2>/dev/null || echo "")
    if [[ -n "$compose_files" ]]; then
        log "INFO" "Docker Compose files found: $(echo $compose_files | tr '\n' ' ')"
        export COMPOSE_FILES="$compose_files"
    fi
    
    log "INFO" "Current deployment detection completed ✅"
}

create_pre_rollback_backup() {
    log "INFO" "Creating pre-rollback backup..."
    
    local backup_dir="${PROJECT_ROOT}/backups/pre_rollback_${ROLLBACK_TIMESTAMP}"
    mkdir -p "$backup_dir"
    
    # Backup current configuration
    if [[ -n "${CURRENT_IMAGE_TAG:-}" ]]; then
        echo "$CURRENT_IMAGE_TAG" > "${backup_dir}/current_image.txt"
        log "INFO" "Current image tag backed up: $CURRENT_IMAGE_TAG"
    fi
    
    # Backup Docker Compose configurations
    if [[ -n "${COMPOSE_FILES:-}" ]]; then
        for compose_file in $COMPOSE_FILES; do
            cp "$compose_file" "$backup_dir/"
        done
        log "INFO" "Docker Compose files backed up"
    fi
    
    # Backup container logs if available
    if docker ps --filter "name=lokdarpan-frontend" --quiet &>/dev/null; then
        docker logs lokdarpan-frontend > "${backup_dir}/container.log" 2>&1 || true
        log "INFO" "Container logs backed up"
    fi
    
    # Create rollback manifest
    cat > "${backup_dir}/rollback_manifest.json" << EOF
{
  "rollback_timestamp": "$ROLLBACK_TIMESTAMP",
  "rollback_type": "$ROLLBACK_TYPE",
  "rollback_target": "$ROLLBACK_TARGET",
  "current_image": "${CURRENT_IMAGE_TAG:-}",
  "backup_created": "$(date -Iseconds)",
  "system_info": {
    "hostname": "$(hostname)",
    "user": "$(whoami)",
    "docker_version": "$(docker --version 2>/dev/null || echo 'not available')"
  }
}
EOF
    
    export BACKUP_DIR="$backup_dir"
    log "INFO" "Pre-rollback backup created: $backup_dir ✅"
}

###############################################################################
# Rollback Target Resolution
###############################################################################

resolve_rollback_target() {
    log "INFO" "Resolving rollback target: $ROLLBACK_TARGET"
    
    case "$ROLLBACK_TARGET" in
        "previous")
            # Find the second most recent image (excluding current)
            local previous_image=$(docker images lokdarpan/frontend --format "{{.Repository}}:{{.Tag}} {{.CreatedAt}}" | 
                                 grep -v "latest" | 
                                 sort -k2 -r | 
                                 head -n 2 | 
                                 tail -n 1 | 
                                 awk '{print $1}')
            
            if [[ -n "$previous_image" && "$previous_image" != "${CURRENT_IMAGE_TAG:-}" ]]; then
                export RESOLVED_TARGET="$previous_image"
                export TARGET_TYPE="docker_image"
                log "INFO" "Previous image resolved: $previous_image"
            else
                log "ERROR" "Could not resolve previous image"
                exit 1
            fi
            ;;
            
        "backup")
            # Find the most recent backup image
            local backup_image=$(docker images lokdarpan/frontend --format "{{.Repository}}:{{.Tag}}" | 
                               grep "backup" | 
                               head -n 1)
            
            if [[ -n "$backup_image" ]]; then
                export RESOLVED_TARGET="$backup_image"
                export TARGET_TYPE="docker_image"
                log "INFO" "Backup image resolved: $backup_image"
            else
                log "ERROR" "No backup image found"
                exit 1
            fi
            ;;
            
        lokdarpan/frontend:*)
            # Direct Docker image reference
            if docker inspect "$ROLLBACK_TARGET" &>/dev/null; then
                export RESOLVED_TARGET="$ROLLBACK_TARGET"
                export TARGET_TYPE="docker_image"
                log "INFO" "Docker image verified: $ROLLBACK_TARGET"
            else
                log "ERROR" "Docker image not found: $ROLLBACK_TARGET"
                exit 1
            fi
            ;;
            
        *)
            # Assume it's a Git commit hash
            if cd "$PROJECT_ROOT" && git cat-file -e "$ROLLBACK_TARGET" 2>/dev/null; then
                export RESOLVED_TARGET="$ROLLBACK_TARGET"
                export TARGET_TYPE="git_commit"
                log "INFO" "Git commit verified: $ROLLBACK_TARGET"
            else
                log "ERROR" "Invalid rollback target: $ROLLBACK_TARGET"
                exit 1
            fi
            ;;
    esac
    
    log "INFO" "Rollback target resolution completed: $RESOLVED_TARGET (type: $TARGET_TYPE) ✅"
}

###############################################################################
# Rollback Execution Functions
###############################################################################

stop_current_deployment() {
    log "INFO" "Stopping current deployment..."
    
    local stop_timeout=${ROLLBACK_CONFIGS[health_check_timeout]}
    
    # Stop using Docker Compose if available
    if [[ -f "${PROJECT_ROOT}/docker-compose.production.yml" ]]; then
        log "INFO" "Stopping via Docker Compose..."
        cd "$PROJECT_ROOT"
        docker-compose -f docker-compose.production.yml down --timeout "$stop_timeout" 2>/dev/null || true
    fi
    
    # Force stop any remaining containers
    local remaining_containers=$(docker ps --filter "name=lokdarpan-frontend" --quiet 2>/dev/null || echo "")
    if [[ -n "$remaining_containers" ]]; then
        log "INFO" "Force stopping remaining containers..."
        echo "$remaining_containers" | xargs -r docker stop --time="$stop_timeout" 2>/dev/null || true
        echo "$remaining_containers" | xargs -r docker rm -f 2>/dev/null || true
    fi
    
    log "INFO" "Current deployment stopped ✅"
}

execute_docker_rollback() {
    log "INFO" "Executing Docker image rollback..."
    
    local target_image="$RESOLVED_TARGET"
    
    # Verify target image exists
    if ! docker inspect "$target_image" &>/dev/null; then
        log "ERROR" "Target Docker image not available: $target_image"
        exit 1
    fi
    
    # Start rollback container
    log "INFO" "Starting rollback container with image: $target_image"
    
    # Create temporary compose file for rollback
    local rollback_compose="${PROJECT_ROOT}/docker-compose.rollback.yml"
    cat > "$rollback_compose" << EOF
version: '3.8'
services:
  lokdarpan-frontend:
    image: ${target_image}
    container_name: lokdarpan-frontend-rollback
    ports:
      - "80:80"
      - "443:443"
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost/health"]
      interval: 10s
      timeout: 5s
      retries: 3
      start_period: 30s
    restart: unless-stopped
    labels:
      - "lokdarpan.component=frontend"
      - "lokdarpan.deployment=rollback"
      - "lokdarpan.timestamp=${ROLLBACK_TIMESTAMP}"
EOF
    
    # Deploy rollback container
    if docker-compose -f "$rollback_compose" up -d; then
        log "INFO" "Rollback container started successfully ✅"
    else
        log "ERROR" "Failed to start rollback container ❌"
        exit 1
    fi
    
    # Clean up temporary compose file
    rm -f "$rollback_compose"
    
    log "INFO" "Docker image rollback completed ✅"
}

execute_git_rollback() {
    log "INFO" "Executing Git-based rollback..."
    
    local target_commit="$RESOLVED_TARGET"
    
    cd "$PROJECT_ROOT"
    
    # Validate Git repository state
    if ! git status &>/dev/null; then
        log "ERROR" "Not a valid Git repository"
        exit 1
    fi
    
    # Create rollback branch
    local rollback_branch="rollback_${ROLLBACK_TIMESTAMP}"
    git checkout -b "$rollback_branch" "$target_commit"
    
    # Rebuild and redeploy
    log "INFO" "Rebuilding from rollback commit..."
    
    cd "${PROJECT_ROOT}/frontend"
    
    # Install dependencies
    npm ci --quiet
    
    # Build
    export NODE_ENV=production
    npm run build
    
    # Create new Docker image for rollback
    cd "$PROJECT_ROOT"
    local rollback_image="lokdarpan/frontend:rollback-${ROLLBACK_TIMESTAMP}"
    
    if docker build -f Dockerfile.frontend -t "$rollback_image" .; then
        log "INFO" "Rollback image built: $rollback_image"
    else
        log "ERROR" "Failed to build rollback image"
        exit 1
    fi
    
    # Deploy rollback image
    export RESOLVED_TARGET="$rollback_image"
    export TARGET_TYPE="docker_image"
    execute_docker_rollback
    
    log "INFO" "Git-based rollback completed ✅"
}

###############################################################################
# Validation and Health Checks
###############################################################################

validate_rollback_deployment() {
    log "INFO" "Validating rollback deployment..."
    
    local max_wait_time
    if [[ "$ROLLBACK_TYPE" == "emergency" ]]; then
        max_wait_time=60  # 1 minute for emergency
    else
        max_wait_time=300  # 5 minutes for planned
    fi
    
    local wait_count=0
    local health_url="http://localhost/health"
    
    log "INFO" "Waiting for rollback deployment to be healthy (max ${max_wait_time}s)..."
    
    while [[ $wait_count -lt $max_wait_time ]]; do
        if curl -f "$health_url" -m 5 &>/dev/null; then
            log "INFO" "Rollback deployment is healthy ✅"
            break
        fi
        
        wait_count=$((wait_count + 10))
        sleep 10
        
        if [[ $wait_count -ge $max_wait_time ]]; then
            log "ERROR" "Rollback deployment failed health checks within ${max_wait_time} seconds ❌"
            exit 1
        fi
        
        log "DEBUG" "Health check attempt $((wait_count/10)): waiting..."
    done
    
    # Additional validation for planned rollbacks
    if [[ "$ROLLBACK_TYPE" == "planned" ]]; then
        log "INFO" "Running comprehensive rollback validation..."
        
        # Test static asset delivery
        if curl -f "http://localhost/" -o /dev/null -m 10 &>/dev/null; then
            log "INFO" "Static asset delivery working ✅"
        else
            log "ERROR" "Static asset delivery failed ❌"
            exit 1
        fi
        
        # Test API proxy (if backend is available)
        if curl -f "http://localhost/api/v1/status" -o /dev/null -m 10 &>/dev/null; then
            log "INFO" "API proxy working ✅"
        else
            log "WARN" "API proxy not responding - verify backend connectivity"
        fi
        
        # Performance spot check
        local load_time=$(curl -o /dev/null -s -w "%{time_total}" "http://localhost/" | head -c 4)
        log "INFO" "Rollback deployment load time: ${load_time}s"
    fi
    
    log "INFO" "Rollback deployment validation completed ✅"
}

###############################################################################
# Post-Rollback Functions
###############################################################################

update_deployment_state() {
    log "INFO" "Updating deployment state after rollback..."
    
    # Create rollback success record
    local success_record="${PROJECT_ROOT}/rollbacks/rollback_${ROLLBACK_TIMESTAMP}.json"
    mkdir -p "${PROJECT_ROOT}/rollbacks"
    
    cat > "$success_record" << EOF
{
  "rollback_id": "$ROLLBACK_TIMESTAMP",
  "rollback_type": "$ROLLBACK_TYPE",
  "rollback_target": "$ROLLBACK_TARGET",
  "resolved_target": "$RESOLVED_TARGET",
  "target_type": "$TARGET_TYPE",
  "previous_image": "${CURRENT_IMAGE_TAG:-}",
  "rollback_completed": "$(date -Iseconds)",
  "validation_status": "success",
  "backup_location": "${BACKUP_DIR:-}",
  "duration_seconds": $(($(date +%s) - $(date -d "${ROLLBACK_TIMESTAMP:0:8} ${ROLLBACK_TIMESTAMP:9:2}:${ROLLBACK_TIMESTAMP:11:2}:${ROLLBACK_TIMESTAMP:13:2}" +%s) + 0))
}
EOF
    
    # Update monitoring configurations
    if [[ -f "${PROJECT_ROOT}/monitoring/current_deployment.json" ]]; then
        cp "$success_record" "${PROJECT_ROOT}/monitoring/current_deployment.json"
    fi
    
    # Clean up old rollback records (keep last 10)
    find "${PROJECT_ROOT}/rollbacks" -name "rollback_*.json" -type f | 
        sort -r | 
        tail -n +11 | 
        xargs -r rm -f
    
    log "INFO" "Deployment state updated ✅"
}

send_rollback_notifications() {
    log "INFO" "Sending rollback completion notifications..."
    
    # Log rollback summary
    cat << EOF

=================================
   ROLLBACK COMPLETION SUMMARY
=================================
Rollback ID: $ROLLBACK_TIMESTAMP
Type: $ROLLBACK_TYPE
Target: $ROLLBACK_TARGET
Resolved: $RESOLVED_TARGET
Status: SUCCESS ✅
Previous Image: ${CURRENT_IMAGE_TAG:-"unknown"}
Backup Location: ${BACKUP_DIR:-"none"}
Completion Time: $(date)
=================================

EOF
    
    # Create notification file for monitoring systems
    local notification_file="${PROJECT_ROOT}/notifications/rollback_${ROLLBACK_TIMESTAMP}.json"
    mkdir -p "${PROJECT_ROOT}/notifications"
    
    cat > "$notification_file" << EOF
{
  "type": "rollback_success",
  "rollback_id": "$ROLLBACK_TIMESTAMP",
  "rollback_type": "$ROLLBACK_TYPE",
  "target": "$RESOLVED_TARGET",
  "timestamp": "$(date -Iseconds)",
  "severity": "high",
  "message": "LokDarpan frontend rollback completed successfully",
  "details": {
    "previous_image": "${CURRENT_IMAGE_TAG:-}",
    "backup_available": "${BACKUP_DIR:-}",
    "health_check": "passed"
  }
}
EOF
    
    # Attempt to send webhook notification (if configured)
    if [[ -n "${WEBHOOK_URL:-}" ]]; then
        curl -X POST "$WEBHOOK_URL" \
             -H "Content-Type: application/json" \
             -d @"$notification_file" \
             -m 10 &>/dev/null || log "WARN" "Webhook notification failed"
    fi
    
    log "INFO" "Rollback notifications sent ✅"
}

###############################################################################
# Main Rollback Flow
###############################################################################

main() {
    local start_time=$(date +%s)
    
    log "INFO" "🔄 Starting LokDarpan Phase 1 Frontend Rollback"
    log "INFO" "Rollback Type: $ROLLBACK_TYPE"
    log "INFO" "Rollback Target: $ROLLBACK_TARGET"
    log "INFO" "Rollback Timestamp: $ROLLBACK_TIMESTAMP"
    
    # Create necessary directories
    mkdir -p "${PROJECT_ROOT}/logs" "${PROJECT_ROOT}/backups" "${PROJECT_ROOT}/rollbacks"
    
    # Pre-rollback phase
    validate_rollback_request
    detect_current_deployment
    create_pre_rollback_backup
    resolve_rollback_target
    
    # Rollback execution phase
    stop_current_deployment
    
    case "$TARGET_TYPE" in
        "docker_image")
            execute_docker_rollback
            ;;
        "git_commit")
            execute_git_rollback
            ;;
        *)
            log "ERROR" "Unknown target type: $TARGET_TYPE"
            exit 1
            ;;
    esac
    
    # Post-rollback phase
    validate_rollback_deployment
    update_deployment_state
    send_rollback_notifications
    
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    log "INFO" "🎉 LokDarpan Phase 1 Frontend Rollback Completed Successfully!"
    log "INFO" "Rollback Duration: ${duration} seconds"
    log "INFO" "Rollback ID: $ROLLBACK_TIMESTAMP"
    log "INFO" "Target Image: $RESOLVED_TARGET"
    log "INFO" "Backup Location: ${BACKUP_DIR:-none}"
    log "INFO" "Log File: $LOG_FILE"
    
    # Verify rollback time limits
    local max_allowed_time
    if [[ "$ROLLBACK_TYPE" == "emergency" ]]; then
        max_allowed_time=${ROLLBACK_CONFIGS[max_emergency_time]}
    else
        max_allowed_time=${ROLLBACK_CONFIGS[max_planned_time]}
    fi
    
    if [[ $duration -gt $max_allowed_time ]]; then
        log "WARN" "Rollback exceeded target time: ${duration}s > ${max_allowed_time}s"
    else
        log "INFO" "Rollback completed within target time: ${duration}s ≤ ${max_allowed_time}s ✅"
    fi
}

###############################################################################
# Error Handling and Cleanup
###############################################################################

cleanup_on_failure() {
    log "ERROR" "Rollback failed - attempting cleanup..."
    
    # Try to restart the original deployment if possible
    if [[ -n "${CURRENT_IMAGE_TAG:-}" ]]; then
        log "INFO" "Attempting to restore original deployment..."
        docker run -d --name lokdarpan-frontend-restore \
                   -p 80:80 -p 443:443 \
                   "$CURRENT_IMAGE_TAG" 2>/dev/null || log "ERROR" "Failed to restore original deployment"
    fi
    
    log "ERROR" "Manual intervention may be required"
    exit 1
}

trap 'cleanup_on_failure' ERR
trap 'log "INFO" "Rollback interrupted by user"; exit 130' INT TERM

# Check if help is requested
if [[ "${1:-}" =~ ^(-h|--help|help)$ ]]; then
    show_usage
    exit 0
fi

# Execute main function
main "$@"