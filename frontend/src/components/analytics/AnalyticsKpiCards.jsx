import React from "react";
import {
  Activity,
  Bus,
  Users,
  ShieldCheck,
  CalendarCheck,
  Layers,
  TrendingUp,
  AlertCircle
} from "lucide-react";

/**
 * Executive Summary KPI Cards for Operational Analytics Dashboard.
 * Subject: ISD (Information Systems Design)
 */
export default function AnalyticsKpiCards({ overview, loading }) {
  if (loading || !overview) {
    return (
      <div className="analytics-kpi-grid">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="kpi-card loading-skeleton" style={{ minHeight: "110px" }} />
        ))}
      </div>
    );
  }

  const { health, kpiCards } = overview;

  const healthVariant =
    health.status === "Optimal"
      ? "health-optimal"
      : health.status === "Moderate"
      ? "health-moderate"
      : "health-critical";

  return (
    <div className="analytics-kpi-grid">
      {/* 1. System Health Card */}
      <div className={`kpi-card ${healthVariant}`}>
        <div className="kpi-header">
          <span className="kpi-title">System Health Index</span>
          <Activity size={20} className="kpi-icon" />
        </div>
        <div className="kpi-value-row">
          <span className="kpi-value">{health.score}</span>
          <span className="kpi-unit">/ 100</span>
          <span className="kpi-badge">{health.status}</span>
        </div>
        <div className="kpi-subtext">
          Fleet {health.factors.fleetReadiness}% · Crew {health.factors.crewAvailability}% · Service {health.factors.serviceReliability}%
        </div>
      </div>

      {/* 2. Fleet Utilization */}
      <div className="kpi-card">
        <div className="kpi-header">
          <span className="kpi-title">Fleet Utilization</span>
          <Bus size={20} className="kpi-icon" />
        </div>
        <div className="kpi-value-row">
          <span className="kpi-value">{kpiCards.fleetUtilization.value}</span>
          <span className={`kpi-pill ${kpiCards.fleetUtilization.status}`}>
            {kpiCards.fleetUtilization.status === "healthy" ? "Active" : "Sub-optimal"}
          </span>
        </div>
        <div className="kpi-subtext">{kpiCards.fleetUtilization.subtext}</div>
      </div>

      {/* 3. Crew Availability */}
      <div className="kpi-card">
        <div className="kpi-header">
          <span className="kpi-title">Crew Deployment</span>
          <Users size={20} className="kpi-icon" />
        </div>
        <div className="kpi-value-row">
          <span className="kpi-value">{kpiCards.crewAvailability.value}</span>
          <span className="kpi-unit">Available</span>
        </div>
        <div className="kpi-subtext">{kpiCards.crewAvailability.subtext}</div>
      </div>

      {/* 4. Rest Compliance */}
      <div className="kpi-card">
        <div className="kpi-header">
          <span className="kpi-title">Rest Compliance</span>
          <ShieldCheck size={20} className="kpi-icon" />
        </div>
        <div className="kpi-value-row">
          <span className="kpi-value">{kpiCards.restCompliance.value}</span>
          <span className="kpi-pill healthy">Compliant</span>
        </div>
        <div className="kpi-subtext">{kpiCards.restCompliance.subtext}</div>
      </div>

      {/* 5. Trip Delivery */}
      <div className="kpi-card">
        <div className="kpi-header">
          <span className="kpi-title">Service Kilometers</span>
          <CalendarCheck size={20} className="kpi-icon" />
        </div>
        <div className="kpi-value-row">
          <span className="kpi-value">{overview.tripsOverview.totalScheduledKilometers}</span>
          <span className="kpi-unit">km</span>
        </div>
        <div className="kpi-subtext">{overview.tripsOverview.totalTrips} operational trips scheduled</div>
      </div>

      {/* 6. Route Overlap Index */}
      <div className="kpi-card">
        <div className="kpi-header">
          <span className="kpi-title">Network Overlap Index</span>
          <Layers size={20} className="kpi-icon" />
        </div>
        <div className="kpi-value-row">
          <span className="kpi-value">{kpiCards.networkOverlapIndex.value}</span>
          <span className="kpi-pill neutral">Corridor Index</span>
        </div>
        <div className="kpi-subtext">{kpiCards.networkOverlapIndex.subtext}</div>
      </div>
    </div>
  );
}
