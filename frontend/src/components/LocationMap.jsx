import React from 'react';
import { MapContainer, TileLayer, GeoJSON } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

const LocationMap = ({ geoJsonData, setFilters }) => {

    const handleWardClick = (wardName) => {
        // This function updates the main application's filter state
        setFilters(prevFilters => ({ ...prevFilters, city: wardName }));
    };

    const onEachFeature = (feature, layer) => {
        const wardName = feature.properties.ghmc_ward;
        if (wardName) {
            layer.bindTooltip(wardName, { permanent: true, direction: 'center', className: 'ward-label' });
            
            layer.on({
                click: () => handleWardClick(wardName),
                mouseover: (e) => e.target.setStyle({ weight: 3, color: '#F59E0B', fillOpacity: 0.9 }),
                mouseout: (e) => e.target.setStyle({ weight: 1, color: 'white', fillOpacity: 0.6 }),
            });
        }
    };

    if (!geoJsonData) return <div className="p-4 text-center text-gray-500">Loading map...</div>;

    const geoJsonStyle = {
        fillColor: '#3182CE',
        weight: 1,
        opacity: 1,
        color: 'white',
        fillOpacity: 0.6,
    };

    return (
        <div className="map-container" style={{ height: '500px', width: '100%' }}>
            <MapContainer center={[17.3850, 78.4867]} zoom={11} style={{ height: '100%', width: '100%' }}>
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap' />
                <GeoJSON data={geoJsonData} style={geoJsonStyle} onEachFeature={onEachFeature} />
            </MapContainer>
        </div>
    );
};

export default LocationMap;