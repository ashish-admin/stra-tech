import pandas as pd
import os
from app import create_app, db
from app.models import Post, User
from app.services import analyze_emotions # <-- CORRECT IMPORT FOR THIS BRANCH
from werkzeug.security import generate_password_hash

def seed_database():
    app = create_app()
    with app.app_context():
        print("Seeding database from mock_data.csv...")

        try:
            project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
            csv_path = os.path.join(project_root, 'mock_data.csv')
            df = pd.read_csv(csv_path)
        except FileNotFoundError:
            print(f"Error: Could not find mock_data.csv at path: {csv_path}")
            return
        
        # Clear existing data
        db.drop_all()
        db.create_all()

        # Create default user
        default_user = User(username='admin')
        default_user.set_password('password')
        db.session.add(default_user)

        # Prepare records for analysis
        records_to_analyze = [{'id': index + 1, 'text': row['text']} for index, row in df.iterrows()]
        
        # Analyze emotions
        analyzed_records = analyze_emotions(records_to_analyze)
        analysis_map = {item['id']: item for item in analyzed_records}

        # Create Post objects
        for index, row in df.iterrows():
            analysis_result = analysis_map.get(index + 1, {'emotion': 'Error'})
            new_post = Post(
                text=row['text'],
                latitude=row['latitude'],
                longitude=row['longitude'],
                city=row['city'],
                timestamp=row.get('timestamp', 'N/A'),
                emotion=analysis_result['emotion']
                # Note: No 'drivers' or 'ward' on this branch
            )
            db.session.add(new_post)

        print("Committing new data to the database...")
        db.session.commit()
        print("Database seeding complete!")

if __name__ == '__main__':
    seed_database()