import { prisma } from "../config/prisma.js";
import {
  assertBusAvailable,
  assertCrewAvailable,
  completeDuty,
  createDutyWithCrew,
  makeDutyInterval,
  statusError
} from "../services/unlinkedDutyService.js";
import { isValidDate } from "../services/unlinkedDutyService.js";

function validateHandover(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) return "Request body must be an object.";
  if (typeof input.previousDutyId !== "string" || !input.previousDutyId) return "previousDutyId is required.";
  if (typeof input.newDriverId !== "string" || !input.newDriverId) return "newDriverId is required.";
  if (typeof input.newConductorId !== "string" || !input.newConductorId) return "newConductorId is required.";
  if (input.newDriverId === input.newConductorId) return "Driver and conductor must be different crew members.";
  if (input.dutyNumber !== undefined && (typeof input.dutyNumber !== "string" || !input.dutyNumber.trim() || input.dutyNumber.length > 50)) {
    return "dutyNumber must be a non-empty string of at most 50 characters.";
  }
  if (input.depot !== undefined && (typeof input.depot !== "string" || input.depot.length > 100)) {
    return "depot must be a string of at most 100 characters.";
  }
  const interval = makeDutyInterval(input.shiftDate, input.startTime, input.endTime);
  return interval.error || null;
}

async function assertPreviousTripCompleted(transaction, duty, busId, interval) {
  const nextDate = new Date(`${duty.shiftDate}T00:00:00+05:30`);
  nextDate.setDate(nextDate.getDate() + 1);
  const trips = await transaction.trip.findMany({
    where: { busId, tripDate: { in: [duty.shiftDate, nextDate.toISOString().slice(0, 10)] } },
    select: { id: true, departureTime: true, arrivalTime: true, status: true }
  });
  const relevantTrips = trips.filter((trip) => {
    const tripInterval = makeDutyInterval(trip.tripDate, trip.departureTime.slice(0, 5), trip.arrivalTime.slice(0, 5));
    return tripInterval.start && tripInterval.start < interval.end && tripInterval.end > interval.start;
  });
  const incomplete = relevantTrips.find((trip) => trip.status !== "Completed");
  if (incomplete) {
    throw Object.assign(new Error(`Trip ${incomplete.id} has not been marked Completed.`), { statusCode: 409 });
  }
  if (duty.status === "Active" && relevantTrips.length === 0) {
    throw Object.assign(new Error("Cannot hand over an active duty without a completed trip for its bus and date."), { statusCode: 409 });
  }
}

export async function createHandover(req, res, next) {
  const input = req.body || {};
  const validationError = validateHandover(input);
  if (validationError) return res.status(400).json({ success: false, error: validationError });

  const nextInterval = makeDutyInterval(input.shiftDate, input.startTime, input.endTime);
  const handoverTimestamp = new Date();
  if (nextInterval.start < handoverTimestamp) {
    return res.status(400).json({ success: false, error: "The next duty cannot start before the handover time." });
  }

  try {
    const result = await prisma.$transaction(async (transaction) => {
      const previousDuty = await transaction.duty.findUnique({
        where: { id: input.previousDutyId },
        include: {
          assignment: {
            include: {
              bus: true,
              driver: true,
              conductor: true
            }
          },
          crewAssignments: true
        }
      });
      if (!previousDuty || !previousDuty.assignment) {
        throw Object.assign(new Error("Previous duty or its bus/crew assignment was not found."), { statusCode: 404 });
      }
      if (!["Active", "Completed"].includes(previousDuty.status)) {
        throw Object.assign(new Error("The previous duty must be active or completed before handover."), { statusCode: 409 });
      }

      const previousInterval = makeDutyInterval(previousDuty.shiftDate, previousDuty.startTime.slice(0, 5), previousDuty.endTime.slice(0, 5));
      await assertPreviousTripCompleted(transaction, previousDuty, previousDuty.assignment.busId, previousInterval);

      const bus = previousDuty.assignment.bus;
      if (!["Active", "Available"].includes(bus.status)) {
        throw Object.assign(new Error(`Bus ${bus.busNumber} is ${bus.status.toLowerCase()} and cannot be handed over.`), { statusCode: 409 });
      }

      const previousCrews = [
        { member: previousDuty.assignment.driver, role: "Driver" },
        { member: previousDuty.assignment.conductor, role: "Conductor" }
      ];
      for (const previous of previousCrews) {
        const history = previousDuty.crewAssignments.find((assignment) => assignment.crewId === previous.member.id);
        if (!history) {
          throw Object.assign(new Error(`Assignment history for ${previous.member.name} is missing.`), { statusCode: 409 });
        }
        if (previousDuty.status === "Active" && history.status !== "Active") {
          throw Object.assign(new Error(`Duty assignment for ${previous.member.name} is not active.`), { statusCode: 409 });
        }
      }

      if (previousDuty.status === "Active") {
        await completeDuty(transaction, previousDuty, handoverTimestamp);
      }

      await assertBusAvailable(transaction, bus.id, nextInterval.start, nextInterval.end, previousDuty.id);
      const [driver, conductor] = await Promise.all([
        assertCrewAvailable(transaction, input.newDriverId, "Driver", nextInterval.start, nextInterval.end),
        assertCrewAvailable(transaction, input.newConductorId, "Conductor", nextInterval.start, nextInterval.end)
      ]);

      const newSchedule = await createDutyWithCrew(transaction, {
        dutyNumber: input.dutyNumber?.trim(),
        shiftDate: input.shiftDate,
        startTime: input.startTime,
        endTime: input.endTime,
        durationMinutes: nextInterval.durationMinutes,
        bus,
        driver,
        conductor,
        depot: input.depot || previousDuty.depot,
        previousDutyId: previousDuty.id
      });

      const handovers = await Promise.all([
        transaction.dutyHandover.create({
          data: {
            busId: bus.id,
            previousCrewMemberId: previousDuty.assignment.driverId,
            newCrewMemberId: driver.id,
            previousDutyId: previousDuty.id,
            newDutyId: newSchedule.duty.id,
            handoverTimestamp
          }
        }),
        transaction.dutyHandover.create({
          data: {
            busId: bus.id,
            previousCrewMemberId: previousDuty.assignment.conductorId,
            newCrewMemberId: conductor.id,
            previousDutyId: previousDuty.id,
            newDutyId: newSchedule.duty.id,
            handoverTimestamp
          }
        })
      ]);

      const schedule = await transaction.duty.findUnique({
        where: { id: newSchedule.duty.id },
        include: {
          assignment: {
            include: {
              bus: true,
              driver: { select: { id: true, name: true, role: true, crewId: true } },
              conductor: { select: { id: true, name: true, role: true, crewId: true } }
            }
          }
        }
      });
      return { handovers, previousDutyId: previousDuty.id, schedule };
    }, { isolationLevel: "Serializable" });

    return res.status(201).json({ success: true, data: result });
  } catch (error) {
    if (error.code === "P2002") {
      return res.status(409).json({ success: false, error: "Duty number is already in use." });
    }
    if (error.code === "P2034") {
      return res.status(409).json({ success: false, error: "Crew or bus availability changed during handover. Refresh and retry." });
    }
    if (error.statusCode) return res.status(error.statusCode).json(statusError(error));
    return next(error);
  }
}

export async function listHandovers(req, res, next) {
  try {
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 25));
    const [total, data] = await Promise.all([
      prisma.dutyHandover.count(),
      prisma.dutyHandover.findMany({
        include: {
          bus: { select: { id: true, busNumber: true } },
          previousCrewMember: { select: { id: true, name: true, role: true, crewId: true } },
          newCrewMember: { select: { id: true, name: true, role: true, crewId: true } },
          previousDuty: { select: { id: true, dutyNumber: true, shiftDate: true, startTime: true, endTime: true, status: true } },
          newDuty: { select: { id: true, dutyNumber: true, shiftDate: true, startTime: true, endTime: true, status: true } }
        },
        orderBy: { handoverTimestamp: "desc" },
        skip: (page - 1) * limit,
        take: limit
      })
    ]);
    return res.status(200).json({ success: true, data, pagination: { total, page, limit } });
  } catch (error) {
    return next(error);
  }
}
