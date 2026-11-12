import {
  CalendarDays,
  Plus,
  RefreshCw,
  Search
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import StatCard from "../components/StatCard";
import {
  getTripStats,
  getTrips
} from "../services/tripService";

export default function TripManagementPage() {
  const [trips, setTrips] = useState([]);
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const [tripsRes, statsRes] = await Promise.all([
        getTrips({ limit: 10 }),
        getTripStats().catch(() => null)
      ]);
      if (tripsRes?.data) setTrips(tripsRes.data);
      if (statsRes) setStats(statsRes);
    } catch (err) {
      setError(err.message || "Failed to load trip schedules.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <div className="admin-page-container">
      <div className="welcome-row">
        <div>
          <span className="eyebrow">OPERATIONS & SCHEDULES</span>
          <h1>Trip Management</h1>
          <p>Monitor, schedule, and assign buses to DTC passenger transit trips across Delhi routes.</p>
        </div>
        <div className="welcome-mark">
          <CalendarDays size={22} />
        </div>
      </div>

      <div className="stats-grid">
        <StatCard
          label="TOTAL TRIPS"
          value={stats?.total ?? trips.length}
          note="Configured schedule entries"
          icon={CalendarDays}
        />
        <StatCard
          label="SCHEDULED"
          value={stats?.scheduled ?? 0}
          note="Upcoming trips awaiting dispatch"
          icon={CalendarDays}
        />
        <StatCard
          label="COMPLETED"
          value={stats?.completed ?? 0}
          note="Successfully completed trips"
          icon={CalendarDays}
        />
        <StatCard
          label="CANCELLED"
          value={stats?.cancelled ?? 0}
          note="Cancelled or withdrawn trips"
          icon={CalendarDays}
        />
      </div>

      {error && (
        <div className="bus-error-banner" role="alert">
          {error}
        </div>
      )}

      {isLoading && (
        <div className="loading-box">
          <div className="spinner" />
          <span>Loading trip schedules...</span>
        </div>
      )}
    </div>
  );
}
