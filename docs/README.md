# LokDarpan Political Intelligence Platform
*Production-Ready AI-Driven Political Analytics for Campaign Teams*

## 🚀 Quick Start

**LokDarpan** is a sophisticated AI-powered political intelligence dashboard designed for campaign teams in Hyderabad, India. It provides real-time 360-degree political landscape insights using advanced AI models and comprehensive data analytics.

### **Instant Access**
```bash
# Access the platform
https://your-domain.com

# Default credentials (development)
Username: ashish
Password: password

# API Documentation
https://your-domain.com/api/docs
```

## 📋 Documentation Index

### **🎯 Getting Started**
- [**Quick Start Guide**](QUICK_START.md) - 5-minute setup
- [**User Manual**](USER_MANUAL.md) - Complete feature guide
- [**API Reference**](API_REFERENCE.md) - Complete API documentation

### **🔧 Administration**
- [**System Admin Guide**](SYSTEM_ADMIN_GUIDE.md) - Production operations
- [**Deployment Guide**](ENHANCED_GCP_DEPLOYMENT_GUIDE.md) - GCP deployment
- [**Backup & Recovery**](BACKUP_RECOVERY_GUIDE.md) - Data protection

### **🛠️ Development**
- [**Development Setup**](DEVELOPMENT_SETUP.md) - Local development
- [**Architecture Overview**](ARCHITECTURE.md) - Technical architecture
- [**Contributing Guide**](CONTRIBUTING.md) - Code contribution

### **🔍 Troubleshooting**
- [**Common Issues**](TROUBLESHOOTING.md) - Known problems & solutions
- [**Performance Guide**](PERFORMANCE_OPTIMIZATION.md) - Optimization tips
- [**Security Guide**](SECURITY_GUIDE.md) - Security best practices

### **📊 Features**
- [**Political Strategist**](POLITICAL_STRATEGIST_GUIDE.md) - AI analysis engine
- [**Ward Analytics**](WARD_ANALYTICS_GUIDE.md) - Geographic intelligence
- [**Real-time Monitoring**](MONITORING_GUIDE.md) - Live dashboard features

## 🌟 Key Features

### **AI-Powered Political Intelligence**
- **Political Strategist**: Gemini 2.5 Pro + Perplexity AI integration
- **Real-time Analysis**: Live sentiment and trend analysis
- **Strategic Briefings**: Automated campaign intelligence reports
- **Competitive Analysis**: Multi-party narrative comparison

### **Geographic Intelligence**
- **Ward-Level Analytics**: 150 GHMC ward coverage
- **Interactive Maps**: Clickable ward selection with data overlay
- **Demographic Insights**: Population and voter demographics
- **Spatial Analysis**: Geographic trend visualization

### **Real-Time Dashboard**
- **Live Data Streams**: SSE-powered real-time updates
- **Strategic Alerts**: Campaign-critical notifications
- **Performance Metrics**: API response time monitoring
- **Multi-Device Support**: Mobile-optimized interface

### **Enterprise Features**
- **99.9% Uptime**: Production-grade reliability
- **Advanced Security**: SSL/TLS, authentication, rate limiting
- **Comprehensive Monitoring**: Prometheus + Grafana
- **Automated Backups**: Daily database and configuration backups

## 🏗️ Architecture

### **Technology Stack**
```
Frontend:  React 18 + Vite 7 + TailwindCSS + React Query
Backend:   Flask + PostgreSQL 15 + Redis 7 + Celery
AI Layer:  Google Gemini 2.5 Pro + Perplexity AI
Deploy:    Docker + Traefik + Let's Encrypt
Monitor:   Prometheus + Grafana + Node Exporter
```

### **Infrastructure**
```
Production: GCP e2-standard-2 (2 vCPU, 8GB RAM, 50GB SSD)
Database:   PostgreSQL with pgvector for AI embeddings
Cache:      Redis with multi-database architecture
Workers:    Celery with priority queues for AI tasks
Security:   Traefik with automatic SSL/TLS certificates
```

## 🚀 Production Deployment

### **Prerequisites**
- Google Cloud Platform account with billing enabled
- Domain name (optional, can use IP address)
- Gemini API key from [Google AI Studio](https://makersuite.google.com/app/apikey)
- Perplexity API key from [Perplexity AI](https://www.perplexity.ai/settings/api)

### **One-Command Deployment**
```bash
# Clone repository
git clone https://github.com/your-org/lokdarpan.git
cd lokdarpan

# Configure environment
cp .env.production-enhanced.template .env.production-enhanced
# Edit .env.production-enhanced with your API keys and domain

# Deploy to GCP
chmod +x scripts/*.sh
./scripts/deploy-to-gcp-enhanced.sh
```

### **Post-Deployment**
```bash
# Validate deployment
./scripts/validate-deployment.sh

# Check system health
./scripts/health-check.sh

# Monitor performance
https://your-domain.com/grafana
```

## 📊 Monitoring & Operations

### **Health Monitoring**
- **System Health**: `/health` endpoint with detailed metrics
- **API Performance**: Response time and error rate tracking
- **AI Services**: Circuit breaker status and fallback monitoring
- **Resource Usage**: CPU, memory, disk utilization alerts

### **Operational Commands**
```bash
# View system status
./scripts/health-check.sh

# Check logs
docker-compose -f docker-compose.production-enhanced.yml logs -f

# Restart services
docker-compose -f docker-compose.production-enhanced.yml restart

# Emergency rollback
./scripts/rollback-enhanced.sh emergency
```

### **Monitoring Dashboards**
- **Main Dashboard**: System overview and key metrics
- **Political Intelligence**: AI analysis performance
- **Infrastructure**: Resource utilization and alerts
- **Security**: Authentication and access monitoring

## 🔐 Security Features

### **Authentication & Authorization**
- Session-based authentication with secure cookies
- Role-based access control for campaign teams
- API key management for external integrations
- Rate limiting on sensitive endpoints

### **Network Security**
- Automatic SSL/TLS certificates via Let's Encrypt
- Traefik reverse proxy with security headers
- CORS configuration for approved origins
- Firewall rules restricting unnecessary ports

### **Data Protection**
- Database encryption at rest and in transit
- Redis password protection
- Secure credential management
- Regular security updates via automated scripts

## 💰 Cost Analysis

### **Monthly Operating Costs**
| Component | Specification | Cost |
|-----------|--------------|------|
| **Compute VM** | e2-standard-2 (2 vCPU, 8GB) | $35 |
| **Storage** | 50GB pd-balanced SSD | $8 |
| **Network** | Static IP + data transfer | $5 |
| **AI Services** | Gemini + Perplexity usage | $20-50 |
| **Monitoring** | Prometheus + Grafana | $0 |
| **Total** | **Production-Grade Setup** | **$68-98** |

### **Cost Optimization**
- Committed use discounts: 30-57% savings
- Preemptible VMs for development: 80% savings
- Storage lifecycle policies: Automatic cost reduction
- Resource monitoring: Right-sizing recommendations

## 🎯 Use Cases

### **Political Campaign Teams**
- **Real-time Intelligence**: Monitor opponent activities and public sentiment
- **Strategic Planning**: AI-powered analysis for campaign decisions
- **Ward Management**: Geographic insights for targeted campaigning
- **Crisis Response**: Automated alerts for political developments

### **Electoral Analysis**
- **Sentiment Tracking**: Public opinion trends across wards
- **Competitive Analysis**: Multi-party narrative comparison
- **Prediction Modeling**: Electoral outcome forecasting
- **Performance Metrics**: Campaign effectiveness measurement

### **Government Affairs**
- **Policy Impact**: Public reaction to government decisions
- **Constituency Management**: Ward-level citizen feedback
- **Strategic Communications**: Data-driven messaging
- **Crisis Management**: Real-time situation awareness

## 📞 Support & Community

### **Getting Help**
- **Documentation**: Comprehensive guides in `/docs` directory
- **Health Checks**: Built-in system diagnostics
- **Logs**: Detailed application and system logs
- **Monitoring**: Real-time dashboards and alerts

### **Troubleshooting**
1. **Check System Health**: `./scripts/health-check.sh`
2. **Review Logs**: `docker-compose logs -f [service]`
3. **Validate Configuration**: `./scripts/validate-deployment.sh`
4. **Consult Docs**: See [Troubleshooting Guide](TROUBLESHOOTING.md)

### **Emergency Contacts**
- **System Admin**: Check system health endpoints
- **Technical Support**: Review deployment logs
- **Monitoring**: Grafana dashboards at `/grafana`

## 📈 Performance Metrics

### **Target Performance**
- **Page Load Time**: <2s on 3G networks in India
- **API Response Time**: <200ms for 95th percentile
- **AI Analysis Time**: <30s for comprehensive analysis
- **System Uptime**: 99.9% availability target
- **Concurrent Users**: 50-100 simultaneous users

### **Optimization Features**
- **Caching Strategy**: Multi-level caching for political data
- **CDN Ready**: Static asset optimization for Indian networks
- **Progressive Loading**: Critical content prioritization
- **Mobile Optimization**: Touch-friendly interface design

## 🔄 Continuous Improvement

### **Regular Updates**
- **Security Patches**: Automated system updates
- **Dependency Updates**: Regular package maintenance
- **Feature Enhancements**: Based on user feedback
- **Performance Optimization**: Continuous monitoring and tuning

### **Backup & Recovery**
- **Automated Backups**: Daily database and configuration backups
- **Disaster Recovery**: 15-minute RTO, 24-hour RPO
- **Testing Procedures**: Monthly backup restoration tests
- **Data Retention**: 30 days local, 1 year cloud storage

---

## 🚀 Ready to Start?

**Choose your path:**
- **Quick Demo**: Use default local setup for immediate testing
- **Production Deploy**: Follow [Enhanced GCP Deployment Guide](docs/ENHANCED_GCP_DEPLOYMENT_GUIDE.md)
- **Development Setup**: See [Development Setup Guide](docs/DEVELOPMENT_SETUP.md)

**LokDarpan - Empowering Political Intelligence with AI** 🗳️✨