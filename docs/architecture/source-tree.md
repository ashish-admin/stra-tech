# LokDarpan Source Tree Documentation

## Project Structure Overview

```
LokDarpan/
├── backend/                 # Flask API server
├── frontend/               # React application  
├── docs/                   # Documentation
├── .ai/                    # AI development logs
├── .bmad-core/            # BMad agent configuration
├── scripts/               # Utility scripts
└── [config files]         # Root configuration files
```

## Backend Directory Structure

```
backend/
├── app/                    # Main application package
│   ├── __init__.py        # Application factory
│   ├── models.py          # Database models
│   ├── routes.py          # Core API routes
│   ├── auth.py           # Authentication logic
│   ├── config.py         # Configuration classes
│   ├── extensions.py     # Flask extensions
│   ├── utils.py          # Utility functions
│   │
│   ├── api/              # API blueprints
│   │   ├── __init__.py
│   │   ├── trends_api.py      # Time-series analytics
│   │   ├── pulse_api.py       # Strategic briefings
│   │   ├── ward_api.py        # Ward metadata
│   │   ├── epaper_api.py      # News ingestion
│   │   └── summary_api.py     # AI summaries
│   │
│   ├── strategist/           # Political Strategist module (Phase 3)
│   │   ├── __init__.py
│   │   ├── service.py        # Core AI orchestration
│   │   ├── router.py         # Flask blueprint + SSE
│   │   ├── guardrails.py     # Safety checks
│   │   │
│   │   ├── nlp/             # Natural language processing
│   │   │   ├── __init__.py
│   │   │   └── pipeline.py   # Political text processing
│   │   │
│   │   ├── retriever/       # External AI services
│   │   │   ├── __init__.py
│   │   │   └── perplexity_client.py
│   │   │
│   │   ├── reasoner/        # Strategic reasoning
│   │   │   ├── __init__.py
│   │   │   └── ultra_think.py
│   │   │
│   │   ├── credibility/     # Source verification
│   │   │   ├── __init__.py
│   │   │   └── checks.py
│   │   │
│   │   └── observability/   # Monitoring
│   │       ├── __init__.py
│   │       ├── metrics.py
│   │       └── monitoring.py
│   │
│   ├── tasks.py              # Celery background tasks
│   ├── tasks_epaper.py       # Epaper ingestion tasks
│   ├── tasks_embeddings.py   # Vector embedding tasks
│   ├── tasks_summary.py      # AI summary tasks
│   └── electoral_tasks.py    # Electoral data processing
│
├── migrations/              # Alembic database migrations
│   ├── versions/
│   ├── alembic.ini
│   ├── env.py
│   └── script.py.mako
│
├── data/                   # Data files and processing
│   ├── epaper/
│   │   ├── inbox/         # Incoming news files
│   │   └── processed/     # Processed news files
│   └── geojson/           # Geographic boundary data
│
├── scripts/               # Utility scripts
│   ├── reseed_demo_data.py    # Demo data generation
│   ├── seed_minimal_ward.py   # Minimal setup
│   └── backup_db.py           # Database backup
│
├── tests/                 # Test suite
│   ├── __init__.py
│   ├── test_models.py
│   ├── test_routes.py
│   ├── test_strategist.py
│   └── conftest.py        # Test configuration
│
├── requirements.txt       # Python dependencies
├── celery_worker.py      # Celery worker configuration
├── wsgi.py              # WSGI entry point
└── config.py            # Application configuration
```

## Frontend Directory Structure

```
frontend/
├── src/                   # Source code
│   ├── components/        # React components
│   │   ├── Dashboard.jsx      # Main dashboard (Epic 5.0.1 enhanced)
│   │   ├── LocationMap.jsx    # Leaflet map component
│   │   ├── StrategicSummary.jsx   # AI briefings
│   │   ├── TimeSeriesChart.jsx    # Analytics charts
│   │   ├── CompetitorTrendChart.jsx  # Competitor analysis
│   │   ├── AlertsPanel.jsx        # Intelligence alerts
│   │   ├── AuthWrapper.jsx        # Authentication
│   │   ├── ErrorBoundary.jsx      # Error handling (3-tier system)
│   │   ├── PWAInstallPrompt.jsx   # PWA installation
│   │   ├── OfflineIndicator.jsx   # Offline status
│   │   └── ui/                    # Reusable UI components
│   │       ├── Button.jsx
│   │       ├── Card.jsx
│   │       ├── LoadingSpinner.jsx
│   │       └── Modal.jsx
│   │
│   ├── shared/            # Shared components (Epic 5.0.1)
│   │   ├── components/
│   │   │   ├── lazy/      # Lazy loading system
│   │   │   │   └── LazyFeatureLoader.jsx  # Advanced lazy loading
│   │   │   ├── ui/        # Enhanced UI components
│   │   │   │   ├── EnhancedCard.jsx
│   │   │   │   ├── LoadingSkeleton.jsx
│   │   │   │   └── ErrorBoundary.jsx
│   │   │   └── charts/    # Advanced chart components
│   │   │       └── StrategicTimeline.jsx
│   │   ├── hooks/         # Shared hooks
│   │   │   ├── performance/
│   │   │   │   └── useLazyLoading.js
│   │   │   └── api/
│   │   │       └── useEnhancedSSE.js
│   │   └── services/      # Shared services
│   │       ├── api/
│   │       │   └── client.js
│   │       └── sse_client.js
│   │
│   ├── features/          # Feature-based organization (Epic 5.0.1)
│   │   ├── analytics/     # Analytics features
│   │   │   └── components/
│   │   │       ├── SentimentHeatmap.jsx  # D3 visualization
│   │   │       ├── CompetitorTrendChart.jsx
│   │   │       └── TimeSeriesChart.jsx
│   │   ├── strategist/    # Political Strategist features
│   │   │   ├── components/
│   │   │   │   ├── PoliticalStrategist.jsx
│   │   │   │   └── StrategistStream.jsx
│   │   │   ├── hooks/
│   │   │   │   └── useEnhancedSSE.js
│   │   │   └── services/
│   │   │       └── enhancedSSEClient.js
│   │   └── geographic/    # Geographic features
│   │       └── components/
│   │           └── LocationMap.jsx
│   │
│   ├── contexts/          # React contexts
│   │   ├── WardContext.jsx    # Ward selection state
│   │   └── AuthContext.jsx    # Authentication state
│   │
│   ├── hooks/             # Custom React hooks
│   │   ├── useApi.js          # API interaction
│   │   ├── useAuth.js         # Authentication
│   │   ├── useWard.js         # Ward selection
│   │   └── useSSE.js          # Server-sent events
│   │
│   ├── services/          # API and external services
│   │   ├── api.js             # Main API client
│   │   ├── auth.js            # Authentication service
│   │   ├── strategist.js      # Political strategist API
│   │   └── websocket.js       # WebSocket/SSE client
│   │
│   ├── utils/             # Utility functions
│   │   ├── constants.js       # Application constants
│   │   ├── formatters.js      # Data formatting
│   │   ├── validators.js      # Input validation
│   │   └── helpers.js         # General helpers
│   │
│   ├── styles/            # CSS and styling
│   │   ├── globals.css        # Global styles
│   │   ├── components.css     # Component styles
│   │   └── tailwind.css       # Tailwind imports
│   │
│   ├── App.jsx            # Root application component
│   ├── main.jsx          # Application entry point
│   └── index.html        # HTML template
│
├── public/               # Static assets
│   ├── data/            # Static data files
│   │   └── wardData.js      # Ward metadata
│   ├── images/          # Image assets
│   ├── icons/           # Icon files
│   └── favicon.ico
│
├── dist/                # Build output (generated)
├── node_modules/        # Dependencies (generated)
├── package.json         # npm configuration
├── package-lock.json    # Dependency lock file
├── vite.config.js      # Vite configuration
├── tailwind.config.js  # Tailwind configuration
├── postcss.config.js   # PostCSS configuration
└── .eslintrc.js        # ESLint configuration
```

## Documentation Structure

```
docs/
├── architecture/          # Architecture documentation
│   ├── coding-standards.md    # Development standards
│   ├── tech-stack.md          # Technology choices
│   └── source-tree.md         # This file
│
├── stories/              # Development stories
│   ├── README.md
│   ├── epic-*.md            # Epic stories
│   ├── story-*.md           # Individual stories
│   └── 5.0.1-app-jsx-dashboard-integration-emergency.md  # Epic 5.0.1 (COMPLETE)
│
├── api/                  # API documentation
│   ├── README.md
│   ├── interactive-examples.md
│   ├── multimodel-api.md
│   └── openapi.yaml
│
├── technical/            # Technical specifications
│   ├── multi-model-ai-architecture.md
│   ├── regional-political-context-requirements.md
│   └── troubleshooting.md
│
├── user_guides/          # User documentation
│   ├── README.md
│   └── quickstart.md
│
├── prd.md               # Product requirements
├── technical-architecture.md  # System architecture
├── implementation-roadmap.md  # Development roadmap
└── [other docs]         # Additional documentation
```

## Configuration Files Structure

### Root Level Configuration
```
LokDarpan/
├── .env                    # Environment variables (local)
├── .env.example           # Environment template
├── .gitignore            # Git ignore rules
├── README.md             # Project overview
├── CLAUDE.md             # Claude AI instructions
├── requirements.txt      # Python dependencies (if any)
├── docker-compose.yml    # Docker services (if used)
└── Makefile             # Build automation (if used)
```

### Backend Configuration
```
backend/
├── .env                  # Backend environment variables
├── config.py            # Flask configuration classes
├── wsgi.py             # WSGI application entry
├── celery_worker.py    # Celery worker configuration
└── requirements.txt    # Python package dependencies
```

### Frontend Configuration
```
frontend/
├── .env                    # Frontend environment variables
├── .env.local             # Local development overrides
├── package.json           # Node.js dependencies and scripts
├── vite.config.js        # Vite build configuration
├── tailwind.config.js    # Tailwind CSS configuration
├── postcss.config.js     # PostCSS configuration
└── .eslintrc.js          # ESLint linting rules
```

## Key File Responsibilities

### Backend Key Files
- **`app/__init__.py`**: Application factory, extension initialization
- **`app/models.py`**: SQLAlchemy database models
- **`app/routes.py`**: Core API endpoints
- **`app/strategist/service.py`**: AI orchestration engine
- **`migrations/`**: Database schema evolution
- **`celery_worker.py`**: Background task processing

### Frontend Key Files
- **`src/App.jsx`**: Root component, routing, global providers
- **`src/components/Dashboard.jsx`**: Main application interface
- **`src/contexts/WardContext.jsx`**: Global ward selection state
- **`src/services/api.js`**: Centralized API communication
- **`vite.config.js`**: Build configuration and proxy settings

### Configuration Key Files
- **`backend/.env`**: Database URLs, API keys, feature flags
- **`frontend/.env`**: API endpoints, feature toggles
- **`docs/prd.md`**: Product requirements and specifications
- **`CLAUDE.md`**: AI development assistant instructions

## Development Workflow Integration

### Code Organization Principles
1. **Separation of Concerns**: Clear boundaries between data, business logic, and presentation
2. **Modular Architecture**: Independent, reusable components and services
3. **Configuration Management**: Environment-based configuration with sensible defaults
4. **Error Handling**: Comprehensive error boundaries and logging throughout the stack

### Testing Structure
- **Backend Tests**: `backend/tests/` with model, route, and integration tests
- **Frontend Tests**: Adjacent to components with `.test.jsx` suffix
- **E2E Tests**: `tests/e2e/` for full user workflow testing
- **API Tests**: `tests/api/` for endpoint validation

### Build and Deployment
- **Development**: Local development servers with hot reload
- **Staging**: Docker-based deployment with environment parity
- **Production**: Optimized builds with asset compression and caching
- **CI/CD**: Automated testing, linting, and deployment pipelines

This source tree structure supports the LokDarpan political intelligence platform's requirement for scalable, maintainable, and feature-rich development while maintaining clear separation of concerns and enabling efficient team collaboration.