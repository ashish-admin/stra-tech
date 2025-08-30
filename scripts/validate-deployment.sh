#!/bin/bash

# LokDarpan Enhanced Deployment Validation Script
# Comprehensive health checks for production deployment validation

set -e

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
COMPOSE_FILE="docker-compose.production-enhanced.yml"
ENV_FILE=".env.production-enhanced"
TIMEOUT=30
VALIDATION_REPORT="validation-report-$(date +%Y%m%d-%H%M%S).txt"

# Function to log with timestamp
log() {
    echo -e "$1" | tee -a "$VALIDATION_REPORT"
}

# Function to test URL with timeout and retries
test_url() {
    local url=$1
    local service_name=$2
    local retries=5
    local timeout=10
    
    for i in $(seq 1 $retries); do
        if curl -f -s --max-time $timeout "$url" > /dev/null 2>&1; then
            log "${GREEN}✓ $service_name is responding at $url${NC}"
            return 0
        fi
        log "${YELLOW}  Attempt $i/$retries for $service_name...${NC}"
        sleep 2
    done
    
    log "${RED}✗ $service_name failed to respond at $url${NC}"
    return 1
}

# Function to check service health via Docker
check_service_health() {
    local service=$1
    local status=$(docker-compose -f $COMPOSE_FILE ps --services --filter "status=running" | grep "^$service$" || true)
    
    if [ -n "$status" ]; then
        local health=$(docker inspect "lokdarpan-$service" --format='{{.State.Health.Status}}' 2>/dev/null || echo "unknown")
        if [ "$health" = "healthy" ] || [ "$health" = "unknown" ]; then
            log "${GREEN}✓ $service container is running and healthy${NC}"
            return 0
        else
            log "${YELLOW}⚠ $service container is running but health status: $health${NC}"
            return 1
        fi
    else
        log "${RED}✗ $service container is not running${NC}"
        return 1
    fi
}

# Function to validate environment configuration
validate_environment() {
    log "${BLUE}[1/8] Validating environment configuration...${NC}"
    
    if [ ! -f "$ENV_FILE" ]; then
        log "${RED}✗ Environment file $ENV_FILE not found${NC}"
        return 1
    fi
    
    # Source environment file
    set -a
    source "$ENV_FILE"
    set +a
    
    # Check critical variables
    local critical_vars=(
        "SECRET_KEY"
        "DB_PASSWORD" 
        "REDIS_PASSWORD"
        "GEMINI_API_KEY"
        "PERPLEXITY_API_KEY"
        "SSL_EMAIL"
    )
    
    local missing_vars=()
    for var in "${critical_vars[@]}"; do
        if [ -z "${!var}" ] || [[ "${!var}" =~ ^(CHANGE-THIS|your-.*-here)$ ]]; then
            missing_vars+=("$var")
        fi
    done
    
    if [ ${#missing_vars[@]} -eq 0 ]; then
        log "${GREEN}✓ All critical environment variables are configured${NC}"
        return 0
    else
        log "${RED}✗ Missing or unconfigured variables: ${missing_vars[*]}${NC}"
        return 1
    fi
}

# Function to validate Docker Compose syntax
validate_compose_config() {
    log "${BLUE}[2/8] Validating Docker Compose configuration...${NC}"
    
    if ! docker-compose -f $COMPOSE_FILE config --quiet 2>/dev/null && ! docker compose -f $COMPOSE_FILE config --quiet 2>/dev/null; then
        log "${RED}✗ Docker Compose configuration is invalid${NC}"
        return 1
    fi
    
    log "${GREEN}✓ Docker Compose configuration is valid${NC}"
    return 0
}

# Function to check container status
validate_containers() {
    log "${BLUE}[3/8] Validating container status...${NC}"
    
    local core_services=("postgres" "redis" "backend" "frontend" "traefik")
    local failed_services=()
    
    for service in "${core_services[@]}"; do
        if ! check_service_health "$service"; then
            failed_services+=("$service")
        fi
    done
    
    if [ ${#failed_services[@]} -eq 0 ]; then
        log "${GREEN}✓ All core services are healthy${NC}"
        return 0
    else
        log "${RED}✗ Failed services: ${failed_services[*]}${NC}"
        return 1
    fi
}

# Function to validate API endpoints
validate_api_endpoints() {
    log "${BLUE}[4/8] Validating API endpoints...${NC}"
    
    local endpoints=(
        "http://localhost/api/v1/status:Backend API Status"
        "http://localhost/health:Health Check"
        "http://localhost:Frontend"
    )
    
    local failed_endpoints=()
    for endpoint in "${endpoints[@]}"; do
        local url=${endpoint%:*}
        local name=${endpoint#*:}
        if ! test_url "$url" "$name"; then
            failed_endpoints+=("$name")
        fi
    done
    
    if [ ${#failed_endpoints[@]} -eq 0 ]; then
        log "${GREEN}✓ All API endpoints are responding${NC}"
        return 0
    else
        log "${RED}✗ Failed endpoints: ${failed_endpoints[*]}${NC}"
        return 1
    fi
}

# Function to validate database connectivity
validate_database() {
    log "${BLUE}[5/8] Validating database connectivity...${NC}"
    
    # Test PostgreSQL connectivity
    if docker-compose -f $COMPOSE_FILE exec -T postgres pg_isready -U postgres > /dev/null 2>&1; then
        log "${GREEN}✓ PostgreSQL is ready and accepting connections${NC}"
    else
        log "${RED}✗ PostgreSQL connection failed${NC}"
        return 1
    fi
    
    # Test Redis connectivity
    if docker-compose -f $COMPOSE_FILE exec -T redis redis-cli ping > /dev/null 2>&1; then
        log "${GREEN}✓ Redis is responding to ping${NC}"
    else
        log "${RED}✗ Redis connection failed${NC}"
        return 1
    fi
    
    return 0
}

# Function to validate AI services
validate_ai_services() {
    log "${BLUE}[6/8] Validating AI service integration...${NC}"
    
    # Test Political Strategist endpoint
    if curl -f -s --max-time 10 "http://localhost/api/v1/strategist/health" > /dev/null 2>&1; then
        log "${GREEN}✓ Political Strategist module is accessible${NC}"
    else
        log "${YELLOW}⚠ Political Strategist module not responding (may need API keys)${NC}"
    fi
    
    # Check if API keys are configured
    if [ -n "$GEMINI_API_KEY" ] && [ "$GEMINI_API_KEY" != "your-gemini-api-key-here" ]; then
        log "${GREEN}✓ Gemini API key is configured${NC}"
    else
        log "${YELLOW}⚠ Gemini API key needs to be configured${NC}"
    fi
    
    if [ -n "$PERPLEXITY_API_KEY" ] && [ "$PERPLEXITY_API_KEY" != "your-perplexity-api-key-here" ]; then
        log "${GREEN}✓ Perplexity API key is configured${NC}"
    else
        log "${YELLOW}⚠ Perplexity API key needs to be configured${NC}"
    fi
    
    return 0
}

# Function to validate monitoring stack
validate_monitoring() {
    log "${BLUE}[7/8] Validating monitoring stack...${NC}"
    
    # Check Prometheus
    if test_url "http://localhost:9090/-/healthy" "Prometheus"; then
        local metrics_count=$(curl -s "http://localhost:9090/api/v1/label/__name__/values" | jq '.data | length' 2>/dev/null || echo "0")
        log "${GREEN}✓ Prometheus is collecting $metrics_count metrics${NC}"
    else
        log "${YELLOW}⚠ Prometheus is not responding${NC}"
    fi
    
    # Check Grafana
    if test_url "http://localhost:3000/api/health" "Grafana"; then
        log "${GREEN}✓ Grafana dashboard is accessible${NC}"
    else
        log "${YELLOW}⚠ Grafana is not responding${NC}"
    fi
    
    return 0
}

# Function to perform performance validation
validate_performance() {
    log "${BLUE}[8/8] Running performance validation...${NC}"
    
    # Test API response time
    local response_time=$(curl -o /dev/null -s -w '%{time_total}' http://localhost/api/v1/status 2>/dev/null || echo "timeout")
    if [ "$response_time" != "timeout" ]; then
        local response_ms=$(echo "$response_time * 1000" | bc -l 2>/dev/null | cut -d'.' -f1)
        if [ "$response_ms" -lt 2000 ]; then
            log "${GREEN}✓ API response time: ${response_ms}ms (under 2s target)${NC}"
        else
            log "${YELLOW}⚠ API response time: ${response_ms}ms (exceeds 2s target)${NC}"
        fi
    else
        log "${YELLOW}⚠ API response time test failed${NC}"
    fi
    
    # Check system resources
    local cpu_usage=$(docker exec lokdarpan-backend sh -c "top -bn1 | grep 'Cpu(s)' | awk '{print \$2}' | cut -d'%' -f1" 2>/dev/null || echo "unknown")
    if [ "$cpu_usage" != "unknown" ]; then
        log "${GREEN}✓ System CPU usage: ${cpu_usage}%${NC}"
    fi
    
    # Check container resource usage
    log "${GREEN}✓ Container resource usage:${NC}"
    docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}" 2>/dev/null | head -10 | while read line; do
        log "  $line"
    done || log "${YELLOW}⚠ Unable to get container stats${NC}"
    
    return 0
}

# Main validation function
run_validation() {
    log ""
    log "${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
    log "${BLUE}║     LokDarpan Enhanced Deployment Validation Report          ║${NC}"
    log "${BLUE}║     $(date)                                    ║${NC}"
    log "${BLUE}╚══════════════════════════════════════════════════════════════╝${NC}"
    log ""
    
    local validation_steps=(
        "validate_environment"
        "validate_compose_config" 
        "validate_containers"
        "validate_api_endpoints"
        "validate_database"
        "validate_ai_services"
        "validate_monitoring"
        "validate_performance"
    )
    
    local passed=0
    local total=${#validation_steps[@]}
    
    for step in "${validation_steps[@]}"; do
        if $step; then
            ((passed++))
        fi
        log ""
    done
    
    # Summary
    log "${BLUE}════════════════════════════════════════════════════════${NC}"
    log "${BLUE}Validation Summary${NC}"
    log "${BLUE}════════════════════════════════════════════════════════${NC}"
    log "Passed: $passed/$total validation steps"
    
    if [ $passed -eq $total ]; then
        log "${GREEN}🎉 All validations passed! Deployment is production-ready.${NC}"
        log "${GREEN}✓ LokDarpan Enhanced is fully operational${NC}"
        return 0
    elif [ $passed -ge $((total * 3 / 4)) ]; then
        log "${YELLOW}⚠ Most validations passed. Minor issues detected.${NC}"
        log "${YELLOW}✓ Deployment is functional with warnings${NC}"
        return 1
    else
        log "${RED}❌ Critical validation failures detected.${NC}"
        log "${RED}✗ Deployment requires immediate attention${NC}"
        return 2
    fi
}

# Banner and execution
echo -e "${GREEN}Starting LokDarpan Enhanced Deployment Validation...${NC}"

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    log "${RED}Docker is not running or not accessible${NC}"
    exit 1
fi

# Run validation
run_validation
exit_code=$?

log ""
log "${GREEN}Validation report saved to: $VALIDATION_REPORT${NC}"
log ""

exit $exit_code