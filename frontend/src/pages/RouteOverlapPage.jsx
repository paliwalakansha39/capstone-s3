import {
  Activity,
  ArrowRight,
  Check,
  ChevronRight,
  Clock,
  Compass,
  History,
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
import { getRoutes } from "../services/routeService";
import {
  analyzeRouteOverlap,
  getOverlapHistory,
  saveProposedRoute
} from "../services/routeOverlapService";

export default function RouteOverlapPage() {
  return (
    <section className="route-overlap-page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">TRANSIT CORRIDOR PLANNING</span>
          <h1>Route Overlap Detection</h1>
          <p>Draw proposed bus routes on the map to evaluate geographical overlap with existing DTC routes.</p>
        </div>
      </div>
    </section>
  );
}
