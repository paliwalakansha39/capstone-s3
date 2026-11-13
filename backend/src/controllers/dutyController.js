import { prisma } from "../config/prisma.js";
import {
  calculateShiftDurationHours
} from "../middleware/dutyValidationMiddleware.js";
import { generateLinkedDuties } from "../services/dutySchedulerEngine.js";

/**
 * GET /api/duties
 * Retrieve all duties with filtering, search, and pagination
 */
export async function getAllDuties(req, res, next) {
  try {
    const {
      search = "",
      shiftType,
      shiftDate,
      depot,
      status,
      busId,
      page = 1,
      limit = 10,
      sortBy = "shiftDate",
      sortOrder = "DESC"
    } = req.query;

    const where = {};

    if (search && search.trim()) {
      const q = search.trim();
      where.OR = [
        { dutyNumber: { contains: q, mode: "insensitive" } },
        { depot: { contains: q, mode: "insensitive" } },
        { assignment: { bus: { busNumber: { contains: q, mode: "insensitive" } } } },
        { assignment: { driver: { name: { contains: q, mode: "insensitive" } } } },
        { assignment: { conductor: { name: { contains: q, mode: "insensitive" } } } }
      ];
    }

    if (shiftType && shiftType.trim() && shiftType !== "all") {
      where.shiftType = shiftType.trim();
    }

    if (shiftDate && shiftDate.trim() && shiftDate !== "all") {
      where.shiftDate = shiftDate.trim();
    }

    if (depot && depot.trim() && depot !== "all") {
      where.depot = depot.trim();
    }

    if (status && status.trim() && status !== "all") {
      where.status = status.trim();
    }

    if (busId && busId.trim() && busId !== "all") {
      where.assignment = { busId: busId.trim() };
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
    const offset = (pageNum - 1) * limitNum;

    const validSortFields = ["shiftDate", "startTime", "endTime", "status", "dutyNumber", "createdAt"];
    const sortField = validSortFields.includes(sortBy) ? sortBy : "shiftDate";
    const orderDirection = sortOrder.toUpperCase() === "ASC" ? "asc" : "desc";

    const [count, duties] = await Promise.all([
      prisma.duty.count({ where }),
      prisma.duty.findMany({
        where,
        include: {
          assignment: {
            include: {
              bus: {
                select: { id: true, busNumber: true, registrationNumber: true, busType: true, depot: true }
              },
              driver: {
                select: { id: true, name: true, crewId: true, badgeNumber: true, phone: true }
              },
              conductor: {
                select: { id: true, name: true, crewId: true, badgeNumber: true, phone: true }
              }
            }
          }
        },
        orderBy: { [sortField]: orderDirection },
        skip: offset,
        take: limitNum
      })
    ]);

    const totalPages = Math.ceil(count / limitNum);

    return res.status(200).json({
      success: true,
      data: duties,
      pagination: {
        total: count,
        page: pageNum,
        limit: limitNum,
        totalPages: totalPages || 1,
        hasNext: pageNum < totalPages,
        hasPrev: pageNum > 1
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/duties/stats
 * Aggregate metrics on duty schedules and linked crew-bus bindings
 */
export async function getDutyStats(req, res, next) {
  try {
    const [
      totalDuties,
      scheduledDuties,
      activeDuties,
      completedDuties,
      cancelledDuties,
      activeAssignments
    ] = await Promise.all([
      prisma.duty.count(),
      prisma.duty.count({ where: { status: "Scheduled" } }),
      prisma.duty.count({ where: { status: "Active" } }),
      prisma.duty.count({ where: { status: "Completed" } }),
      prisma.duty.count({ where: { status: "Cancelled" } }),
      prisma.dutyAssignment.findMany({
        where: {
          duty: { status: { in: ["Scheduled", "Active"] } }
        },
        select: { busId: true, driverId: true }
      })
    ]);

    const assignedBusesCount = new Set(activeAssignments.map((a) => a.busId)).size;
    const assignedDriversCount = new Set(activeAssignments.map((a) => a.driverId)).size;

    return res.status(200).json({
      success: true,
      data: {
        total: totalDuties,
        scheduled: scheduledDuties,
        active: activeDuties,
        completed: completedDuties,
        cancelled: cancelledDuties,
        assignedBuses: assignedBusesCount,
        assignedDrivers: assignedDriversCount
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/duties/:id
 * Retrieve a single duty by ID with full assignment details
 */
export async function getDutyById(req, res, next) {
  try {
    const { id } = req.params;

    const duty = await prisma.duty.findUnique({
      where: { id },
      include: {
        assignment: {
          include: {
            bus: {
              select: { id: true, busNumber: true, registrationNumber: true, busType: true, depot: true, capacity: true }
            },
            driver: {
              select: { id: true, name: true, crewId: true, badgeNumber: true, licenseNumber: true, phone: true, status: true }
            },
            conductor: {
              select: { id: true, name: true, crewId: true, badgeNumber: true, phone: true, status: true }
            }
          }
        }
      }
    });

    if (!duty) {
      return res.status(404).json({
        success: false,
        error: "Duty record not found."
      });
    }

    return res.status(200).json({
      success: true,
      data: duty
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/duties/generate-linked
 * Automated Linked Duty Scheduling Engine Handler
 */
export async function generateLinkedDutiesHandler(req, res, next) {
  try {
    const { shiftDate, depot } = req.body;

    const result = await generateLinkedDuties({
      shiftDate,
      depot: depot || null
    });

    return res.status(201).json(result);
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/duties
 * Create a manual duty and linked assignment
 */
export async function createDuty(req, res, next) {
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
      conductorId,
      notes
    } = req.body;

    const existing = await prisma.duty.findUnique({
      where: { dutyNumber: dutyNumber.trim() }
    });
    if (existing) {
      return res.status(409).json({
        success: false,
        error: `Duty number '${dutyNumber.trim()}' is already in use.`
      });
    }

    const duration = calculateShiftDurationHours(startTime, endTime);

    const newDuty = await prisma.duty.create({
      data: {
        dutyNumber: dutyNumber.trim(),
        shiftType,
        shiftDate,
        startTime,
        endTime,
        depot,
        totalDurationHours: duration,
        status: "Scheduled",
        schedulingType: "Linked",
        assignment: {
          create: {
            busId,
            driverId,
            conductorId,
            vehicleHandoverVerified: true,
            notes: notes || "Manual Linked Duty assignment."
          }
        }
      },
      include: {
        assignment: true
      }
    });

    return res.status(201).json({
      success: true,
      message: "Linked Duty scheduled successfully.",
      data: newDuty
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /api/duties/:id
 * Update duty status or details
 */
export async function updateDuty(req, res, next) {
  try {
    const { id } = req.params;
    const { status, shiftType, startTime, endTime, notes } = req.body;

    const duty = await prisma.duty.findUnique({
      where: { id },
      include: { assignment: true }
    });

    if (!duty) {
      return res.status(404).json({
        success: false,
        error: "Duty record not found."
      });
    }

    const updateData = {};
    if (status !== undefined) updateData.status = status;
    if (shiftType !== undefined) updateData.shiftType = shiftType;
    if (startTime !== undefined) updateData.startTime = startTime;
    if (endTime !== undefined) updateData.endTime = endTime;

    const targetStart = startTime !== undefined ? startTime : duty.startTime;
    const targetEnd = endTime !== undefined ? endTime : duty.endTime;
    if (startTime !== undefined || endTime !== undefined) {
      updateData.totalDurationHours = calculateShiftDurationHours(targetStart, targetEnd);
    }

    if (notes !== undefined && duty.assignment) {
      await prisma.dutyAssignment.update({
        where: { dutyId: id },
        data: { notes }
      });
    }

    const updated = await prisma.duty.update({
      where: { id },
      data: updateData,
      include: { assignment: true }
    });

    return res.status(200).json({
      success: true,
      message: "Duty updated successfully.",
      data: updated
    });
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/duties/:id
 * Delete a duty schedule
 */
export async function deleteDuty(req, res, next) {
  try {
    const { id } = req.params;

    const duty = await prisma.duty.findUnique({ where: { id } });

    if (!duty) {
      return res.status(404).json({
        success: false,
        error: "Duty record not found."
      });
    }

    if (duty.status === "Active") {
      return res.status(400).json({
        success: false,
        error: "Cannot delete a duty that is currently 'Active'. Relieve or complete the duty first."
      });
    }

    await prisma.duty.delete({ where: { id } });

    return res.status(200).json({
      success: true,
      message: `Duty ${duty.dutyNumber} removed successfully.`
    });
  } catch (error) {
    next(error);
  }
}
