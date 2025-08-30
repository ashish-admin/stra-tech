# LokDarpan Quick Start Guide
*Get your political intelligence platform running in 5 minutes*

## 🚀 Fastest Path to LokDarpan

### **Option 1: Local Development (2 minutes)**
```bash
# 1. Start backend
cd backend
source venv/bin/activate  # Linux/Mac
# OR: call venv\Scripts\activate.bat  # Windows
flask run

# 2. Start frontend (new terminal)
cd frontend
npm run dev

# 3. Access platform
# Frontend: http://localhost:5173
# Backend: http://localhost:5000
# Login: ashish / password
```

### **Option 2: Production GCP Deployment (10 minutes)**
```bash
# 1. Configure environment
cp .env.production-enhanced.template .env.production-enhanced
nano .env.production-enhanced  # Add your API keys

# 2. Deploy to GCP
./scripts/deploy-to-gcp-enhanced.sh

# 3. Access your platform
# URL will be provided after deployment
```

## 🎯 What You'll See

### **Dashboard Overview**
After logging in, you'll have access to:

1. **Political Strategist** - AI-powered analysis
2. **Ward Analytics** - Geographic intelligence
3. **Live Sentiment** - Real-time opinion tracking
4. **Competitive Analysis** - Multi-party comparison
5. **Strategic Alerts** - Campaign notifications

### **Key Features to Test**

#### **1. Ward Selection**
- Click on the map to select different wards
- Watch all components update with ward-specific data
- Try "Jubilee Hills", "Banjara Hills", "Secunderabad"

#### **2. Political Strategist**
- Navigate to the Strategist tab
- Select analysis depth: Quick/Standard/Deep
- Watch real-time AI analysis stream in

#### **3. Live Data Streams**
- Monitor real-time sentiment updates
- Check trending political issues
- View competitor mention tracking

## 📊 Sample Data Available

### **Pre-loaded Demo Data**
- **10,000+ news articles** from major Indian publications
- **150 GHMC wards** with demographic data
- **Political figures** and party mentions
- **Sentiment analysis** for trending topics

### **AI Analysis Examples**
Try these prompts in the Political Strategist:
- "What are the key issues in Jubilee Hills?"
- "Compare sentiment across all wards"
- "Analyze recent political developments"

## 🔧 Configuration

### **Environment Variables**
Key settings in `.env` files:

```bash
# Database
DATABASE_URL=postgresql://postgres:amuktha@localhost/lokdarpan_db

# API Keys (for AI features)
GEMINI_API_KEY=your-key-here
PERPLEXITY_API_KEY=your-key-here

# Domain (for production)
DOMAIN_NAME=your-domain.com
SSL_EMAIL=admin@your-domain.com
```

### **API Endpoints**
Test these URLs after startup:
- **Health**: `http://localhost:5000/api/v1/status`
- **Trends**: `http://localhost:5000/api/v1/trends?ward=All&days=30`
- **Ward Data**: `http://localhost:5000/api/v1/ward/meta/1`
- **AI Analysis**: `http://localhost:5000/api/v1/strategist/Jubilee Hills`

## 🚨 Common Issues

### **Backend Won't Start**
```bash
# Check database connection
psql "$DATABASE_URL" -c "SELECT 1;"

# Install missing dependencies
pip install -r requirements.txt

# Reset database
flask db upgrade
```

### **Frontend Issues**
```bash
# Clear node modules
rm -rf node_modules package-lock.json
npm install

# Check proxy configuration
# Ensure VITE_API_BASE_URL is empty for development
```

### **API Key Issues**
```bash
# Test your keys
./scripts/test-api-keys.sh

# Verify environment loading
echo $GEMINI_API_KEY
echo $PERPLEXITY_API_KEY
```

## 🔍 Testing Your Setup

### **Health Check Commands**
```bash
# System health
./scripts/health-check.sh

# Comprehensive validation
./scripts/validate-deployment.sh

# API connectivity
curl http://localhost:5000/api/v1/status
```

### **Expected Responses**
- **Status endpoint**: Should return `{"status": "healthy"}`
- **Frontend**: Should load dashboard with login form
- **Database**: Should show ward and post data
- **AI Services**: Should respond with analysis (if keys configured)

## 🎯 Next Steps

### **After Basic Setup**
1. **Explore Features**: Try all dashboard tabs
2. **Test AI Analysis**: Use the Political Strategist
3. **Check Monitoring**: Visit `/grafana` (production)
4. **Read Documentation**: See full guides in `/docs`

### **For Production Use**
1. **Configure Domain**: Point DNS to your server
2. **Set Up SSL**: Automated via Let's Encrypt
3. **Monitor Health**: Use built-in dashboards
4. **Schedule Backups**: Configure backup procedures

### **For Development**
1. **Read Architecture**: Understand the codebase
2. **Set Up Environment**: Follow development guide
3. **Contributing**: See contribution guidelines
4. **Testing**: Run test suites

## 📞 Need Help?

### **Quick Diagnostics**
```bash
# Check all services
docker-compose ps

# View logs
docker-compose logs -f [service-name]

# Test database
psql "$DATABASE_URL" -c "SELECT count(*) FROM post;"
```

### **Documentation Links**
- [**System Admin Guide**](SYSTEM_ADMIN_GUIDE.md) - Operations
- [**Troubleshooting**](TROUBLESHOOTING.md) - Common problems
- [**API Reference**](API_REFERENCE.md) - Complete API docs

### **Support Resources**
- **Health Dashboards**: Built-in monitoring
- **Log Files**: Detailed application logs  
- **Configuration Validation**: Automated checks
- **Performance Metrics**: Real-time monitoring

---

## 🎉 Success!

You now have LokDarpan running! The platform provides:
- ✅ **Real-time political intelligence**
- ✅ **AI-powered analysis** 
- ✅ **Interactive ward analytics**
- ✅ **Production-ready monitoring**

**Ready to start your political intelligence operations!** 🗳️🚀