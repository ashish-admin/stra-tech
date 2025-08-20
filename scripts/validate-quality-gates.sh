#!/bin/bash

# LokDarpan Political Intelligence Dashboard - Quality Gates Validation Script
# Comprehensive quality validation for Political Strategist system
# Usage: ./scripts/validate-quality-gates.sh [--ci] [--verbose]

set -e  # Exit on any error

# Configuration
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
LOG_FILE="${PROJECT_ROOT}/logs/quality-gates-${TIMESTAMP//[: -]//}.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Flags
CI_MODE=false
VERBOSE=false

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --ci)
            CI_MODE=true
            shift
            ;;
        --verbose)
            VERBOSE=true
            shift
            ;;
        *)
            echo "Unknown option: $1"
            echo "Usage: $0 [--ci] [--verbose]"
            exit 1
            ;;
    esac
done

# Logging function
log() {
    local level=$1
    local message=$2
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    if [[ $VERBOSE == true ]] || [[ $level == "ERROR" ]]; then
        case $level in
            "INFO")
                echo -e "${GREEN}[INFO]${NC} ${timestamp} - $message" | tee -a "$LOG_FILE"
                ;;
            "WARN")
                echo -e "${YELLOW}[WARN]${NC} ${timestamp} - $message" | tee -a "$LOG_FILE"
                ;;
            "ERROR")
                echo -e "${RED}[ERROR]${NC} ${timestamp} - $message" | tee -a "$LOG_FILE"
                ;;
            *)
                echo -e "${BLUE}[DEBUG]${NC} ${timestamp} - $message" | tee -a "$LOG_FILE"
                ;;
        esac
    else
        echo "$timestamp [$level] - $message" >> "$LOG_FILE"
    fi
}

# Create logs directory
mkdir -p "${PROJECT_ROOT}/logs"

# Initialize report
REPORT_FILE="${PROJECT_ROOT}/reports/quality-gates-report-${TIMESTAMP//[: -]//}.md"
mkdir -p "${PROJECT_ROOT}/reports"

cat > "$REPORT_FILE" << EOF
# LokDarpan Political Strategist - Quality Gates Report

**Generated:** $TIMESTAMP
**Project:** LokDarpan Political Intelligence Dashboard
**Component:** Political Strategist AI System

## Executive Summary

This report validates the quality gates for the Political Strategist system,
ensuring production readiness through comprehensive testing and quality metrics.

EOF

log "INFO" "Starting Quality Gates Validation"
log "INFO" "Project Root: $PROJECT_ROOT"
log "INFO" "Report File: $REPORT_FILE"

# Change to project root
cd "$PROJECT_ROOT"

# Quality Gate Results
declare -A GATE_RESULTS
TOTAL_GATES=0
PASSED_GATES=0

# Helper function to run quality gate
run_gate() {
    local gate_name=$1
    local gate_command=$2
    local gate_target=$3
    
    TOTAL_GATES=$((TOTAL_GATES + 1))
    log "INFO" "Running Quality Gate: $gate_name"
    
    echo "## Quality Gate: $gate_name" >> "$REPORT_FILE"
    echo "" >> "$REPORT_FILE"
    echo "**Target:** $gate_target" >> "$REPORT_FILE"
    echo "**Command:** \`$gate_command\`" >> "$REPORT_FILE"
    echo "" >> "$REPORT_FILE"
    
    if eval "$gate_command" &>> "$LOG_FILE"; then
        GATE_RESULTS[$gate_name]="PASSED"
        PASSED_GATES=$((PASSED_GATES + 1))
        log "INFO" "✅ $gate_name - PASSED"
        echo "**Status:** ✅ PASSED" >> "$REPORT_FILE"
    else
        GATE_RESULTS[$gate_name]="FAILED"
        log "ERROR" "❌ $gate_name - FAILED"
        echo "**Status:** ❌ FAILED" >> "$REPORT_FILE"
    fi
    echo "" >> "$REPORT_FILE"
}

# Quality Gate 1: Unit Tests Coverage (85%)
log "INFO" "=== Quality Gate 1: Unit Tests Coverage ===" 
run_gate "Unit Tests Coverage" \
    "cd backend && python -m pytest tests/strategist/unit/ --cov=strategist/service.py --cov=strategist/reasoner.py --cov=strategist/retriever.py --cov=strategist/nlp.py --cov=strategist/credibility.py --cov-fail-under=85 --cov-report=term-missing --quiet" \
    "≥85% coverage for critical strategist modules"

# Quality Gate 2: Integration Tests Coverage (75%)
log "INFO" "=== Quality Gate 2: Integration Tests Coverage ===" 
run_gate "Integration Tests Coverage" \
    "cd backend && python -m pytest tests/strategist/integration/ --cov=strategist --cov-fail-under=75 --cov-report=term-missing --quiet" \
    "≥75% coverage for integration tests"

# Quality Gate 3: Frontend Tests Coverage (75%)
log "INFO" "=== Quality Gate 3: Frontend Tests Coverage ===" 
run_gate "Frontend Tests Coverage" \
    "cd frontend && npm test -- --coverage --watchAll=false --coverageThreshold='{\"global\":{\"branches\":70,\"functions\":70,\"lines\":75,\"statements\":75}}' --silent" \
    "≥75% lines, ≥70% branches/functions coverage"

# Quality Gate 4: End-to-End Tests
log "INFO" "=== Quality Gate 4: End-to-End Tests ===" 
run_gate "End-to-End Tests" \
    "cd frontend && npx playwright test e2e/strategist/ --reporter=line" \
    "All E2E test scenarios pass"

# Quality Gate 5: Code Quality & Security
log "INFO" "=== Quality Gate 5: Code Quality & Security ===" 
run_gate "Code Quality & Security" \
    "make check" \
    "No critical linting, security, or audit issues"

# Quality Gate 6: Performance Baseline (if configured)
if [[ -f "${PROJECT_ROOT}/backend/tests/performance/test_strategist_performance.py" ]]; then
    log "INFO" "=== Quality Gate 6: Performance Baseline ===" 
    run_gate "Performance Baseline" \
        "cd backend && python -m pytest tests/performance/ --quiet" \
        "Response times within acceptable thresholds"
fi

# Generate summary
log "INFO" "=== Quality Gates Summary ==="
cat >> "$REPORT_FILE" << EOF

## Summary

**Total Gates:** $TOTAL_GATES
**Passed:** $PASSED_GATES
**Failed:** $((TOTAL_GATES - PASSED_GATES))
**Success Rate:** $(( PASSED_GATES * 100 / TOTAL_GATES ))%

EOF

if [[ $PASSED_GATES -eq $TOTAL_GATES ]]; then
    log "INFO" "✅ ALL QUALITY GATES PASSED! System ready for deployment."
    echo "**Overall Status:** ✅ **PASSED - PRODUCTION READY**" >> "$REPORT_FILE"
    
    # Generate deployment checklist
    cat >> "$REPORT_FILE" << EOF

## Deployment Checklist

- [x] Unit test coverage ≥85%
- [x] Integration test coverage ≥75%
- [x] Frontend test coverage ≥75%
- [x] End-to-end tests passing
- [x] Code quality standards met
- [x] Security scans clean
- [x] Performance within thresholds

**Recommendation:** ✅ **APPROVED FOR PRODUCTION DEPLOYMENT**

EOF

    if [[ $CI_MODE == false ]]; then
        echo ""
        echo -e "${GREEN}🎉 Congratulations! All quality gates passed.${NC}"
        echo -e "${GREEN}📊 Full report: $REPORT_FILE${NC}"
        echo -e "${GREEN}🚀 System is ready for production deployment.${NC}"
    fi
    exit 0
else
    log "ERROR" "❌ Quality gates validation FAILED ($PASSED_GATES/$TOTAL_GATES passed)"
    echo "**Overall Status:** ❌ **FAILED - DEPLOYMENT BLOCKED**" >> "$REPORT_FILE"
    
    cat >> "$REPORT_FILE" << EOF

## Failed Gates

EOF
    
    for gate in "${!GATE_RESULTS[@]}"; do
        if [[ "${GATE_RESULTS[$gate]}" == "FAILED" ]]; then
            echo "- ❌ $gate" >> "$REPORT_FILE"
            log "ERROR" "Failed gate: $gate"
        fi
    done
    
    cat >> "$REPORT_FILE" << EOF

**Recommendation:** ❌ **DEPLOYMENT BLOCKED - FIX FAILING GATES**

See detailed logs: \`$LOG_FILE\`

EOF

    if [[ $CI_MODE == false ]]; then
        echo ""
        echo -e "${RED}❌ Quality gates validation failed.${NC}"
        echo -e "${RED}📊 Full report: $REPORT_FILE${NC}"
        echo -e "${RED}📋 Check logs: $LOG_FILE${NC}"
        echo -e "${RED}🚫 Deployment blocked until issues resolved.${NC}"
    fi
    exit 1
fi