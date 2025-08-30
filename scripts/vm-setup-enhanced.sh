#!/bin/bash

# Enhanced VM Setup Script for LokDarpan Production
# Includes security hardening, performance optimization, and monitoring
# Designed for GCP e2-medium instances serving political intelligence workloads

set -euo pipefail

# Color codes for output
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly NC='\033[0m'

# Configuration
readonly LOG_FILE="/var/log/lokdarpan-setup.log"
readonly SWAP_SIZE="2G"
readonly NODE_VERSION="20"
readonly DOCKER_COMPOSE_VERSION="2.24.0"
readonly FAIL2BAN_BANTIME="3600"
readonly FAIL2BAN_MAXRETRY="3"

# Logging function
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

log_warning() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1" | tee -a "$LOG_FILE"
}

log_error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1" | tee -a "$LOG_FILE"
}

# Error handling
trap 'log_error "Setup failed on line $LINENO. Exit code: $?"' ERR

log "Starting LokDarpan Enhanced VM Setup..."

# ============================================================================
# SYSTEM UPDATES AND BASIC PACKAGES
# ============================================================================

log "Updating system packages..."
export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get upgrade -y

log "Installing essential packages..."
apt-get install -y \
    curl \
    wget \
    git \
    vim \
    htop \
    iotop \
    nethogs \
    nload \
    tree \
    jq \
    unzip \
    software-properties-common \
    ca-certificates \
    gnupg \
    lsb-release \
    apt-transport-https \
    build-essential \
    python3-pip \
    python3-dev

# ============================================================================
# SECURITY HARDENING
# ============================================================================

log "Configuring enhanced security measures..."

# Install and configure fail2ban
apt-get install -y fail2ban

cat > /etc/fail2ban/jail.local << 'EOF'
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 3
destemail = admin@lokdarpan.com
sender = fail2ban@lokdarpan.com
action = %(action_mwl)s

[sshd]
enabled = true
port = ssh
filter = sshd
logpath = /var/log/auth.log
maxretry = 3
bantime = 3600

[nginx-limit-req]
enabled = true
filter = nginx-limit-req
action = iptables-multiport[name=ReqLimit, port="http,https", protocol=tcp]
logpath = /var/log/nginx/error.log
maxretry = 10
bantime = 600

[nginx-noscript]
enabled = true
port = http,https
filter = nginx-noscript
logpath = /var/log/nginx/access.log
maxretry = 6
bantime = 86400

[nginx-badbots]
enabled = true
port = http,https
filter = nginx-badbots
logpath = /var/log/nginx/access.log
maxretry = 2
bantime = 86400
EOF

systemctl enable fail2ban
systemctl restart fail2ban

# Configure UFW firewall
log "Configuring firewall rules..."
ufw --force reset
ufw default deny incoming
ufw default allow outgoing

# Allow essential ports
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP
ufw allow 443/tcp   # HTTPS

# Allow monitoring (restricted to localhost)
ufw allow from 127.0.0.1 to any port 3000   # Grafana
ufw allow from 127.0.0.1 to any port 9090   # Prometheus
ufw allow from 127.0.0.1 to any port 5555   # Flower

ufw --force enable

# Configure SSH security
log "Hardening SSH configuration..."
cp /etc/ssh/sshd_config /etc/ssh/sshd_config.backup

cat >> /etc/ssh/sshd_config << 'EOF'

# LokDarpan Security Hardening
Protocol 2
PermitRootLogin no
PasswordAuthentication yes
PubkeyAuthentication yes
AuthorizedKeysFile .ssh/authorized_keys
PermitEmptyPasswords no
ChallengeResponseAuthentication no
UsePAM yes
X11Forwarding no
PrintMotd no
AcceptEnv LANG LC_*
Subsystem sftp /usr/lib/openssh/sftp-server
ClientAliveInterval 300
ClientAliveCountMax 2
MaxAuthTries 3
MaxStartups 2
LoginGraceTime 60
EOF

systemctl restart ssh

# Set up automatic security updates
log "Configuring automatic security updates..."
apt-get install -y unattended-upgrades apt-listchanges

cat > /etc/apt/apt.conf.d/50unattended-upgrades << 'EOF'
Unattended-Upgrade::Allowed-Origins {
    "${distro_id}:${distro_codename}";
    "${distro_id}:${distro_codename}-security";
    "${distro_id}ESMApps:${distro_codename}-apps-security";
    "${distro_id}ESM:${distro_codename}-infra-security";
};

Unattended-Upgrade::AutoFixInterruptedDpkg "true";
Unattended-Upgrade::MinimalSteps "true";
Unattended-Upgrade::Remove-Unused-Dependencies "true";
Unattended-Upgrade::Automatic-Reboot "false";
Unattended-Upgrade::SyslogEnable "true";
EOF

echo 'APT::Periodic::Update-Package-Lists "1";' > /etc/apt/apt.conf.d/20auto-upgrades
echo 'APT::Periodic::Unattended-Upgrade "1";' >> /etc/apt/apt.conf.d/20auto-upgrades

# ============================================================================
# DOCKER INSTALLATION WITH SECURITY
# ============================================================================

log "Installing Docker with security hardening..."

# Remove old Docker installations
for pkg in docker.io docker-doc docker-compose podman-docker containerd runc; do
    apt-get remove -y $pkg || true
done

# Install Docker official repository
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null

apt-get update
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Secure Docker daemon configuration
log "Configuring Docker security settings..."
mkdir -p /etc/docker

cat > /etc/docker/daemon.json << 'EOF'
{
    "log-driver": "json-file",
    "log-opts": {
        "max-size": "10m",
        "max-file": "3"
    },
    "storage-driver": "overlay2",
    "userland-proxy": false,
    "icc": false,
    "live-restore": true,
    "no-new-privileges": true,
    "seccomp-profile": "/etc/docker/seccomp-default.json",
    "userns-remap": "default"
}
EOF

# Download Docker's default seccomp profile
curl -fsSL https://raw.githubusercontent.com/moby/moby/master/profiles/seccomp/default.json -o /etc/docker/seccomp-default.json

systemctl enable docker
systemctl restart docker

# Install Docker Compose
log "Installing Docker Compose..."
curl -L "https://github.com/docker/compose/releases/download/v${DOCKER_COMPOSE_VERSION}/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Create docker group and add user
groupadd -f docker
usermod -aG docker $USER || true

# ============================================================================
# NODE.JS INSTALLATION
# ============================================================================

log "Installing Node.js ${NODE_VERSION}..."
curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash -
apt-get install -y nodejs

# ============================================================================
# DATABASE AND MONITORING TOOLS
# ============================================================================

log "Installing PostgreSQL client tools..."
apt-get install -y postgresql-client

log "Installing monitoring and diagnostic tools..."
apt-get install -y \
    sysstat \
    iftop \
    tcpdump \
    strace \
    lsof \
    dstat \
    ncdu

# ============================================================================
# SSL/TLS CERTIFICATE MANAGEMENT
# ============================================================================

log "Installing certbot for SSL certificate management..."
apt-get install -y certbot python3-certbot-nginx

# ============================================================================
# PERFORMANCE OPTIMIZATION
# ============================================================================

log "Optimizing system performance..."

# Create optimized swap file
if [ ! -f /swapfile ]; then
    log "Creating ${SWAP_SIZE} swap file..."
    fallocate -l $SWAP_SIZE /swapfile
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    echo '/swapfile none swap sw 0 0' | tee -a /etc/fstab
fi

# Optimize kernel parameters for web server workloads
cat >> /etc/sysctl.conf << 'EOF'

# LokDarpan Performance Optimizations
vm.swappiness=10
vm.vfs_cache_pressure=50
vm.dirty_ratio=15
vm.dirty_background_ratio=5

# Network optimizations
net.core.somaxconn=65535
net.core.netdev_max_backlog=5000
net.ipv4.tcp_max_syn_backlog=8192
net.ipv4.tcp_syncookies=1
net.ipv4.tcp_tw_reuse=1
net.ipv4.tcp_fin_timeout=30
net.ipv4.tcp_keepalive_time=1800
net.ipv4.tcp_keepalive_intvl=15
net.ipv4.tcp_keepalive_probes=5
net.ipv4.tcp_rmem=4096 65536 16777216
net.ipv4.tcp_wmem=4096 65536 16777216
net.core.rmem_max=16777216
net.core.wmem_max=16777216
net.ipv4.tcp_congestion_control=bbr

# File system optimizations
fs.file-max=2097152
fs.inotify.max_user_watches=524288

# Security
kernel.dmesg_restrict=1
kernel.kptr_restrict=2
kernel.yama.ptrace_scope=1
net.ipv4.conf.default.rp_filter=1
net.ipv4.conf.all.rp_filter=1
net.ipv4.conf.all.accept_source_route=0
net.ipv4.conf.default.accept_source_route=0
net.ipv4.conf.all.accept_redirects=0
net.ipv4.conf.default.accept_redirects=0
net.ipv4.conf.all.secure_redirects=0
net.ipv4.conf.default.secure_redirects=0
net.ipv4.ip_forward=0
net.ipv4.conf.all.send_redirects=0
net.ipv4.conf.default.send_redirects=0
EOF

sysctl -p

# Optimize file descriptor limits
cat >> /etc/security/limits.conf << 'EOF'
* soft nofile 65536
* hard nofile 65536
root soft nofile 65536
root hard nofile 65536
EOF

# ============================================================================
# APPLICATION DIRECTORY SETUP
# ============================================================================

log "Creating application directories..."
mkdir -p /opt/lokdarpan/{logs,data,backups,certs,monitoring}
mkdir -p /opt/lokdarpan/data/epaper/{inbox,processed,error}

# Create lokdarpan system user
if ! id -u lokdarpan >/dev/null 2>&1; then
    useradd -r -m -s /bin/bash -d /opt/lokdarpan lokdarpan
fi

chown -R lokdarpan:lokdarpan /opt/lokdarpan
chmod -R 755 /opt/lokdarpan

# ============================================================================
# MONITORING SETUP
# ============================================================================

log "Installing monitoring components..."

# Install Prometheus Node Exporter
PROM_VERSION="1.7.0"
wget https://github.com/prometheus/node_exporter/releases/download/v${PROM_VERSION}/node_exporter-${PROM_VERSION}.linux-amd64.tar.gz
tar xvf node_exporter-${PROM_VERSION}.linux-amd64.tar.gz
cp node_exporter-${PROM_VERSION}.linux-amd64/node_exporter /usr/local/bin/
rm -rf node_exporter-${PROM_VERSION}.linux-amd64*

# Create node exporter systemd service
cat > /etc/systemd/system/node_exporter.service << 'EOF'
[Unit]
Description=Node Exporter
After=network.target

[Service]
User=nobody
Group=nogroup
Type=simple
ExecStart=/usr/local/bin/node_exporter \
    --web.listen-address=127.0.0.1:9100 \
    --collector.systemd \
    --collector.processes \
    --collector.interrupts
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable node_exporter
systemctl start node_exporter

# Install Google Cloud Ops Agent
log "Installing Google Cloud Ops Agent..."
curl -sSO https://dl.google.com/cloudagents/add-google-cloud-ops-agent-repo.sh
bash add-google-cloud-ops-agent-repo.sh --also-install
rm add-google-cloud-ops-agent-repo.sh

# ============================================================================
# LOG ROTATION AND MANAGEMENT
# ============================================================================

log "Setting up log rotation..."
cat > /etc/logrotate.d/lokdarpan << 'EOF'
/opt/lokdarpan/logs/*.log {
    daily
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 lokdarpan lokdarpan
    sharedscripts
    postrotate
        /usr/bin/docker-compose -f /opt/lokdarpan/docker-compose.production.yml kill -s USR1 backend || true
    endscript
}

/var/log/lokdarpan/*.log {
    daily
    rotate 30
    compress
    delaycompress
    notifempty
    create 0640 lokdarpan lokdarpan
}
EOF

# Create log directory
mkdir -p /var/log/lokdarpan
chown lokdarpan:lokdarpan /var/log/lokdarpan

# ============================================================================
# BACKUP AUTOMATION
# ============================================================================

log "Setting up automated backup system..."
cat > /usr/local/bin/lokdarpan-backup.sh << 'EOF'
#!/bin/bash

# LokDarpan Automated Backup Script
set -euo pipefail

readonly BACKUP_DIR="/opt/lokdarpan/backups"
readonly DATE=$(date +%Y%m%d_%H%M%S)
readonly LOG_FILE="/var/log/lokdarpan/backup.log"
readonly RETENTION_DAYS=30

# Create backup directory
mkdir -p "$BACKUP_DIR"

log_backup() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"
}

log_backup "Starting backup process..."

# Database backup
log_backup "Backing up PostgreSQL database..."
if docker exec lokdarpan-postgres pg_dumpall -U postgres | gzip > "$BACKUP_DIR/db_backup_$DATE.sql.gz"; then
    log_backup "Database backup completed successfully"
else
    log_backup "ERROR: Database backup failed"
    exit 1
fi

# Application data backup
log_backup "Backing up application data..."
tar -czf "$BACKUP_DIR/data_backup_$DATE.tar.gz" -C /opt/lokdarpan data/ 2>/dev/null || {
    log_backup "WARNING: Application data backup had issues"
}

# Configuration backup
log_backup "Backing up configuration files..."
tar -czf "$BACKUP_DIR/config_backup_$DATE.tar.gz" \
    /opt/lokdarpan/.env.production \
    /opt/lokdarpan/docker-compose.production.yml \
    /opt/lokdarpan/monitoring/ \
    2>/dev/null || {
    log_backup "WARNING: Configuration backup had issues"
}

# Clean old backups
log_backup "Cleaning old backups (keeping ${RETENTION_DAYS} days)..."
find "$BACKUP_DIR" -name "*.gz" -mtime +${RETENTION_DAYS} -delete 2>/dev/null || true
find "$BACKUP_DIR" -name "*.tar.gz" -mtime +${RETENTION_DAYS} -delete 2>/dev/null || true

# Upload to Google Cloud Storage if configured
if [ ! -z "${GCS_BACKUP_BUCKET:-}" ] && command -v gsutil >/dev/null 2>&1; then
    log_backup "Uploading backups to Google Cloud Storage..."
    gsutil -m cp "$BACKUP_DIR/db_backup_$DATE.sql.gz" "gs://$GCS_BACKUP_BUCKET/database/" || {
        log_backup "WARNING: Database backup upload failed"
    }
    gsutil -m cp "$BACKUP_DIR/data_backup_$DATE.tar.gz" "gs://$GCS_BACKUP_BUCKET/data/" || {
        log_backup "WARNING: Data backup upload failed"
    }
    gsutil -m cp "$BACKUP_DIR/config_backup_$DATE.tar.gz" "gs://$GCS_BACKUP_BUCKET/config/" || {
        log_backup "WARNING: Config backup upload failed"
    }
fi

# Backup size and summary
BACKUP_SIZE=$(du -sh "$BACKUP_DIR" | cut -f1)
log_backup "Backup process completed. Total backup size: $BACKUP_SIZE"

# Send status to monitoring (if curl is available)
if command -v curl >/dev/null 2>&1; then
    curl -s -X POST "http://localhost:9091/metrics/job/backup/instance/$(hostname)" \
        --data-binary "backup_completed{job=\"lokdarpan-backup\"} 1" || true
fi
EOF

chmod +x /usr/local/bin/lokdarpan-backup.sh

# Schedule daily backups at 2 AM
echo "0 2 * * * root /usr/local/bin/lokdarpan-backup.sh" >> /etc/crontab

# ============================================================================
# HEALTH MONITORING SCRIPT
# ============================================================================

log "Setting up health monitoring..."
cat > /usr/local/bin/lokdarpan-health-check.sh << 'EOF'
#!/bin/bash

# LokDarpan Health Check Script
set -euo pipefail

readonly LOG_FILE="/var/log/lokdarpan/health.log"
readonly ALERT_THRESHOLD_CPU=80
readonly ALERT_THRESHOLD_MEM=85
readonly ALERT_THRESHOLD_DISK=90

log_health() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"
}

# Check system resources
CPU_USAGE=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1)
MEM_USAGE=$(free | grep Mem | awk '{printf "%.0f", $3/$2 * 100.0}')
DISK_USAGE=$(df -h / | awk 'NR==2 {printf "%d", $5}')

# Check Docker containers
CONTAINER_STATUS=$(docker-compose -f /opt/lokdarpan/docker-compose.production.yml ps -q | wc -l)

# Check critical services
BACKEND_STATUS=$(curl -f -s http://localhost/api/v1/status >/dev/null 2>&1 && echo "UP" || echo "DOWN")
POSTGRES_STATUS=$(docker exec lokdarpan-postgres pg_isready -U postgres >/dev/null 2>&1 && echo "UP" || echo "DOWN")
REDIS_STATUS=$(docker exec lokdarpan-redis redis-cli ping >/dev/null 2>&1 && echo "UP" || echo "DOWN")

# Log current status
log_health "CPU: ${CPU_USAGE}%, Memory: ${MEM_USAGE}%, Disk: ${DISK_USAGE}%"
log_health "Containers: $CONTAINER_STATUS, Backend: $BACKEND_STATUS, Postgres: $POSTGRES_STATUS, Redis: $REDIS_STATUS"

# Check for alerts
if (( $(echo "$CPU_USAGE > $ALERT_THRESHOLD_CPU" | bc -l) )); then
    log_health "ALERT: High CPU usage: ${CPU_USAGE}%"
fi

if [ "$MEM_USAGE" -gt "$ALERT_THRESHOLD_MEM" ]; then
    log_health "ALERT: High memory usage: ${MEM_USAGE}%"
fi

if [ "$DISK_USAGE" -gt "$ALERT_THRESHOLD_DISK" ]; then
    log_health "ALERT: High disk usage: ${DISK_USAGE}%"
fi

if [ "$BACKEND_STATUS" != "UP" ]; then
    log_health "ALERT: Backend service is down"
fi

if [ "$POSTGRES_STATUS" != "UP" ]; then
    log_health "ALERT: PostgreSQL service is down"
fi

if [ "$REDIS_STATUS" != "UP" ]; then
    log_health "ALERT: Redis service is down"
fi
EOF

chmod +x /usr/local/bin/lokdarpan-health-check.sh

# Schedule health checks every 5 minutes
echo "*/5 * * * * root /usr/local/bin/lokdarpan-health-check.sh" >> /etc/crontab

# ============================================================================
# CLEANUP AND FINALIZATION
# ============================================================================

log "Cleaning up installation files..."
apt-get autoremove -y
apt-get autoclean

# Update locate database
updatedb

# Set proper timezone
timedatectl set-timezone Asia/Kolkata

# Enable and start services
systemctl daemon-reload
systemctl enable docker
systemctl enable fail2ban
systemctl enable ufw

log "Creating system info script..."
cat > /usr/local/bin/lokdarpan-info.sh << 'EOF'
#!/bin/bash

echo "========================================"
echo "LokDarpan System Information"
echo "========================================"
echo "Date: $(date)"
echo "Uptime: $(uptime -p)"
echo "Load: $(uptime | awk -F'load average:' '{print $2}')"
echo "Memory: $(free -h | grep Mem | awk '{printf "%s/%s (%.1f%%)", $3, $2, $3/$2*100}')"
echo "Disk: $(df -h / | awk 'NR==2 {printf "%s/%s (%s)", $3, $2, $5}')"
echo "Docker: $(docker --version)"
echo "Docker Compose: $(docker-compose --version)"
echo ""
echo "LokDarpan Services:"
if [ -f /opt/lokdarpan/docker-compose.production.yml ]; then
    docker-compose -f /opt/lokdarpan/docker-compose.production.yml ps
else
    echo "Not deployed yet"
fi
echo ""
echo "Recent logs:"
tail -10 /var/log/lokdarpan-setup.log 2>/dev/null || echo "No setup logs found"
EOF

chmod +x /usr/local/bin/lokdarpan-info.sh

# Create MOTD
cat > /etc/motd << 'EOF'
  _           _    ____                            
 | |         | |  |  _ \                           
 | |     ___ | | _| | | | __ _ _ __ _ __   __ _ _ __  
 | |    / _ \| |/ / | | |/ _` | '__| '_ \ / _` | '_ \ 
 | |___| (_) |   <| |_| | (_| | |  | |_) | (_| | | | |
 |______\___/|_|\_\____/ \__,_|_|  | .__/ \__,_|_| |_|
                                   | |                
                                   |_|                

 Political Intelligence Dashboard - Production Server
 
 System Status: /usr/local/bin/lokdarpan-info.sh
 Health Check: /usr/local/bin/lokdarpan-health-check.sh
 Backup Script: /usr/local/bin/lokdarpan-backup.sh
 
 Application Directory: /opt/lokdarpan
 Log Directory: /var/log/lokdarpan
 
EOF

log "VM setup completed successfully!"
log "System will reboot in 10 seconds to apply all changes..."

# Schedule final reboot
sleep 10
reboot