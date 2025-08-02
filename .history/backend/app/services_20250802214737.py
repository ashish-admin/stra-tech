import os
import json
from dotenv import load_dotenv
import google.generativeai as genai

load_dotenv()
GOOGLE_API_KEY = os.getenv('GEMINI_API_KEY')

if not GOOGLE_API_KEY:
    raise ValueError("GEMINI_API_KEY not found. Please ensure it is set in your /backend/.env file.")
genai.configure(api_key=GOOGLE_API_KEY)


def analyze_emotions(records):
    """
    (This is the original function for this branch - we are leaving it untouched)
    Analyzes a list of records for a sophisticated range of emotions using Gemini in JSON Mode.
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
            print(f"--- Full AI Response Text ---\n{response.text}\n-----------------------------")
        for record in records:
            record['emotion'] = 'Error'
        return records

# --- THIS IS THE NEW FUNCTION ---
def analyze_emotions_and_drivers(records):
    """
    Analyzes a list of records for both emotions AND their root cause drivers.
    """
    model = genai.GenerativeModel(
        'gemini-1.5-flash-latest',
        generation_config={"response_mime_type": "application/json"}
    )

    prompt = f"""
    You are a sophisticated political analyst. For each text entry in the following list, perform two tasks:
    1.  Analyze the dominant emotion. Classify it into one of these exact categories: [Hope, Anger, Joy, Anxiety, Sadness, Disgust, Apathy].
    2.  Identify the root cause. Extract a JSON list of 1 to 3 specific keywords, topics, or proper nouns that are the primary drivers of that emotion.

    Return your response as a single, valid JSON object with a single key "analysis" which contains an array. Each object in the array must have an "id", its analyzed "emotion", and a "drivers" list.

    Input Data:
    {json.dumps(records)}
    """
    
    try:
        response = model.generate_content(prompt)
        response_data = json.loads(response.text)
        analysis_data = response_data['analysis']

        analysis_map = {int(item['id']): {'emotion': item['emotion'], 'drivers': item.get('drivers', [])} for item in analysis_data}

        for record in records:
            record_id = record.get('id')
            if record_id in analysis_map:
                record['emotion'] = analysis_map[record_id]['emotion']
                record['drivers'] = analysis_map[record_id]['drivers']
            else:
                record['emotion'] = 'Unknown'
                record['drivers'] = []
        
        return records

    except Exception as e:
        print(f"An error occurred during AI analysis: {e}")
        if 'response' in locals():
            print(f"--- Full AI Response Text ---\n{response.text}\n-----------------------------")
        
        for record in records:
            record['emotion'] = 'Error'
            record['drivers'] = []
        return records