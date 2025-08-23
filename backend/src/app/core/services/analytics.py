import os
import google.generativeai as genai
import json
import logging
import tweepy
from newsapi import NewsApiClient
from datetime import datetime, timedelta
from .models import db, Post, Author, Alert

# --- CONFIGURATION ---

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

try:
    genai.configure(api_key=os.environ["GEMINI_API_KEY"])
    model = genai.GenerativeModel('gemini-1.5-flash')
    logging.info("Generative AI model configured successfully.")
except KeyError:
    logging.error("GEMINI_API_KEY environment variable not set.")
    model = None

try:
    twitter_client = tweepy.Client(os.environ["TWITTER_BEARER_TOKEN"])
    logging.info("Tweepy client configured successfully.")
except KeyError:
    logging.error("TWITTER_BEARER_TOKEN environment variable not set.")
    twitter_client = None

try:
    newsapi = NewsApiClient(api_key=os.environ["NEWS_API_KEY"])
    logging.info("NewsAPI client configured successfully.")
except KeyError:
    logging.error("NEWS_API_KEY environment variable not set.")
    newsapi = None

# --- NEW PROACTIVE ANALYSIS SERVICE ---

def generate_proactive_analysis(context_level, context_name):
    """
    Generates an on-demand analysis of opportunities and threats based on live news,
    tailored to the user's specific context (ward, city, or state).
    """
    if not newsapi:
        logging.error("NewsAPI client is not available.")
        return {"error": "NewsAPI client not configured."}
    if not model:
        logging.error("AI model is not available.")
        return {"error": "AI model not configured."}

    # 1. Generate Contextual News Query
    keywords = {
        "ward": f'"{context_name}" AND (local issues OR infrastructure OR water OR garbage)',
        "city": f'"{context_name}" AND (GHMC OR development OR traffic OR metro)',
        "state": f'"{context_name}" AND ("chief minister" OR Kaleshwaram OR "state budget" OR politics)'
    }
    query = keywords.get(context_level, context_name) # Default to context_name if level is unknown
    logging.info(f"Generated NewsAPI query for {context_level} '{context_name}': {query}")

    # 2. Fetch Live News
    try:
        articles = newsapi.get_everything(
            q=query,
            language='en',
            sort_by='relevancy',
            page_size=5 # Focus on the top 5 most relevant articles
        )['articles']

        if not articles:
            logging.info("No relevant news articles found for this context.")
            # Store a "no data" alert to prevent re-running analysis too soon
            alert = Alert(ward=context_name, description="No recent news found for this context.", severity="Info")
            db.session.add(alert)
            db.session.commit()
            return {"message": "No relevant news articles found to analyze."}
            
        news_content = "\n".join([f"Title: {a['title']}. Description: {a.get('description', '')}" for a in articles])

    except Exception as e:
        logging.error(f"Error fetching news from NewsAPI: {e}", exc_info=True)
        return {"error": "Failed to fetch news."}

    # 3. AI-Powered Deep Dive Analysis
    prompt = f"""
    You are 'Chanakya', a master political strategist for the BJP party in Hyderabad, India.
    Your task is to conduct a deep-dive analysis of the following news articles related to '{context_name}' and identify strategic opportunities and threats.

    **News Articles Content:**
    ---
    {news_content}
    ---

    Based on your analysis, provide a structured report as a JSON object with three keys:
    1. "opportunities": A JSON list of 2-3 specific, actionable opportunities we can leverage. These should be positive developments or opposition weaknesses.
    2. "threats": A JSON list of 2-3 emerging threats or negative narratives we need to counter.
    3. "priority_alert": A single, concise string (under 280 characters) summarizing the most critical finding that requires immediate attention. This will be the main alert message.

    Example Response:
    {{
        "opportunities": [
            "Capitalize on the positive local media coverage of the new flyover by organizing a press meet with the MLA.",
            "The opposition's internal conflict over the water board appointments is a weakness we can highlight."
        ],
        "threats": [
            "A growing narrative about delays in garbage collection in the Old City is gaining traction.",
            "Rival parties are starting to use the power-cut issue to mobilize residents."
        ],
        "priority_alert": "Threat: Negative sentiment is growing around garbage collection delays in the Old City. Recommend immediate statement from local leadership."
    }}
    """

    try:
        logging.info("Sending news content to AI for deep-dive analysis...")
        response = model.generate_content(prompt)
        cleaned_response = response.text.strip().replace('```json', '').replace('```', '').strip()
        analysis_result = json.loads(cleaned_response)

        # 4. Store the Alert in the Database
        if analysis_result.get("priority_alert"):
            alert = Alert(
                ward=context_name,
                description=analysis_result["priority_alert"],
                severity="High" if "threat" in analysis_result["priority_alert"].lower() else "Medium"
            )
            db.session.add(alert)
            db.session.commit()
            logging.info(f"New alert for '{context_name}' stored successfully.")
        
        return analysis_result

    except Exception as e:
        logging.error(f"Error during AI analysis or database storage: {e}", exc_info=True)
        return {"error": "Failed to generate analysis."}

# --- AI & DATA PROCESSING SERVICES ---

def get_emotion_and_drivers(text):
    """Analyzes text to extract emotion and drivers."""
    # This function remains as is from Phase 1 & 2
    if not model:
        logging.error("AI model is not available. Cannot analyze text.")
        return {"emotion": "Unknown", "drivers": []}
    
    prompt = f"""
    Analyze the following text from a social media post or news article in a political context for Hyderabad, India.
    Your task is to identify the primary emotion and the specific topics or entities driving that emotion.
    Text: "{text}"
    Provide your response as a JSON object with two keys:
    1. "emotion": A single string representing the dominant emotion.
    2. "drivers": A JSON list of short, specific strings (1-3 words each) that are the key topics, names, or issues causing the emotion.
    """
    try:
        logging.debug(f"Sending text for analysis: '{text[:100]}...'")
        response = model.generate_content(prompt)
        cleaned_response = response.text.strip().replace('```json', '').replace('```', '').strip()
        result = json.loads(cleaned_response)
        if isinstance(result, dict) and 'emotion' in result and 'drivers' in result:
            return result
        else:
            return {"emotion": "Unknown", "drivers": []}
    except Exception as e:
        logging.error(f"Error in get_emotion_and_drivers: {e}")
        return {"emotion": "Error", "drivers": []}

def get_strategic_summary(ward_name, posts):
    """
    Generates a comprehensive strategic communications playbook for a given ward
    based on the posts from that area.
    """
    if not model:
        logging.error("AI model is not available. Cannot generate strategic summary.")
        return {"error": "AI model not available."}
        
    if not posts:
        return {
            "candidate_briefing": f"No recent data available for {ward_name} to generate a summary.",
            "talking_points": [],
            "social_media_drafts": [],
            "proactive_initiatives": []
        }

    # Separate posts by affiliation for the prompt
    client_posts_str = "\n".join([p['content'] for p in posts if p['affiliation'] == 'Client'])
    opposition_posts_str = "\n".join([p['content'] for p in posts if p['affiliation'] == 'Opposition'])

    prompt = f"""
    You are 'Chanakya', a master political strategist for the BJP party in Hyderabad, India. Your task is to create a comprehensive communications action plan for the '{ward_name}' ward.

    Analyze the provided social media data, which includes posts from our campaign ('Client') and the opposition (Congress, BRS, MIM). Based on this data, generate a strategic playbook as a JSON object.

    **Client's Narrative (Our Posts):**
    ---
    {client_posts_str or "No client posts to analyze."}
    ---

    **Opposition's Narrative:**
    ---
    {opposition_posts_str or "No opposition posts to analyze."}
    ---

    Now, based on your analysis of the above narratives, provide a complete strategic response in the following JSON format. Ensure all fields are filled.

    {{
      "candidate_briefing": "A concise, one-paragraph summary for our candidate explaining the current situation in the ward. What is the opposition focusing on? What is the general public sentiment?",
      "talking_points": [
        "A JSON list of 3-4 powerful, bullet-point talking points for a press conference. These should praise our work and effectively counter the opposition's narrative.",
        "Each talking point should be a complete sentence."
      ],
      "social_media_drafts": [
        {{
          "platform": "Twitter/X",
          "content": "A short, impactful tweet (under 280 characters) to be posted on social media. It should be positive and highlight a specific achievement.",
          "tone": "Assertive"
        }},
        {{
          "platform": "Facebook/Instagram",
          "content": "A slightly longer, more detailed post for Facebook or Instagram. It can be more narrative-driven and connect emotionally with residents.",
          "tone": "Empathetic"
        }}
      ],
      "proactive_initiatives": [
        "A JSON list of 2-3 concrete, real-world actions our campaign can take in the next 48 hours to win the narrative in '{ward_name}'. Examples: 'Organize a press meet at the new community hall', 'Candidate to visit the water-logged areas and assure action', 'Release a video testimonial from a local beneficiary'."
      ]
    }}
    """
    
    try:
        logging.info(f"Generating strategic summary for ward: {ward_name}")
        response = model.generate_content(prompt)
        cleaned_response = response.text.strip().replace('```json', '').replace('```', '').strip()
        result = json.loads(cleaned_response)
        return result
    except Exception as e:
        logging.error(f"An error occurred during strategic summary generation: {e}", exc_info=True)
        return {"error": f"Could not generate summary due to an error: {e}"}

def process_and_store_content(content, source_author_name, ward="Hyderabad"):
    """Analyzes content and stores it as a Post in the database."""
    # This function remains as is
    existing_post = Post.query.filter_by(content=content).first()
    if existing_post:
        logging.info(f"Skipping duplicate content: '{content[:50]}...'")
        return

    logging.info(f"Processing new content from '{source_author_name}': '{content[:50]}...'")
    author = Author.query.filter_by(name=source_author_name).first()
    if not author:
        logging.warning(f"Author '{source_author_name}' not found. Creating new author with 'Opposition' affiliation.")
        author = Author(name=source_author_name, affiliation="Opposition")
        db.session.add(author)
        db.session.commit()

    analysis = get_emotion_and_drivers(content)
    new_post = Post(
        content=content,
        ward=ward,
        emotion=analysis.get('emotion', 'Unknown'),
        drivers=analysis.get('drivers', []),
        author_id=author.id
    )
    db.session.add(new_post)
    db.session.commit()
    logging.info(f"Successfully stored new post from '{source_author_name}'.")

# --- LIVE DATA FETCHING SERVICES ---

def fetch_and_process_tweets():
    """Fetches and processes tweets from the Twitter API."""
    # This function remains as is
    if not twitter_client:
        logging.error("Twitter client not available. Skipping tweet fetch.")
        return "Twitter client not configured."
    query = '("BJP Telangana" OR "Telangana Congress" OR "BRS Party" OR "AIMIM" OR "GHMC") -is:retweet -is:reply lang:en'
    try:
        logging.info(f"Fetching tweets with query: {query}")
        response = twitter_client.search_recent_tweets(query=query, max_results=10)
        if not response.data:
            logging.info("No new tweets found for the given query.")
            return "No new tweets found."
        tweet_count = 0
        for tweet in response.data:
            process_and_store_content(tweet.text, source_author_name="Twitter User")
            tweet_count += 1
        logging.info(f"Successfully processed {tweet_count} tweets.")
        return f"Processed {tweet_count} tweets."
    except Exception as e:
        logging.error(f"An error occurred while fetching tweets: {e}", exc_info=True)
        return "Error fetching tweets."

def fetch_and_process_news():
    """Fetches and processes news from the News API."""
    # This function remains as is
    if not newsapi:
        logging.error("NewsAPI client not available. Skipping news fetch.")
        return "NewsAPI client not configured."
    query = 'Hyderabad politics OR GHMC OR Telangana government'
    try:
        logging.info(f"Fetching news with query: {query}")
        top_headlines = newsapi.get_everything(
            q=query,
            language='en',
            sort_by='publishedAt',
            page_size=10
        )
        if not top_headlines['articles']:
            logging.info("No new articles found for the given query.")
            return "No new articles found."
        article_count = 0
        for article in top_headlines['articles']:
            content_to_process = f"{article['title']}. {article['description']}"
            author_name = article['source']['name']
            process_and_store_content(content_to_process, source_author_name=author_name)
            article_count += 1
        logging.info(f"Successfully processed {article_count} articles.")
        return f"Processed {article_count} articles."
    except Exception as e:
        logging.error(f"An error occurred while fetching news: {e}", exc_info=True)
        return "Error fetching news."