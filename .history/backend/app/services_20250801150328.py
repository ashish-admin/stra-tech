import os
import json
from dotenv import load_dotenv
import google.generativeai as genai

# Load environment variables and configure the API key
load_dotenv()
GOOGLE_API_KEY = os.getenv('GEMINI_API_KEY')

if not GOOGLE_API_KEY:
    raise ValueError("GEMINI_API_KEY not found. Please ensure it is set in your /backend/.env file.")
genai.configure(api_key=GOOGLE_API_KEY)


def analyze_emotions(records):
    """
    Analyzes a list of records for emotions using Gemini in JSON Mode.
    """
    model = genai.GenerativeModel(
        'gemini-1.5-flash-latest',
        generation_config={"response_mime_type": "application/json"}
    )

    prompt = f"""
    Analyze the emotion for each text entry in the following list.
    Classify each text into one of these exact categories: Hope, Anger, Joy, Anxiety, Sadness, Neutral.
    Return your response as a single, valid JSON object with a single key "emotionAnalysis" which contains an array where each object has an "id" and its analyzed "emotion".

    Input Data:
    {json.dumps(records)}
    """
    
    try:
        response = model.generate_content(prompt)
        
        # --- THIS IS THE CORRECTED LOGIC ---
        # 1. Parse the entire JSON response text
        response_data = json.loads(response.text)
        
        # 2. Extract the list from the "emotionAnalysis" key
        emotion_data = response_data['emotionAnalysis']
        # ------------------------------------

        # Create a mapping of id -> emotion for easy lookup
        emotion_map = {int(item['id']): item['emotion'] for item in emotion_data}

        # Enrich the original records with the new emotion
        for record in records:
            record['emotion'] = emotion_map.get(record.get('id'), 'Unknown')
        
        return records

    except Exception as e:
        print(f"An error occurred during AI analysis: {e}")
        # Print the problematic response text if available
        if 'response' in locals():
            print("--- Full AI Response Text ---")
            print(response.text)
            print("-----------------------------")
        
        # Return original records so the seeding process can still be debugged
        for record in records:
            record['emotion'] = 'Error'
        return records