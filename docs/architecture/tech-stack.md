# LokDarpan Technical Stack

## Architecture Overview

LokDarpan is a full-stack political intelligence dashboard built with a modern, scalable architecture designed for real-time data processing and AI-powered analysis.

## Backend Stack

### Core Framework
- **Flask 2.3+**: Lightweight Python web framework
- **Gunicorn**: WSGI HTTP server for production
- **PostgreSQL 14+**: Primary relational database
- **Redis 6+**: Caching and session storage
- **Celery**: Distributed task queue for background processing

### Database & ORM
```python
# Database Configuration
DATABASE_URL = "postgresql://user:pass@localhost/lokdarpan_db"
SQLALCHEMY_DATABASE_URI = DATABASE_URL
SQLALCHEMY_TRACK_MODIFICATIONS = False
```

- **SQLAlchemy**: ORM with Flask-SQLAlchemy integration
- **Alembic**: Database migration management
- **psycopg2**: PostgreSQL adapter
- **Connection Pooling**: Built-in SQLAlchemy pooling

### AI & Machine Learning
- **Google Gemini 2.5 Pro**: Primary LLM for strategic analysis
- **Perplexity AI**: Secondary AI service for real-time insights
- **OpenAI**: Backup AI service (optional)
- **Sentence Transformers**: Text embeddings for semantic search
- **NLTK/spaCy**: Natural language processing

### Background Processing
```python
# Celery Configuration
CELERY_BROKER_URL = "redis://localhost:6379/0"
CELERY_RESULT_BACKEND = "redis://localhost:6379/0"
CELERY_TASK_SERIALIZER = "json"
```

- **Redis**: Message broker and result backend
- **Celery Beat**: Scheduled task execution
- **Task Types**: News ingestion, AI analysis, data processing

### API & Middleware
- **Flask-RESTX**: API documentation and validation
- **Flask-CORS**: Cross-origin resource sharing
- **Flask-Login**: Session management
- **Rate Limiting**: Custom rate limiting middleware

## Frontend Stack

### Core Framework
- **React 18**: Component-based UI library
- **Vite**: Modern build tool and dev server
- **JavaScript/JSX**: Primary development language
- **Node.js 18+**: JavaScript runtime

### UI & Styling
```json
{
  "dependencies": {
    "react": "^18.0.0",
    "react-dom": "^18.0.0",
    "tailwindcss": "^3.0.0",
    "headlessui/react": "^1.7.0"
  }
}
```

- **Tailwind CSS**: Utility-first CSS framework
- **Headless UI**: Unstyled accessible components
- **Lucide React**: Icon library
- **CSS Grid/Flexbox**: Layout systems

### State Management
- **React Query (TanStack Query)**: Server state management
- **React Context**: Global application state
- **useState/useEffect**: Local component state
- **Custom Hooks**: Reusable state logic

### Data Visualization
- **Leaflet**: Interactive mapping library
- **React-Leaflet**: React bindings for Leaflet
- **Recharts**: Charting library for analytics
- **D3.js**: Custom data visualizations (when needed)

### Development Tools
```json
{
  "devDependencies": {
    "@vitejs/plugin-react": "^4.0.0",
    "eslint": "^8.45.0",
    "prettier": "^3.0.0",
    "autoprefixer": "^10.4.0"
  }
}
```

## Data Layer

### Database Schema
```sql
-- Core entities
CREATE TABLE users (id, username, password_hash, created_at);
CREATE TABLE wards (id, name, geometry, demographics);
CREATE TABLE posts (id, title, content, ward_id, created_at);
CREATE TABLE alerts (id, type, message, ward_id, created_at);

-- Electoral data
CREATE TABLE polling_stations (id, ward_id, name, address);
CREATE TABLE election_results (id, ward_id, party, votes, percentage);

-- AI-generated content
CREATE TABLE summaries (id, ward_id, content, confidence_score);
CREATE TABLE embeddings (id, post_id, vector, model_type);
```

### Caching Strategy
- **Redis**: API response caching, session storage
- **Query-level**: Database query result caching
- **Application-level**: AI analysis result caching
- **CDN**: Static asset caching (production)

## Infrastructure & DevOps

### Development Environment
```bash
# Backend setup
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
flask run

# Frontend setup
cd frontend
npm install
npm run dev
```

### Production Deployment
- **Docker**: Containerization for consistency
- **Nginx**: Reverse proxy and static file serving
- **Supervisor**: Process management
- **SSL/TLS**: HTTPS encryption

### Monitoring & Logging
- **Structured Logging**: JSON-formatted application logs
- **Error Tracking**: Custom error handling and reporting
- **Performance Monitoring**: Response time and resource usage
- **Health Checks**: Application and service health endpoints

## External Services

### AI Services
```python
# AI service configuration
GEMINI_API_KEY = "your_api_key_here"
PERPLEXITY_API_KEY = "your_api_key_here"
AI_RATE_LIMIT = 100  # requests per hour
```

### Data Sources
- **News APIs**: Real-time news ingestion
- **Social Media**: Twitter/X API integration
- **Government APIs**: Electoral and demographic data
- **Web Scraping**: Custom scrapers for local news

## Security & Compliance

### Authentication & Authorization
- **Session-based Auth**: Flask-Login with secure sessions
- **CSRF Protection**: Built-in Flask-WTF protection
- **Rate Limiting**: API endpoint protection
- **Input Validation**: Comprehensive request validation

### Data Protection
- **Environment Variables**: Sensitive configuration
- **Database Encryption**: Encrypted sensitive fields
- **API Security**: HTTPS, CORS, rate limiting
- **Backup Strategy**: Automated database backups

## Performance Considerations

### Backend Optimization
- **Database Indexing**: Strategic index placement
- **Query Optimization**: Efficient SQL queries
- **Caching**: Multi-level caching strategy
- **Async Processing**: Celery for heavy operations

### Frontend Optimization
- **Code Splitting**: Lazy loading for large components
- **Bundle Optimization**: Tree shaking and minification
- **Image Optimization**: Compressed images and lazy loading
- **Caching**: Browser and service worker caching

## Development Workflow

### Version Control
```bash
# Git workflow
git checkout -b feature/new-feature
git add .
git commit -m "feat: add new feature"
git push origin feature/new-feature
# Create pull request
```

### Testing Strategy
- **Backend**: pytest with coverage reporting
- **Frontend**: React Testing Library + Jest
- **E2E**: Playwright for critical user flows
- **API**: Automated API testing with pytest

### Continuous Integration
- **Linting**: Automated code style checks
- **Testing**: Automated test execution
- **Security**: Dependency vulnerability scanning
- **Deployment**: Automated deployment on merge to main

## Scalability Considerations

### Horizontal Scaling
- **Load Balancing**: Multiple backend instances
- **Database Sharding**: Ward-based data partitioning
- **Caching**: Distributed Redis caching
- **CDN**: Content delivery network for assets

### Performance Targets
- **API Response**: < 200ms for 95th percentile
- **Page Load**: < 2s initial load time
- **AI Analysis**: < 30s comprehensive analysis
- **Concurrent Users**: Support 100+ simultaneous users