import { prisma } from "../config/prisma.js";

export const VALID_SHIFT_TYPES = ["Morning", "Evening", "Full-Day", "Night"];
export const VALID_DUTY_STATUSES = ["Scheduled", "Active", "Completed", "Cancelled"];
const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Converts HH:mm(:ss) time string into minutes from midnight
 */
export function timeStringToMinutes(timeStr) {
  if (!timeStr) return 0;
  const parts = timeStr.split(":").map(Number);
  return parts[0] * 60 + parts[1];
}

/**
 * Calculates shift duration in decimal hours (e.g. 8.0)
 */
export function calculateShiftDurationHours(startTime, endTime) {
  const startMin = timeStringToMinutes(startTime);
  const endMin = timeStringToMinutes(endTime);

  let durationMin = endMin - startMin;
  if (durationMin < 0) {
    // Overnight shift crossing midnight
    durationMin += 24 * 60;
  }
  return Number((durationMin / 60).toFixed(2));
}

/**
 * Checks whether intervals [startA, endA] and [startB, endB] overlap
 */
export function intervalsOverlap(startA, endA, startB, endB) {
  return Math.max(startA, startB) < Math.min(endA, endB);
}

/**
 * Check if a bus is already assigned to an overlapping active or scheduled duty
 */
export async function findBusDutyConflict({ busId, shiftDate, startTime, endTime, excludeDutyId = null }) {
  const targetStart = timeStringToMinutes(startTime);
  const targetEnd = timeStringToMinutes(endTime);

  const existingAssignments = await prisma.dutyAssignment.findMany({
    where: {
      busId,
      duty: {
        shiftDate,
        status: { in: ["Scheduled", "Active"] },
        ...(excludeDutyId ? { id: { not: excludeDutyId } } : {})
      }
    },
    include: {
      duty: true,
      bus: true
    }
  });

  for (const item of existingAssignments) {
    const existingStart = timeStringToMinutes(item.duty.startTime);
    const existingEnd = timeStringToMinutes(item.duty.endTime);
    if (intervalsOverlap(targetStart, targetEnd, existingStart, existingEnd)) {
      return item;
    }
  }

  return null;
}

/**
 * Check if a crew member (driver or conductor) is already booked on an overlapping duty
 */
export async function findCrewDutyConflict({ crewId, shiftDate, startTime, endTime, excludeDutyId = null }) {
  const targetStart = timeStringToMinutes(startTime);
  const targetEnd = timeStringToMinutes(endTime);

  const existingAssignments = await prisma.dutyAssignment.findMany({
    where: {
      OR: [{ driverId: crewId }, { conductorId: crewId }],
      duty: {
        shiftDate,
        status: { in: ["Scheduled", "Active"] },
        ...(excludeDutyId ? { id: { not: excludeDutyId } } : {})
      }
    },
    include: {
      duty: true
    }
  });

  for (const item of existingAssignments) {
    const existingStart = timeStringToMinutes(item.duty.startTime);
    const existingEnd = timeStringToMinutes(item.duty.endTime);
    if (intervalsOverlap(targetStart, targetEnd, existingStart, existingEnd)) {
      return item;
    }
  }

  return null;
}

/**
 * Middleware: Validate manual duty creation request
 */
export async function validateCreateDuty(req, res, next) {
  try {
    const {
      dutyNumber,
      shiftType = "Morning",
      shiftDate,
      startTime,
      endTime,
      depot = "BBM Depot",
      busId,
      driverId,
      conductorId
    } = req.body;

    const errors = [];

    if (!dutyNumber || typeof dutyNumber !== "string" || !dutyNumber.trim()) {
      errors.push("Duty number is required.");
    }

    if (!VALID_SHIFT_TYPES.includes(shiftType)) {
      errors.push(`Invalid shift type. Must be one of: ${VALID_SHIFT_TYPES.join(", ")}`);
    }

    if (!shiftDate || !DATE_REGEX.test(shiftDate)) {
      errors.push("Valid shift date is required (YYYY-MM-DD format).");
    }

    if (!startTime || !TIME_REGEX.test(startTime)) {
      errors.push("Valid shift start time is required (HH:mm format).");
    }

    if (!endTime || !TIME_REGEX.test(endTime)) {
      errors.push("Valid shift end time is required (HH:mm format).");
    }

    if (startTime && endTime) {
      if (startTime === endTime) {
        errors.push("Shift start time and end time cannot be identical.");
      }
      const durationHours = calculateShiftDurationHours(startTime, endTime);
      if (durationHours > 8.0) {
        errors.push(`Shift duration (${durationHours} hrs) exceeds standard maximum linked duty limit of 8.0 hours.`);
      }
      if (durationHours < 0.5) {
        errors.push("Shift duration must be at least 30 minutes.");
      }
    }

    if (!busId || !UUID_REGEX.test(busId)) {
      errors.push("A valid bus selection is required.");
    }

    if (!driverId || !UUID_REGEX.test(driverId)) {
      errors.push("A valid driver selection is required.");
    }

    if (!conductorId || !UUID_REGEX.test(conductorId)) {
      errors.push("A valid conductor selection is required.");
    }

    if (driverId && conductorId && driverId === conductorId) {
      errors.push("Driver and Conductor cannot be the same crew member.");
    }

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        error: errors[0],
        errors
      });
    }

    // Database verification: Verify Bus status
    const bus = await prisma.bus.findUnique({ where: { id: busId } });
    if (!bus) {
      return res.status(404).json({ success: false, error: "Selected bus was not found in fleet records." });
    }
    if (bus.status === "Maintenance" || bus.status === "Inactive") {
      return res.status(400).json({
        success: false,
        error: `Cannot assign bus ${bus.busNumber} because its status is '${bus.status}'.`
      });
    }

    // Database verification: Verify Driver role
    const driver = await prisma.crew.findUnique({ where: { id: driverId } });
    if (!driver) {
      return res.status(404).json({ success: false, error: "Selected driver was not found in crew records." });
    }
    if (driver.role !== "Driver") {
      return res.status(400).json({ success: false, error: `${driver.name} is registered as a ${driver.role}, not a Driver.` });
    }
    if (driver.status === "On Leave") {
      return res.status(400).json({ success: false, error: `Driver ${driver.name} is currently 'On Leave'.` });
    }

    // Database verification: Verify Conductor role
    const conductor = await prisma.crew.findUnique({ where: { id: conductorId } });
    if (!conductor) {
      return res.status(404).json({ success: false, error: "Selected conductor was not found in crew records." });
    }
    if (conductor.role !== "Conductor") {
      return res.status(400).json({ success: false, error: `${conductor.name} is registered as a ${conductor.role}, not a Conductor.` });
    }
    if (conductor.status === "On Leave") {
      return res.status(400).json({ success: false, error: `Conductor ${conductor.name} is currently 'On Leave'.` });
    }

    // Overlap checks: Bus
    const busConflict = await findBusDutyConflict({ busId, shiftDate, startTime, endTime });
    if (busConflict) {
      return res.status(409).json({
        success: false,
        error: `Bus ${bus.busNumber} is already committed to duty ${busConflict.duty.dutyNumber} during this time window.`
      });
    }

    // Overlap checks: Driver
    const driverConflict = await findCrewDutyConflict({ crewId: driverId, shiftDate, startTime, endTime });
    if (driverConflict) {
      return res.status(409).json({
        success: false,
        error: `Driver ${driver.name} is already assigned to duty ${driverConflict.duty.dutyNumber} during this shift.`
      });
    }

    // Overlap checks: Conductor
    const conductorConflict = await findCrewDutyConflict({ crewId: conductorId, shiftDate, startTime, endTime });
    if (conductorConflict) {
      return res.status(409).json({
        success: false,
        error: `Conductor ${conductor.name} is already assigned to duty ${conductorConflict.duty.dutyNumber} during this shift.`
      });
    }

    next();
  } catch (err) {
    next(err);
  }
}

/**
 * Middleware: Validate update duty request
 */
export async function validateUpdateDuty(req, res, next) {
  try {
    const { status, shiftType, startTime, endTime } = req.body;
    const errors = [];

    if (status !== undefined && !VALID_DUTY_STATUSES.includes(status)) {
      errors.push(`Invalid status. Must be one of: ${VALID_DUTY_STATUSES.join(", ")}`);
    }

    if (shiftType !== undefined && !VALID_SHIFT_TYPES.includes(shiftType)) {
      errors.push(`Invalid shift type. Must be one of: ${VALID_SHIFT_TYPES.join(", ")}`);
    }

    if (startTime !== undefined && !TIME_REGEX.test(startTime)) {
      errors.push("Invalid start time format (HH:mm required).");
    }

    if (endTime !== undefined && !TIME_REGEX.test(endTime)) {
      errors.push("Invalid end time format (HH:mm required).");
    }

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        error: errors[0],
        errors
      });
    }

    next();
  } catch (err) {
    next(err);
  }
}

/**
 * Middleware: Validate automated linked duty generation request
 */
export function validateGenerateLinkedDuties(req, res, next) {
  const { shiftDate, depot } = req.body;
  const errors = [];

  if (!shiftDate || !DATE_REGEX.test(shiftDate)) {
    errors.push("Target shift date is required (YYYY-MM-DD format).");
  }

  if (depot && typeof depot !== "string") {
    errors.push("Depot must be a valid text string.");
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      error: errors[0],
      errors
    });
  }

  next();
}
