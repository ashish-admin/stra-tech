#!/bin/bash

# =============================================================================
# LokDarpan Phase 1 - Deployment Validation Script
# Comprehensive validation of API endpoints, SSE streaming, and performance
# =============================================================================

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Load environment
if [[ -f "${PROJECT_ROOT}/.env" ]]; then
    set -o allexport
    source "${PROJECT_ROOT}/.env"
    set +o allexport
fi

DOMAIN_NAME=${DOMAIN_NAME:-"localhost"}
BASE_URL="https://$DOMAIN_NAME"
API_BASE="${BASE_URL}/api/v1"

# Validation results
PASSED_TESTS=0
FAILED_TESTS=0
WARNING_TESTS=0

# Logging functions
log() {
    echo -e "${GREEN}[PASS] $1${NC}"
    ((PASSED_TESTS++))
}

warn() {
    echo -e "${YELLOW}[WARN] $1${NC}"
    ((WARNING_TESTS++))
}

error() {
    echo -e "${RED}[FAIL] $1${NC}"
    ((FAILED_TESTS++))
}

info() {
    echo -e "${BLUE}[INFO] $1${NC}"
}

# Test helper function
test_endpoint() {
    local url="$1"
    local expected_status="${2:-200}"
    local description="$3"
    local timeout="${4:-10}"
    
    info "Testing: $description"
    
    local response
    local status_code
    local response_time
    
    response=$(curl -w "\n%{http_code}\n%{time_total}" -s --max-time "$timeout" --connect-timeout 5 -k "$url" 2>/dev/null || echo -e "\n000\n999")
    
    status_code=$(echo "$response" | tail -n2 | head -n1)
    response_time=$(echo "$response" | tail -n1)
    
    if [[ "$status_code" == "$expected_status" ]]; then
        log "$description (${status_code}, ${response_time}s)"
        return 0
    elif [[ "$status_code" == "000" ]]; then
        error "$description - Connection failed"
        return 1
    else
        error "$description - Expected $expected_status, got $status_code"
        return 1
    fi
}

# Test authenticated endpoint
test_authenticated_endpoint() {
    local url="$1"
    local description="$2"
    local cookie_jar=$(mktemp)
    
    info "Testing authenticated endpoint: $description"
    
    # First, try to login
    local login_response
    login_response=$(curl -c "$cookie_jar" -s -w "%{http_code}" -X POST \
        -H "Content-Type: application/json" \
        -d '{"username":"admin","password":"admin"}' \
        "${API_BASE}/login" 2>/dev/null || echo "000")
    
    if [[ "$login_response" == "200" ]]; then
        # Now test the authenticated endpoint
        local auth_response
        auth_response=$(curl -b "$cookie_jar" -s -w "%{http_code}" "$url" 2>/dev/null || echo "000")
        
        if [[ "$auth_response" == "200" ]]; then
            log "$description (authenticated)"
        else
            warn "$description - Authentication may be required (got $auth_response)"
        fi
    else
        warn "$description - Could not authenticate for test"
    fi
    
    rm -f "$cookie_jar"
}

# Test SSE streaming endpoint
test_sse_streaming() {
    info "Testing SSE streaming functionality..."
    
    local sse_url="${API_BASE}/strategist/stream?ward=Jubilee%20Hills"
    local timeout=15
    local temp_output=$(mktemp)
    
    # Test SSE connection
    timeout "$timeout" curl -N -H "Accept: text/event-stream" -H "Cache-Control: no-cache" \
        "$sse_url" > "$temp_output" 2>/dev/null &
    local curl_pid=$!
    
    # Wait a bit for initial connection
    sleep 3
    
    # Check if process is still running (good sign for SSE)
    if kill -0 "$curl_pid" 2>/dev/null; then
        # Let it run a bit more
        sleep 2
        
        # Kill the curl process
        kill "$curl_pid" 2>/dev/null || true
        wait "$curl_pid" 2>/dev/null || true
        
        # Check if we got SSE data
        if [[ -s "$temp_output" ]]; then
            if grep -q "event:" "$temp_output" || grep -q "data:" "$temp_output"; then
                log "SSE streaming - Connected and receiving events"
            else
                warn "SSE streaming - Connected but no events detected"
            fi
        else
            warn "SSE streaming - Connected but no data received"
        fi
    else
        error "SSE streaming - Connection failed"
    fi
    
    rm -f "$temp_output"
}

# Performance test
test_performance() {
    info "Running performance tests..."
    
    local endpoint="${API_BASE}/status"
    local temp_results=$(mktemp)
    
    if command -v ab &> /dev/null; then
        # Use Apache Bench if available
        ab -n 50 -c 5 -g "$temp_results" "$endpoint" &> /dev/null
        
        if [[ -f "$temp_results" ]]; then
            local avg_time
            avg_time=$(awk 'NR>1 {sum+=$9; count++} END {if(count>0) print sum/count*1000}' "$temp_results")
            
            if [[ -n "$avg_time" ]]; then
                if (( $(echo "$avg_time < 1000" | bc -l) )); then
                    log "Performance test - Average response time: ${avg_time}ms"
                elif (( $(echo "$avg_time < 2000" | bc -l) )); then
                    warn "Performance test - Average response time: ${avg_time}ms (consider optimization)"
                else
                    error "Performance test - Average response time: ${avg_time}ms (too slow)"
                fi
            fi
        fi
        
        rm -f "$temp_results"
    else
        # Simple curl-based performance test
        local total_time=0
        local requests=10
        
        for i in $(seq 1 $requests); do
            local response_time
            response_time=$(curl -w "%{time_total}" -s -o /dev/null --max-time 5 "$endpoint" 2>/dev/null || echo "5.0")
            total_time=$(echo "$total_time + $response_time" | bc -l)
        done
        
        local avg_time
        avg_time=$(echo "scale=3; ($total_time / $requests) * 1000" | bc -l)
        
        if (( $(echo "$avg_time < 1000" | bc -l) )); then
            log "Performance test - Average response time: ${avg_time}ms"
        elif (( $(echo "$avg_time < 2000" | bc -l) )); then
            warn "Performance test - Average response time: ${avg_time}ms (consider optimization)"
        else
            error "Performance test - Average response time: ${avg_time}ms (too slow)"
        fi
    fi
}

# Test SSL/TLS configuration
test_ssl_configuration() {
    info "Testing SSL/TLS configuration..."
    
    if command -v openssl &> /dev/null; then
        local ssl_info
        ssl_info=$(echo | openssl s_client -connect "${DOMAIN_NAME}:443" -servername "$DOMAIN_NAME" 2>/dev/null)
        
        # Check TLS version
        if echo "$ssl_info" | grep -q "Protocol.*TLSv1\.[23]"; then
            log "SSL/TLS - Using modern TLS version"
        else
            warn "SSL/TLS - Consider upgrading TLS version"
        fi
        
        # Check certificate validity
        if echo "$ssl_info" | grep -q "Verify return code: 0"; then
            log "SSL/TLS - Certificate is valid"
        else
            error "SSL/TLS - Certificate validation failed"
        fi
        
        # Check cipher strength
        if echo "$ssl_info" | grep -q "Cipher.*256"; then
            log "SSL/TLS - Strong cipher suite in use"
        else
            warn "SSL/TLS - Consider stronger cipher suites"
        fi
    else
        warn "SSL/TLS - OpenSSL not available for detailed testing"
    fi
}

# Test security headers
test_security_headers() {
    info "Testing security headers..."
    
    local headers
    headers=$(curl -s -I "$BASE_URL" 2>/dev/null)
    
    # Check for security headers
    local security_checks=(
        "Strict-Transport-Security:HSTS header"
        "X-Content-Type-Options:Content type options"
        "X-Frame-Options:Frame options"
        "X-XSS-Protection:XSS protection"
        "Content-Security-Policy:CSP header"
    )
    
    for check in "${security_checks[@]}"; do
        local header="${check%:*}"
        local description="${check#*:}"
        
        if echo "$headers" | grep -qi "$header"; then
            log "Security Headers - $description present"
        else
            warn "Security Headers - $description missing"
        fi
    done
}

# Test database connectivity
test_database_connectivity() {
    info "Testing database connectivity..."
    
    # Test through API endpoint
    test_endpoint "${API_BASE}/health/database" "200" "Database health check" || return 1
    
    # Test data retrieval
    test_endpoint "${API_BASE}/posts?limit=1" "200" "Database query test" || return 1
}

# Test Redis connectivity  
test_redis_connectivity() {
    info "Testing Redis connectivity..."
    
    test_endpoint "${API_BASE}/health/redis" "200" "Redis health check" || return 1
}

# Test AI services
test_ai_services() {
    info "Testing AI services connectivity..."
    
    test_endpoint "${API_BASE}/strategist/health" "200" "AI services health check" 30 || return 1
}

# Test geographic optimization
test_geographic_optimization() {
    info "Testing geographic optimization..."
    
    # Test from multiple geographic locations (if tools available)
    if command -v dig &> /dev/null; then
        local dns_servers=("8.8.8.8" "1.1.1.1" "208.67.222.222")  # Google, Cloudflare, OpenDNS
        
        for dns in "${dns_servers[@]}"; do
            local lookup_time
            lookup_time=$(dig @"$dns" "$DOMAIN_NAME" | grep "Query time" | awk '{print $4}')
            
            if [[ -n "$lookup_time" ]] && [[ "$lookup_time" -lt 100 ]]; then
                log "Geographic optimization - DNS lookup via $dns: ${lookup_time}ms"
            else
                warn "Geographic optimization - DNS lookup via $dns: ${lookup_time}ms (consider CDN)"
            fi
        done
    fi
    
    # Test Indian timezone
    local server_time
    server_time=$(curl -s "${API_BASE}/time" 2>/dev/null | jq -r '.timezone' 2>/dev/null || echo "unknown")
    
    if [[ "$server_time" == "Asia/Kolkata" ]]; then
        log "Geographic optimization - Server using Indian timezone"
    else
        warn "Geographic optimization - Server timezone not optimized for India"
    fi
}

# Comprehensive API validation
validate_all_endpoints() {
    info "Validating all API endpoints..."
    
    # Public endpoints
    local public_endpoints=(
        "${API_BASE}/status:System status"
        "${API_BASE}/health:Overall health"
        "${API_BASE}/geojson:Ward boundaries"
        "${API_BASE}/time:Server time"
    )
    
    for endpoint_desc in "${public_endpoints[@]}"; do
        local endpoint="${endpoint_desc%:*}"
        local description="${endpoint_desc#*:}"
        test_endpoint "$endpoint" "200" "$description"
    done
    
    # Authentication endpoints
    test_endpoint "${API_BASE}/login" "200" "Login endpoint (GET)" || \
    test_endpoint "${API_BASE}/login" "405" "Login endpoint (Method not allowed)" # POST only
    
    # Data endpoints (may require authentication)
    local data_endpoints=(
        "${API_BASE}/posts:Posts data"
        "${API_BASE}/trends?ward=All&days=7:Trends data"
        "${API_BASE}/competitive-analysis?city=All:Competitive analysis"
        "${API_BASE}/alerts/All:Alerts data"
    )
    
    for endpoint_desc in "${data_endpoints[@]}"; do
        local endpoint="${endpoint_desc%:*}"
        local description="${endpoint_desc#*:}"
        test_authenticated_endpoint "$endpoint" "$description"
    done
    
    # Political Strategist endpoints
    local strategist_endpoints=(
        "${API_BASE}/strategist/health:Strategist health"
        "${API_BASE}/strategist/Jubilee%20Hills?depth=quick:Quick analysis"
    )
    
    for endpoint_desc in "${strategist_endpoints[@]}"; do
        local endpoint="${endpoint_desc%:*}"
        local description="${endpoint_desc#*:}"
        test_authenticated_endpoint "$endpoint" "$description"
    done
}

# Test monitoring endpoints
test_monitoring() {
    info "Testing monitoring endpoints..."
    
    # Test Prometheus metrics (if accessible)
    if curl -s --max-time 5 "https://metrics.${DOMAIN_NAME}/api/v1/status/runtimeinfo" &>/dev/null; then
        log "Monitoring - Prometheus metrics accessible"
    else
        warn "Monitoring - Prometheus metrics not accessible (may require authentication)"
    fi
    
    # Test Traefik dashboard (if accessible)
    if curl -s --max-time 5 "https://admin.${DOMAIN_NAME}/api/version" &>/dev/null; then
        log "Monitoring - Traefik dashboard accessible"
    else
        warn "Monitoring - Traefik dashboard not accessible (may require authentication)"
    fi
}

# Test backup system
test_backup_system() {
    info "Testing backup system..."
    
    if [[ -f "${PROJECT_ROOT}/deployment/scripts/backup.sh" ]]; then
        log "Backup system - Backup script exists"
        
        # Check if backup directories exist
        if [[ -d "/opt/lokdarpan/backups" ]] || [[ -d "${DATA_PATH:-/var/lib/lokdarpan}/backups" ]]; then
            log "Backup system - Backup directory configured"
        else
            warn "Backup system - Backup directory not found"
        fi
        
        # Check cron job
        if crontab -l 2>/dev/null | grep -q "backup.sh"; then
            log "Backup system - Automated backup scheduled"
        else
            warn "Backup system - No automated backup scheduled"
        fi
    else
        error "Backup system - Backup script missing"
    fi
}

# Generate validation report
generate_validation_report() {
    local report_file="${PROJECT_ROOT}/deployment/validation-report-$(date +%Y%m%d_%H%M%S).md"
    
    cat > "$report_file" << EOF
# LokDarpan Phase 1 - Deployment Validation Report

**Validation Date**: $(date)
**Domain**: $DOMAIN_NAME
**Base URL**: $BASE_URL

## Test Results Summary

- ✅ **Passed**: $PASSED_TESTS tests
- ⚠️ **Warnings**: $WARNING_TESTS tests  
- ❌ **Failed**: $FAILED_TESTS tests

## Test Categories

### Infrastructure Tests
- SSL/TLS Configuration
- Security Headers
- Geographic Optimization
- DNS Resolution

### Application Tests  
- API Endpoints
- Authentication
- Database Connectivity
- Redis Connectivity
- AI Services

### Performance Tests
- Response Times
- SSE Streaming
- Load Handling

### Monitoring Tests
- Health Checks
- Metrics Collection
- Dashboard Access
- Backup System

## Recommendations

EOF

    if [[ $FAILED_TESTS -gt 0 ]]; then
        echo "### Critical Issues (Must Fix)" >> "$report_file"
        echo "- Review failed tests and address critical infrastructure issues" >> "$report_file"
        echo "- Verify all required services are running" >> "$report_file"
        echo "- Check network connectivity and firewall rules" >> "$report_file"
        echo "" >> "$report_file"
    fi

    if [[ $WARNING_TESTS -gt 0 ]]; then
        echo "### Optimization Opportunities" >> "$report_file"
        echo "- Address warning issues to improve performance and security" >> "$report_file"
        echo "- Configure missing security headers" >> "$report_file"
        echo "- Optimize response times where possible" >> "$report_file"
        echo "- Set up monitoring and alerting" >> "$report_file"
        echo "" >> "$report_file"
    fi

    if [[ $PASSED_TESTS -gt 0 ]] && [[ $FAILED_TESTS -eq 0 ]]; then
        echo "### Production Readiness" >> "$report_file"
        echo "✅ **System is ready for production use**" >> "$report_file"
        echo "" >> "$report_file"
        echo "Next steps:" >> "$report_file"
        echo "1. Configure monitoring alerts" >> "$report_file"
        echo "2. Set up user access and permissions" >> "$report_file"
        echo "3. Train campaign team on system usage" >> "$report_file"
        echo "4. Schedule regular maintenance windows" >> "$report_file"
    fi

    echo "---" >> "$report_file"
    echo "**Report generated by LokDarpan validation script**" >> "$report_file"
    
    info "Validation report generated: $report_file"
}

# Main validation function
main() {
    info "Starting comprehensive deployment validation for LokDarpan Phase 1..."
    echo "Domain: $DOMAIN_NAME"
    echo "Base URL: $BASE_URL"
    echo "Timestamp: $(date)"
    echo "----------------------------------------"
    
    # Run all validation tests
    test_ssl_configuration
    test_security_headers
    validate_all_endpoints
    test_database_connectivity
    test_redis_connectivity
    test_ai_services
    test_sse_streaming
    test_performance
    test_geographic_optimization
    test_monitoring
    test_backup_system
    
    echo "----------------------------------------"
    info "Validation completed!"
    
    echo "Results:"
    echo "  ✅ Passed: $PASSED_TESTS"
    echo "  ⚠️ Warnings: $WARNING_TESTS" 
    echo "  ❌ Failed: $FAILED_TESTS"
    
    generate_validation_report
    
    # Exit code based on test results
    if [[ $FAILED_TESTS -gt 0 ]]; then
        echo ""
        error "Some tests failed. Please review and fix critical issues before production use."
        exit 1
    elif [[ $WARNING_TESTS -gt 0 ]]; then
        echo ""
        warn "All critical tests passed, but some optimizations are recommended."
        exit 0
    else
        echo ""
        log "All tests passed! System is ready for production."
        exit 0
    fi
}

# Handle script arguments
case "${1:-validate}" in
    "validate"|"all")
        main
        ;;
    "api")
        validate_all_endpoints
        ;;
    "ssl")
        test_ssl_configuration
        ;;
    "performance")
        test_performance
        ;;
    "sse")
        test_sse_streaming
        ;;
    "security")
        test_security_headers
        ;;
    "monitoring")
        test_monitoring
        ;;
    *)
        echo "Usage: $0 {validate|api|ssl|performance|sse|security|monitoring}"
        echo ""
        echo "Commands:"
        echo "  validate    - Run all validation tests (default)"
        echo "  api         - Test API endpoints only"
        echo "  ssl         - Test SSL/TLS configuration"
        echo "  performance - Run performance tests"
        echo "  sse         - Test SSE streaming"
        echo "  security    - Test security headers"
        echo "  monitoring  - Test monitoring endpoints"
        exit 1
        ;;
esac