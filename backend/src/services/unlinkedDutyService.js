import { randomUUID } from "node:crypto";

const DAY_MS = 24 * 60 * 60 * 1000;
const ACTIVE_ASSIGNMENT_STATUSES = ["Scheduled", "Active"];

export function getRequiredRestMinutes() {
  const configured = process.env.UNLINKED_DUTY_REST_MINUTES;
  const minutes = configured === undefined || configured === "" ? 480 : Number(configured);
  if (!Number.isSafeInteger(minutes) || minutes < 1 || minutes > 1440) {
    throw new Error("UNLINKED_DUTY_REST_MINUTES must be a whole number between 1 and 1440.");
  }
  return minutes;
}

export function makeDutyInterval(shiftDate, startTime, endTime) {
  if (!isValidDate(shiftDate)) return { error: "shiftDate must be a valid calendar date in YYYY-MM-DD format." };
  if (!validTime(startTime) || !validTime(endTime) || startTime === endTime) {
    return { error: "startTime and endTime must be different valid HH:mm times." };
  }
  const start = localDateTimeToUTC(shiftDate, startTime);
  let end = localDateTimeToUTC(shiftDate, endTime);
  if (end <= start) end = new Date(end.getTime() + DAY_MS);
  const durationMinutes = (end.getTime() - start.getTime()) / 60000;
  if (durationMinutes < 30 || durationMinutes > 8 * 60) {
    return { error: "A duty must be between 30 minutes and 8 hours." };
  }
  return { start, end, durationMinutes };
}

export function isValidDate(value) {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)
    && !Number.isNaN(Date.parse(`${value}T00:00:00Z`))
    && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;
}

export function localDateBoundary(date, endOfDay = false) {
  if (!isValidDate(date)) return null;
  return new Date(`${date}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}+05:30`);
}

function validTime(value) {
  return typeof value === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

function localDateTimeToUTC(date, time) {
  return new Date(`${date}T${time}:00+05:30`);
}

export function dutyInterval(duty) {
  return makeDutyInterval(duty.shiftDate, duty.startTime.slice(0, 5), duty.endTime.slice(0, 5));
}

export function intervalOverlaps(startA, endA, startB, endB) {
  return startA < endB && startB < endA;
}

export async function assertBusAvailable(transaction, busId, start, end, excludeDutyId = null) {
  const assignments = await transaction.dutyAssignment.findMany({
    where: {
      busId,
      duty: {
        status: { in: ACTIVE_ASSIGNMENT_STATUSES },
        ...(excludeDutyId ? { id: { not: excludeDutyId } } : {})
      }
    },
    include: { duty: true, bus: true }
  });
  for (const assignment of assignments) {
    const interval = dutyInterval(assignment.duty);
    if (interval.start && intervalOverlaps(start, end, interval.start, interval.end)) {
      throw conflict(`Bus ${assignment.bus.busNumber} overlaps duty ${assignment.duty.dutyNumber}.`);
    }
  }

  const unlinkedAssignments = await transaction.crewAssignment.findMany({
    where: {
      busId,
      status: { in: ACTIVE_ASSIGNMENT_STATUSES },
      ...(excludeDutyId ? { dutyId: { not: excludeDutyId } } : {}),
      assignmentStartTime: { lt: end },
      assignmentEndTime: { gt: start }
    },
    include: { bus: true, duty: true }
  });
  if (unlinkedAssignments.length) {
    throw conflict(`Bus ${unlinkedAssignments[0].bus.busNumber} is already assigned to duty ${unlinkedAssignments[0].duty.dutyNumber}.`);
  }
}

export async function assertCrewAvailable(transaction, crewId, role, start, end, { ignoreDutyId = null } = {}) {
  const crew = await transaction.crew.findUnique({ where: { id: crewId } });
  if (!crew) throw notFound(`Selected ${role.toLowerCase()} was not found.`);
  if (crew.role !== role) throw badRequest(`${crew.name} is a ${crew.role}, not a ${role}.`);
  if (!["Available", "On Rest", "On Duty"].includes(crew.status)) {
    throw conflict(`${role} ${crew.name} is ${crew.status.toLowerCase()} and cannot be assigned.`);
  }

  const conflictAssignment = await transaction.crewAssignment.findFirst({
    where: {
      crewId,
      status: { in: ACTIVE_ASSIGNMENT_STATUSES },
      ...(ignoreDutyId ? { dutyId: { not: ignoreDutyId } } : {}),
      assignmentStartTime: { lt: end },
      assignmentEndTime: { gt: start }
    },
    include: { duty: true }
  });
  if (conflictAssignment) {
    throw conflict(`${role} ${crew.name} overlaps duty ${conflictAssignment.duty.dutyNumber}.`);
  }

  const incompletePrevious = await transaction.crewAssignment.findFirst({
    where: {
      crewId,
      status: { in: ACTIVE_ASSIGNMENT_STATUSES },
      assignmentStartTime: { lt: start },
      assignmentEndTime: { lte: start },
      ...(ignoreDutyId ? { dutyId: { not: ignoreDutyId } } : {})
    },
    include: { duty: true }
  });
  if (incompletePrevious) {
    throw conflict(`Previous duty ${incompletePrevious.duty.dutyNumber} must be completed before this crew member can be reassigned.`);
  }

  const latestRest = await transaction.restPeriod.findFirst({
    where: { crewId },
    orderBy: { restStartTime: "desc" }
  });
  if (latestRest && start < latestRest.restEndTime) {
    throw conflict(
      `${role} ${crew.name} is resting until ${latestRest.restEndTime.toISOString()}.`,
      { earliestAvailableAt: latestRest.restEndTime.toISOString() }
    );
  }
  return crew;
}

export function conflict(message, details = {}) {
  return Object.assign(new Error(message), { statusCode: 409, details });
}

export function badRequest(message) {
  return Object.assign(new Error(message), { statusCode: 400 });
}

export function notFound(message) {
  return Object.assign(new Error(message), { statusCode: 404 });
}

export async function createDutyWithCrew(transaction, {
  dutyNumber,
  shiftDate,
  startTime,
  endTime,
  durationMinutes,
  bus,
  driver,
  conductor,
  depot,
  previousDutyId
}) {
  const duty = await transaction.duty.create({
    data: {
      dutyNumber: dutyNumber || `DTC-UNL-${shiftDate.replaceAll("-", "")}-${randomUUID().slice(0, 8).toUpperCase()}`,
      shiftType: "Unlinked",
      shiftDate,
      startTime,
      endTime,
      depot: depot || bus.depot || "BBM Depot",
      totalDurationHours: Number((durationMinutes / 60).toFixed(2)),
      status: "Scheduled",
      schedulingType: "Unlinked",
      assignment: {
        create: {
          busId: bus.id,
          driverId: driver.id,
          conductorId: conductor.id,
          vehicleHandoverVerified: true,
          notes: previousDutyId ? `Unlinked bus handover from duty ${previousDutyId}.` : "Unlinked duty assignment."
        }
      }
    }
  });

  const { start, end } = makeDutyInterval(shiftDate, startTime, endTime);
  const assignmentRows = await Promise.all([
    transaction.crewAssignment.create({
      data: {
        crewId: driver.id, busId: bus.id, dutyId: duty.id, role: "Driver",
        assignmentStartTime: start, assignmentEndTime: end, status: "Scheduled"
      }
    }),
    transaction.crewAssignment.create({
      data: {
        crewId: conductor.id, busId: bus.id, dutyId: duty.id, role: "Conductor",
        assignmentStartTime: start, assignmentEndTime: end, status: "Scheduled"
      }
    })
  ]);
  return { duty, assignmentRows };
}

export async function createCrewAssignmentHistory(transaction, duty, assignment) {
  if (!isValidDate(duty.shiftDate) || !validTime(duty.startTime.slice(0, 5)) || !validTime(duty.endTime.slice(0, 5))) {
    throw badRequest("Duty date and times are invalid; assignment history could not be recorded.");
  }
  const start = localDateTimeToUTC(duty.shiftDate, duty.startTime.slice(0, 5));
  let end = localDateTimeToUTC(duty.shiftDate, duty.endTime.slice(0, 5));
  if (end <= start) end = new Date(end.getTime() + DAY_MS);
  return Promise.all([
    transaction.crewAssignment.create({
      data: {
        crewId: assignment.driverId,
        busId: assignment.busId,
        dutyId: duty.id,
        role: "Driver",
        assignmentStartTime: start,
        assignmentEndTime: end,
        status: duty.status === "Active" ? "Active" : "Scheduled"
      }
    }),
    transaction.crewAssignment.create({
      data: {
        crewId: assignment.conductorId,
        busId: assignment.busId,
        dutyId: duty.id,
        role: "Conductor",
        assignmentStartTime: start,
        assignmentEndTime: end,
        status: duty.status === "Active" ? "Active" : "Scheduled"
      }
    })
  ]);
}

export async function recordRestPeriods(transaction, dutyId, completedAt) {
  const requiredRestDurationMinutes = getRequiredRestMinutes();
  const assignments = await transaction.crewAssignment.findMany({
    where: { dutyId, status: "Completed", completedAt: { not: null } }
  });
  const restEndTime = new Date(completedAt.getTime() + requiredRestDurationMinutes * 60000);
  for (const assignment of assignments) {
    await transaction.restPeriod.upsert({
      where: { crewId_previousDutyId: { crewId: assignment.crewId, previousDutyId: dutyId } },
      update: {
        restStartTime: completedAt,
        requiredRestDurationMinutes,
        restEndTime,
        status: restEndTime > new Date() ? "Resting" : "Completed"
      },
      create: {
        crewId: assignment.crewId,
        previousDutyId: dutyId,
        restStartTime: completedAt,
        requiredRestDurationMinutes,
        restEndTime,
        status: restEndTime > new Date() ? "Resting" : "Completed"
      }
    });
  }
}

export async function completeDuty(transaction, duty, completedAt = new Date()) {
  await transaction.duty.update({ where: { id: duty.id }, data: { status: "Completed" } });
  const assignments = await transaction.crewAssignment.findMany({
    where: { dutyId: duty.id, status: { in: ACTIVE_ASSIGNMENT_STATUSES } }
  });
  for (const assignment of assignments) {
    await transaction.crewAssignment.update({
      where: { id: assignment.id },
      data: { status: "Completed", assignmentEndTime: completedAt, completedAt }
    });
  }
  await recordRestPeriods(transaction, duty.id, completedAt);
}

export async function availabilityForCrew(transaction, crew, at = new Date()) {
  const [activeAssignment, latestAssignment, latestRest] = await Promise.all([
    transaction.crewAssignment.findFirst({
      where: {
        crewId: crew.id,
        status: { in: ACTIVE_ASSIGNMENT_STATUSES },
        assignmentStartTime: { lte: at },
        assignmentEndTime: { gt: at }
      },
      include: { duty: true, bus: true },
      orderBy: { assignmentStartTime: "asc" }
    }),
    transaction.crewAssignment.findFirst({
      where: { crewId: crew.id, status: "Completed", completedAt: { not: null } },
      include: { duty: true, bus: true },
      orderBy: { completedAt: "desc" }
    }),
    transaction.restPeriod.findFirst({
      where: { crewId: crew.id },
      orderBy: { restStartTime: "desc" }
    })
  ]);

  let availability = "Available";
  if (crew.status === "On Leave" || !["Available", "On Rest", "On Duty"].includes(crew.status)) {
    availability = "Not Available";
  } else if (activeAssignment) {
    availability = "On Duty";
  } else if (latestRest && latestRest.restEndTime > at) {
    availability = "Resting";
  }

  const requiredRestMinutes = latestRest?.requiredRestDurationMinutes ?? getRequiredRestMinutes();
  const remainingRestMinutes = latestRest && latestRest.restEndTime > at
    ? Math.ceil((latestRest.restEndTime.getTime() - at.getTime()) / 60000)
    : 0;
  return {
    id: crew.id,
    crewId: crew.crewId,
    name: crew.name,
    role: crew.role,
    badgeNumber: crew.badgeNumber,
    status: availability,
    sourceStatus: crew.status,
    requiredRestMinutes,
    remainingRestMinutes,
    availableAt: latestRest?.restEndTime?.toISOString() || null,
    lastDutyCompletedAt: latestAssignment?.completedAt?.toISOString() || null,
    currentAssignment: activeAssignment ? {
      dutyId: activeAssignment.dutyId,
      dutyNumber: activeAssignment.duty.dutyNumber,
      busId: activeAssignment.busId,
      busNumber: activeAssignment.bus.busNumber,
      startTime: activeAssignment.assignmentStartTime.toISOString(),
      endTime: activeAssignment.assignmentEndTime.toISOString()
    } : null,
    lastDuty: latestAssignment ? {
      dutyId: latestAssignment.dutyId,
      dutyNumber: latestAssignment.duty.dutyNumber,
      busNumber: latestAssignment.bus.busNumber,
      startTime: latestAssignment.assignmentStartTime.toISOString(),
      endTime: latestAssignment.assignmentEndTime.toISOString()
    } : null
  };
}

export function statusError(error) {
  return {
    success: false,
    error: error.message,
    ...(error.details ? { details: error.details } : {}),
    ...(error.details?.earliestAvailableAt ? { earliestAvailableAt: error.details.earliestAvailableAt } : {})
  };
}
