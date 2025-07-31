from flask import Blueprint, jsonify
import pandas as pd
from .services import analyze_emotions
import os

bp = Blueprint('main', __name__)

@bp.route('/api/v1/analytics', methods=['GET'])
def analytics():
    # Read the CSV file
    data_path = os.path.join(os.path.dirname(__file__), '../../data/mock_data.csv')
    df = pd.read_csv(data_path)
    records = df.to_dict(orient='records')
    # Analyze emotions
    enriched = analyze_emotions(records)
    return jsonify(enriched)