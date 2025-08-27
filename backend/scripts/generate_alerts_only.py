#!/usr/bin/env python3
"""
Generate only alerts for the historical data
"""

import os
import sys
import random
from datetime import datetime, timedelta, timezone

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import create_app, db
from app.models import Alert

def generate_alerts_only():
    """Generate historical alerts only"""
    app = create_app()
    
    # Date range
    start_date = datetime(2025, 2, 1, tzinfo=timezone.utc)
    end_date = datetime(2025, 7, 22, tzinfo=timezone.utc)
    
    # Ward names
    ward_names = [
        "Kapra", "Uppal", "Hayathnagar", "LB Nagar", "Gaddiannaram",
        "Saroornagar", "Kothapet", "Chaitanyapuri", "Malakpet", "Santoshnagar",
        "Banjara Hills", "Yousufguda", "Jubilee Hills", "Khairatabad", "Somajiguda",
        "Ameerpet", "Sanathnagar", "Erragadda", "Borabanda", "Moosapet",
        "Kukatpally", "Hydernagar", "Miyapur", "Serilingampally", "Hafeezpet",
        "Himayath Nagar", "Asif Nagar", "Langar Houz", "Ramnathpur", 
        "Habsiguda", "Marredpally", "Gandhinagar", "Begumpet"
    ]
    
    emotions = ["hopeful", "angry", "fearful", "proud", "disappointed", "neutral", "excited"]
    severities = ["low", "medium", "high", "critical"]
    
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
    
    print("Generating historical alerts...")
    alert_ids = []
    
    with app.app_context():
        current_date = start_date
        
        while current_date <= end_date:
            # Base intensity with some randomness
            intensity = random.uniform(0.8, 1.5)
            
            # Special events boost
            if current_date.month == 6 and current_date.day == 2:  # Telangana Formation Day
                intensity *= 2.0
            elif current_date.month == 5 and current_date.day == 1:  # May Day
                intensity *= 1.5
            
            # Generate 0-4 alerts per day based on intensity
            num_alerts = max(0, int(random.randint(0, 2) * intensity))
            
            for _ in range(num_alerts):
                ward = random.choice(ward_names)
                emotion = random.choice(emotions)
                severity = random.choice(severities)
                template = random.choice(alert_templates)
                
                message = template.format(ward=ward, emotion=emotion)
                
                alert = Alert(
                    ward=ward,
                    description=message,
                    severity=severity,
                    actionable_alerts=f"Recommended actions for {ward} - Monitor {emotion} sentiment",
                    opportunities=f"Leverage positive developments in {ward}",
                    threats=f"Address concerns in {ward} constituency",
                    source_articles=f"Based on local news analysis from {ward}",
                    created_at=current_date + timedelta(
                        hours=random.randint(8, 20),
                        minutes=random.randint(0, 59)
                    ),
                    updated_at=current_date + timedelta(
                        hours=random.randint(8, 20),
                        minutes=random.randint(0, 59)
                    )
                )
                
                db.session.add(alert)
                alert_ids.append(alert.id)
            
            current_date += timedelta(days=1)
        
        db.session.commit()
    
    print(f"Generated {len(alert_ids)} alerts")
    return len(alert_ids)

if __name__ == "__main__":
    count = generate_alerts_only()
    print(f"✅ Alert generation complete: {count} alerts created")