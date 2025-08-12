// frontend/src/components/LocationMap.jsx

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { MapContainer, TileLayer, GeoJSON } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

const LocationMap = () => {
    const [geoJsonData, setGeoJsonData] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchGeoJson = async () => {
            const apiUrl = import.meta.env.VITE_API_BASE_URL || '';
            try {
                const response = await axios.get(`${apiUrl}/api/v1/geojson`);
                setGeoJsonData(response.data);
            } catch (err) {
                setError("Could not load map data.");
            }
        };
        fetchGeoJson();
    }, []);

    const onEachFeature = (feature, layer) => {
        if (feature.properties && feature.properties.ghmc_ward) {
            // FIX: Make tooltips permanent for clear identification
            layer.bindTooltip(feature.properties.ghmc_ward, {
                permanent: true,
                direction: 'center',
                className: 'ward-label' // Add a class for custom styling
            });
        }
        layer.on({
            mouseover: (e) => e.target.setStyle({ weight: 3, color: '#FFC107', fillOpacity: 0.9 }),
            mouseout: (e) => e.target.setStyle({ weight: 1, color: 'white', fillOpacity: 0.6 }),
        });
    };

    if (error) return <div className="p-4 text-red-500 bg-red-100 rounded-md">{error}</div>;
    if (!geoJsonData) return <div className="p-4 text-center text-gray-500">Loading map data...</div>;

    const geoJsonStyle = {
        fillColor: '#3182CE',
        weight: 1,
        opacity: 1,
        color: 'white',
        fillOpacity: 0.6,
    };

    return (
        <div className="map-container" style={{ height: '400px', width: '100%', borderRadius: '8px', overflow: 'hidden' }}>
            <MapContainer center={[17.3850, 78.4867]} zoom={11} style={{ height: '100%', width: '100%' }}>
                <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                />
                <GeoJSON data={geoJsonData} style={geoJsonStyle} onEachFeature={onEachFeature} />
            </MapContainer>
        </div>
    );
};

export default LocationMap;