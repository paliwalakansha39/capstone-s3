import {
  AlertCircle,
  ArrowRight,
  BusFront,
  Calendar,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Eye,
  Filter,
  MapPin,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  X
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import StatCard from "../components/StatCard";
import {
  createTrip,
  deleteTrip,
  getBuses,
  getRoutes,
  getTrips,
  getTripStats,
  updateTrip
} from "../services/tripService";

const INITIAL_FORM = {
  routeId: "",
  busId: "",
  tripDate: new Date().toISOString().slice(0, 10),
  departureTime: "08:00",
  arrivalTime: "09:30",
  startingStop: "",
  destinationStop: "",
  status: "Scheduled",
  isOvernight: false
};

const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

export default function TripManagementPage() {
  const [trips, setTrips] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [buses, setBuses] = useState([]);
  const [stats, setStats] = useState(null);

  // Filters & Search
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [routeFilter, setRouteFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("");

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  // Modal states: 'add' | 'edit' | null
  const [modalMode, setModalMode] = useState(null);
  const [activeTrip, setActiveTrip] = useState(null);
  const [form, setForm] = useState(INITIAL_FORM);
  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formModalError, setFormModalError] = useState("");

  // View details & delete modals
  const [viewTrip, setViewTrip] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;

  // Load auxiliary routes and buses from DB on mount
  useEffect(() => {
    let mounted = true;
    async function loadAuxData() {
      try {
        const [routeList, busList] = await Promise.all([
          getRoutes(),
          getBuses()
        ]);
        if (mounted) {
          setRoutes(routeList || []);
          setBuses(busList || []);
        }
      } catch (err) {
        console.warn("Could not load routes or buses helper options:", err.message);
      }
    }
    loadAuxData();
    return () => {
      mounted = false;
    };
  }, []);

  // Fetch trips and stats
  const loadTripData = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const [tripsRes, statsRes] = await Promise.all([
        getTrips({
          search,
          status: statusFilter,
          routeId: routeFilter,
          tripDate: dateFilter,
          limit: 100
        }),
        getTripStats().catch(() => null)
      ]);

      if (tripsRes && tripsRes.data) {
        setTrips(tripsRes.data);
      }
      if (statsRes) {
        setStats(statsRes);
      }
    } catch (err) {
      setError(err.message || "Failed to load trip schedules from database.");
    } finally {
      setIsLoading(false);
    }
  }, [search, statusFilter, routeFilter, dateFilter]);

  useEffect(() => {
    loadTripData();
  }, [loadTripData]);

  // Pagination calculation
  const totalPages = Math.ceil(trips.length / pageSize) || 1;
  const paginatedTrips = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return trips.slice(start, start + pageSize);
  }, [trips, currentPage, pageSize]);

  function getStatusBadgeClass(status) {
    switch (status) {
      case "Scheduled":
        return "status-scheduled";
      case "In Progress":
        return "status-inprogress";
      case "Completed":
        return "status-completed";
      case "Cancelled":
        return "status-cancelled";
      default:
        return "status-inactive";
    }
  }

  // Open creation modal
  function handleOpenAdd() {
    setError("");
    setNotice("");
    setFormModalError("");
    setFormErrors({});
    setActiveTrip(null);
    setForm({
      ...INITIAL_FORM,
      tripDate: new Date().toISOString().slice(0, 10),
      routeId: routes[0]?.id || "",
      startingStop: routes[0]?.startPoint || "",
      destinationStop: routes[0]?.endPoint || "",
      busId: buses.find((b) => b.status === "Active")?.id || ""
    });
    setModalMode("add");
  }

  // Open edit modal
  function handleOpenEdit(trip) {
    setError("");
    setNotice("");
    setFormModalError("");
    setFormErrors({});
    setActiveTrip(trip);

    const depParts = (trip.departureTime || "08:00").slice(0, 5);
    const arrParts = (trip.arrivalTime || "09:30").slice(0, 5);

    setForm({
      routeId: trip.routeId || trip.route?.id || "",
      busId: trip.busId || trip.bus?.id || "",
      tripDate: trip.tripDate || new Date().toISOString().slice(0, 10),
      departureTime: depParts,
      arrivalTime: arrParts,
      startingStop: trip.startingStop || "",
      destinationStop: trip.destinationStop || "",
      status: trip.status || "Scheduled",
      isOvernight: arrParts <= depParts
    });
    setModalMode("edit");
  }

  function handleCloseModal() {
    setModalMode(null);
    setActiveTrip(null);
    setFormErrors({});
    setFormModalError("");
  }

  // Handle route change with automatic stop population
  function handleRouteChange(selectedRouteId) {
    const selectedRoute = routes.find((r) => r.id === selectedRouteId);
    setForm((prev) => ({
      ...prev,
      routeId: selectedRouteId,
      startingStop: selectedRoute ? selectedRoute.startPoint : prev.startingStop,
      destinationStop: selectedRoute ? selectedRoute.endPoint : prev.destinationStop
    }));
    if (formErrors.routeId) {
      setFormErrors((prev) => ({ ...prev, routeId: null }));
    }
  }

  // Frontend validation
  function validateForm() {
    const errors = {};

    if (!form.routeId) {
      errors.routeId = "Please select a route.";
    }

    if (!form.busId) {
      errors.busId = "Please select a bus.";
    }

    if (!form.tripDate) {
      errors.tripDate = "Trip date is required.";
    }

    if (!form.departureTime || !TIME_REGEX.test(form.departureTime.trim())) {
      errors.departureTime = "Valid departure time (HH:mm) is required.";
    }

    if (!form.arrivalTime || !TIME_REGEX.test(form.arrivalTime.trim())) {
      errors.arrivalTime = "Valid arrival time (HH:mm) is required.";
    }

    if (
      form.departureTime &&
      form.arrivalTime &&
      TIME_REGEX.test(form.departureTime.trim()) &&
      TIME_REGEX.test(form.arrivalTime.trim())
    ) {
      const [depH, depM] = form.departureTime.trim().split(":").map(Number);
      const [arrH, arrM] = form.arrivalTime.trim().split(":").map(Number);
      const depMinutes = depH * 60 + depM;
      const arrMinutes = arrH * 60 + arrM;

      if (depMinutes === arrMinutes) {
        errors.arrivalTime = "Arrival time cannot be identical to departure time.";
      } else if (arrMinutes < depMinutes && !form.isOvernight) {
        errors.arrivalTime = "Arrival time is earlier than departure. Check 'Overnight trip' if this trip arrives next day.";
      }
    }

    if (!form.startingStop || !form.startingStop.trim()) {
      errors.startingStop = "Starting stop is required.";
    }

    if (!form.destinationStop || !form.destinationStop.trim()) {
      errors.destinationStop = "Destination stop is required.";
    }

    if (
      form.startingStop &&
      form.destinationStop &&
      form.startingStop.trim().toLowerCase() === form.destinationStop.trim().toLowerCase()
    ) {
      errors.destinationStop = "Starting stop and destination stop cannot be the same.";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }

  // Handle Form Submit
  async function handleSubmit(e) {
    e.preventDefault();
    setFormModalError("");

    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const payload = {
        routeId: form.routeId.trim(),
        busId: form.busId.trim(),
        tripDate: form.tripDate.trim(),
        departureTime: form.departureTime.trim(),
        arrivalTime: form.arrivalTime.trim(),
        startingStop: form.startingStop.trim(),
        destinationStop: form.destinationStop.trim(),
        status: form.status,
        isOvernight: Boolean(form.isOvernight)
      };

      if (modalMode === "add") {
        await createTrip(payload);
        setNotice("New trip scheduled successfully in the database.");
      } else if (modalMode === "edit") {
        await updateTrip(activeTrip.id, payload);
        setNotice("Trip schedule updated successfully.");
      }

      handleCloseModal();
      await loadTripData();
    } catch (err) {
      setFormModalError(err.message || "Failed to save trip schedule.");
    } finally {
      setIsSubmitting(false);
    }
  }

  // Handle Delete Trip
  async function handleDeleteTrip() {
    if (!deleteTarget) return;
    setError("");
    setNotice("");
    setIsDeleting(true);
    try {
      await deleteTrip(deleteTarget.id);
      setNotice(`Trip schedule (${deleteTarget.startingStop} → ${deleteTarget.destinationStop}) deleted successfully.`);
      setDeleteTarget(null);
      await loadTripData();
    } catch (err) {
      setError(err.message || "Failed to delete trip schedule.");
      setDeleteTarget(null);
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="admin-page-container">
      {/* Page Header */}
      <div className="welcome-row">
        <div>
          <span className="eyebrow">DTC TRANSIT NETWORK</span>
          <h1>Trip Management</h1>
          <p>
            Monitor scheduled, active, and completed bus trips across Delhi Transport Corporation routes.
          </p>
        </div>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <button
            className="button button-quiet"
            onClick={loadTripData}
            title="Refresh trip list"
            aria-label="Refresh trip schedules"
            disabled={isLoading}
          >
            <RefreshCw size={14} className={isLoading ? "spinner" : ""} />
            <span>Refresh</span>
          </button>
          <button
            className="button button-primary"
            onClick={handleOpenAdd}
            aria-label="Schedule new trip"
          >
            <Plus size={15} />
            <span>Schedule Trip</span>
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="stats-grid">
        <StatCard
          label="TOTAL TRIPS"
          value={stats?.total ?? trips.length}
          note="All registered trips"
          icon={CalendarDays}
        />
        <StatCard
          label="SCHEDULED"
          value={stats?.scheduled ?? 0}
          note="Upcoming trips awaiting dispatch"
          icon={Clock}
        />
        <StatCard
          label="COMPLETED"
          value={stats?.completed ?? 0}
          note="Successfully completed journeys"
          icon={CheckCircle2}
        />
        <StatCard
          label="CANCELLED"
          value={stats?.cancelled ?? 0}
          note="Cancelled or withdrawn trips"
          icon={AlertCircle}
        />
      </div>

      {/* Notifications */}
      {error && (
        <div className="bus-error-banner" role="alert" style={{ marginBottom: "14px" }}>
          <AlertCircle size={16} style={{ display: "inline", marginRight: "6px" }} />
          {error}
        </div>
      )}
      {notice && (
        <div className="bus-success-banner" role="status" style={{ marginBottom: "14px" }}>
          <CheckCircle2 size={16} style={{ display: "inline", marginRight: "6px" }} />
          {notice}
        </div>
      )}

      {/* Trips Table Card */}
      <div className="content-card users-card">
        {/* Toolbar */}
        <div className="bus-toolbar">
          <div className="bus-toolbar-left">
            <div className="table-title">
              <div className="table-icon">
                <CalendarDays size={18} />
              </div>
              <div>
                <h2>Trip schedule table</h2>
                <span>
                  {trips.length} {trips.length === 1 ? "trip" : "trips"} matching filters
                </span>
              </div>
            </div>

            {/* Search Input */}
            <label className="search-field">
              <Search size={15} />
              <input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search route, bus, stop..."
                aria-label="Search trip schedules"
              />
            </label>
          </div>

          {/* Filters */}
          <div className="bus-filters">
            <Filter size={14} style={{ color: "#778792" }} />

            {/* Date Filter */}
            <input
              type="date"
              className="filter-select"
              value={dateFilter}
              onChange={(e) => {
                setDateFilter(e.target.value);
                setCurrentPage(1);
              }}
              title="Filter by trip date"
              aria-label="Filter by trip date"
            />

            {/* Route Filter */}
            <select
              className="filter-select"
              value={routeFilter}
              onChange={(e) => {
                setRouteFilter(e.target.value);
                setCurrentPage(1);
              }}
              aria-label="Filter by route"
            >
              <option value="all">All routes</option>
              {routes.map((r) => (
                <option key={r.id} value={r.id}>
                  Route {r.routeNumber}
                </option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              className="filter-select"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              aria-label="Filter by trip status"
            >
              <option value="all">All statuses</option>
              <option value="Scheduled">Scheduled</option>
              <option value="In Progress">In Progress</option>
              <option value="Completed">Completed</option>
              <option value="Cancelled">Cancelled</option>
            </select>

            {(search || statusFilter !== "all" || routeFilter !== "all" || dateFilter) && (
              <button
                className="button button-quiet"
                style={{ padding: "6px 10px", fontSize: "10px" }}
                onClick={() => {
                  setSearch("");
                  setStatusFilter("all");
                  setRouteFilter("all");
                  setDateFilter("");
                  setCurrentPage(1);
                }}
              >
                Clear filters
              </button>
            )}
          </div>
        </div>

        {/* Loading / Empty / Table */}
        {isLoading && !trips.length ? (
          <div className="loading-box">
            <div className="spinner" />
            <span>Loading trip schedules from database...</span>
          </div>
        ) : !trips.length ? (
          <div className="loading-box" style={{ padding: "40px 20px" }}>
            <CalendarDays size={32} style={{ color: "#9ca3af", marginBottom: "8px" }} />
            <strong style={{ color: "#1e293b", fontSize: "13px" }}>No trip schedules found</strong>
            <span style={{ fontSize: "11px", color: "#64748b" }}>
              {search || statusFilter !== "all" || routeFilter !== "all" || dateFilter
                ? "Try adjusting your search criteria or clearing filters."
                : "No trips are scheduled yet."}
            </span>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>TRIP ID</th>
                  <th>ROUTE NAME</th>
                  <th>STARTING STOP</th>
                  <th>DESTINATION STOP</th>
                  <th>BUS NUMBER</th>
                  <th>DEPARTURE DATE</th>
                  <th>DEPARTURE</th>
                  <th>ARRIVAL</th>
                  <th>STATUS</th>
                  <th style={{ textAlign: "right" }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {paginatedTrips.map((trip) => (
                  <tr key={trip.id}>
                    <td>
                      <span
                        style={{
                          fontFamily: "monospace",
                          fontSize: "10px",
                          fontWeight: 700,
                          color: "#1e3a5f"
                        }}
                      >
                        {trip.id.slice(0, 8).toUpperCase()}
                      </span>
                    </td>
                    <td>
                      <div className="bus-reg-cell">
                        <strong>
                          {trip.route ? `Route ${trip.route.routeNumber}` : "Direct Trip"}
                        </strong>
                        <small>{trip.route?.routeName || "General Service"}</small>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                        <MapPin size={12} style={{ color: "#059669", flexShrink: 0 }} />
                        <span>{trip.startingStop}</span>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                        <MapPin size={12} style={{ color: "#dc2626", flexShrink: 0 }} />
                        <span>{trip.destinationStop}</span>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <span className="table-avatar" style={{ borderRadius: "3px" }}>
                          <BusFront size={13} />
                        </span>
                        <strong>{trip.bus?.busNumber || "N/A"}</strong>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                        <Calendar size={12} style={{ color: "#64748b" }} />
                        <span>{trip.tripDate}</span>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                        <Clock size={12} style={{ color: "#2563eb" }} />
                        <strong style={{ fontSize: "11px" }}>{trip.departureTime}</strong>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                        <Clock size={12} style={{ color: "#059669" }} />
                        <strong style={{ fontSize: "11px" }}>{trip.arrivalTime}</strong>
                      </div>
                    </td>
                    <td>
                      <span className={`bus-status-badge ${getStatusBadgeClass(trip.status)}`}>
                        <i />
                        {trip.status}
                      </span>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <div className="table-actions" style={{ justifyContent: "flex-end" }}>
                        <button
                          className="table-btn view-btn"
                          onClick={() => setViewTrip(trip)}
                          title="View trip details"
                          aria-label={`View trip ${trip.id.slice(0, 8)}`}
                        >
                          <Eye size={13} />
                        </button>
                        <button
                          className="table-btn edit-btn"
                          onClick={() => handleOpenEdit(trip)}
                          title="Edit trip schedule"
                          aria-label={`Edit trip ${trip.id.slice(0, 8)}`}
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          className="table-btn delete-btn"
                          onClick={() => setDeleteTarget(trip)}
                          title="Delete trip schedule"
                          aria-label={`Delete trip ${trip.id.slice(0, 8)}`}
                          disabled={trip.status === "In Progress"}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination Controls */}
            <div className="pagination-wrap">
              <span>
                Showing {(currentPage - 1) * pageSize + 1} to{" "}
                {Math.min(currentPage * pageSize, trips.length)} of {trips.length} trips
              </span>
              <div className="pagination-actions">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  aria-label="Previous page"
                >
                  <ChevronLeft size={13} /> Prev
                </button>
                <span style={{ padding: "0 6px" }}>
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage >= totalPages}
                  aria-label="Next page"
                >
                  Next <ChevronRight size={13} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Trip Creation & Editing Modal */}
      {modalMode && (
        <div className="modal-backdrop" onClick={handleCloseModal}>
          <div
            className="modal-box bus-modal"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-label={modalMode === "add" ? "Schedule New Trip" : "Edit Trip Schedule"}
          >
            <div className="modal-header">
              <div className="table-title">
                <div className="table-icon">
                  <CalendarDays size={18} />
                </div>
                <div>
                  <h2>{modalMode === "add" ? "Schedule New Trip" : "Edit Trip Schedule"}</h2>
                  <span>
                    {modalMode === "add"
                      ? "Assign bus, route, and transit schedule"
                      : `Modifying Trip ${activeTrip?.id?.slice(0, 8)}`}
                  </span>
                </div>
              </div>
              <button
                className="modal-close-btn"
                onClick={handleCloseModal}
                aria-label="Close dialog"
              >
                <X size={16} />
              </button>
            </div>

            {formModalError && (
              <div
                className="bus-error-banner"
                role="alert"
                style={{ margin: "14px 0 6px 0" }}
              >
                <AlertCircle size={15} style={{ display: "inline", marginRight: "6px" }} />
                {formModalError}
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ marginTop: "14px" }}>
              <div className="bus-form-grid">
                {/* Route Selection */}
                <label className="full-span">
                  <span>
                    Route Selection <strong style={{ color: "#dc2626" }}>*</strong>
                  </span>
                  <select
                    value={form.routeId}
                    onChange={(e) => handleRouteChange(e.target.value)}
                    required
                  >
                    <option value="">Select an active DTC route...</option>
                    {routes.map((r) => (
                      <option key={r.id} value={r.id}>
                        Route {r.routeNumber} ({r.startPoint} ↔ {r.endPoint})
                      </option>
                    ))}
                  </select>
                  {formErrors.routeId && (
                    <span style={{ color: "#dc2626", fontSize: "10px" }}>
                      {formErrors.routeId}
                    </span>
                  )}
                </label>

                {/* Bus Selection */}
                <label className="full-span">
                  <span>
                    Bus Assignment <strong style={{ color: "#dc2626" }}>*</strong>
                  </span>
                  <select
                    value={form.busId}
                    onChange={(e) => {
                      setForm((prev) => ({ ...prev, busId: e.target.value }));
                      if (formErrors.busId) {
                        setFormErrors((prev) => ({ ...prev, busId: null }));
                      }
                    }}
                    required
                  >
                    <option value="">Select a bus for assignment...</option>
                    {buses.map((b) => (
                      <option
                        key={b.id}
                        value={b.id}
                        disabled={b.status !== "Active"}
                      >
                        {b.busNumber} — {b.busType} ({b.registrationNumber}) [Status: {b.status}]
                      </option>
                    ))}
                  </select>
                  {formErrors.busId && (
                    <span style={{ color: "#dc2626", fontSize: "10px" }}>
                      {formErrors.busId}
                    </span>
                  )}
                </label>

                {/* Trip Date */}
                <label>
                  <span>
                    Trip Date <strong style={{ color: "#dc2626" }}>*</strong>
                  </span>
                  <input
                    type="date"
                    value={form.tripDate}
                    onChange={(e) => setForm((prev) => ({ ...prev, tripDate: e.target.value }))}
                    required
                  />
                  {formErrors.tripDate && (
                    <span style={{ color: "#dc2626", fontSize: "10px" }}>
                      {formErrors.tripDate}
                    </span>
                  )}
                </label>

                {/* Trip Status */}
                <label>
                  <span>
                    Trip Status <strong style={{ color: "#dc2626" }}>*</strong>
                  </span>
                  <select
                    value={form.status}
                    onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value }))}
                    required
                  >
                    <option value="Scheduled">Scheduled</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Completed">Completed</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </label>

                {/* Departure Time */}
                <label>
                  <span>
                    Departure Time <strong style={{ color: "#dc2626" }}>*</strong>
                  </span>
                  <input
                    type="time"
                    value={form.departureTime}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, departureTime: e.target.value }))
                    }
                    required
                  />
                  {formErrors.departureTime && (
                    <span style={{ color: "#dc2626", fontSize: "10px" }}>
                      {formErrors.departureTime}
                    </span>
                  )}
                </label>

                {/* Arrival Time */}
                <label>
                  <span>
                    Arrival Time <strong style={{ color: "#dc2626" }}>*</strong>
                  </span>
                  <input
                    type="time"
                    value={form.arrivalTime}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, arrivalTime: e.target.value }))
                    }
                    required
                  />
                  {formErrors.arrivalTime && (
                    <span style={{ color: "#dc2626", fontSize: "10px" }}>
                      {formErrors.arrivalTime}
                    </span>
                  )}
                </label>

                {/* Overnight Trip Checkbox */}
                <div
                  className="full-span"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    background: "#f8fafb",
                    padding: "8px 12px",
                    borderRadius: "3px",
                    border: "1px solid #edf0f2"
                  }}
                >
                  <input
                    type="checkbox"
                    id="isOvernight"
                    checked={form.isOvernight}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, isOvernight: e.target.checked }))
                    }
                    style={{ width: "16px", height: "16px", cursor: "pointer" }}
                  />
                  <label
                    htmlFor="isOvernight"
                    style={{ fontSize: "11px", color: "#334155", cursor: "pointer", fontWeight: 500 }}
                  >
                    Overnight journey (bus arrives on the following calendar day)
                  </label>
                </div>

                {/* Starting Stop */}
                <label>
                  <span>
                    Starting Bus Stop <strong style={{ color: "#dc2626" }}>*</strong>
                  </span>
                  <input
                    type="text"
                    value={form.startingStop}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, startingStop: e.target.value }))
                    }
                    placeholder="e.g. Ambedkar Nagar Terminal"
                    maxLength={120}
                    required
                  />
                  {formErrors.startingStop && (
                    <span style={{ color: "#dc2626", fontSize: "10px" }}>
                      {formErrors.startingStop}
                    </span>
                  )}
                </label>

                {/* Destination Stop */}
                <label>
                  <span>
                    Destination Bus Stop <strong style={{ color: "#dc2626" }}>*</strong>
                  </span>
                  <input
                    type="text"
                    value={form.destinationStop}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, destinationStop: e.target.value }))
                    }
                    placeholder="e.g. Old Delhi Railway Station"
                    maxLength={120}
                    required
                  />
                  {formErrors.destinationStop && (
                    <span style={{ color: "#dc2626", fontSize: "10px" }}>
                      {formErrors.destinationStop}
                    </span>
                  )}
                </label>
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: "10px",
                  marginTop: "20px",
                  borderTop: "1px solid #eef2f4",
                  paddingTop: "14px"
                }}
              >
                <button
                  type="button"
                  className="button button-outline"
                  onClick={handleCloseModal}
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="button button-primary"
                  disabled={isSubmitting}
                >
                  {isSubmitting
                    ? modalMode === "add"
                      ? "Scheduling..."
                      : "Updating..."
                    : modalMode === "add"
                    ? "Schedule Trip"
                    : "Update Trip"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Details Modal */}
      {viewTrip && (
        <div className="modal-backdrop" onClick={() => setViewTrip(null)}>
          <div
            className="modal-box bus-modal bus-detail-modal"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-label="Trip Details"
          >
            <div className="modal-header">
              <div className="table-title">
                <div className="table-icon">
                  <CalendarDays size={18} />
                </div>
                <div>
                  <h2>Trip Schedule Details</h2>
                  <span>ID: {viewTrip.id}</span>
                </div>
              </div>
              <button
                className="modal-close-btn"
                onClick={() => setViewTrip(null)}
                aria-label="Close details"
              >
                <X size={16} />
              </button>
            </div>

            <div className="bus-details-view" style={{ marginTop: "14px" }}>
              <div className="detail-banner">
                <div className="detail-banner-title">
                  <span className={`bus-status-badge ${getStatusBadgeClass(viewTrip.status)}`}>
                    <i />
                    {viewTrip.status}
                  </span>
                  <h3>
                    {viewTrip.startingStop} <ArrowRight size={16} style={{ display: "inline", margin: "0 4px" }} /> {viewTrip.destinationStop}
                  </h3>
                  <span>
                    Route: {viewTrip.route ? `${viewTrip.route.routeNumber} – ${viewTrip.route.routeName}` : "Direct Scheduled Service"}
                  </span>
                </div>
              </div>

              <div className="detail-grid">
                <div className="detail-card">
                  <span>TRIP DATE</span>
                  <strong>{viewTrip.tripDate}</strong>
                  <small>Scheduled operation day</small>
                </div>
                <div className="detail-card">
                  <span>TIMINGS</span>
                  <strong>
                    {viewTrip.departureTime} Departure → {viewTrip.arrivalTime} Arrival
                  </strong>
                  <small>Scheduled terminal transit times</small>
                </div>
                <div className="detail-card">
                  <span>ASSIGNED BUS</span>
                  <strong>
                    {viewTrip.bus?.busNumber || "None"}{" "}
                    {viewTrip.bus?.registrationNumber ? `(${viewTrip.bus.registrationNumber})` : ""}
                  </strong>
                  <small>
                    Type: {viewTrip.bus?.busType || "Standard"} · Status: {viewTrip.bus?.status || "Active"}
                  </small>
                </div>
                <div className="detail-card">
                  <span>ROUTE DISTANCE</span>
                  <strong>
                    {viewTrip.route?.totalDistanceKm
                      ? `${viewTrip.route.totalDistanceKm} km`
                      : "Standard Corridor"}
                  </strong>
                  <small>Authorized DTC corridor</small>
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "10px" }}>
                <button className="button button-outline" onClick={() => setViewTrip(null)}>
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="modal-backdrop" onClick={() => setDeleteTarget(null)}>
          <div
            className="modal-box bus-modal"
            onClick={(e) => e.stopPropagation()}
            role="alertdialog"
            aria-label="Confirm Delete Trip"
          >
            <div className="modal-header">
              <div className="table-title">
                <div className="table-icon" style={{ background: "#fee2e2", color: "#dc2626" }}>
                  <Trash2 size={18} />
                </div>
                <div>
                  <h2>Delete Trip Schedule</h2>
                  <span>This action cannot be undone</span>
                </div>
              </div>
              <button
                className="modal-close-btn"
                onClick={() => setDeleteTarget(null)}
                aria-label="Cancel deletion"
              >
                <X size={16} />
              </button>
            </div>

            <p style={{ fontSize: "12px", color: "#4b5563", margin: "16px 0" }}>
              Are you sure you want to delete the scheduled trip for{" "}
              <strong>
                {deleteTarget.startingStop} → {deleteTarget.destinationStop}
              </strong>{" "}
              on <strong>{deleteTarget.tripDate}</strong> at{" "}
              <strong>{deleteTarget.departureTime}</strong>?
            </p>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <button
                className="button button-outline"
                onClick={() => setDeleteTarget(null)}
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                className="button"
                style={{ background: "#dc2626", color: "#fff" }}
                onClick={handleDeleteTrip}
                disabled={isDeleting}
              >
                {isDeleting ? "Deleting..." : "Delete Trip"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
