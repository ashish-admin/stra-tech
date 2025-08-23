# LokDarpan Troubleshooting Guide

## Complete Issue Resolution Guide

Comprehensive troubleshooting guide for LokDarpan's multi-model AI political intelligence platform. Covers common issues, diagnostic procedures, and resolution steps.

## Quick Issue Resolution

### Emergency Procedures

#### System Down/Unresponsive
```bash
# 1. Check system status
systemctl status lokdarpan-api
systemctl status postgresql
systemctl status redis-server

# 2. Check logs for critical errors
tail -f /var/log/lokdarpan/app.log | grep -E "CRITICAL|ERROR"
journalctl -u lokdarpan-api -f --since "10 minutes ago"

# 3. Restart services in order
sudo systemctl restart redis-server
sudo systemctl restart postgresql
sudo systemctl restart lokdarpan-api

# 4. Verify services are healthy
curl -f http://localhost:5000/health
```

#### AI Services Completely Unavailable
```bash
# Check AI service connectivity
curl -H "Authorization: Bearer $CLAUDE_API_KEY" https://api.anthropic.com/v1/messages
curl -H "Authorization: Bearer $PERPLEXITY_API_KEY" https://api.perplexity.ai/chat/completions
curl -H "Authorization: Bearer $OPENAI_API_KEY" https://api.openai.com/v1/models

# Activate emergency fallback mode
export LOKDARPAN_EMERGENCY_MODE=true
export LOKDARPAN_FALLBACK_ONLY=true
sudo systemctl restart lokdarpan-api
```

#### Budget Exceeded/System Locked
```bash
# Reset monthly budget counter (emergency only)
redis-cli DEL "budget:current_month"
redis-cli DEL "budget:daily_spend"

# Check current budget status
curl -H "Cookie: lokdarpan_session=TOKEN" http://localhost:5000/api/v1/multimodel/status | jq '.budget_status'
```

## Authentication and Access Issues

### Login Problems

#### Issue: Cannot Login / Session Invalid

**Symptoms**:
- Login page shows "Invalid credentials" 
- Valid credentials not accepted
- Redirected back to login after successful authentication

**Diagnostic Steps**:
```bash
# Check database connectivity
psql "$DATABASE_URL" -c "SELECT count(*) FROM users WHERE active = true;"

# Check Redis session storage
redis-cli KEYS "session:*" | wc -l

# Verify password hashing
python3 -c "
from werkzeug.security import check_password_hash
# Test with known user hash from database
"
```

**Common Causes & Solutions**:

1. **Database Connection Issues**
   ```bash
   # Test database connection
   psql "$DATABASE_URL" -c "\dt"
   
   # Solution: Check DATABASE_URL and restart PostgreSQL
   sudo systemctl restart postgresql
   ```

2. **Redis Session Storage Problems**
   ```bash
   # Check Redis connectivity
   redis-cli ping
   
   # Clear session cache
   redis-cli FLUSHDB 1
   ```

3. **Configuration Issues**
   ```bash
   # Verify environment variables
   echo $SECRET_KEY
   echo $DATABASE_URL
   echo $REDIS_URL
   
   # Regenerate secret key if corrupted
   python scripts/generate_secret_key.py > .env.secret
   ```

#### Issue: Session Expires Too Quickly

**Symptoms**:
- Users logged out after short periods
- "Session expired" messages frequently

**Solution**:
```python
# Update session configuration in config.py
PERMANENT_SESSION_LIFETIME = timedelta(hours=8)  # Extend session

# Or in environment
export SESSION_TIMEOUT_HOURS=8
```

### Permission Denied Issues

#### Issue: API Endpoints Return 403 Forbidden

**Diagnostic**:
```bash
# Check user permissions
psql "$DATABASE_URL" -c "
SELECT u.username, u.role, u.active, u.ward_access 
FROM users u 
WHERE u.username = 'problematic_user';
"

# Test endpoint with admin user
curl -H "Cookie: lokdarpan_session=ADMIN_TOKEN" \
  http://localhost:5000/api/v1/multimodel/analyze -X POST
```

**Solutions**:
1. **Update user permissions**
   ```sql
   UPDATE users SET role = 'campaign_manager' WHERE username = 'user';
   UPDATE users SET ward_access = '["All", "Jubilee Hills"]' WHERE username = 'user';
   ```

2. **Check ward-level access**
   ```python
   # In Flask app context
   from app.models import User
   user = User.query.filter_by(username='user').first()
   print(f"Ward access: {user.ward_access}")
   ```

## AI System Issues

### Multi-Model AI Failures

#### Issue: All AI Models Returning Errors

**Symptoms**:
- "Analysis failed" messages
- Circuit breakers open for all models
- High error rates in logs

**Diagnostic Process**:
```bash
# 1. Check AI service status
curl -H "Cookie: lokdarpan_session=TOKEN" \
  http://localhost:5000/api/v1/multimodel/status | jq '.models'

# 2. Test each service individually
# Claude test
curl -X POST https://api.anthropic.com/v1/messages \
  -H "Content-Type: application/json" \
  -H "x-api-key: $CLAUDE_API_KEY" \
  -d '{"model": "claude-3-5-sonnet-20241022", "max_tokens": 100, "messages": [{"role": "user", "content": "test"}]}'

# Perplexity test  
curl -X POST https://api.perplexity.ai/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $PERPLEXITY_API_KEY" \
  -d '{"model": "llama-3.1-sonar-small-128k-online", "messages": [{"role": "user", "content": "test"}]}'

# OpenAI test
curl -X POST https://api.openai.com/v1/embeddings \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  -d '{"model": "text-embedding-3-small", "input": "test"}'

# Local Llama test
curl -X POST http://localhost:11434/api/generate \
  -H "Content-Type: application/json" \
  -d '{"model": "llama3:latest", "prompt": "test", "stream": false}'
```

**Common Solutions**:

1. **API Key Issues**
   ```bash
   # Verify API keys are properly set
   echo $CLAUDE_API_KEY | cut -c1-10
   echo $PERPLEXITY_API_KEY | cut -c1-10  
   echo $OPENAI_API_KEY | cut -c1-10
   
   # Test key validity
   python3 -c "
   import os
   import anthropic
   client = anthropic.Anthropic(api_key=os.getenv('CLAUDE_API_KEY'))
   print('Claude key valid')
   "
   ```

2. **Rate Limiting Issues**
   ```bash
   # Check rate limit status in Redis
   redis-cli KEYS "rate_limit:*"
   redis-cli GET "rate_limit:claude:daily"
   
   # Clear rate limits if necessary (emergency)
   redis-cli DEL "rate_limit:claude:*"
   ```

3. **Circuit Breaker Reset**
   ```bash
   # Reset circuit breakers
   redis-cli DEL "circuit_breaker:claude"
   redis-cli DEL "circuit_breaker:perplexity"
   redis-cli DEL "circuit_breaker:openai"
   
   # Restart service to reload circuit breakers
   sudo systemctl restart lokdarpan-api
   ```

#### Issue: Poor Quality Responses

**Symptoms**:
- Quality scores consistently below 0.7
- Irrelevant or inaccurate analysis
- Missing political context

**Diagnostic**:
```python
# Check recent quality scores
from app.models import AIModelExecution
recent_executions = AIModelExecution.query.filter(
    AIModelExecution.created_at >= datetime.now() - timedelta(hours=24)
).all()

quality_scores = [e.quality_score for e in recent_executions if e.quality_score]
avg_quality = sum(quality_scores) / len(quality_scores)
print(f"Average quality: {avg_quality}")
```

**Solutions**:
1. **Improve prompt engineering**
   ```python
   # Update political analysis prompts in ai_orchestrator.py
   def _build_political_analysis_prompt(self, query, context):
       return f"""
       As a political intelligence analyst specializing in Indian electoral politics,
       analyze the following query with focus on:
       - Electoral implications and voter impact
       - Political party positioning and strategies  
       - Local constituency context for {context.get('ward', 'the region')}
       - Actionable strategic recommendations
       
       Query: {query}
       
       Provide structured analysis with confidence assessment.
       """
   ```

2. **Adjust quality thresholds**
   ```python
   # In config.py - temporarily lower thresholds while improving
   AI_QUALITY_THRESHOLD = 0.6  # Reduced from 0.8
   POLITICAL_RELEVANCE_THRESHOLD = 0.5  # Reduced from 0.7
   ```

### Local Llama Issues

#### Issue: Llama Model Not Responding

**Symptoms**:
- Llama fallback not working
- Connection refused to localhost:11434
- Slow or no responses from local model

**Diagnostic**:
```bash
# Check Ollama service
systemctl status ollama
ps aux | grep ollama

# Test direct Ollama connection
curl http://localhost:11434/api/tags

# Check available models
ollama list
```

**Solutions**:
1. **Install/Start Ollama**
   ```bash
   # Install Ollama
   curl -fsSL https://ollama.ai/install.sh | sh
   
   # Start service
   sudo systemctl start ollama
   sudo systemctl enable ollama
   
   # Pull required model
   ollama pull llama3:latest
   ```

2. **Memory and Performance Issues**
   ```bash
   # Check system resources
   free -h
   top -p $(pgrep ollama)
   
   # Reduce model size if needed
   ollama pull llama3:8b  # Smaller model variant
   ```

## Database Issues

### PostgreSQL Problems

#### Issue: Database Connection Failures

**Symptoms**:
- "Connection refused" errors
- "Database does not exist" errors
- Slow query performance

**Diagnostic**:
```bash
# Check PostgreSQL status
systemctl status postgresql
pg_isready -d lokdarpan_db

# Test connection with credentials
psql "$DATABASE_URL" -c "SELECT version();"

# Check database exists
psql -U postgres -c "\l" | grep lokdarpan
```

**Solutions**:
1. **Service Issues**
   ```bash
   # Restart PostgreSQL
   sudo systemctl restart postgresql
   
   # Check logs for errors
   sudo tail -f /var/log/postgresql/postgresql-*.log
   ```

2. **Database Creation**
   ```bash
   # Create database if missing
   sudo -u postgres createdb lokdarpan_db
   
   # Run migrations
   cd backend && flask db upgrade
   ```

3. **Permission Issues**
   ```bash
   # Fix user permissions
   sudo -u postgres psql -c "
   GRANT ALL PRIVILEGES ON DATABASE lokdarpan_db TO lokdarpan_user;
   GRANT ALL ON ALL TABLES IN SCHEMA public TO lokdarpan_user;
   "
   ```

#### Issue: pgvector Extension Problems

**Symptoms**:
- Vector similarity searches failing
- "extension pgvector does not exist" errors
- Embedding storage issues

**Diagnostic**:
```sql
-- Check pgvector installation
SELECT * FROM pg_extension WHERE extname = 'vector';

-- Test vector operations
SELECT '[1,2,3]'::vector <-> '[1,2,4]'::vector;
```

**Solutions**:
```bash
# Install pgvector
sudo apt-get install postgresql-15-pgvector

# Enable extension in database
sudo -u postgres psql lokdarpan_db -c "CREATE EXTENSION IF NOT EXISTS vector;"

# Recreate vector indexes if needed
sudo -u postgres psql lokdarpan_db -c "
REINDEX INDEX embeddings_embedding_idx;
"
```

### Database Performance Issues

#### Issue: Slow Query Performance

**Symptoms**:
- API timeouts
- Slow dashboard loading
- High database CPU usage

**Diagnostic**:
```sql
-- Find slow queries
SELECT query, mean_exec_time, total_exec_time, calls 
FROM pg_stat_statements 
ORDER BY mean_exec_time DESC 
LIMIT 10;

-- Check running queries
SELECT pid, now() - pg_stat_activity.query_start AS duration, query 
FROM pg_stat_activity 
WHERE (now() - pg_stat_activity.query_start) > interval '5 minutes';
```

**Solutions**:
1. **Add missing indexes**
   ```sql
   -- Common performance indexes
   CREATE INDEX IF NOT EXISTS idx_post_ward_created ON post(ward, created_at);
   CREATE INDEX IF NOT EXISTS idx_post_epaper_id ON post(epaper_id);
   CREATE INDEX IF NOT EXISTS idx_embeddings_ward ON embeddings(ward_context);
   ```

2. **Query optimization**
   ```sql
   -- Analyze table statistics
   ANALYZE post;
   ANALYZE embeddings;
   ANALYZE ai_model_execution;
   
   -- Update table statistics
   VACUUM ANALYZE;
   ```

## Cache and Redis Issues

### Redis Connection Problems

#### Issue: Cache Not Working

**Symptoms**:
- Repeated expensive operations
- "Connection refused" to Redis
- Cache miss rates at 100%

**Diagnostic**:
```bash
# Check Redis status
systemctl status redis-server
redis-cli ping

# Check memory usage
redis-cli info memory

# Check cache keys
redis-cli KEYS "cache:*" | head -10
```

**Solutions**:
1. **Service Issues**
   ```bash
   # Restart Redis
   sudo systemctl restart redis-server
   
   # Check configuration
   redis-cli CONFIG GET maxmemory
   redis-cli CONFIG GET maxmemory-policy
   ```

2. **Memory Issues**
   ```bash
   # Increase Redis memory limit
   redis-cli CONFIG SET maxmemory 1gb
   redis-cli CONFIG SET maxmemory-policy allkeys-lru
   
   # Clear cache if needed
   redis-cli FLUSHDB
   ```

### Cache Performance Issues

#### Issue: Low Cache Hit Rate

**Symptoms**:
- High API costs
- Slow response times
- Repeated AI model calls for similar queries

**Diagnostic**:
```bash
# Check cache statistics
redis-cli INFO stats | grep -E "keyspace_hits|keyspace_misses"

# Analyze cache keys
redis-cli --scan --pattern "analysis:*" | head -20
```

**Solutions**:
1. **Optimize cache keys**
   ```python
   # Improve cache key generation in cache_manager.py
   def _generate_cache_key(self, query: str, context: Dict) -> str:
       # Normalize query for better cache hits
       normalized_query = self._normalize_political_query(query)
       context_key = self._extract_cache_context(context)
       return f"analysis:{hash(normalized_query)}:{context_key}"
   ```

2. **Increase TTL for stable content**
   ```python
   # Adjust cache TTL based on content type
   cache_ttl = {
       'historical_analysis': 86400,  # 24 hours
       'real_time_analysis': 3600,    # 1 hour  
       'political_background': 43200   # 12 hours
   }
   ```

## Performance Issues

### Slow API Response Times

#### Issue: Request Timeouts

**Symptoms**:
- 504 Gateway Timeout errors
- Requests taking >2 minutes
- Users reporting slow performance

**Diagnostic**:
```bash
# Check API response times
curl -w "@curl-format.txt" -s -o /dev/null \
  -H "Cookie: lokdarpan_session=TOKEN" \
  "http://localhost:5000/api/v1/multimodel/status"

# Monitor system resources
top -p $(pgrep -f "lokdarpan")
iostat -x 1 5
```

**Performance Analysis**:
```python
# Add performance monitoring to analyze endpoint
import time
from functools import wraps

def monitor_performance(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        start_time = time.time()
        result = f(*args, **kwargs)
        end_time = time.time()
        
        # Log slow requests
        duration = end_time - start_time
        if duration > 30:  # More than 30 seconds
            logger.warning(f"Slow request: {f.__name__} took {duration:.2f}s")
        
        return result
    return decorated_function
```

**Solutions**:
1. **Database Query Optimization**
   ```sql
   -- Add composite indexes for common queries
   CREATE INDEX CONCURRENTLY idx_post_ward_date_sentiment 
   ON post(ward, created_at DESC, sentiment_score) 
   WHERE sentiment_score IS NOT NULL;
   ```

2. **AI Model Timeout Configuration**
   ```python
   # Adjust timeouts in ai_orchestrator.py
   self.model_timeouts = {
       "claude": 45,      # Reduced from 60
       "perplexity": 30,  # Reduced from 45
       "openai": 20,      # Reduced from 30
       "llama": 60        # Keep higher for local
   }
   ```

3. **Parallel Processing**
   ```python
   # Use asyncio.gather for parallel AI calls
   async def parallel_analysis(self, queries: List[str]):
       tasks = [self.ai_orchestrator.analyze(query) for query in queries]
       results = await asyncio.gather(*tasks, return_exceptions=True)
       return results
   ```

### High Memory Usage

#### Issue: Memory Leaks

**Symptoms**:
- Gradually increasing memory usage
- Out of memory errors
- System becomes unresponsive

**Diagnostic**:
```bash
# Monitor memory usage over time
ps aux | grep lokdarpan | awk '{print $4, $6, $11}'
free -h
cat /proc/meminfo | grep -E "MemTotal|MemFree|MemAvailable"

# Check for memory leaks
valgrind --tool=massif python app.py
```

**Solutions**:
1. **Connection Pool Management**
   ```python
   # Configure connection pools properly
   from sqlalchemy import create_engine
   
   engine = create_engine(
       DATABASE_URL,
       pool_size=10,          # Reduced from default
       max_overflow=20,       # Reduced from default
       pool_recycle=3600,     # Recycle connections hourly
       pool_pre_ping=True     # Verify connections
   )
   ```

2. **Cache Size Limits**
   ```python
   # Limit in-memory caches
   from functools import lru_cache
   
   @lru_cache(maxsize=1000)  # Limit cache size
   def expensive_operation(param):
       return result
   ```

## Network and API Issues

### External API Connectivity

#### Issue: AI Service Timeouts

**Symptoms**:
- Intermittent AI service failures
- "Connection timeout" errors
- Inconsistent response times

**Network Diagnostic**:
```bash
# Test connectivity to AI services
ping -c 4 api.anthropic.com
ping -c 4 api.perplexity.ai
ping -c 4 api.openai.com

# Test DNS resolution
nslookup api.anthropic.com
nslookup api.perplexity.ai

# Check network latency
traceroute api.anthropic.com
```

**Solutions**:
1. **Retry Logic Enhancement**
   ```python
   import asyncio
   from tenacity import retry, stop_after_attempt, wait_exponential
   
   @retry(
       stop=stop_after_attempt(3),
       wait=wait_exponential(multiplier=1, min=4, max=10)
   )
   async def call_ai_service(self, service_url, payload):
       async with httpx.AsyncClient(timeout=60.0) as client:
           response = await client.post(service_url, json=payload)
           return response.json()
   ```

2. **Connection Pooling**
   ```python
   # Use persistent connections
   import httpx
   
   class AIServiceClient:
       def __init__(self):
           self.client = httpx.AsyncClient(
               timeout=60.0,
               limits=httpx.Limits(
                   max_keepalive_connections=20,
                   max_connections=100
               )
           )
   ```

### CORS and Frontend Issues

#### Issue: CORS Errors

**Symptoms**:
- Browser console CORS errors
- Frontend unable to connect to API
- "Access-Control-Allow-Origin" errors

**Diagnostic**:
```bash
# Test CORS from browser
curl -H "Origin: http://localhost:3000" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: X-Requested-With" \
  -X OPTIONS http://localhost:5000/api/v1/multimodel/analyze
```

**Solutions**:
```python
# Update CORS configuration in app/__init__.py
from flask_cors import CORS

app = Flask(__name__)
CORS(app, 
     origins=[
         "http://localhost:3000",
         "http://localhost:5173", 
         "https://your-domain.com"
     ],
     methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
     allow_headers=["Content-Type", "Authorization"],
     supports_credentials=True
)
```

## Error Monitoring and Logging

### Centralized Error Tracking

#### Setting Up Comprehensive Logging

```python
# Enhanced logging configuration in app/__init__.py
import logging
from logging.handlers import RotatingFileHandler
import sys

def configure_logging(app):
    if not app.debug and not app.testing:
        # File logging
        file_handler = RotatingFileHandler(
            'logs/lokdarpan.log', 
            maxBytes=10240000,  # 10MB
            backupCount=10
        )
        file_handler.setFormatter(logging.Formatter(
            '%(asctime)s %(levelname)s: %(message)s '
            '[in %(pathname)s:%(lineno)d] %(request_id)s'
        ))
        file_handler.setLevel(logging.INFO)
        app.logger.addHandler(file_handler)
        
        # Error tracking
        if app.config.get('SENTRY_DSN'):
            import sentry_sdk
            from sentry_sdk.integrations.flask import FlaskIntegration
            
            sentry_sdk.init(
                dsn=app.config['SENTRY_DSN'],
                integrations=[FlaskIntegration()],
                traces_sample_rate=0.1
            )
```

#### Error Analysis Queries

```bash
# Common error analysis commands
grep -E "ERROR|CRITICAL" /var/log/lokdarpan/app.log | tail -50
grep "AI_SERVICE_ERROR" /var/log/lokdarpan/app.log | awk '{print $1, $2, $6}' | sort | uniq -c
grep "Database" /var/log/lokdarpan/app.log | grep -E "timeout|connection"
```

## Recovery Procedures

### System Recovery Checklist

#### Complete System Failure Recovery

1. **Immediate Assessment** (5 minutes)
   ```bash
   # Check all critical services
   systemctl status postgresql redis-server lokdarpan-api
   
   # Check disk space
   df -h
   
   # Check memory
   free -h
   
   # Check load
   uptime
   ```

2. **Service Recovery** (10 minutes)
   ```bash
   # Start services in dependency order
   sudo systemctl start postgresql
   sudo systemctl start redis-server
   sudo systemctl start ollama
   sudo systemctl start lokdarpan-api
   
   # Verify health
   curl http://localhost:5000/health
   ```

3. **Data Integrity Check** (5 minutes)
   ```bash
   # Database consistency
   psql "$DATABASE_URL" -c "SELECT count(*) FROM users;"
   psql "$DATABASE_URL" -c "SELECT count(*) FROM post WHERE created_at > NOW() - INTERVAL '1 day';"
   
   # Cache connectivity
   redis-cli ping
   redis-cli DBSIZE
   ```

4. **AI Services Verification** (5 minutes)
   ```bash
   # Test each AI service
   curl -H "Cookie: lokdarpan_session=TOKEN" \
     "http://localhost:5000/api/v1/multimodel/status" | jq '.models'
   ```

#### Partial Service Recovery

**Database Only Issues**:
```bash
# 1. Restart PostgreSQL
sudo systemctl restart postgresql

# 2. Check for corruption
sudo -u postgres pg_checksums -D /var/lib/postgresql/15/main

# 3. Restore from backup if needed
sudo -u postgres pg_restore -d lokdarpan_db latest_backup.dump

# 4. Update statistics
psql "$DATABASE_URL" -c "ANALYZE;"
```

**AI Services Only Issues**:
```bash
# 1. Test external connectivity
curl -f https://api.anthropic.com/v1/models

# 2. Clear circuit breakers
redis-cli DEL "circuit_breaker:*"

# 3. Restart API service
sudo systemctl restart lokdarpan-api

# 4. Monitor for recovery
tail -f /var/log/lokdarpan/app.log | grep "AI_SERVICE"
```

## Prevention and Monitoring

### Proactive Monitoring Setup

```bash
# Create monitoring script
cat > /usr/local/bin/lokdarpan-health.sh << 'EOF'
#!/bin/bash

# Health check script
HEALTH_URL="http://localhost:5000/health"
LOG_FILE="/var/log/lokdarpan/health.log"

# Function to log with timestamp
log_msg() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" >> $LOG_FILE
}

# Check API health
if curl -f "$HEALTH_URL" > /dev/null 2>&1; then
    log_msg "API: HEALTHY"
else
    log_msg "API: UNHEALTHY - attempting restart"
    systemctl restart lokdarpan-api
fi

# Check database
if pg_isready -d lokdarpan_db > /dev/null 2>&1; then
    log_msg "DATABASE: HEALTHY"
else
    log_msg "DATABASE: UNHEALTHY"
fi

# Check Redis
if redis-cli ping > /dev/null 2>&1; then
    log_msg "REDIS: HEALTHY"
else
    log_msg "REDIS: UNHEALTHY"
fi
EOF

chmod +x /usr/local/bin/lokdarpan-health.sh

# Add to crontab for regular monitoring
echo "*/5 * * * * /usr/local/bin/lokdarpan-health.sh" | crontab -
```

### Alerting Configuration

```python
# Email alerting for critical issues
import smtplib
from email.mime.text import MIMEText

def send_alert(subject, message):
    if app.config.get('ALERT_EMAIL_ENABLED'):
        msg = MIMEText(message)
        msg['Subject'] = f"LokDarpan Alert: {subject}"
        msg['From'] = app.config['ALERT_FROM_EMAIL']
        msg['To'] = app.config['ALERT_TO_EMAIL']
        
        with smtplib.SMTP('localhost') as server:
            server.send_message(msg)

# Usage in error handlers
@app.errorhandler(500)
def internal_error(error):
    send_alert("Internal Server Error", f"Error: {error}")
    return "Internal server error", 500
```

---

## Getting Additional Help

### Support Channels

1. **Emergency Support**: emergency@lokdarpan.com (24/7)
2. **Technical Issues**: tech@lokdarpan.com  
3. **Community Forum**: https://community.lokdarpan.com
4. **Documentation**: https://docs.lokdarpan.com

### Information to Collect

When reporting issues, include:
- System information (`uname -a`)
- Service status (`systemctl status lokdarpan-api`)
- Recent logs (`tail -100 /var/log/lokdarpan/app.log`)
- Error messages (complete stack traces)
- Steps to reproduce the issue
- Recent system changes

This comprehensive troubleshooting guide should help resolve most common issues. For complex problems or persistent issues, don't hesitate to contact our support team with detailed diagnostic information.