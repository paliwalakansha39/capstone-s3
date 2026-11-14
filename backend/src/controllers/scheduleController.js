import { prisma } from "../config/prisma.js";
import {
  assertBusAvailable,
  assertCrewAvailable,
  createDutyWithCrew,
  getRequiredRestMinutes,
  localDateBoundary,
  makeDutyInterval,
  statusError
} from "../services/unlinkedDutyService.js";

const includeSchedule = {
  assignment: {
    include: {
      bus: { select: { id: true, busNumber: true, status: true, depot: true } },
      driver: { select: { id: true, name: true, crewId: true, badgeNumber: true, role: true } },
      conductor: { select: { id: true, name: true, crewId: true, badgeNumber: true, role: true } }
    }
  },
  crewAssignments: {
    include: { crew: { select: { id: true, name: true, role: true, crewId: true } }, bus: { select: { id: true, busNumber: true } } },
    orderBy: { role: "asc" }
  }
};

function validatePayload(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) return "Request body must be an object.";
  if (typeof input.busId !== "string" || !input.busId.trim()) return "busId is required.";
  if (typeof input.driverId !== "string" || !input.driverId.trim()) return "driverId is required.";
  if (typeof input.conductorId !== "string" || !input.conductorId.trim()) return "conductorId is required.";
  if (input.driverId === input.conductorId) return "Driver and conductor must be different crew members.";
  const interval = makeDutyInterval(input.shiftDate, input.startTime, input.endTime);
  return interval.error || null;
}

export async function listUnlinkedSchedules(req, res, next) {
  try {
    const { startDate, endDate, status, busId } = req.query;
    const where = { schedulingType: "Unlinked" };
    if (startDate || endDate) {
      where.shiftDate = {};
      if (startDate) where.shiftDate.gte = startDate;
      if (endDate) where.shiftDate.lte = endDate;
    }
    if (status && status !== "all") where.status = status;
    if (busId && busId !== "all") where.assignment = { busId };

    const schedules = await prisma.duty.findMany({
      where,
      include: includeSchedule,
      orderBy: [{ shiftDate: "desc" }, { startTime: "desc" }],
      take: 200
    });
    return res.status(200).json({ success: true, data: schedules });
  } catch (error) {
    return next(error);
  }
}

export async function createUnlinkedSchedule(req, res, next) {
  const input = req.body || {};
  const validationError = validatePayload(input);
  if (validationError) return res.status(400).json({ success: false, error: validationError });

  const interval = makeDutyInterval(input.shiftDate, input.startTime, input.endTime);
  if (interval.start < new Date()) {
    return res.status(400).json({ success: false, error: "A new unlinked duty must start in the future." });
  }

  try {
    const schedule = await prisma.$transaction(async (transaction) => {
      const bus = await transaction.bus.findUnique({ where: { id: input.busId } });
      if (!bus) throw Object.assign(new Error("Selected bus was not found."), { statusCode: 404 });
      if (!["Active", "Available"].includes(bus.status)) {
        throw Object.assign(new Error(`Bus ${bus.busNumber} is ${bus.status.toLowerCase()} and cannot be assigned.`), { statusCode: 409 });
      }

      await assertBusAvailable(transaction, bus.id, interval.start, interval.end);
      const [driver, conductor] = await Promise.all([
        assertCrewAvailable(transaction, input.driverId, "Driver", interval.start, interval.end),
        assertCrewAvailable(transaction, input.conductorId, "Conductor", interval.start, interval.end)
      ]);
      const created = await createDutyWithCrew(transaction, {
        dutyNumber: input.dutyNumber?.trim(),
        shiftDate: input.shiftDate,
        startTime: input.startTime,
        endTime: input.endTime,
        durationMinutes: interval.durationMinutes,
        bus,
        driver,
        conductor,
        depot: input.depot
      });
      return transaction.duty.findUnique({
        where: { id: created.duty.id },
        include: includeSchedule
      });
    }, { isolationLevel: "Serializable" });
    return res.status(201).json({ success: true, data: schedule });
  } catch (error) {
    if (error.code === "P2034") {
      return res.status(409).json({ success: false, error: "Schedule changed during assignment. Refresh and retry." });
    }
    if (error.statusCode) return res.status(error.statusCode).json(statusError(error));
    return next(error);
  }
}

export async function getAvailabilityCalendar(req, res, next) {
  try {
    const startDate = typeof req.query.startDate === "string" ? req.query.startDate : new Date().toISOString().slice(0, 10);
    const endDate = typeof req.query.endDate === "string"
      ? req.query.endDate
      : new Date(Date.now() + 6 * 86400000).toISOString().slice(0, 10);
    const start = localDateBoundary(startDate);
    const endDay = localDateBoundary(endDate, true);
    if (!start || !endDay || endDay <= start) {
      return res.status(400).json({ success: false, error: "Provide valid startDate and endDate values in YYYY-MM-DD format." });
    }

    const [assignments, restPeriods] = await Promise.all([
      prisma.crewAssignment.findMany({
        where: {
          assignmentStartTime: { lt: endDay },
          assignmentEndTime: { gt: start }
        },
        include: {
          crew: { select: { id: true, name: true, role: true, crewId: true } },
          bus: { select: { id: true, busNumber: true } },
          duty: { select: { id: true, dutyNumber: true, shiftDate: true, startTime: true, endTime: true, status: true, schedulingType: true } }
        },
        orderBy: { assignmentStartTime: "asc" }
      }),
      prisma.restPeriod.findMany({
        where: { restStartTime: { lt: endDay }, restEndTime: { gt: start } },
        include: {
          crew: { select: { id: true, name: true, role: true, crewId: true } },
          previousDuty: { select: { id: true, dutyNumber: true } }
        },
        orderBy: { restStartTime: "asc" }
      })
    ]);
    return res.status(200).json({ success: true, data: { startDate, endDate, assignments, restPeriods } });
  } catch (error) {
    return next(error);
  }
}

export function getUnlinkedRestConfiguration(req, res) {
  return res.status(200).json({ success: true, data: { requiredRestDurationMinutes: getRequiredRestMinutes() } });
}
