import React from "react";
import { Bus, Users, Wrench, Shield, CheckCircle2 } from "lucide-react";

/**
 * Fleet & Crew Utilization Visual Charts Component.
 * Subject: ISD (Information Systems Design)
 */
export default function FleetCrewCharts({ fleetData, crewData, loading }) {
  if (loading || !fleetData || !crewData) {
    return (
      <div className="charts-two-col-grid">
        <div className="chart-card loading-skeleton" style={{ minHeight: "260px" }} />
        <div className="chart-card loading-skeleton" style={{ minHeight: "260px" }} />
      </div>
    );
  }

  const { depotDistribution, typeDistribution } = fleetData;
  const { overview: crewOverview, depotDistribution: crewDepotDist, restCompliance } = crewData;

  const maxBusesInDepot = Math.max(1, ...depotDistribution.map((d) => d.total));

  return (
    <div className="charts-two-col-grid">
      {/* 1. Fleet Depot Allocation & Utilization */}
      <div className="chart-card">
        <div className="chart-header">
          <div>
            <h3 className="chart-title">Fleet Allocation by Depot</h3>
            <p className="chart-subtitle">Active vs. Maintenance vs. Idle vehicles across DTC depots</p>
          </div>
          <Bus size={18} className="text-muted" />
        </div>

        <div className="depot-bars-list">
          {depotDistribution.map((d) => {
            const activePct = d.total > 0 ? (d.active / d.total) * 100 : 0;
            const maintPct = d.total > 0 ? (d.maintenance / d.total) * 100 : 0;
            const widthPct = Math.round((d.total / maxBusesInDepot) * 100);

            return (
              <div key={d.depot} className="depot-bar-item">
                <div className="depot-bar-label-row">
                  <span className="depot-name">{d.depot}</span>
                  <span className="depot-stat">
                    <strong>{d.active}</strong> active / {d.total} total ({d.utilizationRate}%)
                  </span>
                </div>
                <div className="stacked-progress-track" style={{ width: `${Math.max(25, widthPct)}%` }}>
                  <div
                    className="progress-segment active-fill"
                    style={{ width: `${activePct}%` }}
                    title={`Active: ${d.active}`}
                  />
                  <div
                    className="progress-segment maint-fill"
                    style={{ width: `${maintPct}%` }}
                    title={`Maintenance: ${d.maintenance}`}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Bus Type Tags */}
        <div className="chart-footer-tags">
          <span className="footer-label">Propulsion:</span>
          {typeDistribution.map((t) => (
            <span key={t.type} className="badge-tag">
              {t.type} <strong>{t.count}</strong> ({t.percentage}%)
            </span>
          ))}
        </div>
      </div>

      {/* 2. Crew Workload & Rest Compliance */}
      <div className="chart-card">
        <div className="chart-header">
          <div>
            <h3 className="chart-title">Crew Deployment & Rest Status</h3>
            <p className="chart-subtitle">Active duties, reserve pool, and mandatory rest enforcement</p>
          </div>
          <Users size={18} className="text-muted" />
        </div>

        {/* Status Distribution Pills */}
        <div className="crew-status-grid">
          <div className="status-metric-box green">
            <span className="status-num">{crewOverview.availableCrew}</span>
            <span className="status-txt">Available Reserve</span>
            <span className="status-ratio">{crewOverview.availabilityRate}% of workforce</span>
          </div>
          <div className="status-metric-box blue">
            <span className="status-num">{crewOverview.onDutyCrew}</span>
            <span className="status-txt">On Active Duty</span>
            <span className="status-ratio">{crewOverview.onDutyRate}% deployed</span>
          </div>
          <div className="status-metric-box purple">
            <span className="status-num">{crewOverview.onRestCrew}</span>
            <span className="status-txt">Mandatory Rest</span>
            <span className="status-ratio">Rest enforced</span>
          </div>
          <div className="status-metric-box amber">
            <span className="status-num">{crewOverview.onLeaveCrew}</span>
            <span className="status-txt">On Leave</span>
            <span className="status-ratio">Approved</span>
          </div>
        </div>

        {/* Rest Compliance Meter */}
        <div className="compliance-meter-section">
          <div className="meter-label-row">
            <span className="meter-title">
              <Shield size={15} style={{ verticalAlign: "middle", marginRight: "4px" }} />
              DTC Rest Period Compliance
            </span>
            <span className="meter-val">{restCompliance.restCompliancePercentage}% compliant</span>
          </div>
          <div className="progress-track-bg">
            <div
              className="progress-fill-emerald"
              style={{ width: `${restCompliance.restCompliancePercentage}%` }}
            />
          </div>
          <p className="meter-hint">
            {restCompliance.completedRestCount} rest shifts recorded · {restCompliance.averageRestMinutes} min avg duration
          </p>
        </div>
      </div>
    </div>
  );
}
