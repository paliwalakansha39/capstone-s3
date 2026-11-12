import { Op } from "sequelize";
import { Bus, Route, Trip } from "../models/index.js";

export const VALID_TRIP_STATUSES = ["Scheduled", "In Progress", "Completed", "Cancelled"];
const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Convert HH:mm(:ss) string to minutes from start of day
 */
export function timeStringToMinutes(timeStr) {
  if (!timeStr) return 0;
  const parts = timeStr.split(":").map(Number);
  return parts[0] * 60 + parts[1];
}

/**
 * Build Date objects for start and end of trip to check intervals.
 */
export function getTripInterval(tripDate, departureTime, arrivalTime, isOvernight = false) {
  const [year, month, day] = tripDate.split("-").map(Number);
  const depMinutes = timeStringToMinutes(departureTime);
  const arrMinutes = timeStringToMinutes(arrivalTime);

  const start = new Date(year, month - 1, day, Math.floor(depMinutes / 60), depMinutes % 60, 0, 0);

  // If arrival <= departure or explicitly flagged overnight, arrival is next day
  const isNextDay = isOvernight || arrMinutes <= depMinutes;
  const end = new Date(year, month - 1, isNextDay ? day + 1 : day, Math.floor(arrMinutes / 60), arrMinutes % 60, 0, 0);

  return { start, end, isOvernight: isNextDay };
}

/**
 * Checks whether a bus has an overlapping active or scheduled trip.
 * Returns conflicting trip if found, otherwise null.
 */
export async function findBusTripConflict({
  busId,
  tripDate,
  departureTime,
  arrivalTime,
  excludeTripId = null,
  isOvernight = false
}) {
  const targetInterval = getTripInterval(tripDate, departureTime, arrivalTime, isOvernight);

  // Query trips for this bus that could overlap (date - 1, date, date + 1)
  const targetDateObj = new Date(tripDate);
  const prevDateObj = new Date(targetDateObj);
  prevDateObj.setDate(prevDateObj.getDate() - 1);
  const nextDateObj = new Date(targetDateObj);
  nextDateObj.setDate(nextDateObj.getDate() + 1);

  const prevDateStr = prevDateObj.toISOString().slice(0, 10);
  const nextDateStr = nextDateObj.toISOString().slice(0, 10);

  const whereClause = {
    busId,
    status: {
      [Op.ne]: "Cancelled"
    },
    tripDate: {
      [Op.in]: [prevDateStr, tripDate, nextDateStr]
    }
  };

  if (excludeTripId) {
    whereClause.id = { [Op.ne]: excludeTripId };
  }

  const existingTrips = await Trip.findAll({
    where: whereClause,
    include: [
      {
        model: Route,
        as: "route",
        attributes: ["id", "routeNumber", "routeName"]
      },
      {
        model: Bus,
        as: "bus",
        attributes: ["id", "busNumber"]
      }
    ]
  });

  for (const trip of existingTrips) {
    const existingInterval = getTripInterval(trip.tripDate, trip.departureTime, trip.arrivalTime);
    // Two intervals [A_start, A_end] and [B_start, B_end] overlap if A_start < B_end && B_start < A_end
    if (targetInterval.start < existingInterval.end && existingInterval.start < targetInterval.end) {
      return trip;
    }
  }

  return null;
}

/**
 * Middleware: Validate Trip Creation Payload
 */
export function validateCreateTrip(req, res, next) {
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

  const errors = [];

  if (!routeId || typeof routeId !== "string" || !routeId.trim()) {
    errors.push("Route ID is required.");
  } else if (!UUID_REGEX.test(routeId.trim())) {
    errors.push("Route ID must be a valid UUID.");
  }

  if (!busId || typeof busId !== "string" || !busId.trim()) {
    errors.push("Bus ID is required.");
  } else if (!UUID_REGEX.test(busId.trim())) {
    errors.push("Bus ID must be a valid UUID.");
  }

  if (!tripDate || typeof tripDate !== "string" || !DATE_REGEX.test(tripDate.trim())) {
    errors.push("Trip date is required and must be in YYYY-MM-DD format.");
  } else {
    const parsedDate = new Date(tripDate.trim());
    if (isNaN(parsedDate.getTime())) {
      errors.push("Trip date must be a valid calendar date.");
    }
  }

  if (!departureTime || typeof departureTime !== "string" || !TIME_REGEX.test(departureTime.trim())) {
    errors.push("Departure time is required and must be in HH:mm format (e.g. 08:30).");
  }

  if (!arrivalTime || typeof arrivalTime !== "string" || !TIME_REGEX.test(arrivalTime.trim())) {
    errors.push("Arrival time is required and must be in HH:mm format (e.g. 10:15).");
  }

  if (
    departureTime &&
    arrivalTime &&
    TIME_REGEX.test(departureTime.trim()) &&
    TIME_REGEX.test(arrivalTime.trim())
  ) {
    const depMin = timeStringToMinutes(departureTime.trim());
    const arrMin = timeStringToMinutes(arrivalTime.trim());

    if (depMin === arrMin) {
      errors.push("Arrival time cannot be identical to departure time.");
    } else if (arrMin < depMin && !isOvernight) {
      errors.push(
        "Arrival time cannot be earlier than departure time unless marked as an overnight trip."
      );
    }
  }

  if (!startingStop || typeof startingStop !== "string" || !startingStop.trim()) {
    errors.push("Starting stop is required.");
  } else if (startingStop.trim().length > 120) {
    errors.push("Starting stop cannot exceed 120 characters.");
  }

  if (!destinationStop || typeof destinationStop !== "string" || !destinationStop.trim()) {
    errors.push("Destination stop is required.");
  } else if (destinationStop.trim().length > 120) {
    errors.push("Destination stop cannot exceed 120 characters.");
  }

  if (
    startingStop &&
    destinationStop &&
    startingStop.trim().toLowerCase() === destinationStop.trim().toLowerCase()
  ) {
    errors.push("Starting stop and destination stop cannot be the same.");
  }

  if (status && !VALID_TRIP_STATUSES.includes(status.trim())) {
    errors.push(
      `Trip status must be one of: ${VALID_TRIP_STATUSES.join(", ")}.`
    );
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      error: errors[0],
      errors
    });
  }

  next();
}

/**
 * Middleware: Validate Trip Update Payload
 */
export function validateUpdateTrip(req, res, next) {
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

  const errors = [];

  if (routeId !== undefined) {
    if (!routeId || typeof routeId !== "string" || !routeId.trim()) {
      errors.push("Route ID cannot be empty.");
    } else if (!UUID_REGEX.test(routeId.trim())) {
      errors.push("Route ID must be a valid UUID.");
    }
  }

  if (busId !== undefined) {
    if (!busId || typeof busId !== "string" || !busId.trim()) {
      errors.push("Bus ID cannot be empty.");
    } else if (!UUID_REGEX.test(busId.trim())) {
      errors.push("Bus ID must be a valid UUID.");
    }
  }

  if (tripDate !== undefined) {
    if (!tripDate || typeof tripDate !== "string" || !DATE_REGEX.test(tripDate.trim())) {
      errors.push("Trip date must be in YYYY-MM-DD format.");
    } else {
      const parsedDate = new Date(tripDate.trim());
      if (isNaN(parsedDate.getTime())) {
        errors.push("Trip date must be a valid calendar date.");
      }
    }
  }

  if (departureTime !== undefined) {
    if (!departureTime || typeof departureTime !== "string" || !TIME_REGEX.test(departureTime.trim())) {
      errors.push("Departure time must be in HH:mm format (e.g. 08:30).");
    }
  }

  if (arrivalTime !== undefined) {
    if (!arrivalTime || typeof arrivalTime !== "string" || !TIME_REGEX.test(arrivalTime.trim())) {
      errors.push("Arrival time must be in HH:mm format (e.g. 10:15).");
    }
  }

  if (
    departureTime &&
    arrivalTime &&
    TIME_REGEX.test(departureTime.trim()) &&
    TIME_REGEX.test(arrivalTime.trim())
  ) {
    const depMin = timeStringToMinutes(departureTime.trim());
    const arrMin = timeStringToMinutes(arrivalTime.trim());

    if (depMin === arrMin) {
      errors.push("Arrival time cannot be identical to departure time.");
    } else if (arrMin < depMin && !isOvernight) {
      errors.push(
        "Arrival time cannot be earlier than departure time unless marked as an overnight trip."
      );
    }
  }

  if (startingStop !== undefined) {
    if (!startingStop || typeof startingStop !== "string" || !startingStop.trim()) {
      errors.push("Starting stop cannot be empty.");
    } else if (startingStop.trim().length > 120) {
      errors.push("Starting stop cannot exceed 120 characters.");
    }
  }

  if (destinationStop !== undefined) {
    if (!destinationStop || typeof destinationStop !== "string" || !destinationStop.trim()) {
      errors.push("Destination stop cannot be empty.");
    } else if (destinationStop.trim().length > 120) {
      errors.push("Destination stop cannot exceed 120 characters.");
    }
  }

  if (
    startingStop &&
    destinationStop &&
    startingStop.trim().toLowerCase() === destinationStop.trim().toLowerCase()
  ) {
    errors.push("Starting stop and destination stop cannot be the same.");
  }

  if (status !== undefined && !VALID_TRIP_STATUSES.includes(status.trim())) {
    errors.push(
      `Trip status must be one of: ${VALID_TRIP_STATUSES.join(", ")}.`
    );
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      error: errors[0],
      errors
    });
  }

  next();
}
