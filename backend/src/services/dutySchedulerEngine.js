import { Op } from "sequelize";
import {
  sequelize,
  Bus,
  Crew,
  Duty,
  DutyAssignment,
  Trip,
  Route
} from "../models/index.js";
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
    // 1. Fetch scheduled trips on target date
    const tripWhere = {
      tripDate: shiftDate,
      status: { [Op.in]: ["Scheduled", "In Progress"] }
    };

    const trips = await Trip.findAll({
      where: tripWhere,
      include: [
        {
          model: Bus,
          as: "bus",
          where: depot ? { depot } : {},
          attributes: ["id", "busNumber", "registrationNumber", "depot", "status"]
        },
        {
          model: Route,
          as: "route",
          attributes: ["id", "routeNumber", "routeName"]
        }
      ],
      order: [["departureTime", "ASC"]]
    });

    if (trips.length === 0) {
      return {
        success: false,
        message: `No active or scheduled trips found for date ${shiftDate}${depot ? ` at ${depot}` : ""}.`,
        dutiesCreated: 0,
        duties: []
      };
    }

    // 2. Group trips by busId
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

    // 3. Fetch candidate crew pool (Available or off-duty, not On Leave)
    const crewWhere = {
      status: { [Op.ne]: "On Leave" },
      ...(depot ? { assignedDepot: depot } : {})
    };

    const allDrivers = await Crew.findAll({
      where: { ...crewWhere, role: "Driver" },
      order: [["experienceYears", "DESC"]]
    });

    const allConductors = await Crew.findAll({
      where: { ...crewWhere, role: "Conductor" },
      order: [["experienceYears", "DESC"]]
    });

    const assignedDriverIds = new Set();
    const assignedConductorIds = new Set();
    const createdDuties = [];
    const warnings = [];

    let dutySequence = 1;

    // 4. Process each bus and form linked duties
    for (const [busId, { bus, trips: busTrips }] of busTripMap.entries()) {
      if (bus.status === "Maintenance" || bus.status === "Inactive") {
        warnings.push(`Skipped Bus ${bus.busNumber}: Fleet status is '${bus.status}'.`);
        continue;
      }

      // Earliest departure and latest arrival
      const earliestDeparture = busTrips[0].departureTime;
      const latestArrival = busTrips[busTrips.length - 1].arrivalTime;

      // Add 20-min buffer before start and 15-min post-duty buffer
      const bufferedStartMin = Math.max(0, timeStringToMinutes(earliestDeparture) - 20);
      const bufferedEndMin = Math.min(23 * 60 + 59, timeStringToMinutes(latestArrival) + 15);

      const shiftStart = minutesToTimeString(bufferedStartMin);
      const shiftEnd = minutesToTimeString(bufferedEndMin);

      let durationHours = calculateShiftDurationHours(shiftStart, shiftEnd);

      // Clamp max single duty duration to standard 8.0 hrs if slightly over
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

      // Find an available Driver not already assigned
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

      // Find an available Conductor not already assigned
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

      // Mark crew as used in this scheduling run
      assignedDriverIds.add(selectedDriver.id);
      assignedConductorIds.add(selectedConductor.id);

      // Generate unique duty identifier (e.g. DTC-LNK-20261113-BBM-001)
      const cleanDate = shiftDate.replace(/-/g, "");
      const depotCode = (bus.depot || "DEL").replace(/[^a-zA-Z]/g, "").slice(0, 3).toUpperCase();
      const dutyNumber = `DTC-LNK-${cleanDate}-${depotCode}-${String(dutySequence).padStart(3, "0")}`;
      dutySequence++;

      // Create Duty
      const duty = await Duty.create({
        dutyNumber,
        shiftType,
        shiftDate,
        startTime: shiftStart,
        endTime: shiftEnd,
        depot: bus.depot || depot || "BBM Depot",
        totalDurationHours: durationHours,
        status: "Scheduled",
        schedulingType: "Linked"
      });

      // Create permanent 1:1 Linked DutyAssignment
      const assignment = await DutyAssignment.create({
        dutyId: duty.id,
        busId: bus.id,
        driverId: selectedDriver.id,
        conductorId: selectedConductor.id,
        vehicleHandoverVerified: true,
        totalTripsCovered: busTrips.length,
        notes: `Automated Linked Schedule: ${selectedDriver.name} (Driver) & ${selectedConductor.name} (Conductor) permanently bound to Bus ${bus.busNumber} covering ${busTrips.length} trips.`
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
