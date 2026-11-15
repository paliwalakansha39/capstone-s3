import { prisma } from "../config/prisma.js";

/**
 * Aggregates transit network structure, stop density, and corridor overlap redundancy analytics.
 * Subject: DE (Database Engineering / Data Processing)
 *
 * @returns {Promise<Object>} Aggregated route network and overlap metrics
 */
export async function getRouteNetworkAnalytics() {
  const [
    totalRoutes,
    totalBusStops,
    allRoutes,
    totalProposedRoutes,
    allAnalyses,
    allOverlappingSegments
  ] = await Promise.all([
    prisma.route.count(),
    prisma.busStop.count(),
    prisma.route.findMany({
      select: {
        id: true,
        routeNumber: true,
        routeName: true,
        startingPoint: true,
        destination: true,
        totalDistance: true,
        estimatedTravelTime: true,
        _count: {
          select: {
            stops: true,
            trips: true,
            buses: true
          }
        }
      },
      orderBy: { routeNumber: "asc" }
    }),
    prisma.proposedRoute.count(),
    prisma.routeOverlapAnalysis.findMany({
      select: {
        id: true,
        proposedRouteName: true,
        toleranceMeters: true,
        proposedTotalDistance: true,
        overlappingDistance: true,
        overlapPercentage: true,
        status: true,
        createdAt: true
      },
      orderBy: { createdAt: "desc" }
    }),
    prisma.overlappingRouteSegment.findMany({
      select: {
        id: true,
        existingRouteNumber: true,
        existingRouteName: true,
        overlapDistance: true,
        overlapPercentage: true
      }
    })
  ]);

  // 1. Distance and Travel Time Metrics
  let totalNetworkDistanceKm = 0;
  let totalTravelTimeMinutes = 0;
  let totalStopsCount = 0;

  for (const r of allRoutes) {
    totalNetworkDistanceKm += r.totalDistance || 0;
    totalTravelTimeMinutes += r.estimatedTravelTime || 0;
    totalStopsCount += r._count.stops;
  }

  const averageRouteDistanceKm = totalRoutes > 0
    ? Math.round((totalNetworkDistanceKm / totalRoutes) * 10) / 10
    : 0;

  const averageTravelTimeMinutes = totalRoutes > 0
    ? Math.round(totalTravelTimeMinutes / totalRoutes)
    : 0;

  const averageStopsPerRoute = totalRoutes > 0
    ? Math.round((totalStopsCount / totalRoutes) * 10) / 10
    : 0;

  // 2. Overlap Severity Distribution
  const totalAnalysesCount = allAnalyses.length;
  let totalOverlapPercentageSum = 0;
  let lowOverlapCount = 0; // < 25%
  let moderateOverlapCount = 0; // 25% - 50%
  let highOverlapCount = 0; // > 50%

  for (const a of allAnalyses) {
    const pct = a.overlapPercentage || 0;
    totalOverlapPercentageSum += pct;
    if (pct < 25) {
      lowOverlapCount += 1;
    } else if (pct <= 50) {
      moderateOverlapCount += 1;
    } else {
      highOverlapCount += 1;
    }
  }

  const averageOverlapPercentage = totalAnalysesCount > 0
    ? Math.round((totalOverlapPercentageSum / totalAnalysesCount) * 10) / 10
    : 0;

  // 3. Most Overlapped Existing Routes
  const overlapRouteMap = {};
  for (const seg of allOverlappingSegments) {
    const num = seg.existingRouteNumber;
    if (!overlapRouteMap[num]) {
      overlapRouteMap[num] = {
        routeNumber: num,
        routeName: seg.existingRouteName,
        instances: 0,
        totalOverlapKm: 0
      };
    }
    overlapRouteMap[num].instances += 1;
    overlapRouteMap[num].totalOverlapKm += seg.overlapDistance || 0;
  }

  const mostOverlappedRoutes = Object.values(overlapRouteMap)
    .map((r) => ({ ...r, totalOverlapKm: Math.round(r.totalOverlapKm * 10) / 10 }))
    .sort((a, b) => b.instances - a.instances)
    .slice(0, 5);

  // 4. Route Roster Overview
  const routeRoster = allRoutes.map((r) => ({
    id: r.id,
    routeNumber: r.routeNumber,
    routeName: r.routeName,
    startingPoint: r.startingPoint,
    destination: r.destination,
    totalDistance: r.totalDistance,
    estimatedTravelTime: r.estimatedTravelTime,
    stopsCount: r._count.stops,
    tripsCount: r._count.trips,
    busesCount: r._count.buses
  }));

  return {
    overview: {
      totalRoutes,
      totalBusStops,
      totalNetworkDistanceKm: Math.round(totalNetworkDistanceKm * 10) / 10,
      averageRouteDistanceKm,
      averageTravelTimeMinutes,
      averageStopsPerRoute,
      totalProposedRoutes
    },
    overlapAnalytics: {
      totalAnalysesCount,
      averageOverlapPercentage,
      severityBreakdown: {
        low: lowOverlapCount,
        moderate: moderateOverlapCount,
        high: highOverlapCount
      },
      mostOverlappedRoutes,
      recentAnalyses: allAnalyses.slice(0, 5)
    },
    routeRoster
  };
}
