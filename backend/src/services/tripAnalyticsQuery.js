import { prisma } from "../config/prisma.js";

/**
 * Aggregates transit trip operational performance, completion metrics, and dispatch density.
 * Subject: DE (Database Engineering / Data Processing)
 *
 * @param {Object} options
 * @param {string} [options.startDate] - ISO date string YYYY-MM-DD
 * @param {string} [options.endDate] - ISO date string YYYY-MM-DD
 * @param {string} [options.routeId] - Filter by specific route ID
 * @param {string} [options.status] - Filter by trip status
 * @returns {Promise<Object>} Aggregated trip operations metrics
 */
export async function getTripOperationsAnalytics({ startDate, endDate, routeId, status } = {}) {
  const tripWhere = {};

  if (startDate && endDate) {
    tripWhere.tripDate = { gte: startDate, lte: endDate };
  } else if (startDate) {
    tripWhere.tripDate = { gte: startDate };
  } else if (endDate) {
    tripWhere.tripDate = { lte: endDate };
  }

  if (routeId && routeId !== "ALL") {
    tripWhere.routeId = routeId;
  }

  if (status && status !== "ALL") {
    tripWhere.status = status;
  }

  // 1. Core Counts and Status Tally
  const [
    totalTrips,
    scheduledTrips,
    inProgressTrips,
    completedTrips,
    cancelledTrips,
    allTrips
  ] = await Promise.all([
    prisma.trip.count({ where: tripWhere }),
    prisma.trip.count({ where: { ...tripWhere, status: "Scheduled" } }),
    prisma.trip.count({ where: { ...tripWhere, status: "In Progress" } }),
    prisma.trip.count({ where: { ...tripWhere, status: "Completed" } }),
    prisma.trip.count({ where: { ...tripWhere, status: "Cancelled" } }),
    prisma.trip.findMany({
      where: tripWhere,
      include: {
        route: {
          select: {
            id: true,
            routeNumber: true,
            routeName: true,
            totalDistance: true,
            estimatedTravelTime: true
          }
        },
        bus: {
          select: {
            id: true,
            busNumber: true,
            busType: true,
            depot: true
          }
        }
      },
      orderBy: [{ tripDate: "asc" }, { departureTime: "asc" }]
    })
  ]);

  const completionRate = totalTrips > 0
    ? Math.round((completedTrips / totalTrips) * 1000) / 10
    : 0;

  const cancellationRate = totalTrips > 0
    ? Math.round((cancelledTrips / totalTrips) * 1000) / 10
    : 0;

  // 2. Hourly Dispatch Distribution (00 to 23)
  const hourlyMap = {};
  for (let h = 5; h <= 23; h++) {
    const label = `${String(h).padStart(2, "0")}:00`;
    hourlyMap[label] = { hour: label, totalTrips: 0, morningPeak: h >= 8 && h <= 11, eveningPeak: h >= 17 && h <= 20 };
  }

  // 3. Route Operational Volume
  const routeMap = {};
  let totalScheduledKilometers = 0;
  let totalCompletedKilometers = 0;

  // 4. Daily Date Trend
  const dateTrendMap = {};

  for (const trip of allTrips) {
    // Hourly tally
    if (trip.departureTime) {
      const hourPart = trip.departureTime.split(":")[0];
      const hourKey = `${hourPart.padStart(2, "0")}:00`;
      if (hourlyMap[hourKey]) {
        hourlyMap[hourKey].totalTrips += 1;
      }
    }

    // Route tally
    if (trip.route) {
      const rKey = trip.route.routeNumber;
      if (!routeMap[rKey]) {
        routeMap[rKey] = {
          routeId: trip.route.id,
          routeNumber: trip.route.routeNumber,
          routeName: trip.route.routeName,
          totalDistanceKm: trip.route.totalDistance || 0,
          totalTrips: 0,
          completedTrips: 0,
          scheduledTrips: 0,
          cancelledTrips: 0
        };
      }
      routeMap[rKey].totalTrips += 1;
      if (trip.status === "Completed") routeMap[rKey].completedTrips += 1;
      if (trip.status === "Scheduled") routeMap[rKey].scheduledTrips += 1;
      if (trip.status === "Cancelled") routeMap[rKey].cancelledTrips += 1;

      const dist = trip.route.totalDistance || 0;
      totalScheduledKilometers += dist;
      if (trip.status === "Completed") {
        totalCompletedKilometers += dist;
      }
    }

    // Date trend tally
    const dKey = trip.tripDate;
    if (!dateTrendMap[dKey]) {
      dateTrendMap[dKey] = { date: dKey, total: 0, completed: 0, scheduled: 0, cancelled: 0 };
    }
    dateTrendMap[dKey].total += 1;
    if (trip.status === "Completed") dateTrendMap[dKey].completed += 1;
    if (trip.status === "Scheduled") dateTrendMap[dKey].scheduled += 1;
    if (trip.status === "Cancelled") dateTrendMap[dKey].cancelled += 1;
  }

  const hourlyDistribution = Object.values(hourlyMap);
  const routePerformance = Object.values(routeMap).sort((a, b) => b.totalTrips - a.totalTrips);
  const dailyTrends = Object.values(dateTrendMap).sort((a, b) => a.date.localeCompare(b.date));

  return {
    overview: {
      totalTrips,
      scheduledTrips,
      inProgressTrips,
      completedTrips,
      cancelledTrips,
      completionRate,
      cancellationRate,
      totalScheduledKilometers: Math.round(totalScheduledKilometers * 10) / 10,
      totalCompletedKilometers: Math.round(totalCompletedKilometers * 10) / 10
    },
    hourlyDistribution,
    routePerformance,
    dailyTrends
  };
}
