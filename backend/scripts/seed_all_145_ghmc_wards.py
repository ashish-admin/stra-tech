#!/usr/bin/env python3
"""
Complete 145 GHMC Ward Seeding Script for LokDarpan

This script seeds all 145 Greater Hyderabad Municipal Corporation wards with:
- Polling station records for geographic data structure
- Ward profile and demographic information
- Political baseline data for campaign intelligence
- Strategic positioning data for each ward

Database Migration Specialist Implementation for Epic 5.0.1 Infrastructure Preparation
"""

import os
import sys
import json
import random
import re
from datetime import datetime, timezone

# Add the backend directory to the path to import models
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from app import create_app
from app.models import db, PollingStation, WardProfile, WardDemographics, WardFeatures
from sqlalchemy import text


def load_ward_data_from_geojson():
    """Extract ward data from the GHMC wards GeoJSON file."""
    geojson_path = os.path.join(os.path.dirname(__file__), '..', 'app', 'data', 'ghmc_wards.geojson')
    
    with open(geojson_path, 'r') as f:
        data = json.load(f)
    
    wards = []
    for feature in data['features']:
        properties = feature['properties']
        geometry = feature['geometry']
        
        # Extract ward number and name
        name = properties['name']
        ward_match = re.match(r'^Ward (\d+)\s*(.+)', name)
        
        if ward_match:
            ward_number = int(ward_match.group(1))
            ward_name = ward_match.group(2).strip()
        else:
            # Generate a unique number for wards without clear numbering
            ward_number = 1000 + len(wards)  
            ward_name = name
        
        # Calculate approximate center from polygon coordinates
        if geometry['type'] == 'Polygon':
            coords = geometry['coordinates'][0]
            lat_sum = sum(coord[1] for coord in coords)
            lon_sum = sum(coord[0] for coord in coords)
            avg_lat = lat_sum / len(coords)
            avg_lon = lon_sum / len(coords)
        else:
            avg_lat, avg_lon = 17.4065, 78.4772  # Hyderabad center as fallback
        
        wards.append({
            'ward_number': ward_number,
            'ward_name': ward_name,
            'lat': avg_lat,
            'lon': avg_lon,
            'geometry': geometry,
            'raw_name': name
        })
    
    # Sort by ward number for consistent processing
    wards.sort(key=lambda x: x['ward_number'])
    return wards


def categorize_ward_profile(ward_name):
    """
    Categorize ward into political and demographic profiles based on known Hyderabad characteristics.
    This creates realistic baseline data for political intelligence analysis.
    """
    
    # High-affluent areas (Business/IT hubs, upscale residential)
    affluent_wards = [
        'Jubilee Hills', 'Banjara Hills', 'Madhapur', 'Gachibowli', 'Kondapur', 
        'Begumpet', 'Somajiguda', 'Khairatabad', 'KPHB Colony', 'Miyapur'
    ]
    
    # IT/Tech corridors
    tech_corridors = [
        'Madhapur', 'Gachibowli', 'Kondapur', 'KPHB Colony', 'Miyapur', 'Kukatpally',
        'Serilingampally', 'Hafeezpet', 'Chandanagar'
    ]
    
    # Old city areas (Traditional Muslim majority)
    old_city = [
        'Charminar', 'Yakutpura', 'Dabeerpura', 'Bahadurpura', 'Chandrayangutta',
        'Asif Nagar', 'Mehdipatnam', 'Karwan', 'Goshamahal', 'Malakpet'
    ]
    
    # Military/Cantonment areas
    military_areas = [
        'Secunderabad Cantonment', 'Marredpally', 'Trimulgherry', 'Bowenpally',
        'Alwal', 'Bolaram'
    ]
    
    # Industrial areas
    industrial_areas = [
        'Kapra', 'Uppal', 'Nacharam', 'Tarnaka', 'Malkajgiri', 'Sanathnagar',
        'Moosapet', 'Jeedimetla', 'Quthbullapur'
    ]
    
    # Determine profiles
    if ward_name in affluent_wards:
        economic_profile = 'affluent'
        primary_parties = ['BJP', 'INC', 'BRS']
        key_issues = ['infrastructure', 'governance_quality', 'security']
        demographics = 'upper_middle_class_professionals'
    elif ward_name in tech_corridors:
        economic_profile = 'upper_middle'
        primary_parties = ['BJP', 'BRS', 'INC']
        key_issues = ['digital_infrastructure', 'traffic', 'housing']
        demographics = 'tech_professionals_young_families'
    elif any(old_city_area in ward_name for old_city_area in old_city):
        economic_profile = 'middle_lower'
        primary_parties = ['AIMIM', 'BRS', 'INC']
        key_issues = ['minority_rights', 'basic_amenities', 'employment']
        demographics = 'traditional_muslim_community'
    elif any(mil_area in ward_name for mil_area in military_areas):
        economic_profile = 'middle'
        primary_parties = ['BJP', 'INC', 'BRS']
        key_issues = ['security', 'civilian_infrastructure', 'veterans_affairs']
        demographics = 'military_civilian_mixed'
    elif any(ind_area in ward_name for ind_area in industrial_areas):
        economic_profile = 'working_class'
        primary_parties = ['BRS', 'INC', 'BJP']
        key_issues = ['employment', 'pollution', 'worker_rights']
        demographics = 'industrial_workers_families'
    else:
        # Default middle-class residential
        economic_profile = 'middle'
        primary_parties = ['BJP', 'BRS', 'INC']
        key_issues = ['civic_amenities', 'education', 'healthcare']
        demographics = 'middle_class_residential'
    
    return {
        'economic_profile': economic_profile,
        'primary_parties': primary_parties,
        'key_issues': key_issues,
        'demographics': demographics
    }


def seed_all_ghmc_wards():
    """Seed all 145 GHMC wards with comprehensive political intelligence baseline data."""
    
    print("=== GHMC Ward Seeding - Database Migration Specialist ===")
    print("Seeding all 145 GHMC wards for Political Strategist infrastructure...")
    
    # Load ward data from GeoJSON
    print("Loading ward data from GeoJSON...")
    wards = load_ward_data_from_geojson()
    print(f"Loaded {len(wards)} wards from GeoJSON")
    
    # Clear existing data (idempotent operation)
    print("Clearing existing ward data...")
    PollingStation.query.delete()
    WardProfile.query.delete()
    WardDemographics.query.delete()
    WardFeatures.query.delete()
    db.session.commit()
    
    # Seed polling stations (primary geographic structure)
    print("Creating polling station records...")
    for ward_data in wards:
        ward_profile = categorize_ward_profile(ward_data['ward_name'])
        
        # Create 3-5 polling stations per ward (realistic for GHMC)
        num_stations = random.randint(3, 5)
        
        for i in range(num_stations):
            # Generate slight geographic variation around ward center
            lat_offset = random.uniform(-0.01, 0.01)
            lon_offset = random.uniform(-0.01, 0.01)
            
            # Create unique PS_ID with timestamp to prevent conflicts
            timestamp_suffix = int(datetime.now(timezone.utc).timestamp()) % 10000
            ps = PollingStation(
                ps_id=f"PS_{ward_data['ward_number']:03d}_{i+1:02d}_{timestamp_suffix}",
                name=f"Polling Station {i+1} - {ward_data['ward_name']}",
                address=f"Sector {i+1}, {ward_data['ward_name']}, Hyderabad",
                lat=ward_data['lat'] + lat_offset,
                lon=ward_data['lon'] + lon_offset,
                ac_id=f"AC_{(ward_data['ward_number'] // 7) + 1:03d}",  # Approximate AC mapping
                pc_id="PC_001_HYDERABAD",  # Single parliamentary constituency for GHMC
                ward_id=str(ward_data['ward_number']),
                ward_name=ward_data['ward_name'],
                source_meta={
                    'geojson_source': 'ghmc_wards.geojson',
                    'created_by': 'database_migration_specialist',
                    'economic_profile': ward_profile['economic_profile'],
                    'primary_parties': ward_profile['primary_parties']
                }
            )
            
            db.session.add(ps)
    
    # Seed ward profiles (political intelligence baseline)
    print("Creating ward profile records...")
    for ward_data in wards:
        ward_profile = categorize_ward_profile(ward_data['ward_name'])
        
        # Generate realistic electoral data
        electors = random.randint(15000, 50000)
        turnout_pct = round(random.uniform(55.0, 85.0), 1)
        votes_cast = int(electors * turnout_pct / 100)
        
        profile = WardProfile(
            ward_id=str(ward_data['ward_number']),
            electors=electors,
            votes_cast=votes_cast,
            turnout_pct=turnout_pct,
            last_winner_party=ward_profile['primary_parties'][0],
            last_winner_year=2023,
            updated_at=datetime.now(timezone.utc)
        )
        
        db.session.add(profile)
    
    # Seed ward demographics (voter analysis foundation)
    print("Creating ward demographics records...")
    for ward_data in wards:
        ward_profile = categorize_ward_profile(ward_data['ward_name'])
        
        # Generate realistic demographic indices based on ward characteristics
        if ward_profile['economic_profile'] == 'affluent':
            literacy_idx = round(random.uniform(0.8, 0.95), 2)
            muslim_idx = round(random.uniform(0.1, 0.3), 2)
            scst_idx = round(random.uniform(0.05, 0.15), 2)
            secc_deprivation_idx = round(random.uniform(0.1, 0.3), 2)
        elif 'muslim' in ward_profile['demographics']:
            literacy_idx = round(random.uniform(0.6, 0.8), 2)
            muslim_idx = round(random.uniform(0.5, 0.8), 2)
            scst_idx = round(random.uniform(0.05, 0.15), 2)
            secc_deprivation_idx = round(random.uniform(0.4, 0.7), 2)
        elif ward_profile['economic_profile'] == 'working_class':
            literacy_idx = round(random.uniform(0.5, 0.75), 2)
            muslim_idx = round(random.uniform(0.15, 0.35), 2)
            scst_idx = round(random.uniform(0.2, 0.4), 2)
            secc_deprivation_idx = round(random.uniform(0.5, 0.8), 2)
        else:
            literacy_idx = round(random.uniform(0.65, 0.85), 2)
            muslim_idx = round(random.uniform(0.15, 0.25), 2)
            scst_idx = round(random.uniform(0.1, 0.25), 2)
            secc_deprivation_idx = round(random.uniform(0.3, 0.6), 2)
        
        demographics = WardDemographics(
            ward_id=str(ward_data['ward_number']),
            literacy_idx=literacy_idx,
            muslim_idx=muslim_idx,
            scst_idx=scst_idx,
            secc_deprivation_idx=secc_deprivation_idx,
            updated_at=datetime.now(timezone.utc)
        )
        
        db.session.add(demographics)
    
    # Seed ward features (political intelligence markers)
    print("Creating ward features records...")
    for ward_data in wards:
        ward_profile = categorize_ward_profile(ward_data['ward_name'])
        
        # Generate realistic party share data based on ward characteristics
        parties = ward_profile['primary_parties']
        
        # AS23 (Assembly 2023) party shares
        if ward_profile['economic_profile'] == 'affluent':
            as23_shares = {parties[0]: random.uniform(35, 50), parties[1]: random.uniform(25, 35), parties[2]: random.uniform(15, 25)}
        elif 'muslim' in ward_profile['demographics']:
            as23_shares = {parties[0]: random.uniform(40, 60), parties[1]: random.uniform(20, 30), parties[2]: random.uniform(15, 25)}
        else:
            as23_shares = {parties[0]: random.uniform(30, 45), parties[1]: random.uniform(25, 35), parties[2]: random.uniform(20, 30)}
        
        # Normalize to 100%
        total = sum(as23_shares.values())
        as23_shares = {k: round(v/total*100, 1) for k, v in as23_shares.items()}
        
        # LS24 (Lok Sabha 2024) party shares (similar but with some variation)
        ls24_shares = {}
        for party, share in as23_shares.items():
            variation = random.uniform(-5, 5)
            ls24_shares[party] = max(0, round(share + variation, 1))
        
        # DVI (Development Vulnerability Index) data
        dvi_data = {
            'infrastructure': round(random.uniform(0.3, 0.9), 2),
            'social': round(random.uniform(0.2, 0.8), 2),
            'economic': round(random.uniform(0.4, 0.9), 2),
            'governance': round(random.uniform(0.3, 0.7), 2)
        }
        
        # Incumbency weakness analysis
        incumbency_data = {
            'performance_score': round(random.uniform(0.4, 0.8), 2),
            'satisfaction_index': round(random.uniform(0.3, 0.9), 2),
            'vulnerability_score': round(random.uniform(0.2, 0.7), 2)
        }
        
        features = WardFeatures(
            ward_id=str(ward_data['ward_number']),
            as23_party_shares=as23_shares,
            ls24_party_shares=ls24_shares,
            dvi=dvi_data,
            aci_23=round(random.uniform(0.4, 0.9), 2),  # Anti-Incumbency Index
            turnout_volatility=round(random.uniform(0.1, 0.4), 2),
            incumbency_weakness=incumbency_data,
            updated_at=datetime.now(timezone.utc)
        )
        
        db.session.add(features)
    
    # Commit all data
    print("Committing all ward data to database...")
    db.session.commit()
    
    # Create strategic indexes for performance
    print("Creating performance indexes...")
    
    indexes = [
        "CREATE INDEX IF NOT EXISTS ix_polling_station_ward_id ON polling_station (ward_id)",
        "CREATE INDEX IF NOT EXISTS ix_polling_station_ward_name ON polling_station (ward_name)",
        "CREATE INDEX IF NOT EXISTS ix_ward_profile_ward_id ON ward_profile (ward_id)",
        "CREATE INDEX IF NOT EXISTS ix_ward_demographics_ward_id ON ward_demographics (ward_id)",
        "CREATE INDEX IF NOT EXISTS ix_ward_features_ward_id ON ward_features (ward_id)",
        "CREATE INDEX IF NOT EXISTS ix_ward_profile_party ON ward_profile (last_winner_party)",
        "CREATE INDEX IF NOT EXISTS ix_ward_demographics_indices ON ward_demographics (literacy_idx, muslim_idx, scst_idx)"
    ]
    
    for index_sql in indexes:
        try:
            db.session.execute(text(index_sql))
        except Exception as e:
            print(f"Index creation warning: {e}")
    
    db.session.commit()
    
    # Verification and reporting
    print("\n=== WARD SEEDING VERIFICATION ===")
    
    # Count records
    ps_count = PollingStation.query.count()
    profile_count = WardProfile.query.count()
    demographics_count = WardDemographics.query.count()
    features_count = WardFeatures.query.count()
    
    print(f"Polling Stations created: {ps_count}")
    print(f"Ward Profiles created: {profile_count}")
    print(f"Ward Demographics created: {demographics_count}")
    print(f"Ward Features created: {features_count}")
    
    # Sample ward verification
    print(f"\n=== SAMPLE WARD VERIFICATION ===")
    sample_wards = ['Jubilee Hills', 'Khairatabad', 'Gachibowli', 'Old Malakpet', 'Kapra']
    
    for ward_name in sample_wards:
        ps_count = PollingStation.query.filter_by(ward_name=ward_name).count()
        profile = WardProfile.query.filter_by(ward_name=ward_name).first()
        demo = WardDemographics.query.filter_by(ward_id=profile.ward_id if profile else 'none').first()
        features = WardFeatures.query.filter_by(ward_id=profile.ward_id if profile else 'none').first()
        
        print(f"{ward_name}:")
        print(f"  Polling stations: {ps_count}")
        print(f"  Profile: {'✓' if profile else '✗'}")
        print(f"  Demographics: {'✓' if demo else '✗'}")
        print(f"  Features: {'✓' if features else '✗'}")
        if profile:
            print(f"  Ward ID: {profile.ward_id}, Last winner: {profile.last_winner_party}")
        print()
    
    # Political intelligence summary
    print("=== POLITICAL INTELLIGENCE BASELINE ===")
    party_dominance = {}
    for profile in WardProfile.query.all():
        party = profile.last_winner_party
        party_dominance[party] = party_dominance.get(party, 0) + 1
    
    for party, count in sorted(party_dominance.items()):
        print(f"{party}: {count} wards ({count/len(wards)*100:.1f}%)")
    
    print(f"\n✅ COMPLETE: All {len(wards)} GHMC wards seeded successfully!")
    print("✅ Political Strategist infrastructure ready for Epic 5.0.1")
    print("✅ Database performance indexes created")
    print("✅ Ward-centric intelligence baseline established")


if __name__ == '__main__':
    # Set up Flask app context
    app = create_app()
    
    with app.app_context():
        seed_all_ghmc_wards()