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
    Analyzes a list of records for a sophisticated range of emotions using Gemini in JSON Mode.
    (This is the original function for this branch)
    """
    model = genai.GenerativeModel(
        'gemini-1.5-flash-latest',
        generation_config={"response_mime_type": "application/json"}
    )

    prompt = f"""
    You are a sophisticated political analyst. Analyze the dominant emotion for each text entry in the following list.
    Classify each text into one of the following exact categories:
    - Hope: Expressing optimism about the future.
    - Anger: Expressing frustration or outrage, often at a specific entity.
    - Joy: Expressing happiness or celebration.
    - Anxiety: Expressing worry or unease about the future or specific issues.
    - Sadness: Expressing disappointment or sorrow.
    - Disgust: Expressing strong disapproval or revulsion.
    - Apathy: Expressing a lack of interest, indifference, or neutral sentiment.

    Return your response as a single, valid JSON object with a single key "emotionAnalysis" which contains an array where each object has an "id" and its analyzed "emotion".

    Input Data:
    {json.dumps(records)}
    """
    
    try:
        response = model.generate_content(prompt)
        response_data = json.loads(response.text)
        emotion_data = response_data['emotionAnalysis']

        emotion_map = {int(item['id']): item['emotion'] for item in emotion_data}

        for record in records:
            record['emotion'] = emotion_map.get(record.get('id'), 'Unknown')
        
        return records

    except Exception as e:
        print(f"An error occurred during AI analysis: {e}")
        if 'response' in locals():
            print("--- Full AI Response Text ---")
            print(response.text)
            print("-----------------------------")
        
        for record in records:
            record['emotion'] = 'Error'
        return records