import React, { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, GeoJSON, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import ghmcWards from '../data/ghmc_wards.json';

// Fix for default marker icon issue with webpack
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});

// Emotion-to-color mapping
const emotionColors = {
  'Anger': 'red',
  'Frustration': 'darkred',
  'Disappointment': 'brown',
  'Hope': 'green',
  'Admiration': 'blue',
  'Neutral': 'grey',
  'Joy': 'yellow',
  'Unknown': 'black',
  'Error': 'black'
};

const LocationMap = ({ posts, setSelectedWard, selectedWard }) => {
  const [wardCenters, setWardCenters] = useState({});
  const mapRef = useRef();

  useEffect(() => {
    // --- FIX IS HERE ---
    // Add a guard clause to ensure ghmcWards and its features exist before processing.
    if (!ghmcWards || !ghmcWards.features) {
      return; 
    }
    // --- END OF FIX ---

    const centers = {};
    ghmcWards.features.forEach(feature => {
      const wardName = feature.properties.ward_name;
      if (wardName) {
        const coords = feature.geometry.coordinates[0][0];
        if (!Array.isArray(coords)) {
            console.error("Coordinates are not an array for ward:", wardName);
            return;
        }
        let latSum = 0, lonSum = 0;
        coords.forEach(coord => {
            lonSum += coord[0];
            latSum += coord[1];
        });
        centers[wardName] = [latSum / coords.length, lonSum / coords.length];
      }
    });
    setWardCenters(centers);
  }, []);

  useEffect(() => {
    if (selectedWard && wardCenters[selectedWard] && mapRef.current) {
      mapRef.current.flyTo(wardCenters[selectedWard], 14);
    }
  }, [selectedWard, wardCenters]);


  const onEachFeature = (feature, layer) => {
    layer.on({
      click: () => {
        setSelectedWard(feature.properties.ward_name);
      }
    });
  };

  const getWardEmotion = (wardName) => {
    const wardPosts = posts.filter(p => p.ward === wardName);
    if (wardPosts.length === 0) return 'Neutral';

    return wardPosts[0].emotion;
  }

  const geoJsonStyle = (feature) => {
    const emotion = getWardEmotion(feature.properties.ward_name);
    const color = emotionColors[emotion] || 'grey';
    return {
      fillColor: color,
      weight: 1,
      opacity: 1,
      color: 'white',
      dashArray: '3',
      fillOpacity: 0.6
    };
  };

  return (
    <MapContainer center={[17.3850, 78.4867]} zoom={11} ref={mapRef} style={{ height: '100%', width: '100%' }}>
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />
      <GeoJSON data={ghmcWards} style={geoJsonStyle} onEachFeature={onEachFeature} />
      
      {posts.map(post => {
        const center = wardCenters[post.ward];
        if (!center) return null;

        return (
          <Marker position={center} key={post.id}>
            <Popup>
              <div className="p-1 max-w-xs">
                <h3 className="font-bold text-lg mb-2">{post.ward}</h3>
                <p className="text-sm text-gray-600 mb-2">"{post.content}"</p>
                <div className="mb-2">
                  <span className="font-semibold">Author: </span>
                  <span>{post.author}</span>
                </div>
                <div className="mb-2">
                  <span className="font-semibold">Emotion: </span>
                  <span style={{ color: emotionColors[post.emotion] || 'black' }}>
                    {post.emotion}
                  </span>
                </div>
                {post.drivers && post.drivers.length > 0 && (
                  <div>
                    <span className="font-semibold">Emotion Drivers:</span>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {post.drivers.map((driver, index) => (
                        <span key={index} className="bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-0.5 rounded-full">
                          {driver}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
};

export default LocationMap;