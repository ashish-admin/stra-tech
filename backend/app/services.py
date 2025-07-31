import os
import json
from dotenv import load_dotenv
import google.generativeai as genai

# Load environment variables and configure the API key
load_dotenv()
GOOGLE_API_KEY = os.getenv('GEMINI_API_KEY')
genai.configure(api_key=GOOGLE_API_KEY)

def analyze_emotions(records):
    """
    Analyzes a list of records for emotions using Gemini in JSON Mode.
    """
    # Configure the model to use the latest Flash version and force JSON output
    model = genai.GenerativeModel(
        'gemini-1.5-flash-latest',
        generation_config={"response_mime_type": "application/json"}
    )

    # Create a single, clear prompt with all the text data
    # The prompt instructs the AI on the exact JSON structure to return
    prompt = f"""
    Analyze the emotion for each text entry in the following list.
    Classify each text into one of these exact categories: Hope, Anger, Joy, Anxiety, Sadness, Neutral.
    Return your response as a single, valid JSON array where each object has an "id" and its analyzed "emotion".

    Input Data:
    {json.dumps(records)}
    """

    # Generate the content
    response = model.generate_content(prompt)

    # Since we are using JSON mode, we can parse the response directly
    try:
        emotion_data = json.loads(response.text)

        # Create a mapping of id -> emotion for easy lookup
        emotion_map = {item['id']: item['emotion'] for item in emotion_data}

        # Enrich the original records with the new emotion
        for record in records:
            record['emotion'] = emotion_map.get(record.get('id'), 'Unknown')

        return records

    except json.JSONDecodeError:
        print("Error: Failed to decode JSON from AI response.")
        print("AI Response Text:", response.text)
        # Return original records without emotion if parsing fails
        return records
    except Exception as e:
        print(f"An unexpected error occurred: {e}")
        return records