import React, { useState, useEffect, useCallback } from "react";
import {
  BarChart3,
  Layers,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Bus,
  Users,
  Calendar,
  Clock,
  Sparkles
} from "lucide-react";
import {
  getFullSystemAnalytics,
  getSystemValidation,
  downloadReport
} from "../services/analyticsService";
import AnalyticsToolbar from "../components/analytics/AnalyticsToolbar";
import AnalyticsKpiCards from "../components/analytics/AnalyticsKpiCards";
import FleetCrewCharts from "../components/analytics/FleetCrewCharts";
import TripOverlapCharts from "../components/analytics/TripOverlapCharts";

/**
 * Chunk 9: Operational Analytics, Reports & Final Integration Dashboard.
 * Subject: ISD (Information Systems Design)
 */
export default function AnalyticsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({ depot: "ALL", startDate: "", endDate: "" });
  const [exporting, setExporting] = useState(false);
  const [activeTab, setActiveTab] = useState("fleet");

  // Validation modal state
  const [validating, setValidating] = useState(false);
  const [validationResult, setValidationResult] = useState(null);
  const [showValidationModal, setShowValidationModal] = useState(false);

  const fetchAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getFullSystemAnalytics(filters);
      setData(res);
    } catch (err) {
      console.error("Failed to load analytics:", err);
      setError("Unable to load operational analytics. Please verify your connection.");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  function handleFilterChange(key, value) {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }

  async function handleExport({ type, format }) {
    try {
      setExporting(true);
      await downloadReport({ type, format, ...filters });
    } catch (err) {
      console.error("Export failed:", err);
      alert("Failed to export report. Please try again.");
    } finally {
      setExporting(false);
    }
  }

  async function handleRunValidation() {
    try {
      setValidating(true);
      const res = await getSystemValidation();
      setValidationResult(res);
      setShowValidationModal(true);
    } catch (err) {
      console.error("Validation failed:", err);
      alert("Failed to run system validation.");
    } finally {
      setValidating(false);
    }
  }

  return (
    <div className="analytics-dashboard-page">
      {/* Header */}
      <header className="analytics-page-header">
        <div>
          <h1 className="analytics-page-title">Operational Analytics & Reports</h1>
          <p className="analytics-page-subtitle">
            System-wide fleet utilization, crew deployment, trip performance, and network overlap diagnostics
          </p>
        </div>
        <div className="analytics-status-tag">
          <span className="status-dot-live" />
          <span>Real-time Operational Telemetry</span>
        </div>
      </header>

      {/* Toolbar */}
      <AnalyticsToolbar
        filters={filters}
        onFilterChange={handleFilterChange}
        onRefresh={fetchAnalytics}
        onExport={handleExport}
        onRunValidation={handleRunValidation}
        exporting={exporting}
        validating={validating}
      />

      {error && (
        <div className="alert alert-danger" style={{ marginBottom: "20px" }}>
          {error}
        </div>
      )}

      {/* KPI Cards */}
      <AnalyticsKpiCards
        overview={
          data
            ? {
                health: data.health,
                kpiCards: {
                  fleetUtilization: {
                    value: `${data.fleet.overview.utilizationRate}%`,
                    subtext: `${data.fleet.overview.activeBuses} of ${data.fleet.overview.totalBuses} active`,
                    status: data.fleet.overview.utilizationRate >= 70 ? "healthy" : "warning"
                  },
                  crewAvailability: {
                    value: `${data.crew.overview.availabilityRate}%`,
                    subtext: `${data.crew.overview.availableCrew} available, ${data.crew.overview.onDutyCrew} on duty`,
                    status: data.crew.overview.availableCrew > 0 ? "healthy" : "warning"
                  },
                  restCompliance: {
                    value: `${data.crew.restCompliance.restCompliancePercentage}%`,
                    subtext: `${data.crew.restCompliance.completedRestCount} rest shifts completed`,
                    status: data.crew.restCompliance.restCompliancePercentage >= 90 ? "healthy" : "warning"
                  },
                  tripDelivery: {
                    value: `${data.trips.overview.totalTrips}`,
                    subtext: `${data.trips.overview.totalScheduledKilometers} km scheduled`,
                    status: data.trips.overview.cancellationRate <= 5 ? "healthy" : "warning"
                  },
                  networkOverlapIndex: {
                    value: `${data.network.overlapAnalytics.averageOverlapPercentage}%`,
                    subtext: `${data.network.overlapAnalytics.totalAnalysesCount} analyses logged`,
                    status: data.network.overlapAnalytics.averageOverlapPercentage < 40 ? "healthy" : "warning"
                  }
                },
                tripsOverview: data.trips.overview
              }
            : null
        }
        loading={loading}
      />

      {/* Visual Charts: Fleet & Crew */}
      <FleetCrewCharts
        fleetData={data?.fleet}
        crewData={data?.crew}
        loading={loading}
      />

      {/* Visual Charts: Trip Hourly Dispatch & Route Overlap */}
      <TripOverlapCharts
        tripData={data?.trips}
        networkData={data?.network}
        loading={loading}
      />

      {/* Data Table Section */}
      <section className="analytics-table-card">
        <div className="table-tabs-nav">
          <button
            type="button"
            className={`table-tab-btn ${activeTab === "fleet" ? "active" : ""}`}
            onClick={() => setActiveTab("fleet")}
          >
            Bus Fleet Assets ({data?.fleet.busRoster.length || 0})
          </button>
          <button
            type="button"
            className={`table-tab-btn ${activeTab === "crew" ? "active" : ""}`}
            onClick={() => setActiveTab("crew")}
          >
            Crew Roster ({data?.crew.crewRoster.length || 0})
          </button>
          <button
            type="button"
            className={`table-tab-btn ${activeTab === "routes" ? "active" : ""}`}
            onClick={() => setActiveTab("routes")}
          >
            Route Performance ({data?.network.routeRoster.length || 0})
          </button>
        </div>

        {/* Tab 1: Fleet Roster */}
        {activeTab === "fleet" && (
          <div className="table-responsive">
            <table className="analytics-full-table">
              <thead>
                <tr>
                  <th>Bus Number</th>
                  <th>Reg Number</th>
                  <th>Type</th>
                  <th>Capacity</th>
                  <th>Depot</th>
                  <th>Status</th>
                  <th>Assigned Route</th>
                  <th>Trips</th>
                  <th>Duties</th>
                </tr>
              </thead>
              <tbody>
                {data?.fleet.busRoster.map((b) => (
                  <tr key={b.id}>
                    <td><strong>{b.busNumber}</strong></td>
                    <td>{b.registrationNumber}</td>
                    <td>{b.busType}</td>
                    <td>{b.capacity} seats</td>
                    <td>{b.depot}</td>
                    <td>
                      <span className={`kpi-pill ${b.status === "Active" ? "healthy" : b.status === "Maintenance" ? "warning" : "neutral"}`}>
                        {b.status}
                      </span>
                    </td>
                    <td>{b.assignedRoute}</td>
                    <td><strong>{b.tripCount}</strong></td>
                    <td>{b.dutyCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 2: Crew Roster */}
        {activeTab === "crew" && (
          <div className="table-responsive">
            <table className="analytics-full-table">
              <thead>
                <tr>
                  <th>Crew ID</th>
                  <th>Name</th>
                  <th>Role</th>
                  <th>Badge No</th>
                  <th>Depot</th>
                  <th>Status</th>
                  <th>Duties Covered</th>
                  <th>Assignments</th>
                  <th>Rest Shifts</th>
                </tr>
              </thead>
              <tbody>
                {data?.crew.crewRoster.map((c) => (
                  <tr key={c.id}>
                    <td><strong>{c.crewId}</strong></td>
                    <td>{c.name}</td>
                    <td>{c.role}</td>
                    <td>{c.badgeNumber}</td>
                    <td>{c.assignedDepot}</td>
                    <td>
                      <span className={`kpi-pill ${c.status === "Available" ? "healthy" : c.status === "On Duty" ? "warning" : "neutral"}`}>
                        {c.status}
                      </span>
                    </td>
                    <td><strong>{c.dutiesCovered}</strong></td>
                    <td>{c.assignmentsCount}</td>
                    <td>{c.restPeriodsCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 3: Route Performance */}
        {activeTab === "routes" && (
          <div className="table-responsive">
            <table className="analytics-full-table">
              <thead>
                <tr>
                  <th>Route No</th>
                  <th>Name</th>
                  <th>Terminals</th>
                  <th>Distance</th>
                  <th>Est Time</th>
                  <th>Stops</th>
                  <th>Active Trips</th>
                </tr>
              </thead>
              <tbody>
                {data?.network.routeRoster.map((r) => (
                  <tr key={r.id}>
                    <td><strong>{r.routeNumber}</strong></td>
                    <td>{r.routeName}</td>
                    <td>{r.startingPoint} &rarr; {r.destination}</td>
                    <td>{r.totalDistance} km</td>
                    <td>{r.estimatedTravelTime} mins</td>
                    <td>{r.stopsCount} stops</td>
                    <td><strong>{r.tripsCount}</strong></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Validation Results Modal */}
      {showValidationModal && validationResult && (
        <div className="modal-backdrop" onClick={() => setShowValidationModal(false)}>
          <div className="modal-content validation-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">System-Wide Consistency Diagnostic</h3>
              <button
                type="button"
                className="modal-close"
                onClick={() => setShowValidationModal(false)}
              >
                &times;
              </button>
            </div>

            <div className="validation-diag-summary">
              <div className="diag-summary-box">
                <div className="diag-val">{validationResult.summary.totalDomainsChecked}</div>
                <div className="diag-lbl">Domains Audited</div>
              </div>
              <div className="diag-summary-box">
                <div className="diag-val" style={{ color: "#10b981" }}>
                  {validationResult.summary.healthyDomainsCount}
                </div>
                <div className="diag-lbl">Healthy Domains</div>
              </div>
              <div className="diag-summary-box">
                <div className="diag-val" style={{ color: validationResult.summary.errorsCount > 0 ? "#ef4444" : "#10b981" }}>
                  {validationResult.summary.errorsCount}
                </div>
                <div className="diag-lbl">Errors Found</div>
              </div>
              <div className="diag-summary-box">
                <div className="diag-val" style={{ color: "#f59e0b" }}>
                  {validationResult.summary.warningsCount}
                </div>
                <div className="diag-lbl">Warnings</div>
              </div>
            </div>

            <div className="validation-issues-list">
              {validationResult.issues.length === 0 ? (
                <div style={{ textAlign: "center", padding: "20px 0", color: "#10b981" }}>
                  <CheckCircle2 size={40} style={{ margin: "0 auto 8px" }} />
                  <p style={{ fontWeight: 600, margin: 0 }}>All operational modules are 100% consistent!</p>
                  <p style={{ fontSize: "12px", color: "#64748b", margin: "4px 0 0" }}>
                    Buses, Crew licenses, Scheduled trips, Linked duties, and Route stops pass all integrity constraints.
                  </p>
                </div>
              ) : (
                validationResult.issues.map((issue, idx) => (
                  <div key={idx} className={`validation-issue-item ${issue.severity.toLowerCase()}`}>
                    <strong>[{issue.category}] {issue.severity}:</strong> {issue.message}
                  </div>
                ))
              )}
            </div>

            <div className="modal-actions" style={{ marginTop: "20px" }}>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setShowValidationModal(false)}
              >
                Close Diagnostic
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
