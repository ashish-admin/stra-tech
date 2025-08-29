import React, { useEffect, useMemo, useRef, useState } from "react";
import * as L from "leaflet";
import "leaflet/dist/leaflet.css";
import { fetchJson } from "../lib/api";
import { useWard } from "../context/WardContext.jsx";
import useViewport from "../hooks/useViewport";
import { AlertTriangle, Map as MapIcon, RefreshCw, Navigation } from "lucide-react";
import { MapSkeleton, LoadingSpinner } from "./ui/LoadingSkeleton.jsx";

/* ---------- helpers ---------- */
function normalizeWardLabel(label) {
  if (!label) return "";
  let s = String(label).trim();
  s = s.replace(/^ward\s*no\.?\s*\d+\s*/i, "");
  s = s.replace(/^ward\s*\d+\s*/i, "");
  s = s.replace(/^\d+\s*[-–]?\s*/i, "");
  s = s.replace(/\s+/g, " ").trim();
  return s;
}
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
function getWardId(props = {}) {
  return props.WARD_ID || props.ward_id || props.WARD || null;
}
function makeQuantizeScale(values) {
  const v = values.filter((x) => Number.isFinite(x)).sort((a, b) => a - b);
  if (!v.length) return { breaks: [], color: () => "#e5e7eb" };
  const n = 6;
  const colors = ["#edf8fb", "#ccebc5", "#a8ddb5", "#7bccc4", "#43a2ca", "#0868ac"];
  const breaks = [];
  for (let i = 1; i < n; i++) {
    const q = i / n;
    const idx = Math.floor(q * (v.length - 1));
    breaks.push(v[idx]);
  }
  return {
    breaks,
    color: (val) => {
      if (!Number.isFinite(val)) return "#e5e7eb";
      let i = 0;
      while (i < breaks.length && val > breaks[i]) i++;
      return colors[i] ?? colors[colors.length - 1];
    },
  };
}

/* ---------- component ---------- */
export default function LocationMap({
  geojson,
  selectedWard: selectedWardProp,
  onWardSelect: onWardSelectProp,
  metricField = null,
  getMetric = null,
  showLabels = true,
  matchHeightRef = null,    // if provided, map matches this element's height
  minHeight = 320,
  maxHeight = 900,
  preferredDvh,              // override dvh if you want (e.g. 62)
}) {
  // Enhanced error state management
  const [mapError, setMapError] = useState(null);
  const [isRecovering, setIsRecovering] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 3;
  const { ward: wardCtx, setWard: setWardCtx } = useWard();
  const selectedWard = selectedWardProp ?? wardCtx;
  const onWardSelect = onWardSelectProp ?? setWardCtx;

  const { isDesktop, vh } = useViewport();

  const mapRef = useRef(null);
  const layerRef = useRef(null);
  const labelLayerRef = useRef(null);
  const didInitialFitRef = useRef(false);
  const wrapperRef = useRef(null);
  const mapContainerRef = useRef(null);
  const metaCacheRef = useRef(new Map());

  const metricAccessor = useMemo(() => {
    if (typeof getMetric === "function") return getMetric;
    if (metricField) {
      return (f) => {
        const v = f?.properties?.[metricField];
        const n = Number(v);
        return Number.isFinite(n) ? n : null;
      };
    }
    return null;
  }, [getMetric, metricField]);

  const scale = useMemo(() => {
    if (!geojson || !metricAccessor) return null;
    const vals = (geojson.features || []).map(metricAccessor);
    return makeQuantizeScale(vals);
  }, [geojson, metricAccessor]);

  const wardNames = useMemo(() => {
    if (!geojson?.features) return [];
    const set = new Set();
    for (const f of geojson.features) {
      const disp = displayName(f.properties || {});
      const norm = normalizeWardLabel(disp);
      if (norm) set.add(norm);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [geojson]);

  const [search, setSearch] = useState("");

  /* ---------- init map once ---------- */
  useEffect(() => {
    if (mapRef.current || !mapContainerRef.current) return;
    
    try {
      const map = L.map(mapContainerRef.current, {
        center: [17.385, 78.4867],
        zoom: 11,
        scrollWheelZoom: true,
        preferCanvas: true,
      });
      
      const tileLayer = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap",
        maxZoom: 19,
        errorTileUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==', // 1x1 transparent pixel
      });
      
      tileLayer.on('tileerror', (e) => {
        console.warn('Map tile loading error:', e);
        // Continue gracefully - Leaflet will handle retries
      });
      
      tileLayer.addTo(map);
      mapRef.current = map;

      let rafId = null;
      const scheduleLabels = () => {
        if (rafId) cancelAnimationFrame(rafId);
        rafId = requestAnimationFrame(rebuildLabels);
      };
      
      map.on("moveend zoomend", scheduleLabels);
      
      // Clear any previous errors on successful initialization
      setMapError(null);
      setRetryCount(0);
      
      return () => {
        try {
          map.off("moveend zoomend", scheduleLabels);
          if (rafId) cancelAnimationFrame(rafId);
        } catch (cleanupError) {
          console.warn('Map cleanup error:', cleanupError);
        }
      };
    } catch (error) {
      console.error('Map initialization error:', error);
      setMapError({
        type: 'initialization',
        message: 'Failed to initialize map',
        error: error.message
      });
    }
  }, []);

  /* ---------- responsive height ---------- */
  useEffect(() => {
    const el = wrapperRef.current;
    if (!el || !mapRef.current) return;

    // If a reference panel is provided, mirror its height
    if (matchHeightRef?.current) {
      const ro = new ResizeObserver((entries) => {
        const h = Math.max(
          minHeight,
          Math.min(maxHeight, entries[0].contentRect.height)
        );
        el.style.height = `${h}px`;
        mapRef.current.invalidateSize();
      });
      ro.observe(matchHeightRef.current);
      const nowH = matchHeightRef.current.getBoundingClientRect().height || minHeight;
      el.style.height = `${Math.max(minHeight, Math.min(maxHeight, nowH))}px`;
      mapRef.current.invalidateSize();
      return () => ro.disconnect();
    }

    // Otherwise, use viewport height (dvh-ish)
    const dvh = Number.isFinite(preferredDvh)
      ? preferredDvh
      : (isDesktop ? 62 : 48); // 62dvh desktop, 48dvh mobile

    const setH = () => {
      const px = Math.round((dvh / 100) * vh);
      const h = Math.max(minHeight, Math.min(maxHeight, px));
      el.style.height = `${h}px`;
      mapRef.current.invalidateSize();
    };
    setH();
    window.addEventListener("resize", setH);
    window.addEventListener("orientationchange", setH);
    return () => {
      window.removeEventListener("resize", setH);
      window.removeEventListener("orientationchange", setH);
    };
  }, [matchHeightRef, minHeight, maxHeight, preferredDvh, isDesktop, vh]);

  /* ---------- draw polygons ---------- */
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (layerRef.current) {
      layerRef.current.remove();
      layerRef.current = null;
    }
    if (!geojson) return;

    try {

    const defaultStyle = { weight: 1, color: "#5b6b7a", fillOpacity: 0.35, fillColor: "#d9e3f0" };
    const selectedStyle = { weight: 2.25, color: "#111827", fillOpacity: 0.55, fillColor: "#ffbf47" };
    const styleFn = (f) => {
      if (metricAccessor && scale) {
        const v = metricAccessor(f);
        return { ...defaultStyle, fillColor: scale.color(v) };
      }
      return defaultStyle;
    };

    const layer = L.geoJSON(geojson, {
      style: styleFn,
      onEachFeature: (f, lyr) => {
        const disp = displayName(f.properties || {});
        const wardNorm = normalizeWardLabel(disp);
        const wid = getWardId(f.properties || {});

        const baseTip = `<div style="font-weight:600">${disp}</div>`;
        lyr.bindTooltip(baseTip, { sticky: true });

        // Preload + enrich tooltip on first hover
        lyr.on("mouseover", async () => {
          if (!wid) return;
          if (!metaCacheRef.current.has(wid)) {
            try {
              const data = await fetchJson(`api/v1/ward/meta/${wid}`);
              metaCacheRef.current.set(wid, data || {});
            } catch {
              metaCacheRef.current.set(wid, { _error: true });
            }
          }
          const meta = metaCacheRef.current.get(wid);
          if (meta && !meta._error) {
            lyr.setTooltipContent(
              `${baseTip}<div style="font-size:12px;margin-top:2px">` +
                `Electors: ${meta.profile?.electors ?? "—"} · ` +
                `Turnout: ${meta.profile?.turnout_pct ?? "—"}% · ` +
                `SECC: ${meta.demographics?.secc_deprivation_idx ?? "—"}` +
              `</div>`
            );
          }
        });

        lyr.on("mouseover", () => {
          lyr.setStyle({ weight: 2.5, color: "#0f172a" });
          lyr.bringToFront();
        });
        lyr.on("mouseout", () => {
          const isSel =
            wardNorm &&
            selectedWard &&
            wardNorm.toLowerCase() === selectedWard.toLowerCase();
          lyr.setStyle(isSel ? selectedStyle : styleFn(f));
        });

        lyr.on("click", () => {
          onWardSelect?.(wardNorm || disp);
          try {
            const b = lyr.getBounds();
            const current = map.getZoom();
            map.flyToBounds(b, {
              padding: [20, 20],
              maxZoom: Math.max(current, 14),
              duration: 0.35,
            });
          } catch {}
        });
      },
    }).addTo(map);
    layerRef.current = layer;

    if (!didInitialFitRef.current) {
      didInitialFitRef.current = true;
      try {
        map.fitBounds(layer.getBounds(), { padding: [14, 14] });
      } catch {}
    }

    rebuildLabels();
    
    } catch (error) {
      console.error('Geojson processing error:', error);
      setMapError({
        type: 'geojson',
        message: 'Failed to load ward boundaries',
        error: error.message
      });
    }
  }, [geojson, metricAccessor, scale, onWardSelect, selectedWard]);

  /* ---------- react to selection ---------- */
  useEffect(() => {
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!map || !layer) return;

    layer.eachLayer((lyr) => {
      const f = lyr.feature;
      const name = displayName(f?.properties || {});
      const norm = normalizeWardLabel(name);
      const isSelected =
        selectedWard && norm && norm.toLowerCase() === selectedWard.toLowerCase();
      if (isSelected) {
        lyr.setStyle({ weight: 2.25, color: "#111827", fillOpacity: 0.55, fillColor: "#ffbf47" });
        try {
          const b = lyr.getBounds();
          const current = map.getZoom();
          map.flyToBounds(b, {
            padding: [20, 20],
            maxZoom: Math.max(current, 14),
            duration: 0.35,
          });
        } catch {}
      }
    });

    setSearch(selectedWard || "");
    rebuildLabels();
  }, [selectedWard]);

  /* ---------- label declutter (zoom-aware) ---------- */
  function rebuildLabels() {
    if (!showLabels) return;
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!map || !layer) return;

    if (labelLayerRef.current) {
      labelLayerRef.current.remove();
      labelLayerRef.current = null;
    }

    const zoom = map.getZoom();
    const labels = [];
    const boxes = [];
    const selectedLower = (selectedWard || "").toLowerCase();

    layer.eachLayer((lyr) => {
      const f = lyr.feature;
      const props = f?.properties || {};
      const name = displayName(props);
      const norm = normalizeWardLabel(name);
      const center = lyr.getBounds().getCenter();
      const isSelected = norm.toLowerCase() === selectedLower;

      // show fewer labels on low zoom; always show selected
      if (zoom < 12 && !isSelected) return;

      const pt = map.latLngToContainerPoint(center);
      const w = Math.min(220, Math.max(50, name.length * 6 + 12));
      const h = 16;
      const box = [pt.x - w / 2, pt.y - h / 2, pt.x + w / 2, pt.y + h / 2];

      let collides = false;
      for (const b of boxes) {
        if (!(box[2] < b[0] || box[0] > b[2] || box[3] < b[1] || box[1] > b[3])) {
          collides = true;
          break;
        }
      }
      if (collides && !isSelected) return;

      boxes.push(box);
      labels.push(
        L.marker(center, {
          icon: L.divIcon({
            className: "ld-ward-label",
            html: `<div style="
              background:#ffffffcc;border:1px solid #cfd6df;border-radius:6px;
              padding:2px 6px;font-size:11px;white-space:nowrap;
              ${isSelected ? "font-weight:700;border-color:#5b6b7a" : ""}
            ">${name}</div>`,
            iconSize: [10, 10],
          }),
          interactive: false,
          keyboard: false,
          pane: "markerPane",
        })
      );
    });

    labelLayerRef.current = L.layerGroup(labels).addTo(map);
  }

  /* ---------- controls ---------- */
  function resetView() {
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!map || !layer) return;
    try {
      map.fitBounds(layer.getBounds(), { padding: [14, 14] });
    } catch {}
  }
  function jumpToWard(name) {
    const layer = layerRef.current;
    const map = mapRef.current;
    if (!layer || !map || !name) return;
    let matched = null;
    layer.eachLayer((lyr) => {
      if (matched) return;
      const disp = displayName(lyr.feature?.properties || {});
      const norm = normalizeWardLabel(disp);
      if (norm.toLowerCase() === name.toLowerCase()) matched = lyr;
    });
    if (matched) {
      onWardSelect?.(name);
      try {
        const b = matched.getBounds();
        const current = map.getZoom();
        map.flyToBounds(b, {
          padding: [20, 20],
          maxZoom: Math.max(current, 14),
          duration: 0.35,
        });
      } catch {}
    }
  }

  /* ---------- error recovery ---------- */
  const handleRetry = async () => {
    if (retryCount >= maxRetries) return;
    
    setIsRecovering(true);
    setRetryCount(prev => prev + 1);
    
    try {
      // Force re-initialization after a delay
      setTimeout(() => {
        setMapError(null);
        
        // If map container exists, try to reinitialize
        if (mapContainerRef.current) {
          if (mapRef.current) {
            mapRef.current.remove();
            mapRef.current = null;
          }
          // Trigger re-initialization on next render
          setIsRecovering(false);
        }
      }, 1000);
    } catch (error) {
      console.error('Map recovery error:', error);
      setIsRecovering(false);
    }
  };

  // Error fallback UI
  if (mapError && !isRecovering) {
    return (
      <div
        ref={wrapperRef}
        className="relative w-full rounded-md border overflow-hidden bg-red-50"
        style={{ height: 360 }}
      >
        <div className="flex flex-col items-center justify-center h-full p-6 text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mb-4" />
          <h3 className="text-lg font-medium text-red-900 mb-2">Map Unavailable</h3>
          <p className="text-sm text-red-700 mb-4">
            {mapError.message}. The interactive ward map is temporarily unavailable, but you can still use the ward selector above.
          </p>
          
          {retryCount < maxRetries && (
            <button
              onClick={handleRetry}
              className="inline-flex items-center px-4 py-2 bg-red-600 text-white text-sm rounded-md hover:bg-red-700 transition-colors"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry Map ({maxRetries - retryCount} attempts left)
            </button>
          )}
          
          {retryCount >= maxRetries && (
            <div className="bg-red-100 border border-red-200 rounded-md p-3">
              <p className="text-sm text-red-800">
                Maximum retry attempts reached. Please use the ward dropdown for navigation or refresh the entire page.
              </p>
            </div>
          )}
          
          {/* Fallback ward selector */}
          <div className="mt-4 w-full max-w-sm">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Select Ward (Fallback)
            </label>
            <select
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              value={selectedWard || ''}
              onChange={(e) => onWardSelect?.(e.target.value)}
            >
              <option value="">Select a ward...</option>
              {wardNames.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>
    );
  }

  // Recovery/loading state
  if (isRecovering) {
    return (
      <MapSkeleton 
        height={360}
        className=""
      />
    );
  }

  /* ---------- render ---------- */
  return (
    <div
      ref={wrapperRef}
      className="relative w-full rounded-md border overflow-hidden"
      style={{ height: 360 }}
    >
      <div ref={mapContainerRef} className="w-full h-full" />
      <div className="absolute top-2 right-2 flex items-center gap-2 bg-white/80 backdrop-blur px-2 py-1 rounded-lg shadow ring-1 ring-gray-300">
        <input
          list="ld-ward-list"
          className="h-8 w-48 md:w-64 rounded-md border px-2 text-sm outline-none"
          placeholder="Search ward…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") jumpToWard(search); }}
        />
        <datalist id="ld-ward-list">
          {wardNames.map((w) => <option key={w} value={w} />)}
        </datalist>
        <button
          className="h-8 rounded-md px-2 text-sm bg-gray-800 text-white hover:bg-black"
          onClick={() => jumpToWard(search || selectedWard)}
          title="Focus selected ward"
        >
          Focus
        </button>
        <button
          className="h-8 rounded-md px-2 text-sm bg-gray-100 hover:bg-gray-200"
          onClick={resetView}
          title="Reset view"
        >
          Reset
        </button>
      </div>
    </div>
  );
}
