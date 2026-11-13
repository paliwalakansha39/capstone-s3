import { prisma } from "../config/prisma.js";
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
      const q = search.trim();
      where.OR = [
        { startingStop: { contains: q, mode: "insensitive" } },
        { destinationStop: { contains: q, mode: "insensitive" } },
        { route: { routeNumber: { contains: q, mode: "insensitive" } } },
        { route: { routeName: { contains: q, mode: "insensitive" } } },
        { bus: { busNumber: { contains: q, mode: "insensitive" } } }
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
    const orderDirection = sortOrder.toUpperCase() === "DESC" ? "desc" : "asc";

    const [count, trips] = await Promise.all([
      prisma.trip.count({ where }),
      prisma.trip.findMany({
        where,
        include: {
          route: {
            select: { id: true, routeNumber: true, routeName: true, startingPoint: true, destination: true }
          },
          bus: {
            select: { id: true, busNumber: true, registrationNumber: true, busType: true, status: true }
          }
        },
        orderBy: [
          { tripDate: "asc" },
          { [sortField]: orderDirection }
        ],
        skip: offset,
        take: limitNum
      })
    ]);

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
    const [total, scheduled, inProgress, completed, cancelled] = await Promise.all([
      prisma.trip.count(),
      prisma.trip.count({ where: { status: "Scheduled" } }),
      prisma.trip.count({ where: { status: "In Progress" } }),
      prisma.trip.count({ where: { status: "Completed" } }),
      prisma.trip.count({ where: { status: "Cancelled" } })
    ]);

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
    const route = await prisma.route.findUnique({
      where: { id: routeId.trim() }
    });
    if (!route) {
      return res.status(404).json({
        success: false,
        error: `Referenced route with ID '${routeId}' was not found.`
      });
    }

    // 2. Verify referenced bus exists
    const bus = await prisma.bus.findUnique({
      where: { id: busId.trim() }
    });
    if (!bus) {
      return res.status(404).json({
        success: false,
        error: `Referenced bus with ID '${busId}' was not found.`
      });
    }

    // 3. Ensure bus is operational
    if (bus.status === "Maintenance" || bus.status === "Inactive") {
      return res.status(400).json({
        success: false,
        error: `Cannot assign bus '${bus.busNumber}': bus is currently in '${bus.status}' status.`
      });
    }

    // 4. Overlap & Conflict Detection
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
        error: `Bus is already assigned to an overlapping trip (${conflict.departureTime} - ${conflict.arrivalTime}) on date ${conflict.tripDate}.`,
        conflictTrip: {
          id: conflict.id,
          tripDate: conflict.tripDate,
          departureTime: conflict.departureTime,
          arrivalTime: conflict.arrivalTime,
          status: conflict.status,
          route: conflict.route
        }
      });
    }

    // 5. Create Trip Record
    const newTrip = await prisma.trip.create({
      data: {
        routeId: route.id,
        busId: bus.id,
        tripDate: tripDate.trim(),
        departureTime: departureTime.trim(),
        arrivalTime: arrivalTime.trim(),
        startingStop: startingStop.trim(),
        destinationStop: destinationStop.trim(),
        status,
        isOvernight: Boolean(isOvernight)
      },
      include: {
        route: {
          select: { id: true, routeNumber: true, routeName: true, startingPoint: true, destination: true }
        },
        bus: {
          select: { id: true, busNumber: true, registrationNumber: true, busType: true, status: true }
        }
      }
    });

    return res.status(201).json({
      success: true,
      message: "Trip scheduled successfully.",
      data: newTrip
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/trips/:id
 * Retrieve a single trip by ID with route and bus details
 */
export async function getTripById(req, res, next) {
  try {
    const { id } = req.params;

    const trip = await prisma.trip.findUnique({
      where: { id },
      include: {
        route: {
          select: { id: true, routeNumber: true, routeName: true, startingPoint: true, destination: true, totalDistance: true }
        },
        bus: {
          select: { id: true, busNumber: true, registrationNumber: true, busType: true, status: true, capacity: true }
        }
      }
    });

    if (!trip) {
      return res.status(404).json({
        success: false,
        error: `Trip with ID '${id}' was not found.`
      });
    }

    return res.status(200).json({
      success: true,
      data: trip
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /api/trips/:id
 * Update trip details, schedule, or status
 */
export async function updateTrip(req, res, next) {
  try {
    const { id } = req.params;
    const {
      routeId,
      busId,
      tripDate,
      departureTime,
      arrivalTime,
      startingStop,
      destinationStop,
      status,
      isOvernight
    } = req.body;

    const trip = await prisma.trip.findUnique({ where: { id } });
    if (!trip) {
      return res.status(404).json({
        success: false,
        error: `Trip with ID '${id}' was not found.`
      });
    }

    const targetRouteId = routeId !== undefined ? routeId.trim() : trip.routeId;
    const targetBusId = busId !== undefined ? busId.trim() : trip.busId;
    const targetTripDate = tripDate !== undefined ? tripDate.trim() : trip.tripDate;
    const targetDepartureTime = departureTime !== undefined ? departureTime.trim() : trip.departureTime;
    const targetArrivalTime = arrivalTime !== undefined ? arrivalTime.trim() : trip.arrivalTime;
    const targetStatus = status !== undefined ? status.trim() : trip.status;

    // Verify route if updated
    if (routeId !== undefined && targetRouteId !== trip.routeId) {
      const route = await prisma.route.findUnique({
        where: { id: targetRouteId }
      });
      if (!route) {
        return res.status(404).json({
          success: false,
          error: `Referenced route with ID '${targetRouteId}' was not found.`
        });
      }
    }

    // Verify bus if updated or checked
    if (busId !== undefined && targetBusId !== trip.busId) {
      const bus = await prisma.bus.findUnique({
        where: { id: targetBusId }
      });
      if (!bus) {
        return res.status(404).json({
          success: false,
          error: `Referenced bus with ID '${targetBusId}' was not found.`
        });
      }
      if (bus.status === "Maintenance" || bus.status === "Inactive") {
        return res.status(400).json({
          success: false,
          error: `Cannot assign bus '${bus.busNumber}': bus is currently in '${bus.status}' status.`
        });
      }
    }

    // Check conflict if timing, date, bus, or status changed
    if (targetStatus !== "Cancelled") {
      const conflict = await findBusTripConflict({
        busId: targetBusId,
        tripDate: targetTripDate,
        departureTime: targetDepartureTime,
        arrivalTime: targetArrivalTime,
        excludeTripId: trip.id,
        isOvernight: Boolean(isOvernight)
      });

      if (conflict) {
        return res.status(409).json({
          success: false,
          error: `Bus is already assigned to an overlapping trip (${conflict.departureTime} - ${conflict.arrivalTime}) on date ${conflict.tripDate}.`,
          conflictTrip: {
            id: conflict.id,
            tripDate: conflict.tripDate,
            departureTime: conflict.departureTime,
            arrivalTime: conflict.arrivalTime,
            status: conflict.status
          }
        });
      }
    }

    const updateData = {};
    if (routeId !== undefined) updateData.routeId = targetRouteId;
    if (busId !== undefined) updateData.busId = targetBusId;
    if (tripDate !== undefined) updateData.tripDate = targetTripDate;
    if (departureTime !== undefined) updateData.departureTime = targetDepartureTime;
    if (arrivalTime !== undefined) updateData.arrivalTime = targetArrivalTime;
    if (startingStop !== undefined) updateData.startingStop = startingStop.trim();
    if (destinationStop !== undefined) updateData.destinationStop = destinationStop.trim();
    if (status !== undefined) updateData.status = targetStatus;

    const completeTrip = await prisma.trip.update({
      where: { id },
      data: updateData,
      include: {
        route: {
          select: { id: true, routeNumber: true, routeName: true, startingPoint: true, destination: true }
        },
        bus: {
          select: { id: true, busNumber: true, registrationNumber: true, busType: true, status: true }
        }
      }
    });

    return res.status(200).json({
      success: true,
      message: "Trip schedule updated successfully.",
      data: completeTrip
    });
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/trips/:id
 * Delete a trip schedule
 */
export async function deleteTrip(req, res, next) {
  try {
    const { id } = req.params;

    const trip = await prisma.trip.findUnique({ where: { id } });
    if (!trip) {
      return res.status(404).json({
        success: false,
        error: `Trip with ID '${id}' was not found.`
      });
    }

    if (trip.status === "In Progress") {
      return res.status(400).json({
        success: false,
        error: "Cannot delete an active trip that is currently 'In Progress'. Mark as Completed or Cancelled first."
      });
    }

    await prisma.trip.delete({ where: { id } });

    return res.status(200).json({
      success: true,
      message: "Trip schedule deleted successfully."
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/trips/bus-availability
 * Check if a specific bus is available for a trip time window
 */
export async function checkBusAvailability(req, res, next) {
  try {
    const { busId, tripDate, departureTime, arrivalTime, excludeTripId, isOvernight } = req.query;

    if (!busId || !tripDate || !departureTime || !arrivalTime) {
      return res.status(400).json({
        success: false,
        error: "busId, tripDate, departureTime, and arrivalTime query parameters are required."
      });
    }

    const bus = await prisma.bus.findUnique({ where: { id: busId.trim() } });
    if (!bus) {
      return res.status(404).json({
        success: false,
        error: `Bus with ID '${busId}' was not found.`
      });
    }

    if (bus.status === "Maintenance" || bus.status === "Inactive") {
      return res.status(200).json({
        success: true,
        data: {
          available: false,
          reason: `Bus is currently in '${bus.status}' status.`,
          bus: {
            id: bus.id,
            busNumber: bus.busNumber,
            status: bus.status
          }
        }
      });
    }

    const conflict = await findBusTripConflict({
      busId: bus.id,
      tripDate: tripDate.trim(),
      departureTime: departureTime.trim(),
      arrivalTime: arrivalTime.trim(),
      excludeTripId: excludeTripId ? excludeTripId.trim() : null,
      isOvernight: isOvernight === "true" || isOvernight === true
    });

    if (conflict) {
      return res.status(200).json({
        success: true,
        data: {
          available: false,
          reason: `Bus '${bus.busNumber}' is assigned to an overlapping trip (${conflict.departureTime} - ${conflict.arrivalTime}) on ${conflict.tripDate}.`,
          conflictTrip: {
            id: conflict.id,
            tripDate: conflict.tripDate,
            departureTime: conflict.departureTime,
            arrivalTime: conflict.arrivalTime,
            status: conflict.status,
            route: conflict.route
          },
          bus: {
            id: bus.id,
            busNumber: bus.busNumber,
            status: bus.status
          }
        }
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        available: true,
        reason: "Bus is available for assignment.",
        bus: {
          id: bus.id,
          busNumber: bus.busNumber,
          status: bus.status
        }
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/trips/available-buses
 * Get all buses with their availability status for a specific date and time slot
 */
export async function getAvailableBuses(req, res, next) {
  try {
    const { tripDate, departureTime, arrivalTime, excludeTripId, isOvernight } = req.query;

    const allBuses = await prisma.bus.findMany({
      orderBy: { busNumber: "asc" }
    });

    if (!tripDate || !departureTime || !arrivalTime) {
      return res.status(200).json({
        success: true,
        data: allBuses.map((bus) => ({
          ...bus,
          isAvailable: bus.status === "Active",
          unavailableReason: bus.status !== "Active" ? `Bus is in ${bus.status} status` : null
        }))
      });
    }

    const busesWithStatus = await Promise.all(
      allBuses.map(async (bus) => {
        if (bus.status !== "Active") {
          return {
            ...bus,
            isAvailable: false,
            unavailableReason: `Bus is in ${bus.status} status`
          };
        }

        const conflict = await findBusTripConflict({
          busId: bus.id,
          tripDate: tripDate.trim(),
          departureTime: departureTime.trim(),
          arrivalTime: arrivalTime.trim(),
          excludeTripId: excludeTripId ? excludeTripId.trim() : null,
          isOvernight: isOvernight === "true" || isOvernight === true
        });

        if (conflict) {
          return {
            ...bus,
            isAvailable: false,
            unavailableReason: `Busy with trip (${conflict.departureTime} - ${conflict.arrivalTime})`,
            conflictTrip: {
              id: conflict.id,
              departureTime: conflict.departureTime,
              arrivalTime: conflict.arrivalTime,
              route: conflict.route
            }
          };
        }

        return {
          ...bus,
          isAvailable: true,
          unavailableReason: null
        };
      })
    );

    return res.status(200).json({
      success: true,
      data: busesWithStatus
    });
  } catch (error) {
    next(error);
  }
}
