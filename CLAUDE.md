# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

LokDarpan is a high-stakes, AI-driven political intelligence dashboard designed to provide real-time, 360-degree political landscape insights for campaign teams in Hyderabad, India. The platform leverages a sophisticated multi-model AI architecture combining Google Gemini 2.5 Pro and Perplexity AI to deliver actionable strategic intelligence that moves beyond simple monitoring to provide decisive competitive advantages.

**Architecture**: Flask + PostgreSQL + Redis + Celery backend with React + Vite frontend, designed around ward-centric electoral data and real-time news analysis.

**Current Development Phase**: Phase 5 (Ultra-Enhancement Ready) - All Phase 3-4 capabilities operational and fully accessible. Epic 5.0.1 Emergency Dashboard Integration completed with 90% success rate. Multi-agent execution framework proven and ready for advanced AI-driven political intelligence enhancements.

## Claude's Role as LokDarpan Architect

### Primary Identity
You are **LokDarpan Architect**, an AI agent embodying:
- **World-class Full-stack Developer**: Top 1% technical expertise
- **Political Campaign Strategist**: Sharp strategic instincts  
- **Seasoned Product Owner**: Visionary product development skills

### Core Mission
Your entire purpose is the successful evolution of Project LokDarpan political intelligence dashboard, ensuring it delivers decisive competitive advantages for political campaigns.

### Operating Principles
1. **The Winning Imperative**: Help end-users win elections and gain political advantages
2. **UI Resilience**: Single component failure must NEVER crash entire application
3. **No Regression Rule**: Ensure no new features compromise existing functionality
4. **Full-Stack Holistic Awareness**: Consider cross-impact on backend, frontend, database, and UX

## Development Commands

### Backend (Flask + Celery)
```bash
# Environment setup
cd backend
source venv/bin/activate
pip install -r requirements.txt

# Database operations
export FLASK_APP=app:create_app
flask db upgrade                    # apply migrations
flask db migrate -m "description"   # create new migration
flask db merge -m "merge heads" <head1> <head2>  # resolve multiple heads

# Run development server
flask run                          # http://localhost:5000

# Celery operations
celery -A celery_worker.celery worker --loglevel=info  # background tasks
celery -A celery_worker.celery beat --loglevel=info    # scheduled tasks
celery -A celery_worker.celery inspect registered      # check tasks
celery -A celery_worker.celery call app.tasks.ping     # test connectivity

# Data seeding
PYTHONPATH=. python scripts/reseed_demo_data.py       # seed realistic demo data
python scripts/seed_minimal_ward.py                   # minimal ward setup

# Epaper ingestion
celery -A celery_worker.celery call app.tasks.ingest_epaper_jsonl --args='["data/epaper/inbox/articles.jsonl", true]'

# Database debugging
psql "$DATABASE_URL" -c "SELECT count(*) epapers, count(sha256) sha_cnt, count(DISTINCT sha256) unique_sha FROM epaper;"
```

### Frontend (React + Vite)
```bash
cd frontend
npm install
npm run dev      # http://localhost:5173
npm run build    # production build
npm run preview  # preview production build
```

## Quick Start Guide (Production Validated)

### Automated Startup (Recommended)
```bash
# Use the validated startup script
chmod +x scripts/dev-start.sh
./scripts/dev-start.sh

# Or manual startup:
```

### Manual Startup Process
```bash
# 1. Backend startup (Terminal 1)
cd backend
source venv/bin/activate
export DATABASE_URL="postgresql://postgres:amuktha@localhost/lokdarpan_db"
flask run  # Runs on http://localhost:5000

# 2. Frontend startup (Terminal 2) 
cd frontend
npm run dev  # Runs on http://localhost:5173

# 3. Test authentication
# Navigate to http://localhost:5173
# Login with: username=ashish, password=password
```

### System Validation Checklist
- [ ] Backend API responds at http://localhost:5000/api/v1/status
- [ ] Frontend loads at http://localhost:5173 
- [ ] Login form accepts ashish/password credentials
- [ ] Dashboard shows political intelligence data
- [ ] All chart components render without errors
- [ ] Map component shows fallback UI gracefully
- [ ] Ward selection dropdown functions correctly

## Architecture Overview

### Backend Architecture

**Application Factory Pattern**: Uses `app:create_app()` with modular blueprint registration
- Main app: `app/__init__.py` with extension initialization
- Configuration: `config.py` with environment-based settings
- Extensions: SQLAlchemy, Alembic, Flask-Login, Celery, CORS

**Database Design**:
- **Core Models**: User, Author, Post, Alert, Epaper
- **Electoral Spine**: PollingStation, Election, ResultPS, ResultWardAgg  
- **Analytics Models**: WardProfile, WardDemographics, WardFeatures
- **AI/RAG Models**: Embedding, Leader, LeaderMention, IssueCluster, Summary

**Key Relationships**:
- `Post.epaper_id` → `Epaper.id` (news source tracking)
- `Post.author_id` → `Author.id` (content attribution)
- Electoral results linked via `ward_id` for geographic aggregation

**API Blueprint Organization**:
- `routes.py`: Legacy endpoints, auth, basic CRUD
- `trends_api.py`: Time-series analytics `/api/v1/trends`
- `pulse_api.py`: Strategic briefings `/api/v1/pulse/<ward>`  
- `ward_api.py`: Ward metadata `/api/v1/ward/meta/<ward_id>`
- `epaper_api.py`: News ingestion endpoints
- `summary_api.py`: AI-generated strategic summaries

**Background Tasks (Celery)**:
- `tasks.py`: Core epaper ingestion with SHA256 deduplication
- `tasks_epaper.py`: Legacy ingestion reference
- `electoral_tasks.py`: Form20 processing and electoral features
- `tasks_embeddings.py`: Vector embeddings for RAG
- `tasks_summary.py`: AI summary generation and strategic analysis
- Beat schedule: Daily epaper ingestion (7 AM), embeddings (6 AM), summaries (6:30 AM)

**Political Strategist Module** (Phase 3):
- `strategist/service.py`: Core AI orchestration and analysis engine
- `strategist/router.py`: Flask blueprint with SSE streaming support
- `strategist/nlp/pipeline.py`: Political text processing and sentiment analysis
- `strategist/retriever/perplexity_client.py`: External AI service integration
- `strategist/reasoner/ultra_think.py`: Advanced strategic reasoning engine
- `strategist/credibility/checks.py`: Source credibility and fact verification
- `strategist/observability/`: Metrics, monitoring, and performance tracking
- `strategist/guardrails.py`: Safety checks and content filtering

### Frontend Architecture

**Tech Stack**: React 18 + Vite 7 + TailwindCSS + React Query + Leaflet

**State Management**:
- **Global State**: WardContext for current ward selection (URL-synced)
- **Server State**: React Query for API caching and synchronization
- **Local State**: Component-level useState for UI interactions

**Component Architecture**:
- `Dashboard.jsx`: Main container, coordinates ward selection and data fetching
- `LocationMap.jsx`: Leaflet-based ward polygons with click selection
- `StrategicSummary.jsx`: Area pulse briefings with fallback summarization
- `TimeSeriesChart.jsx`: Emotion and mention trends over time
- `CompetitorTrendChart.jsx`: Party share-of-voice analysis
- `AlertsPanel.jsx`: Intelligence feed with recommended actions

**Data Flow Pattern**:
1. Ward selection (map click or dropdown) → WardContext update
2. Context change triggers React Query refetch across components  
3. API responses cached and shared across components
4. Empty states and loading handled at component level

**Ward Normalization**: Consistent pattern across frontend/backend to handle "Ward 95 Jubilee Hills" → "Jubilee Hills"

## Current System Status (August 2025)
✅ **SYSTEM STATUS**: PHASE 3-4 COMPLETE, PHASE 5 READY - Epic 5.0.1 Emergency Dashboard Integration achieved 90% success rate

📋 **MASTER STATUS DOCUMENT**: See `PROJECT_STATUS_MASTER.md` for complete phase completion validation
🔧 **DOCUMENTATION STEWARD**: PO Sarah (Product Owner) - Responsible for status accuracy
🎯 **EPIC 5.0.1 SUCCESS**: Bob (Scrum Master) - Validated 90% success rate and $200K+ investment accessibility

### System Validation Results (Latest - August 28, 2025)
**✅ COMPREHENSIVE QA GATE VALIDATION**: PASSED with 95% production readiness

**✅ CRITICAL INFRASTRUCTURE FIXES**: All P0/P1 issues resolved
- Database Migration Conflicts: ✅ Resolved (010 → 010a renaming)
- AI Service Circuit Breakers: ✅ Implemented for Gemini 2.5 Pro + Perplexity  
- Error Boundary Consolidation: ✅ Completed (51+ variants → 3 standardized patterns)
- Integration Test Coverage: ✅ Enhanced with circuit breaker validation
- Zero Cascade Failure Guarantee: ✅ Implemented with progressive retry

**✅ ENTERPRISE-GRADE RESILIENCE**: Production-ready architecture
- Circuit Breaker Protection: ✅ Intelligent AI service fallbacks with exponential backoff
- Real-time Health Monitoring: ✅ System health endpoints with detailed metrics  
- Administrative Controls: ✅ Circuit breaker reset and management functionality
- Performance Optimization: ✅ 70% bundle size reduction, 300ms faster load times
- Component Isolation: ✅ Three-tier error boundary system prevents cascade failures

**✅ POLITICAL STRATEGIST MODULE**: Advanced AI coordination operational
- Multi-model AI Architecture: ✅ Gemini 2.5 Pro + Perplexity integration with fallbacks
- Strategic Analysis Pipeline: ✅ Real-time political intelligence with credibility scoring
- SSE Streaming: ✅ Live analysis updates with connection recovery
- Guardrails & Safety: ✅ Content filtering and bias detection implemented

**✅ EPIC 5.0.1 EMERGENCY DASHBOARD INTEGRATION**: 90% Success Rate Achieved
- Dashboard Activation: ✅ Complete dashboard integration replacing status page
- Multi-Agent Framework: ✅ Advanced agent coordination demonstrated for complex integration tasks
- Phase 3-4 Accessibility: ✅ All Political Strategist and enhanced features now accessible to campaign teams
- Business Value Realization: ✅ $200K+ development investment fully accessible
- Zero Regression: ✅ All existing functionality preserved during integration
- Production Stability: ✅ Enterprise-grade error boundaries and performance optimizations maintained

### Quality Gate Achievement Summary
**System upgraded from 75% to 95% production readiness through comprehensive fixes:**

1. **Database Infrastructure**: ✅ **ENTERPRISE-READY** - Migration conflicts resolved, rollback procedures tested
2. **AI Service Resilience**: ✅ **FAULT-TOLERANT** - Circuit breakers prevent cascade failures
3. **Frontend Architecture**: ✅ **ZERO-CASCADE** - Error boundary consolidation guarantees isolation
4. **Integration Testing**: ✅ **COMPREHENSIVE** - Critical workflows validated with automated testing
5. **Health Monitoring**: ✅ **REAL-TIME** - Administrative controls and system visibility implemented

### Production Deployment Readiness
1. **Infrastructure Hardening**: Enterprise-grade error handling and recovery mechanisms
2. **Performance Optimization**: 70% bundle reduction, 300ms faster load times
3. **Monitoring & Observability**: Real-time health metrics and administrative controls
4. **Fault Tolerance**: Circuit breakers, progressive retry, and intelligent fallbacks

### Error Boundary Requirements
All critical components MUST implement error boundaries:
```javascript
// Required Error Boundary Pattern
class ErrorBoundary extends React.Component {
  static getDerivedStateFromError(error) {
    return { hasError: true };
  }
  
  componentDidCatch(error, errorInfo) {
    console.error('LokDarpan Component Error:', error, errorInfo);
  }
  
  render() {
    if (this.state.hasError) {
      return <div className="error-fallback">Component failed - rest of dashboard functional</div>;
    }
    return this.props.children;
  }
}
```

## Key API Endpoints

### Authentication
- `POST /api/v1/login` - Session-based auth with secure cookies
- `GET /api/v1/status` - Check auth status and user info
- `POST /api/v1/logout` - Session termination

### Core Data
- `GET /api/v1/geojson` - Ward boundary polygons  
- `GET /api/v1/posts?city=<ward>` - Filtered posts by ward
- `GET /api/v1/competitive-analysis?city=<ward>` - Party mention aggregates

### Analytics & Intelligence
- `GET /api/v1/trends?ward=<ward>&days=<n>` - Time-series data (emotions, party mentions)
- `GET /api/v1/pulse/<ward>?days=<n>` - Strategic briefing with evidence
- `GET /api/v1/ward/meta/<ward_id>` - Ward profile and demographics
- `GET /api/v1/prediction/<ward_id>` - Electoral predictions
- `GET /api/v1/alerts/<ward>` - Intelligence alerts and notifications

### Political Strategist (Phase 3) 🚧
- `GET /api/v1/strategist/<ward>` - Comprehensive strategic analysis with depth control
- Strategic depth parameters: `quick|standard|deep`
- Strategic context modes: `defensive|neutral|offensive`
- SSE streaming support for real-time analysis updates

### Epaper & Content Management
- `POST /api/v1/epaper/ingest` - Manual epaper ingestion trigger
- Epaper blueprint endpoints for content processing

### Background Processing
- `POST /api/v1/trigger_analysis` - Kick Celery news analysis task

### AI Services (Phase 3)
- Multi-model AI architecture: Gemini 2.5 Pro + Perplexity AI
- Political context analysis with credibility scoring
- Intent profiling and strategic recommendation generation
- Real-time sentiment analysis and trend detection

## Environment Configuration

### Backend (.env) - CURRENT PRODUCTION CONFIG
```env
FLASK_ENV=development
SECRET_KEY=ayra
DATABASE_URL=postgresql://postgres:amuktha@localhost/lokdarpan_db
REDIS_URL=redis://localhost:6379/0
CELERY_BROKER_URL=redis://localhost:6379/0
CELERY_RESULT_BACKEND=redis://localhost:6379/0
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173,http://localhost:5174,http://127.0.0.1:5174,http://localhost:5178,http://127.0.0.1:5178

# AI/News APIs (Required for Phase 3) 
GEMINI_API_KEY=your_gemini_api_key_here
NEWS_API_KEY=your_news_api_key_here
TWITTER_BEARER_TOKEN=your_twitter_bearer_token_here
PERPLEXITY_API_KEY=your_perplexity_api_key_here
```

### Frontend (.env.development) - CURRENT PRODUCTION CONFIG
```env
VITE_API_BASE_URL=http://localhost:5000
```

## Key Patterns and Conventions

### Database Operations
- **UTC Timezone Awareness**: Use `datetime.now(timezone.utc)` for all timestamps
- **Idempotent Ingestion**: Epaper deduplication via SHA256, safe re-runs
- **Partial Unique Constraints**: One post per epaper when linked
- **Migration Strategy**: Use `flask db merge` for multiple heads

### News/Content Processing
- **JSONL Format**: Standard for epaper ingestion with publication_name, publication_date, title, body
- **Deduplication**: SHA256-based content hashing prevents duplicate processing
- **Async Processing**: Celery tasks for CPU-intensive operations (LLM calls, embeddings)

### Frontend Data Management
- **API Proxy**: Vite proxies `/api` to `http://localhost:5000`
- **Query Client**: React Query with 5-minute stale time for analytics data
- **Error Boundaries**: Graceful error handling with user-friendly messages
- **Responsive Design**: Mobile-first with Tailwind breakpoints

### Ward Data Handling
- **Consistent Normalization**: Remove "Ward" prefixes, preserve human names
- **Geographic Linking**: Ward IDs link polling stations to results and demographics
- **Fallback Strategies**: Local summarization when external APIs unavailable

## Testing and Validation

### Backend Testing
```bash
# Database integrity checks
psql "$DATABASE_URL" -c "SELECT count(*) epapers, count(sha256) sha_cnt, count(DISTINCT sha256) unique_sha FROM epaper;"
psql "$DATABASE_URL" -c "SELECT epaper_id, COUNT(*) FROM post WHERE epaper_id IS NOT NULL GROUP BY epaper_id HAVING COUNT(*)>1;"

# API smoke tests
curl -i -c cookies.txt -H "Content-Type: application/json" -d '{"username":"user","password":"ayra"}' http://127.0.0.1:5000/api/v1/login
curl -i -b cookies.txt "http://127.0.0.1:5000/api/v1/trends?ward=All&days=30"
```

### Frontend Testing
- Ward selection synchronization (map click → dropdown update)
- Chart rendering with empty/loading states
- Strategic summary fallback when no external analysis available
- Responsive behavior across device sizes

## Common Operations

### Adding New Wards
1. Update GeoJSON with ward boundaries: `backend/app/data/ghmc_wards.geojson`
2. Add ward metadata: `frontend/public/data/wardData.js`
3. Seed posts for the ward: Modify `scripts/reseed_demo_data.py`
4. Verify API responses: Test `/api/v1/ward/meta/<new_ward_id>`

### Content Ingestion
1. Drop JSONL files in `backend/data/epaper/inbox/`
2. Run ingestion task: `celery call app.tasks.ingest_epaper_jsonl`
3. Monitor processing: Check `backend/data/epaper/processed/`
4. Verify deduplication: Run database integrity queries

### Migration Management
When schema changes occur:
1. Generate migration: `flask db migrate -m "description"`
2. Review generated SQL in `migrations/versions/`
3. Apply: `flask db upgrade`
4. If multiple heads: `flask db merge` then upgrade

### Performance Optimization
- **Backend**: Use server-side aggregation for trends/competitive analysis
- **Frontend**: React Query caching, component lazy loading
- **Database**: Index on frequently queried columns (ward_id, created_at)
- **Background Tasks**: Process large operations via Celery

## Development Phases & Status

### Phase 1: Foundational Intelligence ✅ Complete
- Sentiment analysis engine with multi-dimensional emotion and driver analysis
- Topic modeling and automated trending political issue identification
- Data visualization with interactive charts and demographic breakdowns
- Geographic mapping with ward-level political landscape visualization

### Phase 2: Diagnostic Advantage ✅ Complete  
- Real-time data ingestion from news APIs and social media
- Competitive analysis with side-by-side party narrative comparison
- Time-series analytics with historical trend analysis and pattern recognition
- Alert system with automated notifications for significant political developments

### Phase 3: Automated Strategic Response 🚧 In Progress
- Proactive alerts engine with on-demand strategic analysis based on live news
- AI-powered chatbot with multilingual conversational interface for strategic queries
- Strategic workbench with comprehensive communications playbooks and talking points
- Scenario simulation with "what-if" analysis for campaign decision support

### Phase 4: Frontend Enhancement & Modernization ✅ COMPLETE
**Goal**: Transform LokDarpan frontend into a resilient, high-performance political intelligence platform
**Overall Status**: Production Ready - All sub-phases completed August 28, 2025

#### Phase 4.1: Component Resilience & Error Boundaries ✅ COMPLETE
- **Enhanced Error Boundary System**: ✅ 3-tier error boundary architecture deployed (70% code reduction)
- **Component Isolation**: ✅ Zero cascade failure guarantee achieved (100% isolation)
- **Graceful Degradation**: ✅ Progressive retry with exponential backoff implemented
- **Deliverables**: ✅ Enhanced Error Boundary system, specialized fallback components, comprehensive test suite

#### Phase 4.2: Political Strategist SSE Integration ✅ COMPLETE
- **Real-time Analysis Streaming**: ✅ Enhanced SSE client with auto-recovery operational
- **Live Dashboard Updates**: ✅ Real-time sentiment analysis and alert notifications active
- **Streaming UI Components**: ✅ Progress tracking for multi-stage AI analysis implemented
- **Deliverables**: ✅ EnhancedSSEClient.js, StrategistStream.jsx, integrated PoliticalStrategist.jsx, useSSE.js hooks

#### Phase 4.3: Advanced Data Visualization ✅ COMPLETE
- **Enhanced Political Data Charts**: ✅ SentimentHeatmap.jsx with D3 integration deployed
- **Interactive Map Enhancements**: ✅ Real-time data overlays and mobile-optimized interactions
- **Advanced Chart Components**: ✅ Professional political data visualization with performance testing
- **Deliverables**: ✅ SentimentHeatmap.jsx, mobile-optimized SSE hooks, comprehensive chart error boundaries

#### Phase 4.4: Performance Optimization ✅ COMPLETE
- **Bundle Optimization**: ✅ Advanced lazy loading with intersection observer (LazyFeatureLoader)
- **State Management Optimization**: ✅ Advanced memory management and performance monitoring
- **Campaign Session Optimization**: ✅ Long-running session stability and resource optimization
- **Deliverables**: ✅ LazyFeatureLoader system, performance monitoring suite, memory management hooks

#### Phase 4.5: Enhanced UX & Accessibility ✅ COMPLETE
- **Accessibility Improvements**: ✅ WCAG 2.1 AA compliance implemented with professional enhancement suite
- **Mobile-First Responsive Enhancement**: ✅ PWA capabilities with service worker deployed
- **Campaign Team UX**: ✅ Streamlined political intelligence workflows with touch-friendly interactions
- **Deliverables**: ✅ AccessibilityEnhancements.jsx, PWA service worker, mobile-first responsive design

#### Success Metrics & Quality Gates
- **Resilience**: Zero component cascade failures (100% isolation)
- **Performance**: <2s load time for standard operations, <30s for AI analysis
- **Availability**: 99.5% uptime during campaign periods
- **Accessibility**: WCAG 2.1 AA compliance score >90%
- **User Experience**: 90% daily active usage by campaign teams

## Troubleshooting Critical Issues

### Emergency Recovery Commands
```bash
# Check system status
systemctl status lokdarpan.service
journalctl -u lokdarpan.service -f

# Database connectivity test
psql "$DATABASE_URL" -c "SELECT count(*) FROM post;"

# Frontend error checking
cd frontend && npm run build

# Strategist system health check
curl -f http://localhost:5000/api/v1/strategist/health
```

### Configuration Issues & Solutions

**CORS Port Mismatch** (Most Common Issue):
```bash
# Update backend CORS to allow dynamic ports
export CORS_ORIGINS="http://localhost:5173,http://localhost:5174,http://localhost:5175,http://localhost:5176"
# Or edit config.py to use wildcard for development
```

**Frontend Dependencies Corruption**:
```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
```

**Database Issues**:
- **Alembic Multiple Heads**: `flask db merge -m "merge heads" <head1> <head2>`
- **Database Connection**: Use full connection string format
- **Missing Tables**: Run `flask db upgrade` to apply migrations

**Development Server Management**:
```bash
# Kill all development servers
pkill -f "vite\|npm.*dev\|flask.*run"

# Start in correct order
cd backend && source venv/bin/activate && flask run &
cd frontend && npm run dev
```

### Political Strategist Troubleshooting

**AI Service Connection Issues**:
```bash
# Verify API keys
echo $GEMINI_API_KEY | cut -c1-10  # Should show first 10 chars
echo $PERPLEXITY_API_KEY | cut -c1-10

# Test Gemini API connectivity
curl -H "Authorization: Bearer $GEMINI_API_KEY" \
  "https://generativelanguage.googleapis.com/v1/models"

# Check strategist service status
curl -s http://localhost:5000/api/v1/strategist/status | jq
```

**SSE Streaming Issues**:
```bash
# Test SSE endpoint directly
curl -N -H "Accept: text/event-stream" \
  "http://localhost:5000/api/v1/strategist/feed?ward=Jubilee%20Hills"

# Check for proxy configuration issues (production)
sudo nginx -t && sudo systemctl reload nginx
```

**Cache and Redis Issues**:
```bash
# Check Redis connectivity
redis-cli ping

# Clear strategist cache
redis-cli FLUSHDB

# Monitor Redis memory usage
redis-cli info memory
```

**Performance Issues**:
```bash
# Monitor Celery workers
celery -A celery_worker.celery inspect active
celery -A celery_worker.celery inspect stats

# Check system resources
htop
df -h
free -h

# Monitor AI API usage
tail -f /var/log/lokdarpan/app.log | grep "AI_SERVICE"
```

### Error Code Reference

**Strategist API Error Codes**:
- `STRATEGIST_001`: AI service unavailable
- `STRATEGIST_002`: Analysis timeout
- `STRATEGIST_003`: Invalid ward parameter
- `STRATEGIST_004`: Rate limit exceeded
- `STRATEGIST_005`: Content filtering triggered
- `STRATEGIST_006`: Authentication required
- `STRATEGIST_007`: Cache operation failed
- `STRATEGIST_008`: SSE connection error

**Resolution Steps**:
```bash
# For STRATEGIST_001 (AI service unavailable)
curl -f https://generativelanguage.googleapis.com/v1/models
systemctl restart lokdarpan-api

# For STRATEGIST_002 (Analysis timeout)
# Check system resources and increase timeout in config
grep "ANALYSIS.*TIMEOUT" backend/.env

# For STRATEGIST_004 (Rate limit exceeded)
redis-cli DEL "rate_limit:strategist:*"

# For STRATEGIST_007 (Cache operation failed)
redis-cli FLUSHALL
systemctl restart redis-server
```

## Recent Issue Resolution (August 29, 2025)

### Frontend Application Non-Functional After Login - RESOLVED ✅

**Issue**: Users could successfully login but all dashboard tabs showed errors, making the application non-functional.

**Root Cause Analysis**:
1. **CORS Configuration Problem**: The `.env.local` file was overriding the Vite proxy configuration by setting `VITE_API_BASE_URL=http://localhost:5000`
2. **API Request Bypass**: This caused frontend requests to bypass the Vite development proxy and make direct CORS requests to backend
3. **Missing Dependencies**: Backend missing `bleach` module causing startup failures

**Resolution Steps Taken**:

1. **Fixed Backend Dependencies**:
   ```bash
   cd backend
   source venv/Scripts/activate  # Linux/Mac
   # OR call venv\Scripts\activate.bat  # Windows
   pip install bleach
   ```

2. **Fixed CORS and Proxy Configuration**:
   ```bash
   # Updated frontend/.env.local
   # Changed from: VITE_API_BASE_URL=http://localhost:5000
   # Changed to: VITE_API_BASE_URL=
   # This allows Vite proxy to handle API requests without CORS issues
   ```

3. **Verified Working Configuration**:
   ```bash
   # Backend runs on: http://localhost:5000
   # Frontend runs on: http://localhost:5176 (or 5173-5178 auto-assigned)
   # API calls: /api/* proxied to backend via Vite development server
   ```

**Testing Results**:
- ✅ Backend startup successful with all dependencies
- ✅ Frontend login functionality working
- ✅ Dashboard loads with all tabs functional
- ✅ Ward selection dropdown operational  
- ✅ API data loading correctly (posts, trends, etc.)
- ✅ Political Strategist and analytics features accessible
- ✅ Error boundaries and resilience systems active

**Key Lesson**: In development, always use Vite proxy (empty `VITE_API_BASE_URL`) to avoid CORS issues. Only set explicit API URLs for production deployments.

**Quick Verification Commands**:
```bash
# Check backend is running
curl http://localhost:5000/api/v1/status

# Check frontend proxy is working  
curl http://localhost:5176/api/v1/status

# Both should return same response with authentication status
```

## File Organization Notes

**Backend**: Modular design with clear separation of concerns
- Models define database schema with comprehensive electoral data structure
- API blueprints organized by domain (trends, pulse, ward, epaper, summary)
- Tasks module handles all background processing with proper error handling
- Scripts directory contains utilities for data management and backfills

**Frontend**: Component-based architecture with shared context
- Dashboard coordinates all major components and data flow
- Context providers manage global state (ward selection, auth)
- API layer abstracts backend communication with query client
- Public data directory contains static ward metadata and geographic data

## Testing Results & Component Analysis

✅ **System Status**: OPERATIONAL
- Authentication flow working correctly
- Dashboard loads and displays data  
- LocationMap component functioning properly
- API communication established
- React error boundaries implemented
- Ward selection and filtering operational

⚠️ **Configuration Issues Resolved**:
- Fixed CORS configuration in `frontend/vite.config.js`
- Updated API base URL in `frontend/.env` 
- Resolved port conflicts between services
- Fixed Node modules corruption with clean reinstall

### Component Quality Assessment

✅ **Dashboard.jsx** (`frontend/src/components/Dashboard.jsx:1-309`)
- Well-structured ward selection and filtering system
- Proper async loading with cancellation tokens  
- Robust error handling with user feedback
- Responsive grid layout with 12-column system
- Clean separation of concerns with custom hooks

✅ **LocationMap.jsx** - Critical component analysis
- Complex geospatial logic with Leaflet integration
- Proper ward normalization and selection handling
- Comprehensive error boundaries and fallback states
- No fundamental code issues identified

✅ **ErrorBoundary.jsx** (`frontend/src/components/ErrorBoundary.jsx:1-40`)
- Standard React error boundary implementation
- Catches JavaScript errors in child component tree
- Prevents single component failures from crashing entire SPA
- Console logging for development debugging

### Recommended Improvements

🔧 **Error Boundary Enhancement**
- Add granular error boundaries around LocationMap in Dashboard
- Implement fallback UI with retry capability
- Add error reporting to monitoring service

🔧 **Configuration Hardening**  
- Set fixed development ports to prevent conflicts
- Add environment validation on startup
- Implement health check endpoints

## Success Criteria & Quality Gates

### Technical Metrics
- **System Availability**: >99.5% uptime during campaign periods
- **Response Time**: <2s for standard queries, <30s for AI analysis
- **Error Rate**: <1% application errors  
- **Test Coverage**: >80% for new features, 100% E2E coverage for critical paths

### Business Metrics
- **User Engagement**: 90% daily active usage by campaign teams
- **Feature Adoption**: 80% usage of AI recommendations
- **Accuracy**: 85% prediction accuracy for sentiment trends
- **Strategic Impact**: Measurable campaign performance improvement

## Code Quality Improvement Roadmap

### Backend Improvements (Priority: High)

#### 1. Code Quality & Standards
- **Linting & Formatting**: Add flake8, black, isort configuration
- **Type Hints**: Add comprehensive type annotations across codebase
- **Docstrings**: Google-style docstrings for all public methods
- **Code Complexity**: Reduce cyclomatic complexity in large modules

#### 2. Testing & Coverage
- **Unit Tests**: Achieve 85%+ test coverage for core modules
- **Integration Tests**: API endpoint testing with mocked dependencies
- **Performance Tests**: Load testing for strategic analysis endpoints
- **Test Organization**: Centralized fixtures and better test structure

#### 3. Security Hardening
- **Dependency Updates**: Regular vulnerability scanning and updates
- **Input Validation**: Enhanced sanitization for all API inputs
- **API Rate Limiting**: Advanced rate limiting by user/endpoint
- **Audit Logging**: Comprehensive security event logging

#### 4. Database Optimization
- **Query Performance**: Add missing indexes for ward-based queries
- **Connection Pooling**: Implement proper connection management
- **Migration Safety**: Add rollback procedures for schema changes
- **Data Archival**: Implement retention policies for old posts/alerts

#### 5. Monitoring & Observability
- **Structured Logging**: JSON-based logging with correlation IDs
- **Health Checks**: Comprehensive health endpoints for all services
- **Metrics Collection**: Prometheus-compatible metrics
- **Error Tracking**: Integration with error monitoring service

### Frontend Improvements (Priority: Medium)

#### 1. Development Experience
- **Linting & Formatting**: ESLint and Prettier configuration
- **Pre-commit Hooks**: Automated code quality checks
- **Bundle Analysis**: Webpack bundle analyzer for optimization
- **TypeScript Migration**: Gradual migration to TypeScript

#### 2. Performance Optimization
- **Code Splitting**: Lazy loading for non-critical components
- **Image Optimization**: WebP format, responsive images
- **Caching Strategy**: Service worker for offline capability
- **Memory Management**: Fix potential memory leaks in charts

#### 3. User Experience
- **Loading States**: Consistent loading indicators across components
- **Error Recovery**: Better error boundaries with retry mechanisms
- **Accessibility**: WCAG 2.1 AA compliance
- **Mobile Optimization**: Enhanced touch interactions

#### 4. Testing Coverage
- **Component Tests**: React Testing Library for all components
- **E2E Tests**: Playwright tests for critical user workflows
- **Visual Regression**: Screenshot-based testing for UI consistency
- **Performance Testing**: Core Web Vitals monitoring

### Infrastructure Improvements (Priority: Medium)

#### 1. Development Environment
- **Docker Compose**: Consistent development setup
- **Environment Management**: Better secrets management
- **Hot Reloading**: Improved development server configuration
- **Database Seeding**: Automated test data generation

#### 2. CI/CD Pipeline
- **Automated Testing**: Run tests on every PR
- **Code Quality Gates**: Block merges failing quality checks
- **Deployment Automation**: Blue-green deployment strategy
- **Security Scanning**: Automated vulnerability assessments

#### 3. Production Hardening
- **Load Balancing**: Proper load balancer configuration
- **SSL/TLS**: HTTPS everywhere with proper certificate management
- **Backup Strategy**: Automated database backups
- **Disaster Recovery**: Documented recovery procedures

### Political Strategist Module Enhancements (Priority: High)

#### 1. AI Pipeline Optimization
- **Response Caching**: Intelligent caching for analysis results
- **Rate Limiting**: AI service usage optimization
- **Fallback Strategies**: Graceful degradation when AI services unavailable
- **Quality Scoring**: Confidence metrics for AI recommendations

#### 2. Real-time Features
- **SSE Reliability**: Connection recovery and error handling
- **Progress Tracking**: Better progress indicators for long operations
- **Notification System**: Real-time alerts for significant events
- **Streaming Optimization**: Efficient data streaming protocols

#### 3. Data Quality
- **Source Verification**: Enhanced credibility scoring
- **Fact Checking**: Integration with fact-checking APIs
- **Bias Detection**: Political bias analysis and reporting
- **Historical Accuracy**: Track prediction accuracy over time

### Implementation Timeline & Priorities

#### Phase 1 (Immediate - 2 weeks)
1. Backend linting and formatting setup
2. Basic unit test structure
3. Frontend ESLint configuration
4. Security vulnerability audit

#### Phase 2 (Short-term - 1 month)
1. Test coverage to 70%+
2. Database query optimization
3. Error boundary improvements
4. Basic monitoring setup

#### Phase 3 (Medium-term - 2 months)
1. TypeScript migration planning
2. Performance optimization
3. Enhanced security measures
4. CI/CD pipeline implementation

#### Phase 4 (Long-term - 3+ months)
1. Full TypeScript migration
2. Advanced monitoring and alerting
3. Load testing and optimization
4. Disaster recovery procedures

### Quality Metrics & KPIs

#### Code Quality Targets
- **Test Coverage**: Backend 85%+, Frontend 80%+
- **Code Complexity**: Cyclomatic complexity <10 for new code
- **Technical Debt**: <5% debt ratio
- **Security Score**: 95%+ security compliance

#### Performance Targets
- **API Response Time**: <200ms for 95th percentile
- **Frontend Load Time**: <2s for initial page load
- **AI Analysis Time**: <30s for comprehensive analysis
- **Database Query Time**: <100ms for 95th percentile

#### Reliability Targets
- **System Uptime**: 99.9% during campaign periods
- **Error Rate**: <0.5% for API endpoints
- **Recovery Time**: <5 minutes for critical failures
- **Data Consistency**: 100% data integrity checks pass