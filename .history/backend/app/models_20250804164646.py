from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.dialects.postgresql import JSON

db = SQLAlchemy()

class Post(db.Model):
    """
    Represents a social media post in the database.
    """
    __tablename__ = 'posts'

    id = db.Column(db.Integer, primary_key=True)
    content = db.Column(db.Text, nullable=False)
    ward = db.Column(db.String(255), nullable=False)
    emotion = db.Column(db.String(50), nullable=True)
    drivers = db.Column(JSON, nullable=True)  # New column for emotion drivers

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
            'drivers': self.drivers  # Include drivers in the output
        }