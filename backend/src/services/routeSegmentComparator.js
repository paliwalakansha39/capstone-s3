/**
 * Route Segment Comparator
 * 
 * Compares linear route segments to determine geographical alignment,
 * separation distance, and continuous overlap intervals.
 */

import {
  calculateBearing,
  haversineDistance,
  isAngularAligned,
  projectPointOnSegment,
  subdivideSegment
} from "./geoDistance.js";

/**
 * Compares a proposed segment with an existing segment.
 * 
 * To ensure single-point crossings are NOT incorrectly identified as route overlaps:
 * 1. The two segments must be angularly aligned (parallel along the corridor in either direction).
 *    If two roads intersect at a crossing (e.g. angle > 35 degrees), it is rejected as a crossing.
 * 2. The sample points along the proposed subsegment must fall within toleranceMeters of the existing segment.
 * 
 * @param {{latitude: number, longitude: number}} pStart Proposed segment start
 * @param {{latitude: number, longitude: number}} pEnd Proposed segment end
 * @param {{latitude: number, longitude: number}} eStart Existing segment start
 * @param {{latitude: number, longitude: number}} eEnd Existing segment end
 * @param {number} toleranceMeters Maximum allowable distance to consider overlapping
 * @param {number} sampleStepMeters Resolution for sampling subsegment points
 * @returns {Array<{ startT: number, endT: number, points: Array<{latitude: number, longitude: number}> }>}
 */
export function compareSegments(
  pStart,
  pEnd,
  eStart,
  eEnd,
  toleranceMeters = 50.0,
  sampleStepMeters = 20.0
) {
  const pLength = haversineDistance(pStart.latitude, pStart.longitude, pEnd.latitude, pEnd.longitude);
  const eLength = haversineDistance(eStart.latitude, eStart.longitude, eEnd.latitude, eEnd.longitude);

  if (pLength === 0 || eLength === 0) return [];

  // Check angular alignment between the two segment directions
  const pBearing = calculateBearing(pStart.latitude, pStart.longitude, pEnd.latitude, pEnd.longitude);
  const eBearing = calculateBearing(eStart.latitude, eStart.longitude, eEnd.latitude, eEnd.longitude);

  // If the segments cross at a significant angle, they are crossing, not running along the same corridor
  if (!isAngularAligned(pBearing, eBearing, 35.0)) {
    return [];
  }

  // Sample points along the proposed segment
  const samples = subdivideSegment(pStart, pEnd, sampleStepMeters);
  const sampleCount = samples.length;

  const matches = samples.map((sample, index) => {
    const proj = projectPointOnSegment(sample, eStart, eEnd);
    const t = index / (sampleCount - 1);
    return {
      t,
      point: sample,
      isMatch: proj.distance <= toleranceMeters
    };
  });

  // Group contiguous matching sample sequences
  const intervals = [];
  let inInterval = false;
  let intervalStartT = 0;
  let intervalPoints = [];

  for (let i = 0; i < matches.length; i++) {
    const item = matches[i];
    if (item.isMatch) {
      if (!inInterval) {
        inInterval = true;
        intervalStartT = item.t;
        intervalPoints = [item.point];
      } else {
        intervalPoints.push(item.point);
      }
    } else {
      if (inInterval) {
        inInterval = false;
        intervals.push({
          startT: intervalStartT,
          endT: matches[i - 1].t,
          points: [...intervalPoints]
        });
        intervalPoints = [];
      }
    }
  }

  if (inInterval) {
    intervals.push({
      startT: intervalStartT,
      endT: matches[matches.length - 1].t,
      points: [...intervalPoints]
    });
  }

  return intervals;
}
