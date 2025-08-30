#!/bin/bash

# LokDarpan Enhanced Health Check Script  
# Quick health check for monitoring and alerting systems

set -e

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
COMPOSE_FILE="docker-compose.production-enhanced.yml"
TIMEOUT=10
HEALTH_LOG="/var/log/lokdarpan-health.log"

# Function to log with timestamp
log_health() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$HEALTH_LOG" 2>/dev/null || true
}

# Function to test service endpoint
test_service() {
    local url=$1
    local service_name=$2
    local timeout=${3:-$TIMEOUT}
    
    if curl -f -s --max-time $timeout "$url" > /dev/null 2>&1; then
        echo -e "${GREEN}✓ $service_name${NC}"
        log_health "OK: $service_name at $url"
        return 0
    else
        echo -e "${RED}✗ $service_name${NC}"
        log_health "ERROR: $service_name at $url"
        return 1
    fi
}

# Function to check container status
check_container() {
    local container_name="lokdarpan-$1"
    local service_name=$1
    
    if docker ps --filter "name=$container_name" --filter "status=running" --format '{{.Names}}' | grep -q "$container_name"; then
        echo -e "${GREEN}✓ $service_name container${NC}"
        log_health "OK: Container $container_name is running"
        return 0
    else
        echo -e "${RED}✗ $service_name container${NC}"
        log_health "ERROR: Container $container_name is not running"
        return 1
    fi
}

# Function to check system resources
check_resources() {
    # Check disk space
    local disk_usage=$(df / | awk 'NR==2 {print $5}' | sed 's/%//')
    if [ "$disk_usage" -lt 85 ]; then
        echo -e "${GREEN}✓ Disk usage: ${disk_usage}%${NC}"
        log_health "OK: Disk usage at ${disk_usage}%"
    else
        echo -e "${YELLOW}⚠ Disk usage: ${disk_usage}%${NC}"
        log_health "WARNING: High disk usage at ${disk_usage}%"
    fi
    
    # Check memory usage
    local mem_usage=$(free | awk 'NR==2{printf "%.1f", ($3/$2)*100}')
    local mem_int=${mem_usage%.*}
    if [ "$mem_int" -lt 85 ]; then
        echo -e "${GREEN}✓ Memory usage: ${mem_usage}%${NC}"
        log_health "OK: Memory usage at ${mem_usage}%"
    else
        echo -e "${YELLOW}⚠ Memory usage: ${mem_usage}%${NC}"
        log_health "WARNING: High memory usage at ${mem_usage}%"
    fi
    
    # Check load average
    local load=$(uptime | awk -F'load average:' '{print $2}' | awk '{print $1}' | sed 's/,//')
    echo -e "${GREEN}✓ Load average: ${load}${NC}"
    log_health "INFO: Load average is ${load}"
}

# Function to perform quick health check
quick_health_check() {
    echo -e "${BLUE}LokDarpan Health Check - $(date)${NC}"
    echo "=================================================="
    
    local failed_checks=0
    
    # Core service checks
    echo -e "\n${BLUE}Core Services:${NC}"
    check_container "postgres" || ((failed_checks++))
    check_container "redis" || ((failed_checks++))
    check_container "backend" || ((failed_checks++))
    check_container "frontend" || ((failed_checks++))
    
    # API endpoint checks
    echo -e "\n${BLUE}API Endpoints:${NC}"
    test_service "http://localhost/api/v1/status" "Backend API" 5 || ((failed_checks++))
    test_service "http://localhost/health" "Health Endpoint" 5 || ((failed_checks++))
    test_service "http://localhost" "Frontend" 5 || ((failed_checks++))
    
    # Database connectivity
    echo -e "\n${BLUE}Database Services:${NC}"
    if docker-compose -f $COMPOSE_FILE exec -T postgres pg_isready -U postgres > /dev/null 2>&1; then
        echo -e "${GREEN}✓ PostgreSQL${NC}"
        log_health "OK: PostgreSQL is ready"
    else
        echo -e "${RED}✗ PostgreSQL${NC}"
        log_health "ERROR: PostgreSQL is not ready"
        ((failed_checks++))
    fi
    
    if docker-compose -f $COMPOSE_FILE exec -T redis redis-cli ping > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Redis${NC}"
        log_health "OK: Redis is responding"
    else
        echo -e "${RED}✗ Redis${NC}"
        log_health "ERROR: Redis is not responding"
        ((failed_checks++))
    fi
    
    # System resources
    echo -e "\n${BLUE}System Resources:${NC}"
    check_resources
    
    # AI Services (optional check)
    echo -e "\n${BLUE}AI Services:${NC}"
    if test_service "http://localhost/api/v1/strategist/health" "Political Strategist" 5; then
        log_health "OK: Political Strategist is responding"
    else
        echo -e "${YELLOW}⚠ Political Strategist (may need API keys)${NC}"
        log_health "WARNING: Political Strategist not responding"
    fi
    
    # Monitoring stack (optional)
    echo -e "\n${BLUE}Monitoring Stack:${NC}"
    test_service "http://localhost:9090/-/healthy" "Prometheus" 3 || echo -e "${YELLOW}⚠ Prometheus (optional)${NC}"
    test_service "http://localhost:3000/api/health" "Grafana" 3 || echo -e "${YELLOW}⚠ Grafana (optional)${NC}"
    
    # Summary
    echo -e "\n${BLUE}=================================================="
    if [ $failed_checks -eq 0 ]; then
        echo -e "${GREEN}✓ All core services are healthy${NC}"
        log_health "SUMMARY: All core services healthy"
        echo "0" > /tmp/lokdarpan-health-status
        return 0
    else
        echo -e "${RED}✗ $failed_checks service(s) failed health check${NC}"
        log_health "SUMMARY: $failed_checks services failed"
        echo "$failed_checks" > /tmp/lokdarpan-health-status
        return 1
    fi
}

# Function to generate health metrics for monitoring systems
generate_metrics() {
    echo "# LokDarpan Health Metrics"
    echo "# TYPE lokdarpan_service_up gauge"
    
    # Core services
    local services=("postgres" "redis" "backend" "frontend")
    for service in "${services[@]}"; do
        if check_container "$service" > /dev/null 2>&1; then
            echo "lokdarpan_service_up{service=\"$service\"} 1"
        else
            echo "lokdarpan_service_up{service=\"$service\"} 0"
        fi
    done
    
    # API endpoints
    if curl -f -s --max-time 3 "http://localhost/api/v1/status" > /dev/null 2>&1; then
        echo "lokdarpan_api_up{endpoint=\"status\"} 1"
    else
        echo "lokdarpan_api_up{endpoint=\"status\"} 0"
    fi
    
    # System metrics
    local disk_usage=$(df / | awk 'NR==2 {print $5}' | sed 's/%//')
    echo "lokdarpan_disk_usage_percent $disk_usage"
    
    local mem_usage=$(free | awk 'NR==2{printf "%.1f", ($3/$2)*100}')
    echo "lokdarpan_memory_usage_percent $mem_usage"
    
    # Response time
    local response_time=$(curl -o /dev/null -s -w '%{time_total}' http://localhost/api/v1/status 2>/dev/null || echo "0")
    echo "lokdarpan_api_response_time_seconds $response_time"
}

# Main execution
case "${1:-health}" in
    "health"|"check")
        quick_health_check
        ;;
    "metrics")
        generate_metrics
        ;;
    "status")
        if [ -f /tmp/lokdarpan-health-status ]; then
            exit_code=$(cat /tmp/lokdarpan-health-status)
            if [ "$exit_code" -eq 0 ]; then
                echo "HEALTHY"
                exit 0
            else
                echo "UNHEALTHY ($exit_code issues)"
                exit 1
            fi
        else
            echo "UNKNOWN (no recent health check)"
            exit 2
        fi
        ;;
    *)
        echo "Usage: $0 {health|metrics|status}"
        echo "  health  - Run full health check (default)"
        echo "  metrics - Output Prometheus-compatible metrics"
        echo "  status  - Show last health check status"
        exit 1
        ;;
esac