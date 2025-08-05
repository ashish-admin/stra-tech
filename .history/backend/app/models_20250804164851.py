from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.dialects.postgresql import JSON

db = SQLAlchemy()

class Author(db.Model):
    """
    Represents a political author or entity.
    """
    __tablename__ = 'authors'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), unique=True, nullable=False)
    affiliation = db.Column(db.String(50), nullable=False)  # e.g., 'Client', 'Opposition'
    posts = db.relationship('Post', back_populates='author')

    def __repr__(self):
        return f'<Author {self.name}>'

class Post(db.Model):
    """
    Represents a social media post in the database.
    """
    __tablename__ = 'posts'

    id = db.Column(db.Integer, primary_key=True)
    content = db.Column(db.Text, nullable=False)
    ward = db.Column(db.String(255), nullable=False)
    emotion = db.Column(db.String(50), nullable=True)
    drivers = db.Column(JSON, nullable=True)

    # Foreign key to link to the Author table
    author_id = db.Column(db.Integer, db.ForeignKey('authors.id'), nullable=False)
    author = db.relationship('Author', back_populates='posts')

    def __repr__(self):
        return f'<Post {self.id}>'

    def to_dict(self):
        """
        Serializes the Post object to a dictionary.
        """
        return {
            'id': self.id,
            'content': self.content,
            'ward': self.ward,
            'emotion': self.emotion,
            'drivers': self.drivers,
            'author': self.author.name,  # Include author's name
            'affiliation': self.author.affiliation # Include author's affiliation
        }