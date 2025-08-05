import pandas as pd
from app import create_app, db
from app.models import Post
from app.services import analyze_emotions

# Create an app context to interact with the database
app = create_app()
with app.app_context():
    print("Seeding database from mock_data.csv...")

    # Clear existing data
    Post.query.delete()

    # Read the CSV
    df = pd.read_csv('data/mock_data.csv')
    records = df.to_dict(orient='records')

    # Analyze emotions (we can do this once on import)
    print("Analyzing emotions for seed data...")
    enriched_records = analyze_emotions(records)

    # Create Post objects and add them to the database
    for record in enriched_records:
        post = Post(
            id=record.get('id'),
            timestamp=record.get('timestamp'),
            text=record.get('text'),
            latitude=record.get('latitude'),
            longitude=record.get('longitude'),
            city=record.get('city'),
            emotion=record.get('emotion')
        )
        db.session.add(post)

    # Commit the changes
    db.session.commit()
    print("Database seeding complete!")