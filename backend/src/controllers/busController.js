import { prisma } from "../config/prisma.js";

// GET /api/buses
export async function getAllBuses(req, res, next) {
  try {
    const {
      search = "",
      status,
      busType,
      routeId,
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
        { busNumber: { contains: q, mode: "insensitive" } },
        { registrationNumber: { contains: q, mode: "insensitive" } },
        { depot: { contains: q, mode: "insensitive" } },
        { manufacturer: { contains: q, mode: "insensitive" } }
      ];
    }

    if (status && status.trim() && status !== "all") {
      where.status = status.trim();
    }

    if (busType && busType.trim() && busType !== "all") {
      where.busType = busType.trim();
    }

    if (routeId && routeId.trim() && routeId !== "all") {
      where.routeId = routeId.trim();
    }

    if (depot && depot.trim() && depot !== "all") {
      where.depot = depot.trim();
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
    const offset = (pageNum - 1) * limitNum;

    const validSortFields = ["busNumber", "registrationNumber", "busType", "capacity", "status", "createdAt"];
    const sortField = validSortFields.includes(sortBy) ? sortBy : "createdAt";
    const orderDirection = sortOrder.toUpperCase() === "ASC" ? "asc" : "desc";

    const [count, buses] = await Promise.all([
      prisma.bus.count({ where }),
      prisma.bus.findMany({
        where,
        include: {
          route: {
            select: { id: true, routeNumber: true, routeName: true, startingPoint: true, destination: true }
          },
          driver: {
            select: { id: true, name: true, badgeNumber: true, phone: true }
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
      data: buses,
      pagination: {
        total: count,
        totalPages: totalPages || 1,
        currentPage: pageNum,
        limit: limitNum,
        hasNextPage: pageNum < totalPages,
        hasPrevPage: pageNum > 1
      }
    });
  } catch (error) {
    next(error);
  }
}

// GET /api/buses/stats
export async function getBusStats(req, res, next) {
  try {
    const [total, active, maintenance, inactive, electric, ac] = await Promise.all([
      prisma.bus.count(),
      prisma.bus.count({ where: { status: "Active" } }),
      prisma.bus.count({ where: { status: "Maintenance" } }),
      prisma.bus.count({ where: { status: "Inactive" } }),
      prisma.bus.count({ where: { busType: "Electric" } }),
      prisma.bus.count({ where: { busType: "AC" } })
    ]);

    return res.status(200).json({
      success: true,
      data: {
        total,
        active,
        maintenance,
        inactive,
        electric,
        ac
      }
    });
  } catch (error) {
    next(error);
  }
}

// GET /api/buses/:id
export async function getBusById(req, res, next) {
  try {
    const { id } = req.params;

    const bus = await prisma.bus.findUnique({
      where: { id },
      include: {
        route: {
          select: { id: true, routeNumber: true, routeName: true, startingPoint: true, destination: true, totalDistance: true }
        },
        driver: {
          select: { id: true, name: true, badgeNumber: true, phone: true, licenseNumber: true, status: true }
        }
      }
    });

    if (!bus) {
      return res.status(404).json({
        success: false,
        error: `Bus with ID '${id}' was not found.`
      });
    }

    return res.status(200).json({
      success: true,
      data: bus
    });
  } catch (error) {
    next(error);
  }
}

// POST /api/buses
export async function createBus(req, res, next) {
  try {
    const {
      busNumber,
      registrationNumber,
      busType = "Electric",
      capacity = 40,
      depot = "BBM Depot",
      modelYear = new Date().getFullYear(),
      manufacturer = "Tata Motors",
      status = "Active",
      routeId,
      driverId
    } = req.body;

    const trimmedBusNumber = busNumber.trim();
    const trimmedRegNumber = registrationNumber.trim().toUpperCase();

    // Check duplicate busNumber
    const existingBusNumber = await prisma.bus.findUnique({
      where: { busNumber: trimmedBusNumber }
    });
    if (existingBusNumber) {
      return res.status(409).json({
        success: false,
        error: `A bus with Bus Number '${trimmedBusNumber}' already exists.`
      });
    }

    // Check duplicate registrationNumber
    const existingRegNumber = await prisma.bus.findUnique({
      where: { registrationNumber: trimmedRegNumber }
    });
    if (existingRegNumber) {
      return res.status(409).json({
        success: false,
        error: `A bus with Registration Number '${trimmedRegNumber}' already exists.`
      });
    }

    const newBus = await prisma.bus.create({
      data: {
        busNumber: trimmedBusNumber,
        registrationNumber: trimmedRegNumber,
        busType,
        capacity: parseInt(capacity, 10),
        depot: depot ? depot.trim() : null,
        modelYear: modelYear ? parseInt(modelYear, 10) : null,
        manufacturer: manufacturer ? manufacturer.trim() : null,
        status,
        routeId: routeId && routeId.trim() ? routeId.trim() : null,
        driverId: driverId && driverId.trim() ? driverId.trim() : null
      },
      include: {
        route: true,
        driver: true
      }
    });

    return res.status(201).json({
      success: true,
      message: `Bus ${newBus.busNumber} registered successfully.`,
      data: newBus
    });
  } catch (error) {
    next(error);
  }
}

// PUT /api/buses/:id
export async function updateBus(req, res, next) {
  try {
    const { id } = req.params;
    const {
      busNumber,
      registrationNumber,
      busType,
      capacity,
      depot,
      modelYear,
      manufacturer,
      status,
      routeId,
      driverId
    } = req.body;

    const bus = await prisma.bus.findUnique({ where: { id } });
    if (!bus) {
      return res.status(404).json({
        success: false,
        error: `Bus with ID '${id}' was not found.`
      });
    }

    const updateData = {};

    // Check duplicate busNumber if changed
    if (busNumber && busNumber.trim() !== bus.busNumber) {
      const duplicateBusNum = await prisma.bus.findFirst({
        where: {
          busNumber: busNumber.trim(),
          id: { not: id }
        }
      });
      if (duplicateBusNum) {
        return res.status(409).json({
          success: false,
          error: `Another bus already has Bus Number '${busNumber.trim()}'.`
        });
      }
      updateData.busNumber = busNumber.trim();
    }

    // Check duplicate registrationNumber if changed
    if (registrationNumber && registrationNumber.trim().toUpperCase() !== bus.registrationNumber) {
      const duplicateReg = await prisma.bus.findFirst({
        where: {
          registrationNumber: registrationNumber.trim().toUpperCase(),
          id: { not: id }
        }
      });
      if (duplicateReg) {
        return res.status(409).json({
          success: false,
          error: `Another bus already has Registration Number '${registrationNumber.trim().toUpperCase()}'.`
        });
      }
      updateData.registrationNumber = registrationNumber.trim().toUpperCase();
    }

    if (busType !== undefined) updateData.busType = busType;
    if (capacity !== undefined) updateData.capacity = parseInt(capacity, 10);
    if (depot !== undefined) updateData.depot = depot ? depot.trim() : null;
    if (modelYear !== undefined) updateData.modelYear = modelYear ? parseInt(modelYear, 10) : null;
    if (manufacturer !== undefined) updateData.manufacturer = manufacturer ? manufacturer.trim() : null;
    if (status !== undefined) updateData.status = status;
    if (routeId !== undefined) updateData.routeId = routeId && routeId.trim() ? routeId.trim() : null;
    if (driverId !== undefined) updateData.driverId = driverId && driverId.trim() ? driverId.trim() : null;

    const updatedBus = await prisma.bus.update({
      where: { id },
      data: updateData,
      include: {
        route: true,
        driver: true
      }
    });

    return res.status(200).json({
      success: true,
      message: `Bus ${updatedBus.busNumber} updated successfully.`,
      data: updatedBus
    });
  } catch (error) {
    next(error);
  }
}

// DELETE /api/buses/:id
export async function deleteBus(req, res, next) {
  try {
    const { id } = req.params;

    const bus = await prisma.bus.findUnique({ where: { id } });
    if (!bus) {
      return res.status(404).json({
        success: false,
        error: `Bus with ID '${id}' was not found.`
      });
    }

    await prisma.bus.delete({ where: { id } });

    return res.status(200).json({
      success: true,
      message: `Bus '${bus.busNumber}' was deleted successfully.`
    });
  } catch (error) {
    next(error);
  }
}
