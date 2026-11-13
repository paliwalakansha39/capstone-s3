import L from "leaflet";
import {
  Activity,
  AlertCircle,
  ArrowRight,
  Check,
  ChevronRight,
  Clock,
  Compass,
  History,
  Info,
  Layers,
  MapPin,
  Pencil,
  Play,
  Plus,
  RefreshCw,
  Route as RouteIcon,
  Save,
  Sliders,
  Trash2,
  X
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { getRoutes } from "../services/routeService";
import {
  analyzeRouteOverlap,
  getOverlapHistory,
  saveProposedRoute
} from "../services/routeOverlapService";

const DELHI_CENTER = [28.6139, 77.209];

// Custom icon generator for proposed waypoints (numbered blue circle)
function createNumberedWaypointIcon(number, isTerminal = false) {
  return L.divIcon({
    className: "proposed-waypoint-marker",
    html: `<div class="waypoint-badge ${isTerminal ? 'waypoint-badge-terminal' : ''}">${number}</div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12]
  });
}

function MapClickHandler({ onMapClick, drawingEnabled }) {
  useMapEvents({
    click(event) {
      if (!drawingEnabled) return;
      onMapClick({
        latitude: parseFloat(event.latlng.lat.toFixed(6)),
        longitude: parseFloat(event.latlng.lng.toFixed(6)),
        id: `pt-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`
      });
    }
  });
  return null;
}

function FitRouteBounds({ points }) {
  const map = useMap();
  useEffect(() => {
    if (points && points.length > 1) {
      map.fitBounds(points, { padding: [40, 40], maxZoom: 14 });
    } else if (points && points.length === 1) {
      map.setView(points[0], 13);
    }
  }, [map, points]);
  return null;
}

export default function RouteOverlapPage() {
  const [mapCenter] = useState(DELHI_CENTER);
  const [proposedPoints, setProposedPoints] = useState([]);
  const [routeName, setRouteName] = useState("New Proposed Route");
  const [drawingMode, setDrawingMode] = useState(true);

  const handleUpdatePoint = useCallback((index, updatedFields) => {
    setProposedPoints((prev) =>
      prev.map((p, idx) => (idx === index ? { ...p, ...updatedFields } : p))
    );
  }, []);

  const handleRemovePoint = useCallback((index) => {
    setProposedPoints((prev) => prev.filter((_, idx) => idx !== index));
  }, []);

  const handleMarkerDragEnd = useCallback((index, event) => {
    const latlng = event.target.getLatLng();
    handleUpdatePoint(index, {
      latitude: parseFloat(latlng.lat.toFixed(6)),
      longitude: parseFloat(latlng.lng.toFixed(6))
    });
  }, [handleUpdatePoint]);

  const handleClearRoute = () => {
    setProposedPoints([]);
  };

  const proposedPolylinePoints = useMemo(
    () => proposedPoints.map((p) => [p.latitude, p.longitude]),
    [proposedPoints]
  );

  return (
    <section className="route-overlap-page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">TRANSIT CORRIDOR PLANNING</span>
          <h1>Route Overlap Detection</h1>
          <p>Draw proposed bus routes on the map to evaluate geographical overlap with existing DTC routes.</p>
        </div>
      </div>

      <div className="route-overlap-toolbar">
        <div className="toolbar-group">
          <label className="toolbar-label">
            Route Name
            <input
              type="text"
              className="input-text"
              value={routeName}
              onChange={(e) => setRouteName(e.target.value)}
              placeholder="e.g. Kashmere Gate to Rohini Express"
            />
          </label>
        </div>

        <div className="toolbar-actions">
          <button
            type="button"
            className={`button ${drawingMode ? "button-primary" : "button-outline"}`}
            onClick={() => setDrawingMode((v) => !v)}
          >
            <Pencil size={15} />
            {drawingMode ? "Drawing Active (Click Map)" : "Enable Drawing"}
          </button>

          <button
            type="button"
            className="button button-quiet"
            onClick={handleClearRoute}
            disabled={proposedPoints.length === 0}
          >
            <Trash2 size={15} />
            Clear Route
          </button>
        </div>
      </div>

      <div className="route-overlap-grid">
        <section className="content-card route-map-card">
          <div className="route-map-heading">
            <div>
              <span className="eyebrow">INTERACTIVE OVERLAP MAP</span>
              <h2>Transit Network Canvas</h2>
              <p>
                {proposedPoints.length === 0
                  ? "Click on the map to plot the first waypoint of your proposed route."
                  : `${proposedPoints.length} points plotted along proposed route.`}
              </p>
            </div>
            <div className="map-badge-counter">
              <span className="badge-blue">{proposedPoints.length} Waypoints</span>
            </div>
          </div>

          <div className="route-map" style={{ height: "550px" }}>
            <MapContainer center={mapCenter} zoom={11} scrollWheelZoom style={{ height: "100%", width: "100%" }}>
              <FitRouteBounds points={proposedPolylinePoints} />
              <MapClickHandler onMapClick={handleAddPoint} drawingEnabled={drawingMode} />
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              {/* Proposed Route Polyline - Color: BLUE (#2563eb) */}
              {proposedPolylinePoints.length > 1 && (
                <Polyline
                  positions={proposedPolylinePoints}
                  pathOptions={{
                    color: "#2563eb",
                    weight: 4,
                    opacity: 0.9,
                    dashArray: "6, 6"
                  }}
                />
              )}

              {/* Waypoint Markers */}
              {proposedPoints.map((point, index) => {
                const isTerminal = index === 0 || index === proposedPoints.length - 1;
                return (
                  <Marker
                    key={point.id || index}
                    position={[point.latitude, point.longitude]}
                    draggable={true}
                    eventHandlers={{
                      dragend: (e) => handleMarkerDragEnd(index, e)
                    }}
                    icon={createNumberedWaypointIcon(index + 1, isTerminal)}
                  >
                    <Popup>
                      <div className="waypoint-popup">
                        <strong>Waypoint {index + 1}</strong>
                        <p>{point.latitude.toFixed(5)}, {point.longitude.toFixed(5)}</p>
                        <small style={{ color: "#64748b", display: "block", marginBottom: "6px" }}>
                          Drag marker to adjust position
                        </small>
                        <button
                          type="button"
                          className="button-link-danger"
                          onClick={() => handleRemovePoint(index)}
                          style={{
                            background: "none",
                            border: "none",
                            color: "#ef4444",
                            cursor: "pointer",
                            padding: 0,
                            font: "inherit",
                            fontWeight: 600,
                            fontSize: "12px",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px"
                          }}
                        >
                          <Trash2 size={13} /> Remove Waypoint
                        </button>
                      </div>
                    </Popup>
                  </Marker>
                );
              })}
            </MapContainer>

            {proposedPoints.length === 0 && (
              <div className="map-empty-hint">
                Click anywhere on the map to start plotting waypoints for your proposed route.
              </div>
            )}
          </div>
        </section>
      </div>
    </section>
  );
}
