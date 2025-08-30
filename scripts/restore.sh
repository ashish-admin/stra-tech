#!/bin/bash

# LokDarpan Restore Script
# Restores database and application data from backup

set -e

# Configuration
BACKUP_DIR="/home/lokdarpan/backups"
GCS_BUCKET="${GCS_BACKUP_BUCKET:-}"

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}LokDarpan Restore Process${NC}"
echo -e "${GREEN}========================================${NC}"

# Function to list available backups
list_backups() {
    echo -e "${YELLOW}Available local backups:${NC}"
    ls -lh $BACKUP_DIR/*.sql.gz 2>/dev/null || echo "No local backups found"
    
    if [ ! -z "$GCS_BUCKET" ] && command -v gsutil &> /dev/null; then
        echo -e "${YELLOW}Available cloud backups:${NC}"
        gsutil ls gs://$GCS_BUCKET/backups/*.sql.gz 2>/dev/null || echo "No cloud backups found"
    fi
}

# Function to download backup from GCS
download_from_gcs() {
    local backup_name=$1
    
    if [ -z "$GCS_BUCKET" ]; then
        echo -e "${RED}GCS_BUCKET not configured${NC}"
        return 1
    fi
    
    echo -e "${YELLOW}Downloading backup from GCS...${NC}"
    gsutil cp gs://$GCS_BUCKET/backups/$backup_name $BACKUP_DIR/
    echo -e "${GREEN}Download completed${NC}"
}

# Function to restore PostgreSQL
restore_postgres() {
    local backup_file=$1
    
    echo -e "${YELLOW}Restoring PostgreSQL database from $backup_file...${NC}"
    
    # Check if container is running
    if ! docker ps | grep -q lokdarpan-postgres; then
        echo -e "${RED}PostgreSQL container is not running${NC}"
        echo -e "${YELLOW}Starting PostgreSQL container...${NC}"
        docker-compose -f docker-compose.production.yml up -d postgres
        sleep 10
    fi
    
    # Stop all services except postgres to prevent connections
    echo -e "${YELLOW}Stopping application services...${NC}"
    docker-compose -f docker-compose.production.yml stop backend celery-worker celery-beat
    
    # Drop existing database and restore
    echo -e "${YELLOW}Dropping existing database...${NC}"
    docker exec lokdarpan-postgres psql -U postgres -c "DROP DATABASE IF EXISTS lokdarpan_db;"
    docker exec lokdarpan-postgres psql -U postgres -c "CREATE DATABASE lokdarpan_db;"
    
    # Restore from backup
    echo -e "${YELLOW}Restoring database...${NC}"
    gunzip -c $backup_file | docker exec -i lokdarpan-postgres psql -U postgres
    
    echo -e "${GREEN}PostgreSQL restore completed${NC}"
}

# Function to restore Redis
restore_redis() {
    local backup_file=$1
    
    echo -e "${YELLOW}Restoring Redis data from $backup_file...${NC}"
    
    # Stop Redis
    docker-compose -f docker-compose.production.yml stop redis
    
    # Copy backup file
    gunzip -c $backup_file > /tmp/dump.rdb
    docker cp /tmp/dump.rdb lokdarpan-redis:/data/dump.rdb
    
    # Start Redis
    docker-compose -f docker-compose.production.yml start redis
    
    echo -e "${GREEN}Redis restore completed${NC}"
}

# Function to restore application data
restore_app_data() {
    local backup_file=$1
    
    echo -e "${YELLOW}Restoring application data from $backup_file...${NC}"
    
    # Extract backup
    tar -xzf $backup_file -C /
    
    echo -e "${GREEN}Application data restore completed${NC}"
}

# Function to restore Docker volumes
restore_docker_volumes() {
    local backup_file=$1
    local volume_name=$(basename $backup_file | sed 's/volume_//' | sed 's/_[0-9]*.tar.gz//')
    
    echo -e "${YELLOW}Restoring Docker volume: $volume_name${NC}"
    
    # Stop containers using this volume
    docker-compose -f docker-compose.production.yml down
    
    # Restore volume
    docker run --rm -v $volume_name:/data -v $BACKUP_DIR:/backup alpine \
        sh -c "cd /data && tar -xzf /backup/$(basename $backup_file)"
    
    echo -e "${GREEN}Docker volume restore completed${NC}"
}

# Interactive restore menu
interactive_restore() {
    echo -e "${YELLOW}Select restore option:${NC}"
    echo "1) Restore PostgreSQL database"
    echo "2) Restore Redis data"
    echo "3) Restore application data"
    echo "4) Restore Docker volumes"
    echo "5) Full system restore"
    echo "6) Exit"
    
    read -p "Enter option (1-6): " option
    
    case $option in
        1)
            list_backups
            read -p "Enter backup filename (or 'latest' for most recent): " backup_name
            if [ "$backup_name" == "latest" ]; then
                backup_name=$(ls -t $BACKUP_DIR/postgres_*.sql.gz 2>/dev/null | head -1)
            fi
            restore_postgres "$backup_name"
            ;;
        2)
            list_backups
            read -p "Enter backup filename: " backup_name
            restore_redis "$BACKUP_DIR/$backup_name"
            ;;
        3)
            ls -lh $BACKUP_DIR/app_data_*.tar.gz 2>/dev/null || echo "No app data backups found"
            read -p "Enter backup filename: " backup_name
            restore_app_data "$BACKUP_DIR/$backup_name"
            ;;
        4)
            ls -lh $BACKUP_DIR/volume_*.tar.gz 2>/dev/null || echo "No volume backups found"
            read -p "Enter backup filename: " backup_name
            restore_docker_volumes "$BACKUP_DIR/$backup_name"
            ;;
        5)
            echo -e "${YELLOW}Full system restore will overwrite all data!${NC}"
            read -p "Are you sure? (yes/no): " confirm
            if [ "$confirm" == "yes" ]; then
                full_restore
            fi
            ;;
        6)
            echo "Exiting..."
            exit 0
            ;;
        *)
            echo -e "${RED}Invalid option${NC}"
            exit 1
            ;;
    esac
}

# Full system restore
full_restore() {
    echo -e "${YELLOW}Starting full system restore...${NC}"
    
    # Get latest backups
    POSTGRES_BACKUP=$(ls -t $BACKUP_DIR/postgres_*.sql.gz 2>/dev/null | head -1)
    REDIS_BACKUP=$(ls -t $BACKUP_DIR/redis_*.rdb.gz 2>/dev/null | head -1)
    APP_DATA_BACKUP=$(ls -t $BACKUP_DIR/app_data_*.tar.gz 2>/dev/null | head -1)
    
    if [ -z "$POSTGRES_BACKUP" ]; then
        echo -e "${RED}No PostgreSQL backup found${NC}"
        exit 1
    fi
    
    # Stop all services
    echo -e "${YELLOW}Stopping all services...${NC}"
    docker-compose -f docker-compose.production.yml down
    
    # Start only required services
    echo -e "${YELLOW}Starting database services...${NC}"
    docker-compose -f docker-compose.production.yml up -d postgres redis
    sleep 10
    
    # Restore databases
    restore_postgres "$POSTGRES_BACKUP"
    
    if [ ! -z "$REDIS_BACKUP" ]; then
        restore_redis "$REDIS_BACKUP"
    fi
    
    if [ ! -z "$APP_DATA_BACKUP" ]; then
        restore_app_data "$APP_DATA_BACKUP"
    fi
    
    # Start all services
    echo -e "${YELLOW}Starting all services...${NC}"
    docker-compose -f docker-compose.production.yml up -d
    
    # Run migrations
    echo -e "${YELLOW}Running database migrations...${NC}"
    sleep 10
    docker-compose -f docker-compose.production.yml exec -T backend flask db upgrade
    
    echo -e "${GREEN}Full system restore completed!${NC}"
}

# Main function
main() {
    # Check if running as root or with sudo
    if [ "$EUID" -ne 0 ]; then 
        echo -e "${YELLOW}Warning: This script may need root privileges for some operations${NC}"
    fi
    
    # Check if backup directory exists
    if [ ! -d "$BACKUP_DIR" ]; then
        echo -e "${RED}Backup directory not found: $BACKUP_DIR${NC}"
        exit 1
    fi
    
    # If backup file is provided as argument
    if [ $# -eq 1 ]; then
        if [ -f "$1" ]; then
            restore_postgres "$1"
        else
            echo -e "${RED}Backup file not found: $1${NC}"
            exit 1
        fi
    else
        # Interactive mode
        interactive_restore
    fi
    
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}Restore process completed!${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo -e "${YELLOW}Please verify that all services are running correctly:${NC}"
    echo "docker-compose -f docker-compose.production.yml ps"
}

# Run main function
main "$@"