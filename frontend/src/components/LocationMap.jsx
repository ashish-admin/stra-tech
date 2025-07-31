import React from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Fix marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

const CENTER = [17.5, 78.5]; // Telangana approx center

const emotionColors = {
  Hope: "bg-green-400",
  Anger: "bg-red-400",
  Anxiety: "bg-yellow-400",
  Joy: "bg-blue-400",
  Sadness: "bg-purple-400",
  Neutral: "bg-gray-400",
  Unknown: "bg-gray-600",
};

const LocationMap = ({ data }) => (
  <div className="bg-white rounded shadow p-4 h-96">
    <h2 className="text-lg font-semibold mb-2">Posts Map (Telangana)</h2>
    <MapContainer
      center={CENTER}
      zoom={7}
      scrollWheelZoom={false}
      style={{ height: "320px", width: "100%" }}
    >
      <TileLayer
        attribution='&copy; <a href="https://osm.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {data.map((row) => (
        <Marker
          key={row.id}
          position={[row.latitude, row.longitude]}
          title={row.city}
        >
          <Popup>
            <div>
              <div
                className={`inline-block rounded px-2 py-1 text-xs font-semibold text-white ${emotionColors[row.emotion] || "bg-gray-600"
                  }`}
              >
                {row.emotion}
              </div>
              <div className="mt-1">{row.text}</div>
              <div className="text-xs mt-2 text-gray-400">
                {row.city} | {row.timestamp}
              </div>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  </div>
);

export default LocationMap;