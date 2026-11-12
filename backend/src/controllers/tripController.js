import { Op } from "sequelize";
import { Bus, Route, Trip } from "../models/index.js";
import { findBusTripConflict } from "../middleware/tripValidationMiddleware.js";

/**
 * GET /api/trips
 * Retrieve all trips with filtering, search, and pagination
 */
export async function getAllTrips(req, res, next) {
  try {
    const {
      search = "",
      status,
      routeId,
      busId,
      tripDate,
      page = 1,
      limit = 10,
      sortBy = "departureTime",
      sortOrder = "ASC"
    } = req.query;

    const where = {};

    if (search && search.trim()) {
      const q = `%${search.trim()}%`;
      where[Op.or] = [
        { startingStop: { [Op.like]: q } },
        { destinationStop: { [Op.like]: q } },
        { "$route.route_number$": { [Op.like]: q } },
        { "$route.route_name$": { [Op.like]: q } },
        { "$bus.bus_number$": { [Op.like]: q } }
      ];
    }

    if (status && status.trim() && status !== "all") {
      where.status = status.trim();
    }

    if (routeId && routeId.trim() && routeId !== "all") {
      where.routeId = routeId.trim();
    }

    if (busId && busId.trim() && busId !== "all") {
      where.busId = busId.trim();
    }

    if (tripDate && tripDate.trim() && tripDate !== "all") {
      where.tripDate = tripDate.trim();
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
    const offset = (pageNum - 1) * limitNum;

    const validSortFields = ["tripDate", "departureTime", "arrivalTime", "status", "createdAt"];
    const sortField = validSortFields.includes(sortBy) ? sortBy : "departureTime";
    const orderDirection = sortOrder.toUpperCase() === "DESC" ? "DESC" : "ASC";

    const { count, rows: trips } = await Trip.findAndCountAll({
      where,
      include: [
        {
          model: Route,
          as: "route",
          attributes: ["id", "routeNumber", "routeName", "startPoint", "endPoint"]
        },
        {
          model: Bus,
          as: "bus",
          attributes: ["id", "busNumber", "registrationNumber", "busType", "status"]
        }
      ],
      order: [
        ["tripDate", "ASC"],
        [sortField, orderDirection]
      ],
      limit: limitNum,
      offset
    });

    const totalPages = Math.ceil(count / limitNum);

    return res.status(200).json({
      success: true,
      data: trips,
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

/**
 * GET /api/trips/stats
 * Aggregate metrics for trips
 */
export async function getTripStats(req, res, next) {
  try {
    const total = await Trip.count();
    const scheduled = await Trip.count({ where: { status: "Scheduled" } });
    const inProgress = await Trip.count({ where: { status: "In Progress" } });
    const completed = await Trip.count({ where: { status: "Completed" } });
    const cancelled = await Trip.count({ where: { status: "Cancelled" } });

    return res.status(200).json({
      success: true,
      data: {
        total,
        scheduled,
        inProgress,
        completed,
        cancelled
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/trips
 * Schedule a new trip
 */
export async function createTrip(req, res, next) {
  try {
    const {
      routeId,
      busId,
      tripDate,
      departureTime,
      arrivalTime,
      startingStop,
      destinationStop,
      status = "Scheduled",
      isOvernight = false
    } = req.body;

    // 1. Verify referenced route exists
    const route = await Route.findByPk(routeId.trim());
    if (!route) {
      return res.status(404).json({
        success: false,
        error: `Referenced route with ID '${routeId}' was not found.`
      });
    }

    // 2. Verify referenced bus exists
    const bus = await Bus.findByPk(busId.trim());
    if (!bus) {
      return res.status(404).json({
        success: false,
        error: `Referenced bus with ID '${busId}' was not found.`
      });
    }

    // 3. Verify bus operational status
    if (bus.status === "Maintenance" || bus.status === "Inactive") {
      return res.status(400).json({
        success: false,
        error: `Cannot assign bus '${bus.busNumber}': bus is currently in '${bus.status}' status.`
      });
    }

    // 4. Check for overlapping trip conflicts for this bus
    const conflict = await findBusTripConflict({
      busId: bus.id,
      tripDate: tripDate.trim(),
      departureTime: departureTime.trim(),
      arrivalTime: arrivalTime.trim(),
      isOvernight: Boolean(isOvernight)
    });

    if (conflict) {
      return res.status(409).json({
        success: false,
        error: `Bus '${bus.busNumber}' is already assigned to an overlapping trip (${conflict.departureTime} - ${conflict.arrivalTime}) on date ${conflict.tripDate}.`,
        conflictTrip: {
          id: conflict.id,
          tripDate: conflict.tripDate,
          departureTime: conflict.departureTime,
          arrivalTime: conflict.arrivalTime,
          status: conflict.status
        }
      });
    }

    // 5. Create the new trip
    const newTrip = await Trip.create({
      routeId: route.id,
      busId: bus.id,
      tripDate: tripDate.trim(),
      departureTime: departureTime.trim(),
      arrivalTime: arrivalTime.trim(),
      startingStop: startingStop.trim(),
      destinationStop: destinationStop.trim(),
      status: status.trim()
    });

    // 6. Fetch complete record with associations
    const completeTrip = await Trip.findByPk(newTrip.id, {
      include: [
        {
          model: Route,
          as: "route",
          attributes: ["id", "routeNumber", "routeName", "startPoint", "endPoint"]
        },
        {
          model: Bus,
          as: "bus",
          attributes: ["id", "busNumber", "registrationNumber", "busType", "status"]
        }
      ]
    });

    return res.status(201).json({
      success: true,
      message: "Trip scheduled successfully.",
      data: completeTrip
    });
  } catch (error) {
    next(error);
  }
}
