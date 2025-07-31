# LokDarpan MVP

LokDarpan is a web-based discourse analytics platform designed to analyze social media-style posts for nuanced emotions and visualize them interactively. The platform leverages the Google Gemini AI API to classify emotions from multilingual text and presents the results via charts and maps for quick insights.

## Project Structure

```
/lokdarpan-mvp
|-- /backend
|   |-- /app
|   |   |-- __init__.py
|   |   |-- routes.py
|   |   |-- services.py
|   |-- run.py
|   |-- requirements.txt
|-- /frontend
|   |-- /src
|   |   |-- /components
|   |   |   |-- Dashboard.jsx
|   |   |   |-- EmotionChart.jsx
|   |   |   |-- LocationMap.jsx
|   |   |   |-- DataTable.jsx
|   |   |-- App.jsx
|   |   |-- index.css
|   |   |-- main.jsx
|   |-- index.html
|   |-- package.json
|   |-- vite.config.js
|   |-- tailwind.config.js
|   |-- postcss.config.js
|-- /data
|   |-- mock_data.csv
|-- README.md
```

## Prerequisites

- **Python 3.8+**
- **Node.js 16+** (includes npm)
- **Google Gemini API Key**

---

## Backend Setup (`/backend`)

1. **Install dependencies:**

   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate    # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   ```

2. **Environment Variables:**

   Create a `.env` file in the `/backend` directory with:

   ```
   GEMINI_API_KEY=your_google_gemini_api_key_here
   ```

3. **Run the server:**

   ```bash
   python run.py
   ```

   - The API will be available at `http://localhost:5000/api/v1/analytics`

---

## Frontend Setup (`/frontend`)

1. **Install dependencies:**

   ```bash
   cd frontend
   npm install
   ```

2. **Run the development server:**

   ```bash
   npm run dev
   ```

   - The frontend will run at `http://localhost:5173` by default.

---

## How It Works

- The backend reads `mock_data.csv`, sends batches of text to the Gemini API for emotion classification (Hope, Anger, Anxiety, Joy, Sadness, Neutral), and returns enriched data via a REST API.
- The React frontend fetches this data, visualizes emotion distribution (Chart.js), displays posts on a map (Leaflet.js), and lists all data in a table.

---

## Customization & Notes

- To use your own Gemini API key, request access from [Google AI Studio](https://aistudio.google.com/app/apikey).
- To change or expand the dataset, edit `/data/mock_data.csv`.
- The backend includes CORS support for local development.
- The code is structured for easy extension—swap mock data for database integration, or expand the analytics as needed.

---

## License

This project is for demonstration and development use. See individual files for details.