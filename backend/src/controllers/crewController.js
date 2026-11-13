import { prisma } from "../config/prisma.js";

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

    if (search && search.trim()) {
      const q = search.trim();
      where.OR = [
        { crewId: { contains: q, mode: "insensitive" } },
        { name: { contains: q, mode: "insensitive" } },
        { badgeNumber: { contains: q, mode: "insensitive" } },
        { licenseNumber: { contains: q, mode: "insensitive" } },
        { assignedDepot: { contains: q, mode: "insensitive" } }
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
    const orderDirection = sortOrder.toUpperCase() === "ASC" ? "asc" : "desc";

    const [count, crewMembers] = await Promise.all([
      prisma.crew.count({ where }),
      prisma.crew.findMany({
        where,
        orderBy: { [sortField]: orderDirection },
        skip: offset,
        take: limitNum
      })
    ]);

    const totalPages = Math.ceil(count / limitNum);

    return res.status(200).json({
      success: true,
      data: crewMembers,
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

// GET /api/crew/availability and /api/crew/stats
export async function getCrewAvailabilityStats(req, res, next) {
  try {
    const [
      totalCrew,
      drivers,
      conductors,
      availableDrivers,
      availableConductors,
      onDutyDrivers,
      onDutyConductors,
      totalOnRest,
      totalOnLeave
    ] = await Promise.all([
      prisma.crew.count(),
      prisma.crew.count({ where: { role: "Driver" } }),
      prisma.crew.count({ where: { role: "Conductor" } }),
      prisma.crew.count({ where: { role: "Driver", status: "Available" } }),
      prisma.crew.count({ where: { role: "Conductor", status: "Available" } }),
      prisma.crew.count({ where: { role: "Driver", status: "On Duty" } }),
      prisma.crew.count({ where: { role: "Conductor", status: "On Duty" } }),
      prisma.crew.count({ where: { status: "On Rest" } }),
      prisma.crew.count({ where: { status: "On Leave" } })
    ]);

    const totalAvailable = availableDrivers + availableConductors;
    const totalOnDuty = onDutyDrivers + onDutyConductors;
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
    const crewMember = await prisma.crew.findUnique({ where: { id } });

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
    const existingCrewId = await prisma.crew.findUnique({
      where: { crewId: crewId.trim() }
    });
    if (existingCrewId) {
      return res.status(409).json({
        success: false,
        error: `Crew ID '${crewId.trim()}' is already registered.`
      });
    }

    // Check duplicate badgeNumber
    const existingBadge = await prisma.crew.findUnique({
      where: { badgeNumber: badgeNumber.trim() }
    });
    if (existingBadge) {
      return res.status(409).json({
        success: false,
        error: `Badge number '${badgeNumber.trim()}' is already assigned to another crew member.`
      });
    }

    const newCrew = await prisma.crew.create({
      data: {
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
      }
    });

    return res.status(201).json({
      success: true,
      message: "Crew member added successfully.",
      data: newCrew
    });
  } catch (error) {
    if (error.code === "P2002") {
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
    const crewMember = await prisma.crew.findUnique({ where: { id } });

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

    const updateData = {};

    // Check unique crewId if updated
    if (crewId && crewId.trim() !== crewMember.crewId) {
      const existing = await prisma.crew.findFirst({
        where: {
          crewId: crewId.trim(),
          id: { not: id }
        }
      });
      if (existing) {
        return res.status(409).json({
          success: false,
          error: `Crew ID '${crewId.trim()}' is already in use.`
        });
      }
      updateData.crewId = crewId.trim();
    }

    // Check unique badgeNumber if updated
    if (badgeNumber && badgeNumber.trim() !== crewMember.badgeNumber) {
      const existing = await prisma.crew.findFirst({
        where: {
          badgeNumber: badgeNumber.trim(),
          id: { not: id }
        }
      });
      if (existing) {
        return res.status(409).json({
          success: false,
          error: `Badge number '${badgeNumber.trim()}' is already in use.`
        });
      }
      updateData.badgeNumber = badgeNumber.trim();
    }

    if (name !== undefined) updateData.name = name.trim();
    if (role !== undefined) updateData.role = role;
    if (licenseNumber !== undefined) updateData.licenseNumber = licenseNumber ? licenseNumber.trim() : null;
    if (qualification !== undefined) updateData.qualification = qualification ? qualification.trim() : crewMember.qualification;
    if (experienceYears !== undefined) updateData.experienceYears = Number(experienceYears);
    if (assignedDepot !== undefined) updateData.assignedDepot = assignedDepot.trim();
    if (status !== undefined) updateData.status = status;
    if (phone !== undefined) updateData.phone = phone ? phone.trim() : null;

    const updated = await prisma.crew.update({
      where: { id },
      data: updateData
    });

    return res.status(200).json({
      success: true,
      message: "Crew details updated successfully.",
      data: updated
    });
  } catch (error) {
    if (error.code === "P2002") {
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
    const crewMember = await prisma.crew.findUnique({ where: { id } });

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

    await prisma.crew.delete({ where: { id } });

    return res.status(200).json({
      success: true,
      message: `Crew member ${crewMember.name} (${crewMember.badgeNumber}) removed successfully.`
    });
  } catch (error) {
    next(error);
  }
}
