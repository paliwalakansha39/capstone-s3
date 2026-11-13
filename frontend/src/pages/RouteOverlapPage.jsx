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

  return (
    <section className="route-overlap-page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">TRANSIT CORRIDOR PLANNING</span>
          <h1>Route Overlap Detection</h1>
          <p>Draw proposed bus routes on the map to evaluate geographical overlap with existing DTC routes.</p>
        </div>
      </div>

      <div className="route-overlap-grid">
        <section className="content-card route-map-card">
          <div className="route-map-heading">
            <div>
              <span className="eyebrow">INTERACTIVE OVERLAP MAP</span>
              <h2>Transit Network Canvas</h2>
              <p>Click on the map to add proposed route points, or inspect overlapping corridor segments.</p>
            </div>
          </div>
          <div className="route-map" style={{ height: "550px" }}>
            <MapContainer center={mapCenter} zoom={11} scrollWheelZoom style={{ height: "100%", width: "100%" }}>
              <FitRouteBounds points={[]} />
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
            </MapContainer>
          </div>
        </section>
      </div>
    </section>
  );
}
