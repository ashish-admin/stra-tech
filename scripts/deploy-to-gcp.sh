#!/bin/bash

# LokDarpan GCP Deployment Script
# This script deploys LokDarpan to a GCP Compute Engine instance

set -e  # Exit on error

# Configuration
PROJECT_ID="your-gcp-project-id"
INSTANCE_NAME="lokdarpan-prod"
ZONE="asia-south1-a"  # Mumbai region
MACHINE_TYPE="e2-medium"
DISK_SIZE="50GB"
IMAGE_FAMILY="ubuntu-2204-lts"
IMAGE_PROJECT="ubuntu-os-cloud"

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Starting LokDarpan GCP Deployment${NC}"

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo -e "${RED}gcloud CLI is not installed. Please install it first.${NC}"
    echo "Visit: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Check if user is authenticated
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q .; then
    echo -e "${YELLOW}You need to authenticate with GCP${NC}"
    gcloud auth login
fi

# Set project
echo -e "${GREEN}Setting GCP project to: $PROJECT_ID${NC}"
gcloud config set project $PROJECT_ID

# Create VM instance
echo -e "${GREEN}Creating VM instance: $INSTANCE_NAME${NC}"
gcloud compute instances create $INSTANCE_NAME \
    --zone=$ZONE \
    --machine-type=$MACHINE_TYPE \
    --image-family=$IMAGE_FAMILY \
    --image-project=$IMAGE_PROJECT \
    --boot-disk-size=$DISK_SIZE \
    --boot-disk-type=pd-standard \
    --network-interface=network-tier=PREMIUM,subnet=default \
    --maintenance-policy=MIGRATE \
    --tags=http-server,https-server \
    --metadata-from-file startup-script=scripts/vm-setup.sh

# Create firewall rules if they don't exist
echo -e "${GREEN}Setting up firewall rules${NC}"
gcloud compute firewall-rules create allow-http \
    --direction=INGRESS \
    --priority=1000 \
    --network=default \
    --action=ALLOW \
    --rules=tcp:80 \
    --source-ranges=0.0.0.0/0 \
    --target-tags=http-server || true

gcloud compute firewall-rules create allow-https \
    --direction=INGRESS \
    --priority=1000 \
    --network=default \
    --action=ALLOW \
    --rules=tcp:443 \
    --source-ranges=0.0.0.0/0 \
    --target-tags=https-server || true

# Reserve static IP
echo -e "${GREEN}Reserving static IP address${NC}"
gcloud compute addresses create lokdarpan-ip \
    --region=asia-south1 || true

# Get the static IP
STATIC_IP=$(gcloud compute addresses describe lokdarpan-ip \
    --region=asia-south1 \
    --format="get(address)")

echo -e "${GREEN}Static IP: $STATIC_IP${NC}"

# Attach static IP to instance
echo -e "${GREEN}Attaching static IP to instance${NC}"
gcloud compute instances delete-access-config $INSTANCE_NAME \
    --zone=$ZONE \
    --access-config-name="External NAT" || true

gcloud compute instances add-access-config $INSTANCE_NAME \
    --zone=$ZONE \
    --access-config-name="External NAT" \
    --address=$STATIC_IP

# Wait for instance to be ready
echo -e "${YELLOW}Waiting for instance to be ready...${NC}"
sleep 30

# Copy deployment files to instance
echo -e "${GREEN}Copying deployment files to instance${NC}"
gcloud compute scp --recurse \
    docker-compose.production.yml \
    .env.production \
    backend/ \
    frontend/ \
    scripts/ \
    $INSTANCE_NAME:~/lokdarpan/ \
    --zone=$ZONE

# SSH into instance and deploy
echo -e "${GREEN}Deploying application on instance${NC}"
gcloud compute ssh $INSTANCE_NAME --zone=$ZONE --command="
    cd ~/lokdarpan
    chmod +x scripts/deploy-local.sh
    ./scripts/deploy-local.sh
"

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Deployment Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e "Your application is available at:"
echo -e "  HTTP:  http://$STATIC_IP"
echo -e "  HTTPS: https://$STATIC_IP (after SSL setup)"
echo -e ""
echo -e "To SSH into the instance:"
echo -e "  gcloud compute ssh $INSTANCE_NAME --zone=$ZONE"
echo -e ""
echo -e "To view logs:"
echo -e "  gcloud compute ssh $INSTANCE_NAME --zone=$ZONE --command='cd ~/lokdarpan && docker-compose -f docker-compose.production.yml logs -f'"
echo -e ""
echo -e "${YELLOW}Next steps:${NC}"
echo -e "1. Point your domain to IP: $STATIC_IP"
echo -e "2. Update .env.production with your domain"
echo -e "3. Run SSL setup: ./scripts/setup-ssl.sh"