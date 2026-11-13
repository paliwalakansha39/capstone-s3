import { Op } from "sequelize";
import {
  sequelize,
  Bus,
  Crew,
  Duty,
  DutyAssignment
} from "../models/index.js";
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
      const q = `%${search.trim()}%`;
      where[Op.or] = [
        { dutyNumber: { [Op.like]: q } },
        { depot: { [Op.like]: q } },
        { "$assignment.bus.bus_number$": { [Op.like]: q } },
        { "$assignment.driver.name$": { [Op.like]: q } },
        { "$assignment.conductor.name$": { [Op.like]: q } }
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

    const assignmentWhere = {};
    if (busId && busId.trim() && busId !== "all") {
      assignmentWhere.busId = busId.trim();
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
    const offset = (pageNum - 1) * limitNum;

    const validSortFields = ["shiftDate", "startTime", "endTime", "status", "dutyNumber", "createdAt"];
    const sortField = validSortFields.includes(sortBy) ? sortBy : "shiftDate";
    const orderDirection = sortOrder.toUpperCase() === "ASC" ? "ASC" : "DESC";

    const { count, rows: duties } = await Duty.findAndCountAll({
      where,
      include: [
        {
          model: DutyAssignment,
          as: "assignment",
          where: Object.keys(assignmentWhere).length ? assignmentWhere : undefined,
          required: false,
          include: [
            {
              model: Bus,
              as: "bus",
              attributes: ["id", "busNumber", "registrationNumber", "busType", "depot"]
            },
            {
              model: Crew,
              as: "driver",
              attributes: ["id", "name", "crewId", "badgeNumber", "phone"]
            },
            {
              model: Crew,
              as: "conductor",
              attributes: ["id", "name", "crewId", "badgeNumber", "phone"]
            }
          ]
        }
      ],
      order: [[sortField, orderDirection]],
      limit: limitNum,
      offset
    });

    const totalPages = Math.ceil(count / limitNum);

    return res.status(200).json({
      success: true,
      data: duties,
      pagination: {
        total: count,
        page: pageNum,
        limit: limitNum,
        totalPages,
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
    const totalDuties = await Duty.count();
    const scheduledDuties = await Duty.count({ where: { status: "Scheduled" } });
    const activeDuties = await Duty.count({ where: { status: "Active" } });
    const completedDuties = await Duty.count({ where: { status: "Completed" } });
    const cancelledDuties = await Duty.count({ where: { status: "Cancelled" } });

    // Distinct buses with active/scheduled duties
    const assignedBusesCount = await DutyAssignment.count({
      distinct: true,
      col: "bus_id",
      include: [
        {
          model: Duty,
          as: "duty",
          where: { status: { [Op.in]: ["Scheduled", "Active"] } }
        }
      ]
    });

    // Distinct drivers with active/scheduled duties
    const assignedDriversCount = await DutyAssignment.count({
      distinct: true,
      col: "driver_id",
      include: [
        {
          model: Duty,
          as: "duty",
          where: { status: { [Op.in]: ["Scheduled", "Active"] } }
        }
      ]
    });

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

    const duty = await Duty.findByPk(id, {
      include: [
        {
          model: DutyAssignment,
          as: "assignment",
          include: [
            {
              model: Bus,
              as: "bus",
              attributes: ["id", "busNumber", "registrationNumber", "busType", "depot", "capacity"]
            },
            {
              model: Crew,
              as: "driver",
              attributes: ["id", "name", "crewId", "badgeNumber", "licenseNumber", "phone", "status"]
            },
            {
              model: Crew,
              as: "conductor",
              attributes: ["id", "name", "crewId", "badgeNumber", "phone", "status"]
            }
          ]
        }
      ]
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

    // Check unique dutyNumber
    const existing = await Duty.findOne({ where: { dutyNumber: dutyNumber.trim() } });
    if (existing) {
      return res.status(409).json({
        success: false,
        error: `Duty number '${dutyNumber.trim()}' is already in use.`
      });
    }

    const duration = calculateShiftDurationHours(startTime, endTime);

    const newDuty = await Duty.create({
      dutyNumber: dutyNumber.trim(),
      shiftType,
      shiftDate,
      startTime,
      endTime,
      depot,
      totalDurationHours: duration,
      status: "Scheduled",
      schedulingType: "Linked"
    });

    const assignment = await DutyAssignment.create({
      dutyId: newDuty.id,
      busId,
      driverId,
      conductorId,
      vehicleHandoverVerified: true,
      notes: notes || "Manual Linked Duty assignment."
    });

    return res.status(201).json({
      success: true,
      message: "Linked Duty scheduled successfully.",
      data: {
        ...newDuty.toJSON(),
        assignment
      }
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

    const duty = await Duty.findByPk(id, {
      include: [{ model: DutyAssignment, as: "assignment" }]
    });

    if (!duty) {
      return res.status(404).json({
        success: false,
        error: "Duty record not found."
      });
    }

    if (status !== undefined) duty.status = status;
    if (shiftType !== undefined) duty.shiftType = shiftType;
    if (startTime !== undefined) duty.startTime = startTime;
    if (endTime !== undefined) duty.endTime = endTime;

    if (startTime && endTime) {
      duty.totalDurationHours = calculateShiftDurationHours(duty.startTime, duty.endTime);
    }

    await duty.save();

    if (notes !== undefined && duty.assignment) {
      duty.assignment.notes = notes;
      await duty.assignment.save();
    }

    return res.status(200).json({
      success: true,
      message: "Duty updated successfully.",
      data: duty
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

    const duty = await Duty.findByPk(id);

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

    await duty.destroy();

    return res.status(200).json({
      success: true,
      message: `Duty ${duty.dutyNumber} removed successfully.`
    });
  } catch (error) {
    next(error);
  }
}
