import { prisma } from "../config/prisma.js";

const routeFields = [
  "routeNumber",
  "routeName",
  "startingPoint",
  "destination",
  "totalDistance",
  "estimatedTravelTime"
];

function validateRoute(input, { partial = false } = {}) {
  const errors = [];
  for (const field of routeFields.slice(0, 4)) {
    if (partial && input[field] === undefined) continue;
    const value = input[field];
    if (typeof value !== "string" || !value.trim() || value.trim().length > (field === "routeNumber" ? 30 : 120)) {
      errors.push(`${field} is required and must be within its allowed length.`);
    }
  }
  for (const field of ["totalDistance", "estimatedTravelTime"]) {
    if (partial && input[field] === undefined) continue;
    const value = input[field];
    if (typeof value !== "number" || !Number.isFinite(value) || value <= 0
      || (field === "estimatedTravelTime" && !Number.isInteger(value))) {
      errors.push(`${field} must be a positive ${field === "estimatedTravelTime" ? "whole number of minutes" : "number"}.`);
    }
  }
  if (input.stops !== undefined) {
    if (!Array.isArray(input.stops)) {
      errors.push("stops must be an array.");
    } else {
      const sequences = new Set();
      const ids = new Set();
      input.stops.forEach((stop, index) => {
        const error = validateStop(stop);
        if (error) errors.push(`Stop ${index + 1}: ${error}`);
        if (Number.isInteger(stop?.sequenceNumber)) {
          if (sequences.has(stop.sequenceNumber)) errors.push("Stop sequence numbers must be unique within a route.");
          sequences.add(stop.sequenceNumber);
        }
        if (stop?.id) {
          if (typeof stop.id !== "string" || ids.has(stop.id)) errors.push("Stop IDs must be unique valid strings.");
          ids.add(stop.id);
        }
      });
    }
  }
  return errors;
}

function validateStop(stop, { partial = false } = {}) {
  if (!stop || typeof stop !== "object" || Array.isArray(stop)) return "must be an object.";
  if ((!partial || stop.stopName !== undefined)
    && (typeof stop.stopName !== "string" || !stop.stopName.trim() || stop.stopName.trim().length > 120)) {
    return "stopName is required and must be 1-120 characters.";
  }
  if ((!partial || stop.latitude !== undefined)
    && (typeof stop.latitude !== "number" || !Number.isFinite(stop.latitude) || stop.latitude < -90 || stop.latitude > 90)) {
    return "latitude must be a number between -90 and 90.";
  }
  if ((!partial || stop.longitude !== undefined)
    && (typeof stop.longitude !== "number" || !Number.isFinite(stop.longitude) || stop.longitude < -180 || stop.longitude > 180)) {
    return "longitude must be a number between -180 and 180.";
  }
  if ((!partial || stop.sequenceNumber !== undefined)
    && (!Number.isInteger(stop.sequenceNumber) || stop.sequenceNumber < 1)) {
    return "sequenceNumber must be a positive whole number.";
  }
  return null;
}

function normalizedRoute(data) {
  const route = {};
  for (const field of routeFields) {
    if (data[field] !== undefined) {
      route[field] = typeof data[field] === "string" ? data[field].trim() : data[field];
    }
  }
  if (route.routeNumber) route.routeNumber = route.routeNumber.toUpperCase();
  return route;
}

function normalizedStop(stop) {
  return {
    stopName: stop.stopName.trim(),
    latitude: stop.latitude,
    longitude: stop.longitude,
    sequenceNumber: stop.sequenceNumber
  };
}

const includeStops = { stops: { orderBy: { sequenceNumber: "asc" } } };

export async function listRoutes(req, res, next) {
  try {
    const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
    const routes = await prisma.route.findMany({
      where: search ? {
        OR: [
          { routeNumber: { contains: search, mode: "insensitive" } },
          { routeName: { contains: search, mode: "insensitive" } },
          { startingPoint: { contains: search, mode: "insensitive" } },
          { destination: { contains: search, mode: "insensitive" } }
        ]
      } : undefined,
      include: includeStops,
      orderBy: { routeNumber: "asc" }
    });
    return res.status(200).json({ success: true, data: routes });
  } catch (error) {
    return next(error);
  }
}

export async function getRoute(req, res, next) {
  try {
    const route = await prisma.route.findUnique({
      where: { id: req.params.id },
      include: includeStops
    });
    if (!route) return res.status(404).json({ success: false, error: "Route not found." });
    return res.status(200).json({ success: true, data: route });
  } catch (error) {
    return next(error);
  }
}

export async function createRoute(req, res, next) {
  try {
    const input = req.body || {};
    const errors = validateRoute(input);
    if (errors.length) return res.status(400).json({ success: false, error: errors[0], errors });
    const route = await prisma.route.create({
      data: {
        ...normalizedRoute(input),
        stops: input.stops?.length
          ? { create: input.stops.map(normalizedStop) }
          : undefined
      },
      include: includeStops
    });
    return res.status(201).json({ success: true, data: route });
  } catch (error) {
    return next(error);
  }
}

export async function updateRoute(req, res, next) {
  try {
    const input = req.body || {};
    const errors = validateRoute(input, { partial: true });
    if (errors.length) return res.status(400).json({ success: false, error: errors[0], errors });
    if (!Object.keys(normalizedRoute(input)).length && input.stops === undefined) {
      return res.status(400).json({ success: false, error: "At least one route field or stops array must be provided." });
    }

    const route = await prisma.$transaction(async (transaction) => {
      const current = await transaction.route.findUnique({
        where: { id: req.params.id },
        include: { stops: true }
      });
      if (!current) return null;

      const changes = normalizedRoute(input);
      if (input.stops !== undefined) {
        const submitted = new Set(input.stops.filter((stop) => stop.id).map((stop) => stop.id));
        const existingIds = new Set(current.stops.map((stop) => stop.id));
        if ([...submitted].some((id) => !existingIds.has(id))) {
          const error = new Error("Every stop ID must belong to this route.");
          error.statusCode = 400;
          throw error;
        }
        await transaction.busStop.deleteMany({ where: { routeId: current.id, id: { notIn: [...submitted] } } });
        for (const [index, stop] of current.stops.entries()) {
          if (submitted.has(stop.id)) {
            await transaction.busStop.update({
              where: { id: stop.id },
              data: { sequenceNumber: -(index + 1) }
            });
          }
        }
        for (const stop of input.stops) {
          const stopData = normalizedStop(stop);
          if (stop.id) {
            await transaction.busStop.update({ where: { id: stop.id }, data: stopData });
          } else {
            await transaction.busStop.create({ data: { ...stopData, routeId: current.id } });
          }
        }
      }

      return transaction.route.update({
        where: { id: current.id },
        data: changes,
        include: includeStops
      });
    });
    if (!route) return res.status(404).json({ success: false, error: "Route not found." });
    return res.status(200).json({ success: true, data: route });
  } catch (error) {
    return next(error);
  }
}

export async function deleteRoute(req, res, next) {
  try {
    await prisma.route.delete({ where: { id: req.params.id } });
    return res.status(200).json({ success: true, message: "Route and its bus stops deleted successfully." });
  } catch (error) {
    return next(error);
  }
}

export async function addRouteStop(req, res, next) {
  try {
    const input = req.body || {};
    const error = validateStop(input);
    if (error) return res.status(400).json({ success: false, error });
    const route = await prisma.route.findUnique({ where: { id: req.params.id }, select: { id: true } });
    if (!route) return res.status(404).json({ success: false, error: "Route not found." });
    const stop = await prisma.busStop.create({
      data: { ...normalizedStop(input), routeId: route.id }
    });
    return res.status(201).json({ success: true, data: stop });
  } catch (error) {
    return next(error);
  }
}

export async function updateStop(req, res, next) {
  try {
    const input = req.body || {};
    const error = validateStop(input, { partial: true });
    if (error) return res.status(400).json({ success: false, error });
    const changes = {};
    if (input.stopName !== undefined) changes.stopName = input.stopName.trim();
    if (input.latitude !== undefined) changes.latitude = input.latitude;
    if (input.longitude !== undefined) changes.longitude = input.longitude;
    if (input.sequenceNumber !== undefined) changes.sequenceNumber = input.sequenceNumber;
    if (!Object.keys(changes).length) {
      return res.status(400).json({ success: false, error: "At least one bus stop field must be provided." });
    }
    const stop = await prisma.busStop.update({ where: { id: req.params.id }, data: changes });
    return res.status(200).json({ success: true, data: stop });
  } catch (error) {
    return next(error);
  }
}

export async function deleteStop(req, res, next) {
  try {
    await prisma.busStop.delete({ where: { id: req.params.id } });
    return res.status(200).json({ success: true, message: "Bus stop deleted successfully." });
  } catch (error) {
    return next(error);
  }
}
