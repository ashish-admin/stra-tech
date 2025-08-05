import pandas as pd
import os
import geopandas as gpd
from shapely.geometry import Point
from app import create_app, db
from app.models import Post, User
from app.services import analyze_emotions_and_drivers
from werkzeug.security import generate_password_hash

def seed_database():
    app = create_app()
    with app.app_context():
        print("Seeding database...")
        try:
            base_dir = os.path.dirname(os.path.abspath(__file__))
            csv_path = os.path.join(base_dir, 'app', 'data', 'mock_data.csv')
            geojson_path = os.path.join(base_dir, 'app', 'data', 'ghmc_wards.geojson')
            df = pd.read_csv(csv_path)
            wards_gdf = gpd.read_file(geojson_path)
        except FileNotFoundError as e:
            print(f"FATAL ERROR: Could not find data file. {e}")
            return

        print("Dropping old data and recreating schema...")
        db.drop_all()
        db.create_all()

        print("Creating default user 'admin'...")
        default_user = User(username='admin')
        default_user.set_password('password')
        db.session.add(default_user)

        records_to_analyze = [{'id': index + 1, 'text': row['text']} for index, row in df.iterrows()]
        
        print("Analyzing posts with AI for emotions and drivers...")
        analyzed_records = analyze_emotions_and_drivers(records_to_analyze)
        analysis_map = {item['id']: item for item in analyzed_records}

        print("Populating database with posts and assigning wards...")
        for index, row in df.iterrows():
            post_ward = None
            point = Point(row['longitude'], row['latitude'])
            for _, ward_row in wards_gdf.iterrows():
                if point.within(ward_row.geometry):
                    post_ward = ward_row['name']
                    break
            
            analysis_result = analysis_map.get(index + 1, {'emotion': 'Error', 'drivers': []})
            new_post = Post(
                text=row['text'], latitude=row['latitude'], longitude=row['longitude'],
                city=row['city'], timestamp=row.get('timestamp', 'N/A'),
                ward=post_ward, emotion=analysis_result['emotion'], drivers=analysis_result.get('drivers', [])
            )
            db.session.add(new_post)

        print("Committing all data...")
        db.session.commit()
        print("✅ Database seeding complete!")

if __name__ == '__main__':
    seed_database()