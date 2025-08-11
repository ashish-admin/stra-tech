from .extensions import db, login_manager # Corrected import
from flask_login import UserMixin
from werkzeug.security import generate_password_hash, check_password_hash
import datetime

# This function is now correctly linked to the login_manager instance
@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

class User(UserMixin, db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(64), index=True, unique=True)
    password_hash = db.Column(db.String(256))

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

class Post(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    timestamp = db.Column(db.String(50))
    text = db.Column(db.Text, nullable=False)
    latitude = db.Column(db.Float)
    longitude = db.Column(db.Float)
    city = db.Column(db.String(100))
    emotion = db.Column(db.String(50))
    source = db.Column(db.String(50))
    author_id = db.Column(db.Integer, db.ForeignKey('author.id'))

    def to_dict(self):
        return {
            'id': self.id,
            'timestamp': self.timestamp,
            'text': self.text,
            'latitude': self.latitude,
            'longitude': self.longitude,
            'city': self.city,
            'emotion': self.emotion,
            'source': self.source,
            'author': self.author.name if self.author else 'Unknown'
        }

class Author(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(128), unique=True, nullable=False)
    posts = db.relationship('Post', backref='author', lazy='dynamic')

class Alert(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    timestamp = db.Column(db.DateTime, index=True, default=datetime.datetime.utcnow)
    metric = db.Column(db.String(128))
    change_description = db.Column(db.Text)
    ai_summary = db.Column(db.Text)
    is_read = db.Column(db.Boolean, default=False)