import React, { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

/**
 * Props:
 *  - geojson: FeatureCollection (can be null while loading)
 *  - selectedWard: string ("All" or normalized name, e.g., "Jubilee Hills")
 *  - onWardSelect: (name: string) => void
 */
export default function LocationMap({ geojson, selectedWard = "All", onWardSelect }) {
  const mapRef = useRef(null);
  const layerRef = useRef(null);
  const containerRef = useRef(null);
  const didFitRef = useRef(false); // ensure we only fit once per geojson load

  // Extract a label from various property keys
  function displayName(props = {}) {
    return (
      props.name ||
      props.WARD_NAME ||
      props.ward_name ||
      props.WardName ||
      props.Ward_Name ||
      props.WARDLABEL ||
      props.LABEL ||
      "Unnamed Ward"
    );
  }

  // Normalize label to match DB posts
  function normalizeWardLabel(label) {
    if (!label) return "";
    let s = String(label).trim();
    s = s.replace(/^ward\s*no\.?\s*\d+\s*/i, "");
    s = s.replace(/^ward\s*\d+\s*/i, "");
    s = s.replace(/^\d+\s*-\s*/i, "");
    s = s.replace(/^\d+\s+/i, "");
    s = s.replace(/\s+/g, " ").trim();
    return s;
  }

  const baseStyle = { color: "#2b6cb0", weight: 1, fillColor: "#63b3ed", fillOpacity: 0.25 };
  const hoverStyle = { color: "#dd6b20", weight: 2, fillColor: "#fbd38d", fillOpacity: 0.35 };
  const selectedStyle = { color: "#d53f8c", weight: 3, fillColor: "#fbb6ce", fillOpacity: 0.45 };

  // Init map once
  useEffect(() => {
    if (mapRef.current || !containerRef.current) return;
    const map = L.map(containerRef.current, {
      center: [17.40, 78.47],
      zoom: 11,
      scrollWheelZoom: true,
      preferCanvas: true,
    });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
      maxZoom: 19,
    }).addTo(map);
    mapRef.current = map;
  }, []);

  // Draw polygons ONLY when geojson changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (layerRef.current) {
      map.removeLayer(layerRef.current);
      layerRef.current = null;
      didFitRef.current = false;
    }
    if (!geojson || !Array.isArray(geojson.features) || geojson.features.length === 0) return;

    function onEachFeature(feature, layer) {
      const disp = displayName(feature.properties || {});
      const norm = normalizeWardLabel(disp);

      layer.bindTooltip(disp, { direction: "center", className: "ld-ward-label" });

      layer.on({
        mouseover: () => layer.setStyle(hoverStyle),
        mouseout: () => {
          const thisNorm = normalizeWardLabel(displayName(layer.feature?.properties || {}));
          layer.setStyle(
            selectedWard !== "All" && thisNorm === selectedWard ? selectedStyle : baseStyle
          );
        },
        click: () => {
          if (typeof onWardSelect === "function") onWardSelect(norm);
        },
      });

      layer.setStyle(baseStyle);
    }

    const gj = L.geoJSON(geojson, { onEachFeature, style: baseStyle }).addTo(map);
    layerRef.current = gj;

    if (!didFitRef.current) {
      try {
        map.fitBounds(gj.getBounds(), { padding: [12, 12] });
        didFitRef.current = true; // do not re-fit on interaction
      } catch {
        /* no-op */
      }
    }
  }, [geojson, onWardSelect]); // NOTE: not dependent on selectedWard

  // Maintain highlight when selectedWard changes
  useEffect(() => {
    const group = layerRef.current;
    if (!group) return;
    group.eachLayer((layer) => {
      const disp = displayName(layer?.feature?.properties || {});
      const norm = normalizeWardLabel(disp);
      if (selectedWard && selectedWard !== "All" && norm === selectedWard) {
        layer.setStyle(selectedStyle);
        if (layer.bringToFront) layer.bringToFront();
      } else {
        layer.setStyle(baseStyle);
      }
    });
  }, [selectedWard]);

  return (
    <div
      ref={containerRef}
      style={{ width: "100%", height: 350, borderRadius: 6 }}
      aria-label="Ward map"
    />
  );
}
