/**
 * Geographical Distance and Geometric Projection Utilities
 * 
 * Provides Haversine distance, bearing calculations, and geodesic projection
 * methods for accurate geographical route analysis.
 */

export const EARTH_RADIUS_METERS = 6371000.0;

/**
 * Converts degrees to radians.
 */
export function toRadians(degrees) {
  return (degrees * Math.PI) / 180.0;
}

/**
 * Converts radians to degrees.
 */
export function toDegrees(radians) {
  return (radians * 180.0) / Math.PI;
}

/**
 * Calculates the great-circle distance between two coordinates using the Haversine formula.
 * @param {number} lat1
 * @param {number} lon1
 * @param {number} lat2
 * @param {number} lon2
 * @returns {number} Distance in meters
 */
export function haversineDistance(lat1, lon1, lat2, lon2) {
  if (lat1 === lat2 && lon1 === lon2) return 0.0;

  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const phi1 = toRadians(lat1);
  const phi2 = toRadians(lat2);

  const sinHalfLat = Math.sin(dLat / 2);
  const sinHalfLon = Math.sin(dLon / 2);

  const a = sinHalfLat * sinHalfLat + Math.cos(phi1) * Math.cos(phi2) * sinHalfLon * sinHalfLon;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(Math.max(0, 1 - a)));

  return EARTH_RADIUS_METERS * c;
}

/**
 * Calculates total cumulative distance of a polyline in meters.
 * @param {Array<{latitude: number, longitude: number}>} coordinates
 * @returns {number} Distance in meters
 */
export function calculatePolylineDistance(coordinates) {
  if (!coordinates || coordinates.length < 2) return 0.0;
  let total = 0.0;
  for (let i = 0; i < coordinates.length - 1; i++) {
    total += haversineDistance(
      coordinates[i].latitude,
      coordinates[i].longitude,
      coordinates[i + 1].latitude,
      coordinates[i + 1].longitude
    );
  }
  return total;
}

/**
 * Computes forward azimuth/bearing in degrees (0..360) from point A to point B.
 */
export function calculateBearing(lat1, lon1, lat2, lon2) {
  const phi1 = toRadians(lat1);
  const phi2 = toRadians(lat2);
  const dLon = toRadians(lon2 - lon1);

  const y = Math.sin(dLon) * Math.cos(phi2);
  const x = Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(dLon);
  const bearing = (toDegrees(Math.atan2(y, x)) + 360) % 360;
  return bearing;
}

/**
 * Computes the absolute angular difference (0..180 degrees) between two bearings.
 */
export function angleDifference(bearing1, bearing2) {
  const diff = Math.abs(bearing1 - bearing2) % 360;
  return diff > 180 ? 360 - diff : diff;
}

/**
 * Checks whether two vectors are aligned along a transit corridor.
 * A corridor match can either be in the same direction or in opposite directions.
 * @param {number} bearing1
 * @param {number} bearing2
 * @param {number} maxAngleDeg Maximum deviation in degrees (e.g. 35 degrees)
 * @returns {boolean}
 */
export function isAngularAligned(bearing1, bearing2, maxAngleDeg = 35.0) {
  const diff = angleDifference(bearing1, bearing2);
  // Aligned in same direction (diff <= maxAngleDeg) or opposite direction (diff >= 180 - maxAngleDeg)
  return diff <= maxAngleDeg || diff >= (180.0 - maxAngleDeg);
}

/**
 * Interpolates a point along a straight line segment at a given fractional distance t in [0, 1].
 */
export function interpolatePoint(p1, p2, t) {
  return {
    latitude: p1.latitude + (p2.latitude - p1.latitude) * t,
    longitude: p1.longitude + (p2.longitude - p1.longitude) * t
  };
}

/**
 * Projects a point P onto a line segment AB.
 * Returns the closest point on segment AB, the parameterized fraction t in [0, 1],
 * and the distance in meters from P to the closest point.
 */
export function projectPointOnSegment(point, segStart, segEnd) {
  const segLength = haversineDistance(
    segStart.latitude,
    segStart.longitude,
    segEnd.latitude,
    segEnd.longitude
  );

  if (segLength === 0) {
    const dist = haversineDistance(point.latitude, point.longitude, segStart.latitude, segStart.longitude);
    return { closestPoint: { ...segStart }, t: 0, distance: dist };
  }

  // Convert to local planar projection centered at segStart for projection
  const midLat = toRadians((segStart.latitude + segEnd.latitude) / 2);
  const cosMidLat = Math.cos(midLat);

  const dx = toRadians(segEnd.longitude - segStart.longitude) * cosMidLat * EARTH_RADIUS_METERS;
  const dy = toRadians(segEnd.latitude - segStart.latitude) * EARTH_RADIUS_METERS;

  const px = toRadians(point.longitude - segStart.longitude) * cosMidLat * EARTH_RADIUS_METERS;
  const py = toRadians(point.latitude - segStart.latitude) * EARTH_RADIUS_METERS;

  const segLengthSq = dx * dx + dy * dy;
  let t = 0;
  if (segLengthSq > 0) {
    t = (px * dx + py * dy) / segLengthSq;
    t = Math.max(0, Math.min(1, t));
  }

  const closest = interpolatePoint(segStart, segEnd, t);
  const distance = haversineDistance(point.latitude, point.longitude, closest.latitude, closest.longitude);

  return { closestPoint: closest, t, distance };
}

/**
 * Subdivides a segment into discrete sample points spaced by at most stepMeters.
 */
export function subdivideSegment(startPoint, endPoint, stepMeters = 25.0) {
  const dist = haversineDistance(startPoint.latitude, startPoint.longitude, endPoint.latitude, endPoint.longitude);
  if (dist <= stepMeters) {
    return [{ ...startPoint }, { ...endPoint }];
  }
  const numSteps = Math.ceil(dist / stepMeters);
  const points = [];
  for (let i = 0; i <= numSteps; i++) {
    points.push(interpolatePoint(startPoint, endPoint, i / numSteps));
  }
  return points;
}
