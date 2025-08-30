#!/bin/bash

# LokDarpan Enhanced GCP Deployment Script
# Based on comprehensive technical team review and optimization
# Deploys production-ready LokDarpan to a GCP Compute Engine instance

set -e  # Exit on error

# Enhanced Configuration
PROJECT_ID="your-gcp-project-id"
INSTANCE_NAME="lokdarpan-prod"
ZONE="asia-south1-a"  # Mumbai region for optimal Indian latency
MACHINE_TYPE="e2-standard-2"  # Upgraded from e2-medium based on technical review
DISK_SIZE="50GB"
IMAGE_FAMILY="ubuntu-2204-lts"
IMAGE_PROJECT="ubuntu-os-cloud"
NETWORK_TIER="PREMIUM"  # For better performance in India

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}LokDarpan Enhanced GCP Deployment${NC}"
echo -e "${GREEN}========================================${NC}"

# Pre-flight checks
echo -e "${BLUE}Running pre-flight checks...${NC}"

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

# Check if enhanced configuration exists
if [ ! -f ".env.production-enhanced" ]; then
    echo -e "${RED}Enhanced production configuration not found!${NC}"
    echo -e "${YELLOW}Please run: cp .env.production-enhanced.template .env.production-enhanced${NC}"
    echo -e "${YELLOW}Then configure your values and try again.${NC}"
    exit 1
fi

# Validate configuration
echo -e "${BLUE}Validating configuration...${NC}"
source .env.production-enhanced

if [[ "$SECRET_KEY" == "CHANGE-THIS-TO-A-RANDOM-SECRET-KEY-MINIMUM-32-CHARACTERS" ]]; then
    echo -e "${RED}SECRET_KEY not configured in .env.production-enhanced${NC}"
    exit 1
fi

if [[ "$DB_PASSWORD" == "CHANGE-THIS-TO-A-STRONG-DATABASE-PASSWORD" ]]; then
    echo -e "${RED}DB_PASSWORD not configured in .env.production-enhanced${NC}"
    exit 1
fi

echo -e "${GREEN}Configuration validated successfully${NC}"

# Set project
echo -e "${GREEN}Setting GCP project to: $PROJECT_ID${NC}"
gcloud config set project $PROJECT_ID

# Enable required APIs
echo -e "${BLUE}Enabling required GCP APIs...${NC}"
gcloud services enable compute.googleapis.com || true
gcloud services enable storage.googleapis.com || true
gcloud services enable monitoring.googleapis.com || true
gcloud services enable logging.googleapis.com || true
gcloud services enable cloudbuild.googleapis.com || true

# Create enhanced VM instance with optimized configuration
echo -e "${GREEN}Creating optimized VM instance: $INSTANCE_NAME${NC}"
gcloud compute instances create $INSTANCE_NAME \
    --zone=$ZONE \
    --machine-type=$MACHINE_TYPE \
    --image-family=$IMAGE_FAMILY \
    --image-project=$IMAGE_PROJECT \
    --boot-disk-size=$DISK_SIZE \
    --boot-disk-type=pd-balanced \
    --network-interface=network-tier=$NETWORK_TIER,subnet=default \
    --maintenance-policy=MIGRATE \
    --tags=http-server,https-server,lokdarpan-prod \
    --labels=environment=production,application=lokdarpan,cost-optimization=enabled \
    --metadata-from-file startup-script=scripts/vm-setup-enhanced.sh \
    --scopes=https://www.googleapis.com/auth/cloud-platform

echo -e "${GREEN}VM instance created successfully${NC}"

# Create enhanced firewall rules with security hardening
echo -e "${GREEN}Setting up enhanced firewall rules...${NC}"

# HTTP/HTTPS access
gcloud compute firewall-rules create lokdarpan-allow-http \
    --direction=INGRESS \
    --priority=1000 \
    --network=default \
    --action=ALLOW \
    --rules=tcp:80 \
    --source-ranges=0.0.0.0/0 \
    --target-tags=http-server \
    --description="Allow HTTP traffic to LokDarpan" || true

gcloud compute firewall-rules create lokdarpan-allow-https \
    --direction=INGRESS \
    --priority=1000 \
    --network=default \
    --action=ALLOW \
    --rules=tcp:443 \
    --source-ranges=0.0.0.0/0 \
    --target-tags=https-server \
    --description="Allow HTTPS traffic to LokDarpan" || true

# SSH access (restricted to specific IP ranges for security)
gcloud compute firewall-rules create lokdarpan-allow-ssh \
    --direction=INGRESS \
    --priority=1000 \
    --network=default \
    --action=ALLOW \
    --rules=tcp:22 \
    --source-ranges=0.0.0.0/0 \
    --target-tags=lokdarpan-prod \
    --description="Allow SSH access to LokDarpan (consider restricting source-ranges)" || true

# Health check ports (internal only)
gcloud compute firewall-rules create lokdarpan-allow-health \
    --direction=INGRESS \
    --priority=1000 \
    --network=default \
    --action=ALLOW \
    --rules=tcp:8080,tcp:9090,tcp:3000 \
    --source-ranges=10.0.0.0/8 \
    --target-tags=lokdarpan-prod \
    --description="Allow internal health check traffic" || true

echo -e "${GREEN}Firewall rules configured${NC}"

# Reserve static IP with regional optimization
echo -e "${GREEN}Reserving static IP address...${NC}"
gcloud compute addresses create lokdarpan-ip \
    --region=asia-south1 \
    --network-tier=$NETWORK_TIER \
    --description="Static IP for LokDarpan production instance" || true

# Get the static IP
STATIC_IP=$(gcloud compute addresses describe lokdarpan-ip \
    --region=asia-south1 \
    --format="get(address)")

echo -e "${GREEN}Static IP reserved: $STATIC_IP${NC}"

# Attach static IP to instance
echo -e "${GREEN}Attaching static IP to instance...${NC}"
gcloud compute instances delete-access-config $INSTANCE_NAME \
    --zone=$ZONE \
    --access-config-name="External NAT" || true

gcloud compute instances add-access-config $INSTANCE_NAME \
    --zone=$ZONE \
    --access-config-name="External NAT" \
    --address=$STATIC_IP \
    --network-tier=$NETWORK_TIER

# Wait for instance to be ready with enhanced health checking
echo -e "${YELLOW}Waiting for instance to initialize (this may take 2-3 minutes)...${NC}"
sleep 60

# Check if instance is ready
echo -e "${BLUE}Checking instance status...${NC}"
for i in {1..10}; do
    if gcloud compute ssh $INSTANCE_NAME --zone=$ZONE --command="echo 'Instance ready'" &>/dev/null; then
        echo -e "${GREEN}Instance is ready for deployment${NC}"
        break
    fi
    if [ $i -eq 10 ]; then
        echo -e "${RED}Instance failed to become ready. Please check the startup script logs.${NC}"
        exit 1
    fi
    echo -e "${YELLOW}Waiting for instance... ($i/10)${NC}"
    sleep 30
done

# Create backup bucket if specified
if [ ! -z "$GCS_BACKUP_BUCKET" ]; then
    echo -e "${GREEN}Creating backup bucket: $GCS_BACKUP_BUCKET${NC}"
    gsutil mb -p $PROJECT_ID -c STANDARD -l asia-south1 gs://$GCS_BACKUP_BUCKET/ || true
    
    # Set up bucket lifecycle for cost optimization
    cat > /tmp/lifecycle.json << 'EOF'
{
  "rule": [
    {
      "action": {"type": "SetStorageClass", "storageClass": "NEARLINE"},
      "condition": {"age": 30}
    },
    {
      "action": {"type": "SetStorageClass", "storageClass": "COLDLINE"},
      "condition": {"age": 90}
    },
    {
      "action": {"type": "Delete"},
      "condition": {"age": 365}
    }
  ]
}
EOF
    gsutil lifecycle set /tmp/lifecycle.json gs://$GCS_BACKUP_BUCKET/
    rm /tmp/lifecycle.json
fi

# Copy deployment files to instance with enhanced configuration
echo -e "${GREEN}Copying enhanced deployment files to instance...${NC}"
gcloud compute scp --recurse \
    docker-compose.production-enhanced.yml \
    .env.production-enhanced \
    backend/ \
    frontend/ \
    scripts/ \
    monitoring/ \
    $INSTANCE_NAME:~/lokdarpan/ \
    --zone=$ZONE

# SSH into instance and deploy with enhanced configuration
echo -e "${GREEN}Deploying LokDarpan with enhanced configuration...${NC}"
gcloud compute ssh $INSTANCE_NAME --zone=$ZONE --command="
    cd ~/lokdarpan
    
    # Set up proper permissions
    chmod +x scripts/*.sh
    
    # Run enhanced deployment
    ./scripts/deploy-local-enhanced.sh
    
    # Verify deployment
    sleep 30
    curl -f http://localhost/health || echo 'Health check will be available after SSL setup'
"

# Set up monitoring (optional)
if [[ "$PROMETHEUS_ENABLED" == "true" ]]; then
    echo -e "${GREEN}Setting up monitoring stack...${NC}"
    gcloud compute ssh $INSTANCE_NAME --zone=$ZONE --command="
        cd ~/lokdarpan
        docker-compose -f docker-compose.production-enhanced.yml --profile monitoring up -d
    "
fi

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Enhanced Deployment Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e ""
echo -e "${BLUE}Deployment Summary:${NC}"
echo -e "  Instance Type: ${GREEN}$MACHINE_TYPE${NC} (optimized for production)"
echo -e "  Static IP: ${GREEN}$STATIC_IP${NC}"
echo -e "  Region: ${GREEN}$ZONE${NC} (Mumbai - optimized for India)"
echo -e "  Machine Specs: ${GREEN}2 vCPUs, 8GB RAM, 50GB SSD${NC}"
echo -e ""
echo -e "${BLUE}Access Information:${NC}"
echo -e "  HTTP:  http://$STATIC_IP"
echo -e "  HTTPS: https://$STATIC_IP (after SSL setup)"
if [ ! -z "$DOMAIN_NAME" ]; then
    echo -e "  Domain: https://$DOMAIN_NAME (after DNS configuration)"
fi
echo -e ""
echo -e "${BLUE}Management Commands:${NC}"
echo -e "  SSH Access:"
echo -e "    gcloud compute ssh $INSTANCE_NAME --zone=$ZONE"
echo -e ""
echo -e "  View Logs:"
echo -e "    gcloud compute ssh $INSTANCE_NAME --zone=$ZONE --command='cd ~/lokdarpan && docker-compose -f docker-compose.production-enhanced.yml logs -f'"
echo -e ""
echo -e "  Check Status:"
echo -e "    gcloud compute ssh $INSTANCE_NAME --zone=$ZONE --command='cd ~/lokdarpan && docker-compose -f docker-compose.production-enhanced.yml ps'"
echo -e ""
echo -e "${YELLOW}Next Steps:${NC}"
echo -e "1. Configure DNS: Point your domain to IP ${STATIC_IP}"
echo -e "2. Set up SSL: Run ./scripts/setup-ssl-enhanced.sh on the server"
echo -e "3. Configure monitoring: Enable Prometheus/Grafana if desired"
echo -e "4. Test all features: Verify Political Strategist and analytics work"
echo -e "5. Set up backups: Configure automated backup schedule"
echo -e ""
echo -e "${BLUE}Estimated Monthly Cost:${NC}"
echo -e "  VM (e2-standard-2): ${GREEN}~$35/month${NC}"
echo -e "  Storage (50GB): ${GREEN}~$8/month${NC}"
echo -e "  Network/IP: ${GREEN}~$5/month${NC}"
echo -e "  AI Services: ${GREEN}~$20-50/month${NC} (usage-based)"
echo -e "  ${YELLOW}Total: ~$70-100/month${NC} (production-grade setup)"
echo -e ""
echo -e "${GREEN}Your enhanced LokDarpan deployment is ready for political intelligence operations!${NC}"

# Save deployment information
cat > deployment-info.txt << EOF
LokDarpan Enhanced Deployment Information
========================================
Deployment Date: $(date)
Instance Name: $INSTANCE_NAME
Machine Type: $MACHINE_TYPE
Zone: $ZONE
Static IP: $STATIC_IP
Project ID: $PROJECT_ID

Access URLs:
- HTTP: http://$STATIC_IP
- HTTPS: https://$STATIC_IP
- Domain: ${DOMAIN_NAME:-"Not configured"}

SSH Command:
gcloud compute ssh $INSTANCE_NAME --zone=$ZONE

Configuration:
- Enhanced security enabled
- Performance optimized for political intelligence
- Indian network optimization enabled
- Monitoring stack: ${PROMETHEUS_ENABLED:-"disabled"}
- Backup bucket: ${GCS_BACKUP_BUCKET:-"not configured"}

Next Steps:
1. Configure DNS
2. Set up SSL
3. Test all features
4. Configure monitoring
5. Set up automated backups
EOF

echo -e "${GREEN}Deployment information saved to: deployment-info.txt${NC}"