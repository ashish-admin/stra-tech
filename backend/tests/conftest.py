"""
Test configuration and fixtures for LokDarpan backend tests.

This module provides pytest fixtures and configuration for testing the LokDarpan backend,
including database setup, authentication, and mock services.
"""

import os
import pytest
import tempfile
from unittest.mock import Mock, patch
from datetime import datetime, timezone
from flask import Flask

# Set test environment before importing app modules
os.environ['FLASK_ENV'] = 'testing'
os.environ['SECRET_KEY'] = 'a7b9c2d1e3f4g5h6i7j8k9l0m1n2o3p4q5r6s7t8u9v0w1x2y3z4a5b6c7d8e9f0'
os.environ['DATABASE_URL'] = 'sqlite:///:memory:'
os.environ['REDIS_URL'] = 'redis://localhost:6379/15'  # Use test database
os.environ['RATE_LIMIT_ENABLED'] = 'False'  # Disable rate limiting in tests  
os.environ['AUDIT_LOG_ENABLED'] = 'True'   # Enable audit logging for security tests
os.environ['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'

from app import create_app, db
from app.models import User, Author, Post, Alert
from app.models_ai import Embedding, Leader, Summary


class TestConfig:
    """Test configuration that overrides problematic settings."""
    SECRET_KEY = 'test-secret-key-for-testing-only'
    TESTING = True
    WTF_CSRF_ENABLED = False
    SQLALCHEMY_DATABASE_URI = 'sqlite:///:memory:'
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = {
        'pool_pre_ping': True,
        'pool_recycle': 300,
        'connect_args': {
            'check_same_thread': False
        }
    }
    RATE_LIMIT_ENABLED = False
    AUDIT_LOG_ENABLED = False
    CORS_ORIGINS = ['http://localhost:5173']
    SESSION_COOKIE_SECURE = False
    SESSION_COOKIE_SAMESITE = 'Lax'
    SESSION_COOKIE_HTTPONLY = True


@pytest.fixture(scope='session')
def app():
    """Create application for testing."""
    # Create app directly with test config
    app = Flask(__name__)
    
    # Set config directly - strong secret key for testing
    app.config['SECRET_KEY'] = 'a7b9c2d1e3f4g5h6i7j8k9l0m1n2o3p4q5r6s7t8u9v0w1x2y3z4a5b6c7d8e9f0'
    app.config['TESTING'] = True
    app.config['WTF_CSRF_ENABLED'] = False
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    app.config['SQLALCHEMY_ENGINE_OPTIONS'] = {
        'pool_pre_ping': True,
        'pool_recycle': 300,
        'connect_args': {
            'check_same_thread': False
        }
    }
    app.config['RATE_LIMIT_ENABLED'] = False
    app.config['AUDIT_LOG_ENABLED'] = True
    app.config['CORS_ORIGINS'] = ['http://localhost:5173']
    app.config['SESSION_COOKIE_SECURE'] = False
    app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'
    app.config['SESSION_COOKIE_HTTPONLY'] = True
    
    # Initialize extensions manually
    from app.extensions import db, migrate, login_manager
    db.init_app(app)
    migrate.init_app(app, db)
    login_manager.init_app(app)
    
    # Configure Flask-Login user loader
    @login_manager.user_loader
    def load_user(user_id):
        from app.models import User
        return User.query.get(int(user_id))
    
    # Import models to ensure they're registered
    from app import models, models_ai
    
    # Apply security middleware for testing
    from app.security import apply_security_headers
    
    @app.after_request
    def apply_test_security_headers(response):
        """Apply security headers in test environment."""
        return apply_security_headers(response)
    
    # Register blueprints
    from app.routes import main_bp
    from app.trends_api import trends_bp
    from app.pulse_api import pulse_bp
    from app.ward_api import ward_bp
    from app.epaper_api import bp_epaper
    from app.summary_api import summary_bp
    
    app.register_blueprint(main_bp)
    app.register_blueprint(trends_bp)
    app.register_blueprint(pulse_bp)
    app.register_blueprint(ward_bp)
    app.register_blueprint(bp_epaper)
    app.register_blueprint(summary_bp)
    
    # Create application context
    ctx = app.app_context()
    ctx.push()
    
    yield app
    
    # Cleanup
    ctx.pop()


@pytest.fixture(scope='function')
def client(app):
    """Create test client."""
    return app.test_client()


@pytest.fixture(scope='function')
def db_session(app):
    """Create database session for testing."""
    with app.app_context():
        # Create all tables
        db.create_all()
        
        yield db
        
        # Clean up after test
        db.session.remove()
        db.drop_all()


@pytest.fixture
def auth_user(db_session):
    """Create authenticated user for testing."""
    user = User(
        username='testuser',
        email='test@example.com'
    )
    user.set_password('testpassword123')
    db_session.session.add(user)
    db_session.session.commit()
    return user


@pytest.fixture
def auth_headers(client, auth_user):
    """Get authentication headers for API requests."""
    response = client.post('/api/v1/login', json={
        'username': auth_user.username,
        'password': 'testpassword123'
    })
    assert response.status_code == 200
    
    # Return headers with session cookie
    return {'Cookie': response.headers.get('Set-Cookie')}


@pytest.fixture
def sample_author(db_session):
    """Create sample author for testing."""
    author = Author(name='Test Author', party='TEST')
    db_session.session.add(author)
    db_session.session.commit()
    return author


@pytest.fixture
def sample_post(db_session, sample_author):
    """Create sample post for testing."""
    post = Post(
        text='This is a test post about politics',
        author_id=sample_author.id,
        city='Hyderabad',
        emotion='Positive',
        party='TEST',
        created_at=datetime.now(timezone.utc)
    )
    db_session.session.add(post)
    db_session.session.commit()
    return post


@pytest.fixture
def sample_alert(db_session):
    """Create sample alert for testing."""
    alert = Alert(
        ward='Test Ward',
        description='Test alert description',
        severity='Medium',
        opportunities='["Test opportunity"]',
        threats='["Test threat"]',
        actionable_alerts='["Test action"]',
        source_articles='["http://example.com/article"]'
    )
    db_session.session.add(alert)
    db_session.session.commit()
    return alert


@pytest.fixture
def mock_gemini_service():
    """Mock Gemini AI service for testing."""
    with patch('app.services.model') as mock_model:
        mock_response = Mock()
        mock_response.text = '{"emotion": "Positive", "drivers": ["politics", "development"]}'
        mock_model.generate_content.return_value = mock_response
        yield mock_model


@pytest.fixture
def mock_news_api():
    """Mock News API service for testing."""
    with patch('app.services.newsapi') as mock_newsapi:
        mock_newsapi.get_everything.return_value = {
            'articles': [
                {
                    'title': 'Test News Article',
                    'description': 'Test description',
                    'source': {'name': 'Test Source'},
                    'publishedAt': '2025-08-20T10:00:00Z'
                }
            ]
        }
        yield mock_newsapi


@pytest.fixture
def mock_twitter_api():
    """Mock Twitter API service for testing."""
    with patch('app.services.twitter_client') as mock_twitter:
        mock_tweet = Mock()
        mock_tweet.text = 'Test tweet about politics'
        mock_twitter.search_recent_tweets.return_value = Mock(data=[mock_tweet])
        yield mock_twitter


@pytest.fixture
def security_test_headers():
    """Headers for security testing."""
    return {
        'X-CSRF-Token': 'test-csrf-token',
        'Content-Type': 'application/json',
        'User-Agent': 'LokDarpan-Test-Client/1.0'
    }


@pytest.fixture
def ward_test_data():
    """Sample ward data for testing."""
    return {
        'ward_id': 'WARD_001',
        'ward_name': 'Test Ward',
        'coordinates': [17.4065, 78.4772],  # Hyderabad coordinates
        'demographics': {
            'total_voters': 15000,
            'literacy_rate': 0.85,
            'age_distribution': {
                '18-25': 0.20,
                '26-40': 0.35,
                '41-60': 0.30,
                '60+': 0.15
            }
        }
    }


@pytest.fixture
def performance_test_data(db_session, sample_author):
    """Create large dataset for performance testing."""
    posts = []
    for i in range(1000):  # Create 1000 posts for performance testing
        post = Post(
            text=f'Performance test post {i} with political content',
            author_id=sample_author.id,
            city='Hyderabad',
            emotion='Neutral',
            party='TEST',
            created_at=datetime.now(timezone.utc)
        )
        posts.append(post)
    
    db_session.session.add_all(posts)
    db_session.session.commit()
    return posts


@pytest.fixture
def celery_app(app):
    """Create Celery app for testing."""
    from app.extensions import celery
    celery.conf.update(
        task_always_eager=True,  # Execute tasks synchronously
        task_eager_propagates=True,  # Propagate exceptions
        broker_url='memory://',
        result_backend='cache+memory://'
    )
    return celery


class TestConfig:
    """Test configuration constants."""
    
    # API endpoints for testing
    API_BASE_URL = '/api/v1'
    
    # Test data limits
    MAX_TEST_POSTS = 1000
    MAX_TEST_USERS = 100
    
    # Performance thresholds
    MAX_RESPONSE_TIME = 2.0  # seconds
    MAX_DB_QUERY_TIME = 0.5  # seconds
    
    # Security test patterns
    XSS_PAYLOADS = [
        '<script>alert("xss")</script>',
        'javascript:alert("xss")',
        '<img src=x onerror=alert("xss")>',
        '"><script>alert("xss")</script>'
    ]
    
    SQL_INJECTION_PAYLOADS = [
        "'; DROP TABLE users; --",
        "' OR '1'='1",
        "' UNION SELECT * FROM users --",
        "'; EXEC xp_cmdshell('dir'); --"
    ]
    
    # Rate limiting test configuration
    RATE_LIMIT_TEST_REQUESTS = 10
    RATE_LIMIT_WINDOW = 60  # seconds


@pytest.fixture
def test_config():
    """Provide test configuration."""
    return TestConfig()


# Helper functions for tests

def assert_response_success(response, expected_status=200):
    """Assert response is successful with optional status check."""
    assert response.status_code == expected_status
    assert response.is_json
    data = response.get_json()
    assert data is not None
    return data


def assert_response_error(response, expected_status=400, expected_error=None):
    """Assert response is an error with optional error message check."""
    assert response.status_code == expected_status
    if response.is_json:
        data = response.get_json()
        if expected_error:
            assert 'error' in data
            assert expected_error in data['error']
    return response


def create_test_post_data():
    """Create test post data."""
    return {
        'text': 'Test political post content',
        'city': 'Hyderabad',
        'emotion': 'Positive',
        'party': 'TEST'
    }


def create_test_user_data():
    """Create test user data."""
    return {
        'username': 'testuser',
        'email': 'test@example.com',
        'password': 'SecurePassword123!'
    }


# Political Strategist test fixtures

@pytest.fixture
def mock_ai_services():
    """Mock AI service APIs for strategist testing."""
    with patch('strategist.reasoner.ultra_think.genai') as mock_genai:
        with patch('strategist.retriever.perplexity_client.requests') as mock_requests:
            with patch('strategist.nlp.pipeline.openai') as mock_openai:
                
                # Mock Gemini
                mock_model = Mock()
                mock_model.generate_content_async.return_value = Mock(
                    text='{"strategic_overview": "Test AI response", "confidence_score": 0.8}'
                )
                mock_genai.GenerativeModel.return_value = mock_model
                
                # Mock Perplexity (using requests, not aiohttp)
                mock_response = Mock()
                mock_response.status_code = 200
                mock_response.json.return_value = {
                    "choices": [{"message": {"content": "Test Perplexity response"}}]
                }
                mock_requests.post.return_value = mock_response
                
                # Mock OpenAI
                mock_openai.Embedding.create.return_value = {
                    "data": [{"embedding": [0.1, 0.2, 0.3]}]
                }
                
                yield {
                    'genai': mock_genai,
                    'requests': mock_requests,
                    'openai': mock_openai
                }


@pytest.fixture
def mock_strategist_components():
    """Mock all strategist components for isolated testing."""
    from unittest.mock import AsyncMock
    
    # Mock Strategic Planner
    mock_planner = AsyncMock()
    mock_planner.create_analysis_plan.return_value = {
        "status": "success",
        "plan": {
            "queries": ["test query 1", "test query 2"],
            "analysis_depth": "standard",
            "confidence_threshold": 0.7
        }
    }
    mock_planner.generate_briefing.return_value = {
        "status": "success",
        "briefing": {
            "strategic_overview": "Mock strategic briefing",
            "key_intelligence": [],
            "confidence_score": 0.85
        }
    }
    
    # Mock Perplexity Retriever  
    mock_retriever = AsyncMock()
    mock_retriever.gather_intelligence.return_value = {
        "status": "success",
        "intelligence": {
            "queries_processed": 2,
            "key_developments": [],
            "sentiment_trends": {"positive": 0.6, "neutral": 0.3, "negative": 0.1}
        }
    }
    
    # Mock NLP Processor
    mock_nlp = Mock()
    mock_nlp.extract_entities.return_value = {
        "political_parties": ["BJP", "TRS", "Congress"],
        "politicians": ["Test Leader"],
        "locations": ["Test Ward"],
        "issues": ["development", "infrastructure"]
    }
    mock_nlp.analyze_sentiment.return_value = {
        "compound": 0.5,
        "positive": 0.6,
        "neutral": 0.3,
        "negative": 0.1
    }
    
    # Mock Credibility Scorer
    mock_credibility = Mock()
    mock_credibility.score_source.return_value = {
        "overall_score": 0.85,
        "factors": {"source_reputation": 0.9},
        "recommendation": "high_credibility"
    }
    
    return {
        "planner": mock_planner,
        "retriever": mock_retriever,
        "nlp": mock_nlp,
        "credibility": mock_credibility
    }


@pytest.fixture
def mock_redis_cache():
    """Mock Redis for strategist cache testing."""
    with patch('strategist.cache.r') as mock_r:
        mock_r.ping.return_value = True
        mock_r.get.return_value = None
        mock_r.setex.return_value = True
        mock_r.delete.return_value = 1
        mock_r.keys.return_value = []
        mock_r.info.return_value = {
            'used_memory_human': '1MB',
            'connected_clients': 1,
            'total_commands_processed': 100,
            'keyspace_hits': 80,
            'keyspace_misses': 20
        }
        yield mock_r


@pytest.fixture
def strategist_test_data():
    """Sample data for strategist testing."""
    return {
        "ward": "Test Ward",
        "briefing": {
            "strategic_overview": "Test strategic overview",
            "key_intelligence": [
                {
                    "category": "public_sentiment",
                    "content": "Test intelligence",
                    "impact_level": "high",
                    "confidence": 0.9
                }
            ],
            "opportunities": [
                {
                    "description": "Test opportunity",
                    "timeline": "48h",
                    "priority": 1
                }
            ],
            "threats": [
                {
                    "description": "Test threat",
                    "severity": "medium",
                    "mitigation_strategy": "Test mitigation"
                }
            ],
            "recommended_actions": [
                {
                    "category": "immediate",
                    "description": "Test action",
                    "timeline": "24h",
                    "priority": 1
                }
            ],
            "confidence_score": 0.85,
            "source_citations": [
                {
                    "source_type": "news",
                    "title": "Test Article",
                    "url": "https://example.com/test",
                    "relevance": 0.8
                }
            ],
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "internal_use_only": True
        }
    }


@pytest.fixture
def sample_posts(db_session, sample_author):
    """Create sample posts for strategist testing."""
    posts = []
    post_data = [
        {"text": "Infrastructure development in Jubilee Hills is progressing well", "emotion": "Hopeful", "party": "BJP"},
        {"text": "Concerns about traffic congestion in the area", "emotion": "Frustration", "party": "TRS"}, 
        {"text": "New park construction approved by municipal authorities", "emotion": "Hopeful", "party": "INC"},
        {"text": "Water supply issues need immediate attention", "emotion": "Anger", "party": "AIMIM"},
        {"text": "Local business community supports new policies", "emotion": "Positive", "party": "BJP"}
    ]
    
    for i, data in enumerate(post_data):
        post = Post(
            text=data["text"],
            author_id=sample_author.id,
            city='Jubilee Hills',
            emotion=data["emotion"],
            party=data["party"],
            created_at=datetime.now(timezone.utc)
        )
        posts.append(post)
        db_session.session.add(post)
    
    db_session.session.commit()
    return posts