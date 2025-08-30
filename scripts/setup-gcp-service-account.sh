#!/bin/bash

# Google Cloud Service Account Setup for LokDarpan
# Configure Gemini API access using service account authentication

set -e

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}LokDarpan GCP Service Account Setup${NC}"
echo "======================================"

# Check if service account key file exists
SERVICE_ACCOUNT_KEY="credentials/lok-darpan-service-account.json"

if [ ! -f "$SERVICE_ACCOUNT_KEY" ]; then
    echo -e "${YELLOW}Service account key file not found: $SERVICE_ACCOUNT_KEY${NC}"
    echo -e "${BLUE}Please follow these steps:${NC}"
    echo ""
    echo "1. Go to Google Cloud Console:"
    echo "   https://console.cloud.google.com/iam-admin/serviceaccounts"
    echo ""
    echo "2. Select your service account:"
    echo "   lok-darpan-gcp-gemini-api@gen-lang-client-0116974012.iam.gserviceaccount.com"
    echo ""
    echo "3. Click 'Keys' tab → 'Add Key' → 'Create New Key'"
    echo "4. Choose JSON format and download"
    echo "5. Save the file as: $SERVICE_ACCOUNT_KEY"
    echo ""
    echo -e "${YELLOW}After downloading the key file, run this script again.${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Service account key file found${NC}"

# Create credentials directory if it doesn't exist
mkdir -p credentials

# Set proper permissions on the key file
chmod 600 "$SERVICE_ACCOUNT_KEY"

# Update environment configuration for service account authentication
echo -e "${BLUE}Updating environment configuration...${NC}"

# Backup current environment file
cp .env.production-enhanced .env.production-enhanced.backup

# Update environment file with service account configuration
cat > .env.production-enhanced.tmp << EOF
# LokDarpan Enhanced Production Environment Configuration
# Updated with GCP Service Account authentication

# ========================================
# CRITICAL SECURITY CONFIGURATION
# ========================================

# Strong secret key for Flask sessions
SECRET_KEY=TCd7lChr8otuyvKX9zKyyYQHHU-MS6aTXCtIZsplfjg

# Strong database password
DB_PASSWORD=k8xxWmWHt0iWGxhSImBtRg

# Redis password for enhanced security
REDIS_PASSWORD=t51KXwF7YU5HDgQN-I9E9g

# ========================================
# DOMAIN AND SSL CONFIGURATION
# ========================================

# Your domain name (leave empty to use IP address only)
DOMAIN_NAME=

# Email for Let's Encrypt SSL certificates (required if using domain)
SSL_EMAIL=admin@lokdarpan.example.com

# CORS origins (automatically configured based on domain)
CORS_ORIGINS=http://localhost,https://localhost

# ========================================
# DATABASE CONFIGURATION
# ========================================

# PostgreSQL connection with SSL and performance optimization
DATABASE_URL=postgresql://postgres:\${DB_PASSWORD}@postgres:5432/lokdarpan_db?sslmode=prefer&pool_pre_ping=true&pool_recycle=300

# Database connection pool settings
DB_POOL_SIZE=20
DB_MAX_OVERFLOW=30
DB_POOL_TIMEOUT=30
DB_POOL_RECYCLE=3600

# ========================================
# REDIS AND CELERY CONFIGURATION
# ========================================

# Redis with password authentication
REDIS_URL=redis://:\${REDIS_PASSWORD}@redis:6379/0
CELERY_BROKER_URL=redis://:\${REDIS_PASSWORD}@redis:6379/1
CELERY_RESULT_BACKEND=redis://:\${REDIS_PASSWORD}@redis:6379/2

# ========================================
# AI SERVICES CONFIGURATION
# ========================================

# Google Cloud Service Account Authentication
GOOGLE_APPLICATION_CREDENTIALS=./credentials/lok-darpan-service-account.json
GCP_PROJECT_ID=gen-lang-client-0116974012

# Service Account Details
GCP_SERVICE_ACCOUNT_EMAIL=lok-darpan-gcp-gemini-api@gen-lang-client-0116974012.iam.gserviceaccount.com

# Gemini API Configuration (using service account)
GEMINI_API_ENDPOINT=https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash-latest:generateContent
GEMINI_USE_SERVICE_ACCOUNT=true

# Perplexity AI API (direct API key)
PERPLEXITY_API_KEY=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

# AI Service Configuration
AI_SERVICE_TIMEOUT=30
AI_MAX_RETRIES=3
AI_CIRCUIT_BREAKER_THRESHOLD=10
AI_CIRCUIT_BREAKER_TIMEOUT=60

# ========================================
# NEWS AND SOCIAL MEDIA APIS
# ========================================

# News API for automated news ingestion
NEWS_API_KEY=

# Twitter API for social media monitoring
TWITTER_BEARER_TOKEN=

# News ingestion configuration
NEWS_FETCH_INTERVAL=3600
NEWS_MAX_ARTICLES=100

# ========================================
# PERFORMANCE AND SCALING
# ========================================

# Gunicorn worker configuration for e2-standard-2 VM
GUNICORN_WORKERS=4
GUNICORN_THREADS=2
GUNICORN_WORKER_CLASS=gevent
GUNICORN_WORKER_CONNECTIONS=1000
WEB_CONCURRENCY=4

# ========================================
# MONITORING CONFIGURATION
# ========================================

# Prometheus monitoring
PROMETHEUS_ENABLED=true
GRAFANA_ENABLED=true
GRAFANA_PASSWORD=admin-lokdarpan-2024

# Health check configuration
HEALTH_CHECK_INTERVAL=30
HEALTH_CHECK_TIMEOUT=10

# ========================================
# BACKUP CONFIGURATION
# ========================================

# Google Cloud Storage backup bucket
GCS_BACKUP_BUCKET=lokdarpan-backups-prod

# Backup retention settings
BACKUP_RETENTION_DAYS=30
BACKUP_COMPRESSION=true

# ========================================
# SECURITY CONFIGURATION
# ========================================

# Rate limiting
RATE_LIMIT_ENABLED=true
RATE_LIMIT_PER_MINUTE=60
RATE_LIMIT_BURST=10

# CORS configuration
CORS_ALLOW_CREDENTIALS=true
CORS_MAX_AGE=86400

# Session configuration
SESSION_PERMANENT=false
SESSION_LIFETIME=3600
SESSION_COOKIE_SECURE=true
SESSION_COOKIE_HTTPONLY=true

EOF

# Replace the original file
mv .env.production-enhanced.tmp .env.production-enhanced

echo -e "${GREEN}✓ Environment configuration updated${NC}"

# Test service account authentication
echo -e "${BLUE}Testing service account authentication...${NC}"

# Set environment variable for testing
export GOOGLE_APPLICATION_CREDENTIALS="$SERVICE_ACCOUNT_KEY"

# Test authentication with gcloud (if available)
if command -v gcloud &> /dev/null; then
    echo -e "${BLUE}Activating service account...${NC}"
    gcloud auth activate-service-account --key-file="$SERVICE_ACCOUNT_KEY"
    
    echo -e "${BLUE}Testing authentication...${NC}"
    gcloud auth list
    
    echo -e "${GREEN}✓ Service account authentication successful${NC}"
else
    echo -e "${YELLOW}⚠ gcloud CLI not found, skipping authentication test${NC}"
    echo -e "${YELLOW}  Authentication will be tested when the application starts${NC}"
fi

# Create Python test script for Gemini API
cat > test_gemini_service_account.py << 'EOF'
#!/usr/bin/env python3

import os
import json
import requests
from google.auth.transport.requests import Request
from google.oauth2 import service_account

def test_gemini_service_account():
    """Test Gemini API access using service account"""
    
    # Load service account credentials
    credentials_path = "credentials/lok-darpan-service-account.json"
    
    if not os.path.exists(credentials_path):
        print("❌ Service account key file not found")
        return False
    
    try:
        # Load credentials
        credentials = service_account.Credentials.from_service_account_file(
            credentials_path,
            scopes=['https://www.googleapis.com/auth/cloud-platform']
        )
        
        # Refresh credentials to get access token
        credentials.refresh(Request())
        
        # Test API call
        url = "https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash-latest:generateContent"
        headers = {
            "Authorization": f"Bearer {credentials.token}",
            "Content-Type": "application/json"
        }
        
        data = {
            "contents": [
                {
                    "parts": [
                        {"text": "Hello, this is a test from LokDarpan"}
                    ]
                }
            ]
        }
        
        response = requests.post(url, headers=headers, json=data, timeout=10)
        
        if response.status_code == 200:
            print("✅ Gemini API authentication successful")
            print(f"Response: {response.json()}")
            return True
        else:
            print(f"⚠ Gemini API returned status code: {response.status_code}")
            print(f"Response: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Error testing Gemini API: {e}")
        return False

if __name__ == "__main__":
    print("Testing Gemini API with service account authentication...")
    test_gemini_service_account()
EOF

chmod +x test_gemini_service_account.py

echo -e "${BLUE}Testing Gemini API with service account...${NC}"
python3 test_gemini_service_account.py || echo -e "${YELLOW}⚠ Gemini API test failed - check service account permissions${NC}"

echo ""
echo -e "${GREEN}======================================"
echo -e "Service Account Setup Complete!"
echo -e "======================================${NC}"
echo ""
echo -e "${BLUE}Next Steps:${NC}"
echo "1. Ensure your service account has the following roles:"
echo "   - AI Platform Developer"
echo "   - Vertex AI User" 
echo "   - Service Usage Consumer"
echo ""
echo "2. Enable the Generative Language API in your GCP project:"
echo "   https://console.cloud.google.com/apis/library/generativelanguage.googleapis.com"
echo ""
echo "3. Run the deployment:"
echo "   ./scripts/deploy-local-enhanced.sh"
echo ""
echo -e "${YELLOW}Note: The application will now use service account authentication for Gemini API${NC}"

# Clean up test script
rm -f test_gemini_service_account.py