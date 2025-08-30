#!/bin/bash

# LokDarpan Monitoring Script
# Monitors system health and sends alerts

set -e

# Configuration
LOG_DIR="/home/lokdarpan/logs"
ALERT_EMAIL="${ALERT_EMAIL:-}"
SLACK_WEBHOOK="${SLACK_WEBHOOK:-}"
CHECK_INTERVAL=60  # seconds

# Thresholds
CPU_THRESHOLD=80
MEMORY_THRESHOLD=85
DISK_THRESHOLD=80
RESPONSE_TIME_THRESHOLD=5  # seconds

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Create log directory
mkdir -p $LOG_DIR

# Function to get CPU usage
get_cpu_usage() {
    top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1
}

# Function to get memory usage
get_memory_usage() {
    free | grep Mem | awk '{print int($3/$2 * 100)}'
}

# Function to get disk usage
get_disk_usage() {
    df -h / | awk 'NR==2 {print $5}' | sed 's/%//'
}

# Function to check service health
check_service_health() {
    local service=$1
    if docker ps | grep -q $service; then
        echo "UP"
    else
        echo "DOWN"
    fi
}

# Function to check API response time
check_api_response() {
    local start=$(date +%s%N)
    local response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost/api/v1/status)
    local end=$(date +%s%N)
    local duration=$(( ($end - $start) / 1000000 ))  # Convert to milliseconds
    
    echo "$response:$duration"
}

# Function to send alert
send_alert() {
    local level=$1
    local message=$2
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    # Log alert
    echo "[$timestamp] [$level] $message" >> $LOG_DIR/alerts.log
    
    # Send email alert if configured
    if [ ! -z "$ALERT_EMAIL" ]; then
        echo "$message" | mail -s "LokDarpan Alert: $level" $ALERT_EMAIL
    fi
    
    # Send Slack alert if configured
    if [ ! -z "$SLACK_WEBHOOK" ]; then
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"*LokDarpan Alert* [$level]\\n$message\"}" \
            $SLACK_WEBHOOK
    fi
    
    # Print to console
    case $level in
        "CRITICAL")
            echo -e "${RED}[CRITICAL] $message${NC}"
            ;;
        "WARNING")
            echo -e "${YELLOW}[WARNING] $message${NC}"
            ;;
        "INFO")
            echo -e "${GREEN}[INFO] $message${NC}"
            ;;
    esac
}

# Function to check system resources
check_system_resources() {
    local cpu=$(get_cpu_usage)
    local memory=$(get_memory_usage)
    local disk=$(get_disk_usage)
    
    # Check CPU
    if (( $(echo "$cpu > $CPU_THRESHOLD" | bc -l) )); then
        send_alert "WARNING" "High CPU usage: ${cpu}%"
    fi
    
    # Check Memory
    if [ $memory -gt $MEMORY_THRESHOLD ]; then
        send_alert "WARNING" "High memory usage: ${memory}%"
    fi
    
    # Check Disk
    if [ $disk -gt $DISK_THRESHOLD ]; then
        send_alert "WARNING" "High disk usage: ${disk}%"
    fi
    
    echo "CPU: ${cpu}% | Memory: ${memory}% | Disk: ${disk}%"
}

# Function to check Docker services
check_docker_services() {
    local services=("lokdarpan-postgres" "lokdarpan-redis" "lokdarpan-backend" "lokdarpan-frontend" "lokdarpan-celery-worker")
    local all_up=true
    
    for service in "${services[@]}"; do
        status=$(check_service_health $service)
        if [ "$status" = "DOWN" ]; then
            send_alert "CRITICAL" "Service $service is DOWN"
            all_up=false
        fi
    done
    
    if $all_up; then
        echo "All services are UP"
    fi
}

# Function to check API health
check_api_health() {
    local result=$(check_api_response)
    local http_code=$(echo $result | cut -d':' -f1)
    local response_time=$(echo $result | cut -d':' -f2)
    
    if [ "$http_code" != "200" ]; then
        send_alert "CRITICAL" "API is not responding (HTTP $http_code)"
    elif [ $response_time -gt $(($RESPONSE_TIME_THRESHOLD * 1000)) ]; then
        send_alert "WARNING" "API response time is slow: ${response_time}ms"
    else
        echo "API is healthy (${response_time}ms)"
    fi
}

# Function to check database connectivity
check_database() {
    if docker exec lokdarpan-postgres psql -U postgres -c "SELECT 1" > /dev/null 2>&1; then
        echo "Database is accessible"
    else
        send_alert "CRITICAL" "Database is not accessible"
    fi
}

# Function to check Redis connectivity
check_redis() {
    if docker exec lokdarpan-redis redis-cli ping > /dev/null 2>&1; then
        echo "Redis is accessible"
    else
        send_alert "CRITICAL" "Redis is not accessible"
    fi
}

# Function to check disk space for logs
check_log_rotation() {
    local log_size=$(du -sh $LOG_DIR 2>/dev/null | cut -f1)
    echo "Log directory size: $log_size"
    
    # Rotate logs if needed
    find $LOG_DIR -name "*.log" -size +100M -exec gzip {} \;
    find $LOG_DIR -name "*.log.gz" -mtime +30 -delete
}

# Function to generate health report
generate_health_report() {
    local report_file="$LOG_DIR/health_report_$(date +%Y%m%d_%H%M%S).txt"
    
    {
        echo "LokDarpan Health Report"
        echo "======================="
        echo "Timestamp: $(date)"
        echo ""
        echo "System Resources:"
        check_system_resources
        echo ""
        echo "Docker Services:"
        docker-compose -f docker-compose.production.yml ps
        echo ""
        echo "Database Status:"
        docker exec lokdarpan-postgres psql -U postgres -c "SELECT count(*) FROM post;"
        echo ""
        echo "Redis Status:"
        docker exec lokdarpan-redis redis-cli info stats | grep instantaneous_ops_per_sec
        echo ""
        echo "Recent Errors:"
        tail -n 20 $LOG_DIR/errors.log 2>/dev/null || echo "No recent errors"
    } > $report_file
    
    echo "Health report saved to: $report_file"
}

# Function for continuous monitoring
continuous_monitoring() {
    echo -e "${GREEN}Starting continuous monitoring...${NC}"
    echo "Check interval: ${CHECK_INTERVAL}s"
    echo "Press Ctrl+C to stop"
    
    while true; do
        clear
        echo -e "${GREEN}========================================${NC}"
        echo -e "${GREEN}LokDarpan System Monitor${NC}"
        echo -e "${GREEN}========================================${NC}"
        echo "Time: $(date)"
        echo ""
        
        echo "System Resources:"
        check_system_resources
        echo ""
        
        echo "Service Status:"
        check_docker_services
        echo ""
        
        echo "API Health:"
        check_api_health
        echo ""
        
        echo "Database:"
        check_database
        echo ""
        
        echo "Redis:"
        check_redis
        echo ""
        
        sleep $CHECK_INTERVAL
    done
}

# Main function
main() {
    case "${1:-}" in
        "continuous")
            continuous_monitoring
            ;;
        "report")
            generate_health_report
            ;;
        "check")
            echo "Running health checks..."
            check_system_resources
            check_docker_services
            check_api_health
            check_database
            check_redis
            check_log_rotation
            ;;
        *)
            echo "Usage: $0 {continuous|report|check}"
            echo ""
            echo "  continuous - Run continuous monitoring"
            echo "  report     - Generate health report"
            echo "  check      - Run single health check"
            exit 1
            ;;
    esac
}

# Handle interrupts
trap 'echo -e "${YELLOW}Monitoring stopped${NC}"; exit 0' INT TERM

# Run main function
main "$@"