import L from "leaflet";
import { CirclePlus, Clock3, MapPin, Pencil, Plus, Route as RouteIcon, Search, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { createRoute, deleteRoute, getRoutes, updateRoute } from "../services/routeService";

const DELHI_CENTER = [28.6139, 77.209];
const EMPTY_STOP = () => ({ stopName: "", latitude: "", longitude: "", sequenceNumber: 1 });
const EMPTY_ROUTE = {
  routeNumber: "",
  routeName: "",
  startingPoint: "",
  destination: "",
  totalDistance: "",
  estimatedTravelTime: "",
  stops: [EMPTY_STOP(), { ...EMPTY_STOP(), sequenceNumber: 2 }]
};

const stopIcon = L.divIcon({
  className: "route-marker-wrap",
  html: '<span class="route-marker"></span>',
  iconSize: [18, 18],
  iconAnchor: [9, 9]
});

const terminalIcon = L.divIcon({
  className: "route-marker-wrap",
  html: '<span class="route-marker route-marker-terminal"></span>',
  iconSize: [22, 22],
  iconAnchor: [11, 11]
});

function FitRouteBounds({ points }) {
  const map = useMap();
  useEffect(() => {
    if (points.length > 1) map.fitBounds(points, { padding: [32, 32], maxZoom: 14 });
    else if (points.length === 1) map.setView(points[0], 14);
    else map.setView(DELHI_CENTER, 11);
  }, [map, points]);
  return null;
}

function MapContent({ route }) {
  const stops = route?.stops || [];
  const points = useMemo(
    () => stops.map((stop) => [stop.latitude, stop.longitude]),
    [stops]
  );
  return <>
    <FitRouteBounds points={points} />
    <TileLayer
      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
    />
    {points.length > 1 && <Polyline positions={points} pathOptions={{ color: "#e7773b", weight: 5, opacity: 0.85 }} />}
    {stops.map((stop, index) => (
      <Marker key={stop.id || `${stop.sequenceNumber}-${stop.stopName}`} position={points[index]} icon={index === 0 || index === stops.length - 1 ? terminalIcon : stopIcon}>
        <Popup>
          <strong>{stop.stopName}</strong><br />
            {index === 0 ? `Start · ${route.startingPoint}` : index === stops.length - 1 ? `Destination · ${route.destination}` : `Stop ${stop.sequenceNumber}`}
            <br />{stop.latitude.toFixed(5)}, {stop.longitude.toFixed(5)}
        </Popup>
      </Marker>
    ))}
  </>;
}

export default function RouteManagementPage() {
  const [routes, setRoutes] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_ROUTE);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [formError, setFormError] = useState("");

  const selectedRoute = routes.find((route) => route.id === selectedId) || routes[0] || null;

  const loadRoutes = useCallback(async (query = "") => {
    setLoading(true);
    setError("");
    try {
      const data = await getRoutes(query);
      setRoutes(data);
      setSelectedId((current) => data.some((route) => route.id === current) ? current : data[0]?.id || "");
    } catch (requestError) {
      setError(requestError.response?.data?.error || requestError.message || "Could not load routes.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => loadRoutes(search.trim()), search ? 250 : 0);
    return () => window.clearTimeout(timer);
  }, [loadRoutes, search]);

  function openCreate() {
    setEditingId(null);
    setForm({ ...EMPTY_ROUTE, stops: EMPTY_ROUTE.stops.map((stop) => ({ ...stop })) });
    setFormError("");
    setFormOpen(true);
  }

  function openEdit(route) {
    setEditingId(route.id);
    setForm({
      routeNumber: route.routeNumber,
      routeName: route.routeName,
      startingPoint: route.startingPoint,
      destination: route.destination,
      totalDistance: String(route.totalDistance),
      estimatedTravelTime: String(route.estimatedTravelTime),
      stops: route.stops.map((stop) => ({
        id: stop.id,
        stopName: stop.stopName,
        latitude: String(stop.latitude),
        longitude: String(stop.longitude),
        sequenceNumber: stop.sequenceNumber
      }))
    });
    setFormError("");
    setFormOpen(true);
  }

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function updateStop(index, field, value) {
    setForm((current) => ({
      ...current,
      stops: current.stops.map((stop, stopIndex) => stopIndex === index
        ? { ...stop, [field]: value }
        : stop)
    }));
  }

  function addStopField() {
    setForm((current) => ({
      ...current,
      stops: [...current.stops, { ...EMPTY_STOP(), sequenceNumber: current.stops.length + 1 }]
    }));
  }

  function removeStopField(index) {
    setForm((current) => ({
      ...current,
      stops: current.stops
        .filter((_, stopIndex) => stopIndex !== index)
        .map((stop, stopIndex) => ({ ...stop, sequenceNumber: stopIndex + 1 }))
    }));
  }

  async function submitRoute(event) {
    event.preventDefault();
    setFormError("");
    if (form.stops.length < 2) {
      setFormError("Add at least two bus stops to draw a route on the map.");
      return;
    }

    const payload = {
      routeNumber: form.routeNumber.trim(),
      routeName: form.routeName.trim(),
      startingPoint: form.startingPoint.trim(),
      destination: form.destination.trim(),
      totalDistance: Number(form.totalDistance),
      estimatedTravelTime: Number(form.estimatedTravelTime),
      stops: form.stops.map((stop) => ({
        ...(stop.id ? { id: stop.id } : {}),
        stopName: stop.stopName.trim(),
        latitude: Number(stop.latitude),
        longitude: Number(stop.longitude),
        sequenceNumber: Number(stop.sequenceNumber)
      }))
    };

    setSaving(true);
    try {
      const route = editingId
        ? await updateRoute(editingId, payload)
        : await createRoute(payload);
      setNotice(editingId ? `Route ${route.routeNumber} updated.` : `Route ${route.routeNumber} created.`);
      setFormOpen(false);
      await loadRoutes(search.trim());
      setSelectedId(route.id);
    } catch (requestError) {
      setFormError(requestError.response?.data?.error || requestError.message || "Could not save this route.");
    } finally {
      setSaving(false);
    }
  }

  async function removeRoute(route) {
    if (!window.confirm(`Delete route ${route.routeNumber} and all ${route.stops.length} associated bus stops?`)) return;
    setError("");
    setNotice("");
    try {
      await deleteRoute(route.id);
      setNotice(`Route ${route.routeNumber} and its stops were deleted.`);
      await loadRoutes(search.trim());
    } catch (requestError) {
      setError(requestError.response?.data?.error || requestError.message || "Could not delete this route.");
    }
  }

  return <section className="route-management-page">
    <div className="page-heading route-page-heading">
      <div><span className="eyebrow">NETWORK &amp; BUS STOPS</span><h1>Route management</h1><p>Create routes and manage their ordered stops and map locations.</p></div>
      <button className="button button-primary" onClick={openCreate}><Plus size={16} /> Create route</button>
    </div>
    {error && <div role="alert" className="form-alert">{error}</div>}
    {notice && <div role="status" className="form-success">{notice}</div>}
    <div className="route-workspace">
      <section className="content-card route-list-card">
        <div className="route-list-heading">
          <div className="table-title"><div className="table-icon"><RouteIcon size={18} /></div><div><h2>Bus routes</h2><span>{routes.length} {routes.length === 1 ? "route" : "routes"}</span></div></div>
          <label className="search-field route-search"><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search routes" aria-label="Search routes" /></label>
        </div>
        {loading ? <div className="loading-box"><span className="spinner" />Loading routes...</div>
          : routes.length ? <div className="route-list">{routes.map((route) => (
            <button key={route.id} className={`route-list-item ${selectedRoute?.id === route.id ? "route-list-item-active" : ""}`} onClick={() => setSelectedId(route.id)}>
              <span className="route-list-top"><strong>Route {route.routeNumber}</strong><span>{route.stops.length} stops</span></span>
              <span className="route-list-name">{route.routeName}</span>
              <span className="route-list-path">{route.startingPoint} <span>→</span> {route.destination}</span>
              <span className="route-list-meta">{route.totalDistance} km <i /> {route.estimatedTravelTime} min</span>
            </button>
          ))}</div>
          : <div className="route-empty"><MapPin size={22} /><strong>{search ? "No matching routes" : "No routes yet"}</strong><span>{search ? "Try another route number or location." : "Create a route to start managing bus stops."}</span></div>}
      </section>

      <section className="content-card route-map-card">
        <div className="route-map-heading">
          <div>
            <span className="eyebrow">INTERACTIVE ROUTE MAP</span>
            <h2>{selectedRoute ? `Route ${selectedRoute.routeNumber} · ${selectedRoute.routeName}` : "Select a route"}</h2>
            <p>{selectedRoute ? `${selectedRoute.startingPoint} to ${selectedRoute.destination}` : "Your routes and stop markers appear here."}</p>
          </div>
          {selectedRoute && <div className="route-actions">
            <button className="route-icon-button" onClick={() => openEdit(selectedRoute)} aria-label={`Edit route ${selectedRoute.routeNumber}`} title="Edit route"><Pencil size={15} /></button>
            <button className="route-icon-button route-delete-button" onClick={() => removeRoute(selectedRoute)} aria-label={`Delete route ${selectedRoute.routeNumber}`} title="Delete route"><Trash2 size={15} /></button>
          </div>}
        </div>
        <div className="route-map">
          <MapContainer center={DELHI_CENTER} zoom={11} scrollWheelZoom>
            <MapContent route={selectedRoute} />
          </MapContainer>
          {!selectedRoute && <div className="map-empty-hint">Add verified bus stop coordinates to plot a route.</div>}
        </div>
        {selectedRoute && <div className="route-summary">
          <div><RouteIcon size={15} /><span><strong>{selectedRoute.totalDistance} km</strong> distance</span></div>
          <div><Clock3 size={15} /><span><strong>{selectedRoute.estimatedTravelTime} min</strong> travel time</span></div>
          <div><MapPin size={15} /><span><strong>{selectedRoute.stops.length}</strong> ordered stops</span></div>
        </div>}
      </section>
    </div>

    {formOpen && <div className="route-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) setFormOpen(false); }}>
      <section className="route-modal" role="dialog" aria-modal="true" aria-labelledby="route-form-heading">
        <div className="route-modal-heading">
          <div><span className="eyebrow">ROUTE DETAILS &amp; MAP LOCATIONS</span><h2 id="route-form-heading">{editingId ? "Edit route" : "Create route"}</h2><p>Enter verified stop coordinates. The map path follows the stop sequence.</p></div>
          <button type="button" className="route-icon-button" onClick={() => setFormOpen(false)} aria-label="Close route form"><X size={18} /></button>
        </div>
        <form className="route-form" onSubmit={submitRoute}>
          <div className="route-form-grid">
            <label>Route number<input value={form.routeNumber} onChange={(event) => updateField("routeNumber", event.target.value)} required maxLength={30} placeholder="e.g. route identifier" /></label>
            <label>Route name<input value={form.routeName} onChange={(event) => updateField("routeName", event.target.value)} required maxLength={120} /></label>
            <label>Starting point<input value={form.startingPoint} onChange={(event) => updateField("startingPoint", event.target.value)} required maxLength={120} /></label>
            <label>Destination<input value={form.destination} onChange={(event) => updateField("destination", event.target.value)} required maxLength={120} /></label>
            <label>Total distance (km)<input type="number" value={form.totalDistance} onChange={(event) => updateField("totalDistance", event.target.value)} required min="0.1" step="0.1" /></label>
            <label>Estimated travel time (minutes)<input type="number" value={form.estimatedTravelTime} onChange={(event) => updateField("estimatedTravelTime", event.target.value)} required min="1" step="1" /></label>
          </div>
          <div className="route-stops-heading"><div><h3>Bus stops</h3><p>Set coordinates from a trusted source; stops are drawn in sequence order.</p></div><button type="button" className="button button-outline" onClick={addStopField}><CirclePlus size={15} /> Add stop</button></div>
          <div className="route-stop-form-list">
            {form.stops.map((stop, index) => <fieldset className="route-stop-form" key={stop.id || `new-${index}`}>
              <legend>Stop {index + 1}</legend>
              <label>Stop name<input value={stop.stopName} onChange={(event) => updateStop(index, "stopName", event.target.value)} required maxLength={120} /></label>
              <label>Latitude<input type="number" value={stop.latitude} onChange={(event) => updateStop(index, "latitude", event.target.value)} required min="-90" max="90" step="any" /></label>
              <label>Longitude<input type="number" value={stop.longitude} onChange={(event) => updateStop(index, "longitude", event.target.value)} required min="-180" max="180" step="any" /></label>
              <label>Sequence<input type="number" value={stop.sequenceNumber} onChange={(event) => updateStop(index, "sequenceNumber", event.target.value)} required min="1" step="1" /></label>
              <button type="button" className="route-icon-button route-delete-button" onClick={() => removeStopField(index)} aria-label={`Remove stop ${index + 1}`} disabled={form.stops.length <= 2}><Trash2 size={15} /></button>
            </fieldset>)}
          </div>
          {formError && <div role="alert" className="form-alert">{formError}</div>}
          <div className="route-form-actions"><button type="button" className="button button-quiet" onClick={() => setFormOpen(false)} disabled={saving}>Cancel</button><button type="submit" className="button button-primary" disabled={saving}>{saving ? "Saving..." : editingId ? "Save changes" : "Create route"}</button></div>
        </form>
      </section>
    </div>}
  </section>;
}
