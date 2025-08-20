# LokDarpan Configuration Guide

## Overview

This guide covers all configuration options for LokDarpan Phase 3, including the Political Strategist system, multi-model AI integration, and advanced security features.

## Configuration Files Structure

```
/opt/lokdarpan/
├── backend/
│   ├── .env                    # Backend environment variables
│   ├── config.py              # Flask configuration classes
│   └── strategist/
│       └── prompts.py         # AI prompt templates
├── frontend/
│   ├── .env.production        # Frontend build configuration
│   ├── .env.development       # Development configuration
│   └── vite.config.js         # Vite build configuration
└── Political-Strategist.json  # Strategist system configuration
```

## Backend Configuration

### Environment Variables (.env)

#### Core Application Settings

```env
# Flask Application
FLASK_ENV=production|development|testing
FLASK_APP=app:create_app
SECRET_KEY=<secure-random-key-min-32-chars>
DEBUG=false

# Server Configuration
HOST=0.0.0.0
PORT=5000
WORKER_PROCESSES=4
WORKER_TIMEOUT=120
```

#### Database Configuration

```env
# PostgreSQL Primary Database
DATABASE_URL=postgresql://user:password@host:port/database
DATABASE_POOL_SIZE=20
DATABASE_MAX_OVERFLOW=50
DATABASE_POOL_TIMEOUT=30
DATABASE_POOL_RECYCLE=3600

# Database Connection Options
DB_ECHO=false                    # Set to true for SQL query logging
DB_AUTOCOMMIT=false
DB_AUTOFLUSH=true
```

#### Redis Configuration

```env
# Redis for Caching and Celery
REDIS_URL=redis://localhost:6379/0
CELERY_BROKER_URL=redis://localhost:6379/0
CELERY_RESULT_BACKEND=redis://localhost:6379/1

# Cache Configuration
CACHE_TYPE=redis
CACHE_DEFAULT_TIMEOUT=300
CACHE_KEY_PREFIX=lokdarpan:
CACHE_REDIS_DB=2
```

#### Security Configuration

```env
# CORS Settings
CORS_ORIGINS=https://lokdarpan.com,https://www.lokdarpan.com
CORS_ALLOW_CREDENTIALS=true
CORS_MAX_AGE=86400

# Session Management
SESSION_COOKIE_SECURE=true
SESSION_COOKIE_HTTPONLY=true
SESSION_COOKIE_SAMESITE=Strict
SESSION_PERMANENT=false
PERMANENT_SESSION_LIFETIME=3600

# Rate Limiting
RATE_LIMIT_STORAGE_URL=redis://localhost:6379/2
DEFAULT_RATE_LIMIT=1000/hour
API_RATE_LIMIT=100/minute
STRATEGIST_RATE_LIMIT=10/minute
RATE_LIMIT_HEADERS_ENABLED=true
```

#### Political Strategist Configuration

```env
# Core Strategist Settings
STRATEGIST_ENABLED=true
STRATEGIST_MODE=production|staging|development
STRATEGIST_DEBUG=false
STRATEGIST_CACHE_TTL=300
STRATEGIST_MAX_CONCURRENT_ANALYSES=5

# AI Service Integration
GEMINI_API_KEY=<your-gemini-api-key>
GEMINI_MODEL=gemini-2.5-pro
GEMINI_TEMPERATURE=0.7
GEMINI_MAX_TOKENS=8192
GEMINI_TIMEOUT=30

PERPLEXITY_API_KEY=<your-perplexity-api-key>
PERPLEXITY_MODEL=llama-3.1-sonar-huge-128k-online
PERPLEXITY_TIMEOUT=30

# AI Rate Limiting and Safety
AI_RATE_LIMIT_PER_MINUTE=100
AI_TIMEOUT_SECONDS=30
AI_MAX_RETRIES=3
AI_RETRY_DELAY=1
AI_CONTENT_FILTER_ENABLED=true
AI_BIAS_DETECTION_ENABLED=true

# Strategist Features
STRATEGIST_ENABLE_SSE=true
STRATEGIST_ENABLE_CACHING=true
STRATEGIST_ENABLE_OBSERVABILITY=true
STRATEGIST_ENABLE_GUARDRAILS=true

# Analysis Configuration
ANALYSIS_DEPTH_QUICK_TIMEOUT=5
ANALYSIS_DEPTH_STANDARD_TIMEOUT=15
ANALYSIS_DEPTH_DEEP_TIMEOUT=30
ANALYSIS_MAX_TEXT_LENGTH=50000
ANALYSIS_MIN_CONFIDENCE_THRESHOLD=0.7
```

#### Monitoring and Observability

```env
# Metrics and Monitoring
ENABLE_METRICS=true
METRICS_PORT=8001
METRICS_PATH=/metrics
METRICS_INCLUDE_LABELS=true

# Logging Configuration
LOG_LEVEL=INFO|DEBUG|WARNING|ERROR
STRUCTURED_LOGGING=true
LOG_FORMAT=json|text
LOG_FILE_PATH=/var/log/lokdarpan/app.log
LOG_MAX_SIZE=100MB
LOG_BACKUP_COUNT=10

# Performance Monitoring
ENABLE_PROFILING=false
PROFILING_SAMPLE_RATE=0.1
APM_SERVICE_NAME=lokdarpan-api
APM_ENVIRONMENT=production
```

#### Content Processing

```env
# Epaper and Content Ingestion
EPAPER_INBOX_PATH=data/epaper/inbox
EPAPER_PROCESSED_PATH=data/epaper/processed
EPAPER_MAX_FILE_SIZE=50MB
EPAPER_ALLOWED_FORMATS=jsonl,json
CONTENT_DEDUPLICATION_ENABLED=true
CONTENT_SHA256_VERIFICATION=true

# NLP and Text Processing
NLP_LANGUAGE_DEFAULT=en
NLP_SENTIMENT_MODEL=default
NLP_ENTITY_EXTRACTION_ENABLED=true
NLP_TOPIC_MODELING_ENABLED=true
TEXT_PREPROCESSING_ENABLED=true
```

#### External Integrations

```env
# News APIs (Optional)
NEWS_API_KEY=<your-news-api-key>
NEWS_API_SOURCES=times-of-india,the-hindu,indian-express
NEWS_API_LANGUAGE=en
NEWS_API_COUNTRY=in

# Social Media APIs (Optional)
TWITTER_BEARER_TOKEN=<your-twitter-bearer-token>
TWITTER_API_V2_ENABLED=false

# Webhook Configuration
WEBHOOK_SECRET=<webhook-secret-key>
WEBHOOK_TIMEOUT=10
WEBHOOK_RETRY_COUNT=3
```

### Flask Configuration Classes (config.py)

```python
import os
from datetime import timedelta

class Config:
    """Base configuration"""
    SECRET_KEY = os.environ.get('SECRET_KEY')
    
    # Database
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL')
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = {
        'pool_size': int(os.environ.get('DATABASE_POOL_SIZE', 20)),
        'pool_timeout': int(os.environ.get('DATABASE_POOL_TIMEOUT', 30)),
        'pool_recycle': int(os.environ.get('DATABASE_POOL_RECYCLE', 3600)),
        'max_overflow': int(os.environ.get('DATABASE_MAX_OVERFLOW', 50)),
    }
    
    # Redis
    REDIS_URL = os.environ.get('REDIS_URL')
    
    # Celery
    CELERY_BROKER_URL = os.environ.get('CELERY_BROKER_URL')
    CELERY_RESULT_BACKEND = os.environ.get('CELERY_RESULT_BACKEND')
    
    # Security
    CORS_ORIGINS = os.environ.get('CORS_ORIGINS', '').split(',')
    SESSION_COOKIE_SECURE = os.environ.get('SESSION_COOKIE_SECURE', 'true').lower() == 'true'
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = 'Strict'
    PERMANENT_SESSION_LIFETIME = timedelta(
        seconds=int(os.environ.get('PERMANENT_SESSION_LIFETIME', 3600))
    )
    
    # Strategist Configuration
    STRATEGIST_ENABLED = os.environ.get('STRATEGIST_ENABLED', 'true').lower() == 'true'
    STRATEGIST_MODE = os.environ.get('STRATEGIST_MODE', 'production')
    
    # AI Configuration
    GEMINI_API_KEY = os.environ.get('GEMINI_API_KEY')
    PERPLEXITY_API_KEY = os.environ.get('PERPLEXITY_API_KEY')
    
    # Rate Limiting
    RATELIMIT_STORAGE_URL = os.environ.get('RATE_LIMIT_STORAGE_URL')

class DevelopmentConfig(Config):
    """Development configuration"""
    DEBUG = True
    SQLALCHEMY_ECHO = True
    STRATEGIST_DEBUG = True
    LOG_LEVEL = 'DEBUG'

class ProductionConfig(Config):
    """Production configuration"""
    DEBUG = False
    SQLALCHEMY_ECHO = False
    LOG_LEVEL = 'INFO'
    
class TestingConfig(Config):
    """Testing configuration"""
    TESTING = True
    SQLALCHEMY_DATABASE_URI = 'sqlite:///:memory:'
    WTF_CSRF_ENABLED = False
    STRATEGIST_ENABLED = False
```

## Frontend Configuration

### Environment Variables

#### Production (.env.production)

```env
# API Configuration
VITE_API_BASE_URL=https://api.lokdarpan.com
VITE_SSE_ENDPOINT=https://api.lokdarpan.com/api/v1/strategist/feed
VITE_API_TIMEOUT=30000

# Application Information
VITE_APP_NAME=LokDarpan
VITE_APP_VERSION=3.0.0
VITE_APP_DESCRIPTION=Political Intelligence Dashboard

# Feature Flags
VITE_STRATEGIST_ENABLED=true
VITE_ENABLE_ANALYTICS=true
VITE_ENABLE_ERROR_REPORTING=true
VITE_ENABLE_PERFORMANCE_MONITORING=true

# Authentication
VITE_AUTH_TIMEOUT=3600000
VITE_SESSION_CHECK_INTERVAL=300000

# UI Configuration
VITE_THEME_DEFAULT=light
VITE_LANGUAGE_DEFAULT=en
VITE_TIMEZONE_DEFAULT=Asia/Kolkata

# Map Configuration
VITE_MAP_DEFAULT_CENTER_LAT=17.3850
VITE_MAP_DEFAULT_CENTER_LNG=78.4867
VITE_MAP_DEFAULT_ZOOM=11
VITE_MAP_MAX_ZOOM=18

# Performance
VITE_ENABLE_SW=true
VITE_CHUNK_SIZE_WARNING_LIMIT=1000
```

#### Development (.env.development)

```env
# API Configuration
VITE_API_BASE_URL=http://localhost:5000
VITE_SSE_ENDPOINT=http://localhost:5000/api/v1/strategist/feed
VITE_API_TIMEOUT=30000

# Development Features
VITE_ENABLE_DEVTOOLS=true
VITE_ENABLE_HOT_RELOAD=true
VITE_ENABLE_DEBUG_LOGS=true

# Feature Flags
VITE_STRATEGIST_ENABLED=true
VITE_ENABLE_ANALYTICS=false
VITE_ENABLE_ERROR_REPORTING=false

# Mock Data
VITE_USE_MOCK_DATA=false
VITE_MOCK_DELAY=500
```

### Vite Configuration (vite.config.js)

```javascript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig(({ command, mode }) => {
  const isDevelopment = mode === 'development'
  
  return {
    plugins: [react()],
    
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src'),
        '@components': resolve(__dirname, 'src/components'),
        '@features': resolve(__dirname, 'src/features'),
        '@lib': resolve(__dirname, 'src/lib'),
        '@hooks': resolve(__dirname, 'src/hooks'),
        '@utils': resolve(__dirname, 'src/utils')
      }
    },
    
    server: {
      port: 5173,
      host: true,
      proxy: {
        '/api': {
          target: 'http://localhost:5000',
          changeOrigin: true,
          timeout: 30000
        }
      }
    },
    
    build: {
      outDir: 'dist',
      sourcemap: isDevelopment,
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom'],
            strategist: ['./src/features/strategist'],
            charts: ['chart.js', 'react-chartjs-2'],
            map: ['leaflet', 'react-leaflet']
          }
        }
      },
      chunkSizeWarningLimit: 1000
    },
    
    define: {
      __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
      __VERSION__: JSON.stringify(process.env.npm_package_version)
    }
  }
})
```

## Political Strategist Configuration

### Strategist System Configuration (Political-Strategist.json)

```json
{
  "system": {
    "name": "LokDarpan Political Strategist",
    "version": "3.0.0",
    "mode": "production",
    "debug": false
  },
  
  "ai_models": {
    "primary": {
      "provider": "google",
      "model": "gemini-2.5-pro",
      "temperature": 0.7,
      "max_tokens": 8192,
      "timeout": 30,
      "retry_count": 3
    },
    "secondary": {
      "provider": "perplexity",
      "model": "llama-3.1-sonar-huge-128k-online",
      "temperature": 0.6,
      "timeout": 30,
      "retry_count": 2
    }
  },
  
  "analysis_settings": {
    "depth_levels": {
      "quick": {
        "timeout": 5,
        "tokens": 2048,
        "complexity": "low"
      },
      "standard": {
        "timeout": 15,
        "tokens": 4096,
        "complexity": "medium"
      },
      "deep": {
        "timeout": 30,
        "tokens": 8192,
        "complexity": "high"
      }
    },
    
    "context_modes": {
      "defensive": {
        "focus": "threat_identification",
        "tone": "cautious",
        "priority": "risk_mitigation"
      },
      "neutral": {
        "focus": "balanced_analysis",
        "tone": "objective",
        "priority": "comprehensive_insight"
      },
      "offensive": {
        "focus": "opportunity_identification",
        "tone": "assertive",
        "priority": "strategic_advantage"
      }
    }
  },
  
  "content_filtering": {
    "enabled": true,
    "bias_detection": true,
    "fact_checking": true,
    "inappropriate_content": true,
    "confidence_threshold": 0.7
  },
  
  "cache_settings": {
    "enabled": true,
    "ttl": 300,
    "max_size": "1GB",
    "compression": true
  },
  
  "rate_limiting": {
    "enabled": true,
    "requests_per_minute": 10,
    "burst_allowance": 5,
    "per_user": true
  },
  
  "observability": {
    "enabled": true,
    "metrics_collection": true,
    "performance_monitoring": true,
    "error_tracking": true,
    "custom_dashboards": true
  }
}
```

## Celery Configuration

### Worker Configuration

```python
# celery_worker.py
from celery import Celery
from celery.schedules import crontab

def make_celery(app):
    celery = Celery(
        app.import_name,
        backend=app.config['CELERY_RESULT_BACKEND'],
        broker=app.config['CELERY_BROKER_URL']
    )
    
    celery.conf.update(
        task_serializer='json',
        accept_content=['json'],
        result_serializer='json',
        timezone='Asia/Kolkata',
        enable_utc=True,
        
        # Worker Configuration
        worker_concurrency=4,
        worker_max_tasks_per_child=1000,
        worker_disable_rate_limits=False,
        
        # Task Configuration
        task_soft_time_limit=300,
        task_time_limit=600,
        task_acks_late=True,
        task_reject_on_worker_lost=True,
        
        # Result Backend
        result_expires=3600,
        result_backend_transport_options={
            'retry_policy': {
                'timeout': 5.0
            }
        },
        
        # Beat Schedule
        beat_schedule={
            'daily-epaper-ingestion': {
                'task': 'app.tasks.ingest_epaper_dir',
                'schedule': crontab(hour=7, minute=0),
                'args': ('data/epaper/inbox', True)
            },
            'daily-embeddings-generation': {
                'task': 'app.tasks_embeddings.generate_daily_embeddings',
                'schedule': crontab(hour=6, minute=0)
            },
            'daily-summary-generation': {
                'task': 'app.tasks_summary.generate_daily_summaries',
                'schedule': crontab(hour=6, minute=30)
            },
            'strategist-cache-cleanup': {
                'task': 'strategist.cache.cleanup_expired_cache',
                'schedule': crontab(hour=2, minute=0)
            }
        }
    )
    
    return celery
```

## Security Configuration

### Security Headers and Policies

```python
# Security configuration in Flask app
SECURITY_HEADERS = {
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Content-Security-Policy': (
        "default-src 'self'; "
        "script-src 'self' 'unsafe-inline'; "
        "style-src 'self' 'unsafe-inline'; "
        "img-src 'self' data: https:; "
        "connect-src 'self' wss: https:; "
        "font-src 'self'"
    )
}
```

### Input Validation Rules

```python
# Input validation configuration
VALIDATION_RULES = {
    'ward_name': {
        'max_length': 100,
        'pattern': r'^[a-zA-Z0-9\s\-_]+$',
        'required': True
    },
    'analysis_depth': {
        'allowed_values': ['quick', 'standard', 'deep'],
        'default': 'standard'
    },
    'analysis_context': {
        'allowed_values': ['defensive', 'neutral', 'offensive'],
        'default': 'neutral'
    },
    'text_content': {
        'max_length': 50000,
        'min_length': 10,
        'sanitize': True
    }
}
```

## Configuration Validation

### Startup Validation Script

```python
# config_validator.py
import os
import sys
from urllib.parse import urlparse

def validate_configuration():
    """Validate all required configuration before startup"""
    errors = []
    
    # Required environment variables
    required_vars = [
        'SECRET_KEY',
        'DATABASE_URL',
        'REDIS_URL',
        'GEMINI_API_KEY'
    ]
    
    for var in required_vars:
        if not os.environ.get(var):
            errors.append(f"Missing required environment variable: {var}")
    
    # Validate database URL
    db_url = os.environ.get('DATABASE_URL')
    if db_url:
        parsed = urlparse(db_url)
        if parsed.scheme != 'postgresql':
            errors.append("DATABASE_URL must use postgresql://")
    
    # Validate Redis URL
    redis_url = os.environ.get('REDIS_URL')
    if redis_url:
        parsed = urlparse(redis_url)
        if parsed.scheme != 'redis':
            errors.append("REDIS_URL must use redis://")
    
    # Validate strategist configuration
    if os.environ.get('STRATEGIST_ENABLED', 'true').lower() == 'true':
        ai_keys = ['GEMINI_API_KEY', 'PERPLEXITY_API_KEY']
        for key in ai_keys:
            if not os.environ.get(key):
                errors.append(f"Strategist enabled but missing: {key}")
    
    if errors:
        print("Configuration validation failed:")
        for error in errors:
            print(f"  - {error}")
        sys.exit(1)
    
    print("Configuration validation passed")

if __name__ == '__main__':
    validate_configuration()
```

## Performance Tuning

### Database Connection Pooling

```python
# Enhanced database configuration
SQLALCHEMY_ENGINE_OPTIONS = {
    'pool_size': 20,                    # Number of connections to maintain
    'pool_timeout': 30,                 # Timeout for getting connection
    'pool_recycle': 3600,              # Recycle connections after 1 hour
    'max_overflow': 50,                 # Additional connections allowed
    'pool_pre_ping': True,             # Validate connections before use
    'connect_args': {
        'connect_timeout': 10,
        'application_name': 'lokdarpan'
    }
}
```

### Redis Performance Configuration

```python
# Redis configuration for performance
REDIS_CONFIG = {
    'connection_pool_kwargs': {
        'max_connections': 50,
        'retry_on_timeout': True,
        'socket_timeout': 5,
        'socket_connect_timeout': 5
    },
    'decode_responses': True,
    'health_check_interval': 30
}
```

## Monitoring Configuration

### Application Metrics

```python
# Prometheus metrics configuration
METRICS_CONFIG = {
    'enabled': True,
    'path': '/metrics',
    'include_labels': True,
    'custom_metrics': [
        'strategist_requests_total',
        'strategist_response_time_seconds',
        'ai_service_calls_total',
        'cache_hit_rate'
    ]
}
```

### Logging Configuration

```python
# Structured logging configuration
LOGGING_CONFIG = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'json': {
            'class': 'pythonjsonlogger.jsonlogger.JsonFormatter',
            'format': '%(asctime)s %(name)s %(levelname)s %(message)s'
        }
    },
    'handlers': {
        'file': {
            'class': 'logging.handlers.RotatingFileHandler',
            'filename': '/var/log/lokdarpan/app.log',
            'maxBytes': 100 * 1024 * 1024,  # 100MB
            'backupCount': 10,
            'formatter': 'json'
        }
    },
    'root': {
        'level': 'INFO',
        'handlers': ['file']
    }
}
```

---

## Configuration Checklist

### Development Setup
- [ ] Backend .env file created with all required variables
- [ ] Frontend .env.development configured
- [ ] Database connection tested
- [ ] Redis connection verified
- [ ] AI API keys configured and tested
- [ ] All services starting without errors

### Production Deployment
- [ ] All environment variables securely configured
- [ ] SSL certificates installed and configured
- [ ] Security headers implemented
- [ ] Rate limiting configured
- [ ] Monitoring and logging enabled
- [ ] Backup procedures configured
- [ ] Performance tuning applied
- [ ] Configuration validation passing

### Security Review
- [ ] API keys stored securely
- [ ] Database credentials secured
- [ ] CORS origins restricted to production domains
- [ ] Rate limiting enabled on all endpoints
- [ ] Input validation implemented
- [ ] Security headers configured
- [ ] Audit logging enabled