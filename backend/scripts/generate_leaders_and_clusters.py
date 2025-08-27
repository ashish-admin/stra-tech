#!/usr/bin/env python3
"""
Generate leaders, leader mentions, and issue clusters for historical data
"""

import os
import sys
import random
import json
from datetime import datetime, timedelta, timezone

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import create_app, db
from sqlalchemy import text

def generate_leaders_and_clusters():
    """Generate leaders, mentions, and issue clusters"""
    app = create_app()
    
    # Date range
    start_date = datetime(2025, 2, 1, tzinfo=timezone.utc)
    end_date = datetime(2025, 7, 22, tzinfo=timezone.utc)
    
    # Ward names
    ward_names = [
        "Kapra", "Uppal", "Hayathnagar", "LB Nagar", "Banjara Hills", 
        "Jubilee Hills", "Khairatabad", "Ameerpet", "Kukatpally", 
        "Miyapur", "Himayath Nagar", "Asif Nagar", "Begumpet"
    ]
    
    parties = ["BRS", "INC", "BJP", "AIMIM", "TDP"]
    
    # Political leaders for Hyderabad
    leaders_data = [
        ("K. Chandrashekar Rao", "BRS", "Chief Minister", "Gajwel"),
        ("A. Revanth Reddy", "INC", "State President", "Kodangal"), 
        ("Bandi Sanjay Kumar", "BJP", "State President", "Karimnagar"),
        ("Asaduddin Owaisi", "AIMIM", "MP", "Hyderabad"),
        ("Akbaruddin Owaisi", "AIMIM", "MLA", "Chandrayangutta"),
        ("T. Harish Rao", "BRS", "Minister", "Siddipet"),
        ("Mahmood Ali", "INC", "Former Minister", "Nizamabad Urban"),
        ("G. Kishan Reddy", "BJP", "Union Minister", "Secunderabad"),
        ("Mohammed Saleem", "AIMIM", "Corporator", "Old City"),
        ("Danam Nagender", "BJP", "MLA", "Khairatabad"),
        ("Jagadish Reddy", "BRS", "Minister", "Suryapet"),
        ("Komatireddy Venkat Reddy", "INC", "MP", "Bhongir")
    ]
    
    # Issue clusters
    issue_keywords = {
        "water_crisis": ["water", "shortage", "supply", "tankers", "crisis"],
        "traffic_issues": ["traffic", "congestion", "roads", "metro", "transport"],
        "development": ["infrastructure", "construction", "development", "projects"],
        "governance": ["corruption", "administration", "services", "government"],
        "elections": ["campaign", "voting", "election", "candidate", "rally"],
        "community": ["festival", "religious", "community", "social", "cultural"],
        "economy": ["jobs", "employment", "business", "economy", "growth"]
    }
    
    print("Generating leaders, mentions, and issue clusters...")
    
    with app.app_context():
        # 1. Generate Leaders
        leader_ids = []
        for name, party, role, constituency in leaders_data:
            # Check if leader already exists
            existing = db.session.execute(
                text("SELECT id FROM leader WHERE name = :name"),
                {"name": name}
            ).fetchone()
            
            if not existing:
                result = db.session.execute(text("""
                    INSERT INTO leader (name, party, role, ward, first_seen, last_seen)
                    VALUES (:name, :party, :role, :ward, :first_seen, :last_seen)
                    RETURNING id
                """), {
                    "name": name,
                    "party": party, 
                    "role": role,
                    "ward": random.choice(ward_names),
                    "first_seen": start_date,
                    "last_seen": end_date
                })
                leader_id = result.fetchone()[0]
                leader_ids.append(leader_id)
        
        db.session.commit()
        print(f"Generated {len(leader_ids)} leaders")
        
        # 2. Generate Leader Mentions
        mention_count = 0
        current_date = start_date
        
        while current_date <= end_date:
            # Generate 5-15 mentions per day
            num_mentions = random.randint(3, 10)
            
            for _ in range(num_mentions):
                leader_id = random.choice(leader_ids) if leader_ids else 1
                sentiment = random.uniform(-1.0, 1.0)
                
                db.session.execute(text("""
                    INSERT INTO leader_mention (leader_id, source_type, source_id, sentiment, created_at)
                    VALUES (:leader_id, :source_type, :source_id, :sentiment, :created_at)
                """), {
                    "leader_id": leader_id,
                    "source_type": random.choice(["post", "epaper", "social"]),
                    "source_id": random.randint(1, 1000),
                    "sentiment": sentiment,
                    "created_at": current_date + timedelta(
                        hours=random.randint(6, 22),
                        minutes=random.randint(0, 59)
                    )
                })
                mention_count += 1
            
            current_date += timedelta(days=1)
        
        db.session.commit()
        print(f"Generated {mention_count} leader mentions")
        
        # 3. Generate Issue Clusters
        cluster_count = 0
        current_date = start_date
        
        # Generate weekly clusters
        while current_date <= end_date:
            for ward in ward_names:
                # Generate 2-4 issue clusters per ward per week
                num_clusters = random.randint(1, 3)
                
                for _ in range(num_clusters):
                    issue_type = random.choice(list(issue_keywords.keys()))
                    keywords = issue_keywords[issue_type]
                    
                    db.session.execute(text("""
                        INSERT INTO issue_cluster (ward, label, keywords, sentiment, volume, momentum, "window", updated_at)
                        VALUES (:ward, :label, :keywords, :sentiment, :volume, :momentum, :window, :updated_at)
                    """), {
                        "ward": ward,
                        "label": issue_type.replace("_", " ").title(),
                        "keywords": json.dumps(keywords),
                        "sentiment": random.uniform(-0.8, 0.8),
                        "volume": random.randint(10, 500),
                        "momentum": random.uniform(-0.5, 0.5),
                        "window": f"week_{current_date.strftime('%Y_%W')}",
                        "updated_at": current_date
                    })
                    cluster_count += 1
            
            current_date += timedelta(weeks=1)
        
        db.session.commit()
        print(f"Generated {cluster_count} issue clusters")
    
    return len(leader_ids), mention_count, cluster_count

if __name__ == "__main__":
    leaders, mentions, clusters = generate_leaders_and_clusters()
    print(f"✅ Leaders and clusters generation complete:")
    print(f"   Leaders: {leaders}")
    print(f"   Mentions: {mentions}")  
    print(f"   Issue Clusters: {clusters}")