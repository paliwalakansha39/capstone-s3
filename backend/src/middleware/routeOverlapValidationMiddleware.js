/**
 * Route Overlap Validation Middleware
 * 
 * Enforces schema validation, coordinate bounds checking, and input sanitization
 * for proposed route and overlap analysis endpoints.
 */

import { validateRouteCoordinates } from "../services/routeOverlapEngine.js";

/**
 * Validates requests for creating a proposed route.
 */
export function validateCreateProposedRoute(req, res, next) {
  const { name, coordinates, estimatedTravelTime } = req.body || {};

  if (!name || typeof name !== "string" || !name.trim()) {
    return res.status(400).json({
      success: false,
      error: "Route name is required and must be a non-empty string."
    });
  }

  if (name.trim().length > 120) {
    return res.status(400).json({
      success: false,
      error: "Route name cannot exceed 120 characters."
    });
  }

  const coordCheck = validateRouteCoordinates(coordinates);
  if (!coordCheck.valid) {
    return res.status(400).json({
      success: false,
      error: coordCheck.error
    });
  }

  if (estimatedTravelTime !== undefined && estimatedTravelTime !== null && estimatedTravelTime !== "") {
    const parsedTime = Number(estimatedTravelTime);
    if (!Number.isInteger(parsedTime) || parsedTime <= 0) {
      return res.status(400).json({
        success: false,
        error: "Estimated travel time must be a positive integer in minutes."
      });
    }
  }

  return next();
}

/**
 * Validates requests for route overlap analysis.
 */
export function validateAnalyzeOverlap(req, res, next) {
  const { coordinates, proposedRouteId, toleranceMeters } = req.body || {};

  if (!proposedRouteId && (!coordinates || !Array.isArray(coordinates) || coordinates.length === 0)) {
    return res.status(400).json({
      success: false,
      error: "Either proposed route coordinates or a valid proposedRouteId must be provided."
    });
  }

  if (coordinates !== undefined) {
    const coordCheck = validateRouteCoordinates(coordinates);
    if (!coordCheck.valid) {
      return res.status(400).json({
        success: false,
        error: coordCheck.error
      });
    }
  }

  if (toleranceMeters !== undefined && toleranceMeters !== null && toleranceMeters !== "") {
    const parsedTolerance = Number(toleranceMeters);
    if (!Number.isFinite(parsedTolerance) || parsedTolerance <= 0) {
      return res.status(400).json({
        success: false,
        error: "Tolerance must be a positive number in meters."
      });
    }
  }

  return next();
}
