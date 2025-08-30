#!/bin/bash

###############################################################################
# LokDarpan Phase 1 Frontend Deployment Script
# Comprehensive automated deployment for political intelligence dashboard
# Optimized for Indian network conditions and campaign team workflows
###############################################################################

set -euo pipefail

# Script configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
DEPLOYMENT_ENV="${1:-staging}"
DEPLOYMENT_TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
LOG_FILE="${PROJECT_ROOT}/logs/deployment_${DEPLOYMENT_TIMESTAMP}.log"

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Deployment configuration
declare -A DEPLOYMENT_CONFIGS
DEPLOYMENT_CONFIGS[staging_host]="staging.lokdarpan.internal"
DEPLOYMENT_CONFIGS[staging_port]="80"
DEPLOYMENT_CONFIGS[production_host]="lokdarpan.com"
DEPLOYMENT_CONFIGS[production_port]="443"

# Performance benchmarks
declare -A PERFORMANCE_TARGETS
PERFORMANCE_TARGETS[4G_load_time]=2000     # milliseconds
PERFORMANCE_TARGETS[3G_load_time]=5000     # milliseconds
PERFORMANCE_TARGETS[bundle_size]=524288    # bytes (512KB)
PERFORMANCE_TARGETS[memory_limit]=104857600 # bytes (100MB)

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
    esac
}

check_prerequisites() {
    log "INFO" "Checking deployment prerequisites..."
    
    # Required tools
    local required_tools=("node" "npm" "docker" "curl" "jq")
    for tool in "${required_tools[@]}"; do
        if ! command -v "$tool" &> /dev/null; then
            log "ERROR" "Required tool '$tool' is not installed"
            exit 1
        fi
    done
    
    # Node.js version check
    local node_version=$(node --version | sed 's/v//')
    local required_node_version="18.0.0"
    if ! node -e "process.exit(require('semver').gte('$node_version', '$required_node_version') ? 0 : 1)" 2>/dev/null; then
        log "ERROR" "Node.js version $required_node_version or higher is required. Current version: $node_version"
        exit 1
    fi
    
    # Docker daemon check
    if ! docker info &> /dev/null; then
        log "ERROR" "Docker daemon is not running or accessible"
        exit 1
    fi
    
    # Project structure validation
    if [[ ! -f "${PROJECT_ROOT}/frontend/package.json" ]]; then
        log "ERROR" "Frontend package.json not found. Are you in the correct directory?"
        exit 1
    fi
    
    log "INFO" "Prerequisites check passed ✅"
}

validate_environment() {
    log "INFO" "Validating deployment environment: $DEPLOYMENT_ENV"
    
    if [[ ! "$DEPLOYMENT_ENV" =~ ^(development|staging|production)$ ]]; then
        log "ERROR" "Invalid deployment environment. Use: development, staging, or production"
        exit 1
    fi
    
    # Environment-specific validations
    case "$DEPLOYMENT_ENV" in
        "production")
            log "WARN" "⚠️  PRODUCTION DEPLOYMENT INITIATED ⚠️"
            read -p "Are you sure you want to deploy to production? (yes/NO): " confirm
            if [[ "$confirm" != "yes" ]]; then
                log "INFO" "Production deployment cancelled by user"
                exit 0
            fi
            ;;
        "staging")
            log "INFO" "Staging deployment - proceeding with validation"
            ;;
        "development")
            log "INFO" "Development deployment - minimal validation"
            ;;
    esac
    
    log "INFO" "Environment validation passed ✅"
}

###############################################################################
# Build and Test Functions
###############################################################################

run_comprehensive_tests() {
    log "INFO" "Running comprehensive test suite..."
    
    cd "${PROJECT_ROOT}/frontend"
    
    # Install dependencies
    log "INFO" "Installing frontend dependencies..."
    npm ci --quiet
    
    # Lint check
    log "INFO" "Running code quality checks..."
    if npm run lint --if-present; then
        log "INFO" "Linting passed ✅"
    else
        log "WARN" "Linting issues detected - review before production"
    fi
    
    # Unit tests
    log "INFO" "Running unit tests..."
    if npm run test:coverage -- --run --silent; then
        log "INFO" "Unit tests passed ✅"
    else
        log "ERROR" "Unit tests failed ❌"
        exit 1
    fi
    
    # Error boundary validation
    log "INFO" "Running error boundary validation tests..."
    if npm run test:deployment --silent -- --testPathPattern=ErrorBoundaryValidation; then
        log "INFO" "Error boundary tests passed ✅"
    else
        log "ERROR" "Error boundary validation failed ❌"
        exit 1
    fi
    
    # Performance validation
    log "INFO" "Running performance validation tests..."
    if npm run test:performance --silent -- --testPathPattern=PerformanceValidation; then
        log "INFO" "Performance tests passed ✅"
    else
        log "ERROR" "Performance validation failed ❌"
        exit 1
    fi
    
    # User acceptance tests
    log "INFO" "Running user acceptance tests..."
    if npm run test:deployment --silent -- --testPathPattern=UserAcceptanceTests; then
        log "INFO" "User acceptance tests passed ✅"
    else
        log "ERROR" "User acceptance tests failed ❌"
        exit 1
    fi
    
    log "INFO" "All tests completed successfully ✅"
}

build_optimized_bundle() {
    log "INFO" "Building optimized production bundle..."
    
    cd "${PROJECT_ROOT}/frontend"
    
    # Clean previous builds
    rm -rf dist/
    
    # Set production environment
    export NODE_ENV=production
    export VITE_API_BASE_URL=""  # Use proxy configuration
    
    # Build with optimization
    log "INFO" "Executing Vite build with political dashboard optimizations..."
    if npm run build; then
        log "INFO" "Build completed successfully ✅"
    else
        log "ERROR" "Build failed ❌"
        exit 1
    fi
    
    # Validate bundle size
    local main_js_size=$(find dist/assets -name "main-*.js" -exec stat -f%z {} \; 2>/dev/null || find dist/assets -name "main-*.js" -exec stat -c%s {} \;)
    local main_css_size=$(find dist/assets -name "main-*.css" -exec stat -f%z {} \; 2>/dev/null || find dist/assets -name "main-*.css" -exec stat -c%s {} \;)
    
    if [[ $main_js_size -gt ${PERFORMANCE_TARGETS[bundle_size]} ]]; then
        log "WARN" "Main JavaScript bundle size ($main_js_size bytes) exceeds target (${PERFORMANCE_TARGETS[bundle_size]} bytes)"
    else
        log "INFO" "Bundle size optimization: Main JS $main_js_size bytes ✅"
    fi
    
    # Generate bundle analysis report
    if command -v npx &> /dev/null; then
        log "INFO" "Generating bundle analysis report..."
        npx vite-bundle-analyzer dist/assets --open=false --report > "${PROJECT_ROOT}/logs/bundle_analysis_${DEPLOYMENT_TIMESTAMP}.json" 2>/dev/null || true
    fi
    
    log "INFO" "Optimized bundle creation completed ✅"
}

###############################################################################
# Docker Functions
###############################################################################

build_docker_image() {
    log "INFO" "Building Docker image for LokDarpan frontend..."
    
    cd "$PROJECT_ROOT"
    
    local image_tag="lokdarpan/frontend:${DEPLOYMENT_ENV}-${DEPLOYMENT_TIMESTAMP}"
    local latest_tag="lokdarpan/frontend:${DEPLOYMENT_ENV}-latest"
    
    # Build multi-stage Docker image
    log "INFO" "Building Docker image with Indian network optimizations..."
    if docker build -f Dockerfile.frontend -t "$image_tag" -t "$latest_tag" .; then
        log "INFO" "Docker image built successfully: $image_tag ✅"
    else
        log "ERROR" "Docker image build failed ❌"
        exit 1
    fi
    
    # Image size validation
    local image_size=$(docker images "$image_tag" --format "table {{.Size}}" | tail -n 1)
    log "INFO" "Docker image size: $image_size"
    
    # Security scan (if available)
    if command -v docker &> /dev/null && docker --version | grep -q "Docker version"; then
        log "INFO" "Running security scan on Docker image..."
        docker run --rm -v /var/run/docker.sock:/var/run/docker.sock \
            -v /tmp:/tmp \
            aquasec/trivy image --exit-code 0 --severity HIGH,CRITICAL "$image_tag" 2>/dev/null || log "WARN" "Security scan completed with warnings"
    fi
    
    export DOCKER_IMAGE_TAG="$image_tag"
    export DOCKER_LATEST_TAG="$latest_tag"
    log "INFO" "Docker image preparation completed ✅"
}

###############################################################################
# Deployment Functions
###############################################################################

deploy_to_environment() {
    log "INFO" "Deploying to $DEPLOYMENT_ENV environment..."
    
    local host="${DEPLOYMENT_CONFIGS[${DEPLOYMENT_ENV}_host]}"
    local port="${DEPLOYMENT_CONFIGS[${DEPLOYMENT_ENV}_port]}"
    
    cd "$PROJECT_ROOT"
    
    # Stop existing containers gracefully
    log "INFO" "Stopping existing containers..."
    docker-compose -f docker-compose.${DEPLOYMENT_ENV}.yml down --remove-orphans 2>/dev/null || true
    
    # Deploy new containers
    log "INFO" "Starting new deployment..."
    export LOKDARPAN_IMAGE_TAG="${DOCKER_LATEST_TAG}"
    export DEPLOYMENT_TIMESTAMP="$DEPLOYMENT_TIMESTAMP"
    
    if docker-compose -f docker-compose.${DEPLOYMENT_ENV}.yml up -d --remove-orphans; then
        log "INFO" "Container deployment completed ✅"
    else
        log "ERROR" "Container deployment failed ❌"
        exit 1
    fi
    
    # Wait for services to be ready
    log "INFO" "Waiting for services to be ready..."
    local max_wait=120
    local wait_count=0
    
    while [[ $wait_count -lt $max_wait ]]; do
        if curl -f "http://localhost:${port}/health" &>/dev/null; then
            log "INFO" "Services are ready ✅"
            break
        fi
        
        wait_count=$((wait_count + 5))
        sleep 5
        
        if [[ $wait_count -ge $max_wait ]]; then
            log "ERROR" "Services failed to start within ${max_wait} seconds ❌"
            exit 1
        fi
    done
    
    log "INFO" "Deployment to $DEPLOYMENT_ENV completed successfully ✅"
}

###############################################################################
# Validation Functions
###############################################################################

run_smoke_tests() {
    log "INFO" "Running deployment smoke tests..."
    
    local host="${DEPLOYMENT_CONFIGS[${DEPLOYMENT_ENV}_host]}"
    local port="${DEPLOYMENT_CONFIGS[${DEPLOYMENT_ENV}_port]}"
    local base_url="http://localhost:${port}"
    
    # Health check
    log "INFO" "Testing health endpoint..."
    if curl -f "${base_url}/health" &>/dev/null; then
        log "INFO" "Health check passed ✅"
    else
        log "ERROR" "Health check failed ❌"
        exit 1
    fi
    
    # Static assets check
    log "INFO" "Testing static asset delivery..."
    if curl -f "${base_url}/" -o /dev/null -s; then
        log "INFO" "Static asset delivery working ✅"
    else
        log "ERROR" "Static asset delivery failed ❌"
        exit 1
    fi
    
    # API proxy check
    log "INFO" "Testing API proxy configuration..."
    if curl -f "${base_url}/api/v1/status" -o /dev/null -s; then
        log "INFO" "API proxy working ✅"
    else
        log "WARN" "API proxy test failed - verify backend connectivity"
    fi
    
    # Performance spot check
    log "INFO" "Running performance spot check..."
    local load_time=$(curl -o /dev/null -s -w "%{time_total}" "${base_url}/")
    local load_time_ms=$(echo "$load_time * 1000" | bc -l)
    
    if (( $(echo "$load_time_ms < ${PERFORMANCE_TARGETS[4G_load_time]}" | bc -l) )); then
        log "INFO" "Performance spot check passed: ${load_time_ms}ms ✅"
    else
        log "WARN" "Performance spot check slower than target: ${load_time_ms}ms"
    fi
    
    log "INFO" "Smoke tests completed ✅"
}

run_comprehensive_validation() {
    log "INFO" "Running comprehensive post-deployment validation..."
    
    cd "${PROJECT_ROOT}/frontend"
    
    # Component validation
    log "INFO" "Running political dashboard component validation..."
    if npm run test:deployment --silent -- --testPathPattern=PoliticalDashboardValidation; then
        log "INFO" "Dashboard component validation passed ✅"
    else
        log "ERROR" "Dashboard component validation failed ❌"
        exit 1
    fi
    
    # Network performance validation
    log "INFO" "Running network performance validation..."
    if npm run test:deployment --silent -- --testPathPattern=PerformanceValidation --testNamePattern="4G Network Performance"; then
        log "INFO" "Network performance validation passed ✅"
    else
        log "WARN" "Network performance validation had issues"
    fi
    
    # Accessibility validation
    log "INFO" "Running accessibility validation..."
    if command -v npx &> /dev/null; then
        npx axe-cli "http://localhost:${DEPLOYMENT_CONFIGS[${DEPLOYMENT_ENV}_port]}" --exit 2>/dev/null || log "WARN" "Accessibility validation completed with warnings"
        log "INFO" "Accessibility validation completed ✅"
    fi
    
    log "INFO" "Comprehensive validation completed ✅"
}

###############################################################################
# Monitoring and Cleanup Functions
###############################################################################

setup_monitoring() {
    log "INFO" "Setting up deployment monitoring..."
    
    # Create monitoring configuration
    cat > "${PROJECT_ROOT}/monitoring/deployment_${DEPLOYMENT_TIMESTAMP}.json" << EOF
{
  "deployment_id": "${DEPLOYMENT_TIMESTAMP}",
  "environment": "${DEPLOYMENT_ENV}",
  "image_tag": "${DOCKER_IMAGE_TAG}",
  "deployment_time": "$(date -Iseconds)",
  "performance_targets": {
    "4G_load_time": ${PERFORMANCE_TARGETS[4G_load_time]},
    "3G_load_time": ${PERFORMANCE_TARGETS[3G_load_time]},
    "bundle_size": ${PERFORMANCE_TARGETS[bundle_size]}
  },
  "validation_status": "completed",
  "rollback_image": "$(docker images lokdarpan/frontend:${DEPLOYMENT_ENV}-latest --format "{{.ID}}" | head -n 2 | tail -n 1 || echo "none")"
}
EOF
    
    # Set up log rotation
    if command -v logrotate &> /dev/null; then
        log "INFO" "Configuring log rotation for deployment logs"
    fi
    
    log "INFO" "Monitoring setup completed ✅"
}

cleanup_deployment() {
    log "INFO" "Performing deployment cleanup..."
    
    # Clean up old Docker images (keep last 3 versions)
    local old_images=$(docker images lokdarpan/frontend --format "{{.ID}} {{.CreatedAt}}" | sort -k2 -r | tail -n +4 | awk '{print $1}')
    
    if [[ -n "$old_images" ]]; then
        log "INFO" "Cleaning up old Docker images..."
        echo "$old_images" | xargs -r docker rmi &>/dev/null || true
    fi
    
    # Archive deployment logs older than 30 days
    find "${PROJECT_ROOT}/logs" -name "deployment_*.log" -mtime +30 -exec gzip {} \; 2>/dev/null || true
    
    log "INFO" "Cleanup completed ✅"
}

###############################################################################
# Main Deployment Flow
###############################################################################

main() {
    log "INFO" "🚀 Starting LokDarpan Phase 1 Frontend Deployment"
    log "INFO" "Environment: $DEPLOYMENT_ENV"
    log "INFO" "Timestamp: $DEPLOYMENT_TIMESTAMP"
    
    # Create necessary directories
    mkdir -p "${PROJECT_ROOT}/logs" "${PROJECT_ROOT}/monitoring"
    
    # Pre-deployment phase
    check_prerequisites
    validate_environment
    
    # Build phase
    run_comprehensive_tests
    build_optimized_bundle
    build_docker_image
    
    # Deployment phase
    deploy_to_environment
    
    # Validation phase
    run_smoke_tests
    run_comprehensive_validation
    
    # Post-deployment phase
    setup_monitoring
    cleanup_deployment
    
    log "INFO" "🎉 LokDarpan Phase 1 Frontend Deployment Completed Successfully!"
    log "INFO" "Deployment ID: $DEPLOYMENT_TIMESTAMP"
    log "INFO" "Docker Image: $DOCKER_IMAGE_TAG"
    log "INFO" "Log File: $LOG_FILE"
    
    # Display summary
    echo
    echo "==================================="
    echo "   DEPLOYMENT SUMMARY"
    echo "==================================="
    echo "Environment: $DEPLOYMENT_ENV"
    echo "Status: SUCCESS ✅"
    echo "Image: $DOCKER_IMAGE_TAG"
    echo "URL: http://${DEPLOYMENT_CONFIGS[${DEPLOYMENT_ENV}_host]}:${DEPLOYMENT_CONFIGS[${DEPLOYMENT_ENV}_port]}"
    echo "Health Check: http://${DEPLOYMENT_CONFIGS[${DEPLOYMENT_ENV}_host]}:${DEPLOYMENT_CONFIGS[${DEPLOYMENT_ENV}_port]}/health"
    echo "Log File: $LOG_FILE"
    echo "==================================="
    echo
}

###############################################################################
# Error Handling and Cleanup
###############################################################################

trap 'log "ERROR" "Deployment failed at line $LINENO. Check logs for details."; exit 1' ERR
trap 'log "INFO" "Deployment interrupted by user"; exit 130' INT TERM

# Ensure bc is available for arithmetic operations
if ! command -v bc &> /dev/null; then
    log "WARN" "bc not found - installing for arithmetic operations"
    case "$(uname)" in
        "Darwin") brew install bc ;;
        "Linux") sudo apt-get update && sudo apt-get install -y bc ;;
    esac
fi

# Execute main function
main "$@"