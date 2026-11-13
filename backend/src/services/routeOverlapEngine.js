/**
 * Route Overlap Detection Engine
 * 
 * Analyzes geographical corridor overlap between proposed bus routes
 * and established transit routes using great-circle spherical calculations.
 */

export const DEFAULT_OVERLAP_TOLERANCE_METERS = 50.0;
export const MIN_CORRIDOR_OVERLAP_METERS = 30.0;
export const MAX_CROSSING_ANGLE_DEGREES = 35.0;

/**
 * Validates that an array of route coordinates is well-formed.
 * @param {Array<{latitude: number, longitude: number}>} coordinates
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateRouteCoordinates(coordinates) {
  if (!coordinates || !Array.isArray(coordinates)) {
    return { valid: false, error: "Route coordinates must be provided as an array." };
  }
  if (coordinates.length < 2) {
    return { valid: false, error: "A proposed route requires at least 2 geographical coordinates." };
  }
  for (let i = 0; i < coordinates.length; i++) {
    const point = coordinates[i];
    if (!point || typeof point !== "object") {
      return { valid: false, error: `Waypoint ${i + 1} must be an object with latitude and longitude.` };
    }
    const { latitude, longitude } = point;
    if (typeof latitude !== "number" || !Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
      return { valid: false, error: `Waypoint ${i + 1} has an invalid latitude (must be between -90 and 90).` };
    }
    if (typeof longitude !== "number" || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
      return { valid: false, error: `Waypoint ${i + 1} has an invalid longitude (must be between -180 and 180).` };
    }
  }
  return { valid: true };
}
