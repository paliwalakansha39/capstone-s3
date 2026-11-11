import {
  AlertCircle,
  Briefcase,
  CheckCircle2,
  Clock,
  Eye,
  Filter,
  IdCard,
  Pencil,
  Phone,
  Plus,
  RefreshCw,
  Search,
  ShieldAlert,
  Trash2,
  UserCheck,
  UserX,
  Users,
  X
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import StatCard from "../components/StatCard";
import {
  createCrew,
  deleteCrew,
  getCrew,
  getCrewStats,
  updateCrew
} from "../services/crewService";

const INITIAL_FORM = {
  crewId: "",
  name: "",
  role: "Driver",
  badgeNumber: "",
  licenseNumber: "",
  qualification: "HTV Heavy Vehicle + PSV Badge",
  experienceYears: 5,
  assignedDepot: "BBM Depot",
  status: "Available",
  phone: ""
};

const DEPOT_OPTIONS = [
  "BBM Depot",
  "Sarojini Nagar Depot",
  "Sukhdev Vihar Depot",
  "Rohini Depot-I",
  "Mayapuri Depot",
  "Kushak Nallah Depot",
  "Anand Vihar Depot"
];

export default function CrewManagementPage() {
  const [crewList, setCrewList] = useState([]);
  const [stats, setStats] = useState(null);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [depotFilter, setDepotFilter] = useState("all");

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [modalMode, setModalMode] = useState(null); // 'add' | 'edit' | 'view' | null
  const [activeCrew, setActiveCrew] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const [form, setForm] = useState(INITIAL_FORM);
  const [formErrors, setFormErrors] = useState({});
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  // Load crew and stats
  const loadCrewData = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const [crewRes, statsRes] = await Promise.all([
        getCrew({
          search,
          role: roleFilter,
          status: statusFilter,
          depot: depotFilter,
          limit: 100
        }),
        getCrewStats().catch(() => null)
      ]);

      if (crewRes?.data) {
        setCrewList(crewRes.data);
      }
      if (statsRes) {
        setStats(statsRes);
      }
    } catch (err) {
      setError(err.message || "Failed to load crew data.");
    } finally {
      setIsLoading(false);
    }
  }, [search, roleFilter, statusFilter, depotFilter]);

  useEffect(() => {
    loadCrewData();
  }, [loadCrewData]);

  // Handle modal opens
  function handleOpenAdd() {
    setActiveCrew(null);
    setForm(INITIAL_FORM);
    setFormErrors({});
    setError("");
    setModalMode("add");
  }

  function handleOpenEdit(crew) {
    setActiveCrew(crew);
    setForm({
      crewId: crew.crewId || "",
      name: crew.name || "",
      role: crew.role || "Driver",
      badgeNumber: crew.badgeNumber || "",
      licenseNumber: crew.licenseNumber || "",
      qualification: crew.qualification || "",
      experienceYears: crew.experienceYears ?? 1,
      assignedDepot: crew.assignedDepot || "BBM Depot",
      status: crew.status || "Available",
      phone: crew.phone || ""
    });
    setFormErrors({});
    setError("");
    setModalMode("edit");
  }

  function handleOpenView(crew) {
    setActiveCrew(crew);
    setModalMode("view");
  }

  function closeModal() {
    setModalMode(null);
    setActiveCrew(null);
    setFormErrors({});
  }

  // Quick status toggle
  async function handleQuickStatusChange(crew, newStatus) {
    try {
      await updateCrew(crew.id, { status: newStatus });
      setNotice(`Updated ${crew.name}'s status to ${newStatus}.`);
      await loadCrewData();
    } catch (err) {
      setError(err.message || "Failed to update status.");
    }
  }

  // Form submission
  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setNotice("");

    // Form validation
    const errors = {};
    if (!form.crewId.trim()) errors.crewId = "Crew ID is required.";
    if (!form.name.trim()) errors.name = "Full name is required.";
    if (!form.badgeNumber.trim()) errors.badgeNumber = "Badge number is required.";
    if (form.role === "Driver" && !form.licenseNumber.trim()) {
      errors.licenseNumber = "Commercial driving license is required for drivers.";
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        crewId: form.crewId.trim(),
        name: form.name.trim(),
        role: form.role,
        badgeNumber: form.badgeNumber.trim(),
        licenseNumber: form.licenseNumber ? form.licenseNumber.trim() : null,
        qualification: form.qualification ? form.qualification.trim() : null,
        experienceYears: Number(form.experienceYears) || 0,
        assignedDepot: form.assignedDepot.trim(),
        status: form.status,
        phone: form.phone ? form.phone.trim() : null
      };

      if (modalMode === "add") {
        await createCrew(payload);
        setNotice(`Crew member ${payload.name} (${payload.badgeNumber}) added successfully.`);
      } else if (modalMode === "edit") {
        await updateCrew(activeCrew.id, payload);
        setNotice(`Crew details for ${payload.name} updated successfully.`);
      }

      closeModal();
      await loadCrewData();
    } catch (err) {
      setError(err.message || "Failed to save crew member details.");
    } finally {
      setIsSubmitting(false);
    }
  }

  // Delete handling
  async function confirmDelete() {
    if (!deleteTarget) return;
    setError("");
    setNotice("");
    setIsSubmitting(true);
    try {
      await deleteCrew(deleteTarget.id);
      setNotice(`Crew member ${deleteTarget.name} removed successfully.`);
      setDeleteTarget(null);
      await loadCrewData();
    } catch (err) {
      setError(err.message || "Failed to delete crew member.");
      setDeleteTarget(null);
    } finally {
      setIsSubmitting(false);
    }
  }

  // Computed display stats
  const displayStats = useMemo(() => {
    const total = crewList.length;
    const availableDrivers = crewList.filter((c) => c.role === "Driver" && c.status === "Available").length;
    const availableConductors = crewList.filter((c) => c.role === "Conductor" && c.status === "Available").length;
    const onDuty = crewList.filter((c) => c.status === "On Duty").length;
    const onRest = crewList.filter((c) => c.status === "On Rest" || c.status === "On Leave").length;

    return {
      total: stats?.totalCrew ?? total,
      availableDrivers: stats?.availableDrivers ?? availableDrivers,
      availableConductors: stats?.availableConductors ?? availableConductors,
      onDuty: stats?.totalOnDuty ?? onDuty,
      onRest: (stats?.totalOnRest ?? 0) + (stats?.totalOnLeave ?? 0) || onRest,
      availabilityRate: stats?.availabilityRate ?? (total > 0 ? Math.round(((availableDrivers + availableConductors) / total) * 100) : 0)
    };
  }, [crewList, stats]);

  return (
    <section className="bus-page">
      {/* Page Heading Banner */}
      <div className="bus-heading">
        <div>
          <span className="eyebrow">CREW &amp; ROSTER MANAGEMENT</span>
          <h1>Crew Management</h1>
          <p>Manage drivers, conductors, certifications, and live duty availability across Delhi Transport Corporation.</p>
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <button className="button button-outline" onClick={loadCrewData} title="Refresh roster">
            <RefreshCw size={14} className={isLoading ? "spinner" : ""} /> Refresh
          </button>
          <button className="button button-primary" onClick={handleOpenAdd}>
            <Plus size={16} /> Add crew member
          </button>
        </div>
      </div>

      {/* Real-time KPI Stats Grid */}
      <div className="stats-grid">
        <StatCard
          icon={Users}
          label="Total Crew Members"
          value={displayStats.total}
          note="Drivers &amp; Conductors"
        />
        <StatCard
          icon={UserCheck}
          label="Available Drivers"
          value={displayStats.availableDrivers}
          note="Ready for trip dispatch"
          accent
        />
        <StatCard
          icon={IdCard}
          label="Available Conductors"
          value={displayStats.availableConductors}
          note="Ready for duty roster"
        />
        <StatCard
          icon={Briefcase}
          label="Currently On Duty"
          value={displayStats.onDuty}
          note="Active bus operations"
        />
      </div>

      {/* Alerts */}
      {error && (
        <div role="alert" className="form-alert" style={{ marginBottom: "16px" }}>
          <AlertCircle size={16} />
          <span>{error}</span>
          <button onClick={() => setError("")} style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer" }}>
            <X size={14} />
          </button>
        </div>
      )}

      {notice && (
        <div role="status" className="form-success" style={{ marginBottom: "16px" }}>
          <CheckCircle2 size={16} />
          <span>{notice}</span>
          <button onClick={() => setNotice("")} style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer" }}>
            <X size={14} />
          </button>
        </div>
      )}

      {/* Main Roster Card */}
      <div className="content-card users-card">
        {/* Filters and Search Toolbar */}
        <div className="users-toolbar" style={{ flexWrap: "wrap", gap: "12px" }}>
          <div className="table-title">
            <div className="table-icon">
              <UserCheck size={18} />
            </div>
            <div>
              <h2>Crew Roster</h2>
              <span>{crewList.length} registered personnel</span>
            </div>
          </div>

          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center", marginLeft: "auto" }}>
            {/* Search */}
            <label className="search-field" style={{ minWidth: "220px" }}>
              <Search size={16} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name, badge, crew ID..."
              />
            </label>

            {/* Role Filter */}
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="filter-select"
              style={{
                padding: "8px 12px",
                borderRadius: "6px",
                border: "1px solid var(--border-color, #e2e8f0)",
                background: "var(--card-bg, #ffffff)",
                fontSize: "13px"
              }}
            >
              <option value="all">All Roles</option>
              <option value="Driver">Drivers</option>
              <option value="Conductor">Conductors</option>
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="filter-select"
              style={{
                padding: "8px 12px",
                borderRadius: "6px",
                border: "1px solid var(--border-color, #e2e8f0)",
                background: "var(--card-bg, #ffffff)",
                fontSize: "13px"
              }}
            >
              <option value="all">All Statuses</option>
              <option value="Available">Available</option>
              <option value="On Duty">On Duty</option>
              <option value="On Rest">On Rest</option>
              <option value="On Leave">On Leave</option>
            </select>

            {/* Depot Filter */}
            <select
              value={depotFilter}
              onChange={(e) => setDepotFilter(e.target.value)}
              className="filter-select"
              style={{
                padding: "8px 12px",
                borderRadius: "6px",
                border: "1px solid var(--border-color, #e2e8f0)",
                background: "var(--card-bg, #ffffff)",
                fontSize: "13px"
              }}
            >
              <option value="all">All Depots</option>
              {DEPOT_OPTIONS.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Table View */}
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>CREW MEMBER</th>
                <th>ROLE</th>
                <th>BADGE &amp; LICENSE</th>
                <th>QUALIFICATIONS</th>
                <th>DEPOT &amp; EXP</th>
                <th>AVAILABILITY</th>
                <th style={{ textAlign: "right" }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {crewList.map((crew) => (
                <tr key={crew.id}>
                  {/* Crew name & ID */}
                  <td>
                    <div className="table-user">
                      <span
                        className="table-avatar"
                        style={{
                          backgroundColor: crew.role === "Driver" ? "#0284c7" : "#0d9488",
                          color: "#ffffff"
                        }}
                      >
                        {crew.name.slice(0, 1).toUpperCase()}
                      </span>
                      <div>
                        <strong>{crew.name}</strong>
                        <div style={{ fontSize: "11px", color: "#64748b" }}>{crew.crewId}</div>
                      </div>
                    </div>
                  </td>

                  {/* Role badge */}
                  <td>
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px",
                        padding: "3px 8px",
                        borderRadius: "12px",
                        fontSize: "12px",
                        fontWeight: 600,
                        backgroundColor: crew.role === "Driver" ? "rgba(2, 132, 199, 0.1)" : "rgba(13, 148, 136, 0.1)",
                        color: crew.role === "Driver" ? "#0284c7" : "#0d9488"
                      }}
                    >
                      {crew.role === "Driver" ? "Driver" : "Conductor"}
                    </span>
                  </td>

                  {/* Badge & license */}
                  <td>
                    <div style={{ fontWeight: 600 }}>{crew.badgeNumber}</div>
                    <div style={{ fontSize: "11px", color: "#64748b" }}>
                      {crew.licenseNumber || "N/A"}
                    </div>
                  </td>

                  {/* Qualifications */}
                  <td>
                    <span style={{ fontSize: "12px", color: "#334155" }}>
                      {crew.qualification || "Standard Transit Certified"}
                    </span>
                  </td>

                  {/* Depot & experience */}
                  <td>
                    <div style={{ fontSize: "13px" }}>{crew.assignedDepot}</div>
                    <div style={{ fontSize: "11px", color: "#64748b" }}>
                      {crew.experienceYears} {crew.experienceYears === 1 ? "yr" : "yrs"} experience
                    </div>
                  </td>

                  {/* Availability status */}
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "5px",
                          padding: "3px 10px",
                          borderRadius: "12px",
                          fontSize: "12px",
                          fontWeight: 600,
                          backgroundColor:
                            crew.status === "Available"
                              ? "rgba(34, 197, 94, 0.12)"
                              : crew.status === "On Duty"
                              ? "rgba(59, 130, 246, 0.12)"
                              : crew.status === "On Rest"
                              ? "rgba(245, 158, 11, 0.12)"
                              : "rgba(148, 163, 184, 0.2)",
                          color:
                            crew.status === "Available"
                              ? "#16a34a"
                              : crew.status === "On Duty"
                              ? "#2563eb"
                              : crew.status === "On Rest"
                              ? "#d97706"
                              : "#64748b"
                        }}
                      >
                        <span
                          style={{
                            width: "6px",
                            height: "6px",
                            borderRadius: "50%",
                            backgroundColor:
                              crew.status === "Available"
                                ? "#16a34a"
                                : crew.status === "On Duty"
                                ? "#2563eb"
                                : crew.status === "On Rest"
                                ? "#d97706"
                                : "#64748b"
                          }}
                        />
                        {crew.status}
                      </span>
                    </div>
                  </td>

                  {/* Actions */}
                  <td>
                    <div className="row-actions" style={{ justifyContent: "flex-end" }}>
                      <button
                        title="View details"
                        onClick={() => handleOpenView(crew)}
                        style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b" }}
                      >
                        <Eye size={15} />
                      </button>
                      <button
                        title="Edit crew member"
                        onClick={() => handleOpenEdit(crew)}
                        style={{ background: "none", border: "none", cursor: "pointer", color: "#0284c7" }}
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        title="Remove crew member"
                        onClick={() => setDeleteTarget(crew)}
                        style={{ background: "none", border: "none", cursor: "pointer", color: "#ef4444" }}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {!crewList.length && !isLoading && (
                <tr>
                  <td colSpan="7" className="table-empty">
                    No crew members match the selected search or filter criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Modal */}
      {(modalMode === "add" || modalMode === "edit") && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeModal();
          }}
        >
          <section className="user-modal" role="dialog" aria-modal="true" style={{ maxWidth: "620px" }}>
            <div className="modal-heading">
              <div>
                <span className="eyebrow">CREW ROSTER</span>
                <h2>{modalMode === "add" ? "Add Crew Member" : `Edit ${activeCrew?.name}`}</h2>
              </div>
              <button onClick={closeModal} aria-label="Close">
                <X size={19} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="user-form">
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <label>
                  Crew ID *
                  <input
                    value={form.crewId}
                    onChange={(e) => setForm({ ...form, crewId: e.target.value })}
                    placeholder="e.g. DTC-CRW-107"
                    required
                  />
                  {formErrors.crewId && <span style={{ color: "#ef4444", fontSize: "11px" }}>{formErrors.crewId}</span>}
                </label>

                <label>
                  Role *
                  <select
                    value={form.role}
                    onChange={(e) => {
                      const newRole = e.target.value;
                      setForm({
                        ...form,
                        role: newRole,
                        qualification:
                          newRole === "Driver"
                            ? "HTV Heavy Vehicle + PSV Badge"
                            : "Commercial Conductor License + E-Ticketing"
                      });
                    }}
                    style={{ padding: "8px", borderRadius: "6px", border: "1px solid #cbd5e1" }}
                  >
                    <option value="Driver">Driver</option>
                    <option value="Conductor">Conductor</option>
                  </select>
                </label>
              </div>

              <label>
                Full Name *
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Ramesh Kumar"
                  required
                />
                {formErrors.name && <span style={{ color: "#ef4444", fontSize: "11px" }}>{formErrors.name}</span>}
              </label>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <label>
                  Badge Number *
                  <input
                    value={form.badgeNumber}
                    onChange={(e) => setForm({ ...form, badgeNumber: e.target.value })}
                    placeholder="e.g. DTC-D-4512"
                    required
                  />
                  {formErrors.badgeNumber && <span style={{ color: "#ef4444", fontSize: "11px" }}>{formErrors.badgeNumber}</span>}
                </label>

                <label>
                  {form.role === "Driver" ? "Commercial Driving License *" : "Conductor License / ID"}
                  <input
                    value={form.licenseNumber}
                    onChange={(e) => setForm({ ...form, licenseNumber: e.target.value })}
                    placeholder={form.role === "Driver" ? "e.g. DL042018001928" : "e.g. COND-DL-2020-1122"}
                    required={form.role === "Driver"}
                  />
                  {formErrors.licenseNumber && <span style={{ color: "#ef4444", fontSize: "11px" }}>{formErrors.licenseNumber}</span>}
                </label>
              </div>

              <label>
                Qualification &amp; Certifications
                <input
                  value={form.qualification}
                  onChange={(e) => setForm({ ...form, qualification: e.target.value })}
                  placeholder="e.g. Heavy Transport Vehicle (HTV) + First Aid Certified"
                />
              </label>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <label>
                  Assigned Depot *
                  <select
                    value={form.assignedDepot}
                    onChange={(e) => setForm({ ...form, assignedDepot: e.target.value })}
                    style={{ padding: "8px", borderRadius: "6px", border: "1px solid #cbd5e1" }}
                  >
                    {DEPOT_OPTIONS.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </label>

                <label>
                  Experience (Years)
                  <input
                    type="number"
                    min="0"
                    max="50"
                    value={form.experienceYears}
                    onChange={(e) => setForm({ ...form, experienceYears: e.target.value })}
                  />
                </label>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <label>
                  Duty Availability Status *
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                    style={{ padding: "8px", borderRadius: "6px", border: "1px solid #cbd5e1" }}
                  >
                    <option value="Available">Available (Ready for Duty)</option>
                    <option value="On Duty">On Duty (In Transit)</option>
                    <option value="On Rest">On Rest (Mandatory Break)</option>
                    <option value="On Leave">On Leave</option>
                  </select>
                </label>

                <label>
                  Contact Phone
                  <input
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="e.g. +91 98112 34567"
                  />
                </label>
              </div>

              {error && <div role="alert" className="form-alert">{error}</div>}

              <div className="modal-actions">
                <button type="button" className="button button-quiet" onClick={closeModal}>
                  Cancel
                </button>
                <button type="submit" className="button button-primary" disabled={isSubmitting}>
                  {isSubmitting ? "Saving..." : modalMode === "add" ? "Add Crew Member" : "Save Changes"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {/* View Details Inspector Modal */}
      {modalMode === "view" && activeCrew && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeModal();
          }}
        >
          <section className="user-modal" role="dialog" aria-modal="true" style={{ maxWidth: "540px" }}>
            <div className="modal-heading">
              <div>
                <span className="eyebrow">CREW PROFILE DETAILS</span>
                <h2>{activeCrew.name}</h2>
              </div>
              <button onClick={closeModal} aria-label="Close">
                <X size={19} />
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "16px", padding: "8px 0" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div
                  style={{
                    width: "48px",
                    height: "48px",
                    borderRadius: "50%",
                    backgroundColor: activeCrew.role === "Driver" ? "#0284c7" : "#0d9488",
                    color: "#fff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 700,
                    fontSize: "20px"
                  }}
                >
                  {activeCrew.name.slice(0, 1).toUpperCase()}
                </div>
                <div>
                  <div style={{ fontSize: "18px", fontWeight: 700 }}>{activeCrew.name}</div>
                  <div style={{ color: "#64748b", fontSize: "13px" }}>
                    {activeCrew.crewId} · {activeCrew.role}
                  </div>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", borderTop: "1px solid #f1f5f9", paddingTop: "12px" }}>
                <div>
                  <span style={{ fontSize: "11px", color: "#64748b", textTransform: "uppercase" }}>Badge Number</span>
                  <div style={{ fontWeight: 600 }}>{activeCrew.badgeNumber}</div>
                </div>
                <div>
                  <span style={{ fontSize: "11px", color: "#64748b", textTransform: "uppercase" }}>License Number</span>
                  <div style={{ fontWeight: 600 }}>{activeCrew.licenseNumber || "N/A"}</div>
                </div>
                <div>
                  <span style={{ fontSize: "11px", color: "#64748b", textTransform: "uppercase" }}>Assigned Depot</span>
                  <div style={{ fontWeight: 600 }}>{activeCrew.assignedDepot}</div>
                </div>
                <div>
                  <span style={{ fontSize: "11px", color: "#64748b", textTransform: "uppercase" }}>Experience</span>
                  <div style={{ fontWeight: 600 }}>{activeCrew.experienceYears} Years</div>
                </div>
                <div>
                  <span style={{ fontSize: "11px", color: "#64748b", textTransform: "uppercase" }}>Contact Phone</span>
                  <div style={{ fontWeight: 600 }}>{activeCrew.phone || "Not recorded"}</div>
                </div>
                <div>
                  <span style={{ fontSize: "11px", color: "#64748b", textTransform: "uppercase" }}>Live Duty Status</span>
                  <div style={{ fontWeight: 600, color: activeCrew.status === "Available" ? "#16a34a" : activeCrew.status === "On Duty" ? "#2563eb" : "#d97706" }}>
                    {activeCrew.status}
                  </div>
                </div>
              </div>

              <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: "12px" }}>
                <span style={{ fontSize: "11px", color: "#64748b", textTransform: "uppercase" }}>Certifications &amp; Qualifications</span>
                <div style={{ marginTop: "4px", padding: "10px", backgroundColor: "#f8fafc", borderRadius: "6px", fontSize: "13px" }}>
                  {activeCrew.qualification || "Standard Passenger Transport Certified"}
                </div>
              </div>

              {/* Quick status switcher */}
              <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: "12px" }}>
                <span style={{ fontSize: "11px", color: "#64748b", textTransform: "uppercase", display: "block", marginBottom: "8px" }}>
                  Quick Change Status
                </span>
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  {["Available", "On Duty", "On Rest", "On Leave"].map((st) => (
                    <button
                      key={st}
                      type="button"
                      disabled={activeCrew.status === st}
                      onClick={() => {
                        handleQuickStatusChange(activeCrew, st);
                        closeModal();
                      }}
                      className="button button-outline"
                      style={{
                        padding: "4px 10px",
                        fontSize: "12px",
                        opacity: activeCrew.status === st ? 0.5 : 1
                      }}
                    >
                      Set to {st}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="modal-actions">
              <button
                type="button"
                className="button button-primary"
                onClick={() => {
                  const target = activeCrew;
                  closeModal();
                  handleOpenEdit(target);
                }}
              >
                <Pencil size={14} /> Edit Profile
              </button>
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
          <section className="user-modal" role="dialog" aria-modal="true" style={{ maxWidth: "440px" }}>
            <div className="modal-heading">
              <div>
                <span className="eyebrow">CONFIRM DELETION</span>
                <h2>Remove Crew Member</h2>
              </div>
              <button onClick={() => setDeleteTarget(null)} aria-label="Close">
                <X size={19} />
              </button>
            </div>

            <p style={{ margin: "12px 0 16px 0", color: "#475569" }}>
              Are you sure you want to remove <strong>{deleteTarget.name}</strong> ({deleteTarget.badgeNumber}) from the roster? This action cannot be undone.
            </p>

            {deleteTarget.status === "On Duty" && (
              <div role="alert" className="form-alert" style={{ marginBottom: "16px" }}>
                <ShieldAlert size={16} />
                <span>Notice: This crew member is currently &apos;On Duty&apos;. Reassign their trip or set status to &apos;Available&apos; first.</span>
              </div>
            )}

            <div className="modal-actions">
              <button type="button" className="button button-quiet" onClick={() => setDeleteTarget(null)}>
                Cancel
              </button>
              <button
                type="button"
                className="button"
                style={{ backgroundColor: "#ef4444", color: "#fff" }}
                disabled={isSubmitting || deleteTarget.status === "On Duty"}
                onClick={confirmDelete}
              >
                {isSubmitting ? "Deleting..." : "Delete Member"}
              </button>
            </div>
          </section>
        </div>
      )}
    </section>
  );
}
