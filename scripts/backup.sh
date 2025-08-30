#!/bin/bash

# LokDarpan Backup Script
# Performs database backup and uploads to Google Cloud Storage

set -e

# Configuration
BACKUP_DIR="/home/lokdarpan/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_RETENTION_DAYS=7
GCS_BUCKET="${GCS_BACKUP_BUCKET:-}"  # Set in environment or .env.production

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Create backup directory
mkdir -p $BACKUP_DIR

echo -e "${GREEN}Starting LokDarpan backup at $TIMESTAMP${NC}"

# Function to backup PostgreSQL
backup_postgres() {
    echo -e "${YELLOW}Backing up PostgreSQL database...${NC}"
    
    # Check if container is running
    if ! docker ps | grep -q lokdarpan-postgres; then
        echo -e "${RED}PostgreSQL container is not running${NC}"
        return 1
    fi
    
    # Perform backup
    docker exec lokdarpan-postgres pg_dumpall -U postgres | gzip > $BACKUP_DIR/postgres_$TIMESTAMP.sql.gz
    
    # Get backup size
    SIZE=$(du -h $BACKUP_DIR/postgres_$TIMESTAMP.sql.gz | cut -f1)
    echo -e "${GREEN}PostgreSQL backup completed: $SIZE${NC}"
}

# Function to backup Redis
backup_redis() {
    echo -e "${YELLOW}Backing up Redis data...${NC}"
    
    # Check if container is running
    if ! docker ps | grep -q lokdarpan-redis; then
        echo -e "${RED}Redis container is not running${NC}"
        return 1
    fi
    
    # Trigger Redis save
    docker exec lokdarpan-redis redis-cli BGSAVE
    sleep 2
    
    # Copy dump file
    docker cp lokdarpan-redis:/data/dump.rdb $BACKUP_DIR/redis_$TIMESTAMP.rdb
    gzip $BACKUP_DIR/redis_$TIMESTAMP.rdb
    
    echo -e "${GREEN}Redis backup completed${NC}"
}

# Function to backup application data
backup_app_data() {
    echo -e "${YELLOW}Backing up application data...${NC}"
    
    # Backup uploaded files and data
    if [ -d "backend/data" ]; then
        tar -czf $BACKUP_DIR/app_data_$TIMESTAMP.tar.gz backend/data/
        echo -e "${GREEN}Application data backup completed${NC}"
    fi
    
    # Backup logs (optional)
    if [ -d "backend/logs" ]; then
        tar -czf $BACKUP_DIR/logs_$TIMESTAMP.tar.gz backend/logs/
        echo -e "${GREEN}Logs backup completed${NC}"
    fi
}

# Function to backup Docker volumes
backup_docker_volumes() {
    echo -e "${YELLOW}Backing up Docker volumes...${NC}"
    
    # List all volumes used by lokdarpan
    VOLUMES=$(docker volume ls -q | grep lokdarpan)
    
    for volume in $VOLUMES; do
        echo "Backing up volume: $volume"
        docker run --rm -v $volume:/data -v $BACKUP_DIR:/backup alpine \
            tar -czf /backup/volume_${volume}_$TIMESTAMP.tar.gz -C /data .
    done
    
    echo -e "${GREEN}Docker volumes backup completed${NC}"
}

# Function to upload to GCS
upload_to_gcs() {
    if [ -z "$GCS_BUCKET" ]; then
        echo -e "${YELLOW}GCS_BUCKET not configured, skipping cloud upload${NC}"
        return 0
    fi
    
    echo -e "${YELLOW}Uploading backups to Google Cloud Storage...${NC}"
    
    # Check if gsutil is available
    if ! command -v gsutil &> /dev/null; then
        echo -e "${RED}gsutil not found, skipping cloud upload${NC}"
        return 1
    fi
    
    # Upload all new backup files
    for file in $BACKUP_DIR/*_$TIMESTAMP*; do
        if [ -f "$file" ]; then
            echo "Uploading $(basename $file)..."
            gsutil -q cp $file gs://$GCS_BUCKET/backups/
        fi
    done
    
    echo -e "${GREEN}Cloud upload completed${NC}"
}

# Function to cleanup old backups
cleanup_old_backups() {
    echo -e "${YELLOW}Cleaning up old backups...${NC}"
    
    # Local cleanup
    find $BACKUP_DIR -type f -mtime +$BACKUP_RETENTION_DAYS -delete
    
    # GCS cleanup (if configured)
    if [ ! -z "$GCS_BUCKET" ] && command -v gsutil &> /dev/null; then
        # Delete files older than retention period from GCS
        gsutil -q ls -l gs://$GCS_BUCKET/backups/ | \
            awk '$1 ~ /^[0-9]/ {print $3}' | \
            while read url; do
                FILE_DATE=$(gsutil stat $url | grep "Creation time:" | cut -d' ' -f3)
                FILE_EPOCH=$(date -d "$FILE_DATE" +%s)
                CUTOFF_EPOCH=$(date -d "$BACKUP_RETENTION_DAYS days ago" +%s)
                if [ $FILE_EPOCH -lt $CUTOFF_EPOCH ]; then
                    echo "Deleting old backup: $url"
                    gsutil -q rm $url
                fi
            done
    fi
    
    echo -e "${GREEN}Cleanup completed${NC}"
}

# Function to create backup report
create_backup_report() {
    REPORT_FILE="$BACKUP_DIR/backup_report_$TIMESTAMP.txt"
    
    echo "LokDarpan Backup Report" > $REPORT_FILE
    echo "========================" >> $REPORT_FILE
    echo "Timestamp: $TIMESTAMP" >> $REPORT_FILE
    echo "" >> $REPORT_FILE
    echo "Backup Files:" >> $REPORT_FILE
    ls -lh $BACKUP_DIR/*_$TIMESTAMP* >> $REPORT_FILE 2>/dev/null || echo "No backup files found" >> $REPORT_FILE
    echo "" >> $REPORT_FILE
    echo "Disk Usage:" >> $REPORT_FILE
    df -h >> $REPORT_FILE
    echo "" >> $REPORT_FILE
    echo "Docker Status:" >> $REPORT_FILE
    docker ps --format "table {{.Names}}\t{{.Status}}" >> $REPORT_FILE
    
    echo -e "${GREEN}Backup report created: $REPORT_FILE${NC}"
}

# Main backup process
main() {
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}LokDarpan Backup Process${NC}"
    echo -e "${GREEN}========================================${NC}"
    
    # Run backups
    backup_postgres
    backup_redis
    backup_app_data
    backup_docker_volumes
    
    # Upload to cloud
    upload_to_gcs
    
    # Cleanup old backups
    cleanup_old_backups
    
    # Create report
    create_backup_report
    
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}Backup completed successfully!${NC}"
    echo -e "${GREEN}========================================${NC}"
    
    # Show summary
    echo -e "Backup location: $BACKUP_DIR"
    echo -e "Backup files:"
    ls -lh $BACKUP_DIR/*_$TIMESTAMP* 2>/dev/null || echo "No files created"
}

# Handle errors
trap 'echo -e "${RED}Backup failed with error on line $LINENO${NC}"' ERR

# Run main function
main