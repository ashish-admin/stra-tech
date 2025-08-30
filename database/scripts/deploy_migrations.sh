#!/bin/bash
# LokDarpan Production-Safe Migration Deployment Script
# Handles database schema updates with comprehensive backup and validation

set -euo pipefail

# =============================================================================
# CONFIGURATION
# =============================================================================

DB_URL="${DATABASE_URL:-postgresql://lokdarpan_user:password@localhost/lokdarpan_db}"
BACKUP_DIR="${BACKUP_DIR:-/backups/pre-migration}"
MIGRATION_LOG="${MIGRATION_LOG:-/var/log/lokdarpan/migrations.log}"
APP_DIR="${APP_DIR:-/app/backend}"
MAX_MIGRATION_TIME=1800  # 30 minutes timeout

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# =============================================================================
# UTILITY FUNCTIONS
# =============================================================================

log_message() {
    local level="$1"
    local message="$2"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    case "$level" in
        "INFO")
            echo -e "${GREEN}[INFO]${NC} ${timestamp}: $message" | tee -a "$MIGRATION_LOG"
            ;;
        "WARN")
            echo -e "${YELLOW}[WARN]${NC} ${timestamp}: $message" | tee -a "$MIGRATION_LOG"
            ;;
        "ERROR")
            echo -e "${RED}[ERROR]${NC} ${timestamp}: $message" | tee -a "$MIGRATION_LOG"
            ;;
        "DEBUG")
            echo -e "${BLUE}[DEBUG]${NC} ${timestamp}: $message" | tee -a "$MIGRATION_LOG"
            ;;
    esac
}

check_prerequisites() {
    log_message "INFO" "Checking deployment prerequisites..."
    
    # Check if backup directory exists
    if [[ ! -d "$BACKUP_DIR" ]]; then
        log_message "INFO" "Creating backup directory: $BACKUP_DIR"
        mkdir -p "$BACKUP_DIR"
    fi
    
    # Check if log directory exists
    local log_dir=$(dirname "$MIGRATION_LOG")
    if [[ ! -d "$log_dir" ]]; then
        log_message "INFO" "Creating log directory: $log_dir"
        mkdir -p "$log_dir"
    fi
    
    # Check database connectivity
    if ! psql "$DB_URL" -c "SELECT version();" >/dev/null 2>&1; then
        log_message "ERROR" "Database connection failed. Check DATABASE_URL and database status."
        exit 1
    fi
    
    # Check if Flask app directory exists
    if [[ ! -d "$APP_DIR" ]]; then
        log_message "ERROR" "Flask application directory not found: $APP_DIR"
        exit 1
    fi
    
    # Check if virtual environment is available
    if [[ ! -f "$APP_DIR/venv/bin/activate" ]]; then
        log_message "ERROR" "Python virtual environment not found at: $APP_DIR/venv"
        exit 1
    fi
    
    log_message "INFO" "All prerequisites satisfied"
}

create_backup() {
    local backup_timestamp=$(date +%Y%m%d_%H%M%S)
    local backup_file="pre_migration_${backup_timestamp}.sql"
    local backup_path="$BACKUP_DIR/$backup_file"
    
    log_message "INFO" "Creating pre-migration backup..."
    log_message "DEBUG" "Backup location: $backup_path"
    
    # Create compressed custom format backup (fastest for large databases)
    if pg_dump --verbose --no-password --format=custom --compress=9 \
               --file="${backup_path}.custom" "$DB_URL" 2>>"$MIGRATION_LOG"; then
        log_message "INFO" "Custom format backup created successfully"
    else
        log_message "ERROR" "Custom format backup failed"
        exit 1
    fi
    
    # Create plain SQL backup for manual recovery
    if pg_dump --verbose --no-password --format=plain \
               --file="$backup_path" "$DB_URL" 2>>"$MIGRATION_LOG"; then
        log_message "INFO" "Plain SQL backup created successfully"
        gzip "$backup_path"
        log_message "DEBUG" "Plain backup compressed: ${backup_path}.gz"
    else
        log_message "WARN" "Plain SQL backup failed, but custom backup is available"
    fi
    
    # Store backup info for potential rollback
    echo "$backup_path.custom" > /tmp/lokdarpan_last_backup
    
    # Validate backup integrity
    if pg_restore --list "${backup_path}.custom" >/dev/null 2>&1; then
        log_message "INFO" "Backup integrity validated"
    else
        log_message "ERROR" "Backup validation failed"
        exit 1
    fi
}

check_migration_status() {
    log_message "INFO" "Checking current migration status..."
    
    cd "$APP_DIR"
    source venv/bin/activate
    
    # Get current migration head
    local current_head
    current_head=$(flask db current 2>/dev/null || echo "No migrations applied")
    log_message "DEBUG" "Current migration head: $current_head"
    
    # Check for multiple heads (merge conflicts)
    local heads_output
    heads_output=$(flask db heads 2>&1)
    
    if echo "$heads_output" | grep -q "multiple heads"; then
        log_message "WARN" "Multiple migration heads detected"
        log_message "INFO" "Attempting to merge heads automatically..."
        
        # Attempt automatic merge
        if flask db merge -m "Production deployment merge $(date +%Y%m%d_%H%M%S)" 2>>"$MIGRATION_LOG"; then
            log_message "INFO" "Migration heads merged successfully"
        else
            log_message "ERROR" "Failed to merge migration heads. Manual intervention required."
            exit 1
        fi
    else
        log_message "INFO" "Migration status is clean (single head)"
    fi
    
    # Show pending migrations
    local show_output
    show_output=$(flask db show 2>/dev/null || echo "No pending migrations")
    log_message "DEBUG" "Pending migrations: $show_output"
}

apply_migrations() {
    log_message "INFO" "Starting migration application..."
    
    cd "$APP_DIR"
    source venv/bin/activate
    
    # Set timeout for migration process
    timeout "$MAX_MIGRATION_TIME" flask db upgrade 2>>"$MIGRATION_LOG" || {
        local exit_code=$?
        if [[ $exit_code -eq 124 ]]; then
            log_message "ERROR" "Migration timed out after $MAX_MIGRATION_TIME seconds"
        else
            log_message "ERROR" "Migration failed with exit code: $exit_code"
        fi
        
        log_message "INFO" "Initiating automatic rollback..."
        rollback_migration
        exit 1
    }
    
    log_message "INFO" "Migrations applied successfully"
}

verify_migration() {
    log_message "INFO" "Verifying migration completion..."
    
    cd "$APP_DIR"
    source venv/bin/activate
    
    # Verify current migration state
    local post_migration_head
    post_migration_head=$(flask db current 2>/dev/null || echo "Error getting migration head")
    log_message "DEBUG" "Post-migration head: $post_migration_head"
    
    # Run basic connectivity and data validation
    log_message "INFO" "Running post-migration validation queries..."
    
    # Test critical table access
    local validation_queries=(
        "SELECT COUNT(*) FROM post"
        "SELECT COUNT(*) FROM ward_profile"
        "SELECT COUNT(*) FROM ward_demographics"
        "SELECT COUNT(*) FROM embedding_store"
        "SELECT COUNT(*) FROM alert"
    )
    
    for query in "${validation_queries[@]}"; do
        if psql "$DB_URL" -c "$query" >/dev/null 2>&1; then
            log_message "DEBUG" "Validation passed: $query"
        else
            log_message "ERROR" "Validation failed: $query"
            log_message "INFO" "Initiating rollback due to validation failure"
            rollback_migration
            exit 1
        fi
    done
    
    log_message "INFO" "All validation queries passed"
}

update_statistics() {
    log_message "INFO" "Updating table statistics for query optimizer..."
    
    if psql "$DB_URL" -c "ANALYZE;" 2>>"$MIGRATION_LOG"; then
        log_message "INFO" "Table statistics updated successfully"
    else
        log_message "WARN" "Failed to update table statistics (non-critical)"
    fi
}

rollback_migration() {
    log_message "WARN" "Starting migration rollback process..."
    
    if [[ ! -f "/tmp/lokdarpan_last_backup" ]]; then
        log_message "ERROR" "No backup reference found for rollback"
        exit 1
    fi
    
    local backup_file
    backup_file=$(cat /tmp/lokdarpan_last_backup)
    
    if [[ ! -f "$backup_file" ]]; then
        log_message "ERROR" "Backup file not found: $backup_file"
        exit 1
    fi
    
    log_message "INFO" "Restoring from backup: $backup_file"
    
    # Create a safety backup of current state before rollback
    local rollback_backup="$BACKUP_DIR/pre_rollback_$(date +%Y%m%d_%H%M%S).sql"
    pg_dump --format=custom --compress=9 --file="$rollback_backup" "$DB_URL" 2>>"$MIGRATION_LOG"
    
    # Terminate active connections to database
    psql "$DB_URL" -c "SELECT pg_terminate_backend(pg_stat_activity.pid) FROM pg_stat_activity WHERE pg_stat_activity.datname = 'lokdarpan_db' AND pid <> pg_backend_pid();" >/dev/null 2>&1
    
    # Restore from backup
    if pg_restore --verbose --clean --no-acl --no-owner --dbname="$DB_URL" "$backup_file" 2>>"$MIGRATION_LOG"; then
        log_message "INFO" "Database restored successfully from backup"
        log_message "INFO" "Pre-rollback state saved as: $rollback_backup"
    else
        log_message "ERROR" "Database rollback failed. Manual intervention required!"
        log_message "ERROR" "Original backup: $backup_file"
        log_message "ERROR" "Pre-rollback backup: $rollback_backup"
        exit 1
    fi
}

cleanup() {
    log_message "INFO" "Performing cleanup..."
    
    # Remove temporary files
    rm -f /tmp/lokdarpan_last_backup
    
    # Clean up old backups (keep last 10)
    if [[ -d "$BACKUP_DIR" ]]; then
        log_message "DEBUG" "Cleaning up old backup files..."
        ls -t "$BACKUP_DIR"/pre_migration_*.custom 2>/dev/null | tail -n +11 | xargs -r rm -f
        ls -t "$BACKUP_DIR"/pre_migration_*.sql.gz 2>/dev/null | tail -n +11 | xargs -r rm -f
    fi
    
    log_message "INFO" "Cleanup completed"
}

generate_report() {
    log_message "INFO" "Generating migration deployment report..."
    
    local report_file="/tmp/migration_deployment_report.json"
    local end_time=$(date -Iseconds)
    local backup_file=$(cat /tmp/lokdarpan_last_backup 2>/dev/null || echo "N/A")
    
    cd "$APP_DIR"
    source venv/bin/activate
    
    local final_head
    final_head=$(flask db current 2>/dev/null || echo "Error")
    
    cat > "$report_file" << EOF
{
    "deployment_timestamp": "$end_time",
    "database_url": "${DB_URL%%:*}://[REDACTED]",
    "backup_file": "$backup_file",
    "final_migration_head": "$final_head",
    "deployment_status": "SUCCESS",
    "log_file": "$MIGRATION_LOG",
    "validation_status": "PASSED"
}
EOF
    
    log_message "INFO" "Migration deployment report: $report_file"
}

# =============================================================================
# MAIN EXECUTION
# =============================================================================

main() {
    local start_time=$(date)
    
    log_message "INFO" "=== LokDarpan Migration Deployment Started ==="
    log_message "INFO" "Start time: $start_time"
    
    # Execute deployment steps
    check_prerequisites
    create_backup
    check_migration_status
    apply_migrations
    verify_migration
    update_statistics
    cleanup
    generate_report
    
    local end_time=$(date)
    log_message "INFO" "=== LokDarpan Migration Deployment Completed Successfully ==="
    log_message "INFO" "End time: $end_time"
    log_message "INFO" "Database is ready for Phase 1 political intelligence workloads"
}

# Handle script interruption
trap 'log_message "ERROR" "Script interrupted. Check migration status and consider rollback if necessary."; exit 130' INT TERM

# Execute main function
main "$@"