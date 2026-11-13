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

function MapLegend() {
  return (
    <div className="map-legend-overlay">
      <div className="legend-title">Route Visualization</div>
      <div className="legend-item">
        <span className="legend-bar legend-blue" />
        <span>Proposed Route</span>
      </div>
      <div className="legend-item">
        <span className="legend-bar legend-grey" />
        <span>Existing Routes</span>
      </div>
      <div className="legend-item">
        <span className="legend-bar legend-red" />
        <span>Overlapping Sections</span>
      </div>
      <div className="legend-item">
        <span className="legend-bar legend-green" />
        <span>Non-Overlapping Sections</span>
      </div>
    </div>
  );
}

function OverlapResultsPanel({ analysisResult, onSelectRoute }) {
  if (!analysisResult) return null;

  const {
    proposedTotalDistanceKm,
    overlappingDistanceKm,
    overlapPercentage,
    affectedRoutes = [],
    overlappingSegments = [],
    toleranceMeters
  } = analysisResult;

  const overlapSeverity =
    overlapPercentage > 50 ? "high" : overlapPercentage > 20 ? "moderate" : "low";

  return (
    <section className="content-card overlap-results-card">
      <div className="results-heading">
        <div className="results-title-wrap">
          <div className="results-icon">
            <Activity size={20} />
          </div>
          <div>
            <h3>Overlap Analysis Results</h3>
            <p>Evaluation against active DTC network with {toleranceMeters}m corridor tolerance.</p>
          </div>
        </div>

        <div className={`severity-pill severity-${overlapSeverity}`}>
          <span className="dot" />
          {overlapPercentage}% Network Overlap
        </div>
      </div>

      <div className="kpi-grid">
        <div className="kpi-card">
          <span className="kpi-label">Proposed Total Distance</span>
          <strong className="kpi-value">{proposedTotalDistanceKm} <small>km</small></strong>
          <span className="kpi-sub">Calculated via Haversine</span>
        </div>

        <div className="kpi-card">
          <span className="kpi-label">Overlapping Distance</span>
          <strong className="kpi-value text-danger">{overlappingDistanceKm} <small>km</small></strong>
          <span className="kpi-sub">Shared transit corridor</span>
        </div>

        <div className="kpi-card">
          <span className="kpi-label">Overlap Ratio</span>
          <strong className={`kpi-value ${overlapSeverity === 'high' ? 'text-danger' : overlapSeverity === 'moderate' ? 'text-warning' : 'text-success'}`}>
            {overlapPercentage}%
          </strong>
          <div className="overlap-progress-bar">
            <div
              className={`progress-fill progress-${overlapSeverity}`}
              style={{ width: `${Math.min(100, overlapPercentage)}%` }}
            />
          </div>
        </div>

        <div className="kpi-card">
          <span className="kpi-label">Affected DTC Routes</span>
          <strong className="kpi-value">{affectedRoutes.length} <small>routes</small></strong>
          <span className="kpi-sub">{overlappingSegments.length} discrete segments</span>
        </div>
      </div>

      <div className="affected-routes-section">
        <div className="section-title">
          <h4>Overlapping Routes Breakdown</h4>
          <span>{affectedRoutes.length} existing {affectedRoutes.length === 1 ? "route" : "routes"} overlap</span>
        </div>

        {affectedRoutes.length === 0 ? (
          <div className="empty-overlap-box">
            <Check size={20} className="text-success" />
            <div>
              <strong>Zero Corridor Overlap Detected</strong>
              <p>The proposed route introduces a 100% unique corridor to the DTC network.</p>
            </div>
          </div>
        ) : (
          <div className="affected-routes-list">
            {affectedRoutes.map((route) => (
              <div key={route.existingRouteId} className="affected-route-row">
                <div className="route-badge-col">
                  <span className="badge-route">Route {route.existingRouteNumber}</span>
                </div>
                <div className="route-info-col">
                  <strong>{route.existingRouteName}</strong>
                  <span className="route-terminals">
                    {route.startingPoint} &rarr; {route.destination}
                  </span>
                </div>
                <div className="route-metrics-col">
                  <span className="metric-item">
                    <strong>{route.overlapDistanceKm} km</strong> overlap
                  </span>
                  <span className="metric-item text-secondary">
                    {route.overlapPercentage}% of proposed
                  </span>
                </div>
                <div className="route-action-col">
                  <button
                    type="button"
                    className="button button-outline button-small"
                    onClick={() => onSelectRoute && onSelectRoute(route.existingRouteId)}
                  >
                    Inspect
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
  if (!analysisResult) return null;

  const {
    proposedTotalDistanceKm,
    overlappingDistanceKm,
    overlapPercentage,
    affectedRoutes = [],
    overlappingSegments = [],
    toleranceMeters
  } = analysisResult;

  const overlapSeverity =
    overlapPercentage > 50 ? "high" : overlapPercentage > 20 ? "moderate" : "low";

  return (
    <section className="content-card overlap-results-card">
      <div className="results-heading">
        <div className="results-title-wrap">
          <div className="results-icon">
            <Activity size={20} />
          </div>
          <div>
            <h3>Overlap Analysis Results</h3>
            <p>Evaluation against active DTC network with {toleranceMeters}m corridor tolerance.</p>
          </div>
        </div>

        <div className={`severity-pill severity-${overlapSeverity}`}>
          <span className="dot" />
          {overlapPercentage}% Network Overlap
        </div>
      </div>

      <div className="kpi-grid">
        <div className="kpi-card">
          <span className="kpi-label">Proposed Total Distance</span>
          <strong className="kpi-value">{proposedTotalDistanceKm} <small>km</small></strong>
          <span className="kpi-sub">Calculated via Haversine</span>
        </div>

        <div className="kpi-card">
          <span className="kpi-label">Overlapping Distance</span>
          <strong className="kpi-value text-danger">{overlappingDistanceKm} <small>km</small></strong>
          <span className="kpi-sub">Shared transit corridor</span>
        </div>

        <div className="kpi-card">
          <span className="kpi-label">Overlap Ratio</span>
          <strong className={`kpi-value ${overlapSeverity === 'high' ? 'text-danger' : overlapSeverity === 'moderate' ? 'text-warning' : 'text-success'}`}>
            {overlapPercentage}%
          </strong>
          <div className="overlap-progress-bar">
            <div
              className={`progress-fill progress-${overlapSeverity}`}
              style={{ width: `${Math.min(100, overlapPercentage)}%` }}
            />
          </div>
        </div>

        <div className="kpi-card">
          <span className="kpi-label">Affected DTC Routes</span>
          <strong className="kpi-value">{affectedRoutes.length} <small>routes</small></strong>
          <span className="kpi-sub">{overlappingSegments.length} discrete segments</span>
        </div>
      </div>

      <div className="affected-routes-section">
        <div className="section-title">
          <h4>Overlapping Routes Breakdown</h4>
          <span>{affectedRoutes.length} existing {affectedRoutes.length === 1 ? "route" : "routes"} overlap</span>
        </div>

        {affectedRoutes.length === 0 ? (
          <div className="empty-overlap-box">
            <Check size={20} className="text-success" />
            <div>
              <strong>Zero Corridor Overlap Detected</strong>
              <p>The proposed route introduces a 100% unique corridor to the DTC network.</p>
            </div>
          </div>
        ) : (
          <div className="affected-routes-list">
            {affectedRoutes.map((route) => (
              <div key={route.existingRouteId} className="affected-route-row">
                <div className="route-badge-col">
                  <span className="badge-route">Route {route.existingRouteNumber}</span>
                </div>
                <div className="route-info-col">
                  <strong>{route.existingRouteName}</strong>
                  <span className="route-terminals">
                    {route.startingPoint} &rarr; {route.destination}
                  </span>
                </div>
                <div className="route-metrics-col">
                  <span className="metric-item">
                    <strong>{route.overlapDistanceKm} km</strong> overlap
                  </span>
                  <span className="metric-item text-secondary">
                    {route.overlapPercentage}% of proposed
                  </span>
                </div>
                <div className="route-action-col">
                  <button
                    type="button"
                    className="button button-outline button-small"
                    onClick={() => onSelectRoute && onSelectRoute(route.existingRouteId)}
                  >
                    Inspect
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

export default function RouteOverlapPage() {
  const [mapCenter] = useState(DELHI_CENTER);
  const [proposedPoints, setProposedPoints] = useState([]);
  const [routeName, setRouteName] = useState("New Proposed Route");
  const [drawingMode, setDrawingMode] = useState(true);
  const [existingRoutes, setExistingRoutes] = useState([]);
  const [showExistingRoutes, setShowExistingRoutes] = useState(true);
  const [selectedExistingRouteId, setSelectedExistingRouteId] = useState(null);
  const [loadingRoutes, setLoadingRoutes] = useState(true);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyList, setHistoryList] = useState([]);
  const [savingRoute, setSavingRoute] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const handleAnalyzeOverlap = async () => {
    if (proposedPoints.length < 2) {
      setError("Please draw at least 2 points on the map before running overlap analysis.");
      return;
    }
    setError("");
    setNotice("");
    setAnalyzing(true);
    try {
      const data = await analyzeRouteOverlap({
        coordinates: proposedPoints,
        proposedRouteName: routeName.trim() || "Proposed Route",
        toleranceMeters: Number(toleranceMeters),
        saveRecord: true
      });
      setAnalysisResult(data);
      setNotice(`Analysis complete: ${data.overlapPercentage}% overlap detected with existing routes.`);
    } catch (err) {
      setError(err.response?.data?.error || err.message || "Failed to analyze route overlap.");
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSaveProposedRoute = async () => {
    if (proposedPoints.length < 2) {
      setError("Please draw at least 2 points to save a proposed route.");
      return;
    }
    setError("");
    setNotice("");
    setSavingRoute(true);
    try {
      const saved = await saveProposedRoute({
        name: routeName.trim() || "Proposed Route",
        coordinates: proposedPoints
      });
      setNotice(`Proposed route '${saved.name}' was saved successfully.`);
    } catch (err) {
      setError(err.response?.data?.error || err.message || "Failed to save proposed route.");
    } finally {
      setSavingRoute(false);
    }
  };

  const handleOpenHistory = async () => {
    setError("");
    try {
      const history = await getOverlapHistory();
      setHistoryList(history || []);
      setHistoryOpen(true);
    } catch (err) {
      setError("Failed to load overlap analysis history.");
    }
  };

  const handleSelectHistoryItem = (item) => {
    setAnalysisResult({
      toleranceMeters: item.toleranceMeters,
      proposedTotalDistanceKm: item.proposedTotalDistance,
      overlappingDistanceKm: item.overlappingDistance,
      overlapPercentage: item.overlapPercentage,
      affectedRoutes: [],
      overlappingSegments: item.overlappingSegments || [],
      overlappingPolylines: (item.overlappingSegments || []).map((s) => s.segmentCoordinates || []),
      nonOverlappingPolylines: []
    });
    setRouteName(item.proposedRouteName);
    setHistoryOpen(false);
    setNotice(`Loaded historical analysis from ${new Date(item.createdAt).toLocaleString()}.`);
  };

  // Load existing routes
  useEffect(() => {
    let isMounted = true;
    async function fetchRoutes() {
      try {
        setLoadingRoutes(true);
        const data = await getRoutes();
        if (isMounted) {
          setExistingRoutes(data || []);
        }
      } catch (err) {
        console.error("Failed to load existing routes:", err);
      } finally {
        if (isMounted) setLoadingRoutes(false);
      }
    }
    fetchRoutes();
    return () => {
      isMounted = false;
    };
  }, []);

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

      {error && <div role="alert" className="form-alert">{error}</div>}
      {notice && <div role="status" className="form-success">{notice}</div>}

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

          <label className="toolbar-label">
            Overlap Tolerance
            <select
              className="input-select"
              value={toleranceMeters}
              onChange={(e) => setToleranceMeters(Number(e.target.value))}
            >
              <option value={25}>25 meters (Strict corridor)</option>
              <option value={50}>50 meters (Standard)</option>
              <option value={100}>100 meters (Wide arterial)</option>
              <option value={150}>150 meters (Buffer zone)</option>
            </select>
          </label>
        </div>

        <div className="toolbar-actions">
          <button
            type="button"
            className="button button-primary"
            onClick={handleAnalyzeOverlap}
            disabled={analyzing || proposedPoints.length < 2}
          >
            {analyzing ? <span className="spinner" /> : <Play size={15} />}
            {analyzing ? "Analyzing Overlap..." : "Analyze Overlap"}
          </button>

          <button
            type="button"
            className="button button-outline"
            onClick={handleSaveProposedRoute}
            disabled={savingRoute || proposedPoints.length < 2}
          >
            {savingRoute ? <span className="spinner" /> : <Save size={15} />}
            Save Route
          </button>

          <button
            type="button"
            className="button button-outline"
            onClick={handleOpenHistory}
          >
            <History size={15} />
            History
          </button>

          <button
            type="button"
            className={`button ${showExistingRoutes ? "button-primary" : "button-outline"}`}
            onClick={() => setShowExistingRoutes((v) => !v)}
            title="Toggle existing DTC network routes visibility"
          >
            <Layers size={15} />
            {showExistingRoutes ? `Existing Routes (${existingRoutes.length})` : "Show Routes"}
          </button>

          <button
            type="button"
            className={`button ${drawingMode ? "button-primary" : "button-outline"}`}
            onClick={() => setDrawingMode((v) => !v)}
          >
            <Pencil size={15} />
            {drawingMode ? "Drawing Active" : "Enable Drawing"}
          </button>

          <button
            type="button"
            className="button button-quiet"
            onClick={handleClearRoute}
            disabled={proposedPoints.length === 0}
          >
            <Trash2 size={15} />
            Clear
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

              {/* Existing Routes - Color: GREY (#94a3b8) */}
              {showExistingRoutes && existingRoutes.map((route) => {
                const stops = route.stops || [];
                if (stops.length < 2) return null;
                const positions = stops.map((s) => [s.latitude, s.longitude]);
                const isSelected = selectedExistingRouteId === route.id;

                return (
                  <Polyline
                    key={route.id}
                    positions={positions}
                    pathOptions={{
                      color: isSelected ? "#475569" : "#94a3b8",
                      weight: isSelected ? 4 : 3,
                      opacity: isSelected ? 0.95 : 0.75
                    }}
                  >
                    <Popup>
                      <div className="route-popup">
                        <span className="badge-grey" style={{ display: "inline-block", marginBottom: "4px" }}>
                          Route {route.routeNumber}
                        </span>
                        <h4 style={{ margin: "2px 0 6px", fontSize: "14px", color: "#1e293b" }}>{route.routeName}</h4>
                        <p style={{ margin: "2px 0", fontSize: "12px", color: "#475569" }}>
                          <strong>Path:</strong> {route.startingPoint} &rarr; {route.destination}
                        </p>
                        <p style={{ margin: "2px 0", fontSize: "12px", color: "#475569" }}>
                          <strong>Distance:</strong> {route.totalDistance} km &bull; {stops.length} stops
                        </p>
                      </div>
                    </Popup>
                  </Polyline>
                );
              })}

              {/* Proposed Route Polyline - Color: BLUE (#2563eb) */}
              {proposedPolylinePoints.length > 1 && !analysisResult && (
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

              {/* Non-Overlapping Sections - Color: GREEN (#10b981) */}
              {analysisResult?.nonOverlappingPolylines?.map((poly, idx) => (
                <Polyline
                  key={`non-overlap-${idx}`}
                  positions={poly.map((p) => [p.latitude, p.longitude])}
                  pathOptions={{
                    color: "#10b981",
                    weight: 4,
                    opacity: 0.95
                  }}
                >
                  <Popup>
                    <div className="overlap-popup">
                      <span className="badge-green" style={{ display: "inline-block", marginBottom: "4px" }}>
                        Unique Corridor
                      </span>
                      <p style={{ margin: "2px 0", fontSize: "12px", color: "#1e293b" }}>
                        Non-overlapping proposed transit segment
                      </p>
                    </div>
                  </Popup>
                </Polyline>
              ))}

              {/* Overlapping Sections - Color: RED (#ef4444) */}
              {analysisResult?.overlappingSegments?.map((seg, idx) => {
                const coords = (seg.segmentCoordinates || []).map((p) => [p.latitude, p.longitude]);
                if (coords.length < 2) return null;
                return (
                  <Polyline
                    key={`overlap-${idx}`}
                    positions={coords}
                    pathOptions={{
                      color: "#ef4444",
                      weight: 6,
                      opacity: 0.95
                    }}
                  >
                    <Popup>
                      <div className="overlap-popup">
                        <span className="badge-red" style={{ display: "inline-block", marginBottom: "4px" }}>
                          Overlapping Section
                        </span>
                        <h4 style={{ margin: "2px 0 4px", fontSize: "13px", color: "#b91c1c" }}>
                          Route {seg.existingRouteNumber} &bull; {seg.existingRouteName}
                        </h4>
                        <p style={{ margin: "2px 0", fontSize: "12px", color: "#475569" }}>
                          <strong>Overlap Distance:</strong> {(seg.overlapDistanceMeters / 1000).toFixed(2)} km ({seg.overlapDistanceMeters} m)
                        </p>
                        <p style={{ margin: "2px 0", fontSize: "12px", color: "#475569" }}>
                          <strong>Impact:</strong> {seg.overlapPercentage.toFixed(1)}% of proposed route
                        </p>
                      </div>
                    </Popup>
                  </Polyline>
                );
              })}

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

            <MapLegend />

            {proposedPoints.length === 0 && (
              <div className="map-empty-hint">
                Click anywhere on the map to start plotting waypoints for your proposed route.
              </div>
            )}
          </div>
        </section>

        {/* Route Overlap Analysis Results Panel */}
        <OverlapResultsPanel
          analysisResult={analysisResult}
          onSelectRoute={(id) => setSelectedExistingRouteId(id)}
        />
      </div>

      {/* History Modal */}
      {historyOpen && (
        <div className="route-modal-backdrop" onClick={() => setHistoryOpen(false)}>
          <div className="route-modal" onClick={(e) => e.stopPropagation()}>
            <div className="route-modal-heading">
              <div>
                <span className="eyebrow">HISTORICAL RECORDS</span>
                <h2>Overlap Analysis History</h2>
                <p>Select a previously analyzed corridor to review its metrics and segment overlays.</p>
              </div>
              <button
                type="button"
                className="route-icon-button"
                onClick={() => setHistoryOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="history-list" style={{ maxHeight: "400px", overflowY: "auto", padding: "16px" }}>
              {historyList.length === 0 ? (
                <div style={{ textAlign: "center", padding: "30px", color: "#64748b" }}>
                  <History size={32} style={{ margin: "0 auto 8px", opacity: 0.5 }} />
                  <p>No overlap analysis history found.</p>
                </div>
              ) : (
                historyList.map((item) => (
                  <div
                    key={item.id}
                    className="history-item"
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "12px 16px",
                      border: "1px solid #e2e8f0",
                      borderRadius: "8px",
                      marginBottom: "10px",
                      cursor: "pointer",
                      background: "#ffffff"
                    }}
                    onClick={() => handleSelectHistoryItem(item)}
                  >
                    <div>
                      <strong style={{ display: "block", color: "#1e293b", fontSize: "14px" }}>
                        {item.proposedRouteName}
                      </strong>
                      <span style={{ fontSize: "12px", color: "#64748b" }}>
                        {new Date(item.createdAt).toLocaleDateString()} &bull; Tolerance: {item.toleranceMeters}m
                      </span>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <span
                        className={`badge-${item.overlapPercentage > 50 ? "red" : item.overlapPercentage > 20 ? "amber" : "green"}`}
                        style={{
                          fontWeight: 700,
                          fontSize: "13px",
                          display: "inline-block",
                          marginBottom: "4px"
                        }}
                      >
                        {item.overlapPercentage}% Overlap
                      </span>
                      <small style={{ display: "block", color: "#64748b" }}>
                        {item.overlappingDistance} km / {item.proposedTotalDistance} km
                      </small>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
