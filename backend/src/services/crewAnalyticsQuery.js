import { prisma } from "../config/prisma.js";

/**
 * Aggregates crew utilization, duty workload, and rest compliance analytics.
 * Subject: DE (Database Engineering / Data Processing)
 *
 * @param {Object} options
 * @param {string} [options.depot] - Filter by depot (optional)
 * @param {string} [options.role] - Filter by role: 'Driver' or 'Conductor' (optional)
 * @returns {Promise<Object>} Aggregated crew analytics metrics
 */
export async function getCrewUtilizationAnalytics({ depot, role } = {}) {
  const crewWhere = {};
  if (depot && depot !== "ALL") {
    crewWhere.assignedDepot = depot;
  }
  if (role && role !== "ALL") {
    crewWhere.role = role;
  }

  // 1. Crew Counts by Status and Role
  const [
    totalCrew,
    totalDrivers,
    totalConductors,
    availableCrew,
    onDutyCrew,
    onRestCrew,
    onLeaveCrew,
    allCrew,
    totalHandovers,
    allRestPeriods
  ] = await Promise.all([
    prisma.crew.count({ where: crewWhere }),
    prisma.crew.count({ where: { ...crewWhere, role: "Driver" } }),
    prisma.crew.count({ where: { ...crewWhere, role: "Conductor" } }),
    prisma.crew.count({ where: { ...crewWhere, status: "Available" } }),
    prisma.crew.count({ where: { ...crewWhere, status: "On Duty" } }),
    prisma.crew.count({ where: { ...crewWhere, status: "On Rest" } }),
    prisma.crew.count({ where: { ...crewWhere, status: "On Leave" } }),
    prisma.crew.findMany({
      where: crewWhere,
      select: {
        id: true,
        crewId: true,
        name: true,
        role: true,
        badgeNumber: true,
        licenseNumber: true,
        experienceYears: true,
        assignedDepot: true,
        status: true,
        phone: true,
        _count: {
          select: {
            crewAssignments: true,
            restPeriods: true,
            driverDuties: true,
            conductorDuties: true,
            handoversFrom: true,
            handoversTo: true
          }
        }
      },
      orderBy: { name: "asc" }
    }),
    prisma.dutyHandover.count(),
    prisma.restPeriod.findMany({
      select: {
        id: true,
        status: true,
        restStartTime: true,
        restEndTime: true
      }
    })
  ]);

  const availabilityRate = totalCrew > 0
    ? Math.round((availableCrew / totalCrew) * 1000) / 10
    : 0;

  const onDutyRate = totalCrew > 0
    ? Math.round((onDutyCrew / totalCrew) * 1000) / 10
    : 0;

  // 2. Rest Compliance Metrics
  const totalRestCount = allRestPeriods.length;
  const activeResting = allRestPeriods.filter((r) => r.status === "Resting").length;
  const completedRest = allRestPeriods.filter((r) => r.status === "Completed").length;

  let totalRestMinutes = 0;
  for (const period of allRestPeriods) {
    if (period.restStartTime && period.restEndTime) {
      const diffMs = new Date(period.restEndTime).getTime() - new Date(period.restStartTime).getTime();
      if (diffMs > 0) {
        totalRestMinutes += Math.round(diffMs / 60000);
      }
    }
  }

  const averageRestDurationMinutes = totalRestCount > 0
    ? Math.round(totalRestMinutes / totalRestCount)
    : 0;

  const restComplianceRate = totalRestCount > 0
    ? Math.round((completedRest / totalRestCount) * 1000) / 10
    : 100; // If no rest logged yet, 100% compliant

  // 3. Depot Workload Distribution
  const depotMap = {};
  const crewRoster = allCrew.map((c) => {
    const dName = c.assignedDepot || "Unassigned";
    if (!depotMap[dName]) {
      depotMap[dName] = {
        depot: dName,
        total: 0,
        drivers: 0,
        conductors: 0,
        available: 0,
        onDuty: 0,
        onRest: 0,
        onLeave: 0
      };
    }
    depotMap[dName].total += 1;
    if (c.role === "Driver") depotMap[dName].drivers += 1;
    if (c.role === "Conductor") depotMap[dName].conductors += 1;
    if (c.status === "Available") depotMap[dName].available += 1;
    if (c.status === "On Duty") depotMap[dName].onDuty += 1;
    if (c.status === "On Rest") depotMap[dName].onRest += 1;
    if (c.status === "On Leave") depotMap[dName].onLeave += 1;

    const totalDutiesCovered = c.role === "Driver"
      ? c._count.driverDuties
      : c._count.conductorDuties;

    return {
      id: c.id,
      crewId: c.crewId,
      name: c.name,
      role: c.role,
      badgeNumber: c.badgeNumber,
      licenseNumber: c.licenseNumber,
      experienceYears: c.experienceYears,
      assignedDepot: c.assignedDepot,
      status: c.status,
      phone: c.phone,
      dutiesCovered: totalDutiesCovered,
      assignmentsCount: c._count.crewAssignments,
      restPeriodsCount: c._count.restPeriods,
      handoversCount: c._count.handoversFrom + c._count.handoversTo
    };
  });

  const depotDistribution = Object.values(depotMap).map((d) => ({
    ...d,
    utilizationRate: d.total > 0 ? Math.round((d.onDuty / d.total) * 1000) / 10 : 0
  }));

  // 4. Top Active Personnel
  const topActiveCrew = [...crewRoster]
    .sort((a, b) => (b.dutiesCovered + b.assignmentsCount) - (a.dutiesCovered + a.assignmentsCount))
    .slice(0, 5);

  return {
    overview: {
      totalCrew,
      totalDrivers,
      totalConductors,
      availableCrew,
      onDutyCrew,
      onRestCrew,
      onLeaveCrew,
      availabilityRate,
      onDutyRate,
      totalHandovers
    },
    restCompliance: {
      totalRestRecords: totalRestCount,
      activeRestingCount: activeResting,
      completedRestCount: completedRest,
      averageRestMinutes: averageRestDurationMinutes,
      restCompliancePercentage: restComplianceRate
    },
    depotDistribution,
    topActiveCrew,
    crewRoster
  };
}
