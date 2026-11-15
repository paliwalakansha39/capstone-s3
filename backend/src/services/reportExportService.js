import { getBusFleetUtilization } from "./busAnalyticsQuery.js";
import { getCrewUtilizationAnalytics } from "./crewAnalyticsQuery.js";
import { getTripOperationsAnalytics } from "./tripAnalyticsQuery.js";
import { getRouteNetworkAnalytics } from "./routeAnalyticsQuery.js";
import { getSystemOverviewKPIs } from "./analyticsService.js";

/**
 * Report Export and Serialization Service.
 * Subject: ASD (Advanced Software Design)
 */

function escapeCsvCell(value) {
  if (value === null || value === undefined) return '""';
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return `"${str}"`;
}

function buildCsv(headers, rows) {
  const headerLine = headers.map(escapeCsvCell).join(",");
  const rowLines = rows.map((r) => r.map(escapeCsvCell).join(","));
  return [headerLine, ...rowLines].join("\n");
}

/**
 * Generates an operational export report in CSV or JSON.
 *
 * @param {Object} options
 * @param {string} options.type - 'fleet' | 'crew' | 'trips' | 'routes' | 'summary'
 * @param {string} [options.format='csv'] - 'csv' | 'json'
 * @param {Object} [options.filters={}]
 * @returns {Promise<{ content: string, contentType: string, filename: string }>}
 */
export async function generateOperationalReport({ type = "summary", format = "csv", filters = {} }) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);

  if (type === "fleet") {
    const data = await getBusFleetUtilization(filters);
    if (format === "json") {
      return {
        content: JSON.stringify(data, null, 2),
        contentType: "application/json",
        filename: `dtc-fleet-report-${timestamp}.json`
      };
    }
    const headers = [
      "Bus Number",
      "Registration Number",
      "Type",
      "Capacity",
      "Status",
      "Depot",
      "Assigned Route",
      "Total Trips",
      "Duty Count"
    ];
    const rows = data.busRoster.map((b) => [
      b.busNumber,
      b.registrationNumber,
      b.busType,
      b.capacity,
      b.status,
      b.depot,
      b.assignedRoute,
      b.tripCount,
      b.dutyCount
    ]);
    return {
      content: buildCsv(headers, rows),
      contentType: "text/csv; charset=utf-8",
      filename: `dtc-fleet-report-${timestamp}.csv`
    };
  }

  if (type === "crew") {
    const data = await getCrewUtilizationAnalytics(filters);
    if (format === "json") {
      return {
        content: JSON.stringify(data, null, 2),
        contentType: "application/json",
        filename: `dtc-crew-report-${timestamp}.json`
      };
    }
    const headers = [
      "Crew ID",
      "Name",
      "Role",
      "Badge Number",
      "License Number",
      "Depot",
      "Status",
      "Duties Covered",
      "Assignments Count",
      "Rest Periods Count"
    ];
    const rows = data.crewRoster.map((c) => [
      c.crewId,
      c.name,
      c.role,
      c.badgeNumber,
      c.licenseNumber || "N/A",
      c.assignedDepot,
      c.status,
      c.dutiesCovered,
      c.assignmentsCount,
      c.restPeriodsCount
    ]);
    return {
      content: buildCsv(headers, rows),
      contentType: "text/csv; charset=utf-8",
      filename: `dtc-crew-report-${timestamp}.csv`
    };
  }

  if (type === "trips") {
    const data = await getTripOperationsAnalytics(filters);
    if (format === "json") {
      return {
        content: JSON.stringify(data, null, 2),
        contentType: "application/json",
        filename: `dtc-trips-report-${timestamp}.json`
      };
    }
    const headers = [
      "Route Number",
      "Route Name",
      "Distance (km)",
      "Total Trips",
      "Scheduled Trips",
      "Completed Trips",
      "Cancelled Trips"
    ];
    const rows = data.routePerformance.map((r) => [
      r.routeNumber,
      r.routeName,
      r.totalDistanceKm,
      r.totalTrips,
      r.scheduledTrips,
      r.completedTrips,
      r.cancelledTrips
    ]);
    return {
      content: buildCsv(headers, rows),
      contentType: "text/csv; charset=utf-8",
      filename: `dtc-trips-report-${timestamp}.csv`
    };
  }

  // Default: 'summary'
  const overview = await getSystemOverviewKPIs(filters);
  if (format === "json") {
    return {
      content: JSON.stringify(overview, null, 2),
      contentType: "application/json",
      filename: `dtc-operations-summary-${timestamp}.json`
    };
  }

  const headers = ["Operational Domain", "Metric", "Value", "Status / Details"];
  const rows = [
    ["System Health", "Overall Operational Score", `${overview.health.score} / 100`, overview.health.status],
    ["Fleet", "Total Buses", overview.fleetOverview.totalBuses, "Fleet size"],
    ["Fleet", "Active Buses", overview.fleetOverview.activeBuses, `${overview.fleetOverview.utilizationRate}% active`],
    ["Fleet", "Buses in Maintenance", overview.fleetOverview.maintenanceBuses, "Under repair"],
    ["Crew", "Total Personnel", overview.crewOverview.totalCrew, "Drivers & Conductors"],
    ["Crew", "Available Crew", overview.crewOverview.availableCrew, `${overview.crewOverview.availabilityRate}% reserve`],
    ["Crew", "On Duty Crew", overview.crewOverview.onDutyCrew, `${overview.crewOverview.onDutyRate}% deployed`],
    ["Trips", "Total Trips Scheduled", overview.tripsOverview.totalTrips, `${overview.tripsOverview.totalScheduledKilometers} km`],
    ["Network", "Total Routes", overview.networkOverview.totalRoutes, `${overview.networkOverview.totalNetworkDistanceKm} km coverage`],
    ["Network", "Average Overlap", `${overview.kpiCards.networkOverlapIndex.value}`, overview.kpiCards.networkOverlapIndex.subtext]
  ];

  return {
    content: buildCsv(headers, rows),
    contentType: "text/csv; charset=utf-8",
    filename: `dtc-operations-summary-${timestamp}.csv`
  };
}
