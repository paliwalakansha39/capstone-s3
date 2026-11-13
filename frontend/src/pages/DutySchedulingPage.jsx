import {
  AlertCircle,
  ArrowRight,
  BusFront,
  Calendar,
  CalendarCheck,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Cpu,
  Eye,
  Filter,
  Link2,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  ShieldAlert,
  Sparkles,
  Trash2,
  UserCheck,
  Users,
  X
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import StatCard from "../components/StatCard";
import { getBuses } from "../services/busService";
import { getCrew } from "../services/crewService";
import {
  createDuty,
  deleteDuty,
  generateLinkedDuties,
  getDuties,
  getDutyStats,
  updateDuty
} from "../services/dutyService";

const DEPOT_OPTIONS = [
  "BBM Depot",
  "Sarojini Nagar Depot",
  "Sukhdev Vihar Depot",
  "Rohini Depot-I",
  "Mayapuri Depot",
  "Kushak Nallah Depot",
  "Anand Vihar Depot"
];

const SHIFT_TYPES = ["Morning", "Evening", "Full-Day", "Night"];

function calculateDurationHours(start, end) {
  if (!start || !end) return 0;
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  let sMin = sh * 60 + sm;
  let eMin = eh * 60 + em;
  if (eMin <= sMin) eMin += 24 * 60;
  return Number(((eMin - sMin) / 60).toFixed(2));
}

function getShiftBadgeClass(shiftType) {
  switch (shiftType) {
    case "Morning":
      return "badge-morning";
    case "Evening":
      return "badge-evening";
    case "Full-Day":
      return "badge-fullday";
    case "Night":
      return "badge-night";
    default:
      return "";
  }
}

function getStatusBadgeClass(status) {
  switch (status) {
    case "Scheduled":
      return "status-scheduled";
    case "Active":
      return "status-active";
    case "Completed":
      return "status-completed";
    case "Cancelled":
      return "status-cancelled";
    default:
      return "";
  }
}

export default function DutySchedulingPage() {
  const [duties, setDuties] = useState([]);
  const [stats, setStats] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });

  // Auxiliary data
  const [buses, setBuses] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [conductors, setConductors] = useState([]);

  // Filters
  const [search, setSearch] = useState("");
  const [shiftTypeFilter, setShiftTypeFilter] = useState("all");
  const [depotFilter, setDepotFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  // Loading & alerts
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  // Modals
  const [modalMode, setModalMode] = useState(null); // 'generate' | 'create' | 'edit' | 'view' | 'delete' | null
  const [selectedDuty, setSelectedDuty] = useState(null);
  const [modalError, setModalError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Generate modal state
  const [generateForm, setGenerateForm] = useState({
    shiftDate: new Date().toISOString().slice(0, 10),
    depot: ""
  });
  const [generateResult, setGenerateResult] = useState(null);

  // Manual Duty Form
  const [form, setForm] = useState({
    dutyNumber: "",
    shiftType: "Morning",
    shiftDate: new Date().toISOString().slice(0, 10),
    startTime: "06:00",
    endTime: "14:00",
    depot: "BBM Depot",
    busId: "",
    driverId: "",
    conductorId: "",
    notes: ""
  });

  // Load auxiliary bus and crew lists
  useEffect(() => {
    let mounted = true;
    async function loadAux() {
      try {
        const [busRes, driverRes, condRes] = await Promise.all([
          getBuses(),
          getCrew({ role: "Driver" }),
          getCrew({ role: "Conductor" })
        ]);
        if (mounted) {
          setBuses(busRes?.data || []);
          setDrivers(driverRes?.data || []);
          setConductors(condRes?.data || []);
        }
      } catch (err) {
        console.warn("Could not load helper select lists:", err.message);
      }
    }
    loadAux();
    return () => {
      mounted = false;
    };
  }, []);

  // Fetch duties and stats
  const loadDuties = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const [dutyData, statsData] = await Promise.all([
        getDuties({
          page: currentPage,
          limit: 10,
          search,
          shiftType: shiftTypeFilter,
          depot: depotFilter,
          status: statusFilter,
          shiftDate: dateFilter
        }),
        getDutyStats()
      ]);

      setDuties(dutyData?.data || []);
      setPagination(dutyData?.pagination || { page: 1, totalPages: 1, total: 0 });
      setStats(statsData || null);
    } catch (err) {
      setError(err.response?.data?.error || err.message || "Could not fetch duties.");
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, search, shiftTypeFilter, depotFilter, statusFilter, dateFilter]);

  useEffect(() => {
    loadDuties();
  }, [loadDuties]);

  // Real-time duration calculation for form
  const computedDuration = useMemo(() => {
    return calculateDurationHours(form.startTime, form.endTime);
  }, [form.startTime, form.endTime]);

  const isDurationValid = computedDuration > 0 && computedDuration <= 8.0;

  // Open Create Duty modal
  function openCreateModal() {
    const today = new Date().toISOString().slice(0, 10);
    const randomSuffix = Math.floor(100 + Math.random() * 900);
    const suggestedNumber = `DTC-LNK-${today.replace(/-/g, "")}-BBM-${randomSuffix}`;

    setForm({
      dutyNumber: suggestedNumber,
      shiftType: "Morning",
      shiftDate: today,
      startTime: "06:00",
      endTime: "14:00",
      depot: "BBM Depot",
      busId: buses[0]?.id || "",
      driverId: drivers[0]?.id || "",
      conductorId: conductors[0]?.id || "",
      notes: "Manual Linked Duty assignment."
    });
    setModalError("");
    setModalMode("create");
  }

  // Open Edit Duty modal
  function openEditModal(duty) {
    setSelectedDuty(duty);
    setForm({
      dutyNumber: duty.dutyNumber,
      shiftType: duty.shiftType,
      shiftDate: duty.shiftDate,
      startTime: duty.startTime,
      endTime: duty.endTime,
      depot: duty.depot,
      status: duty.status,
      busId: duty.assignment?.busId || "",
      driverId: duty.assignment?.driverId || "",
      conductorId: duty.assignment?.conductorId || "",
      notes: duty.assignment?.notes || ""
    });
    setModalError("");
    setModalMode("edit");
  }

  // Handle Form Submit (Create / Edit)
  async function handleFormSubmit(e) {
    e.preventDefault();
    setModalError("");

    if (!isDurationValid) {
      setModalError("Maximum shift duration cannot exceed 8.0 hours as per DTC linked duty constraints.");
      return;
    }

    if (!form.busId || !form.driverId || !form.conductorId) {
      setModalError("Please select a Bus, a qualified Driver, and a Conductor for this linked shift.");
      return;
    }

    setIsSubmitting(true);
    try {
      if (modalMode === "create") {
        await createDuty(form);
        setNotice(`Linked Duty '${form.dutyNumber}' scheduled successfully.`);
      } else if (modalMode === "edit") {
        await updateDuty(selectedDuty.id, {
          status: form.status,
          shiftType: form.shiftType,
          startTime: form.startTime,
          endTime: form.endTime,
          notes: form.notes
        });
        setNotice(`Duty '${selectedDuty.dutyNumber}' updated successfully.`);
      }
      setModalMode(null);
      loadDuties();
    } catch (err) {
      setModalError(err.response?.data?.error || err.message || "Failed to save duty.");
    } finally {
      setIsSubmitting(false);
    }
  }

  // Handle Automated Scheduling Generation
  async function handleGenerateSubmit(e) {
    e.preventDefault();
    setModalError("");
    setGenerateResult(null);
    setIsSubmitting(true);
    try {
      const result = await generateLinkedDuties({
        shiftDate: generateForm.shiftDate,
        depot: generateForm.depot || undefined
      });
      setGenerateResult(result);
      setNotice(`Automated scheduling complete: ${result.dutiesCreated} linked duty shifts generated!`);
      loadDuties();
    } catch (err) {
      setModalError(err.response?.data?.error || err.message || "Failed to generate linked duties.");
    } finally {
      setIsSubmitting(false);
    }
  }

  // Handle Duty Deletion
  async function handleDeleteConfirm() {
    if (!selectedDuty) return;
    if (selectedDuty.status === "Active") {
      setModalError("Active duties cannot be deleted. Relieve or complete the shift before deleting.");
      return;
    }

    setIsSubmitting(true);
    try {
      await deleteDuty(selectedDuty.id);
      setNotice(`Duty '${selectedDuty.dutyNumber}' deleted successfully.`);
      setModalMode(null);
      setSelectedDuty(null);
      loadDuties();
    } catch (err) {
      setModalError(err.response?.data?.error || err.message || "Failed to delete duty.");
    } finally {
      setIsSubmitting(false);
    }
  }

  // Quick Status Update
  async function handleQuickStatusChange(dutyId, newStatus) {
    try {
      await updateDuty(dutyId, { status: newStatus });
      setNotice(`Duty status updated to ${newStatus}.`);
      loadDuties();
      if (selectedDuty && selectedDuty.id === dutyId) {
        setSelectedDuty((prev) => ({ ...prev, status: newStatus }));
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message || "Could not update status.");
    }
  }

  return (
    <div className="duty-scheduling-page">
      {/* Header section */}
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px" }}>
        <div>
          <span className="eyebrow" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <Link2 size={13} style={{ color: "var(--orange)" }} /> DTC LINKED SCHEDULING SYSTEM (PHASE 2)
          </span>
          <h1 style={{ margin: "4px 0 6px", fontSize: "26px", fontWeight: "700" }}>Linked Duty Scheduling</h1>
          <p style={{ margin: 0, color: "#64748b", fontSize: "13px", maxWidth: "680px" }}>
            Permanent 1:1 Bus-to-Crew bindings with conflict-free interval scheduling. Max shift duration &le; 8.0 hours without mid-shift vehicle handover.
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px" }}>
          <button
            type="button"
            className="button button-secondary"
            onClick={() => {
              setGenerateResult(null);
              setModalError("");
              setModalMode("generate");
            }}
            style={{ display: "flex", alignItems: "center", gap: "6px" }}
          >
            <Sparkles size={16} style={{ color: "var(--orange)" }} /> Auto-Generate Shifts
          </button>

          <button
            type="button"
            className="button button-primary"
            onClick={openCreateModal}
            style={{ display: "flex", alignItems: "center", gap: "6px" }}
          >
            <Plus size={16} /> Schedule Linked Duty
          </button>
        </div>
      </div>

      {/* KPI Stat Cards */}
      <div className="stats-grid" style={{ marginBottom: "24px" }}>
        <StatCard
          icon={CalendarCheck}
          label="Total duties"
          value={stats ? stats.total : "..."}
          note="Total scheduled linked shifts"
        />
        <StatCard
          icon={Clock}
          label="Active shifts"
          value={stats ? stats.active : "..."}
          note="Currently on road"
          accent
        />
        <StatCard
          icon={BusFront}
          label="Bound buses"
          value={stats ? stats.assignedBuses : "..."}
          note="Vehicles with dedicated crew"
        />
        <StatCard
          icon={UserCheck}
          label="Linked crew pairs"
          value={stats ? stats.assignedDrivers : "..."}
          note="Driver + Conductor 1:1 pairs"
        />
      </div>

      {/* Notice & Error banners */}
      {notice && (
        <div className="form-alert" style={{ background: "#ecfdf5", color: "#065f46", borderColor: "#a7f3d0", marginBottom: "16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <CheckCircle2 size={16} /> {notice}
          </span>
          <button type="button" onClick={() => setNotice("")} style={{ background: "none", border: "none", cursor: "pointer", color: "#065f46" }}>
            <X size={15} />
          </button>
        </div>
      )}

      {error && (
        <div className="form-alert" style={{ marginBottom: "16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <AlertCircle size={16} /> {error}
          </span>
          <button type="button" onClick={() => setError("")} style={{ background: "none", border: "none", cursor: "pointer", color: "#b91c1c" }}>
            <X size={15} />
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <section className="content-card" style={{ padding: "16px", marginBottom: "20px" }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", alignItems: "center", justifyContent: "space-between" }}>
          {/* Search Box */}
          <div style={{ position: "relative", minWidth: "240px", flex: "1 1 240px" }}>
            <Search size={15} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
            <input
              type="text"
              placeholder="Search duty #, depot, bus, or crew..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              style={{ width: "100%", padding: "7px 10px 7px 32px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px" }}
            />
          </div>

          {/* Shift Date Filter */}
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <Calendar size={14} style={{ color: "#64748b" }} />
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => {
                setDateFilter(e.target.value);
                setCurrentPage(1);
              }}
              style={{ padding: "6px 8px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "12px" }}
            />
            {dateFilter && (
              <button
                type="button"
                onClick={() => setDateFilter("")}
                title="Clear date filter"
                style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8" }}
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Shift Type Filter */}
          <select
            value={shiftTypeFilter}
            onChange={(e) => {
              setShiftTypeFilter(e.target.value);
              setCurrentPage(1);
            }}
            style={{ padding: "7px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "12px" }}
          >
            <option value="all">All Shift Types</option>
            {SHIFT_TYPES.map((t) => (
              <option key={t} value={t}>{t} Shift</option>
            ))}
          </select>

          {/* Depot Filter */}
          <select
            value={depotFilter}
            onChange={(e) => {
              setDepotFilter(e.target.value);
              setCurrentPage(1);
            }}
            style={{ padding: "7px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "12px" }}
          >
            <option value="all">All Depots</option>
            {DEPOT_OPTIONS.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            style={{ padding: "7px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "12px" }}
          >
            <option value="all">All Statuses</option>
            <option value="Scheduled">Scheduled</option>
            <option value="Active">Active</option>
            <option value="Completed">Completed</option>
            <option value="Cancelled">Cancelled</option>
          </select>

          {/* Refresh Button */}
          <button
            type="button"
            className="button button-quiet"
            onClick={loadDuties}
            title="Refresh duties"
            style={{ display: "flex", alignItems: "center", gap: "6px", padding: "7px 12px" }}
          >
            <RefreshCw size={14} className={isLoading ? "spin-icon" : ""} /> Refresh
          </button>
        </div>
      </section>

      {/* Linked Duty Assignment Matrix Table */}
      <section className="content-card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #eef0f1", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h2 style={{ margin: 0, fontSize: "16px", fontWeight: "700" }}>Linked Duty Assignment Matrix</h2>
            <span style={{ fontSize: "12px", color: "#64748b" }}>
              Showing {duties.length} of {pagination.total || 0} duty shift records
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", color: "#64748b" }}>
            <span style={{ display: "inline-block", width: "8px", height: "8px", borderRadius: "50%", background: "#10b981" }} />
            <span>Permanent 1:1 Binding Enforced</span>
          </div>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px", textAlign: "left" }}>
            <thead>
              <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0", color: "#475569" }}>
                <th style={{ padding: "12px 16px", fontWeight: "600" }}>Duty Number</th>
                <th style={{ padding: "12px 16px", fontWeight: "600" }}>Shift Date &amp; Depot</th>
                <th style={{ padding: "12px 16px", fontWeight: "600" }}>Hours &amp; Duration</th>
                <th style={{ padding: "12px 16px", fontWeight: "600" }}>Linked Bus</th>
                <th style={{ padding: "12px 16px", fontWeight: "600" }}>Linked Crew Pair (Driver &amp; Conductor)</th>
                <th style={{ padding: "12px 16px", fontWeight: "600" }}>Status</th>
                <th style={{ padding: "12px 16px", fontWeight: "600", textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan="7" style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>
                    <RefreshCw size={22} className="spin-icon" style={{ margin: "auto", display: "block", marginBottom: "8px" }} />
                    Loading duty schedules...
                  </td>
                </tr>
              ) : duties.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ padding: "48px 20px", textAlign: "center", color: "#64748b" }}>
                    <CalendarCheck size={36} style={{ color: "#cbd5e1", margin: "auto", display: "block", marginBottom: "12px" }} />
                    <strong style={{ display: "block", fontSize: "15px", color: "#334155" }}>No Linked Duties Found</strong>
                    <p style={{ margin: "6px 0 16px", fontSize: "13px" }}>
                      No shifts match your filter criteria. Try clicking "Auto-Generate Shifts" to run the automated scheduler engine.
                    </p>
                    <button
                      type="button"
                      className="button button-secondary"
                      onClick={() => {
                        setGenerateResult(null);
                        setModalError("");
                        setModalMode("generate");
                      }}
                      style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
                    >
                      <Sparkles size={14} /> Run Automated Scheduling Engine
                    </button>
                  </td>
                </tr>
              ) : (
                duties.map((duty) => {
                  const assignment = duty.assignment;
                  const bus = assignment?.bus;
                  const driver = assignment?.driver;
                  const conductor = assignment?.conductor;

                  return (
                    <tr
                      key={duty.id}
                      style={{ borderBottom: "1px solid #f1f5f9" }}
                    >
                      {/* Duty Number & Shift Type */}
                      <td style={{ padding: "12px 16px" }}>
                        <div style={{ fontWeight: "600", color: "#0f172a" }}>{duty.dutyNumber}</div>
                        <span
                          style={{
                            display: "inline-block",
                            marginTop: "3px",
                            fontSize: "11px",
                            padding: "2px 6px",
                            borderRadius: "4px",
                            fontWeight: "500",
                            background:
                              duty.shiftType === "Morning"
                                ? "#e0f2fe"
                                : duty.shiftType === "Evening"
                                ? "#fef3c7"
                                : duty.shiftType === "Full-Day"
                                ? "#dcfce7"
                                : "#ede9fe",
                            color:
                              duty.shiftType === "Morning"
                                ? "#0369a1"
                                : duty.shiftType === "Evening"
                                ? "#b45309"
                                : duty.shiftType === "Full-Day"
                                ? "#15803d"
                                : "#6d28d9"
                          }}
                        >
                          {duty.shiftType} Shift
                        </span>
                      </td>

                      {/* Shift Date & Depot */}
                      <td style={{ padding: "12px 16px" }}>
                        <div style={{ fontWeight: "500", color: "#334155" }}>{duty.shiftDate}</div>
                        <div style={{ fontSize: "12px", color: "#64748b" }}>{duty.depot}</div>
                      </td>

                      {/* Hours & Duration */}
                      <td style={{ padding: "12px 16px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "5px", color: "#0f172a", fontWeight: "500" }}>
                          <Clock size={14} style={{ color: "var(--orange)" }} />
                          <span>{duty.startTime} – {duty.endTime}</span>
                        </div>
                        <span
                          style={{
                            display: "inline-block",
                            fontSize: "11px",
                            marginTop: "3px",
                            color: duty.totalDurationHours <= 8.0 ? "#15803d" : "#b91c1c",
                            fontWeight: "500"
                          }}
                        >
                          {duty.totalDurationHours} hrs (Max 8.0h &le; OK)
                        </span>
                      </td>

                      {/* Linked Bus */}
                      <td style={{ padding: "12px 16px" }}>
                        {bus ? (
                          <div>
                            <div style={{ display: "flex", alignItems: "center", gap: "6px", fontWeight: "600", color: "#1e293b" }}>
                              <BusFront size={14} style={{ color: "#0284c7" }} />
                              <span>{bus.busNumber}</span>
                            </div>
                            <span style={{ fontSize: "11px", color: "#64748b" }}>
                              {bus.registrationNumber} {bus.depot ? `(${bus.depot})` : ""}
                            </span>
                          </div>
                        ) : (
                          <span style={{ color: "#94a3b8", fontStyle: "italic" }}>No bus assigned</span>
                        )}
                      </td>

                      {/* Linked Crew Pair */}
                      <td style={{ padding: "12px 16px" }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            <span style={{ fontSize: "10px", padding: "1px 5px", borderRadius: "3px", background: "#f1f5f9", fontWeight: "600", color: "#475569" }}>
                              DRV
                            </span>
                            <span style={{ fontWeight: "500", color: "#1e293b" }}>
                              {driver?.name || "Unassigned"}
                            </span>
                            {driver?.badgeNumber && (
                              <span style={{ fontSize: "11px", color: "#64748b" }}>({driver.badgeNumber})</span>
                            )}
                          </div>

                          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            <span style={{ fontSize: "10px", padding: "1px 5px", borderRadius: "3px", background: "#fef3c7", fontWeight: "600", color: "#92400e" }}>
                              CND
                            </span>
                            <span style={{ fontWeight: "500", color: "#1e293b" }}>
                              {conductor?.name || "Unassigned"}
                            </span>
                            {conductor?.badgeNumber && (
                              <span style={{ fontSize: "11px", color: "#64748b" }}>({conductor.badgeNumber})</span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Status */}
                      <td style={{ padding: "12px 16px" }}>
                        <span
                          style={{
                            display: "inline-block",
                            padding: "3px 8px",
                            borderRadius: "12px",
                            fontSize: "11px",
                            fontWeight: "600",
                            background:
                              duty.status === "Scheduled"
                                ? "#e0f2fe"
                                : duty.status === "Active"
                                ? "#dcfce7"
                                : duty.status === "Completed"
                                ? "#f1f5f9"
                                : "#fee2e2",
                            color:
                              duty.status === "Scheduled"
                                ? "#0284c7"
                                : duty.status === "Active"
                                ? "#15803d"
                                : duty.status === "Completed"
                                ? "#475569"
                                : "#b91c1c"
                          }}
                        >
                          {duty.status}
                        </span>
                      </td>

                      {/* Action buttons */}
                      <td style={{ padding: "12px 16px", textAlign: "right" }}>
                        <div style={{ display: "flex", justifyContent: "flex-end", gap: "6px" }}>
                          <button
                            type="button"
                            className="button button-quiet"
                            onClick={() => {
                              setSelectedDuty(duty);
                              setModalMode("view");
                            }}
                            title="Inspect Linked Duty Details"
                            style={{ padding: "5px 8px" }}
                          >
                            <Eye size={15} />
                          </button>

                          <button
                            type="button"
                            className="button button-quiet"
                            onClick={() => openEditModal(duty)}
                            title="Edit Duty Status & Times"
                            style={{ padding: "5px 8px" }}
                          >
                            <Pencil size={15} />
                          </button>

                          <button
                            type="button"
                            className="button button-quiet"
                            onClick={() => {
                              setSelectedDuty(duty);
                              setModalError("");
                              setModalMode("delete");
                            }}
                            title="Delete Duty"
                            style={{ padding: "5px 8px", color: "#ef4444" }}
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {pagination.totalPages > 1 && (
          <div style={{ padding: "12px 20px", borderTop: "1px solid #eef0f1", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "12px", color: "#64748b" }}>
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <div style={{ display: "flex", gap: "6px" }}>
              <button
                type="button"
                className="button button-quiet"
                disabled={pagination.page <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                style={{ padding: "4px 8px" }}
              >
                <ChevronLeft size={15} /> Previous
              </button>
              <button
                type="button"
                className="button button-quiet"
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => setCurrentPage((p) => p + 1)}
                style={{ padding: "4px 8px" }}
              >
                Next <ChevronRight size={15} />
              </button>
            </div>
          </div>
        )}
      </section>

      {/* =========================================================================
          MODAL 1: Automated Scheduling Engine Generator
      ========================================================================= */}
      {modalMode === "generate" && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setModalMode(null);
          }}
        >
          <section className="user-modal" role="dialog" aria-modal="true" style={{ maxWidth: "560px" }}>
            <div className="modal-heading">
              <div>
                <span className="eyebrow" style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                  <Sparkles size={12} style={{ color: "var(--orange)" }} /> AUTOMATED DUTY SCHEDULING ALGORITHM (ASD)
                </span>
                <h2 style={{ margin: "2px 0 0" }}>Generate Linked Duties</h2>
              </div>
              <button onClick={() => setModalMode(null)} aria-label="Close">
                <X size={19} />
              </button>
            </div>

            <p style={{ fontSize: "13px", color: "#64748b", margin: "10px 0 16px", lineHeight: "1.6" }}>
              The scheduler engine scans all scheduled trips for the selected date, groups them by vehicle into contiguous &le; 8.0 hr shifts, and permanently binds dedicated Driver &amp; Conductor pairs with zero mid-shift vehicle handover.
            </p>

            <form onSubmit={handleGenerateSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <label style={{ fontSize: "12px", fontWeight: "600", color: "#334155" }}>
                  Target Shift Date *
                  <input
                    type="date"
                    value={generateForm.shiftDate}
                    onChange={(e) => setGenerateForm({ ...generateForm, shiftDate: e.target.value })}
                    required
                    style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #cbd5e1", marginTop: "4px" }}
                  />
                </label>

                <label style={{ fontSize: "12px", fontWeight: "600", color: "#334155" }}>
                  Depot (Optional)
                  <select
                    value={generateForm.depot}
                    onChange={(e) => setGenerateForm({ ...generateForm, depot: e.target.value })}
                    style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #cbd5e1", marginTop: "4px" }}
                  >
                    <option value="">All Depots</option>
                    {DEPOT_OPTIONS.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </label>
              </div>

              {/* Algorithm Constraint Highlights */}
              <div style={{ background: "#f8fafc", padding: "12px", borderRadius: "6px", border: "1px solid #e2e8f0", fontSize: "12px" }}>
                <strong style={{ color: "#1e293b", display: "block", marginBottom: "6px" }}>Enforced Constraints:</strong>
                <ul style={{ margin: 0, paddingLeft: "18px", color: "#475569", lineHeight: "1.6" }}>
                  <li><strong>Max Shift:</strong> Duty window clamped to &le; 8.0 hours.</li>
                  <li><strong>1:1 Linked Rule:</strong> 1 Driver + 1 Conductor permanently assigned to 1 Bus throughout all trips.</li>
                  <li><strong>Collision Guard:</strong> Double-booking collision detection across bus &amp; crew.</li>
                </ul>
              </div>

              {modalError && (
                <div className="form-alert" role="alert" style={{ margin: 0 }}>
                  <AlertCircle size={15} /> {modalError}
                </div>
              )}

              {generateResult && (
                <div style={{ background: "#ecfdf5", padding: "12px", borderRadius: "6px", border: "1px solid #a7f3d0", fontSize: "12px", color: "#065f46" }}>
                  <strong style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
                    <CheckCircle2 size={16} /> {generateResult.message}
                  </strong>
                  {generateResult.warnings?.length > 0 && (
                    <div style={{ marginTop: "6px", color: "#92400e" }}>
                      <em>Warnings:</em>
                      <ul style={{ margin: 0, paddingLeft: "16px" }}>
                        {generateResult.warnings.map((w, idx) => (
                          <li key={idx}>{w}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              <div className="modal-actions" style={{ marginTop: "10px" }}>
                <button type="button" className="button button-quiet" onClick={() => setModalMode(null)}>
                  Close
                </button>
                <button type="submit" className="button button-primary" disabled={isSubmitting}>
                  {isSubmitting ? "Running Algorithm..." : "Run Scheduling Engine"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {/* =========================================================================
          MODAL 2: Create or Edit Duty Modal
      ========================================================================= */}
      {(modalMode === "create" || modalMode === "edit") && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setModalMode(null);
          }}
        >
          <section className="user-modal" role="dialog" aria-modal="true" style={{ maxWidth: "600px" }}>
            <div className="modal-heading">
              <div>
                <span className="eyebrow">
                  {modalMode === "create" ? "NEW LINKED DUTY SCHEDULE" : "EDIT DUTY SCHEDULE"}
                </span>
                <h2 style={{ margin: "2px 0 0" }}>
                  {modalMode === "create" ? "Schedule Linked Shift" : `Edit Duty: ${form.dutyNumber}`}
                </h2>
              </div>
              <button onClick={() => setModalMode(null)} aria-label="Close">
                <X size={19} />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "14px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <label style={{ fontSize: "12px", fontWeight: "600", color: "#334155" }}>
                  Duty Number *
                  <input
                    value={form.dutyNumber}
                    disabled={modalMode === "edit"}
                    onChange={(e) => setForm({ ...form, dutyNumber: e.target.value })}
                    required
                    style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #cbd5e1", marginTop: "4px" }}
                  />
                </label>

                <label style={{ fontSize: "12px", fontWeight: "600", color: "#334155" }}>
                  Shift Type *
                  <select
                    value={form.shiftType}
                    onChange={(e) => setForm({ ...form, shiftType: e.target.value })}
                    style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #cbd5e1", marginTop: "4px" }}
                  >
                    {SHIFT_TYPES.map((t) => (
                      <option key={t} value={t}>{t} Shift</option>
                    ))}
                  </select>
                </label>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <label style={{ fontSize: "12px", fontWeight: "600", color: "#334155" }}>
                  Shift Date *
                  <input
                    type="date"
                    value={form.shiftDate}
                    disabled={modalMode === "edit"}
                    onChange={(e) => setForm({ ...form, shiftDate: e.target.value })}
                    required
                    style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #cbd5e1", marginTop: "4px" }}
                  />
                </label>

                <label style={{ fontSize: "12px", fontWeight: "600", color: "#334155" }}>
                  Depot *
                  <select
                    value={form.depot}
                    disabled={modalMode === "edit"}
                    onChange={(e) => setForm({ ...form, depot: e.target.value })}
                    style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #cbd5e1", marginTop: "4px" }}
                  >
                    {DEPOT_OPTIONS.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </label>
              </div>

              {/* Timing & Duration constraint check */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px", alignItems: "flex-end" }}>
                <label style={{ fontSize: "12px", fontWeight: "600", color: "#334155" }}>
                  Start Time *
                  <input
                    type="time"
                    value={form.startTime}
                    onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                    required
                    style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #cbd5e1", marginTop: "4px" }}
                  />
                </label>

                <label style={{ fontSize: "12px", fontWeight: "600", color: "#334155" }}>
                  End Time *
                  <input
                    type="time"
                    value={form.endTime}
                    onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                    required
                    style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #cbd5e1", marginTop: "4px" }}
                  />
                </label>

                <div
                  style={{
                    padding: "8px",
                    borderRadius: "6px",
                    border: `1px solid ${isDurationValid ? "#a7f3d0" : "#fca5a5"}`,
                    background: isDurationValid ? "#f0fdf4" : "#fef2f2",
                    fontSize: "12px",
                    textAlign: "center"
                  }}
                >
                  <span style={{ color: "#64748b", display: "block", fontSize: "10px" }}>TOTAL DURATION</span>
                  <strong style={{ color: isDurationValid ? "#15803d" : "#b91c1c", fontSize: "13px" }}>
                    {computedDuration} hrs
                  </strong>
                  <span style={{ display: "block", fontSize: "9px", color: isDurationValid ? "#15803d" : "#b91c1c" }}>
                    {isDurationValid ? "Compliant (<= 8.0h)" : "Exceeds 8.0h limit!"}
                  </span>
                </div>
              </div>

              {modalMode === "create" && (
                <>
                  <label style={{ fontSize: "12px", fontWeight: "600", color: "#334155" }}>
                    Assign Fleet Bus (1:1 Binding) *
                    <select
                      value={form.busId}
                      onChange={(e) => setForm({ ...form, busId: e.target.value })}
                      required
                      style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #cbd5e1", marginTop: "4px" }}
                    >
                      <option value="">-- Select Active Fleet Bus --</option>
                      {buses.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.busNumber} ({b.registrationNumber}) — {b.depot} [{b.status}]
                        </option>
                      ))}
                    </select>
                  </label>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                    <label style={{ fontSize: "12px", fontWeight: "600", color: "#334155" }}>
                      Assign Driver *
                      <select
                        value={form.driverId}
                        onChange={(e) => setForm({ ...form, driverId: e.target.value })}
                        required
                        style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #cbd5e1", marginTop: "4px" }}
                      >
                        <option value="">-- Select Qualified Driver --</option>
                        {drivers.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.name} ({d.badgeNumber}) [{d.status}]
                          </option>
                        ))}
                      </select>
                    </label>

                    <label style={{ fontSize: "12px", fontWeight: "600", color: "#334155" }}>
                      Assign Conductor *
                      <select
                        value={form.conductorId}
                        onChange={(e) => setForm({ ...form, conductorId: e.target.value })}
                        required
                        style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #cbd5e1", marginTop: "4px" }}
                      >
                        <option value="">-- Select Qualified Conductor --</option>
                        {conductors.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name} ({c.badgeNumber}) [{c.status}]
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                </>
              )}

              {modalMode === "edit" && (
                <label style={{ fontSize: "12px", fontWeight: "600", color: "#334155" }}>
                  Shift Status *
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                    style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #cbd5e1", marginTop: "4px" }}
                  >
                    <option value="Scheduled">Scheduled</option>
                    <option value="Active">Active (In Transit)</option>
                    <option value="Completed">Completed</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </label>
              )}

              <label style={{ fontSize: "12px", fontWeight: "600", color: "#334155" }}>
                Operational Notes
                <input
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="e.g. BBM depot morning peak route link"
                  style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #cbd5e1", marginTop: "4px" }}
                />
              </label>

              {modalError && (
                <div className="form-alert" role="alert" style={{ margin: 0 }}>
                  <AlertCircle size={15} /> {modalError}
                </div>
              )}

              <div className="modal-actions" style={{ marginTop: "10px" }}>
                <button type="button" className="button button-quiet" onClick={() => setModalMode(null)}>
                  Cancel
                </button>
                <button type="submit" className="button button-primary" disabled={isSubmitting || !isDurationValid}>
                  {isSubmitting ? "Saving..." : modalMode === "create" ? "Create Linked Duty" : "Save Changes"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {/* =========================================================================
          MODAL 3: View Inspector Modal
      ========================================================================= */}
      {modalMode === "view" && selectedDuty && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setModalMode(null);
          }}
        >
          <section className="user-modal" role="dialog" aria-modal="true" style={{ maxWidth: "560px" }}>
            <div className="modal-heading">
              <div>
                <span className="eyebrow">LINKED DUTY INSPECTOR</span>
                <h2 style={{ margin: "2px 0 0" }}>{selectedDuty.dutyNumber}</h2>
              </div>
              <button onClick={() => setModalMode(null)} aria-label="Close">
                <X size={19} />
              </button>
            </div>

            <div style={{ marginTop: "16px", display: "flex", flexDirection: "column", gap: "16px" }}>
              {/* Status and binding badge banner */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#f8fafc", padding: "12px", borderRadius: "6px" }}>
                <div>
                  <span style={{ fontSize: "11px", color: "#64748b", display: "block" }}>CURRENT SHIFT STATUS</span>
                  <strong style={{ fontSize: "14px", color: "#1e293b" }}>{selectedDuty.status}</strong>
                </div>

                <div style={{ textAlign: "right" }}>
                  <span style={{ fontSize: "11px", color: "#64748b", display: "block" }}>1:1 BINDING</span>
                  <span style={{ fontSize: "12px", fontWeight: "600", color: "#10b981", display: "flex", alignItems: "center", gap: "4px" }}>
                    <CheckCircle2 size={13} /> Verified No Mid-Shift Swap
                  </span>
                </div>
              </div>

              {/* Duty Overview Grid */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", fontSize: "13px" }}>
                <div style={{ background: "#fff", border: "1px solid #e2e8f0", padding: "10px", borderRadius: "6px" }}>
                  <span style={{ color: "#64748b", fontSize: "11px", display: "block" }}>DATE &amp; DEPOT</span>
                  <strong>{selectedDuty.shiftDate}</strong> &bull; {selectedDuty.depot}
                </div>

                <div style={{ background: "#fff", border: "1px solid #e2e8f0", padding: "10px", borderRadius: "6px" }}>
                  <span style={{ color: "#64748b", fontSize: "11px", display: "block" }}>TIMING &amp; DURATION</span>
                  <strong>{selectedDuty.startTime} – {selectedDuty.endTime}</strong> ({selectedDuty.totalDurationHours} hrs)
                </div>
              </div>

              {/* Linked Bus Info */}
              <div style={{ border: "1px solid #e2e8f0", padding: "12px", borderRadius: "6px" }}>
                <span style={{ fontSize: "11px", fontWeight: "700", color: "var(--orange)", display: "flex", alignItems: "center", gap: "5px", marginBottom: "6px" }}>
                  <BusFront size={14} /> PERMANENT VEHICLE ALLOCATION
                </span>
                {selectedDuty.assignment?.bus ? (
                  <div style={{ fontSize: "13px" }}>
                    <strong>{selectedDuty.assignment.bus.busNumber}</strong> ({selectedDuty.assignment.bus.registrationNumber})
                    <div style={{ color: "#64748b", fontSize: "12px" }}>
                      Type: {selectedDuty.assignment.bus.busType || "Standard AC"} &bull; Depot: {selectedDuty.assignment.bus.depot}
                    </div>
                  </div>
                ) : (
                  <span style={{ color: "#94a3b8" }}>No bus information available</span>
                )}
              </div>

              {/* Linked Crew Info */}
              <div style={{ border: "1px solid #e2e8f0", padding: "12px", borderRadius: "6px" }}>
                <span style={{ fontSize: "11px", fontWeight: "700", color: "#0369a1", display: "flex", alignItems: "center", gap: "5px", marginBottom: "8px" }}>
                  <UserCheck size={14} /> PERMANENT CREW ASSIGNMENT
                </span>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", fontSize: "13px" }}>
                  <div>
                    <span style={{ fontSize: "11px", color: "#64748b" }}>Assigned Driver:</span>
                    <div><strong>{selectedDuty.assignment?.driver?.name || "Unassigned"}</strong></div>
                    <div style={{ fontSize: "11px", color: "#64748b" }}>Badge: {selectedDuty.assignment?.driver?.badgeNumber || "—"}</div>
                  </div>

                  <div>
                    <span style={{ fontSize: "11px", color: "#64748b" }}>Assigned Conductor:</span>
                    <div><strong>{selectedDuty.assignment?.conductor?.name || "Unassigned"}</strong></div>
                    <div style={{ fontSize: "11px", color: "#64748b" }}>Badge: {selectedDuty.assignment?.conductor?.badgeNumber || "—"}</div>
                  </div>
                </div>
              </div>

              {/* Quick Status Action Buttons */}
              <div style={{ background: "#f8fafc", padding: "12px", borderRadius: "6px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: "12px", fontWeight: "600", color: "#334155" }}>Quick Status Change:</span>
                <div style={{ display: "flex", gap: "6px" }}>
                  {selectedDuty.status !== "Active" && (
                    <button
                      type="button"
                      className="button button-quiet"
                      onClick={() => handleQuickStatusChange(selectedDuty.id, "Active")}
                      style={{ fontSize: "11px", padding: "4px 8px", background: "#dcfce7", color: "#15803d" }}
                    >
                      Start Shift (Active)
                    </button>
                  )}
                  {selectedDuty.status !== "Completed" && (
                    <button
                      type="button"
                      className="button button-quiet"
                      onClick={() => handleQuickStatusChange(selectedDuty.id, "Completed")}
                      style={{ fontSize: "11px", padding: "4px 8px", background: "#f1f5f9", color: "#334155" }}
                    >
                      Complete Shift
                    </button>
                  )}
                  {selectedDuty.status !== "Cancelled" && (
                    <button
                      type="button"
                      className="button button-quiet"
                      onClick={() => handleQuickStatusChange(selectedDuty.id, "Cancelled")}
                      style={{ fontSize: "11px", padding: "4px 8px", background: "#fee2e2", color: "#b91c1c" }}
                    >
                      Cancel Duty
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="modal-actions" style={{ marginTop: "18px" }}>
              <button type="button" className="button button-quiet" onClick={() => setModalMode(null)}>
                Close
              </button>
            </div>
          </section>
        </div>
      )}

      {/* =========================================================================
          MODAL 4: Delete Confirmation Modal
      ========================================================================= */}
      {modalMode === "delete" && selectedDuty && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setModalMode(null);
          }}
        >
          <section className="user-modal" role="dialog" aria-modal="true" style={{ maxWidth: "440px" }}>
            <div className="modal-heading">
              <div>
                <span className="eyebrow" style={{ color: "#ef4444" }}>DELETE DUTY SCHEDULE</span>
                <h2 style={{ margin: "2px 0 0" }}>Confirm Deletion</h2>
              </div>
              <button onClick={() => setModalMode(null)} aria-label="Close">
                <X size={19} />
              </button>
            </div>

            <p style={{ fontSize: "13px", color: "#64748b", margin: "14px 0" }}>
              Are you sure you want to delete Linked Duty <strong>{selectedDuty.dutyNumber}</strong> on {selectedDuty.shiftDate}?
            </p>

            {selectedDuty.status === "Active" ? (
              <div style={{ background: "#fef2f2", padding: "10px", borderRadius: "6px", border: "1px solid #fecaca", color: "#b91c1c", fontSize: "12px", display: "flex", gap: "8px", alignItems: "center" }}>
                <ShieldAlert size={16} />
                <span>
                  <strong>Deletion Blocked:</strong> This shift is currently marked as <em>Active</em>. Complete or cancel it first.
                </span>
              </div>
            ) : null}

            {modalError && (
              <div className="form-alert" role="alert" style={{ margin: "10px 0 0" }}>
                <AlertCircle size={15} /> {modalError}
              </div>
            )}

            <div className="modal-actions" style={{ marginTop: "16px" }}>
              <button type="button" className="button button-quiet" onClick={() => setModalMode(null)}>
                Cancel
              </button>
              <button
                type="button"
                className="button"
                onClick={handleDeleteConfirm}
                disabled={isSubmitting || selectedDuty.status === "Active"}
                style={{ background: "#ef4444", color: "#fff" }}
              >
                {isSubmitting ? "Deleting..." : "Delete Duty"}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
