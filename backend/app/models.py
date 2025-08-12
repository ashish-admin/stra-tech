# backend/app/models.py

from app.extensions import db
from datetime import datetime, timezone
from werkzeug.security import generate_password_hash, check_password_hash
from flask_login import UserMixin

class User(UserMixin, db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(64), index=True, unique=True, nullable=False)
    email = db.Column(db.String(120), index=True, unique=True, nullable=False)
    password_hash = db.Column(db.String(256))

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def to_dict(self):
        return {'id': self.id, 'username': self.username, 'email': self.email}

    def __repr__(self):
        return f'<User {self.username}>'

# --- THE FIX IS HERE ---
# Restore the Author model to represent data sources
class Author(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), unique=True, nullable=False) # e.g., 'Twitter', 'NewsAPI'
    posts = db.relationship('Post', backref='author', lazy='dynamic')

    def to_dict(self):
        return {'id': self.id, 'name': self.name}

class Post(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    text = db.Column(db.String(280), nullable=False)
    emotion = db.Column(db.String(50))
    city = db.Column(db.String(100))
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    author_id = db.Column(db.Integer, db.ForeignKey('author.id'), nullable=False)

    def to_dict(self):
        # --- THE FIX IS HERE ---
        # We now check if created_at has a value before trying to format it.
        # If it's None, we return None, which is valid JSON.
        return {
            'id': self.id,
            'text': self.text,
            'emotion': self.emotion,
            'city': self.city,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'author_name': self.author.name if self.author else 'Unknown'
        }

class Alert(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    ward = db.Column(db.String(150), nullable=False, index=True)
    opportunities = db.Column(db.Text, nullable=True)
    threats = db.Column(db.Text, nullable=True)
    actionable_alerts = db.Column(db.Text, nullable=True)
    source_articles = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    def to_dict(self):
        return {
            'id': self.id,
            'ward': self.ward,
            'opportunities': self.opportunities,
            'threats': self.threats,
            'actionable_alerts': self.actionable_alerts,
            'source_articles': self.source_articles,
            'created_at': self.created_at.isoformat()
        }