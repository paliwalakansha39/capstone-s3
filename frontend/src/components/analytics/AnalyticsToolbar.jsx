import React, { useState } from "react";
import { Download, RefreshCw, Filter, CheckCircle, AlertTriangle, ShieldCheck } from "lucide-react";

/**
 * Filter Toolbar & Report Export Controls Component.
 * Subject: ISD (Information Systems Design)
 */
export default function AnalyticsToolbar({
  filters,
  onFilterChange,
  onRefresh,
  onExport,
  onRunValidation,
  exporting,
  validating
}) {
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportType, setExportType] = useState("summary");
  const [exportFormat, setExportFormat] = useState("csv");

  const depots = [
    "ALL",
    "BBM Depot",
    "Sarojini Nagar Depot",
    "Rohini Depot-I",
    "Anand Vihar Depot",
    "Mayapuri Depot"
  ];

  function handleExportSubmit(e) {
    e.preventDefault();
    onExport({ type: exportType, format: exportFormat });
    setShowExportModal(false);
  }

  return (
    <div className="analytics-toolbar-shell">
      <div className="toolbar-filters-group">
        {/* Depot Filter */}
        <div className="filter-input-wrap">
          <label htmlFor="depot-filter" className="filter-label">Depot</label>
          <select
            id="depot-filter"
            className="filter-select"
            value={filters.depot || "ALL"}
            onChange={(e) => onFilterChange("depot", e.target.value)}
          >
            {depots.map((d) => (
              <option key={d} value={d}>
                {d === "ALL" ? "All DTC Depots" : d}
              </option>
            ))}
          </select>
        </div>

        {/* Date Range: Start Date */}
        <div className="filter-input-wrap">
          <label htmlFor="start-date" className="filter-label">Start Date</label>
          <input
            id="start-date"
            type="date"
            className="filter-input"
            value={filters.startDate || ""}
            onChange={(e) => onFilterChange("startDate", e.target.value)}
          />
        </div>

        {/* Date Range: End Date */}
        <div className="filter-input-wrap">
          <label htmlFor="end-date" className="filter-label">End Date</label>
          <input
            id="end-date"
            type="date"
            className="filter-input"
            value={filters.endDate || ""}
            onChange={(e) => onFilterChange("endDate", e.target.value)}
          />
        </div>
      </div>

      <div className="toolbar-actions-group">
        {/* Integrity Validation Button */}
        <button
          type="button"
          className="btn btn-secondary btn-icon-gap"
          onClick={onRunValidation}
          disabled={validating}
          title="Run system-wide cross-module relational consistency check"
        >
          <ShieldCheck size={16} />
          <span>{validating ? "Checking..." : "Verify System"}</span>
        </button>

        {/* Refresh Button */}
        <button
          type="button"
          className="btn btn-secondary btn-icon-gap"
          onClick={onRefresh}
          title="Refresh analytics data"
        >
          <RefreshCw size={16} />
          <span>Refresh</span>
        </button>

        {/* Export Report Button */}
        <button
          type="button"
          className="btn btn-primary btn-icon-gap"
          onClick={() => setShowExportModal(true)}
          disabled={exporting}
        >
          <Download size={16} />
          <span>{exporting ? "Generating..." : "Export Report"}</span>
        </button>
      </div>

      {/* Export Modal */}
      {showExportModal && (
        <div className="modal-backdrop" onClick={() => setShowExportModal(false)}>
          <div className="modal-content export-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Export Operational Report</h3>
              <button
                type="button"
                className="modal-close"
                onClick={() => setShowExportModal(false)}
              >
                &times;
              </button>
            </div>
            <form onSubmit={handleExportSubmit} className="modal-form">
              <div className="form-group">
                <label className="form-label">Report Category</label>
                <select
                  className="form-control"
                  value={exportType}
                  onChange={(e) => setExportType(e.target.value)}
                >
                  <option value="summary">Executive Operational Summary</option>
                  <option value="fleet">Bus Fleet Assets & Utilization</option>
                  <option value="crew">Crew Roster & Rest Compliance</option>
                  <option value="trips">Trip Schedules & Delivery</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Export Format</label>
                <div className="radio-group-row">
                  <label className="radio-label">
                    <input
                      type="radio"
                      name="exportFormat"
                      value="csv"
                      checked={exportFormat === "csv"}
                      onChange={() => setExportFormat("csv")}
                    />
                    <span>CSV (Spreadsheet)</span>
                  </label>
                  <label className="radio-label">
                    <input
                      type="radio"
                      name="exportFormat"
                      value="json"
                      checked={exportFormat === "json"}
                      onChange={() => setExportFormat("json")}
                    />
                    <span>JSON (Data API)</span>
                  </label>
                </div>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowExportModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Download {exportFormat.toUpperCase()}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
