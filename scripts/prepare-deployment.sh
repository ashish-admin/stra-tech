#!/bin/bash

# LokDarpan Deployment Preparation Script
# Reads configuration and prepares environment for deployment

set -e

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}LokDarpan Deployment Preparation${NC}"
echo -e "${BLUE}========================================${NC}"

# Check if config file exists
if [ ! -f "deployment-config.ini" ]; then
    echo -e "${RED}deployment-config.ini not found!${NC}"
    echo -e "${YELLOW}Please fill out the configuration file first.${NC}"
    exit 1
fi

# Function to read INI file
read_ini() {
    local section=$1
    local key=$2
    local file="deployment-config.ini"
    
    # Extract value from INI file
    value=$(awk -F '=' "/\[$section\]/{a=1} a==1&&/^$key/{print \$2; exit}" $file | sed 's/^ *//;s/ *$//')
    echo "$value"
}

# Read configuration values
echo -e "${GREEN}Reading configuration...${NC}"

# GCP Settings
PROJECT_ID=$(read_ini "GCP" "PROJECT_ID")
BILLING_ACCOUNT_ID=$(read_ini "GCP" "BILLING_ACCOUNT_ID")
REGION=$(read_ini "GCP" "REGION")
MACHINE_TYPE=$(read_ini "GCP" "MACHINE_TYPE")

# Domain Settings
DOMAIN_NAME=$(read_ini "DOMAIN" "DOMAIN_NAME")
LETSENCRYPT_EMAIL=$(read_ini "DOMAIN" "LETSENCRYPT_EMAIL")

# Security Settings
SECRET_KEY=$(read_ini "SECURITY" "SECRET_KEY")
DB_PASSWORD=$(read_ini "SECURITY" "DB_PASSWORD")

# AI Services
GEMINI_API_KEY=$(read_ini "AI_SERVICES" "GEMINI_API_KEY")
PERPLEXITY_API_KEY=$(read_ini "AI_SERVICES" "PERPLEXITY_API_KEY")
OPENAI_API_KEY=$(read_ini "AI_SERVICES" "OPENAI_API_KEY")
NEWS_API_KEY=$(read_ini "AI_SERVICES" "NEWS_API_KEY")
TWITTER_BEARER_TOKEN=$(read_ini "AI_SERVICES" "TWITTER_BEARER_TOKEN")

# Backup Settings
GCS_BACKUP_BUCKET=$(read_ini "BACKUP" "GCS_BACKUP_BUCKET")
ALERT_EMAIL=$(read_ini "BACKUP" "ALERT_EMAIL")

# Options
SEED_DEMO_DATA=$(read_ini "OPTIONS" "SEED_DEMO_DATA")
ENABLE_MONITORING=$(read_ini "OPTIONS" "ENABLE_MONITORING")
ENABLE_AUTO_BACKUP=$(read_ini "OPTIONS" "ENABLE_AUTO_BACKUP")

# Validate required fields
echo -e "${YELLOW}Validating configuration...${NC}"

ERRORS=0

if [ "$PROJECT_ID" = "your-project-id-here" ] || [ -z "$PROJECT_ID" ]; then
    echo -e "${RED}ERROR: PROJECT_ID not configured${NC}"
    ERRORS=$((ERRORS + 1))
fi

if [ "$SECRET_KEY" = "CHANGE-THIS-TO-A-RANDOM-SECRET-KEY" ] || [ -z "$SECRET_KEY" ]; then
    echo -e "${RED}ERROR: SECRET_KEY not configured${NC}"
    echo -e "${YELLOW}Generate one at: https://djecrety.ir/${NC}"
    ERRORS=$((ERRORS + 1))
fi

if [ "$DB_PASSWORD" = "CHANGE-THIS-TO-A-STRONG-PASSWORD" ] || [ -z "$DB_PASSWORD" ]; then
    echo -e "${RED}ERROR: DB_PASSWORD not configured${NC}"
    ERRORS=$((ERRORS + 1))
fi

if [ -z "$GEMINI_API_KEY" ]; then
    echo -e "${YELLOW}WARNING: GEMINI_API_KEY not configured (Political Strategist features will be limited)${NC}"
fi

if [ -z "$PERPLEXITY_API_KEY" ]; then
    echo -e "${YELLOW}WARNING: PERPLEXITY_API_KEY not configured (Advanced analysis will be limited)${NC}"
fi

if [ $ERRORS -gt 0 ]; then
    echo -e "${RED}Please fix the $ERRORS error(s) in deployment-config.ini and run again${NC}"
    exit 1
fi

# Create .env.production file
echo -e "${GREEN}Creating .env.production file...${NC}"

cat > .env.production << EOF
# LokDarpan Production Environment
# Generated from deployment-config.ini

# Security
SECRET_KEY=$SECRET_KEY
DB_PASSWORD=$DB_PASSWORD

# Domain Configuration
DOMAIN_NAME=$DOMAIN_NAME
LETSENCRYPT_EMAIL=$LETSENCRYPT_EMAIL

# Database
DATABASE_URL=postgresql://postgres:\${DB_PASSWORD}@postgres:5432/lokdarpan_db

# Redis
REDIS_URL=redis://redis:6379/0
CELERY_BROKER_URL=redis://redis:6379/0
CELERY_RESULT_BACKEND=redis://redis:6379/1

# CORS Configuration
CORS_ORIGINS=http://localhost,https://localhost${DOMAIN_NAME:+,https://$DOMAIN_NAME,http://$DOMAIN_NAME}

# AI Service API Keys
GEMINI_API_KEY=$GEMINI_API_KEY
PERPLEXITY_API_KEY=$PERPLEXITY_API_KEY
OPENAI_API_KEY=$OPENAI_API_KEY

# News and Social Media APIs
NEWS_API_KEY=$NEWS_API_KEY
TWITTER_BEARER_TOKEN=$TWITTER_BEARER_TOKEN

# Backup Configuration
GCS_BACKUP_BUCKET=$GCS_BACKUP_BUCKET
ALERT_EMAIL=$ALERT_EMAIL

# Feature Flags
STRATEGIST_ENABLED=true
AUDIT_LOG_ENABLED=true
SEED_DATA=$SEED_DEMO_DATA

# Performance Tuning
GUNICORN_WORKERS=2
GUNICORN_THREADS=4
CELERY_WORKER_CONCURRENCY=2
EOF

# Update deployment script with configuration
echo -e "${GREEN}Updating deployment scripts...${NC}"

# Update deploy-to-gcp.sh with actual values
sed -i.bak "s/your-gcp-project-id/$PROJECT_ID/g" scripts/deploy-to-gcp.sh
sed -i.bak "s/asia-south1-a/${REGION}-a/g" scripts/deploy-to-gcp.sh
sed -i.bak "s/e2-medium/$MACHINE_TYPE/g" scripts/deploy-to-gcp.sh

# Create GCP setup script
cat > scripts/gcp-quick-setup.sh << 'EOF'
#!/bin/bash
# Quick GCP Setup Script

set -e

echo "Setting up GCP project..."

# Set project
gcloud config set project PROJECT_ID_PLACEHOLDER

# Enable APIs
echo "Enabling required APIs..."
gcloud services enable compute.googleapis.com
gcloud services enable storage.googleapis.com
gcloud services enable monitoring.googleapis.com

# Create backup bucket if specified
if [ ! -z "BUCKET_PLACEHOLDER" ]; then
    echo "Creating backup bucket..."
    gsutil mb -p PROJECT_ID_PLACEHOLDER -l REGION_PLACEHOLDER gs://BUCKET_PLACEHOLDER/ || true
fi

echo "GCP setup complete!"
EOF

# Replace placeholders in setup script
sed -i "s/PROJECT_ID_PLACEHOLDER/$PROJECT_ID/g" scripts/gcp-quick-setup.sh
sed -i "s/BUCKET_PLACEHOLDER/$GCS_BACKUP_BUCKET/g" scripts/gcp-quick-setup.sh
sed -i "s/REGION_PLACEHOLDER/$REGION/g" scripts/gcp-quick-setup.sh

chmod +x scripts/gcp-quick-setup.sh

# Generate summary
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Deployment Preparation Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${BLUE}Configuration Summary:${NC}"
echo -e "  Project ID: ${GREEN}$PROJECT_ID${NC}"
echo -e "  Region: ${GREEN}$REGION${NC}"
echo -e "  Machine Type: ${GREEN}$MACHINE_TYPE${NC}"
echo -e "  Domain: ${GREEN}${DOMAIN_NAME:-Not configured (will use IP only)}${NC}"
echo -e "  Demo Data: ${GREEN}$SEED_DEMO_DATA${NC}"
echo ""

# Calculate estimated costs
if [ "$MACHINE_TYPE" = "e2-small" ]; then
    MONTHLY_COST="~\$20-30"
elif [ "$MACHINE_TYPE" = "e2-medium" ]; then
    MONTHLY_COST="~\$35-45"
else
    MONTHLY_COST="~\$50+"
fi

echo -e "${BLUE}Estimated Monthly Cost: ${GREEN}$MONTHLY_COST${NC}"
echo ""

echo -e "${YELLOW}Next Steps:${NC}"
echo -e "1. Ensure you have gcloud CLI installed"
echo -e "2. Run: ${GREEN}gcloud auth login${NC}"
echo -e "3. Run: ${GREEN}./scripts/gcp-quick-setup.sh${NC} (to set up GCP project)"
echo -e "4. Run: ${GREEN}./scripts/deploy-to-gcp.sh${NC} (to deploy application)"
echo ""

if [ -z "$DOMAIN_NAME" ]; then
    echo -e "${YELLOW}Note: No domain configured. Application will be accessible via IP address only.${NC}"
    echo -e "${YELLOW}You can add a domain later by updating .env.production and running setup-ssl.sh${NC}"
fi

echo -e "${GREEN}Your deployment is ready to go!${NC}"