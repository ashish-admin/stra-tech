import os
import json
from dotenv import load_dotenv
import google.generativeai as genai

load_dotenv()
GOOGLE_API_KEY = os.getenv('GEMINI_API_KEY')

if not GOOGLE_API_KEY:
    raise ValueError("GEMINI_API_KEY not found in .env file.")
genai.configure(api_key=GOOGLE_API_KEY)

def analyze_emotions_and_drivers(records):
    model = genai.GenerativeModel('gemini-1.5-flash-latest', generation_config={"response_mime_type": "application/json"})
    prompt = f"""
    You are a sophisticated political analyst. For each text entry, perform two tasks:
    1. Analyze the dominant emotion from this list: [Hope, Anger, Joy, Anxiety, Sadness, Disgust, Apathy].
    2. Extract a list of 1 to 3 specific keywords, topics, or proper nouns that are the root cause of the emotion.
    Return a single JSON object with a key "analysis" containing an array. Each object must have an "id", its "emotion", and a "drivers" list.
    Input Data: {json.dumps(records)}
    """
    
    print("\n--- Sending Prompt to Gemini AI ---")
    print(f"Analyzing {len(records)} records...")
    
    try:
        response = model.generate_content(prompt)
        print("--- Received Raw Response from Gemini AI ---")
        print(response.text)
        
        response_data = json.loads(response.text)
        analysis_data = response_data.get('analysis', [])
        
        if not analysis_data:
            print("WARNING: AI analysis returned an empty list.")

        analysis_map = {int(item['id']): {'emotion': item.get('emotion', 'Unclassified'), 'drivers': item.get('drivers', [])} for item in analysis_data}
        
        for record in records:
            record_id = record.get('id')
            if record_id in analysis_map:
                record.update(analysis_map[record_id])
            else:
                record['emotion'] = 'Unknown'
                record['drivers'] = []
        
        print("--- Successfully Parsed AI Response ---")
        return records

    except (json.JSONDecodeError, KeyError, Exception) as e:
        print("\n❌ FATAL ERROR IN AI SERVICE ❌")
        print(f"Error Type: {type(e).__name__}")
        print(f"Error Details: {e}")
        if 'response' in locals():
            print("--- Raw AI Response that caused error ---")
            print(response.text)
        
        for record in records:
            record['emotion'] = 'AI Error'
            record['drivers'] = []
        return records