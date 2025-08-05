import random
import logging
from app import create_app, db
from app.models import Post, Author
from app.services import get_emotion_and_drivers

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# --- DATA CONFIGURATION ---

# List of all 150 GHMC Wards for comprehensive seeding
WARDS = [
    "Kapra", "Dr. A.S. Rao Nagar", "Cherlapally", "Meerpet H.B. Colony", "Mallapur", "Nacharam", "Chilkanagar", "Habsiguda", "Ramanthapur", "Uppal",
    "Nagole", "Mansoorabad", "Hayathnagar", "B.N. Reddy Nagar", "Vanasthalipuram", "Hastinapuram", "Champapet", "Lingojiguda", "Saroornagar", "Kothapet",
    "Chaitanyapuri", "Gaddiannaram", "Dilsukhnagar", "Moosarambagh", "Saidabad", "I.S. Sadan", "Santoshnagar", "Riyasath Nagar", "Kanchanbagh", "Barkas",
    "Chandrayangutta", "Jangammet", "Uppuguda", "Lalithabagh", "Kurmaguda", "Akberbagh", "Old Malakpet", "Azampura", "Chawni", "Dabeerpura",
    "Rein Bazar", "Pathargatti", "Moghalpura", "Gowlipura", "Shah Ali Banda", "Hussaini Alam", "Ghansi Bazar", "Begum Bazar", "Goshamahal", "Puranapul",
    "Dhoolpet", "Karwan", "Jiyaguda", "Gudimalkapur", "Asif Nagar", "Mehdipatnam", "Vijay Nagar Colony", "Ahmed Nagar", "Mallepally", "Red Hills",
    "Jambagh", "Gunfoundry", "Himayatnagar", "Kachiguda", "Nallakunta", "Golnaka", "Amberpet", "Bagh Amberpet", "Vidyanagar", "Domalguda",
    "Ramnagar", "Musheerabad", "Bholakpur", "Gandhinagar", "Kavadiguda", "Khairatabad", "Venkateshwara Colony", "Banjara Hills", "Jubilee Hills", "Shaikpet",

    "Tolichowki", "Gachibowli", "Serilingampally", "Hafeezpet", "Miyapur", "Madinaguda", "Chanda Nagar", "Patancheruvu", "Kukatpally", "Vivekananda Nagar Colony",
    "Hydernagar", "Allwyn Colony", "Balanagar", "Fateh Nagar", "Boudha Nagar", "Erragadda", "Borabanda", "Yousufguda", "Sri Nagar Colony", "Somajiguda",
    "Ameerpet", "Sanath Nagar", "Begumpet", "Mettuguda", "Sitaphalmandi", "Bansilalpet", "Ramgopalpet", "Paradise", "Patny", "Karkhana",
    "Tirumalagiri", "Addagutta", "Tarnaka", "Lalapet", "Moulali", "East Anandbagh", "West Anandbagh", "Neredmet", "Vinayak Nagar", "Safilguda",
    "Old Bowenpally", "Bowenpally", "Subhash Nagar", "Quthbullapur", "Jeedimetla", "Jagadgirigutta", "Suraram", "Alwal", "Macha Bollaram", "Yapral",
    "Gajularamaram", "Jawahar Nagar", "Shamshabad", "Rajendranagar", "Attapur", "Suleman Nagar", "Shastripuram", "Mailardevpally", "Kattedan", "Kompally"
]

# Define Political Actors
AUTHORS = [
    {"name": "BJP Telangana", "affiliation": "Client"},
    {"name": "Telangana Congress", "affiliation": "Opposition"},
    {"name": "BRS Party", "affiliation": "Opposition"},
    {"name": "AIMIM", "affiliation": "Opposition"}
]

# Realistic Post Templates
POST_TEMPLATES = {
    "BJP Telangana": [
        "Great progress in {ward} under PM Modi's leadership! #ViksitHyderabad",
        "Our Karyakartas are working tirelessly in {ward} to solve local issues. #BJP4Telangana",
        "Another promise delivered! The new community hall in {ward} is now open. #SabkaSaathSabkaVikas",
        "The opposition's corruption has failed the people of {ward}. Time for a change. #BJPAgain",
        "We demand immediate action on the drainage problems in {ward}. The BRS government is sleeping."
    ],
    "Telangana Congress": [
        "The ruling party has neglected {ward} for too long. We will fight for your rights! #PrajaPrabhutvam",
        "Six guarantees for the people! In {ward}, we promise better roads and clean water.",
        "Met with residents of {ward} today. Their frustration with garbage collection is real. The govt must act.",
        "BJP and BRS are two sides of the same coin. They only care about power, not the people of {ward}.",
        "Another day, another traffic jam in {ward}. This is the result of unplanned development."
    ],
    "BRS Party": [
        "KCR's vision is transforming {ward}! The new flyover will ease traffic for everyone. #KCRDevelopment",
        "Proud of our government's work in {ward}. The 2BHK housing scheme is a grand success.",
        "Our welfare schemes are reaching every family in {ward}. That is the BRS guarantee.",
        "The opposition is spreading lies about development in {ward}. Come see the progress for yourself.",
        "We stand for the secular fabric of Telangana. BJP's divisive politics have no place in {ward}."
    ],
    "AIMIM": [
        "We are the true voice of the people in {ward}. Our focus is on empowerment and justice.",
        "Barrister Asaduddin Owaisi continues to fight for the rights of minorities in {ward} and beyond.",
        "The recent water logging in {ward} shows the incompetence of the GHMC. We demand accountability.",
        "Our party ensures peace and development in the Old City. Look at the state of {ward} under others.",
        "Education is our priority. New school facilities are coming soon to {ward}."
    ]
}

def seed_database():
    """
    Clears and seeds the database with realistic, competitive political data.
    """
    app = create_app()
    with app.app_context():
        logging.info("Starting database seeding process...")

        # Clear existing data
        logging.info("Clearing existing Post and Author data...")
        Post.query.delete()
        Author.query.delete()
        db.session.commit()

        # Create Authors
        logging.info("Creating author records...")
        author_objects = {}
        for author_data in AUTHORS:
            author = Author(name=author_data["name"], affiliation=author_data["affiliation"])
            db.session.add(author)
            author_objects[author.name] = author
        db.session.commit()
        logging.info(f"Successfully created {len(author_objects)} authors.")

        # Generate and insert posts
        logging.info(f"Generating posts for {len(WARDS)} wards...")
        total_posts = 0
        for ward in WARDS:
            # Create 2-4 posts per ward for realism
            for _ in range(random.randint(2, 4)):
                try:
                    # Choose a random author and get a post template
                    author_name = random.choice(list(POST_TEMPLATES.keys()))
                    author = author_objects[author_name]
                    content_template = random.choice(POST_TEMPLATES[author_name])
                    content = content_template.format(ward=ward)

                    # Analyze post using the AI service
                    logging.info(f"Analyzing post for '{ward}' from '{author_name}'...")
                    analysis = get_emotion_and_drivers(content)
                    emotion = analysis.get('emotion', 'Unknown')
                    drivers = analysis.get('drivers', [])

                    # Create new Post object
                    new_post = Post(
                        content=content,
                        ward=ward,
                        emotion=emotion,
                        drivers=drivers,
                        author_id=author.id
                    )
                    db.session.add(new_post)
                    total_posts += 1
                except Exception as e:
                    logging.error(f"Failed to create post for ward {ward}. Error: {e}")
                    db.session.rollback()

        # Commit all new posts
        db.session.commit()
        logging.info(f"Successfully created {total_posts} new posts.")
        logging.info("Database seeding process completed successfully!")

if __name__ == "__main__":
    seed_database()