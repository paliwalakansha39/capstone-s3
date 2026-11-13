/**
 * Route Overlap Detection Engine
 * 
 * Analyzes geographical corridor overlap between proposed bus routes
 * and established transit routes using great-circle spherical calculations.
 */

export const DEFAULT_OVERLAP_TOLERANCE_METERS = 50.0;
export const MIN_ALLOWED_TOLERANCE_METERS = 5.0;
export const MAX_ALLOWED_TOLERANCE_METERS = 500.0;
export const MIN_CORRIDOR_OVERLAP_METERS = 30.0;
export const MAX_CROSSING_ANGLE_DEGREES = 35.0;

/**
 * Normalizes and validates the overlap tolerance parameter.
 * @param {number|string|undefined} toleranceInput
 * @returns {number} Clamped and validated tolerance in meters
 */
export function resolveToleranceMeters(toleranceInput) {
  if (toleranceInput === undefined || toleranceInput === null || toleranceInput === "") {
    return DEFAULT_OVERLAP_TOLERANCE_METERS;
  }
  const parsed = Number(toleranceInput);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_OVERLAP_TOLERANCE_METERS;
  }
  return Math.max(MIN_ALLOWED_TOLERANCE_METERS, Math.min(MAX_ALLOWED_TOLERANCE_METERS, parsed));
}

/**
 * Calculates adaptive sampling step based on tolerance.
 * Ensures the sampling interval is fine enough to detect continuous overlaps.
 * @param {number} toleranceMeters
 * @returns {number} Sample step in meters
 */
export function getAdaptiveSampleStep(toleranceMeters) {
  return Math.max(10.0, Math.min(25.0, toleranceMeters * 0.5));
}

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


import {
  calculatePolylineDistance,
  haversineDistance,
  interpolatePoint
} from "./geoDistance.js";
import { compareSegments } from "./routeSegmentComparator.js";

/**
 * Breaks a route coordinate array into ordered linear segments with precalculated cumulative distances.
 * @param {Array<{latitude: number, longitude: number}>} coordinates
 * @returns {Array<{ start: Object, end: Object, length: number, cumulativeStart: number, cumulativeEnd: number }>}
 */
export function buildRouteSegments(coordinates) {
  const segments = [];
  let cumulative = 0.0;
  for (let i = 0; i < coordinates.length - 1; i++) {
    const start = coordinates[i];
    const end = coordinates[i + 1];
    const length = haversineDistance(start.latitude, start.longitude, end.latitude, end.longitude);
    segments.push({
      index: i,
      start,
      end,
      length,
      cumulativeStart: cumulative,
      cumulativeEnd: cumulative + length
    });
    cumulative += length;
  }
  return segments;
}

/**
 * Detects partial and full overlapping sections between proposed route segments and an existing route.
 * @param {Array<Object>} proposedSegments
 * @param {Object} existingRoute
 * @param {number} toleranceMeters
 * @returns {Array<Object>} List of overlapping segments for this existing route
 */
export function detectPartialOverlapsForRoute(proposedSegments, existingRoute, toleranceMeters = 50.0) {
  const existingStops = existingRoute.stops || [];
  if (existingStops.length < 2) return [];

  const existingSegments = buildRouteSegments(existingStops);
  const sampleStep = getAdaptiveSampleStep(toleranceMeters);
  const detectedOverlaps = [];

  for (const pSeg of proposedSegments) {
    if (pSeg.length === 0) continue;

    for (const eSeg of existingSegments) {
      if (eSeg.length === 0) continue;

      const matches = compareSegments(
        pSeg.start,
        pSeg.end,
        eSeg.start,
        eSeg.end,
        toleranceMeters,
        sampleStep
      );

      for (const match of matches) {
        const segOverlapDist = pSeg.length * (match.endT - match.startT);
        if (segOverlapDist < MIN_CORRIDOR_OVERLAP_METERS && (match.endT - match.startT) < 0.99) {
          // Ignore negligible transient contacts under 30 meters unless it's nearly the full segment
          continue;
        }

        const startCoord = interpolatePoint(pSeg.start, pSeg.end, match.startT);
        const endCoord = interpolatePoint(pSeg.start, pSeg.end, match.endT);

        const globalStartDist = pSeg.cumulativeStart + match.startT * pSeg.length;
        const globalEndDist = pSeg.cumulativeStart + match.endT * pSeg.length;

        detectedOverlaps.push({
          existingRouteId: existingRoute.id,
          existingRouteNumber: existingRoute.routeNumber,
          existingRouteName: existingRoute.routeName,
          proposedSegmentIndex: pSeg.index,
          startT: match.startT,
          endT: match.endT,
          globalStartDist,
          globalEndDist,
          overlapDistance: segOverlapDist,
          startPoint: startCoord,
          endPoint: endCoord,
          coordinates: match.points.length >= 2 ? match.points : [startCoord, endCoord]
        });
      }
    }
  }

  return detectedOverlaps;
}


/**
 * Calculates the percentage of the proposed route that overlaps with existing routes.
 * 
 * Formula:
 * Overlap Percentage = (Overlapping Distance / Proposed Route Total Distance) * 100
 * 
 * Clamped strictly between 0.0 and 100.0.
 * 
 * @param {number} overlappingDistance Distance in meters or km
 * @param {number} totalDistance Distance in same units
 * @returns {number} Percentage between 0 and 100 rounded to 2 decimal places
 */
export function calculateOverlapPercentage(overlappingDistance, totalDistance) {
  if (!totalDistance || totalDistance <= 0 || !overlappingDistance || overlappingDistance <= 0) {
    return 0.0;
  }
  const ratio = (overlappingDistance / totalDistance) * 100.0;
  const clamped = Math.max(0.0, Math.min(100.0, ratio));
  return Math.round(clamped * 100) / 100;
}


/**
 * Merges overlapping or touching 1D intervals along the proposed route.
 * Prevents double-counting overlapping distance when multiple existing routes
 * overlap the same physical corridor segment.
 * 
 * @param {Array<{globalStartDist: number, globalEndDist: number}>} intervals
 * @returns {Array<{start: number, end: number, length: number}>}
 */
export function mergeOverlappingIntervals(intervals) {
  if (!intervals || intervals.length === 0) return [];

  // Normalize each interval so start <= end
  const normalized = intervals
    .map((item) => ({
      start: Math.min(item.globalStartDist, item.globalEndDist),
      end: Math.max(item.globalStartDist, item.globalEndDist)
    }))
    .filter((item) => item.end > item.start)
    .sort((a, b) => a.start - b.start);

  if (normalized.length === 0) return [];

  const merged = [normalized[0]];

  for (let i = 1; i < normalized.length; i++) {
    const current = normalized[i];
    const last = merged[merged.length - 1];

    if (current.start <= last.end + 1.0) {
      // Intervals overlap or touch within 1 meter
      last.end = Math.max(last.end, current.end);
    } else {
      merged.push({ start: current.start, end: current.end });
    }
  }

  return merged.map((m) => ({
    start: m.start,
    end: m.end,
    length: m.end - m.start
  }));
}

/**
 * Calculates the total unique overlapping distance across all overlapping intervals.
 * @param {Array<{globalStartDist: number, globalEndDist: number}>} intervals
 * @returns {number} Distance in meters
 */
export function calculateUniqueOverlappingDistance(intervals) {
  const merged = mergeOverlappingIntervals(intervals);
  return merged.reduce((acc, curr) => acc + curr.length, 0.0);
}
