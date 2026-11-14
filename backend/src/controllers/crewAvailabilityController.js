import { prisma } from "../config/prisma.js";
import { availabilityForCrew, getRequiredRestMinutes, isValidDate } from "../services/unlinkedDutyService.js";

function parseAt(value) {
  if (value === undefined) return new Date();
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T/.test(value) || Number.isNaN(Date.parse(value))) return null;
  return new Date(value);
}

function parseUntil(value, at) {
  if (value === undefined) return at;
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T/.test(value) || Number.isNaN(Date.parse(value))) return null;
  const until = new Date(value);
  return until > at ? until : null;
}

export async function listAvailableCrew(req, res, next) {
  try {
    if (req.query.role && !["Driver", "Conductor"].includes(req.query.role)) {
      return res.status(400).json({ success: false, error: "role must be Driver or Conductor." });
    }
    const at = parseAt(req.query.at);
    if (!at) return res.status(400).json({ success: false, error: "at must be a valid ISO date-time." });
    const until = parseUntil(req.query.until, at);
    if (!until) return res.status(400).json({ success: false, error: "until must be a valid ISO date-time later than at." });
    const where = req.query.role === "Driver" || req.query.role === "Conductor"
      ? { role: req.query.role }
      : {};
    const crew = await prisma.crew.findMany({
      where,
      orderBy: [{ role: "asc" }, { name: "asc" }]
    });
    const data = await Promise.all(crew.map((member) => availabilityForCrew(prisma, member, at, until)));
    return res.status(200).json({
      success: true,
      data: req.query.includeAll === "true"
        ? data
        : data.filter((member) => member.status === "Available" || member.status === "Resting"),
      meta: { at: at.toISOString(), requiredRestDurationMinutes: getRequiredRestMinutes() }
    });
  } catch (error) {
    return next(error);
  }
}

export async function getCrewAvailability(req, res, next) {
  try {
    const at = parseAt(req.query.at);
    if (!at) return res.status(400).json({ success: false, error: "at must be a valid ISO date-time." });
    const until = parseUntil(req.query.until, at);
    if (!until) return res.status(400).json({ success: false, error: "until must be a valid ISO date-time later than at." });
    const crew = await prisma.crew.findUnique({ where: { id: req.params.id } });
    if (!crew) return res.status(404).json({ success: false, error: "Crew member not found." });
    const data = await availabilityForCrew(prisma, crew, at, until);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return next(error);
  }
}

export async function getCrewRestPeriods(req, res, next) {
  try {
    const crew = await prisma.crew.findUnique({
      where: { id: req.params.id },
      select: { id: true, name: true, role: true, crewId: true }
    });
    if (!crew) return res.status(404).json({ success: false, error: "Crew member not found." });
    const restPeriods = await prisma.restPeriod.findMany({
      where: { crewId: crew.id },
      include: { previousDuty: { select: { id: true, dutyNumber: true, shiftDate: true, status: true } } },
      orderBy: { restStartTime: "desc" },
      take: 100
    });
    return res.status(200).json({
      success: true,
      data: {
        crew,
        requiredRestDurationMinutes: getRequiredRestMinutes(),
        restPeriods
      }
    });
  } catch (error) {
    return next(error);
  }
}

export async function getCrewAvailabilityCalendar(req, res, next) {
  try {
    const { startDate, endDate } = req.query;
    if (!isValidDate(startDate) || !isValidDate(endDate) || endDate < startDate) {
      return res.status(400).json({ success: false, error: "Provide valid startDate and endDate values in YYYY-MM-DD format." });
    }

    const crew = await prisma.crew.findMany({
      orderBy: [{ role: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        crewId: true,
        role: true,
        status: true,
        crewAssignments: {
          where: {
            assignmentStartTime: { lt: new Date(`${endDate}T23:59:59.999+05:30`) },
            assignmentEndTime: { gte: new Date(`${startDate}T00:00:00.000+05:30`) }
          },
          include: {
            bus: { select: { id: true, busNumber: true } },
            duty: { select: { id: true, dutyNumber: true, schedulingType: true, status: true } }
          },
          orderBy: { assignmentStartTime: "asc" }
        },
        restPeriods: {
          where: {
            restStartTime: { lt: new Date(`${endDate}T23:59:59.999+05:30`) },
            restEndTime: { gte: new Date(`${startDate}T00:00:00.000+05:30`) }
          },
          orderBy: { restStartTime: "asc" }
        }
      }
    });

    const assignments = crew.flatMap(({ crewAssignments, ...member }) =>
      crewAssignments.map((assignment) => ({ ...assignment, crew: member })));
    const restPeriods = crew.flatMap(({ restPeriods: memberRestPeriods, ...member }) =>
      memberRestPeriods.map((restPeriod) => ({ ...restPeriod, crew: member })));
    const overlaps = new Map();
    const byCrew = new Map();
    for (const assignment of assignments) {
      const crewAssignments = byCrew.get(assignment.crewId) || [];
      crewAssignments.push(assignment);
      byCrew.set(assignment.crewId, crewAssignments);
    }
    for (const crewAssignments of byCrew.values()) {
      for (let index = 0; index < crewAssignments.length; index += 1) {
        for (let nextIndex = index + 1; nextIndex < crewAssignments.length; nextIndex += 1) {
          const current = crewAssignments[index];
          const next = crewAssignments[nextIndex];
          if (current.assignmentStartTime < next.assignmentEndTime
            && next.assignmentStartTime < current.assignmentEndTime) {
            overlaps.set(current.id, [...(overlaps.get(current.id) || []), next.dutyId]);
            overlaps.set(next.id, [...(overlaps.get(next.id) || []), current.dutyId]);
          }
        }
      }
    }

    return res.status(200).json({
      success: true,
      data: {
        startDate,
        endDate,
        assignments: assignments.map((assignment) => ({
          ...assignment,
          hasOverlap: overlaps.has(assignment.id),
          overlappingDutyIds: overlaps.get(assignment.id) || []
        })),
        restPeriods
      },
      meta: { startDate, endDate }
    });
  } catch (error) {
    return next(error);
  }
}
