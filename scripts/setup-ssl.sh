#!/bin/bash

# LokDarpan SSL Setup Script
# Configures Let's Encrypt SSL certificates for the application

set -e

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}LokDarpan SSL Setup${NC}"
echo -e "${GREEN}========================================${NC}"

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}Please run as root (use sudo)${NC}"
    exit 1
fi

# Load environment variables
if [ -f .env.production ]; then
    export $(cat .env.production | grep -v '^#' | xargs)
else
    echo -e "${RED}.env.production file not found${NC}"
    exit 1
fi

# Check required variables
if [ -z "$DOMAIN_NAME" ]; then
    echo -e "${RED}DOMAIN_NAME not set in .env.production${NC}"
    read -p "Enter your domain name (e.g., example.com): " DOMAIN_NAME
fi

if [ -z "$LETSENCRYPT_EMAIL" ]; then
    echo -e "${RED}LETSENCRYPT_EMAIL not set in .env.production${NC}"
    read -p "Enter your email for Let's Encrypt: " LETSENCRYPT_EMAIL
fi

# Function to setup SSL with Docker Compose and Traefik
setup_traefik_ssl() {
    echo -e "${YELLOW}Setting up SSL with Traefik...${NC}"
    
    # Update docker-compose with domain
    sed -i "s/your-domain.com/$DOMAIN_NAME/g" docker-compose.production.yml
    
    # Restart services with new configuration
    docker-compose -f docker-compose.production.yml down
    docker-compose -f docker-compose.production.yml up -d
    
    echo -e "${GREEN}SSL setup with Traefik completed${NC}"
    echo -e "${YELLOW}Traefik will automatically obtain SSL certificates${NC}"
}

# Function to setup SSL with standalone Nginx
setup_nginx_ssl() {
    echo -e "${YELLOW}Setting up SSL with standalone Nginx...${NC}"
    
    # Install Nginx if not present
    if ! command -v nginx &> /dev/null; then
        apt-get update
        apt-get install -y nginx
    fi
    
    # Install Certbot
    if ! command -v certbot &> /dev/null; then
        apt-get install -y certbot python3-certbot-nginx
    fi
    
    # Create Nginx configuration
    cat > /etc/nginx/sites-available/lokdarpan << EOF
server {
    listen 80;
    server_name $DOMAIN_NAME www.$DOMAIN_NAME;
    
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }
    
    location / {
        return 301 https://\$server_name\$request_uri;
    }
}

server {
    listen 443 ssl http2;
    server_name $DOMAIN_NAME www.$DOMAIN_NAME;
    
    # SSL certificates will be added by certbot
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    
    # Proxy to Docker services
    location / {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }
    
    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF
    
    # Enable site
    ln -sf /etc/nginx/sites-available/lokdarpan /etc/nginx/sites-enabled/
    rm -f /etc/nginx/sites-enabled/default
    
    # Test Nginx configuration
    nginx -t
    
    # Reload Nginx
    systemctl reload nginx
    
    # Obtain SSL certificate
    echo -e "${YELLOW}Obtaining SSL certificate from Let's Encrypt...${NC}"
    certbot --nginx -d $DOMAIN_NAME -d www.$DOMAIN_NAME \
        --non-interactive \
        --agree-tos \
        --email $LETSENCRYPT_EMAIL \
        --redirect
    
    # Set up auto-renewal
    echo -e "${YELLOW}Setting up auto-renewal...${NC}"
    cat > /etc/cron.d/certbot << EOF
0 3 * * * root certbot renew --quiet --post-hook "systemctl reload nginx"
EOF
    
    echo -e "${GREEN}SSL setup with Nginx completed${NC}"
}

# Function to test SSL configuration
test_ssl() {
    echo -e "${YELLOW}Testing SSL configuration...${NC}"
    
    # Test HTTPS connection
    if curl -f -s -o /dev/null "https://$DOMAIN_NAME"; then
        echo -e "${GREEN}HTTPS is working!${NC}"
    else
        echo -e "${RED}HTTPS test failed${NC}"
        return 1
    fi
    
    # Test SSL certificate
    echo | openssl s_client -servername $DOMAIN_NAME -connect $DOMAIN_NAME:443 2>/dev/null | \
        openssl x509 -noout -text | grep -A2 "Subject:"
    
    # Test redirect
    REDIRECT=$(curl -s -o /dev/null -w "%{http_code}" "http://$DOMAIN_NAME")
    if [ "$REDIRECT" = "301" ] || [ "$REDIRECT" = "302" ]; then
        echo -e "${GREEN}HTTP to HTTPS redirect is working${NC}"
    else
        echo -e "${YELLOW}HTTP to HTTPS redirect may not be working (code: $REDIRECT)${NC}"
    fi
}

# Function to setup SSL renewal monitoring
setup_monitoring() {
    echo -e "${YELLOW}Setting up SSL renewal monitoring...${NC}"
    
    # Create monitoring script
    cat > /usr/local/bin/check-ssl-expiry.sh << 'EOF'
#!/bin/bash
DOMAIN=$1
DAYS_WARNING=30

EXPIRY=$(echo | openssl s_client -servername $DOMAIN -connect $DOMAIN:443 2>/dev/null | \
    openssl x509 -noout -enddate | cut -d= -f2)
EXPIRY_EPOCH=$(date -d "$EXPIRY" +%s)
CURRENT_EPOCH=$(date +%s)
DAYS_LEFT=$(( ($EXPIRY_EPOCH - $CURRENT_EPOCH) / 86400 ))

if [ $DAYS_LEFT -lt $DAYS_WARNING ]; then
    echo "WARNING: SSL certificate for $DOMAIN expires in $DAYS_LEFT days"
    # Send alert (configure your alerting here)
fi

echo "SSL certificate for $DOMAIN expires in $DAYS_LEFT days"
EOF
    
    chmod +x /usr/local/bin/check-ssl-expiry.sh
    
    # Add to cron
    echo "0 9 * * * root /usr/local/bin/check-ssl-expiry.sh $DOMAIN_NAME" >> /etc/crontab
    
    echo -e "${GREEN}SSL monitoring setup completed${NC}"
}

# Main execution
main() {
    echo -e "${YELLOW}Choose SSL setup method:${NC}"
    echo "1) Automatic with Traefik (recommended)"
    echo "2) Manual with Nginx"
    echo "3) Skip SSL setup"
    
    read -p "Enter option (1-3): " option
    
    case $option in
        1)
            setup_traefik_ssl
            ;;
        2)
            setup_nginx_ssl
            ;;
        3)
            echo -e "${YELLOW}Skipping SSL setup${NC}"
            exit 0
            ;;
        *)
            echo -e "${RED}Invalid option${NC}"
            exit 1
            ;;
    esac
    
    # Test SSL configuration
    echo -e "${YELLOW}Waiting for SSL to be ready...${NC}"
    sleep 10
    test_ssl
    
    # Setup monitoring
    setup_monitoring
    
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}SSL Setup Complete!${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo -e ""
    echo -e "Your site is now available at:"
    echo -e "  ${GREEN}https://$DOMAIN_NAME${NC}"
    echo -e "  ${GREEN}https://www.$DOMAIN_NAME${NC}"
    echo -e ""
    echo -e "SSL certificate will auto-renew every 60 days"
    echo -e ""
    echo -e "${YELLOW}Important:${NC}"
    echo -e "- Update your .env.production with CORS_ORIGINS to include https://$DOMAIN_NAME"
    echo -e "- Restart services after updating environment: docker-compose -f docker-compose.production.yml restart"
}

# Run main function
main