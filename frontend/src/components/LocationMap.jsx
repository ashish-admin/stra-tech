import React, { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, GeoJSON, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import axios from 'axios';

const emotionColors = {
    'Anger': 'red', 'Frustration': 'darkred', 'Disappointment': 'brown',
    'Hope': 'green', 'Admiration': 'blue', 'Neutral': 'grey',
    'Joy': 'yellow', 'Unknown': 'black', 'Error': 'black'
};

// Fix for default marker icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});

const LocationMap = ({ posts, setSelectedWard, selectedWard }) => {
    const [ghmcWards, setGhmcWards] = useState(null);
    const [wardCenters, setWardCenters] = useState({});
    const mapRef = useRef();

    useEffect(() => {
        // --- THE FIX ---
        // Fetch the geojson file from the correct public URL
        axios.get('/data/ghmc_wards.geojson')
            .then(response => {
                setGhmcWards(response.data);
            })
            .catch(error => {
                console.error("Could not fetch map data:", error);
            });
    }, []);

    useEffect(() => {
        if (!ghmcWards) return;
        const centers = {};
        ghmcWards.features.forEach(feature => {
            const wardName = String(feature.properties.WARD_NO);
            if (wardName) {
                const coords = feature.geometry.coordinates[0][0];
                if (Array.isArray(coords)) {
                    let latSum = 0, lonSum = 0;
                    coords.forEach(coord => {
                        lonSum += coord[0];
                        latSum += coord[1];
                    });
                    centers[wardName] = [latSum / coords.length, lonSum / coords.length];
                }
            }
        });
        setWardCenters(centers);
    }, [ghmcWards]);

    useEffect(() => {
        if (selectedWard && wardCenters[selectedWard] && mapRef.current) {
            mapRef.current.flyTo(wardCenters[selectedWard], 14);
        }
    }, [selectedWard, wardCenters]);

    const geoJsonStyle = (feature) => {
        const wardName = String(feature.properties.WARD_NO);
        const wardPosts = posts.filter(p => String(p.ward) === wardName);
        const emotion = wardPosts.length > 0 ? wardPosts[0].emotion : 'Neutral';
        const color = emotionColors[emotion] || 'grey';
        return { fillColor: color, weight: 1, opacity: 1, color: 'white', dashArray: '3', fillOpacity: 0.7 };
    };
    
    const onEachFeature = (feature, layer) => {
        layer.on({
            click: () => {
                const wardName = String(feature.properties.WARD_NO);
                setSelectedWard(wardName);
            }
        });
    };

    if (!ghmcWards) {
        return <div className="flex items-center justify-center h-full font-semibold">Loading Map Data...</div>;
    }

    return (
        <MapContainer center={[17.3850, 78.4867]} zoom={11} ref={mapRef} style={{ height: '100%', width: '100%' }}>
            <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />
            <GeoJSON 
                key={posts.length}
                data={ghmcWards} 
                style={geoJsonStyle} 
                onEachFeature={onEachFeature}
            />
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
                                {/* ... rest of the popup content ... */}
                            </div>
                        </Popup>
                    </Marker>
                );
            })}
        </MapContainer>
    );
};

export default LocationMap;