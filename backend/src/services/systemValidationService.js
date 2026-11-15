import { prisma } from "../config/prisma.js";

/**
 * System-Wide Consistency and Cross-Module Integrity Validator.
 * Subject: ASD (Advanced Software Design)
 *
 * Validates cross-entity relational consistency across Buses, Crews, Trips,
 * Duties, Rest Periods, Handovers, and Route Geometries.
 */
export async function runSystemValidation() {
  const issues = [];

  const [
    buses,
    crews,
    trips,
    duties,
    routes,
    restPeriods
  ] = await Promise.all([
    prisma.bus.findMany({ include: { route: true, driver: true } }),
    prisma.crew.findMany(),
    prisma.trip.findMany({ include: { route: true, bus: true } }),
    prisma.duty.findMany({ include: { assignment: true } }),
    prisma.route.findMany({ include: { stops: true } }),
    prisma.restPeriod.findMany()
  ]);

  let totalChecks = 0;
  let passedChecks = 0;

  // 1. Bus Fleet Checks
  totalChecks += 1;
  let busIssue = false;
  for (const bus of buses) {
    if (!bus.busNumber || !bus.registrationNumber) {
      issues.push({
        category: "Bus Fleet",
        severity: "Error",
        entityId: bus.id,
        message: `Bus record missing busNumber or registrationNumber.`
      });
      busIssue = true;
    }
    if (bus.capacity < 10 || bus.capacity > 100) {
      issues.push({
        category: "Bus Fleet",
        severity: "Warning",
        entityId: bus.id,
        message: `Bus ${bus.busNumber} has unusual passenger capacity (${bus.capacity}).`
      });
      busIssue = true;
    }
    if (bus.routeId && !bus.route) {
      issues.push({
        category: "Bus Fleet",
        severity: "Error",
        entityId: bus.id,
        message: `Bus ${bus.busNumber} references missing route ${bus.routeId}.`
      });
      busIssue = true;
    }
  }
  if (!busIssue) passedChecks += 1;

  // 2. Crew Qualification & License Checks
  totalChecks += 1;
  let crewIssue = false;
  for (const crew of crews) {
    if (crew.role === "Driver" && (!crew.licenseNumber || crew.licenseNumber.trim() === "")) {
      issues.push({
        category: "Crew Compliance",
        severity: "Error",
        entityId: crew.id,
        message: `Driver ${crew.name} (${crew.crewId}) lacks a verified commercial driving license.`
      });
      crewIssue = true;
    }
    if (!crew.badgeNumber) {
      issues.push({
        category: "Crew Compliance",
        severity: "Error",
        entityId: crew.id,
        message: `Crew ${crew.name} missing mandatory DTC badge number.`
      });
      crewIssue = true;
    }
  }
  if (!crewIssue) passedChecks += 1;

  // 3. Trip Schedule & Time Consistency
  totalChecks += 1;
  let tripIssue = false;
  for (const trip of trips) {
    if (!trip.route) {
      issues.push({
        category: "Trip Operations",
        severity: "Error",
        entityId: trip.id,
        message: `Trip ${trip.tripNumber} is scheduled without an associated Route.`
      });
      tripIssue = true;
    }
    if (!trip.bus) {
      issues.push({
        category: "Trip Operations",
        severity: "Warning",
        entityId: trip.id,
        message: `Trip ${trip.tripNumber} has no bus asset assigned.`
      });
      tripIssue = true;
    }
    if (trip.departureTime && trip.arrivalTime && trip.departureTime === trip.arrivalTime) {
      issues.push({
        category: "Trip Operations",
        severity: "Error",
        entityId: trip.id,
        message: `Trip ${trip.tripNumber} departure and arrival times are identical (${trip.departureTime}).`
      });
      tripIssue = true;
    }
  }
  if (!tripIssue) passedChecks += 1;

  // 4. Duty Shift & Handover Constraints
  totalChecks += 1;
  let dutyIssue = false;
  for (const duty of duties) {
    if (duty.totalDurationHours > 8.05) {
      issues.push({
        category: "Duty Scheduling",
        severity: "Warning",
        entityId: duty.id,
        message: `Duty ${duty.dutyNumber} exceeds standard 8.0 hr shift limit (${duty.totalDurationHours} hrs).`
      });
      dutyIssue = true;
    }
    if (duty.assignment) {
      if (duty.assignment.driverId === duty.assignment.conductorId) {
        issues.push({
          category: "Duty Scheduling",
          severity: "Error",
          entityId: duty.id,
          message: `Duty ${duty.dutyNumber} assigns identical crew ID as both driver and conductor.`
        });
        dutyIssue = true;
      }
    }
  }
  if (!dutyIssue) passedChecks += 1;

  // 5. Route Geometry & Stops Check
  totalChecks += 1;
  let routeIssue = false;
  for (const r of routes) {
    if (!r.startingPoint || !r.destination) {
      issues.push({
        category: "Network Routes",
        severity: "Warning",
        entityId: r.id,
        message: `Route ${r.routeNumber} has missing start or destination terminals.`
      });
      routeIssue = true;
    }
    // Check stop sequence order
    const seqs = r.stops.map((s) => s.sequenceNumber);
    const uniqueSeqs = new Set(seqs);
    if (seqs.length !== uniqueSeqs.size) {
      issues.push({
        category: "Network Routes",
        severity: "Error",
        entityId: r.id,
        message: `Route ${r.routeNumber} contains duplicate stop sequence numbers.`
      });
      routeIssue = true;
    }
  }
  if (!routeIssue) passedChecks += 1;

  // 6. Rest Period Integrity
  totalChecks += 1;
  let restIssue = false;
  for (const rp of restPeriods) {
    if (rp.restStartTime && rp.restEndTime) {
      if (new Date(rp.restEndTime) < new Date(rp.restStartTime)) {
        issues.push({
          category: "Rest Management",
          severity: "Error",
          entityId: rp.id,
          message: `Rest period has restEndTime earlier than restStartTime.`
        });
        restIssue = true;
      }
    }
  }
  if (!restIssue) passedChecks += 1;

  const errorsCount = issues.filter((i) => i.severity === "Error").length;
  const warningsCount = issues.filter((i) => i.severity === "Warning").length;

  let overallStatus = "Healthy";
  if (errorsCount > 0) overallStatus = "Action Required";
  else if (warningsCount > 0) overallStatus = "Warnings Present";

  return {
    status: overallStatus,
    summary: {
      totalDomainsChecked: totalChecks,
      healthyDomainsCount: passedChecks,
      errorsCount,
      warningsCount,
      totalIssuesFound: issues.length
    },
    issues
  };
}
