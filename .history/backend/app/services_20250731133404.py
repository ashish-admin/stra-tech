import os
import google.generativeai as genai
from dotenv import load_dotenv

# Load .env for GEMINI_API_KEY
load_dotenv()
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)
else:
    raise RuntimeError("GEMINI_API_KEY not set in environment variables or .env file")

def analyze_emotions(text_data):
    """
    text_data: list of dicts with at least a 'text' key
    Returns: list of dicts with 'emotion' field added
    """
    model = genai.GenerativeModel('gemini-pro')

    # Prepare prompt for batch analysis
    prompt = (
        "You are an expert in nuanced emotion classification. For each of the following social media posts, "
        "classify the overall dominant emotion as one of: Hope, Anger, Anxiety, Joy, Sadness, Neutral. "
        "Return a JSON array with keys: id, emotion. Example: [{\"id\": 1, \"emotion\": \"Joy\"}, ...]\n\n"
        "Posts:\n"
    )
    for row in text_data:
        prompt += f"{row['id']}: {row['text']}\n"

    response = model.generate_content(prompt)
    import json
    try:
        emotion_data = json.loads(response.text.strip().split('\n')[0])
    except Exception:
        # Fallback: try to extract JSON from response by finding first [ ... ]
        import re
        match = re.search(r'\[.*\]', response.text, re.DOTALL)
        emotion_data = json.loads(match.group(0)) if match else []

    # Build id->emotion mapping
    emotion_map = {str(item['id']): item['emotion'] for item in emotion_data if 'id' in item and 'emotion' in item}

    # Merge emotion into original data
    enriched = []
    for row in text_data:
        row_copy = row.copy()
        row_copy['emotion'] = emotion_map.get(str(row['id']), "Unknown")
        enriched.append(row_copy)
    return enriched