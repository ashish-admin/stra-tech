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
    model = genai.GenerativeModel('gemini-1.5-flash-latest', generation_config={"response_mime_type": "application/json"})
    prompt = f"""
    You are a sophisticated political analyst. Analyze the dominant emotion for each text entry in the following list.
    Classify each text into one of these exact categories: [Hope, Anger, Joy, Anxiety, Sadness, Disgust, Apathy].
    Return your response as a single, valid JSON object with a single key "emotionAnalysis" which contains an array where each object has an "id" and its analyzed "emotion".
    Input Data: {json.dumps(records)}
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
        for record in records:
            record['emotion'] = 'Error'
        return records

def analyze_emotions_and_drivers(records):
    model = genai.GenerativeModel('gemini-1.5-flash-latest', generation_config={"response_mime_type": "application/json"})
    prompt = f"""
    You are a sophisticated political analyst. For each text entry, perform two tasks:
    1. Analyze the dominant emotion from this list: [Hope, Anger, Joy, Anxiety, Sadness, Disgust, Apathy].
    2. Extract a list of 1 to 3 specific keywords, topics, or proper nouns that are the root cause of the emotion.
    Return a single JSON object with a key "analysis" containing an array. Each object must have an "id", its "emotion", and a "drivers" list.
    Input Data: {json.dumps(records)}
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
        for record in records:
            record['emotion'] = 'Error'
            record['drivers'] = []
        return records