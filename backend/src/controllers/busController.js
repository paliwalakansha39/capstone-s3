import { Op } from "sequelize";
import { Bus, Route, Driver } from "../models/index.js";

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

    // Search query matches busNumber, registrationNumber, depot, or manufacturer
    if (search && search.trim()) {
      const q = `%${search.trim()}%`;
      where[Op.or] = [
        { busNumber: { [Op.like]: q } },
        { registrationNumber: { [Op.like]: q } },
        { depot: { [Op.like]: q } },
        { manufacturer: { [Op.like]: q } }
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
    const orderDirection = sortOrder.toUpperCase() === "ASC" ? "ASC" : "DESC";

    const { count, rows: buses } = await Bus.findAndCountAll({
      where,
      include: [
        {
          model: Route,
          as: "route",
          attributes: ["id", "routeNumber", "routeName", "startPoint", "endPoint"]
        },
        {
          model: Driver,
          as: "driver",
          attributes: ["id", "name", "badgeNumber", "phone"]
        }
      ],
      order: [[sortField, orderDirection]],
      limit: limitNum,
      offset
    });

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
    const total = await Bus.count();
    const active = await Bus.count({ where: { status: "Active" } });
    const maintenance = await Bus.count({ where: { status: "Maintenance" } });
    const inactive = await Bus.count({ where: { status: "Inactive" } });
    const electric = await Bus.count({ where: { busType: "Electric" } });
    const ac = await Bus.count({ where: { busType: "AC" } });

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

    const bus = await Bus.findByPk(id, {
      include: [
        {
          model: Route,
          as: "route",
          attributes: ["id", "routeNumber", "routeName", "startPoint", "endPoint", "totalDistanceKm"]
        },
        {
          model: Driver,
          as: "driver",
          attributes: ["id", "name", "badgeNumber", "phone", "licenseNumber", "status"]
        }
      ]
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

    // Check for duplicate busNumber
    const existingBusNumber = await Bus.findOne({
      where: { busNumber: trimmedBusNumber }
    });
    if (existingBusNumber) {
      return res.status(409).json({
        success: false,
        error: `A bus with Bus Number '${trimmedBusNumber}' already exists.`
      });
    }

    // Check for duplicate registrationNumber
    const existingRegNumber = await Bus.findOne({
      where: { registrationNumber: trimmedRegNumber }
    });
    if (existingRegNumber) {
      return res.status(409).json({
        success: false,
        error: `A bus with Registration Number '${trimmedRegNumber}' already exists.`
      });
    }

    // Create the bus
    const newBus = await Bus.create({
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
    });

    // Fetch newly created record with associations
    const completeBus = await Bus.findByPk(newBus.id, {
      include: [
        { model: Route, as: "route" },
        { model: Driver, as: "driver" }
      ]
    });

    return res.status(201).json({
      success: true,
      message: `Bus ${completeBus.busNumber} registered successfully.`,
      data: completeBus
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

    const bus = await Bus.findByPk(id);
    if (!bus) {
      return res.status(404).json({
        success: false,
        error: `Bus with ID '${id}' was not found.`
      });
    }

    // Check for duplicate busNumber if updated
    if (busNumber && busNumber.trim() !== bus.busNumber) {
      const duplicateBusNum = await Bus.findOne({
        where: {
          busNumber: busNumber.trim(),
          id: { [Op.ne]: id }
        }
      });
      if (duplicateBusNum) {
        return res.status(409).json({
          success: false,
          error: `Another bus already has Bus Number '${busNumber.trim()}'.`
        });
      }
      bus.busNumber = busNumber.trim();
    }

    // Check for duplicate registrationNumber if updated
    if (registrationNumber && registrationNumber.trim().toUpperCase() !== bus.registrationNumber) {
      const duplicateReg = await Bus.findOne({
        where: {
          registrationNumber: registrationNumber.trim().toUpperCase(),
          id: { [Op.ne]: id }
        }
      });
      if (duplicateReg) {
        return res.status(409).json({
          success: false,
          error: `Another bus already has Registration Number '${registrationNumber.trim().toUpperCase()}'.`
        });
      }
      bus.registrationNumber = registrationNumber.trim().toUpperCase();
    }

    if (busType !== undefined) bus.busType = busType;
    if (capacity !== undefined) bus.capacity = parseInt(capacity, 10);
    if (depot !== undefined) bus.depot = depot ? depot.trim() : null;
    if (modelYear !== undefined) bus.modelYear = modelYear ? parseInt(modelYear, 10) : null;
    if (manufacturer !== undefined) bus.manufacturer = manufacturer ? manufacturer.trim() : null;
    if (status !== undefined) bus.status = status;
    if (routeId !== undefined) bus.routeId = routeId && routeId.trim() ? routeId.trim() : null;
    if (driverId !== undefined) bus.driverId = driverId && driverId.trim() ? driverId.trim() : null;

    await bus.save();

    const updatedBus = await Bus.findByPk(id, {
      include: [
        { model: Route, as: "route" },
        { model: Driver, as: "driver" }
      ]
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

    const bus = await Bus.findByPk(id);
    if (!bus) {
      return res.status(404).json({
        success: false,
        error: `Bus with ID '${id}' was not found.`
      });
    }

    const busNumber = bus.busNumber;
    await bus.destroy();

    return res.status(200).json({
      success: true,
      message: `Bus '${busNumber}' was deleted successfully.`
    });
  } catch (error) {
    next(error);
  }
}
