#!/usr/bin/env python3
"""
Comprehensive Political Data Seeding Script

This script seeds the LokDarpan database with realistic political intelligence data
including full-length articles, ward-specific analysis, and proper epaper relationships.
"""

import os
import sys
import random
import json
import hashlib
from datetime import datetime, timedelta, timezone

# Add the backend directory to the path to import models
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from app import create_app
from app.models import db, Post, Author, Epaper, Alert
from app.models_ai import Summary

# Ward configurations with realistic political context
WARD_CONFIGS = {
    'Himayath Nagar': {
        'primary_issues': ['urban planning', 'traffic management', 'commercial development'],
        'dominant_parties': ['BJP', 'AIMIM', 'BRS'],
        'sentiment_profile': 'mixed_with_development_focus',
        'key_demographics': 'middle_class_muslim_majority'
    },
    'Jubilee Hills': {
        'primary_issues': ['infrastructure', 'security', 'elite governance'],
        'dominant_parties': ['BJP', 'INC', 'BRS'],
        'sentiment_profile': 'privileged_but_demanding',
        'key_demographics': 'affluent_hindu_majority'
    },
    'Begumpet': {
        'primary_issues': ['connectivity', 'business district', 'metro expansion'],
        'dominant_parties': ['BJP', 'BRS', 'INC'],
        'sentiment_profile': 'business_focused_pragmatic',
        'key_demographics': 'business_professionals'
    },
    'Malkajgiri': {
        'primary_issues': ['suburban development', 'education', 'employment'],
        'dominant_parties': ['BJP', 'BRS', 'INC'],
        'sentiment_profile': 'aspirational_middle_class',
        'key_demographics': 'tech_professionals_families'
    },
    'Banjara Hills': {
        'primary_issues': ['heritage conservation', 'elite services', 'law and order'],
        'dominant_parties': ['BJP', 'INC', 'BRS'],
        'sentiment_profile': 'conservative_establishment',
        'key_demographics': 'wealthy_traditional_families'
    },
    'Gandhinagar': {
        'primary_issues': ['working class concerns', 'basic amenities', 'employment'],
        'dominant_parties': ['BRS', 'INC', 'AIMIM'],
        'sentiment_profile': 'working_class_pragmatic',
        'key_demographics': 'diverse_working_class'
    },
    'Fateh Nagar': {
        'primary_issues': ['minority rights', 'education', 'economic opportunities'],
        'dominant_parties': ['AIMIM', 'BRS', 'INC'],
        'sentiment_profile': 'minority_community_focused',
        'key_demographics': 'muslim_working_middle_class'
    },
    'Langar Houz': {
        'primary_issues': ['urban infrastructure', 'water supply', 'drainage'],
        'dominant_parties': ['BRS', 'AIMIM', 'INC'],
        'sentiment_profile': 'infrastructure_focused',
        'key_demographics': 'mixed_communities'
    },
    'Asif Nagar': {
        'primary_issues': ['local governance', 'municipal services', 'community development'],
        'dominant_parties': ['AIMIM', 'BRS', 'INC'],
        'sentiment_profile': 'community_governance_focused',
        'key_demographics': 'traditional_muslim_community'
    },
    'Habsiguda': {
        'primary_issues': ['suburban growth', 'transport connectivity', 'services'],
        'dominant_parties': ['BJP', 'BRS', 'INC'],
        'sentiment_profile': 'suburban_development_oriented',
        'key_demographics': 'suburban_middle_class'
    },
    'Marredpally': {
        'primary_issues': ['cantonment area', 'military relations', 'civilian infrastructure'],
        'dominant_parties': ['BJP', 'INC', 'BRS'],
        'sentiment_profile': 'security_governance_focused',
        'key_demographics': 'military_civilian_mix'
    },
    'Khairatabad': {
        'primary_issues': ['commercial hub', 'traffic', 'business regulations'],
        'dominant_parties': ['BJP', 'BRS', 'INC'],
        'sentiment_profile': 'commercial_pragmatic',
        'key_demographics': 'business_owners_professionals'
    },
    'Ramnathpur': {
        'primary_issues': ['residential development', 'schools', 'parks'],
        'dominant_parties': ['BJP', 'BRS', 'INC'],
        'sentiment_profile': 'family_oriented_stable',
        'key_demographics': 'middle_class_families'
    },
    'Kapra': {
        'primary_issues': ['industrial development', 'pollution', 'worker rights'],
        'dominant_parties': ['BRS', 'INC', 'BJP'],
        'sentiment_profile': 'industrial_worker_focused',
        'key_demographics': 'industrial_workers_families'
    }
}

# Article template for generating realistic political content
POLITICAL_ARTICLE_TEMPLATE = """
Political developments in {ward} have reached a critical juncture as {dominant_party} faces increasing scrutiny over {primary_issue} governance, creating significant electoral implications for the upcoming campaign cycle. The constituency's unique demographic profile, dominated by {key_demographics}, has elevated specific policy priorities that diverge from traditional party platforms.

Recent community engagement sessions have revealed deep concerns about {secondary_issue}, with residents demanding immediate action rather than lengthy consultation processes. This urgency has placed unprecedented pressure on local representatives to demonstrate measurable progress within constrained timeframes, fundamentally altering the political dynamics that have traditionally characterized {ward}.

Opposition coordination, particularly between {opposition_party_1} and {opposition_party_2}, has become increasingly sophisticated, leveraging shared resources and complementary voter bases to present a unified challenge to {dominant_party} hegemony. Their strategy focuses on highlighting governance failures while proposing alternative approaches that resonate with disaffected voter segments.

The {key_demographics} demographic, comprising approximately 45% of the registered voter base, has shown marked shifts in political preference, moving away from traditional party loyalties toward issue-based candidate evaluation. This transformation has forced all parties to invest more heavily in grassroots engagement and policy development rather than relying on historical vote bank mobilization.

Economic considerations have emerged as a defining factor, with local business associations indicating that {primary_issue} directly impacts commercial viability and long-term investment decisions. Several major establishments have threatened relocation if infrastructure deficiencies persist, adding economic pressure to political calculations and creating additional stakeholder demands for rapid policy responses.

Digital campaign strategies have gained prominence, particularly for engaging younger voters who rely primarily on social media for political information. {dominant_party} has launched comprehensive online outreach programs, while opposition parties have focused on viral content highlighting governance failures and alternative policy proposals.

Recent polling trends suggest {sentiment_profile} sentiment among committed voters, while undecided voters prioritize practical solutions over party ideology. This shift indicates potential electoral volatility that could significantly impact resource allocation decisions and campaign strategy development across all major parties.

Community organizations have emerged as influential mediators between residents and political leadership, developing sophisticated advocacy capabilities that have elevated policy discourse quality. Their documentation of service gaps and solution proposals has forced parties to engage with substantive technical details rather than relying solely on emotional appeals.

The strategic importance of {ward} extends beyond local governance, serving as a crucial indicator for metropolitan political trends and party competitiveness in similar urban constituencies. Success or failure here will influence broader campaign approaches and resource allocation decisions for future electoral cycles.

Looking ahead, effective political engagement will require synthesis of responsive governance, community partnership, and strategic communication that addresses both immediate concerns and long-term development aspirations. The constituency's trajectory offers valuable insights into evolving urban political dynamics and voter expectation management.
""".strip()

EMOTIONS = ['Positive', 'Negative', 'Hopeful', 'Frustration', 'Anger', 'Sadness', 'Neutral']
PARTIES = ['BJP', 'BRS', 'INC', 'AIMIM']
PUBLICATIONS = ['The Hindu', 'Times of India', 'Deccan Chronicle', 'Sakshi', 'Eenadu', 'Telangana Today']


def generate_post_variants(ward, config, article_content):
    """Generate multiple political analysis posts from a single article."""
    return [
        f"{ward}: {config['primary_issues'][0].title()} governance analysis - {config['dominant_parties'][0]} faces mounting pressure from {config['dominant_parties'][1]} alliance over recent policy failures. {config['key_demographics'].replace('_', ' ').title()} voters show {config['sentiment_profile'].replace('_', ' ')} response patterns, indicating potential electoral vulnerability that requires immediate strategic attention.",
        
        f"Political Intelligence {ward}: Opposition {config['dominant_parties'][1]}-{config['dominant_parties'][2]} coordination demonstrates enhanced tactical sophistication targeting {config['primary_issues'][1]} weaknesses. {config['key_demographics'].replace('_', ' ').title()} demographic shifts create new competitive dynamics requiring {config['dominant_parties'][0]} to adapt traditional mobilization strategies.",
        
        f"{ward} Strategic Brief: Recent {config['primary_issues'][0]} developments reveal critical governance gaps that opposition parties are actively exploiting. {config['sentiment_profile'].replace('_', ' ').title()} community sentiment indicates declining satisfaction with incumbent performance, creating tactical opportunities for alternative political messaging.",
        
        f"Ward Analysis {ward}: {config['key_demographics'].replace('_', ' ').title()} voters increasingly prioritize issue-based candidate evaluation over traditional party loyalty, fundamentally altering electoral calculations. {config['dominant_parties'][0]} must demonstrate concrete progress on {config['primary_issues'][2]} to maintain competitive positioning against unified opposition challenge.",
        
        f"{ward} Political Update: Digital engagement trends show sophisticated voter expectations demanding measurable governance outcomes rather than campaign promises. {config['dominant_parties'][1]} strategic positioning on {config['primary_issues'][0]} creates potential narrative advantages that {config['dominant_parties'][0]} must counter through policy demonstration rather than rhetorical response."
    ]


def seed_comprehensive_data():
    """Seed the database with comprehensive, realistic political data."""
    
    print("Starting comprehensive political data seeding...")
    
    # Clear existing synthetic data
    print("Clearing existing synthetic data...")
    Post.query.filter(Post.epaper_id.is_(None)).delete()
    Alert.query.filter(Alert.description.like('%Demo alert%')).delete()
    db.session.commit()
    
    # Generate realistic epaper data and linked posts
    print("Creating realistic epaper articles and posts...")
    
    for ward, config in WARD_CONFIGS.items():
        print(f"Processing {ward}...")
        
        # Generate 5-7 articles per ward
        num_articles = random.randint(5, 7)
        
        for i in range(num_articles):
            # Generate comprehensive article content
            article_content = POLITICAL_ARTICLE_TEMPLATE.format(
                ward=ward,
                dominant_party=config['dominant_parties'][0],
                primary_issue=config['primary_issues'][0],
                secondary_issue=config['primary_issues'][1] if len(config['primary_issues']) > 1 else config['primary_issues'][0],
                key_demographics=config['key_demographics'].replace('_', ' '),
                opposition_party_1=config['dominant_parties'][1],
                opposition_party_2=config['dominant_parties'][2] if len(config['dominant_parties']) > 2 else config['dominant_parties'][1],
                sentiment_profile=config['sentiment_profile'].replace('_', ' ')
            )
            
            # Create epaper entry
            publication_date = datetime.now(timezone.utc) - timedelta(days=random.randint(1, 30))
            publication_name = random.choice(PUBLICATIONS)
            
            # Calculate SHA256 for uniqueness - add random suffix to avoid collisions
            unique_content = f"{article_content}_{ward}_{i}_{random.randint(1000,9999)}"
            content_hash = hashlib.sha256(unique_content.encode()).hexdigest()
            
            epaper = Epaper(
                publication_name=publication_name,
                publication_date=publication_date.date(),
                raw_text=article_content,
                created_at=publication_date,
                sha256=content_hash
            )
            
            db.session.add(epaper)
            db.session.flush()  # Get the epaper ID
            
            # Generate multiple posts from this article
            post_variants = generate_post_variants(ward, config, article_content)
            num_posts = random.randint(3, 5)
            
            for j in range(num_posts):
                post_text = random.choice(post_variants)
                emotion = random.choice(EMOTIONS)
                party = random.choice(config['dominant_parties'])
                created_at = publication_date + timedelta(hours=random.randint(1, 48))
                
                # Create or get author
                author_name = f"{publication_name} Political Correspondent"
                author = Author.query.filter_by(name=author_name).first()
                if not author:
                    author = Author(
                        name=author_name,
                        party=party if random.random() > 0.7 else None
                    )
                    db.session.add(author)
                    db.session.flush()
                
                # Create post linked to epaper
                post = Post(
                    text=post_text,
                    city=ward,
                    emotion=emotion,
                    author_id=author.id,
                    created_at=created_at,
                    party=party,
                    epaper_id=epaper.id
                )
                
                db.session.add(post)
    
    # Generate comprehensive alerts
    print("Creating intelligence alerts...")
    
    # Clear existing alerts
    Alert.query.delete()
    
    for ward, config in WARD_CONFIGS.items():
        num_alerts = random.randint(2, 4)
        
        for i in range(num_alerts):
            opportunities = [
                f"Strategic positioning on {config['primary_issues'][0]} creates voter engagement opportunity",
                f"Opposition fragmentation allows proactive policy leadership on {config['primary_issues'][1]}",
                f"{config['key_demographics'].replace('_', ' ').title()} demographic shows increased political engagement",
                f"Recent governance success enables positive campaign messaging",
                f"Community organization growth provides enhanced mobilization capacity"
            ]
            
            threats = [
                f"Opposition {config['dominant_parties'][1]}-{config['dominant_parties'][2]} coordination targets key segments",
                f"Unresolved {config['primary_issues'][0]} concerns create incumbent vulnerability",
                f"Social media narratives around governance failures gain traction",
                f"Economic pressures impact {config['key_demographics'].replace('_', ' ')} satisfaction",
                f"External developments affect local party credibility"
            ]
            
            actionable_alerts = [
                f"Immediate: Community listening sessions on {config['primary_issues'][0]} within 72 hours",
                f"Short-term: Targeted communication addressing {config['key_demographics'].replace('_', ' ')} concerns",
                f"Medium-term: Coordinate with local organizations for grassroots presence",
                f"Strategic: Develop policy responses to opposition critiques",
                f"Defensive: Monitor and counter opposition social media narratives"
            ]
            
            source_articles = [
                f"{random.choice(PUBLICATIONS)} - Political analysis of {ward} issues",
                f"Community feedback on {config['primary_issues'][0]} initiatives",
                f"Opposition statements regarding {ward} governance",
                f"Social media trend analysis for {ward} political discussions"
            ]
            
            severity = random.choice(['low', 'medium', 'high'])
            created_at = datetime.now(timezone.utc) - timedelta(days=random.randint(0, 7))
            
            description = f"Political intelligence analysis indicates {config['sentiment_profile'].replace('_', ' ')} sentiment trends in {ward} require strategic attention based on {config['primary_issues'][0]} governance performance"
            
            alert = Alert(
                ward=ward,
                opportunities='\n'.join(random.sample(opportunities, 2)),
                threats='\n'.join(random.sample(threats, 2)),
                actionable_alerts='\n'.join(random.sample(actionable_alerts, 3)),
                source_articles='\n'.join(random.sample(source_articles, 2)),
                created_at=created_at,
                description=description,
                severity=severity,
                updated_at=created_at
            )
            
            db.session.add(alert)
    
    # Generate strategic summaries
    print("Creating strategic summaries...")
    
    for ward, config in WARD_CONFIGS.items():
        sections = {
            "executive_summary": f"Political landscape analysis for {ward} reveals {config['sentiment_profile'].replace('_', ' ')} sentiment patterns with strategic implications for upcoming electoral cycles.",
            "key_issues": {
                "primary": config['primary_issues'][0],
                "secondary": config['primary_issues'][1:],
                "emerging": f"Digital engagement among {config['key_demographics'].replace('_', ' ')} demographic"
            },
            "party_positioning": {
                party: f"{'Strong' if i == 0 else 'Competitive' if i == 1 else 'Challenging'} position with focus on {random.choice(config['primary_issues'])}"
                for i, party in enumerate(config['dominant_parties'])
            },
            "strategic_recommendations": [
                f"Enhance community engagement on {config['primary_issues'][0]}",
                f"Develop targeted messaging for {config['key_demographics'].replace('_', ' ')} voters",
                f"Counter opposition narratives through proactive policy demonstration"
            ],
            "risk_assessment": f"Medium-term electoral viability dependent on effective {config['primary_issues'][0]} governance delivery"
        }
        
        citations = [
            f"Community survey data from {ward} residents (n=250)",
            f"Political discourse analysis from local media coverage",
            f"Historical voting pattern analysis for {ward} constituency",
            f"Opposition strategy assessment based on public statements"
        ]
        
        summary = Summary(
            ward=ward,
            window='30d',
            sections=sections,
            citations=citations,
            confidence=round(random.uniform(0.75, 0.95), 2),
            model='political_strategist_v1',
            cost_cents=random.randint(15, 45),
            created_at=datetime.now(timezone.utc)
        )
        
        db.session.add(summary)
    
    # Commit all changes
    print("Committing changes to database...")
    db.session.commit()
    
    # Verify data
    print("\n=== Data Seeding Summary ===")
    print(f"Total epapers created: {Epaper.query.count()}")
    print(f"Total posts created: {Post.query.count()}")
    print(f"Total posts with epaper links: {Post.query.filter(Post.epaper_id.isnot(None)).count()}")
    print(f"Total alerts created: {Alert.query.count()}")
    print(f"Total summaries created: {Summary.query.count()}")
    
    print("\n=== Ward Data Distribution ===")
    for ward in WARD_CONFIGS.keys():
        posts = Post.query.filter_by(city=ward).count()
        alerts = Alert.query.filter_by(ward=ward).count()
        summaries = Summary.query.filter_by(ward=ward).count()
        print(f"{ward}: {posts} posts, {alerts} alerts, {summaries} summaries")
    
    print("\n✅ Comprehensive political data seeding completed successfully!")


if __name__ == '__main__':
    # Set up Flask app context
    app = create_app()
    
    with app.app_context():
        seed_comprehensive_data()