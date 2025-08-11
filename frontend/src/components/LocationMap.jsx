import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, GeoJSON } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import axios from 'axios';

const CENTER = [17.44, 78.47];
const ZOOM_LEVEL = 11;

const emotionColorMap = { /* ... (colors remain the same) ... */ };

// The map now receives the onWardClick function as a prop
function LocationMap({ onWardClick }) {
  const [geoData, setGeoData] = useState(null);
  // ... (loading and error states remain the same)

  useEffect(() => {
    // ... (fetchGranularData logic remains the same)
  }, []);

  const getStyle = (feature) => { /* ... (style logic remains the same) ... */ };

  // We add the onClick event to each ward layer
  const onEachFeature = (feature, layer) => {
    if (feature.properties) {
      const { name, emotion, count } = feature.properties;
      const popupContent = `<b>Ward:</b> ${name}<br/><b>Emotion:</b> ${emotion}<br/><b>Count:</b> ${count}`;
      layer.bindPopup(popupContent);

      // Add the click handler
      layer.on({
        click: () => {
          onWardClick(name); // Call the function passed from Dashboard
        }
      });
    }
  };

  if (loading) { /* ... (loading JSX remains the same) ... */ }
  if (error) { /* ... (error JSX remains the same) ... */ }
  if (!geoData) { /* ... (no data JSX remains the same) ... */ }

  return (
    <div className="h-96 w-full rounded-lg overflow-hidden">
      <MapContainer center={CENTER} zoom={ZOOM_LEVEL} scrollWheelZoom={true} style={{ height: "100%", width: "100%" }}>
        <TileLayer attribution='&copy; <a href="https://osm.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <GeoJSON data={geoData} style={getStyle} onEachFeature={onEachFeature} />
      </MapContainer>
    </div>
  );
}

export default LocationMap;