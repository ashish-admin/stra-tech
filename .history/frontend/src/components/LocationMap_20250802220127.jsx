import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, GeoJSON } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import axios from 'axios';

const CENTER = [17.44, 78.47];
const ZOOM_LEVEL = 11;
const emotionColorMap = {
  Hope: '#2ecc71', Anger: '#e74c3c', Joy: '#3498db',
  Anxiety: '#f1c40f', Sadness: '#9b59b6', Disgust: '#7f8c8d',
  Apathy: '#bdc3c7', Default: '#95a5a6'
};

function LocationMap() {
  const [geoData, setGeoData] = useState(null);

  useEffect(() => {
    const fetchGranularData = async () => {
      const apiUrl = import.meta.env.VITE_API_BASE_URL || '';
      try {
        const { data } = await axios.get(`${apiUrl}/api/v1/analytics/granular`);
        if (data?.features) setGeoData(data);
      } catch (err) { console.error("Failed to fetch map data:", err); }
    };
    fetchGranularData();
  }, []);

  const getStyle = (feature) => ({
    fillColor: emotionColorMap[feature.properties.dominant_emotion] || emotionColorMap.Default,
    weight: 1, opacity: 1, color: 'white', fillOpacity: 0.75
  });

  const onEachFeature = (feature, layer) => {
    if (feature.properties) {
      const { ward_name, dominant_emotion, post_count, top_drivers } = feature.properties;
      const driversHtml = top_drivers?.length ? `<ul class="list-disc list-inside mt-1">${top_drivers.map(driver => `<li>${driver}</li>`).join('')}</ul>` : 'No specific drivers identified.';
      const popupContent = `
        <div class="p-1">
          <h3 class="font-bold text-lg">${ward_name}</h3>
          <p><b>Dominant Emotion:</b> ${dominant_emotion}</p>
          <p><b>Post Count:</b> ${post_count}</p>
          <hr class="my-1"/>
          <p class="font-semibold">Top Drivers:</p>
          ${driversHtml}
        </div>
      `;
      layer.bindPopup(popupContent);
    }
  };

  if (!geoData) return <div className="text-center p-4">Loading map data...</div>;

  return (
    <div className="h-96 w-full rounded-lg overflow-hidden shadow-inner">
      <MapContainer center={CENTER} zoom={ZOOM_LEVEL} scrollWheelZoom={true} style={{ height: "100%", width: "100%" }}>
        <TileLayer attribution='&copy; <a href="https://osm.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <GeoJSON key={JSON.stringify(geoData)} data={geoData} style={getStyle} onEachFeature={onEachFeature} />
      </MapContainer>
    </div>
  );
}
export default LocationMap;