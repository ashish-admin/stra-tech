#!/usr/bin/env python3
"""
LokDarpan Simple Historical Data Generator
Generates historical political intelligence data for Feb-July 2025
"""

import os
import sys
import random
import hashlib
from datetime import datetime, timedelta, timezone
from typing import List, Dict, Any, Tuple

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import create_app, db
from app.models import Epaper, Post, Alert, Author
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError

class SimpleHistoricalGenerator:
    """Simple historical data generator focused on core tables"""
    
    def __init__(self, start_date: datetime, end_date: datetime):
        self.app = create_app()
        self.start_date = start_date
        self.end_date = end_date
        self.total_days = (end_date - start_date).days
        
        # GHMC ward names
        self.ward_names = [
            "Kapra", "Uppal", "Hayathnagar", "LB Nagar", "Gaddiannaram",
            "Saroornagar", "Kothapet", "Chaitanyapuri", "Malakpet", "Santoshnagar",
            "Chandrayangutta", "Uppuguda", "Lalithabagh", "Dabeerpura", "Kurmaguda",
            "Yakutpura", "Bahadurpura", "Bandlaguda", "Falaknuma", "Nawab Saheb Kunta",
            "Banjara Hills", "Yousufguda", "Jubilee Hills", "Khairatabad", "Somajiguda",
            "Ameerpet", "Sanathnagar", "Erragadda", "Borabanda", "Moosapet",
            "Kukatpally", "Hydernagar", "Miyapur", "Serilingampally", "Hafeezpet",
            "Kondapur", "Madhapur", "Gachibowli", "Lingampally", "Jagadgirigutta",
            "Nizampet", "Bachupally", "Pragathinagar", "Addagutta", "Jeedimetla",
            "Suraram", "Balanagar", "Chintal", "Subhash Nagar", "Alwal",
            "Venkatapuram", "Vivekananda Nagar", "Allwyn Colony", "Macha Bollaram",
            "Yapral", "Turkapally", "Kowkur", "Malkajgiri", "Gautam Nagar",
            "Neredmet", "Vinayak Nagar", "Moula Ali", "East Anandbagh", "Meerpet",
            "Himayath Nagar", "Asif Nagar", "Langar Houz", "Ramnathpur", 
            "Habsiguda", "Marredpally", "Gandhinagar", "Begumpet"
        ]
        
        self.parties = ["BRS", "INC", "BJP", "AIMIM", "TDP", "CPI", "Independent"]
        self.emotions = ["hopeful", "angry", "fearful", "proud", "disappointed", "neutral", "excited"]
        self.publications = [
            "The Hindu", "Deccan Chronicle", "Times of India", 
            "Eenadu", "Sakshi", "Telangana Today", "Hans India"
        ]
        
    def generate_temporal_distribution(self) -> List[Tuple[datetime, float]]:
        """Generate realistic temporal distribution"""
        distribution = []
        current_date = self.start_date
        
        # Key political events for intensity spikes
        key_events = {
            datetime(2025, 2, 14, tzinfo=timezone.utc): 1.4,  # Valentine's Day political events
            datetime(2025, 3, 29, tzinfo=timezone.utc): 1.5,  # Ugadi celebrations 
            datetime(2025, 5, 1, tzinfo=timezone.utc): 1.3,   # May Day rallies
            datetime(2025, 6, 2, tzinfo=timezone.utc): 1.7,   # Telangana Formation Day
        }
        
        while current_date <= self.end_date:
            intensity = 1.0
            
            # Weekday pattern
            if current_date.weekday() < 5:
                intensity *= 1.2
            else:
                intensity *= 0.8
            
            # Event proximity
            for event_date, multiplier in key_events.items():
                days_diff = abs((current_date - event_date).days)
                if days_diff <= 3:
                    intensity *= multiplier
            
            # Progressive increase
            progress = (current_date - self.start_date).days / self.total_days
            intensity *= (1.0 + progress * 0.5)
            
            distribution.append((current_date, intensity))
            current_date += timedelta(days=1)
        
        return distribution
    
    def generate_epapers(self) -> List[int]:
        """Generate historical epaper records"""
        print("Generating historical epapers...")
        epaper_ids = []
        temporal_dist = self.generate_temporal_distribution()
        
        with self.app.app_context():
            for date, intensity in temporal_dist:
                num_epapers = max(1, int(random.randint(3, 6) * intensity))
                
                for i in range(num_epapers):
                    publication = random.choice(self.publications)
                    
                    # Create unique content
                    content = f"Political news from {publication} on {date.strftime('%Y-%m-%d')} edition #{i+1}"
                    sha256 = hashlib.sha256(content.encode()).hexdigest()
                    
                    epaper = Epaper(
                        publication_name=publication,
                        publication_date=date.date(),
                        raw_text=content,
                        sha256=sha256,
                        created_at=date
                    )
                    
                    try:
                        db.session.add(epaper)
                        db.session.commit()
                        epaper_ids.append(epaper.id)
                    except IntegrityError:
                        db.session.rollback()
                        # Skip duplicates
                        continue
        
        print(f"Generated {len(epaper_ids)} epapers")
        return epaper_ids
    
    def generate_posts(self, epaper_ids: List[int]) -> List[int]:
        """Generate historical post records"""
        print("Generating historical posts...")
        post_ids = []
        
        # Ensure authors exist
        with self.app.app_context():
            authors = db.session.query(Author).all()
            if not authors:
                print("Creating authors...")
                author_names = ["Political Desk", "City Reporter", "Electoral Analyst", "Development Beat"]
                for name in author_names:
                    author = Author(name=name)
                    db.session.add(author)
                authors = author_names
                db.session.commit()
                authors = db.session.query(Author).all()
        
        # Political content templates
        content_templates = {
            "development": [
                "New infrastructure project announced for {ward}",
                "Road widening initiative begins in {ward}",
                "Water supply improvement scheme for {ward} residents",
                "Smart city features coming to {ward}",
            ],
            "political": [
                "{party} leader visits {ward} for public meeting",
                "Rally by {party} draws large crowd in {ward}",
                "{party} announces candidate for {ward} constituency",
                "Door-to-door campaign by {party} in {ward}",
            ],
            "governance": [
                "Mayor inspects development works in {ward}",
                "Corporator addresses grievances in {ward}",
                "Budget allocation increased for {ward} development",
                "Government scheme implementation in {ward}",
            ],
            "issues": [
                "Water shortage complaints from {ward} residents",
                "Traffic congestion worsens in {ward}",
                "Garbage collection issues plague {ward}",
                "Power cuts affect {ward} businesses",
            ]
        }
        
        with self.app.app_context():
            temporal_dist = self.generate_temporal_distribution()
            
            for date, intensity in temporal_dist:
                # Generate 15-40 posts per day based on intensity
                num_posts = max(5, int(random.randint(15, 25) * intensity))
                
                for _ in range(num_posts):
                    ward = random.choice(self.ward_names)
                    party = random.choice(self.parties)
                    emotion = random.choice(self.emotions)
                    author = random.choice(authors)
                    
                    # Select content category and template
                    category = random.choice(list(content_templates.keys()))
                    template = random.choice(content_templates[category])
                    
                    # Generate content
                    if "{party}" in template:
                        title = template.format(ward=ward, party=party)
                    else:
                        title = template.format(ward=ward, issue="civic services")
                    
                    full_text = f"{title}. Detailed coverage: This development has significant implications for {ward} residents and {party} supporters in the area."
                    
                    # Link to epaper if available
                    epaper_id = random.choice(epaper_ids) if epaper_ids and random.random() < 0.7 else None
                    
                    post = Post(
                        text=full_text,
                        city=ward,  # Using city field for ward
                        party=party,
                        emotion=emotion,
                        author_id=author.id,
                        epaper_id=epaper_id,
                        created_at=date + timedelta(
                            hours=random.randint(6, 22),
                            minutes=random.randint(0, 59)
                        )
                    )
                    
                    db.session.add(post)
                    post_ids.append(post.id)
                
                # Commit daily batches
                db.session.commit()
        
        print(f"Generated {len(post_ids)} posts")
        return post_ids
    
    def generate_alerts(self) -> List[int]:
        """Generate historical alert records"""
        print("Generating historical alerts...")
        alert_ids = []
        
        alert_templates = [
            "High political activity detected in {ward}",
            "Sentiment shift observed in {ward} - {emotion} trending",
            "Opposition rally planned in {ward}",
            "Development announcement affects {ward} voting patterns",
            "Community concerns rising in {ward}",
            "Party leadership changes in {ward}",
            "Policy impact analysis for {ward}",
            "Electoral momentum building in {ward}"
        ]
        
        severities = ["low", "medium", "high", "critical"]
        
        with self.app.app_context():
            temporal_dist = self.generate_temporal_distribution()
            
            for date, intensity in temporal_dist:
                # Generate 1-5 alerts per day based on intensity
                num_alerts = max(0, int(random.randint(1, 3) * intensity))
                
                for _ in range(num_alerts):
                    ward = random.choice(self.ward_names)
                    emotion = random.choice(self.emotions)
                    severity = random.choice(severities)
                    template = random.choice(alert_templates)
                    
                    message = template.format(ward=ward, emotion=emotion)
                    
                    alert = Alert(
                        ward=ward,
                        description=message,
                        severity=severity,
                        actionable_alerts=f"Recommended actions for {ward}",
                        created_at=date + timedelta(
                            hours=random.randint(8, 20),
                            minutes=random.randint(0, 59)
                        ),
                        updated_at=date + timedelta(
                            hours=random.randint(8, 20),
                            minutes=random.randint(0, 59)
                        )
                    )
                    
                    db.session.add(alert)
                    alert_ids.append(alert.id)
                
                # Commit daily batches
                db.session.commit()
        
        print(f"Generated {len(alert_ids)} alerts")
        return alert_ids
    
    def generate_all_data(self):
        """Main method to generate all historical data"""
        print(f"Starting historical data generation from {self.start_date.date()} to {self.end_date.date()}")
        print(f"Total days: {self.total_days}")
        
        # Generate in sequence
        epaper_ids = self.generate_epapers()
        post_ids = self.generate_posts(epaper_ids)
        alert_ids = self.generate_alerts()
        
        stats = {
            "date_range": f"{self.start_date.date()} to {self.end_date.date()}",
            "total_days": self.total_days,
            "epapers_generated": len(epaper_ids),
            "posts_generated": len(post_ids),
            "alerts_generated": len(alert_ids),
            "wards_covered": len(self.ward_names)
        }
        
        print("\n=== Historical Data Generation Complete ===")
        for key, value in stats.items():
            print(f"{key}: {value}")
        
        return stats


def main():
    """Main execution function"""
    # Generate data for February 1 - July 22, 2025 (5.5 months)
    start_date = datetime(2025, 2, 1, tzinfo=timezone.utc)
    end_date = datetime(2025, 7, 22, tzinfo=timezone.utc)
    
    generator = SimpleHistoricalGenerator(start_date, end_date)
    stats = generator.generate_all_data()
    
    print("\n✅ Historical data generation completed successfully!")
    print("LokDarpan now has 6 months of political intelligence data.")


if __name__ == "__main__":
    main()