#!/usr/bin/env python3
"""
Hyderabad Political Data Enricher
Focused data seeding script for realistic political intelligence across all GHMC wards

This script creates comprehensive, realistic political data specifically tailored
to Hyderabad's political landscape including:
- Ward-specific political issues and demographics
- Realistic party dynamics (BJP, INC, BRS, AIMIM, TDP)
- Current political topics and sentiment analysis
- Leader mentions and issue clusters
- Strategic intelligence alerts

Author: Database Migration Specialist
Date: August 2025
"""

import os
import sys
import json
import random
import hashlib
from datetime import datetime, timedelta, timezone

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from app import create_app
from app.models import db, Post, Author, Epaper, Alert
from app.models_ai import Summary, Leader, LeaderMention, IssueCluster
from sqlalchemy import func


class HyderabadPoliticalDataEnricher:
    """Specialized data enricher for Hyderabad political intelligence"""
    
    def __init__(self):
        self.app = create_app()
        
        # Comprehensive Hyderabad political context
        self.hyderabad_issues = [
            'water supply crisis', 'drainage and flooding', 'traffic congestion', 'metro connectivity',
            'IT corridor development', 'old city preservation', 'illegal construction', 'waste management',
            'air pollution', 'lake restoration', 'heritage conservation', 'affordable housing',
            'power cuts', 'internet infrastructure', 'healthcare facilities', 'education quality',
            'women safety', 'youth employment', 'senior citizen welfare', 'street vendor regulation',
            'auto rickshaw fare', 'vegetable market pricing', 'community hall access', 'park maintenance',
            'street lighting', 'road repairs', 'public transport', 'minority rights',
            'religious harmony', 'property tax disputes', 'building permissions', 'slum rehabilitation'
        ]
        
        self.major_leaders = {
            'BJP': ['K Laxman', 'Bandi Sanjay Kumar', 'T Raja Singh', 'G Kishan Reddy', 'Raghunandan Rao'],
            'INC': ['Revanth Reddy', 'Uttam Kumar Reddy', 'Danam Nagender', 'Jagga Reddy', 'Marri Shashidhar Reddy'],
            'BRS': ['K Chandrashekar Rao', 'KT Rama Rao', 'Harish Rao', 'Srinivas Goud', 'Sabitha Indra Reddy'],
            'AIMIM': ['Asaduddin Owaisi', 'Akbaruddin Owaisi', 'Ahmed Balala', 'Jaffar Hussain', 'Kausar Mohiuddin'],
            'TDP': ['N Chandrababu Naidu', 'Nara Lokesh', 'Revanth Reddy']
        }
        
        self.emotions = ['Hopeful', 'Frustrated', 'Anger', 'Positive', 'Negative', 'Neutral', 'Sadness']
        self.publications = ['The Hindu', 'Times of India', 'Deccan Chronicle', 'Sakshi', 'Eenadu', 
                           'Telangana Today', 'Hans India', 'Deccan Herald', 'The News Minute']
        
        # Ward demographics and political patterns
        self.ward_patterns = self._initialize_ward_patterns()
    
    def _initialize_ward_patterns(self) -> dict:
        """Initialize realistic ward-specific political patterns"""
        patterns = {
            'old_city_muslim': {
                'dominant_parties': ['AIMIM', 'BRS', 'INC'],
                'key_issues': ['minority rights', 'old city infrastructure', 'heritage preservation', 'education'],
                'sentiment_tendency': ['Hopeful', 'Frustrated', 'Positive'],
                'leader_focus': ['AIMIM', 'BRS']
            },
            'affluent_hindu': {
                'dominant_parties': ['BJP', 'INC', 'BRS'],
                'key_issues': ['infrastructure', 'security', 'traffic management', 'elite services'],
                'sentiment_tendency': ['Positive', 'Frustrated', 'Neutral'],
                'leader_focus': ['BJP', 'INC']
            },
            'middle_class_mixed': {
                'dominant_parties': ['BJP', 'BRS', 'INC'],
                'key_issues': ['water supply', 'education', 'healthcare', 'employment'],
                'sentiment_tendency': ['Hopeful', 'Frustrated', 'Neutral'],
                'leader_focus': ['BJP', 'BRS', 'INC']
            },
            'working_class': {
                'dominant_parties': ['BRS', 'INC', 'AIMIM'],
                'key_issues': ['employment', 'basic amenities', 'housing', 'transport'],
                'sentiment_tendency': ['Frustrated', 'Hopeful', 'Anger'],
                'leader_focus': ['BRS', 'INC']
            },
            'tech_corridor': {
                'dominant_parties': ['BJP', 'BRS', 'INC'],
                'key_issues': ['IT infrastructure', 'connectivity', 'traffic', 'modern amenities'],
                'sentiment_tendency': ['Positive', 'Neutral', 'Frustrated'],
                'leader_focus': ['BJP', 'BRS']
            },
            'suburban_growth': {
                'dominant_parties': ['BJP', 'BRS', 'INC'],
                'key_issues': ['suburban development', 'connectivity', 'schools', 'water supply'],
                'sentiment_tendency': ['Hopeful', 'Positive', 'Neutral'],
                'leader_focus': ['BJP', 'BRS']
            }
        }
        return patterns
    
    def classify_ward(self, ward_number: int) -> dict:
        """Classify ward based on realistic Hyderabad demographics"""
        # Old City wards (1-30): Predominantly Muslim, AIMIM strong
        if 1 <= ward_number <= 30:
            return self.ward_patterns['old_city_muslim']
        
        # Affluent Central wards (31-60): Mixed affluent areas
        elif 31 <= ward_number <= 60:
            return self.ward_patterns['affluent_hindu']
        
        # IT Corridor wards (61-90): Tech professionals
        elif 61 <= ward_number <= 90:
            return self.ward_patterns['tech_corridor']
        
        # Suburban wards (91-120): Growing suburban areas
        elif 91 <= ward_number <= 120:
            return self.ward_patterns['suburban_growth']
        
        # Outer wards (121-150): Mixed working class
        else:
            return random.choice([
                self.ward_patterns['middle_class_mixed'],
                self.ward_patterns['working_class']
            ])
    
    def generate_realistic_article(self, ward_name: str, ward_config: dict) -> str:
        """Generate realistic political article for specific ward"""
        dominant_party = ward_config['dominant_parties'][0]
        opposition_party = ward_config['dominant_parties'][1]
        primary_issue = random.choice(ward_config['key_issues'])
        secondary_issue = random.choice([issue for issue in ward_config['key_issues'] if issue != primary_issue])
        
        article = f"""
Political dynamics in {ward_name} have intensified following recent developments around {primary_issue}, 
creating strategic implications for the upcoming electoral cycle. {dominant_party} leadership faces 
mounting pressure from community groups demanding immediate action on {secondary_issue} concerns that 
have persisted for over six months without adequate resolution.

Local residents have organized multiple delegations to party offices, expressing frustration with the 
current administration's approach to {primary_issue} management. The community's dissatisfaction has 
created openings for {opposition_party} to present alternative governance models focused on participatory 
decision-making and rapid issue resolution.

Recent polling data suggests shifting voter preferences in {ward_name}, with traditional party loyalties 
giving way to issue-based candidate evaluation. This transformation has forced all major parties to 
invest more heavily in grassroots engagement rather than relying on historical vote bank mobilization 
strategies that proved effective in previous election cycles.

{opposition_party} has capitalized on this opportunity by announcing comprehensive policy proposals 
specifically addressing {primary_issue} through innovative governance approaches. Their strategy emphasizes 
direct community consultation and transparent resource allocation, contrasting sharply with the incumbent 
party's centralized decision-making process.

The economic implications of {secondary_issue} extend beyond immediate governance concerns, affecting 
local business confidence and long-term investment decisions. Several community organizations have 
documented specific impacts, creating compelling evidence for policy reform advocacy that transcends 
traditional political boundaries.

Digital engagement trends show increased political participation among younger voters, who utilize 
social media platforms to organize advocacy initiatives around {primary_issue}. This demographic shift 
requires parties to adapt their communication strategies significantly, moving beyond traditional 
campaigning toward continuous community engagement and policy transparency.

Community leaders have emerged as influential mediators between residents and political leadership, 
developing sophisticated advocacy capabilities that elevate policy discourse quality. Their documentation 
of service gaps and solution proposals has forced parties to engage with technical details rather than 
relying solely on emotional appeals.

Looking ahead, successful political engagement in {ward_name} will require synthesis of responsive 
governance, community partnership, and strategic communication that addresses both immediate {primary_issue} 
concerns and long-term development aspirations. The constituency's trajectory offers valuable insights 
into evolving urban political dynamics.
        """.strip()
        
        return article
    
    def create_political_posts(self, ward_name: str, ward_config: dict, article_content: str) -> list:
        """Create multiple political analysis posts from article content"""
        dominant_party = ward_config['dominant_parties'][0]
        opposition_party = ward_config['dominant_parties'][1]
        primary_issue = random.choice(ward_config['key_issues'])
        
        posts = [
            f"{ward_name} Political Alert: {dominant_party} approval ratings show 8% decline over {primary_issue} handling. Opposition {opposition_party} coordination demonstrates strategic opportunity targeting governance failures through community mobilization efforts.",
            
            f"Strategic Intelligence {ward_name}: Recent polling indicates voter preference shift toward issue-based candidate evaluation. {primary_issue} emerges as defining campaign issue with cross-party implications requiring immediate policy response.",
            
            f"{ward_name} Ward Analysis: {opposition_party} gains traction with targeted policy proposals addressing {primary_issue} concerns. Digital engagement increases 25% among younger voters organizing grassroots advocacy initiatives.",
            
            f"Political Briefing {ward_name}: Community organizations document governance gaps in {primary_issue} management, creating policy reform pressure. {dominant_party} faces electoral vulnerability unless concrete improvements demonstrated.",
            
            f"{ward_name} Electoral Dynamics: Opposition {opposition_party} strategic positioning creates unified challenge to incumbent {dominant_party}. Community dissatisfaction with {primary_issue} governance becomes central campaign battleground."
        ]
        
        return posts
    
    def seed_leaders_and_mentions(self):
        """Seed realistic political leaders and their mentions"""
        with self.app.app_context():
            print("Creating political leaders and mentions...")
            
            # Clear existing leaders
            LeaderMention.query.delete()
            Leader.query.delete()
            
            # Create leaders
            all_leaders = []
            for party, leaders in self.major_leaders.items():
                for leader_name in leaders:
                    leader = Leader(
                        name=leader_name,
                        party=party,
                        role='MLA' if random.random() > 0.6 else 'MP' if random.random() > 0.8 else 'Leader',
                        ward=f"Ward {random.randint(1, 150)}" if random.random() > 0.7 else None,
                        first_seen=datetime.now(timezone.utc) - timedelta(days=random.randint(30, 365)),
                        last_seen=datetime.now(timezone.utc) - timedelta(days=random.randint(0, 7))
                    )
                    db.session.add(leader)
                    all_leaders.append((leader, party))
            
            db.session.flush()
            
            # Create leader mentions linked to posts
            posts = Post.query.limit(500).all()  # Process recent posts
            
            for post in posts:
                if random.random() > 0.7:  # 30% of posts mention leaders
                    # Choose leaders based on post party affiliation
                    relevant_leaders = [l for l, p in all_leaders if p == post.party]
                    if not relevant_leaders:
                        relevant_leaders = [l for l, p in all_leaders]
                    
                    if relevant_leaders:
                        leader = random.choice(relevant_leaders)[0]
                        sentiment = random.uniform(-1.0, 1.0)
                        
                        mention = LeaderMention(
                            leader_id=leader.id,
                            source_type='post',
                            source_id=post.id,
                            sentiment=sentiment,
                            created_at=post.created_at
                        )
                        db.session.add(mention)
            
            db.session.commit()
            print(f"✅ Created {len(all_leaders)} leaders and their mentions")
    
    def seed_issue_clusters(self):
        """Seed realistic issue clusters for wards"""
        with self.app.app_context():
            print("Creating issue clusters...")
            
            # Clear existing clusters
            IssueCluster.query.delete()
            
            # Get all wards with posts
            wards_with_posts = db.session.query(Post.city).distinct().all()
            
            for ward_tuple in wards_with_posts:
                ward_name = ward_tuple[0]
                if not ward_name:
                    continue
                
                # Extract ward number for classification
                ward_number = 1
                if 'Ward' in ward_name:
                    try:
                        ward_number = int(ward_name.split('Ward')[1].split()[0])
                    except:
                        ward_number = random.randint(1, 150)
                
                ward_config = self.classify_ward(ward_number)
                
                # Create 3-5 issue clusters per ward
                num_clusters = random.randint(3, 5)
                selected_issues = random.sample(ward_config['key_issues'] + self.hyderabad_issues, num_clusters)
                
                for issue in selected_issues:
                    # Generate related keywords
                    keywords = [issue]
                    if 'water' in issue:
                        keywords.extend(['supply', 'shortage', 'quality', 'bore wells'])
                    elif 'traffic' in issue:
                        keywords.extend(['congestion', 'signals', 'parking', 'flyovers'])
                    elif 'infrastructure' in issue:
                        keywords.extend(['roads', 'drainage', 'electricity', 'development'])
                    
                    cluster = IssueCluster(
                        ward=ward_name,
                        label=issue.title(),
                        keywords=keywords,
                        sentiment=random.uniform(-0.5, 0.5),
                        volume=random.randint(10, 100),
                        momentum=random.uniform(-0.3, 0.3),
                        window='P7D',
                        updated_at=datetime.now(timezone.utc)
                    )
                    db.session.add(cluster)
            
            db.session.commit()
            print(f"✅ Created issue clusters for all wards")
    
    def enrich_all_wards(self) -> bool:
        """Enrich data for all 150 GHMC wards with realistic political intelligence"""
        print("🌱 Enriching political data for all 150 GHMC wards...")
        
        with self.app.app_context():
            try:
                # Clear existing synthetic data
                print("Clearing existing synthetic data...")
                Post.query.filter(Post.text.like('%Political dynamics in%')).delete()
                Alert.query.filter(Alert.description.like('%Political intelligence%')).delete()
                db.session.commit()
                
                total_created = {'posts': 0, 'epapers': 0, 'alerts': 0}
                
                # Process all 150 wards
                for ward_num in range(1, 151):
                    ward_name = f"Ward {ward_num}"
                    if ward_num in [95, 91, 78, 85]:  # Known named wards
                        ward_names = {95: 'Jubilee Hills', 91: 'Khairatabad', 78: 'Banjara Hills', 85: 'Begumpet'}
                        ward_name = ward_names.get(ward_num, ward_name)
                    
                    ward_config = self.classify_ward(ward_num)
                    
                    # Create 2-4 articles per ward
                    num_articles = random.randint(2, 4)
                    
                    for article_idx in range(num_articles):
                        # Generate article
                        article_content = self.generate_realistic_article(ward_name, ward_config)
                        
                        # Create epaper
                        publication_date = datetime.now(timezone.utc) - timedelta(days=random.randint(1, 30))
                        publication_name = random.choice(self.publications)
                        
                        unique_content = f"{article_content}_{ward_name}_{article_idx}_{random.randint(10000, 99999)}"
                        content_hash = hashlib.sha256(unique_content.encode()).hexdigest()
                        
                        epaper = Epaper(
                            publication_name=publication_name,
                            publication_date=publication_date.date(),
                            raw_text=article_content,
                            created_at=publication_date,
                            sha256=content_hash
                        )
                        db.session.add(epaper)
                        db.session.flush()
                        total_created['epapers'] += 1
                        
                        # Create posts from article
                        post_variants = self.create_political_posts(ward_name, ward_config, article_content)
                        num_posts = random.randint(3, 5)
                        
                        for post_idx in range(num_posts):
                            post_text = random.choice(post_variants)
                            emotion = random.choice(ward_config['sentiment_tendency'])
                            party = random.choice(ward_config['dominant_parties'])
                            post_created_at = publication_date + timedelta(hours=random.randint(1, 48))
                            
                            # Get or create author
                            author_name = f"{publication_name} Political Desk"
                            author = Author.query.filter_by(name=author_name).first()
                            if not author:
                                author = Author(name=author_name, party=party if random.random() > 0.8 else None)
                                db.session.add(author)
                                db.session.flush()
                            
                            # Create post
                            post = Post(
                                text=post_text,
                                city=ward_name,
                                emotion=emotion,
                                author_id=author.id,
                                created_at=post_created_at,
                                party=party,
                                epaper_id=epaper.id
                            )
                            db.session.add(post)
                            total_created['posts'] += 1
                    
                    # Create strategic alert for ward
                    if random.random() > 0.5:  # 50% of wards get alerts
                        primary_issue = random.choice(ward_config['key_issues'])
                        dominant_party = ward_config['dominant_parties'][0]
                        opposition_party = ward_config['dominant_parties'][1]
                        
                        opportunities = [
                            f"Strategic positioning on {primary_issue} creates voter engagement opportunity",
                            f"Community organization growth provides enhanced mobilization capacity",
                            f"Digital engagement trends favor proactive policy communication"
                        ]
                        
                        threats = [
                            f"Opposition {opposition_party} coordination targets {primary_issue} governance gaps",
                            f"Community dissatisfaction with {primary_issue} creates incumbent vulnerability",
                            f"Social media narratives around governance failures gain traction"
                        ]
                        
                        actionable_alerts = [
                            f"Immediate: Community sessions on {primary_issue} within 72 hours",
                            f"Short-term: Policy demonstration on {primary_issue} with measurable outcomes",
                            f"Strategic: Counter-narrative development for opposition critiques"
                        ]
                        
                        source_articles = [
                            f"Community feedback analysis on {primary_issue} initiatives",
                            f"Opposition strategy assessment from public statements",
                            f"Digital engagement metrics from {ward_name} social media analysis"
                        ]
                        
                        alert = Alert(
                            ward=ward_name,
                            description=f"Political intelligence analysis indicates strategic attention required for {primary_issue} governance in {ward_name}",
                            severity=random.choice(['medium', 'high']),
                            opportunities='\n'.join(opportunities),
                            threats='\n'.join(threats),
                            actionable_alerts='\n'.join(actionable_alerts),
                            source_articles='\n'.join(source_articles),
                            created_at=datetime.now(timezone.utc) - timedelta(days=random.randint(0, 14)),
                            updated_at=datetime.now(timezone.utc)
                        )
                        db.session.add(alert)
                        total_created['alerts'] += 1
                    
                    # Commit every 25 wards
                    if ward_num % 25 == 0:
                        db.session.commit()
                        print(f"Processed {ward_num}/150 wards...")
                
                # Final commit
                db.session.commit()
                
                print(f"✅ Data enrichment completed!")
                print(f"   - Created {total_created['posts']:,} posts")
                print(f"   - Created {total_created['epapers']:,} epapers")
                print(f"   - Created {total_created['alerts']:,} alerts")
                
                return True
                
            except Exception as e:
                print(f"❌ Error during data enrichment: {e}")
                db.session.rollback()
                return False
    
    def validate_enrichment(self) -> dict:
        """Validate the data enrichment results"""
        with self.app.app_context():
            validation = {
                'total_posts': Post.query.count(),
                'total_epapers': Epaper.query.count(),
                'total_alerts': Alert.query.count(),
                'ward_coverage': len(db.session.query(Post.city).distinct().all()),
                'party_distribution': {},
                'emotion_distribution': {},
                'recent_data_percentage': 0
            }
            
            # Party distribution
            party_counts = db.session.query(Post.party, func.count(Post.id)).group_by(Post.party).all()
            validation['party_distribution'] = dict(party_counts)
            
            # Emotion distribution
            emotion_counts = db.session.query(Post.emotion, func.count(Post.id)).group_by(Post.emotion).all()
            validation['emotion_distribution'] = dict(emotion_counts)
            
            # Recent data
            recent_posts = Post.query.filter(
                Post.created_at >= datetime.now(timezone.utc) - timedelta(days=30)
            ).count()
            validation['recent_data_percentage'] = round((recent_posts / validation['total_posts']) * 100, 1) if validation['total_posts'] > 0 else 0
            
            return validation


def main():
    """Main execution function"""
    print("=" * 80)
    print("🏛️  Hyderabad Political Data Enricher")
    print("   Realistic Political Intelligence Data for All GHMC Wards")
    print("=" * 80)
    
    enricher = HyderabadPoliticalDataEnricher()
    
    print("\n🔍 Current database state analysis...")
    
    with enricher.app.app_context():
        current_posts = Post.query.count()
        current_wards = len(db.session.query(Post.city).distinct().all())
        current_alerts = Alert.query.count()
    
    print(f"Current state: {current_posts:,} posts across {current_wards} wards, {current_alerts} alerts")
    
    response = input(f"\nEnrich database with realistic Hyderabad political data for all 150 wards? (y/N): ").strip().lower()
    
    if response == 'y':
        print("\n🚀 Starting comprehensive data enrichment...")
        
        # Execute enrichment
        if enricher.enrich_all_wards():
            print("\n🎯 Creating political leaders and mentions...")
            enricher.seed_leaders_and_mentions()
            
            print("\n🎯 Creating issue clusters...")
            enricher.seed_issue_clusters()
            
            # Final validation
            print("\n📊 Validating enrichment results...")
            validation = enricher.validate_enrichment()
            
            print("\n🎉 Data enrichment completed successfully!")
            print(f"✅ Total Posts: {validation['total_posts']:,}")
            print(f"✅ Ward Coverage: {validation['ward_coverage']}/150 wards")
            print(f"✅ Recent Data: {validation['recent_data_percentage']}% within last 30 days")
            print(f"✅ Political Alerts: {validation['total_alerts']:,}")
            
            print("\n📈 Party Distribution:")
            for party, count in sorted(validation['party_distribution'].items(), key=lambda x: x[1], reverse=True):
                if party:
                    print(f"   - {party}: {count:,} mentions")
            
            print("\n💭 Emotion Analysis:")
            for emotion, count in sorted(validation['emotion_distribution'].items(), key=lambda x: x[1], reverse=True):
                if emotion:
                    print(f"   - {emotion}: {count:,} posts")
            
            print(f"\n✅ Database now contains comprehensive political intelligence for all GHMC wards!")
            print(f"✅ Ready for production deployment with realistic Hyderabad political context")
            
        else:
            print("\n❌ Data enrichment failed. Check error messages above.")
    
    else:
        print("\n📋 Data enrichment skipped.")
        print("   Run script again and choose 'y' to execute enrichment.")


if __name__ == '__main__':
    main()