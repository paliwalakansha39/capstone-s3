import {
  AlertCircle,
  BusFront,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Eye,
  Filter,
  MapPin,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Trash2,
  UserCheck,
  X,
  Zap
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import StatCard from "../components/StatCard";

const INITIAL_FORM = {
  busNumber: "",
  registrationNumber: "",
  busType: "Electric",
  capacity: 42,
  depot: "BBM Depot",
  manufacturer: "Tata Motors",
  modelYear: new Date().getFullYear(),
  status: "Active",
  routeId: "",
  driverId: ""
};

export default function BusManagementPage({
  buses: initialBuses = [],
  routes: initialRoutes = [],
  drivers: initialDrivers = [],
  onAddBus,
  onUpdateBus,
  onDeleteBus,
  isLoading = false
}) {
  const [buses, setBuses] = useState(initialBuses);
  const [routes, setRoutes] = useState(initialRoutes);
  const [drivers, setDrivers] = useState(initialDrivers);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  const [modalMode, setModalMode] = useState(null); // 'add' | 'edit' | 'view' | null
  const [activeBus, setActiveBus] = useState(null);
  const [form, setForm] = useState(INITIAL_FORM);
  const [formErrors, setFormErrors] = useState({});

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;

  useEffect(() => {
    setBuses(initialBuses);
  }, [initialBuses]);

  useEffect(() => {
    setRoutes(initialRoutes);
  }, [initialRoutes]);

  useEffect(() => {
    setDrivers(initialDrivers);
  }, [initialDrivers]);

  // Statistics calculation
  const stats = useMemo(() => {
    const total = buses.length;
    const active = buses.filter((b) => b.status === "Active").length;
    const maintenance = buses.filter((b) => b.status === "Maintenance").length;
    const electric = buses.filter((b) => b.busType === "Electric").length;
    return { total, active, maintenance, electric };
  }, [buses]);

  // Filtered and searched buses
  const filteredBuses = useMemo(() => {
    return buses.filter((bus) => {
      const q = search.toLowerCase().trim();
      const matchSearch =
        !q ||
        bus.busNumber.toLowerCase().includes(q) ||
        bus.registrationNumber.toLowerCase().includes(q) ||
        (bus.depot && bus.depot.toLowerCase().includes(q)) ||
        (bus.manufacturer && bus.manufacturer.toLowerCase().includes(q)) ||
        (bus.route?.routeNumber && bus.route.routeNumber.toLowerCase().includes(q)) ||
        (bus.driver?.name && bus.driver.name.toLowerCase().includes(q));

      const matchStatus = statusFilter === "all" || bus.status === statusFilter;
      const matchType = typeFilter === "all" || bus.busType === typeFilter;

      return matchSearch && matchStatus && matchType;
    });
  }, [buses, search, statusFilter, typeFilter]);

  // Pagination slice
  const totalPages = Math.ceil(filteredBuses.length / pageSize) || 1;
  const paginatedBuses = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredBuses.slice(start, start + pageSize);
  }, [filteredBuses, currentPage, pageSize]);

  function handleOpenAdd() {
    setForm(INITIAL_FORM);
    setFormErrors({});
    setError("");
    setNotice("");
    setModalMode("add");
  }

  function handleOpenEdit(bus) {
    setActiveBus(bus);
    setForm({
      busNumber: bus.busNumber || "",
      registrationNumber: bus.registrationNumber || "",
      busType: bus.busType || "Electric",
      capacity: bus.capacity || 42,
      depot: bus.depot || "BBM Depot",
      manufacturer: bus.manufacturer || "Tata Motors",
      modelYear: bus.modelYear || new Date().getFullYear(),
      status: bus.status || "Active",
      routeId: bus.routeId || bus.route?.id || "",
      driverId: bus.driverId || bus.driver?.id || ""
    });
    setFormErrors({});
    setError("");
    setNotice("");
    setModalMode("edit");
  }

  function handleOpenView(bus) {
    setActiveBus(bus);
    setModalMode("view");
  }

  function closeModal() {
    setModalMode(null);
    setActiveBus(null);
    setFormErrors({});
  }

  function validateForm() {
    const errors = {};
    if (!form.busNumber.trim()) errors.busNumber = "Bus number is required.";
    if (!form.registrationNumber.trim()) errors.registrationNumber = "Registration number is required.";
    else if (!/^[A-Z]{2}[ -]?[0-9]{1,2}[ -]?[A-Z]{1,3}[ -]?[0-9]{4}$/i.test(form.registrationNumber.trim())) {
      errors.registrationNumber = "Enter a valid registration (e.g., DL 01 EA 2041).";
    }

    const cap = Number(form.capacity);
    if (!cap || cap < 10 || cap > 120) {
      errors.capacity = "Capacity must be between 10 and 120 seats.";
    }

    const year = Number(form.modelYear);
    if (year && (year < 1990 || year > new Date().getFullYear() + 1)) {
      errors.modelYear = "Enter a valid 4-digit model year.";
    }

    // Check duplicate locally if onAddBus / onUpdateBus not overriding
    const duplicateReg = buses.find(
      (b) =>
        b.registrationNumber.toLowerCase() === form.registrationNumber.trim().toLowerCase() &&
        b.id !== activeBus?.id
    );
    if (duplicateReg) {
      errors.registrationNumber = `Registration already assigned to bus ${duplicateReg.busNumber}.`;
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setNotice("");

    if (!validateForm()) return;

    try {
      const payload = {
        ...form,
        busNumber: form.busNumber.trim(),
        registrationNumber: form.registrationNumber.trim().toUpperCase(),
        capacity: Number(form.capacity),
        modelYear: form.modelYear ? Number(form.modelYear) : null,
        routeId: form.routeId || null,
        driverId: form.driverId || null
      };

      if (modalMode === "add") {
        if (onAddBus) {
          await onAddBus(payload);
        } else {
          // Local fallback
          const newBus = {
            ...payload,
            id: crypto.randomUUID(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            route: routes.find((r) => r.id === payload.routeId),
            driver: drivers.find((d) => d.id === payload.driverId)
          };
          setBuses((prev) => [newBus, ...prev]);
        }
        setNotice(`Bus ${payload.busNumber} added to fleet successfully.`);
      } else if (modalMode === "edit") {
        if (onUpdateBus) {
          await onUpdateBus(activeBus.id, payload);
        } else {
          // Local fallback
          setBuses((prev) =>
            prev.map((b) =>
              b.id === activeBus.id
                ? {
                    ...b,
                    ...payload,
                    updatedAt: new Date().toISOString(),
                    route: routes.find((r) => r.id === payload.routeId),
                    driver: drivers.find((d) => d.id === payload.driverId)
                  }
                : b
            )
          );
        }
        setNotice(`Bus ${payload.busNumber} updated successfully.`);
      }
      closeModal();
    } catch (err) {
      setError(err.message || "Failed to save bus details.");
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setError("");
    setNotice("");
    try {
      if (onDeleteBus) {
        await onDeleteBus(deleteTarget.id);
      } else {
        setBuses((prev) => prev.filter((b) => b.id !== deleteTarget.id));
      }
      setNotice(`Bus ${deleteTarget.busNumber} deleted from fleet.`);
      setDeleteTarget(null);
    } catch (err) {
      setError(err.message || "Failed to delete bus.");
      setDeleteTarget(null);
    }
  }

  function getStatusClass(status) {
    if (status === "Active") return "status-active";
    if (status === "Maintenance") return "status-maintenance";
    return "status-inactive";
  }

  function getTypeClass(type) {
    const t = (type || "").toLowerCase().replace(/[\s-]/g, "");
    if (t.includes("electric")) return "type-electric";
    if (t.includes("lowfloor")) return "type-lowfloor";
    if (t.includes("nonac")) return "type-nonac";
    if (t.includes("ac")) return "type-ac";
    return "type-standard";
  }

  return (
    <section className="bus-page">
      {/* Top Banner Heading */}
      <div className="bus-heading">
        <div>
          <span className="eyebrow">FLEET OPERATIONS &amp; ASSETS</span>
          <h1>Bus Management</h1>
          <p>Register, track, monitor, and maintain Delhi Transport Corporation fleet vehicles.</p>
        </div>
        <button className="button button-primary" onClick={handleOpenAdd}>
          <Plus size={16} /> Register new bus
        </button>
      </div>

      {/* Fleet KPI Stat Cards */}
      <div className="bus-stats-bar">
        <StatCard icon={BusFront} label="Total fleet" value={stats.total} note="Active DTC buses" />
        <StatCard icon={CheckCircle2} label="In active service" value={stats.active} note="Dispatched on routes" accent />
        <StatCard icon={RotateCcw} label="Under maintenance" value={stats.maintenance} note="Depot service workshops" />
        <StatCard icon={Zap} label="Zero-emission electric" value={stats.electric} note="Clean mobility fleet" />
      </div>

      {/* Alerts */}
      {error && (
        <div role="alert" className="form-alert">
          <AlertCircle size={16} style={{ display: "inline", marginRight: "6px" }} />
          {error}
        </div>
      )}
      {notice && (
        <div role="status" className="form-success">
          <CheckCircle2 size={16} style={{ display: "inline", marginRight: "6px" }} />
          {notice}
        </div>
      )}

      {/* Main Bus Table Card */}
      <div className="content-card users-card">
        <div className="bus-toolbar">
          <div className="bus-toolbar-left">
            <div className="table-title">
              <div className="table-icon">
                <BusFront size={18} />
              </div>
              <div>
                <h2>Registered buses</h2>
                <span>
                  {filteredBuses.length} {filteredBuses.length === 1 ? "bus" : "buses"} in view
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
                placeholder="Search bus #, plate, depot..."
                aria-label="Search buses"
              />
            </label>
          </div>

          {/* Filters */}
          <div className="bus-filters">
            <Filter size={14} style={{ color: "#778792" }} />
            <select
              className="filter-select"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              aria-label="Filter by Status"
            >
              <option value="all">All statuses</option>
              <option value="Active">Active</option>
              <option value="Maintenance">Maintenance</option>
              <option value="Inactive">Inactive</option>
            </select>

            <select
              className="filter-select"
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setCurrentPage(1);
              }}
              aria-label="Filter by Bus Type"
            >
              <option value="all">All types</option>
              <option value="Electric">Electric</option>
              <option value="AC">AC</option>
              <option value="Low Floor">Low Floor</option>
              <option value="Non-AC">Non-AC</option>
              <option value="Standard">Standard</option>
            </select>

            {(search || statusFilter !== "all" || typeFilter !== "all") && (
              <button
                className="button button-quiet"
                style={{ padding: "6px 10px", fontSize: "10px" }}
                onClick={() => {
                  setSearch("");
                  setStatusFilter("all");
                  setTypeFilter("all");
                  setCurrentPage(1);
                }}
              >
                Clear filters
              </button>
            )}
          </div>
        </div>

        {/* Loading Spinner or Table */}
        {isLoading ? (
          <div className="loading-box">
            <div className="spinner" />
            <span>Loading fleet data from database...</span>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>BUS NUMBER</th>
                  <th>REGISTRATION</th>
                  <th>TYPE</th>
                  <th>SEATS</th>
                  <th>DEPOT</th>
                  <th>ASSIGNED ROUTE</th>
                  <th>ASSIGNED DRIVER</th>
                  <th>STATUS</th>
                  <th style={{ textAlign: "right" }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {paginatedBuses.map((bus) => (
                  <tr key={bus.id}>
                    <td>
                      <div className="table-user">
                        <span className="table-avatar" style={{ borderRadius: "4px" }}>
                          <BusFront size={14} />
                        </span>
                        <strong>{bus.busNumber}</strong>
                      </div>
                    </td>
                    <td>
                      <div className="bus-reg-cell">
                        <strong>{bus.registrationNumber}</strong>
                        <small>{bus.manufacturer || "DTC"}</small>
                      </div>
                    </td>
                    <td>
                      <span className={`bus-type-badge ${getTypeClass(bus.busType)}`}>
                        {bus.busType}
                      </span>
                    </td>
                    <td>{bus.capacity} seats</td>
                    <td>{bus.depot || "Unassigned"}</td>
                    <td>
                      {bus.route ? (
                        <span title={bus.route.routeName}>
                          <strong>{bus.route.routeNumber}</strong>
                          <span style={{ fontSize: "8px", color: "#8a98a1", display: "block" }}>
                            {bus.route.startPoint?.split(" ")[0]} → {bus.route.endPoint?.split(" ")[0]}
                          </span>
                        </span>
                      ) : (
                        <span style={{ color: "#9aa6ae" }}>—</span>
                      )}
                    </td>
                    <td>
                      {bus.driver ? (
                        <span>
                          <strong>{bus.driver.name}</strong>
                          <span style={{ fontSize: "8px", color: "#8a98a1", display: "block" }}>
                            {bus.driver.badgeNumber}
                          </span>
                        </span>
                      ) : (
                        <span style={{ color: "#9aa6ae" }}>Unassigned</span>
                      )}
                    </td>
                    <td>
                      <span className={`bus-status-badge ${getStatusClass(bus.status)}`}>
                        <i />
                        {bus.status}
                      </span>
                    </td>
                    <td>
                      <div className="row-actions">
                        <button
                          title="View bus details"
                          aria-label={`View details of bus ${bus.busNumber}`}
                          onClick={() => handleOpenView(bus)}
                        >
                          <Eye size={15} />
                        </button>
                        <button
                          title="Edit bus"
                          aria-label={`Edit bus ${bus.busNumber}`}
                          onClick={() => handleOpenEdit(bus)}
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          title="Delete bus"
                          aria-label={`Delete bus ${bus.busNumber}`}
                          onClick={() => setDeleteTarget(bus)}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {!paginatedBuses.length && (
                  <tr>
                    <td colSpan="9" className="table-empty">
                      {buses.length
                        ? "No buses match your search or filter criteria."
                        : "No buses have been registered in the database yet."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {filteredBuses.length > pageSize && (
          <div className="pagination-wrap">
            <span>
              Showing {(currentPage - 1) * pageSize + 1}–
              {Math.min(currentPage * pageSize, filteredBuses.length)} of {filteredBuses.length} buses
            </span>
            <div className="pagination-actions">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => p - 1)}
                aria-label="Previous page"
              >
                <ChevronLeft size={13} /> Prev
              </button>
              <span>
                Page {currentPage} of {totalPages}
              </span>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => p + 1)}
                aria-label="Next page"
              >
                Next <ChevronRight size={13} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add / Edit Bus Modal */}
      {(modalMode === "add" || modalMode === "edit") && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeModal();
          }}
        >
          <section className="bus-modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
            <div className="modal-heading">
              <div>
                <span className="eyebrow">FLEET ASSET FORM</span>
                <h2 id="modal-title">{modalMode === "add" ? "Register new bus" : `Edit bus ${activeBus?.busNumber}`}</h2>
              </div>
              <button onClick={closeModal} aria-label="Close dialog">
                <X size={19} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="user-form">
              <div className="bus-form-grid">
                {/* Bus Number */}
                <label>
                  Bus Number *
                  <input
                    value={form.busNumber}
                    onChange={(e) => setForm({ ...form, busNumber: e.target.value })}
                    placeholder="e.g. DTC-1045"
                    required
                  />
                  {formErrors.busNumber && <span style={{ color: "#a33c2c", fontSize: "9px" }}>{formErrors.busNumber}</span>}
                </label>

                {/* Registration Number */}
                <label>
                  Registration Number *
                  <input
                    value={form.registrationNumber}
                    onChange={(e) => setForm({ ...form, registrationNumber: e.target.value })}
                    placeholder="e.g. DL 01 EA 2045"
                    required
                  />
                  {formErrors.registrationNumber && (
                    <span style={{ color: "#a33c2c", fontSize: "9px" }}>{formErrors.registrationNumber}</span>
                  )}
                </label>

                {/* Bus Type */}
                <label>
                  Bus Type *
                  <select
                    value={form.busType}
                    onChange={(e) => setForm({ ...form, busType: e.target.value })}
                  >
                    <option value="Electric">Electric</option>
                    <option value="AC">AC</option>
                    <option value="Low Floor">Low Floor</option>
                    <option value="Non-AC">Non-AC</option>
                    <option value="Standard">Standard</option>
                  </select>
                </label>

                {/* Capacity */}
                <label>
                  Passenger Capacity (seats) *
                  <input
                    type="number"
                    min="10"
                    max="120"
                    value={form.capacity}
                    onChange={(e) => setForm({ ...form, capacity: e.target.value })}
                    required
                  />
                  {formErrors.capacity && <span style={{ color: "#a33c2c", fontSize: "9px" }}>{formErrors.capacity}</span>}
                </label>

                {/* Depot */}
                <label>
                  Assigned Depot
                  <select
                    value={form.depot}
                    onChange={(e) => setForm({ ...form, depot: e.target.value })}
                  >
                    <option value="BBM Depot">BBM Depot</option>
                    <option value="Sarojini Nagar Depot">Sarojini Nagar Depot</option>
                    <option value="Rohini Depot-I">Rohini Depot-I</option>
                    <option value="Mayapuri Depot">Mayapuri Depot</option>
                    <option value="Kushak Nallah Depot">Kushak Nallah Depot</option>
                    <option value="Anand Vihar Depot">Anand Vihar Depot</option>
                    <option value="Wazirpur Depot">Wazirpur Depot</option>
                  </select>
                </label>

                {/* Manufacturer */}
                <label>
                  Manufacturer
                  <input
                    value={form.manufacturer}
                    onChange={(e) => setForm({ ...form, manufacturer: e.target.value })}
                    placeholder="e.g. Tata Motors"
                  />
                </label>

                {/* Model Year */}
                <label>
                  Model Year
                  <input
                    type="number"
                    min="1990"
                    max={new Date().getFullYear() + 1}
                    value={form.modelYear}
                    onChange={(e) => setForm({ ...form, modelYear: e.target.value })}
                  />
                </label>

                {/* Status */}
                <label>
                  Operational Status *
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                  >
                    <option value="Active">Active</option>
                    <option value="Maintenance">Maintenance</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </label>

                {/* Assigned Route */}
                <label className="full-span">
                  Assigned Route
                  <select
                    value={form.routeId}
                    onChange={(e) => setForm({ ...form, routeId: e.target.value })}
                  >
                    <option value="">Unassigned (No route assigned)</option>
                    {routes.map((r) => (
                      <option key={r.id} value={r.id}>
                        Route {r.routeNumber} — {r.routeName}
                      </option>
                    ))}
                  </select>
                </label>

                {/* Assigned Driver */}
                <label className="full-span">
                  Assigned Primary Driver
                  <select
                    value={form.driverId}
                    onChange={(e) => setForm({ ...form, driverId: e.target.value })}
                  >
                    <option value="">Unassigned (No driver assigned)</option>
                    {drivers.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.badgeNumber}) — {d.status}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              {error && <div role="alert" className="form-alert">{error}</div>}

              <div className="modal-actions" style={{ marginTop: "16px" }}>
                <button type="button" className="button button-quiet" onClick={closeModal}>
                  Cancel
                </button>
                <button type="submit" className="button button-primary">
                  {modalMode === "add" ? "Save bus to fleet" : "Save changes"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {/* View Bus Details Modal */}
      {modalMode === "view" && activeBus && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeModal();
          }}
        >
          <section className="bus-modal bus-detail-modal" role="dialog" aria-modal="true" aria-labelledby="detail-title">
            <div className="modal-heading">
              <div>
                <span className="eyebrow">FLEET SPECIFICATION SHEET</span>
                <h2 id="detail-title">Bus Details: {activeBus.busNumber}</h2>
              </div>
              <button onClick={closeModal} aria-label="Close dialog">
                <X size={19} />
              </button>
            </div>

            <div className="bus-details-view">
              <div className="detail-banner">
                <div className="detail-banner-title">
                  <span className={`bus-type-badge ${getTypeClass(activeBus.busType)}`}>
                    {activeBus.busType} Bus
                  </span>
                  <h3>{activeBus.busNumber}</h3>
                  <span>Registration: {activeBus.registrationNumber}</span>
                </div>
                <div>
                  <span className={`bus-status-badge ${getStatusClass(activeBus.status)}`}>
                    <i />
                    {activeBus.status}
                  </span>
                </div>
              </div>

              <div className="detail-grid">
                <div className="detail-card">
                  <span>Passenger Capacity</span>
                  <strong>{activeBus.capacity} Seated Passengers</strong>
                  <small>DTC Standard Seating</small>
                </div>

                <div className="detail-card">
                  <span>Assigned Depot</span>
                  <strong>{activeBus.depot || "Unassigned"}</strong>
                  <small>Maintenance &amp; Night Parking Base</small>
                </div>

                <div className="detail-card">
                  <span>Manufacturer &amp; Model</span>
                  <strong>{activeBus.manufacturer || "Not specified"}</strong>
                  <small>Model Year: {activeBus.modelYear || "N/A"}</small>
                </div>

                <div className="detail-card">
                  <span>Asset Identifier</span>
                  <strong style={{ fontSize: "10px", wordBreak: "break-all" }}>{activeBus.id}</strong>
                  <small>Database Primary Key UUID</small>
                </div>

                <div className="detail-card full-span">
                  <span>Assigned Route Information</span>
                  {activeBus.route ? (
                    <div>
                      <strong style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <MapPin size={14} color="#e7773b" />
                        Route {activeBus.route.routeNumber}: {activeBus.route.routeName}
                      </strong>
                      <small style={{ display: "block", marginTop: "3px" }}>
                        {activeBus.route.startPoint} ↔ {activeBus.route.endPoint}
                        {activeBus.route.totalDistanceKm ? ` (${activeBus.route.totalDistanceKm} km)` : ""}
                      </small>
                    </div>
                  ) : (
                    <strong style={{ color: "#8a98a1" }}>No route currently assigned to this vehicle</strong>
                  )}
                </div>

                <div className="detail-card full-span">
                  <span>Assigned Primary Driver</span>
                  {activeBus.driver ? (
                    <div>
                      <strong style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <UserCheck size={14} color="#10b981" />
                        {activeBus.driver.name} (Badge: {activeBus.driver.badgeNumber})
                      </strong>
                      <small style={{ display: "block", marginTop: "3px" }}>
                        Contact: {activeBus.driver.phone || "N/A"} · License: {activeBus.driver.licenseNumber || "N/A"}
                      </small>
                    </div>
                  ) : (
                    <strong style={{ color: "#8a98a1" }}>No driver currently assigned</strong>
                  )}
                </div>

                <div className="detail-card full-span" style={{ background: "#fafbfc" }}>
                  <span>Timestamps</span>
                  <small>
                    Created: {new Date(activeBus.createdAt || Date.now()).toLocaleString("en-IN")} ·
                    Last Updated: {new Date(activeBus.updatedAt || Date.now()).toLocaleString("en-IN")}
                  </small>
                </div>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="button button-outline"
                  onClick={() => {
                    closeModal();
                    handleOpenEdit(activeBus);
                  }}
                >
                  <Pencil size={13} /> Edit vehicle
                </button>
                <button type="button" className="button button-primary" onClick={closeModal}>
                  Close
                </button>
              </div>
            </div>
          </section>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setDeleteTarget(null);
          }}
        >
          <section className="bus-modal" role="dialog" aria-modal="true" style={{ width: "min(100%, 420px)" }}>
            <div className="modal-heading">
              <div>
                <span className="eyebrow" style={{ color: "#d76650" }}>DECOMMISSION / REMOVE</span>
                <h2>Delete Bus {deleteTarget.busNumber}?</h2>
              </div>
              <button onClick={() => setDeleteTarget(null)} aria-label="Close dialog">
                <X size={19} />
              </button>
            </div>
            <p style={{ fontSize: "11px", color: "#667a88", lineHeight: "1.6" }}>
              Are you sure you want to permanently delete vehicle <strong>{deleteTarget.busNumber}</strong> (Registration:{" "}
              <strong>{deleteTarget.registrationNumber}</strong>) from the DTC fleet database? This action cannot be undone.
            </p>
            <div className="modal-actions" style={{ marginTop: "20px" }}>
              <button type="button" className="button button-quiet" onClick={() => setDeleteTarget(null)}>
                Cancel
              </button>
              <button
                type="button"
                className="button"
                style={{ background: "#c53030", color: "#fff" }}
                onClick={confirmDelete}
              >
                Confirm Delete
              </button>
            </div>
          </section>
        </div>
      )}
    </section>
  );
}
