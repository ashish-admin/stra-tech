import pandas as pd
import os
from app import create_app, db
from app.models import Post, User
from app.services import analyze_emotions_and_drivers # Assuming this service is on the stable branch
from werkzeug.security import generate_password_hash

def seed_database():
    app = create_app()
    with app.app_context():
        print("Seeding database from mock_data.csv...")

        # --- THIS IS THE FIX ---
        # The path now correctly points one level up from the 'backend' directory
        # to the project root where the file is located.
        try:
            # Construct a path that works regardless of where the script is run from
            project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
            csv_path = os.path.join(project_root, 'mock_data.csv') # Assuming mock_data.csv is in the root
            df = pd.read_csv(csv_path)
        except FileNotFoundError:
            print(f"Error: Could not find mock_data.csv at path: {csv_path}")
            print("Please ensure mock_data.csv is in the main project root folder.")
            return
        
        # Clear existing posts to avoid duplicates
        db.session.query(Post).delete()

        # Prepare records for analysis
        records_to_analyze = [
            {'id': index + 1, 'text': row['text']}
            for index, row in df.iterrows()
        ]
        
        # Analyze emotions and drivers
        analyzed_records = analyze_emotions_and_drivers(records_to_analyze)
        analysis_map = {item['id']: item for item in analyzed_records}

        # Create Post objects
        for index, row in df.iterrows():
            analysis_result = analysis_map.get(index + 1, {'emotion': 'Error', 'drivers': []})
            new_post = Post(
                text=row['text'],
                latitude=row['latitude'],
                longitude=row['longitude'],
                city=row['city'],
                timestamp=row.get('timestamp', 'N/A'),
                emotion=analysis_result['emotion'],
                drivers=analysis_result.get('drivers', [])
            )
            db.session.add(new_post)

        print("Committing new posts to the database...")
        db.session.commit()
        print("Database seeding complete!")

if __name__ == '__main__':
    seed_database()