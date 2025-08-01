import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, GeoJSON, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import axios from 'axios';

const CENTER = [17.3850, 78.4867]; // Hyderabad center

// Define a color scheme for emotions
const emotionColorMap = {
  Hope: '#2ecc71',     // Green
  Anger: '#e74c3c',    // Red
  Joy: '#3498db',      // Blue
  Anxiety: '#f1c40f',  // Yellow
  Sadness: '#9b59b6', // Purple
  Disgust: '#7f8c8d',  // Grey
  Apathy: '#bdc3c7',   // Lighter Grey
  Error: '#e67e22',    // Orange
  Default: '#95a5a6' // Default Grey
};

function LocationMap() {
  const [geoData, setGeoData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchGranularData = async () => {
      const apiUrl = import.meta.env.VITE_API_BASE_URL || '';
      try {
        axios.defaults.withCredentials = true;
        const response = await axios.get(`${apiUrl}/api/v1/analytics/granular`);
        
        // Transform the API response into a GeoJSON FeatureCollection
        const geoJsonFeatures = {
          type: "FeatureCollection",
          features: response.data.map(ward => ({
            type: "Feature",
            geometry: ward.geometry,
            properties: {
              name: ward.ward_name,
              emotion: ward.dominant_emotion,
              count: ward.post_count
            }
          }))
        };
        setGeoData(geoJsonFeatures);

      } catch (error) {
        console.error("Failed to fetch granular map data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchGranularData();
  }, []);

  const getStyle = (feature) => {
    const emotion = feature.properties.emotion;
    return {
      fillColor: emotionColorMap[emotion] || emotionColorMap.Default,
      weight: 1,
      opacity: 1,
      color: 'white',
      fillOpacity: 0.7
    };
  };

  const onEachFeature = (feature, layer) => {
    if (feature.properties) {
      const { name, emotion, count } = feature.properties;
      const popupContent = `
        <b>Ward:</b> ${name}<br/>
        <b>Dominant Emotion:</b> ${emotion}<br/>
        <b>Post Count:</b> ${count}
      `;
      layer.bindPopup(popupContent);
    }
  };

  if (loading) {
    return <div>Loading map data...</div>;
  }

  return (
    <div className="h-96">
      <MapContainer
        center={CENTER}
        zoom={11}
        scrollWheelZoom={false}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://osm.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {geoData && <GeoJSON data={geoData} style={getStyle} onEachFeature={onEachFeature} />}
      </MapContainer>
    </div>
  );
}

export default LocationMap;