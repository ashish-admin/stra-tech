import os
import google.generativeai as genai
import json
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# Configure the generative AI model
try:
    genai.configure(api_key=os.environ["GEMINI_API_KEY"])
    model = genai.GenerativeModel('gemini-1.5-flash')
    logging.info("Generative AI model configured successfully.")
except KeyError:
    logging.error("GEMINI_API_KEY environment variable not set.")
    model = None
except Exception as e:
    logging.error(f"An error occurred during Generative AI configuration: {e}")
    model = None

def get_emotion_and_drivers(text):
    """
    Analyzes the text to extract the primary emotion and its key drivers using the AI model.

    Args:
        text (str): The text content of the post to analyze.

    Returns:
        dict: A dictionary containing 'emotion' and 'drivers' (a list of strings).
              Returns {'emotion': 'Unknown', 'drivers': []} if analysis fails.
    """
    if not model:
        logging.error("AI model is not available. Cannot analyze text.")
        return {"emotion": "Unknown", "drivers": []}

    # Enhanced prompt to extract emotion and specific drivers
    prompt = f"""
    Analyze the following text from a social media post in a political context for Hyderabad, India. 
    Your task is to identify the primary emotion and the specific topics or entities driving that emotion.

    Text: "{text}"

    Provide your response as a JSON object with two keys:
    1. "emotion": A single string representing the dominant emotion (e.g., "Anger", "Hope", "Frustration", "Admiration", "Disappointment", "Neutral").
    2. "drivers": A JSON list of short, specific strings (1-3 words each) that are the key topics, names, or issues causing the emotion. For example, "water logging", "KTR", "road quality", "GHMC elections".

    Example:
    Text: "The roads in Jubilee Hills are pathetic, full of potholes. KTR needs to take action instead of making empty promises about infrastructure."
    Response:
    {{
        "emotion": "Anger",
        "drivers": ["road quality", "potholes", "KTR"]
    }}

    Now, analyze the provided text.
    """

    try:
        logging.info(f"Sending text for analysis: '{text[:100]}...'")
        response = model.generate_content(prompt)
        
        # Clean the response to extract only the JSON part
        cleaned_response = response.text.strip().replace('```json', '').replace('```', '').strip()
        
        logging.info(f"Received raw response from AI: {cleaned_response}")
        
        # Parse the JSON string
        result = json.loads(cleaned_response)
        
        # Validate the structure of the result
        if isinstance(result, dict) and 'emotion' in result and 'drivers' in result and isinstance(result['drivers'], list):
            logging.info(f"Successfully parsed analysis: {result}")
            return result
        else:
            logging.warning(f"Parsed JSON has an unexpected structure: {result}")
            return {"emotion": "Unknown", "drivers": []}

    except json.JSONDecodeError:
        logging.error(f"Failed to decode JSON from response: {cleaned_response}")
        # Fallback for non-JSON responses
        return {"emotion": response.text.strip(), "drivers": []}
    except Exception as e:
        logging.error(f"An error occurred while analyzing emotion and drivers: {e}")
        return {"emotion": "Error", "drivers": []}

def get_strategic_summary(text):
    """
    Generates a strategic summary for a given text using the AI model.
    This function will be enhanced in Phase 3.

    Args:
        text (str): The text content to summarize.

    Returns:
        str: The strategic summary. Returns a default message if generation fails.
    """
    if not model:
        logging.error("AI model is not available. Cannot generate strategic summary.")
        return "AI model not available."

    prompt = f"Provide a brief, one-paragraph strategic summary of the following text: {text}"
    
    try:
        logging.info(f"Generating strategic summary for text: '{text[:100]}...'")
        response = model.generate_content(prompt)
        summary = response.text.strip()
        logging.info("Successfully generated strategic summary.")
        return summary
    except Exception as e:
        logging.error(f"An error occurred during strategic summary generation: {e}")
        return "Could not generate summary due to an error."