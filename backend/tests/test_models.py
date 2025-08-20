"""
Unit tests for LokDarpan models.

This module tests the database models including User, Post, Author, Alert,
and AI-related models for proper functionality, relationships, and constraints.
"""

import pytest
from datetime import datetime, timezone, timedelta
from app.models import User, Author, Post, Alert
from app.models_ai import Embedding, Leader, Summary
from werkzeug.security import check_password_hash


class TestUserModel:
    """Test cases for User model."""
    
    def test_user_creation(self, db_session):
        """Test user can be created with required fields."""
        user = User(
            username='testuser',
            email='test@example.com'
        )
        user.set_password('password123')
        
        db_session.session.add(user)
        db_session.session.commit()
        
        assert user.id is not None
        assert user.username == 'testuser'
        assert user.email == 'test@example.com'
        assert user.password_hash is not None
        assert user.is_active is True
        assert user.failed_login_attempts == 0
        assert user.created_at is not None
    
    def test_password_hashing(self, db_session):
        """Test password is properly hashed and verified."""
        user = User(username='testuser', email='test@example.com')
        password = 'SecurePassword123!'
        user.set_password(password)
        
        # Password should be hashed
        assert user.password_hash != password
        assert check_password_hash(user.password_hash, password)
        
        # Check password method should work
        assert user.check_password(password) is True
        assert user.check_password('wrongpassword') is False
    
    def test_account_lockout_mechanism(self, db_session):
        """Test account lockout after failed login attempts."""
        user = User(username='testuser', email='test@example.com')
        user.set_password('password123')
        
        # Explicitly initialize failed_login_attempts for SQLite compatibility
        if user.failed_login_attempts is None:
            user.failed_login_attempts = 0
            
        db_session.session.add(user)
        db_session.session.commit()
        
        # Initially not locked
        assert user.is_account_locked() is False
        
        # Record 5 failed attempts
        for _ in range(5):
            user.record_failed_login()
        
        # Account should now be locked
        assert user.is_account_locked() is True
        assert user.failed_login_attempts == 5
        assert user.last_failed_login is not None
    
    def test_successful_login_resets_failures(self, db_session):
        """Test successful login resets failed attempt counter."""
        user = User(username='testuser', email='test@example.com')
        user.set_password('password123')
        
        # Explicitly initialize failed_login_attempts for SQLite compatibility
        if user.failed_login_attempts is None:
            user.failed_login_attempts = 0
            
        # Record some failed attempts
        user.record_failed_login()
        user.record_failed_login()
        assert user.failed_login_attempts == 2
        
        # Successful login should reset
        user.record_successful_login()
        assert user.failed_login_attempts == 0
        assert user.last_failed_login is None
        assert user.last_login is not None
    
    def test_user_repr(self, db_session):
        """Test user string representation."""
        user = User(username='testuser', email='test@example.com')
        assert str(user) == '<User testuser>'


class TestAuthorModel:
    """Test cases for Author model."""
    
    def test_author_creation(self, db_session):
        """Test author can be created with required fields."""
        author = Author(name='Test Author', party='BJP')
        db_session.session.add(author)
        db_session.session.commit()
        
        assert author.id is not None
        assert author.name == 'Test Author'
        assert author.party == 'BJP'
    
    def test_author_without_party(self, db_session):
        """Test author can be created without party affiliation."""
        author = Author(name='Independent Author')
        db_session.session.add(author)
        db_session.session.commit()
        
        assert author.id is not None
        assert author.name == 'Independent Author'
        assert author.party is None
    
    def test_author_repr(self, db_session):
        """Test author string representation."""
        author = Author(name='Test Author')
        assert str(author) == '<Author Test Author>'


class TestPostModel:
    """Test cases for Post model."""
    
    def test_post_creation(self, db_session, sample_author):
        """Test post can be created with required fields."""
        post = Post(
            text='Test post content',
            author_id=sample_author.id,
            city='Hyderabad',
            emotion='Positive',
            party='BJP'
        )
        db_session.session.add(post)
        db_session.session.commit()
        
        assert post.id is not None
        assert post.text == 'Test post content'
        assert post.author_id == sample_author.id
        assert post.city == 'Hyderabad'
        assert post.emotion == 'Positive'
        assert post.party == 'BJP'
        assert post.created_at is not None
    
    def test_post_author_relationship(self, db_session, sample_author):
        """Test post-author relationship works correctly."""
        post = Post(
            text='Test post content',
            author_id=sample_author.id,
            city='Hyderabad'
        )
        db_session.session.add(post)
        db_session.session.commit()
        
        # Test relationship from post to author
        assert post.author is not None
        assert post.author.name == sample_author.name
        
        # Test backref from author to posts
        assert len(sample_author.posts) == 1
        assert sample_author.posts[0].text == 'Test post content'
    
    def test_post_with_epaper(self, db_session, sample_author):
        """Test post can be linked to epaper."""
        from app.models import Epaper
        
        epaper = Epaper(
            publication_name='Test Publication',
            publication_date=datetime.now().date(),
            raw_text='Test epaper content',
            sha256='test_hash_123'
        )
        db_session.session.add(epaper)
        db_session.session.commit()
        
        post = Post(
            text='Test post content',
            author_id=sample_author.id,
            epaper_id=epaper.id,
            city='Hyderabad'
        )
        db_session.session.add(post)
        db_session.session.commit()
        
        assert post.epaper_id == epaper.id
        assert post.epaper is not None
        assert post.epaper.publication_name == 'Test Publication'
    
    def test_post_repr(self, db_session, sample_post):
        """Test post string representation."""
        expected = f'<Post {sample_post.id} city={sample_post.city}>'
        assert str(sample_post) == expected


class TestAlertModel:
    """Test cases for Alert model."""
    
    def test_alert_creation(self, db_session):
        """Test alert can be created with required fields."""
        alert = Alert(
            ward='Test Ward',
            description='Test alert description',
            severity='High',
            opportunities='["Opportunity 1", "Opportunity 2"]',
            threats='["Threat 1"]',
            actionable_alerts='["Action 1", "Action 2"]',
            source_articles='["http://example.com/article1"]'
        )
        db_session.session.add(alert)
        db_session.session.commit()
        
        assert alert.id is not None
        assert alert.ward == 'Test Ward'
        assert alert.description == 'Test alert description'
        assert alert.severity == 'High'
        assert alert.created_at is not None
        assert alert.updated_at is not None
    
    def test_alert_json_fields(self, db_session):
        """Test alert JSON fields store data correctly."""
        alert = Alert(
            ward='Test Ward',
            description='Test description',
            severity='Medium',
            opportunities='["Political rally", "Media coverage"]',
            threats='["Opposition campaign"]',
            actionable_alerts='["Schedule press meet", "Counter narrative"]',
            source_articles='["http://news1.com", "http://news2.com"]'
        )
        db_session.session.add(alert)
        db_session.session.commit()
        
        # JSON fields should be stored as strings
        assert '"Political rally"' in alert.opportunities
        assert '"Opposition campaign"' in alert.threats
        assert '"Schedule press meet"' in alert.actionable_alerts
        assert '"http://news1.com"' in alert.source_articles
    
    def test_alert_repr(self, db_session, sample_alert):
        """Test alert string representation."""
        expected = f'<Alert {sample_alert.ward} severity={sample_alert.severity}>'
        assert str(sample_alert) == expected


class TestEpaperModel:
    """Test cases for Epaper model."""
    
    def test_epaper_creation(self, db_session):
        """Test epaper can be created with required fields."""
        from app.models import Epaper
        
        epaper = Epaper(
            publication_name='Test Publication',
            publication_date=datetime.now().date(),
            raw_text='This is test epaper content',
            sha256='a1b2c3d4e5f6'
        )
        db_session.session.add(epaper)
        db_session.session.commit()
        
        assert epaper.id is not None
        assert epaper.publication_name == 'Test Publication'
        assert epaper.publication_date is not None
        assert epaper.raw_text == 'This is test epaper content'
        assert epaper.sha256 == 'a1b2c3d4e5f6'
        assert epaper.created_at is not None
    
    def test_epaper_unique_sha256(self, db_session):
        """Test epaper SHA256 must be unique."""
        from app.models import Epaper
        from sqlalchemy.exc import IntegrityError
        
        # Create first epaper
        epaper1 = Epaper(
            publication_name='Publication 1',
            publication_date=datetime.now().date(),
            raw_text='Content 1',
            sha256='duplicate_hash'
        )
        db_session.session.add(epaper1)
        db_session.session.commit()
        
        # Try to create second epaper with same SHA256
        epaper2 = Epaper(
            publication_name='Publication 2',
            publication_date=datetime.now().date(),
            raw_text='Content 2',
            sha256='duplicate_hash'
        )
        db_session.session.add(epaper2)
        
        with pytest.raises(IntegrityError):
            db_session.session.commit()
    
    def test_epaper_posts_relationship(self, db_session, sample_author):
        """Test epaper-posts relationship."""
        from app.models import Epaper
        
        epaper = Epaper(
            publication_name='Test Publication',
            publication_date=datetime.now().date(),
            raw_text='Test content',
            sha256='test_hash'
        )
        db_session.session.add(epaper)
        db_session.session.commit()
        
        # Create posts linked to epaper
        post1 = Post(
            text='Post 1 from epaper',
            author_id=sample_author.id,
            epaper_id=epaper.id,
            city='Hyderabad'
        )
        post2 = Post(
            text='Post 2 from epaper',
            author_id=sample_author.id,
            epaper_id=epaper.id,
            city='Hyderabad'
        )
        db_session.session.add_all([post1, post2])
        db_session.session.commit()
        
        # Test relationship
        assert len(epaper.posts) == 2
        assert post1 in epaper.posts
        assert post2 in epaper.posts


class TestAIModels:
    """Test cases for AI-related models."""
    
    def test_embedding_creation(self, db_session):
        """Test embedding can be created."""
        embedding = Embedding(
            source_type='post',
            source_id=1,
            ward='Test Ward',
            meta={'model': 'text-embedding-ada-002', 'dimensions': 1536}
        )
        db_session.session.add(embedding)
        db_session.session.commit()
        
        assert embedding.id is not None
        assert embedding.source_type == 'post'
        assert embedding.source_id == 1
        assert embedding.ward == 'Test Ward'
        assert embedding.created_at is not None
    
    def test_embedding_unique_constraint(self, db_session):
        """Test embedding unique constraint on source_type and source_id."""
        from sqlalchemy.exc import IntegrityError
        
        # Create first embedding
        embedding1 = Embedding(
            source_type='post',
            source_id=1,
            ward='Test Ward'
        )
        db_session.session.add(embedding1)
        db_session.session.commit()
        
        # Try to create duplicate
        embedding2 = Embedding(
            source_type='post',
            source_id=1,
            ward='Another Ward'
        )
        db_session.session.add(embedding2)
        
        with pytest.raises(IntegrityError):
            db_session.session.commit()
    
    def test_leader_creation(self, db_session):
        """Test leader can be created."""
        leader = Leader(
            name='Test Leader',
            party='BJP',
            role='MLA',
            ward='Test Ward'
        )
        db_session.session.add(leader)
        db_session.session.commit()
        
        assert leader.id is not None
        assert leader.name == 'Test Leader'
        assert leader.party == 'BJP'
        assert leader.role == 'MLA'
        assert leader.ward == 'Test Ward'
        assert leader.first_seen is not None
        assert leader.last_seen is not None
    
    def test_summary_creation(self, db_session):
        """Test summary can be created."""
        summary = Summary(
            ward='Test Ward',
            window='P7D',
            sections={
                'angle': 'Test strategic angle',
                'weakness': 'Test weakness analysis',
                'actions_24h': ['Action 1', 'Action 2'],
                'actions_7d': ['Long term action'],
                'risks': ['Risk 1', 'Risk 2']
            },
            citations=[
                {'source_type': 'post', 'source_id': 1, 'title': 'Test Article', 'date': '2025-08-20'}
            ],
            confidence=0.85,
            model='gemini-1.5-pro'
        )
        db_session.session.add(summary)
        db_session.session.commit()
        
        assert summary.id is not None
        assert summary.ward == 'Test Ward'
        assert summary.window == 'P7D'
        assert summary.confidence == 0.85
        assert summary.model == 'gemini-1.5-pro'
        assert summary.created_at is not None


class TestModelRelationships:
    """Test model relationships and constraints."""
    
    def test_cascade_delete_posts_with_author(self, db_session, sample_author, sample_post):
        """Test posts are handled correctly when author is deleted."""
        post_id = sample_post.id
        author_id = sample_author.id
        
        # Delete author
        db_session.session.delete(sample_author)
        db_session.session.commit()
        
        # Post should still exist but with null author_id
        post = db_session.session.get(Post, post_id)
        assert post is not None
        # Note: Depending on FK constraint setup, this might be None or raise an error
    
    def test_multiple_posts_per_author(self, db_session, sample_author):
        """Test author can have multiple posts."""
        posts = []
        for i in range(5):
            post = Post(
                text=f'Test post {i}',
                author_id=sample_author.id,
                city='Hyderabad'
            )
            posts.append(post)
        
        db_session.session.add_all(posts)
        db_session.session.commit()
        
        # Refresh author to get updated relationship
        db_session.session.refresh(sample_author)
        assert len(sample_author.posts) == 5
    
    def test_electoral_models_basic_creation(self, db_session):
        """Test electoral models can be created."""
        from app.models import PollingStation, Election, WardProfile
        
        # Test PollingStation
        ps = PollingStation(
            ps_id='PS001',
            name='Test Polling Station',
            ward_id='WARD_001',
            ward_name='Test Ward'
        )
        db_session.session.add(ps)
        db_session.session.commit()
        assert ps.id is not None
        
        # Test Election
        election = Election(
            type='GHMC',
            year=2025,
            round='General'
        )
        db_session.session.add(election)
        db_session.session.commit()
        assert election.id is not None
        
        # Test WardProfile
        profile = WardProfile(
            ward_id='WARD_001',
            electors=15000,
            votes_cast=12000,
            turnout_pct=80.0,
            last_winner_party='BJP',
            last_winner_year=2020
        )
        db_session.session.add(profile)
        db_session.session.commit()
        assert profile.id is not None