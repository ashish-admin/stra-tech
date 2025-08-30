# LokDarpan GCP Deployment Guide

## Overview
This guide provides step-by-step instructions for deploying LokDarpan to Google Cloud Platform using a cost-optimized single VM approach (~$40/month).

## Prerequisites

### Local Requirements
- Git installed
- Google Cloud SDK (`gcloud`) installed
- Docker and Docker Compose (for local testing)
- A Google Cloud account with billing enabled

### GCP Requirements
- A GCP project created
- Billing account linked
- Required APIs enabled:
  - Compute Engine API
  - Cloud Storage API
  - Cloud Monitoring API (optional)

## Quick Start

### 1. Clone and Prepare Repository
```bash
git clone https://github.com/your-org/lokdarpan.git
cd lokdarpan

# Copy and configure environment file
cp .env.production.template .env.production
# Edit .env.production with your values
```

### 2. Configure GCP Project
```bash
# Set your project ID
export PROJECT_ID="your-gcp-project-id"

# Authenticate with GCP
gcloud auth login
gcloud config set project $PROJECT_ID

# Enable required APIs
gcloud services enable compute.googleapis.com
gcloud services enable storage.googleapis.com
gcloud services enable monitoring.googleapis.com
```

### 3. Deploy to GCP
```bash
# Make scripts executable
chmod +x scripts/*.sh

# Edit deployment configuration
vim scripts/deploy-to-gcp.sh
# Update PROJECT_ID and other variables

# Run deployment
./scripts/deploy-to-gcp.sh
```

## Detailed Setup Instructions

### Step 1: Create GCP Project

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Click "Select a project" → "New Project"
3. Enter project name: `lokdarpan-prod`
4. Note the Project ID (you'll need this)

### Step 2: Enable Billing

1. Go to Billing section in Console
2. Link a billing account
3. Set budget alerts:
   - Alert at $25 (50% of expected)
   - Alert at $40 (80% of expected)
   - Alert at $50 (100% of expected)

### Step 3: Install Google Cloud SDK

**Windows:**
```powershell
# Download installer from:
# https://cloud.google.com/sdk/docs/install

# Or use Chocolatey:
choco install gcloudsdk
```

**Linux/Mac:**
```bash
curl https://sdk.cloud.google.com | bash
exec -l $SHELL
gcloud init
```

### Step 4: Configure Environment

Create `.env.production` file:
```env
# Security
SECRET_KEY=your-very-long-random-secret-key-here
DB_PASSWORD=strong-database-password-here

# Domain (update after getting static IP)
DOMAIN_NAME=your-domain.com
LETSENCRYPT_EMAIL=your-email@example.com

# AI Service Keys
GEMINI_API_KEY=your-gemini-api-key
PERPLEXITY_API_KEY=your-perplexity-api-key

# Optional APIs
NEWS_API_KEY=your-news-api-key
OPENAI_API_KEY=your-openai-api-key
```

### Step 5: Create VM Instance

#### Using Script (Recommended):
```bash
./scripts/deploy-to-gcp.sh
```

#### Manual Creation:
```bash
# Create VM
gcloud compute instances create lokdarpan-prod \
    --zone=asia-south1-a \
    --machine-type=e2-medium \
    --image-family=ubuntu-2204-lts \
    --image-project=ubuntu-os-cloud \
    --boot-disk-size=50GB \
    --tags=http-server,https-server

# Create firewall rules
gcloud compute firewall-rules create allow-http \
    --allow tcp:80 --source-ranges 0.0.0.0/0 \
    --target-tags http-server

gcloud compute firewall-rules create allow-https \
    --allow tcp:443 --source-ranges 0.0.0.0/0 \
    --target-tags https-server

# Reserve static IP
gcloud compute addresses create lokdarpan-ip \
    --region=asia-south1

# Attach static IP to instance
STATIC_IP=$(gcloud compute addresses describe lokdarpan-ip \
    --region=asia-south1 --format="get(address)")

gcloud compute instances add-access-config lokdarpan-prod \
    --zone=asia-south1-a --address=$STATIC_IP
```

### Step 6: Deploy Application

1. **SSH into VM:**
```bash
gcloud compute ssh lokdarpan-prod --zone=asia-south1-a
```

2. **Clone repository on VM:**
```bash
git clone https://github.com/your-org/lokdarpan.git
cd lokdarpan
```

3. **Set up environment:**
```bash
# Copy environment file
cp .env.production.template .env.production
nano .env.production  # Edit with your values
```

4. **Run setup script:**
```bash
# Install dependencies
sudo ./scripts/vm-setup.sh

# Deploy application
./scripts/deploy-local.sh
```

### Step 7: Configure Domain and SSL

1. **Point domain to static IP:**
   - Add A record: `@` → `YOUR_STATIC_IP`
   - Add A record: `www` → `YOUR_STATIC_IP`

2. **Update environment:**
```bash
# Edit .env.production
DOMAIN_NAME=your-domain.com
LETSENCRYPT_EMAIL=your-email@example.com
```

3. **Set up SSL:**
```bash
./scripts/setup-ssl.sh
```

## Monitoring and Maintenance

### View Logs
```bash
# All services
docker-compose -f docker-compose.production.yml logs -f

# Specific service
docker-compose -f docker-compose.production.yml logs -f backend
```

### Check Service Status
```bash
docker-compose -f docker-compose.production.yml ps
```

### Restart Services
```bash
docker-compose -f docker-compose.production.yml restart
```

### Run Backups
```bash
# Manual backup
./scripts/backup.sh

# Schedule automatic backups (already configured in cron)
crontab -l
```

### Restore from Backup
```bash
# Interactive restore
./scripts/restore.sh

# Restore specific backup
./scripts/restore.sh /home/lokdarpan/backups/postgres_20240101_120000.sql.gz
```

## Cost Optimization Tips

### 1. Use Committed Use Discounts
- 1-year commitment: ~37% discount
- 3-year commitment: ~55% discount

### 2. Set Up Budget Alerts
```bash
gcloud billing budgets create \
    --billing-account=YOUR_BILLING_ACCOUNT \
    --display-name="LokDarpan Monthly Budget" \
    --budget-amount=50 \
    --threshold-rule=percent=0.5 \
    --threshold-rule=percent=0.8 \
    --threshold-rule=percent=1.0
```

### 3. Use Preemptible VM (if downtime acceptable)
- 80% cheaper than regular instances
- Maximum 24-hour runtime
- Good for development/testing

### 4. Optimize Storage
- Use standard persistent disk instead of SSD
- Regularly clean old logs and backups
- Compress backups before storage

## Scaling Guide

### When to Scale

| Users | Current Setup | Action Needed |
|-------|--------------|---------------|
| 1-5 | e2-medium (current) | No change |
| 5-20 | e2-medium | Monitor performance |
| 20-50 | e2-standard-2 | Upgrade VM |
| 50-100 | e2-standard-4 | Upgrade VM + optimize |
| 100+ | Multiple services | Move to Cloud Run/GKE |

### How to Scale VM
```bash
# Stop instance
gcloud compute instances stop lokdarpan-prod --zone=asia-south1-a

# Change machine type
gcloud compute instances set-machine-type lokdarpan-prod \
    --machine-type=e2-standard-2 --zone=asia-south1-a

# Start instance
gcloud compute instances start lokdarpan-prod --zone=asia-south1-a
```

## Troubleshooting

### Common Issues

#### 1. Cannot connect to VM
```bash
# Check firewall rules
gcloud compute firewall-rules list

# Check instance status
gcloud compute instances describe lokdarpan-prod --zone=asia-south1-a
```

#### 2. Application not accessible
```bash
# SSH into VM
gcloud compute ssh lokdarpan-prod --zone=asia-south1-a

# Check Docker status
docker-compose -f docker-compose.production.yml ps

# Check logs
docker-compose -f docker-compose.production.yml logs backend
```

#### 3. Database connection issues
```bash
# Check PostgreSQL
docker exec lokdarpan-postgres psql -U postgres -c "SELECT 1"

# Check Redis
docker exec lokdarpan-redis redis-cli ping
```

#### 4. High costs
- Review billing dashboard
- Check for unused resources
- Optimize VM size
- Enable budget alerts

### Support Resources

- [GCP Documentation](https://cloud.google.com/docs)
- [GCP Community Support](https://cloud.google.com/support/docs/community)
- [Stack Overflow - GCP Tag](https://stackoverflow.com/questions/tagged/google-cloud-platform)

## Security Best Practices

### 1. Regular Updates
```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Update Docker images
docker-compose -f docker-compose.production.yml pull
docker-compose -f docker-compose.production.yml up -d
```

### 2. Firewall Configuration
```bash
# Only allow necessary ports
sudo ufw status
sudo ufw allow 22/tcp  # SSH
sudo ufw allow 80/tcp  # HTTP
sudo ufw allow 443/tcp # HTTPS
```

### 3. SSH Security
- Use SSH keys instead of passwords
- Disable root login
- Change default SSH port
- Use fail2ban (already configured)

### 4. Regular Backups
- Daily automated backups (configured)
- Test restore process monthly
- Store backups in multiple locations

### 5. Monitor Access Logs
```bash
# Check access logs
tail -f /var/log/nginx/access.log

# Check for suspicious activity
grep "404\|403" /var/log/nginx/access.log
```

## Appendix

### Useful Commands

```bash
# View VM details
gcloud compute instances describe lokdarpan-prod --zone=asia-south1-a

# View billing
gcloud billing accounts list
gcloud billing projects describe $PROJECT_ID

# View logs
gcloud logging read "resource.type=gce_instance"

# Create snapshot
gcloud compute disks snapshot lokdarpan-prod --zone=asia-south1-a

# Monitor resources
gcloud monitoring dashboards list
```

### Environment Variables Reference

| Variable | Description | Required |
|----------|-------------|----------|
| SECRET_KEY | Flask secret key | Yes |
| DB_PASSWORD | PostgreSQL password | Yes |
| DOMAIN_NAME | Your domain | Yes (for SSL) |
| LETSENCRYPT_EMAIL | Email for SSL | Yes (for SSL) |
| GEMINI_API_KEY | Google AI API | Yes |
| PERPLEXITY_API_KEY | Perplexity API | Yes |
| NEWS_API_KEY | News API | Optional |
| OPENAI_API_KEY | OpenAI API | Optional |

### Cost Breakdown

| Service | Monthly Cost | Notes |
|---------|-------------|-------|
| e2-medium VM | $25 | 2 vCPU, 4GB RAM |
| 50GB Disk | $8 | Standard persistent disk |
| Static IP | $3 | External IP address |
| Network | $2-5 | Egress traffic |
| **Total** | **~$40** | Approximate |

## Conclusion

This deployment provides a production-ready, cost-effective solution for running LokDarpan with 2 users. The setup is easily scalable as your user base grows, and all critical features are included:

- Automated backups
- SSL/HTTPS support
- Monitoring and logging
- Security hardening
- Easy scaling path

For questions or issues, refer to the troubleshooting section or contact your system administrator.