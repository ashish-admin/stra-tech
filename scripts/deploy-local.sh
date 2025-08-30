#!/bin/bash

# Local deployment script - runs on the VM to deploy the application
set -e

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}Starting LokDarpan Local Deployment${NC}"

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}Docker is not installed. Please run vm-setup.sh first${NC}"
    exit 1
fi

# Check if docker-compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}Docker Compose is not installed. Please run vm-setup.sh first${NC}"
    exit 1
fi

# Check for .env.production file
if [ ! -f .env.production ]; then
    echo -e "${YELLOW}Creating .env.production from template...${NC}"
    cp .env.production.template .env.production
    echo -e "${RED}Please edit .env.production with your configuration values${NC}"
    exit 1
fi

# Load environment variables
export $(cat .env.production | grep -v '^#' | xargs)

# Create necessary directories
echo -e "${GREEN}Creating necessary directories...${NC}"
mkdir -p backend/logs
mkdir -p backend/data/epaper/{inbox,processed,error}
mkdir -p letsencrypt
mkdir -p backups

# Set proper permissions
chmod -R 755 backend/logs
chmod -R 755 backend/data

# Initialize database if needed
echo -e "${GREEN}Checking database initialization...${NC}"
if [ -f backend/scripts/init-db.sql ]; then
    echo -e "${YELLOW}Database initialization script found${NC}"
else
    # Create basic init script
    cat > backend/scripts/init-db.sql << EOF
-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";
EOF
fi

# Pull latest images
echo -e "${GREEN}Pulling Docker images...${NC}"
docker-compose -f docker-compose.production.yml pull

# Build custom images
echo -e "${GREEN}Building application images...${NC}"
docker-compose -f docker-compose.production.yml build

# Stop existing containers
echo -e "${YELLOW}Stopping existing containers...${NC}"
docker-compose -f docker-compose.production.yml down

# Start services
echo -e "${GREEN}Starting services...${NC}"
docker-compose -f docker-compose.production.yml up -d

# Wait for services to be healthy
echo -e "${YELLOW}Waiting for services to be healthy...${NC}"
sleep 15

# Run database migrations
echo -e "${GREEN}Running database migrations...${NC}"
docker-compose -f docker-compose.production.yml exec -T backend flask db upgrade

# Seed initial data if needed
if [ "$SEED_DATA" == "true" ]; then
    echo -e "${GREEN}Seeding initial data...${NC}"
    docker-compose -f docker-compose.production.yml exec -T backend python scripts/reseed_demo_data.py
fi

# Check service status
echo -e "${GREEN}Checking service status...${NC}"
docker-compose -f docker-compose.production.yml ps

# Test backend health
echo -e "${GREEN}Testing backend health...${NC}"
curl -f http://localhost/api/v1/status || echo -e "${YELLOW}Backend not responding yet${NC}"

# Show logs
echo -e "${GREEN}Recent logs:${NC}"
docker-compose -f docker-compose.production.yml logs --tail=50

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Deployment Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e ""
echo -e "Services are running:"
echo -e "  - Frontend: http://localhost"
echo -e "  - Backend API: http://localhost/api"
echo -e "  - PostgreSQL: localhost:5432"
echo -e "  - Redis: localhost:6379"
echo -e ""
echo -e "Useful commands:"
echo -e "  View logs: docker-compose -f docker-compose.production.yml logs -f"
echo -e "  Stop services: docker-compose -f docker-compose.production.yml down"
echo -e "  Restart services: docker-compose -f docker-compose.production.yml restart"
echo -e "  View status: docker-compose -f docker-compose.production.yml ps"
echo -e ""
echo -e "${YELLOW}Next steps:${NC}"
echo -e "1. Configure your domain DNS to point to this server"
echo -e "2. Run ./scripts/setup-ssl.sh to configure SSL"
echo -e "3. Monitor logs for any issues"