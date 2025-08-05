import pandas as pd
import os
from app import create_app, db
from app.models import Post, User
from app.services import analyze_emotions
from werkzeug.security import generate_password_hash

def seed_database():
    app = create_app()
    with app.app_context():
        print("Seeding database...")

        try:
            # --- FINAL CORRECTED FILE PATH ---
            # This path now points directly to backend/app/data/
            base_dir = os.path.dirname(os.path.abspath(__file__)) # This is the 'backend' directory
            csv_path = os.path.join(base_dir, 'app', 'data', 'mock_data.csv')
            df = pd.read_csv(csv_path)
        except FileNotFoundError:
            print(f"❌ FATAL ERROR: Could not find mock_data.csv at path: {csv_path}")
            print("Please ensure mock_data.csv is located inside the 'backend/app/data' folder.")
            return
        
        # Start with a clean slate
        db.drop_all()
        db.create_all()

        # Add a default user
        default_user = User(username='admin')
        default_user.set_password('password')
        db.session.add(default_user)

        records_to_analyze = [{'id': index + 1, 'text': row['text']} for index, row in df.iterrows()]
        
        # Use the correct analysis function for this branch
        analyzed_records = analyze_emotions(records_to_analyze)
        analysis_map = {item['id']: item for item in analyzed_records}

        for index, row in df.iterrows():
            analysis_result = analysis_map.get(index + 1, {'emotion': 'Error'})
            new_post = Post(
                text=row['text'],
                latitude=row['latitude'],
                longitude=row['longitude'],
                city=row['city'],
                timestamp=row.get('timestamp', 'N/A'),
                emotion=analysis_result['emotion']
            )
            db.session.add(new_post)

        print("Committing data...")
        db.session.commit()
        print("✅ Database seeding complete!")

if __name__ == '__main__':
    seed_database()