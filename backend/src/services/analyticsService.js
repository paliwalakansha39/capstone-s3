import { getBusFleetUtilization } from "./busAnalyticsQuery.js";
import { getCrewUtilizationAnalytics } from "./crewAnalyticsQuery.js";
import { getTripOperationsAnalytics } from "./tripAnalyticsQuery.js";
import { getRouteNetworkAnalytics } from "./routeAnalyticsQuery.js";

/**
 * Unified Analytics and Performance Engine.
 * Subject: ASD (Advanced Software Design / Architectural Services)
 */

/**
 * Calculates a composite System Operational Health Index (0-100).
 *
 * @param {Object} metrics
 * @returns {Object} { score, status, factors }
 */
export function calculateSystemHealthScore({ fleet, crew, trips, network }) {
  const fleetFactor = fleet.overview.utilizationRate || 0; // max 100
  const crewFactor = crew.overview.onDutyRate + crew.overview.availabilityRate || 0; // max 100
  const tripFactor = trips.overview.totalTrips > 0
    ? (100 - trips.overview.cancellationRate)
    : 100;
  const overlapFactor = network.overlapAnalytics.averageOverlapPercentage > 0
    ? Math.max(0, 100 - network.overlapAnalytics.averageOverlapPercentage)
    : 100;

  // Weighted score: 35% Fleet, 30% Crew, 25% Trips, 10% Network
  const score = Math.round(
    fleetFactor * 0.35 +
    Math.min(100, crewFactor) * 0.30 +
    tripFactor * 0.25 +
    overlapFactor * 0.10
  );

  let status = "Optimal";
  if (score < 50) status = "Critical";
  else if (score < 75) status = "Moderate";

  return {
    score: Math.min(100, Math.max(0, score)),
    status,
    factors: {
      fleetReadiness: fleetFactor,
      crewAvailability: Math.min(100, crewFactor),
      serviceReliability: tripFactor,
      networkEfficiency: overlapFactor
    }
  };
}

/**
 * Fetches cross-system high-level KPIs and operational overview.
 *
 * @param {Object} [filters]
 * @returns {Promise<Object>}
 */
export async function getSystemOverviewKPIs(filters = {}) {
  const [fleet, crew, trips, network] = await Promise.all([
    getBusFleetUtilization(filters),
    getCrewUtilizationAnalytics(filters),
    getTripOperationsAnalytics(filters),
    getRouteNetworkAnalytics()
  ]);

  const health = calculateSystemHealthScore({ fleet, crew, trips, network });

  return {
    health,
    kpiCards: {
      fleetUtilization: {
        value: `${fleet.overview.utilizationRate}%`,
        subtext: `${fleet.overview.activeBuses} of ${fleet.overview.totalBuses} active`,
        status: fleet.overview.utilizationRate >= 70 ? "healthy" : "warning"
      },
      crewAvailability: {
        value: `${crew.overview.availabilityRate}%`,
        subtext: `${crew.overview.availableCrew} available, ${crew.overview.onDutyCrew} on duty`,
        status: crew.overview.availableCrew > 0 ? "healthy" : "warning"
      },
      restCompliance: {
        value: `${crew.restCompliance.restCompliancePercentage}%`,
        subtext: `${crew.restCompliance.completedRestCount} rest shifts completed`,
        status: crew.restCompliance.restCompliancePercentage >= 90 ? "healthy" : "warning"
      },
      tripDelivery: {
        value: `${trips.overview.totalTrips}`,
        subtext: `${trips.overview.totalScheduledKilometers} km scheduled`,
        status: trips.overview.cancellationRate <= 5 ? "healthy" : "warning"
      },
      networkOverlapIndex: {
        value: `${network.overlapAnalytics.averageOverlapPercentage}%`,
        subtext: `${network.overlapAnalytics.totalAnalysesCount} analyses logged`,
        status: network.overlapAnalytics.averageOverlapPercentage < 40 ? "healthy" : "warning"
      }
    },
    fleetOverview: fleet.overview,
    crewOverview: crew.overview,
    tripsOverview: trips.overview,
    networkOverview: network.overview
  };
}

/**
 * Returns complete system metrics breakdown across all 4 operational facets.
 *
 * @param {Object} [filters]
 * @returns {Promise<Object>}
 */
export async function getFullSystemAnalytics(filters = {}) {
  const [fleet, crew, trips, network] = await Promise.all([
    getBusFleetUtilization(filters),
    getCrewUtilizationAnalytics(filters),
    getTripOperationsAnalytics(filters),
    getRouteNetworkAnalytics()
  ]);

  const health = calculateSystemHealthScore({ fleet, crew, trips, network });

  return {
    health,
    fleet,
    crew,
    trips,
    network
  };
}
