import { prisma } from "../config/prisma.js";

/**
 * Aggregates bus fleet utilization metrics across all operational depots.
 * Subject: DE (Database Engineering / Data Processing)
 *
 * @param {Object} options
 * @param {string} [options.depot] - Filter by specific depot (optional)
 * @param {string} [options.startDate] - ISO date string YYYY-MM-DD
 * @param {string} [options.endDate] - ISO date string YYYY-MM-DD
 * @returns {Promise<Object>} Aggregated fleet utilization metrics
 */
export async function getBusFleetUtilization({ depot, startDate, endDate } = {}) {
  const busWhere = {};
  if (depot && depot !== "ALL") {
    busWhere.depot = depot;
  }

  const tripWhere = {};
  if (startDate && endDate) {
    tripWhere.tripDate = { gte: startDate, lte: endDate };
  } else if (startDate) {
    tripWhere.tripDate = { gte: startDate };
  } else if (endDate) {
    tripWhere.tripDate = { lte: endDate };
  }

  // 1. Total and Status Distribution
  const [
    totalBuses,
    activeBuses,
    maintenanceBuses,
    inactiveBuses,
    allBuses
  ] = await Promise.all([
    prisma.bus.count({ where: busWhere }),
    prisma.bus.count({ where: { ...busWhere, status: "Active" } }),
    prisma.bus.count({ where: { ...busWhere, status: "Maintenance" } }),
    prisma.bus.count({ where: { ...busWhere, status: { in: ["Inactive", "Out of Service", "Decommissioned"] } } }),
    prisma.bus.findMany({
      where: busWhere,
      select: {
        id: true,
        busNumber: true,
        registrationNumber: true,
        capacity: true,
        busType: true,
        status: true,
        depot: true,
        routeId: true,
        route: { select: { routeNumber: true, routeName: true } },
        _count: {
          select: {
            trips: { where: Object.keys(tripWhere).length > 0 ? tripWhere : undefined },
            dutyAssignments: true
          }
        }
      },
      orderBy: { busNumber: "asc" }
    })
  ]);

  const utilizationRate = totalBuses > 0
    ? Math.round((activeBuses / totalBuses) * 1000) / 10
    : 0;

  // 2. Bus Type Breakdown
  const typeMap = {};
  const depotMap = {};
  let busesWithTrips = 0;
  let totalAssignedTrips = 0;

  const busRoster = allBuses.map((bus) => {
    // Tally types
    const type = bus.busType || "Standard CNG";
    typeMap[type] = (typeMap[type] || 0) + 1;

    // Tally depots
    const dName = bus.depot || "Unassigned";
    if (!depotMap[dName]) {
      depotMap[dName] = { depot: dName, total: 0, active: 0, maintenance: 0, trips: 0 };
    }
    depotMap[dName].total += 1;
    if (bus.status === "Active") depotMap[dName].active += 1;
    if (bus.status === "Maintenance") depotMap[dName].maintenance += 1;
    depotMap[dName].trips += bus._count.trips;

    // Tally trip coverage
    if (bus._count.trips > 0) busesWithTrips += 1;
    totalAssignedTrips += bus._count.trips;

    return {
      id: bus.id,
      busNumber: bus.busNumber,
      registrationNumber: bus.registrationNumber,
      capacity: bus.capacity,
      busType: bus.busType,
      status: bus.status,
      depot: bus.depot,
      assignedRoute: bus.route ? `${bus.route.routeNumber} - ${bus.route.routeName}` : "None",
      tripCount: bus._count.trips,
      dutyCount: bus._count.dutyAssignments
    };
  });

  const typeDistribution = Object.entries(typeMap).map(([type, count]) => ({
    type,
    count,
    percentage: totalBuses > 0 ? Math.round((count / totalBuses) * 1000) / 10 : 0
  }));

  const depotDistribution = Object.values(depotMap).map((d) => ({
    ...d,
    utilizationRate: d.total > 0 ? Math.round((d.active / d.total) * 1000) / 10 : 0
  }));

  // Top utilized buses
  const topUtilizedBuses = [...busRoster]
    .sort((a, b) => b.tripCount - a.tripCount)
    .slice(0, 5);

  const idleActiveBuses = busRoster.filter((b) => b.status === "Active" && b.tripCount === 0);

  return {
    overview: {
      totalBuses,
      activeBuses,
      maintenanceBuses,
      inactiveBuses,
      utilizationRate,
      busesWithTrips,
      idleActiveBusesCount: idleActiveBuses.length,
      averageTripsPerBus: activeBuses > 0 ? Math.round((totalAssignedTrips / activeBuses) * 10) / 10 : 0
    },
    typeDistribution,
    depotDistribution,
    topUtilizedBuses,
    busRoster
  };
}
