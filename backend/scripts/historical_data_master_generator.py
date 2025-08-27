#!/usr/bin/env python3
"""
LokDarpan Historical Data Master Generator
Generates 6 months of realistic political intelligence data (Feb-Aug 2025)
"""

import os
import sys
import random
import hashlib
from datetime import datetime, timedelta, timezone
from typing import List, Dict, Any, Tuple
import json
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import create_app, db
from app.models import (
    Epaper, Post, Alert, Author, User,
    WardProfile, WardDemographics, WardFeatures
)
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError

class HistoricalDataGenerator:
    """Generates comprehensive historical political data for LokDarpan"""
    
    def __init__(self, start_date: datetime, end_date: datetime):
        self.app = create_app()
        self.start_date = start_date
        self.end_date = end_date
        self.total_days = (end_date - start_date).days
        
        # Hyderabad ward names (150 GHMC wards)
        self.ward_names = [
            "Kapra", "Uppal", "Hayathnagar", "LB Nagar", "Gaddiannaram",
            "Saroornagar", "Kothapet", "Chaitanyapuri", "Malakpet", "Santoshnagar",
            "Chandrayangutta", "Uppuguda", "Lalithabagh", "Dabeerpura", "Kurmaguda",
            "Yakutpura", "Bahadurpura", "Bandlaguda", "Falaknuma", "Nawab Saheb Kunta",
            "Doodh Bowli", "Jahanuma", "Rein Bazar", "Pathergatti", "Moghalpura",
            "Talabchanchalam", "Gowlipura", "Mehdipatnam", "Gudimalkapur", "Asif Nagar",
            "Shaikpet", "Tolichowki", "Nanalnagar", "Red Hills", "Mehdipatnam",
            "Vijaynagar Colony", "Banjara Hills", "Yousufguda", "Jubilee Hills", "Khairatabad",
            "Somajiguda", "Ameerpet", "Sanathnagar", "Erragadda", "Borabanda",
            "Moosapet", "Kukatpally", "Hydernagar", "Miyapur", "Serilingampally",
            "Hafeezpet", "Kondapur", "Madhapur", "Gachibowli", "Lingampally",
            "Jagadgirigutta", "Nizampet", "Bachupally", "Pragathinagar", "Addagutta",
            "Jeedimetla", "Suraram", "Balanagar", "Chintal", "Subhash Nagar",
            "Alwal", "Venkatapuram", "Kukatpally East", "Vivekananda Nagar", "Hydernagar",
            "Allwyn Colony", "Macha Bollaram", "Yapral", "Turkapally", "Kowkur",
            "Alwal", "Malkajgiri", "Gautam Nagar", "Addagutta", "Ammuguda",
            "Neredmet", "Vinayak Nagar", "Moula Ali", "East Anandbagh", "Meerpet",
            "Jillelguda", "Nadergul", "Saroornagar", "Kothapet", "Chaitanyapuri",
            "Gaddiannaram", "Nagole", "Mansoorabad", "Hayathnagar", "BN Reddy Nagar",
            "Vanasthalipuram", "Hastinapuram", "Champapet", "Lingojiguda", "Saroornagar",
            "Badangpet", "Madannapet", "Karmanghat", "Green Park Colony", "IS Sadan",
            "Saidabad", "Moosarambagh", "Old Malakpet", "Akberbagh", "Dabeerpura",
            "Azampura", "Charminar", "Ghansi Bazaar", "Begum Bazaar", "Goshamahal",
            "Mangalhat", "Shah Ali Banda", "Moghalpura", "Karwan", "Langar Houz",
            "Golconda", "Toli Chowki", "Mehdipatnam West", "Gudimalkapur", "Asif Nagar",
            "Film Nagar", "Shaikpet", "Jubilee Hills", "Madhapur", "Serilingampally",
            "Miyapur", "Hafeezpet", "Chandanagar", "Gangaram", "Patancheru",
            "Ramachandrapuram", "Gajularamaram", "Jagadgirigutta", "KPHB Colony", "Nizampet",
            "Allapur", "Madinaguda", "Chanda Nagar", "HMT Colony", "Fateh Nagar"
        ]
        
        # Political parties in Telangana
        self.parties = ["BRS", "INC", "BJP", "AIMIM", "TDP", "CPI", "CPM", "Independent"]
        
        # Political emotions for sentiment analysis
        self.emotions = ["hopeful", "angry", "fearful", "proud", "disappointed", "neutral", "excited"]
        
        # News sources
        self.publications = [
            "The Hindu", "Deccan Chronicle", "Times of India", 
            "Eenadu", "Sakshi", "Telangana Today", "Hans India",
            "NewsMeter", "The Siasat Daily", "Namaste Telangana"
        ]
        
        # Political event templates for realistic content
        self.event_templates = self._load_event_templates()
        
    def _load_event_templates(self) -> Dict[str, List[str]]:
        """Load political event templates for content generation"""
        return {
            "development": [
                "New infrastructure project announced for {ward}",
                "Road widening initiative begins in {ward}",
                "Metro expansion plans revealed for {ward} area",
                "Water supply improvement scheme for {ward} residents",
                "Smart city features coming to {ward}",
                "New hospital construction approved in {ward}",
                "Educational infrastructure boost for {ward} schools",
                "Park renovation project launched in {ward}"
            ],
            "political": [
                "{party} leader visits {ward} for public meeting",
                "Rally by {party} draws large crowd in {ward}",
                "{party} announces candidate for {ward} constituency",
                "Political tensions rise in {ward} over {issue}",
                "Door-to-door campaign by {party} in {ward}",
                "{party} promises development if elected in {ward}",
                "Opposition protests in {ward} against {issue}",
                "Political alliance formed for {ward} elections"
            ],
            "governance": [
                "Mayor inspects development works in {ward}",
                "Corporator addresses grievances in {ward}",
                "Public hearing conducted in {ward} for civic issues",
                "Government scheme implementation in {ward}",
                "Administrative changes announced for {ward}",
                "Budget allocation increased for {ward} development",
                "New policy affects {ward} residents",
                "Officials review progress in {ward}"
            ],
            "issues": [
                "Water shortage complaints from {ward} residents",
                "Traffic congestion worsens in {ward}",
                "Garbage collection issues plague {ward}",
                "Power cuts affect {ward} businesses",
                "Flooding concerns raised in {ward}",
                "Encroachment drive in {ward} faces resistance",
                "Law and order situation in {ward} discussed",
                "Pollution levels spike in {ward} area"
            ],
            "community": [
                "Festival celebrations in {ward} bring communities together",
                "Community welfare program launched in {ward}",
                "Youth employment drive in {ward}",
                "Women's self-help groups flourish in {ward}",
                "Senior citizen welfare scheme in {ward}",
                "Cultural event organized in {ward}",
                "Sports tournament held in {ward}",
                "Health camp conducted in {ward}"
            ]
        }
    
    def generate_temporal_distribution(self) -> List[Tuple[datetime, float]]:
        """Generate realistic temporal distribution with political event clustering"""
        distribution = []
        current_date = self.start_date
        
        # Key political events in the timeline (Feb-Aug 2025)
        key_events = {
            datetime(2025, 2, 14, tzinfo=timezone.utc): 1.5,  # Valentine's Day protests
            datetime(2025, 3, 8, tzinfo=timezone.utc): 1.3,   # Women's Day political events
            datetime(2025, 3, 29, tzinfo=timezone.utc): 1.4,  # Ugadi celebrations
            datetime(2025, 4, 14, tzinfo=timezone.utc): 1.2,  # Ambedkar Jayanti
            datetime(2025, 5, 1, tzinfo=timezone.utc): 1.3,   # May Day rallies
            datetime(2025, 6, 2, tzinfo=timezone.utc): 1.6,   # Telangana Formation Day
            datetime(2025, 7, 15, tzinfo=timezone.utc): 1.2,  # Mid-year governance review
            datetime(2025, 8, 15, tzinfo=timezone.utc): 1.7,  # Independence Day
        }
        
        while current_date <= self.end_date:
            # Base intensity
            intensity = 1.0
            
            # Add weekly pattern (more activity on weekdays)
            if current_date.weekday() < 5:  # Monday to Friday
                intensity *= 1.2
            else:  # Weekend
                intensity *= 0.8
            
            # Check for proximity to key events
            for event_date, multiplier in key_events.items():
                days_diff = abs((current_date - event_date).days)
                if days_diff <= 3:  # Within 3 days of event
                    intensity *= multiplier
            
            # Progressive increase towards recent dates
            progress = (current_date - self.start_date).days / self.total_days
            intensity *= (1.0 + progress * 0.7)  # Up to 70% increase by end
            
            distribution.append((current_date, intensity))
            current_date += timedelta(days=1)
        
        return distribution
    
    def generate_epapers(self, session_context: Any) -> List[int]:
        """Generate historical epaper records"""
        print("Generating historical epapers...")
        epaper_ids = []
        temporal_dist = self.generate_temporal_distribution()
        
        for date, intensity in temporal_dist:
            # Generate 3-8 epapers per day based on intensity
            num_epapers = int(random.randint(3, 5) * intensity)
            
            for _ in range(num_epapers):
                publication = random.choice(self.publications)
                
                # Create unique content for deduplication
                content = f"Political developments in Hyderabad on {date.strftime('%Y-%m-%d')}"
                sha256 = hashlib.sha256(content.encode()).hexdigest()
                
                epaper = Epaper(
                    publication_name=publication,
                    publication_date=date.strftime("%Y-%m-%d"),
                    created_at=date,
                    sha256=sha256
                )
                
                try:
                    session_context.add(epaper)
                    session_context.flush()
                    epaper_ids.append(epaper.id)
                except IntegrityError:
                    session_context.rollback()
                    continue
        
        session_context.commit()
        print(f"Generated {len(epaper_ids)} epapers")
        return epaper_ids
    
    def generate_posts(self, epaper_ids: List[int], session_context: Any) -> List[int]:
        """Generate political posts with realistic content"""
        print("Generating historical posts...")
        post_ids = []
        authors = self._ensure_authors(session_context)
        temporal_dist = self.generate_temporal_distribution()
        
        for date, intensity in temporal_dist:
            # Generate 15-30 posts per day based on intensity
            num_posts = int(random.randint(15, 20) * intensity)
            
            for _ in range(num_posts):
                ward = random.choice(self.ward_names)
                event_type = random.choice(list(self.event_templates.keys()))
                template = random.choice(self.event_templates[event_type])
                party = random.choice(self.parties)
                
                # Generate title and body
                title = template.format(
                    ward=ward, 
                    party=party, 
                    issue=random.choice(["development", "water supply", "traffic", "governance"])
                )
                
                body = self._generate_post_body(title, ward, party, event_type)
                
                # Determine sentiment based on event type
                if event_type in ["development", "community"]:
                    emotion = random.choice(["hopeful", "excited", "proud", "neutral"])
                elif event_type == "issues":
                    emotion = random.choice(["angry", "disappointed", "fearful", "neutral"])
                else:
                    emotion = random.choice(self.emotions)
                
                # Party affiliation logic
                party_mentioned = party if random.random() > 0.3 else None
                
                post = Post(
                    city=ward,
                    title=title,
                    text=body,
                    emotion=emotion,
                    party=party_mentioned,
                    epaper_id=random.choice(epaper_ids) if epaper_ids and random.random() > 0.4 else None,
                    author_id=random.choice([a.id for a in authors]) if random.random() > 0.3 else None,
                    driver=event_type,
                    created_at=date + timedelta(hours=random.randint(0, 23), minutes=random.randint(0, 59))
                )
                
                session_context.add(post)
                post_ids.append(post.id)
        
        session_context.commit()
        print(f"Generated {len(post_ids)} posts")
        return post_ids
    
    def _generate_post_body(self, title: str, ward: str, party: str, event_type: str) -> str:
        """Generate realistic post body content"""
        templates = {
            "development": f"""
                {title}. The initiative is expected to benefit thousands of residents in {ward}.
                Local leaders from {party} have welcomed the announcement, stating it will address 
                long-standing demands of the community. The project is scheduled to complete within 
                the next 6 months with an allocated budget. Residents express optimism about the 
                positive impact on their daily lives and local economy.
            """,
            "political": f"""
                {title}. The event witnessed significant participation from party workers and supporters.
                Key issues discussed included local development, employment, and civic amenities.
                {party} leadership emphasized their commitment to {ward}'s progress and outlined 
                their vision for the constituency. The gathering also saw criticism of opposition 
                parties' policies and governance record.
            """,
            "governance": f"""
                {title}. Officials conducted a comprehensive review of ongoing projects and citizen 
                grievances in {ward}. Several immediate measures were announced to address pressing 
                concerns. The administration assured residents of time-bound resolution of pending 
                issues and regular monitoring of development works.
            """,
            "issues": f"""
                {title}. Residents of {ward} have been facing this problem for several weeks now,
                affecting their daily routine and quality of life. Local representatives have been 
                urged to take immediate action. Citizen groups are planning to escalate the matter 
                if not resolved soon. The issue highlights the need for better urban planning and 
                infrastructure maintenance.
            """,
            "community": f"""
                {title}. The event brought together people from diverse backgrounds in {ward},
                fostering community harmony and social cohesion. Local organizations and volunteers 
                played a key role in organizing the initiative. Participants appreciated the effort 
                and called for more such programs to strengthen community bonds.
            """
        }
        return templates.get(event_type, f"{title}. Further details awaited.").strip()
    
    def generate_alerts(self, session_context: Any) -> List[int]:
        """Generate strategic intelligence alerts"""
        print("Generating historical alerts...")
        alert_ids = []
        temporal_dist = self.generate_temporal_distribution()
        
        alert_templates = [
            {"type": "opportunity", "template": "Political opportunity in {ward}: {detail}"},
            {"type": "threat", "template": "Emerging threat in {ward}: {detail}"},
            {"type": "development", "template": "Major development in {ward}: {detail}"},
            {"type": "competition", "template": "{party} activity alert in {ward}: {detail}"},
            {"type": "sentiment", "template": "Sentiment shift detected in {ward}: {detail}"}
        ]
        
        details = [
            "Favorable public opinion on recent initiatives",
            "Opposition mobilization detected",
            "Infrastructure project gaining traction",
            "Social media campaign showing results",
            "Community leaders expressing support",
            "Negative sentiment on specific policy",
            "Competitive party gaining ground",
            "Media coverage opportunity identified"
        ]
        
        for date, intensity in temporal_dist:
            # Generate 2-5 alerts per day based on intensity
            num_alerts = int(random.randint(2, 3) * intensity)
            
            for _ in range(num_alerts):
                alert_type = random.choice(alert_templates)
                ward = random.choice(self.ward_names)
                party = random.choice(self.parties)
                detail = random.choice(details)
                
                alert = Alert(
                    ward=ward,
                    title=alert_type["template"].format(ward=ward, party=party, detail=detail),
                    description=f"Strategic intelligence indicates {detail.lower()} in {ward}. "
                              f"This development requires immediate attention and strategic response. "
                              f"Recommended actions have been identified for campaign team consideration.",
                    severity=random.choice(["high", "medium", "low"]),
                    type=alert_type["type"],
                    created_at=date + timedelta(hours=random.randint(6, 20))
                )
                
                session_context.add(alert)
                alert_ids.append(alert.id)
        
        session_context.commit()
        print(f"Generated {len(alert_ids)} alerts")
        return alert_ids
    
    def generate_summaries(self, session_context: Any) -> List[int]:
        """Generate AI-powered strategic summaries"""
        print("Generating historical summaries...")
        summary_ids = []
        
        # Generate weekly summaries for each ward
        current_date = self.start_date
        while current_date <= self.end_date:
            for ward in random.sample(self.ward_names, k=min(30, len(self.ward_names))):  # 30 wards per week
                summary = Summary(
                    ward=ward,
                    date=current_date.date(),
                    content={
                        "overview": f"Weekly strategic analysis for {ward}",
                        "key_developments": [
                            f"Development initiative progress in {ward}",
                            f"Political activity by major parties",
                            f"Community sentiment analysis"
                        ],
                        "opportunities": [
                            "Favorable public opinion on infrastructure",
                            "Community leader support available"
                        ],
                        "threats": [
                            "Opposition mobilization in certain areas",
                            "Pending civic issues need attention"
                        ],
                        "recommendations": [
                            "Increase ground presence in key areas",
                            "Address pending civic grievances",
                            "Leverage positive sentiment on development"
                        ]
                    },
                    created_at=current_date
                )
                
                session_context.add(summary)
                summary_ids.append(summary.id)
            
            current_date += timedelta(weeks=1)
        
        session_context.commit()
        print(f"Generated {len(summary_ids)} summaries")
        return summary_ids
    
    def _ensure_authors(self, session_context: Any) -> List[Author]:
        """Ensure authors exist in database"""
        existing_authors = session_context.query(Author).all()
        if len(existing_authors) >= 10:
            return existing_authors
        
        print("Creating authors...")
        author_names = [
            "Political Desk", "City Reporter", "Electoral Analyst",
            "Development Beat", "Governance Desk", "Community Reporter",
            "Opposition Voice", "Ruling Party Desk", "Independent Analyst",
            "Field Reporter", "Senior Editor", "Data Team"
        ]
        
        authors = []
        for name in author_names:
            author = Author(name=name)
            session_context.add(author)
            authors.append(author)
        
        session_context.commit()
        return authors
    
    def generate_all_historical_data(self):
        """Main method to generate all historical data"""
        with self.app.app_context():
            print(f"Starting historical data generation from {self.start_date.date()} to {self.end_date.date()}")
            print(f"Total days: {self.total_days}")
            
            # Generate data in sequence
            epaper_ids = self.generate_epapers(db.session)
            post_ids = self.generate_posts(epaper_ids, db.session)
            alert_ids = self.generate_alerts(db.session)
            
            # Summary generation disabled due to model not available
            summary_ids = []
            
            # Generate statistics
            stats = {
                "date_range": f"{self.start_date.date()} to {self.end_date.date()}",
                "total_days": self.total_days,
                "epapers_generated": len(epaper_ids),
                "posts_generated": len(post_ids),
                "alerts_generated": len(alert_ids),
                "summaries_generated": len(summary_ids),
                "wards_covered": len(self.ward_names),
                "parties_included": len(self.parties)
            }
            
            print("\n=== Historical Data Generation Complete ===")
            for key, value in stats.items():
                print(f"{key}: {value}")
            
            # Save statistics to file
            stats_file = Path(__file__).parent / "historical_generation_stats.json"
            with open(stats_file, 'w') as f:
                json.dump(stats, f, indent=2, default=str)
            print(f"\nStatistics saved to: {stats_file}")
            
            return stats


def main():
    """Main execution function"""
    # Define 6-month historical period (Feb-Aug 2025)
    start_date = datetime(2025, 2, 1, tzinfo=timezone.utc)
    end_date = datetime(2025, 8, 25, tzinfo=timezone.utc)
    
    # Create generator and run
    generator = HistoricalDataGenerator(start_date, end_date)
    stats = generator.generate_all_historical_data()
    
    print("\n✅ Historical data generation completed successfully!")
    print("You can now use the LokDarpan dashboard to view 6 months of political intelligence data.")


if __name__ == "__main__":
    main()