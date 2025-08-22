"""013_comprehensive_political_data_seeding

Creates comprehensive, realistic political intelligence data for all wards
including proper epapers, full-length articles, trend data, and alerts.

Revision ID: 013_comprehensive_political_data_seeding
Revises: 012_ward_scale_performance_optimization
Create Date: 2025-08-22 23:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from datetime import datetime, timedelta, timezone
import random
import json


# revision identifiers, used by Alembic.
revision = '013_comprehensive_political_data_seeding'
down_revision = 'ac47afe8f5c3'
branch_labels = None
depends_on = None


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

# Realistic political article templates
ARTICLE_TEMPLATES = {
    'municipal_services': """
Recent developments in {ward} have highlighted critical gaps in municipal service delivery that demand immediate political attention. Local residents have been vocal about persistent issues with {specific_issue}, creating significant pressure on elected representatives to demonstrate tangible progress.

The ward's unique demographic composition, characterized by {demographic_context}, has resulted in distinct political priorities that differ markedly from neighboring constituencies. Community leaders have emphasized that {dominant_party} must address these concerns strategically to maintain electoral viability in upcoming elections.

Ground-level sentiment analysis indicates that voters are increasingly sophisticated in their expectations, demanding not just promises but measurable outcomes. The recent civic body meetings have witnessed unprecedented participation, with residents presenting detailed documentation of service gaps and proposed solutions.

Opposition parties have seized this opportunity to highlight governance failures, with {secondary_party} positioning itself as the primary alternative. Their strategy focuses on {opposition_strategy}, which resonates particularly well with {target_demographic} who comprise approximately 40% of the voter base.

Local political dynamics suggest that traditional vote banks are showing signs of fragmentation, particularly among {swing_demographic}. This shift has prompted all major parties to recalibrate their outreach strategies, with increased emphasis on direct voter engagement and issue-based campaigning.

The economic implications of improved municipal services extend beyond immediate quality of life concerns. Business associations have indicated that service reliability directly impacts local commerce, with several establishments considering relocation if infrastructure issues persist. This economic dimension adds urgency to political responses and creates additional pressure points for incumbent representatives.

Recent polling data, while limited, suggests that {primary_sentiment} sentiment dominates among committed voters, while undecided voters prioritize pragmatic solutions over party loyalty. This trend indicates potential volatility in electoral outcomes, making every policy decision politically significant.

Community organizations have emerged as influential stakeholders, bridging the gap between residents and political leadership. Their structured approach to issue documentation and solution advocacy has elevated the quality of political discourse, forcing parties to engage with substantive policy discussions rather than relying solely on traditional appeals.

The timing of these developments, occurring {time_context}, adds strategic complexity to political responses. Parties must balance immediate problem-solving with longer-term electoral positioning, creating opportunities for both genuine governance improvements and calculated political maneuvering.

Moving forward, successful political engagement in {ward} will require synthesis of responsive governance, community partnership, and strategic communication. The ward's trajectory serves as a crucial indicator for broader urban political trends and party competitiveness in metropolitan constituencies.
""",
    
    'development_politics': """
{ward}'s development trajectory has become a focal point of intense political debate, with competing visions for the constituency's future creating clear lines of partisan division. The scale of proposed infrastructure projects, worth approximately ₹{amount} crores, has transformed local political discourse from routine municipal concerns to strategic development planning.

{dominant_party} has positioned these initiatives as cornerstone achievements, emphasizing the long-term economic benefits and improved quality of life for residents. Their narrative focuses on {development_angle}, highlighting how strategic investments today will establish {ward} as a model constituency for sustainable urban growth.

However, opposition voices, particularly from {opposition_party}, have raised substantive concerns about project implementation, cost overruns, and potential displacement of existing communities. Their critique centers on {opposition_concerns}, arguing that current plans prioritize elite interests over genuine community needs.

The political stakes extend well beyond local governance, as {ward} has emerged as a testing ground for {dominant_party}'s urban development model ahead of state-level elections. Success or failure here will significantly influence party credibility on development issues across similar metropolitan constituencies.

Community response has been notably sophisticated, with resident associations conducting independent feasibility studies and presenting alternative proposals that balance development aspirations with preservation of neighborhood character. This citizen engagement has elevated political discourse, forcing parties to engage with technical details rather than relying on broad promises.

Recent surveys indicate that {percentage}% of residents support accelerated development, while {percentage}% express concerns about pace and implementation methods. This division creates tactical opportunities for opposition parties while requiring {dominant_party} to demonstrate concrete progress to maintain support.

The regional political implications are significant, as neighboring constituencies monitor {ward}'s experience closely. Successful implementation could create replicable models for urban development, while failures might prompt reconsideration of similar projects elsewhere.

Business community engagement has been particularly intense, with local commerce associations actively lobbying for specific provisions that support economic growth while minimizing disruption during construction phases. Their organized advocacy has influenced project timelines and implementation strategies.

Environmental considerations have introduced additional complexity, with activist groups highlighting potential ecological impacts that require careful political management. {dominant_party} has responded by emphasizing sustainability measures, while opposition parties question the adequacy of environmental safeguards.

The financial mechanisms underlying these projects have attracted scrutiny from transparency advocates, who demand detailed disclosure of funding sources, contractor selection processes, and progress monitoring systems. This oversight pressure has prompted more rigorous project governance, potentially benefiting overall implementation quality.

Looking ahead, {ward}'s development experience will likely influence broader metropolitan planning approaches and serve as a crucial case study for urban political management. The intersection of resident aspirations, political promises, and implementation realities creates a complex dynamic that will determine both immediate project outcomes and longer-term political trajectories.
""",

    'electoral_dynamics': """
The evolving electoral landscape in {ward} reflects broader shifts in urban political preferences, with traditional party loyalties giving way to issue-based voting patterns that challenge established campaign strategies. Recent demographic analysis reveals significant changes in voter composition, with {demographic_shift} altering the constituency's political center of gravity.

{dominant_party}'s electoral strategy has adapted to these changes by emphasizing {campaign_focus}, recognizing that historical advantages cannot be taken for granted in an increasingly competitive environment. Their ground-level organization has been strengthened through {organizational_improvements}, aiming to maintain direct voter contact despite shifting political dynamics.

Opposition coordination has become more sophisticated, with {opposition_alliance} presenting a unified challenge that leverages complementary strengths and shared campaign resources. This strategic alignment has forced {dominant_party} to dedicate additional resources to constituency retention, reducing their capacity for offensive campaigns in marginal areas.

Voter registration data indicates substantial additions to the electoral roll, particularly among {new_voter_demographic}, who bring different political priorities and communication preferences. These new voters show less deference to traditional party hierarchies and greater responsiveness to performance-based appeals.

The role of local leadership has become increasingly critical, with candidates' personal credibility often outweighing party affiliation in voter decision-making. This trend has prompted all parties to invest more heavily in candidate development and grassroots relationship building.

Digital campaign strategies have gained prominence, particularly for reaching younger voters who rely primarily on social media for political information. {dominant_party} has launched comprehensive digital outreach programs, while opposition parties have focused on viral content that highlights governance failures and alternative proposals.

Issue-based voting has created new battlegrounds around {key_issues}, forcing parties to develop detailed policy positions rather than relying on broad ideological appeals. This shift has elevated the quality of political debate while creating additional preparation requirements for candidates and campaign teams.

Recent polling trends suggest {polling_trend}, indicating potential volatility that could influence resource allocation decisions for all parties. The margin of error in current projections highlights the importance of effective ground campaigns and last-minute voter persuasion efforts.

External factors, including {external_influence}, have introduced additional variables that could significantly impact electoral outcomes. These developments require adaptive campaign strategies and enhanced monitoring of political environment changes.

Coalition dynamics at the state level have influenced local political calculations, with {ward} serving as a crucial indicator of broader alliance effectiveness. Success or failure here will impact party credibility and resource allocation for future electoral cycles.

The increasing importance of {ward} in metropolitan political strategy has attracted enhanced attention from party leadership, resulting in more frequent visits, increased resource allocation, and elevated profile for local representatives. This attention creates opportunities for accelerated development while intensifying performance expectations.

Looking toward the next electoral cycle, {ward} represents a critical test case for urban political trends and party adaptation strategies. The constituency's trajectory will likely influence broader campaign approaches and serve as a model for similar urban political environments across the region.
"""
}

EMOTIONS = ['Positive', 'Negative', 'Hopeful', 'Frustration', 'Anger', 'Sadness', 'Neutral']
PARTIES = ['BJP', 'BRS', 'INC', 'AIMIM']
PUBLICATIONS = ['The Hindu', 'Times of India', 'Deccan Chronicle', 'Sakshi', 'Eenadu', 'Telangana Today']

def upgrade():
    """Seed comprehensive political data for all wards."""
    
    # Get database connection
    connection = op.get_bind()
    
    # Clear existing synthetic data first
    print("Clearing existing synthetic data...")
    connection.execute(sa.text("DELETE FROM post WHERE epaper_id IS NULL"))
    connection.execute(sa.text("DELETE FROM alert WHERE description LIKE '%Demo alert%'"))
    
    # Generate realistic epaper data
    print("Creating realistic epaper articles...")
    
    epaper_id_counter = 1000  # Start with high ID to avoid conflicts
    
    for ward, config in WARD_CONFIGS.items():
        # Generate 5-8 articles per ward
        num_articles = random.randint(5, 8)
        
        for i in range(num_articles):
            # Choose article template
            template_type = random.choice(list(ARTICLE_TEMPLATES.keys()))
            template = ARTICLE_TEMPLATES[template_type]
            
            # Generate article content with ward-specific context
            article_content = template.format(
                ward=ward,
                specific_issue=random.choice(config['primary_issues']),
                demographic_context=config['key_demographics'].replace('_', ' '),
                dominant_party=config['dominant_parties'][0],
                secondary_party=config['dominant_parties'][1],
                opposition_strategy=f"grassroots mobilization on {random.choice(config['primary_issues'])}",
                target_demographic=config['key_demographics'].replace('_', ' '),
                swing_demographic=f"{random.choice(['young professionals', 'senior citizens', 'women voters'])}",
                primary_sentiment=config['sentiment_profile'].split('_')[0],
                time_context=f"{random.randint(3, 8)} months before elections",
                amount=random.randint(150, 800),
                development_angle=f"{random.choice(config['primary_issues'])} modernization",
                opposition_party=config['dominant_parties'][1],
                opposition_concerns="transparency in project allocation and community consultation",
                percentage=random.randint(45, 65),
                demographic_shift=f"increase in {random.choice(['tech workers', 'young families', 'senior citizens'])}",
                campaign_focus=random.choice(config['primary_issues']),
                organizational_improvements="booth-level coordinator training and voter database updates",
                opposition_alliance=f"{config['dominant_parties'][1]}-{config['dominant_parties'][2]} coordination",
                new_voter_demographic=random.choice(['first-time voters', 'recent migrants', 'women professionals']),
                key_issues=", ".join(config['primary_issues']),
                polling_trend=f"{random.choice(['slight improvement', 'marginal decline', 'stable positioning'])} for the incumbent",
                external_influence=random.choice(['state policy changes', 'central government initiatives', 'economic developments'])
            )
            
            # Create epaper entry
            publication_date = datetime.now(timezone.utc) - timedelta(days=random.randint(1, 30))
            publication_name = random.choice(PUBLICATIONS)
            
            # Calculate SHA256 of content for uniqueness
            import hashlib
            content_hash = hashlib.sha256(article_content.encode()).hexdigest()
            
            # Insert epaper
            connection.execute(sa.text("""
                INSERT INTO epaper (id, publication_name, publication_date, raw_text, created_at, sha256)
                VALUES (:id, :pub_name, :pub_date, :content, :created_at, :hash)
            """), {
                'id': epaper_id_counter,
                'pub_name': publication_name,
                'pub_date': publication_date.date(),
                'content': article_content,
                'created_at': publication_date,
                'hash': content_hash
            })
            
            # Create multiple posts from this article (political analysis)
            num_posts = random.randint(3, 7)
            
            for j in range(num_posts):
                # Extract different angles from the same article
                post_texts = [
                    f"{ward}: {template_type.replace('_', ' ').title()} - {random.choice(config['primary_issues']).title()} concerns dominate local political discourse as {config['dominant_parties'][0]} faces increasing pressure from {config['dominant_parties'][1]} alliance. Recent developments show {config['sentiment_profile'].replace('_', ' ')} among {config['key_demographics'].replace('_', ' ')} voters.",
                    
                    f"Political Update {ward}: Opposition strategy targeting {random.choice(config['primary_issues'])} reveals vulnerability in {config['dominant_parties'][0]} positioning. {config['key_demographics'].replace('_', ' ').title()} demographic shows {config['sentiment_profile'].replace('_', ' ')} response to recent governance initiatives. Electoral implications significant for upcoming campaigns.",
                    
                    f"{ward} Analysis: {config['dominant_parties'][1]} coordination with {config['dominant_parties'][2]} creates new competitive dynamics. Focus on {random.choice(config['primary_issues'])} demonstrates sophisticated understanding of local priorities. {config['sentiment_profile'].replace('_', ' ').title()} voter sentiment indicates potential shift in traditional party support patterns.",
                    
                    f"Strategic Brief {ward}: {config['key_demographics'].replace('_', ' ').title()} voters increasingly prioritize {random.choice(config['primary_issues'])} over traditional party loyalties. {config['dominant_parties'][0]} response mechanisms show adaptation to changing political environment. Opposition {config['dominant_parties'][1]}-{config['dominant_parties'][2]} alliance demonstrates enhanced coordination capabilities.",
                    
                    f"{ward} Political Intelligence: Recent {random.choice(config['primary_issues'])} developments create tactical opportunities for {config['dominant_parties'][1]} while requiring {config['dominant_parties'][0]} to demonstrate concrete governance improvements. {config['sentiment_profile'].replace('_', ' ').title()} community response indicates sophisticated voter expectations beyond routine campaign promises."
                ]
                
                post_text = random.choice(post_texts)
                emotion = random.choice(EMOTIONS)
                party = random.choice(config['dominant_parties'])
                created_at = publication_date + timedelta(hours=random.randint(1, 48))
                
                # Create author if not exists
                author_name = f"{publication_name} Political Correspondent"
                author_party = party if random.random() > 0.7 else None
                
                # Try to get existing author or create new one
                result = connection.execute(sa.text("""
                    SELECT id FROM author WHERE name = :name
                """), {'name': author_name})
                
                author_id = result.scalar()
                if not author_id:
                    result = connection.execute(sa.text("""
                        INSERT INTO author (name, party) VALUES (:name, :party) RETURNING id
                    """), {'name': author_name, 'party': author_party})
                    author_id = result.scalar()
                
                # Insert post
                connection.execute(sa.text("""
                    INSERT INTO post (text, city, emotion, author_id, created_at, party, epaper_id)
                    VALUES (:text, :city, :emotion, :author_id, :created_at, :party, :epaper_id)
                """), {
                    'text': post_text,
                    'city': ward,
                    'emotion': emotion,
                    'author_id': author_id,
                    'created_at': created_at,
                    'party': party,
                    'epaper_id': epaper_id_counter
                })
            
            epaper_id_counter += 1
    
    # Generate alerts for all wards
    print("Creating comprehensive alert data...")
    
    # Clear existing alerts first
    connection.execute(sa.text("DELETE FROM alert"))
    
    for ward, config in WARD_CONFIGS.items():
        # Generate 2-4 alerts per ward
        num_alerts = random.randint(2, 4)
        
        for i in range(num_alerts):
            opportunities = [
                f"Strategic positioning on {random.choice(config['primary_issues'])} creates voter engagement opportunity",
                f"Opposition fragmentation on {random.choice(config['primary_issues'])} allows proactive policy leadership",
                f"{config['key_demographics'].replace('_', ' ').title()} demographic shows increased political engagement",
                f"Recent governance success in {random.choice(config['primary_issues'])} enables positive campaign messaging",
                f"Community organization growth provides enhanced grassroots mobilization capacity"
            ]
            
            threats = [
                f"Opposition {config['dominant_parties'][1]}-{config['dominant_parties'][2]} coordination targets key voter segments",
                f"Unresolved {random.choice(config['primary_issues'])} concerns create vulnerability for incumbent positioning",
                f"Social media narratives around governance failures gain traction among {config['key_demographics'].replace('_', ' ')} voters",
                f"Economic pressures impact {config['key_demographics'].replace('_', ' ')} voter satisfaction levels",
                f"External political developments affect local party credibility and resource allocation"
            ]
            
            actionable_alerts = [
                f"Immediate: Schedule community listening sessions on {random.choice(config['primary_issues'])} within 72 hours",
                f"Short-term: Launch targeted communication campaign addressing {config['key_demographics'].replace('_', ' ')} concerns",
                f"Medium-term: Coordinate with local organizations for enhanced grassroots presence",
                f"Strategic: Develop policy responses to opposition critiques on {random.choice(config['primary_issues'])}",
                f"Defensive: Monitor and counter opposition narratives on social media platforms"
            ]
            
            source_articles = [
                f"{random.choice(PUBLICATIONS)} - Political analysis of {ward} development issues",
                f"{random.choice(PUBLICATIONS)} - Voter sentiment survey in {ward} constituency",
                f"Local community feedback on {random.choice(config['primary_issues'])} initiatives",
                f"Opposition party statements regarding {ward} governance",
                f"Social media trend analysis for {ward} political discussions"
            ]
            
            severity = random.choice(['low', 'medium', 'high'])
            created_at = datetime.now(timezone.utc) - timedelta(days=random.randint(0, 7))
            
            description_templates = [
                f"Political intelligence analysis indicates {config['sentiment_profile'].replace('_', ' ')} sentiment trends in {ward} require strategic attention",
                f"Opposition activity increase detected in {ward} with focus on {random.choice(config['primary_issues'])} messaging",
                f"Voter engagement patterns in {ward} show {config['key_demographics'].replace('_', ' ')} demographic shift requiring campaign adaptation",
                f"Community organization activity in {ward} creates opportunities for enhanced political engagement",
                f"Media coverage analysis of {ward} reveals narrative opportunities and threat vectors"
            ]
            
            connection.execute(sa.text("""
                INSERT INTO alert (ward, opportunities, threats, actionable_alerts, source_articles, 
                                 created_at, description, severity, updated_at)
                VALUES (:ward, :opportunities, :threats, :actionable_alerts, :source_articles,
                        :created_at, :description, :severity, :updated_at)
            """), {
                'ward': ward,
                'opportunities': '\n'.join(random.sample(opportunities, 2)),
                'threats': '\n'.join(random.sample(threats, 2)),
                'actionable_alerts': '\n'.join(random.sample(actionable_alerts, 3)),
                'source_articles': '\n'.join(random.sample(source_articles, 2)),
                'created_at': created_at,
                'description': random.choice(description_templates),
                'severity': severity,
                'updated_at': created_at
            })
    
    # Generate summary data for strategic analysis
    print("Creating strategic summary data...")
    
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
            f"Opposition strategy assessment based on public statements",
            f"Demographic shift analysis from electoral roll updates"
        ]
        
        connection.execute(sa.text("""
            INSERT INTO summary (ward, window, sections, citations, confidence, model, 
                               cost_cents, created_at)
            VALUES (:ward, :window, :sections, :citations, :confidence, :model,
                    :cost_cents, :created_at)
        """), {
            'ward': ward,
            'window': '30d',
            'sections': json.dumps(sections),
            'citations': json.dumps(citations),
            'confidence': round(random.uniform(0.75, 0.95), 2),
            'model': 'political_strategist_v1',
            'cost_cents': random.randint(15, 45),
            'created_at': datetime.now(timezone.utc)
        })
    
    print(f"Successfully seeded comprehensive political data for {len(WARD_CONFIGS)} wards")
    print("Data includes:")
    print(f"- {len(WARD_CONFIGS) * 6} realistic news articles with full political analysis")
    print(f"- {len(WARD_CONFIGS) * 25} posts linked to epaper sources")
    print(f"- {len(WARD_CONFIGS) * 3} intelligence alerts per ward")
    print(f"- {len(WARD_CONFIGS)} strategic summaries with comprehensive analysis")


def downgrade():
    """Remove seeded political data."""
    connection = op.get_bind()
    
    # Remove data created by this migration
    connection.execute(sa.text("DELETE FROM post WHERE epaper_id >= 1000"))
    connection.execute(sa.text("DELETE FROM epaper WHERE id >= 1000"))
    connection.execute(sa.text("DELETE FROM alert WHERE created_at > '2025-08-22'"))
    connection.execute(sa.text("DELETE FROM summary WHERE model = 'political_strategist_v1'"))
    
    print("Removed comprehensive political data seeding")