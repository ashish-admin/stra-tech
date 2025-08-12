import React from 'react';
import { MapContainer, TileLayer, GeoJSON } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

const LocationMap = ({ geoJsonData, setFilters }) => {
    // No internal useEffect for data fetching

    const onEachFeature = (feature, layer) => {
        const wardName = feature.properties.ghmc_ward;
        if (wardName) {
            layer.bindTooltip(wardName, { permanent: true, direction: 'center', className: 'ward-label' });
            layer.on({
                click: () => setFilters(prev => ({ ...prev, city: wardName })),
                mouseover: (e) => e.target.setStyle({ weight: 3, color: '#F59E0B' }),
                mouseout: (e) => e.target.setStyle({ weight: 1, color: 'white' }),
            });
        }
    };

    if (!geoJsonData) {
        return <div className="text-center p-4">Loading map...</div>;
    }

    const geoJsonStyle = {
        fillColor: '#3182CE',
        weight: 1,
        color: 'white',
        fillOpacity: 0.6
    };

    return (
        <div style={{ height: '500px', width: '100%' }}>
            <MapContainer center={[17.3850, 78.4867]} zoom={11} style={{ height: '100%', width: '100%' }}>
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap' />
                <GeoJSON data={geoJsonData} style={geoJsonStyle} onEachFeature={onEachFeature} />
            </MapContainer>
        </div>
    );
};

export default LocationMap;