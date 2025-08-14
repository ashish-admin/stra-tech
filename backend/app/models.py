# backend/app/models.py
from datetime import datetime
from flask_login import UserMixin
from .extensions import db

class User(UserMixin, db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)

class Author(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), unique=True, nullable=False)

class Post(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    text = db.Column(db.Text, nullable=False)
    author_id = db.Column(db.Integer, db.ForeignKey('author.id'))
    author = db.relationship('Author', backref='posts')
    city = db.Column(db.String(120))           # ward/city label
    emotion = db.Column(db.String(64))         # detected emotion
    party = db.Column(db.String(64))           # optional: source party
    created_at = db.Column(db.DateTime, nullable=False, index=True, default=datetime.utcnow)

class Alert(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    ward = db.Column(db.String(120), index=True)
    opportunities = db.Column(db.Text)  # JSON text
    created_at = db.Column(db.DateTime, nullable=False, index=True, default=datetime.utcnow)
