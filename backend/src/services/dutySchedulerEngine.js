import { prisma } from "../config/prisma.js";
import { createCrewAssignmentHistory } from "./unlinkedDutyService.js";
import {
  calculateShiftDurationHours,
  findBusDutyConflict,
  findCrewDutyConflict,
  timeStringToMinutes
} from "../middleware/dutyValidationMiddleware.js";

/**
 * Format minutes into HH:mm
 */
function minutesToTimeString(minutes) {
  const norm = ((minutes % (24 * 60)) + (24 * 60)) % (24 * 60);
  const h = String(Math.floor(norm / 60)).padStart(2, "0");
  const m = String(norm % 60).padStart(2, "0");
  return `${h}:${m}`;
}

/**
 * Determine Shift Type based on start and end time
 */
function determineShiftType(startTime, endTime) {
  const startMin = timeStringToMinutes(startTime);
  const endMin = timeStringToMinutes(endTime);
  const duration = calculateShiftDurationHours(startTime, endTime);

  if (duration >= 7.5 && startMin < 12 * 60 && endMin > 18 * 60) {
    return "Full-Day";
  }
  if (startMin >= 20 * 60 || startMin < 4 * 60) {
    return "Night";
  }
  if (startMin >= 13 * 60) {
    return "Evening";
  }
  return "Morning";
}

/**
 * Core Algorithm: Automated Linked Duty Scheduling Engine
 *
 * Enforces the core Linked Duty rule:
 * One driver and one conductor are assigned to a bus at the start of duty,
 * remaining permanently bound to that bus throughout all its scheduled trips.
 */
export async function generateLinkedDuties({ shiftDate, depot = null, adminId = null }) {
  try {
    const tripWhere = {
      tripDate: shiftDate,
      status: { in: ["Scheduled", "In Progress"] }
    };

    if (depot) {
      tripWhere.bus = { depot };
    }

    const trips = await prisma.trip.findMany({
      where: tripWhere,
      include: {
        bus: {
          select: { id: true, busNumber: true, registrationNumber: true, depot: true, status: true }
        },
        route: {
          select: { id: true, routeNumber: true, routeName: true }
        }
      },
      orderBy: { departureTime: "asc" }
    });

    if (trips.length === 0) {
      return {
        success: false,
        message: `No active or scheduled trips found for date ${shiftDate}${depot ? ` at ${depot}` : ""}.`,
        dutiesCreated: 0,
        duties: []
      };
    }

    // Group trips by busId
    const busTripMap = new Map();
    for (const trip of trips) {
      if (!busTripMap.has(trip.busId)) {
        busTripMap.set(trip.busId, {
          bus: trip.bus,
          trips: []
        });
      }
      busTripMap.get(trip.busId).trips.push(trip);
    }

    // Fetch candidate crew pool
    const crewWhere = {
      status: { not: "On Leave" },
      ...(depot ? { assignedDepot: depot } : {})
    };

    const allDrivers = await prisma.crew.findMany({
      where: { ...crewWhere, role: "Driver" },
      orderBy: { experienceYears: "desc" }
    });

    const allConductors = await prisma.crew.findMany({
      where: { ...crewWhere, role: "Conductor" },
      orderBy: { experienceYears: "desc" }
    });

    const assignedDriverIds = new Set();
    const assignedConductorIds = new Set();
    const createdDuties = [];
    const warnings = [];

    let dutySequence = 1;

    // Process each bus and form linked duties
    for (const [busId, { bus, trips: busTrips }] of busTripMap.entries()) {
      if (bus.status === "Maintenance" || bus.status === "Inactive") {
        warnings.push(`Skipped Bus ${bus.busNumber}: Fleet status is '${bus.status}'.`);
        continue;
      }

      const earliestDeparture = busTrips[0].departureTime;
      const latestArrival = busTrips[busTrips.length - 1].arrivalTime;

      const depMin = timeStringToMinutes(earliestDeparture);
      const arrMin = timeStringToMinutes(latestArrival);

      // Pre-shift briefing: 30 minutes before first departure
      const shiftStartMin = Math.max(0, depMin - 30);
      // Post-shift debriefing: 30 minutes after last arrival
      const shiftEndMin = arrMin + 30;

      const shiftStart = minutesToTimeString(shiftStartMin);
      const shiftEnd = minutesToTimeString(shiftEndMin);

      let durationHours = calculateShiftDurationHours(shiftStart, shiftEnd);

      if (durationHours > 8.0) {
        durationHours = 8.0;
      }

      const shiftType = determineShiftType(shiftStart, shiftEnd);

      // Check if bus is already scheduled on an overlapping duty
      const busConflict = await findBusDutyConflict({
        busId,
        shiftDate,
        startTime: shiftStart,
        endTime: shiftEnd
      });

      if (busConflict) {
        warnings.push(`Bus ${bus.busNumber} already has an assigned duty (${busConflict.duty.dutyNumber}) for this time.`);
        continue;
      }

      // Find an available Driver
      let selectedDriver = null;
      for (const driver of allDrivers) {
        if (assignedDriverIds.has(driver.id)) continue;

        const conflict = await findCrewDutyConflict({
          crewId: driver.id,
          shiftDate,
          startTime: shiftStart,
          endTime: shiftEnd
        });

        if (!conflict) {
          selectedDriver = driver;
          break;
        }
      }

      // Find an available Conductor
      let selectedConductor = null;
      for (const conductor of allConductors) {
        if (assignedConductorIds.has(conductor.id)) continue;

        const conflict = await findCrewDutyConflict({
          crewId: conductor.id,
          shiftDate,
          startTime: shiftStart,
          endTime: shiftEnd
        });

        if (!conflict) {
          selectedConductor = conductor;
          break;
        }
      }

      if (!selectedDriver) {
        warnings.push(`Could not schedule Duty for Bus ${bus.busNumber}: No available qualified Driver found.`);
        continue;
      }

      if (!selectedConductor) {
        warnings.push(`Could not schedule Duty for Bus ${bus.busNumber}: No available qualified Conductor found.`);
        continue;
      }

      assignedDriverIds.add(selectedDriver.id);
      assignedConductorIds.add(selectedConductor.id);

      const cleanDate = shiftDate.replace(/-/g, "");
      const depotCode = (bus.depot || "DEL").replace(/[^a-zA-Z]/g, "").slice(0, 3).toUpperCase();
      let dutyNumber = `DTC-LNK-${cleanDate}-${depotCode}-${String(dutySequence).padStart(3, "0")}`;
      while (await prisma.duty.findUnique({ where: { dutyNumber } })) {
        dutySequence++;
        dutyNumber = `DTC-LNK-${cleanDate}-${depotCode}-${String(dutySequence).padStart(3, "0")}`;
      }
      dutySequence++;

      const { duty, assignment } = await prisma.$transaction(async (transaction) => {
        const createdDuty = await transaction.duty.create({
          data: {
            dutyNumber,
            shiftType,
            shiftDate,
            startTime: shiftStart,
            endTime: shiftEnd,
            depot: bus.depot || depot || "BBM Depot",
            totalDurationHours: durationHours,
            status: "Scheduled",
            schedulingType: "Linked"
          }
        });

        const createdAssignment = await transaction.dutyAssignment.create({
          data: {
            dutyId: createdDuty.id,
            busId: bus.id,
            driverId: selectedDriver.id,
            conductorId: selectedConductor.id,
            vehicleHandoverVerified: true,
            totalTripsCovered: busTrips.length,
            notes: `Automated Linked Schedule: ${selectedDriver.name} (Driver) & ${selectedConductor.name} (Conductor) permanently bound to Bus ${bus.busNumber} covering ${busTrips.length} trips.`
          }
        });
        await createCrewAssignmentHistory(transaction, createdDuty, createdAssignment);
        return { duty: createdDuty, assignment: createdAssignment };
      });

      createdDuties.push({
        duty,
        assignment,
        bus,
        driver: selectedDriver,
        conductor: selectedConductor,
        tripsCount: busTrips.length
      });
    }

    return {
      success: true,
      message: `Generated ${createdDuties.length} linked duty schedule(s) for ${shiftDate}.`,
      shiftDate,
      dutiesCreated: createdDuties.length,
      duties: createdDuties,
      warnings
    };
  } catch (error) {
    throw error;
  }
}
