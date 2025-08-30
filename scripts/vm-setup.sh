#!/bin/bash

# VM Setup Script - Runs on first boot of GCP instance
# This script installs all required dependencies

set -e

echo "Starting LokDarpan VM Setup..."

# Update system
apt-get update
apt-get upgrade -y

# Install essential packages
apt-get install -y \
    curl \
    wget \
    git \
    vim \
    htop \
    ufw \
    fail2ban \
    software-properties-common \
    ca-certificates \
    gnupg \
    lsb-release

# Install Docker
echo "Installing Docker..."
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
apt-get update
apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Install Docker Compose
echo "Installing Docker Compose..."
curl -L "https://github.com/docker/compose/releases/download/v2.24.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Configure Docker
systemctl enable docker
systemctl start docker

# Add user to docker group (for the default user)
usermod -aG docker $USER || true

# Install PostgreSQL client tools
apt-get install -y postgresql-client

# Install Node.js (for any frontend builds if needed)
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

# Install certbot for SSL
apt-get install -y certbot python3-certbot-nginx

# Configure firewall
echo "Configuring firewall..."
ufw --force enable
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw reload

# Configure fail2ban
echo "Configuring fail2ban..."
cat > /etc/fail2ban/jail.local << EOF
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5

[sshd]
enabled = true
port = ssh
filter = sshd
logpath = /var/log/auth.log
maxretry = 3
EOF

systemctl enable fail2ban
systemctl restart fail2ban

# Set up swap file (2GB)
echo "Setting up swap file..."
fallocate -l 2G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
echo '/swapfile none swap sw 0 0' | tee -a /etc/fstab

# Configure system limits
cat >> /etc/sysctl.conf << EOF
# LokDarpan optimizations
vm.swappiness=10
fs.file-max=100000
net.core.somaxconn=65535
net.ipv4.tcp_max_syn_backlog=2048
EOF
sysctl -p

# Create application directory
mkdir -p /home/lokdarpan
chown -R 1000:1000 /home/lokdarpan

# Set up log rotation
cat > /etc/logrotate.d/lokdarpan << EOF
/home/lokdarpan/logs/*.log {
    daily
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 1000 1000
    sharedscripts
    postrotate
        docker-compose -f /home/lokdarpan/docker-compose.production.yml kill -s USR1 backend
    endscript
}
EOF

# Install monitoring tools
echo "Installing monitoring tools..."
# Prometheus node exporter
wget https://github.com/prometheus/node_exporter/releases/download/v1.7.0/node_exporter-1.7.0.linux-amd64.tar.gz
tar xvf node_exporter-1.7.0.linux-amd64.tar.gz
cp node_exporter-1.7.0.linux-amd64/node_exporter /usr/local/bin/
rm -rf node_exporter-1.7.0.linux-amd64*

# Create systemd service for node exporter
cat > /etc/systemd/system/node_exporter.service << EOF
[Unit]
Description=Node Exporter
After=network.target

[Service]
Type=simple
User=nobody
Group=nogroup
ExecStart=/usr/local/bin/node_exporter

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable node_exporter
systemctl start node_exporter

# Install Google Cloud Ops Agent (for monitoring)
curl -sSO https://dl.google.com/cloudagents/add-google-cloud-ops-agent-repo.sh
bash add-google-cloud-ops-agent-repo.sh --also-install

# Create daily backup script
cat > /usr/local/bin/backup-lokdarpan.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/home/lokdarpan/backups"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR

# Backup database
docker exec lokdarpan-postgres pg_dumpall -U postgres | gzip > $BACKUP_DIR/db_backup_$DATE.sql.gz

# Keep only last 7 days of backups
find $BACKUP_DIR -name "*.sql.gz" -mtime +7 -delete

# Upload to Cloud Storage if configured
if [ ! -z "$GCS_BACKUP_BUCKET" ]; then
    gsutil cp $BACKUP_DIR/db_backup_$DATE.sql.gz gs://$GCS_BACKUP_BUCKET/
fi
EOF
chmod +x /usr/local/bin/backup-lokdarpan.sh

# Schedule daily backups
echo "0 2 * * * root /usr/local/bin/backup-lokdarpan.sh" >> /etc/crontab

echo "VM Setup Complete!"
echo "System will reboot in 10 seconds..."
sleep 10
reboot