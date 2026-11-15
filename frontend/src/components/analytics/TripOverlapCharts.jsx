import React from "react";
import { Clock, Layers, AlertTriangle, CheckCircle, Navigation } from "lucide-react";

/**
 * Trip Hourly Dispatch & Route Overlap Visual Charts.
 * Subject: ISD (Information Systems Design)
 */
export default function TripOverlapCharts({ tripData, networkData, loading }) {
  if (loading || !tripData || !networkData) {
    return (
      <div className="charts-two-col-grid">
        <div className="chart-card loading-skeleton" style={{ minHeight: "260px" }} />
        <div className="chart-card loading-skeleton" style={{ minHeight: "260px" }} />
      </div>
    );
  }

  const { hourlyDistribution, overview: tripOverview } = tripData;
  const { overlapAnalytics, overview: netOverview } = networkData;

  const maxTripsInHour = Math.max(1, ...hourlyDistribution.map((h) => h.totalTrips));

  return (
    <div className="charts-two-col-grid">
      {/* 1. Hourly Dispatch Density Histogram */}
      <div className="chart-card">
        <div className="chart-header">
          <div>
            <h3 className="chart-title">Hourly Dispatch Frequency</h3>
            <p className="chart-subtitle">Trip departure density from 05:00 to 23:00</p>
          </div>
          <Clock size={18} className="text-muted" />
        </div>

        {/* Peak Indicators */}
        <div className="peak-indicators-bar">
          <span className="peak-tag morning">
            <span className="dot" /> Morning Peak (08:00 – 11:00)
          </span>
          <span className="peak-tag evening">
            <span className="dot" /> Evening Peak (17:00 – 20:00)
          </span>
        </div>

        {/* Vertical Bars Histogram */}
        <div className="hourly-histogram-container">
          {hourlyDistribution.map((h) => {
            const heightPct = Math.round((h.totalTrips / maxTripsInHour) * 100);
            const isPeak = h.morningPeak || h.eveningPeak;

            return (
              <div key={h.hour} className="histogram-col" title={`${h.hour}: ${h.totalTrips} trips`}>
                <div className="bar-wrapper">
                  <div
                    className={`histo-bar ${isPeak ? "peak-bar" : "normal-bar"} ${h.totalTrips > 0 ? "has-trips" : "empty"}`}
                    style={{ height: `${Math.max(6, heightPct)}%` }}
                  >
                    {h.totalTrips > 0 && <span className="bar-val">{h.totalTrips}</span>}
                  </div>
                </div>
                <span className="hour-axis-label">{h.hour.slice(0, 2)}</span>
              </div>
            );
          })}
        </div>

        <div className="chart-footer-row">
          <span>Total Scheduled Trips: <strong>{tripOverview.totalTrips}</strong></span>
          <span>Delivered Distance: <strong>{tripOverview.totalScheduledKilometers} km</strong></span>
          <span>Completion: <strong>{tripOverview.completionRate}%</strong></span>
        </div>
      </div>

      {/* 2. Route Overlap & Corridor Redundancy */}
      <div className="chart-card">
        <div className="chart-header">
          <div>
            <h3 className="chart-title">Network Overlap & Corridor Redundancy</h3>
            <p className="chart-subtitle">Spatial corridor duplication across proposed & existing routes</p>
          </div>
          <Layers size={18} className="text-muted" />
        </div>

        {/* Severity Metrics */}
        <div className="overlap-severity-row">
          <div className="severity-pill low">
            <CheckCircle size={14} />
            <span>Low (&lt;25%): <strong>{overlapAnalytics.severityBreakdown.low}</strong></span>
          </div>
          <div className="severity-pill moderate">
            <AlertTriangle size={14} />
            <span>Moderate (25-50%): <strong>{overlapAnalytics.severityBreakdown.moderate}</strong></span>
          </div>
          <div className="severity-pill high">
            <AlertTriangle size={14} />
            <span>High (&gt;50%): <strong>{overlapAnalytics.severityBreakdown.high}</strong></span>
          </div>
        </div>

        {/* Overlapped Routes Table */}
        <div className="overlap-routes-container">
          <h4 className="section-subheading">Most Duplicated Network Corridors</h4>
          {overlapAnalytics.mostOverlappedRoutes.length === 0 ? (
            <p className="text-muted-empty">No high-redundancy corridor segments detected in current network.</p>
          ) : (
            <div className="table-responsive">
              <table className="mini-data-table">
                <thead>
                  <tr>
                    <th>Route</th>
                    <th>Name</th>
                    <th>Overlaps</th>
                    <th>Duplicated km</th>
                  </tr>
                </thead>
                <tbody>
                  {overlapAnalytics.mostOverlappedRoutes.map((r) => (
                    <tr key={r.routeNumber}>
                      <td><strong>{r.routeNumber}</strong></td>
                      <td>{r.routeName}</td>
                      <td><span className="badge-instances">{r.instances}x</span></td>
                      <td>{r.totalOverlapKm} km</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="chart-footer-row">
          <span>Active Routes: <strong>{netOverview.totalRoutes}</strong></span>
          <span>Network Length: <strong>{netOverview.totalNetworkDistanceKm} km</strong></span>
          <span>Avg Overlap: <strong>{overlapAnalytics.averageOverlapPercentage}%</strong></span>
        </div>
      </div>
    </div>
  );
}
