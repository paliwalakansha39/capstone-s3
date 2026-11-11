import { Op } from "sequelize";
import { Crew } from "../models/index.js";

// GET /api/crew
export async function getAllCrew(req, res, next) {
  try {
    const {
      search = "",
      role,
      status,
      depot,
      page = 1,
      limit = 10,
      sortBy = "createdAt",
      sortOrder = "DESC"
    } = req.query;

    const where = {};

    // Search matches crewId, name, badgeNumber, licenseNumber, or assignedDepot
    if (search && search.trim()) {
      const q = `%${search.trim()}%`;
      where[Op.or] = [
        { crewId: { [Op.like]: q } },
        { name: { [Op.like]: q } },
        { badgeNumber: { [Op.like]: q } },
        { licenseNumber: { [Op.like]: q } },
        { assignedDepot: { [Op.like]: q } }
      ];
    }

    if (role && role.trim() && role !== "all") {
      where.role = role.trim();
    }

    if (status && status.trim() && status !== "all") {
      where.status = status.trim();
    }

    if (depot && depot.trim() && depot !== "all") {
      where.assignedDepot = depot.trim();
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
    const offset = (pageNum - 1) * limitNum;

    const validSortFields = ["crewId", "name", "role", "experienceYears", "status", "assignedDepot", "createdAt"];
    const sortField = validSortFields.includes(sortBy) ? sortBy : "createdAt";
    const orderDirection = sortOrder.toUpperCase() === "ASC" ? "ASC" : "DESC";

    const { count, rows: crewMembers } = await Crew.findAndCountAll({
      where,
      order: [[sortField, orderDirection]],
      limit: limitNum,
      offset
    });

    const totalPages = Math.ceil(count / limitNum);

    return res.status(200).json({
      success: true,
      data: crewMembers,
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

// GET /api/crew/availability and /api/crew/stats
export async function getCrewAvailabilityStats(req, res, next) {
  try {
    const totalCrew = await Crew.count();
    const drivers = await Crew.count({ where: { role: "Driver" } });
    const conductors = await Crew.count({ where: { role: "Conductor" } });

    const availableDrivers = await Crew.count({ where: { role: "Driver", status: "Available" } });
    const availableConductors = await Crew.count({ where: { role: "Conductor", status: "Available" } });
    const onDutyDrivers = await Crew.count({ where: { role: "Driver", status: "On Duty" } });
    const onDutyConductors = await Crew.count({ where: { role: "Conductor", status: "On Duty" } });

    const totalAvailable = availableDrivers + availableConductors;
    const totalOnDuty = onDutyDrivers + onDutyConductors;
    const totalOnRest = await Crew.count({ where: { status: "On Rest" } });
    const totalOnLeave = await Crew.count({ where: { status: "On Leave" } });

    const availabilityRate = totalCrew > 0 ? Math.round((totalAvailable / totalCrew) * 100) : 0;

    return res.status(200).json({
      success: true,
      data: {
        totalCrew,
        drivers,
        conductors,
        totalAvailable,
        totalOnDuty,
        totalOnRest,
        totalOnLeave,
        availableDrivers,
        availableConductors,
        onDutyDrivers,
        onDutyConductors,
        availabilityRate
      }
    });
  } catch (error) {
    next(error);
  }
}

// GET /api/crew/:id
export async function getCrewById(req, res, next) {
  try {
    const { id } = req.params;
    const crewMember = await Crew.findByPk(id);

    if (!crewMember) {
      return res.status(404).json({
        success: false,
        error: "Crew member not found."
      });
    }

    return res.status(200).json({
      success: true,
      data: crewMember
    });
  } catch (error) {
    next(error);
  }
}

// POST /api/crew
export async function createCrew(req, res, next) {
  try {
    const {
      crewId,
      name,
      role = "Driver",
      badgeNumber,
      licenseNumber,
      qualification,
      experienceYears = 1,
      assignedDepot,
      status = "Available",
      phone
    } = req.body;

    // Check duplicate crewId
    const existingCrewId = await Crew.findOne({ where: { crewId: crewId.trim() } });
    if (existingCrewId) {
      return res.status(409).json({
        success: false,
        error: `Crew ID '${crewId.trim()}' is already registered.`
      });
    }

    // Check duplicate badgeNumber
    const existingBadge = await Crew.findOne({ where: { badgeNumber: badgeNumber.trim() } });
    if (existingBadge) {
      return res.status(409).json({
        success: false,
        error: `Badge number '${badgeNumber.trim()}' is already assigned to another crew member.`
      });
    }

    const newCrew = await Crew.create({
      crewId: crewId.trim(),
      name: name.trim(),
      role,
      badgeNumber: badgeNumber.trim(),
      licenseNumber: licenseNumber ? licenseNumber.trim() : null,
      qualification: qualification ? qualification.trim() : (role === "Driver" ? "Commercial Heavy Vehicle Certified" : "Conductor Certified"),
      experienceYears: Number(experienceYears) || 0,
      assignedDepot: assignedDepot.trim(),
      status,
      phone: phone ? phone.trim() : null
    });

    return res.status(201).json({
      success: true,
      message: "Crew member added successfully.",
      data: newCrew
    });
  } catch (error) {
    if (error.name === "SequelizeUniqueConstraintError") {
      return res.status(409).json({
        success: false,
        error: "A crew member with this Crew ID or Badge Number already exists."
      });
    }
    next(error);
  }
}

// PUT /api/crew/:id
export async function updateCrew(req, res, next) {
  try {
    const { id } = req.params;
    const crewMember = await Crew.findByPk(id);

    if (!crewMember) {
      return res.status(404).json({
        success: false,
        error: "Crew member not found."
      });
    }

    const {
      crewId,
      name,
      role,
      badgeNumber,
      licenseNumber,
      qualification,
      experienceYears,
      assignedDepot,
      status,
      phone
    } = req.body;

    // Check unique crewId if updated
    if (crewId && crewId.trim() !== crewMember.crewId) {
      const existing = await Crew.findOne({ where: { crewId: crewId.trim() } });
      if (existing) {
        return res.status(409).json({
          success: false,
          error: `Crew ID '${crewId.trim()}' is already in use.`
        });
      }
      crewMember.crewId = crewId.trim();
    }

    // Check unique badgeNumber if updated
    if (badgeNumber && badgeNumber.trim() !== crewMember.badgeNumber) {
      const existing = await Crew.findOne({ where: { badgeNumber: badgeNumber.trim() } });
      if (existing) {
        return res.status(409).json({
          success: false,
          error: `Badge number '${badgeNumber.trim()}' is already in use.`
        });
      }
      crewMember.badgeNumber = badgeNumber.trim();
    }

    if (name !== undefined) crewMember.name = name.trim();
    if (role !== undefined) crewMember.role = role;
    if (licenseNumber !== undefined) crewMember.licenseNumber = licenseNumber ? licenseNumber.trim() : null;
    if (qualification !== undefined) crewMember.qualification = qualification ? qualification.trim() : crewMember.qualification;
    if (experienceYears !== undefined) crewMember.experienceYears = Number(experienceYears);
    if (assignedDepot !== undefined) crewMember.assignedDepot = assignedDepot.trim();
    if (status !== undefined) crewMember.status = status;
    if (phone !== undefined) crewMember.phone = phone ? phone.trim() : null;

    await crewMember.save();

    return res.status(200).json({
      success: true,
      message: "Crew details updated successfully.",
      data: crewMember
    });
  } catch (error) {
    if (error.name === "SequelizeUniqueConstraintError") {
      return res.status(409).json({
        success: false,
        error: "Unique constraint violated: Duplicate Crew ID or Badge Number."
      });
    }
    next(error);
  }
}

// DELETE /api/crew/:id
export async function deleteCrew(req, res, next) {
  try {
    const { id } = req.params;
    const crewMember = await Crew.findByPk(id);

    if (!crewMember) {
      return res.status(404).json({
        success: false,
        error: "Crew member not found."
      });
    }

    // Block deletion if currently On Duty
    if (crewMember.status === "On Duty") {
      return res.status(400).json({
        success: false,
        error: "Cannot delete a crew member who is currently 'On Duty'. Reassign or change their status first."
      });
    }

    await crewMember.destroy();

    return res.status(200).json({
      success: true,
      message: `Crew member ${crewMember.name} (${crewMember.badgeNumber}) removed successfully.`
    });
  } catch (error) {
    next(error);
  }
}
