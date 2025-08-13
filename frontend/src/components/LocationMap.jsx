import React from 'react';
import { MapContainer, TileLayer, GeoJSON } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

/**
 * Displays the GHMC ward boundaries.  Hovering a ward highlights it and
 * clicking a ward updates the selected city filter via the setFilters
 * callback.  If no geoJsonData is available a loading message is
 * displayed.
 */
const LocationMap = ({ geoJsonData, setFilters }) => {
  /**
   * Handler to update the dashboard filter when a ward is clicked.  Selecting
   * a ward automatically updates the "Ward" dropdown and re‑filters the
   * analytics and charts.  We shallow‑merge the existing filters and
   * override the city value with the clicked ward name.
   */
  /**
   * Normalise a ward name from the GeoJSON to match the city names used in
   * the posts dataset.  Many ward names in the map include a prefix like
   * "Ward 79 " or "Ward 8 ".  This function strips that numeric prefix so
   * that clicking on "Ward 8 Habsiguda" will map to the city "Habsiguda".
   */
  const normalizeWardName = (name) => {
    if (!name) return name;
    // Match patterns like "Ward 79 Himayath Nagar" or "WARD 3 Kapra"
    const match = name.match(/^\s*Ward\s*\d+\s+(.*)$/i);
    if (match) {
      return match[1].trim();
    }
    return name.trim();
  };

  const handleWardClick = (wardName) => {
    // Normalise the ward name before updating filters.  Use the
    // normalised name as the city filter so that the sentiment and
    // competitive analysis APIs return data when available.
    const normalized = normalizeWardName(wardName);
    setFilters((prev) => ({ ...prev, city: normalized }));
  };

  /**
   * Define interactive behaviour for each ward polygon.  A tooltip with the
   * ward name is permanently displayed in the centre.  Hovering a ward
   * highlights it and clicking selects it.  If the GeoJSON has other
   * property names (e.g. ward_name or name), those are used as fallbacks.
   */
  const onEachFeature = (feature, layer) => {
    const wardName = feature.properties.ghmc_ward || feature.properties.ward_name || feature.properties.name;
    if (wardName) {
      layer.bindTooltip(wardName, { permanent: true, direction: 'center', className: 'ward-label' });
      layer.on({
        click: () => handleWardClick(wardName),
        mouseover: (e) => {
          e.target.setStyle({ weight: 3, color: '#F59E0B', fillOpacity: 0.7 });
          e.target.bringToFront();
        },
        mouseout: (e) => e.target.setStyle({ weight: 1, color: 'white', fillOpacity: 0.5 })
      });
    }
  };

  // Guard against missing GeoJSON data
  if (!geoJsonData) return <div>Loading map...</div>;

  // Base style for all ward polygons
  const geoJsonStyle = {
    fillColor: '#3182CE',
    weight: 1,
    opacity: 1,
    color: 'white',
    fillOpacity: 0.5
  };

  return (
    <MapContainer
      style={{ height: '400px', width: '100%' }}
      // Define bounds around Hyderabad to keep the map centred
      bounds={[ [17.20, 78.30], [17.60, 78.80] ]}
      // Enable scroll wheel zooming so users can explore the map
      scrollWheelZoom={true}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <GeoJSON data={geoJsonData} style={geoJsonStyle} onEachFeature={onEachFeature} />
    </MapContainer>
  );
};

export default LocationMap;