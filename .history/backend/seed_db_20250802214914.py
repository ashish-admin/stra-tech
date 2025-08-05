import pandas as pd
import os
from app import create_app, db
from app.models import Post, User
# --- This is the key change: we import the NEW function ---
from app.services import analyze_emotions_and_drivers
from werkzeug.security import generate_password_hash

def seed_database():
    app = create_app()
    with app.app_context():
        # We start with a clean slate every time we seed
        db.drop_all()
        db.create_all()
        print("✅ Database tables dropped and recreated.")

        # Add a default user
        default_user = User(username='admin')
        default_user.set_password('password')
        db.session.add(default_user)
        print("✅ Default user 'admin' created.")

        try:
            # Use a robust path to find the data file
            project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
            csv_path = os.path.join(project_root, 'data', 'mock_data.csv')
            df = pd.read_csv(csv_path)
            print(f"✅ Found {len(df)} records in mock_data.csv.")
        except FileNotFoundError:
            print(f"❌ FATAL ERROR: Could not find mock_data.csv at path: {csv_path}")
            return

        # Prepare records for the AI service
        records_to_analyze = [{'id': index + 1, 'text': row['text']} for index, row in df.iterrows()]
        
        print("🧠 Analyzing posts with AI for emotions and drivers... (This may take a moment)")
        # --- Use the NEW analysis function ---
        analyzed_records = analyze_emotions_and_drivers(records_to_analyze)
        analysis_map = {item['id']: item for item in analyzed_records}
        print("✅ AI analysis complete.")

        # Create Post objects with the new 'drivers' data
        print("📝 Populating database with analyzed posts...")
        for index, row in df.iterrows():
            analysis_result = analysis_map.get(index + 1, {'emotion': 'Error', 'drivers': []})
            new_post = Post(
                text=row['text'],
                latitude=row['latitude'],
                longitude=row['longitude'],
                city=row['city'],
                timestamp=row.get('timestamp', 'N/A'),
                emotion=analysis_result['emotion'],
                drivers=analysis_result.get('drivers', []) # <-- Save the new drivers data
            )
            db.session.add(new_post)

        db.session.commit()
        print("🎉 Database seeding complete! All posts have been saved.")

if __name__ == '__main__':
    seed_database()