import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  calculateBearing,
  calculatePolylineDistance,
  haversineDistance,
  isAngularAligned,
  projectPointOnSegment
} from "../src/services/geoDistance.js";
import {
  calculateOverlapPercentage,
  executeRouteOverlapAnalysis,
  mergeOverlappingIntervals,
  resolveToleranceMeters,
  validateRouteCoordinates
} from "../src/services/routeOverlapEngine.js";

describe("Route Overlap Geographical Detection Algorithm Tests (ASD & DE)", () => {
  // Coordinates in Delhi
  // Kashmere Gate ISBT
  const KASHMERE_GATE = { latitude: 28.6675, longitude: 77.2285 };
  // Red Fort
  const RED_FORT = { latitude: 28.6562, longitude: 77.2410 };
  // Delhi Gate
  const DELHI_GATE = { latitude: 28.6415, longitude: 77.2405 };
  // ITO
  const ITO = { latitude: 28.6289, longitude: 77.2413 };
  // Connaught Place
  const CONNAUGHT_PLACE = { latitude: 28.6315, longitude: 77.2167 };
  // AIIMS
  const AIIMS = { latitude: 28.5672, longitude: 77.2100 };

  it("calculates accurate Haversine distance between known coordinates", () => {
    const dist = haversineDistance(KASHMERE_GATE.latitude, KASHMERE_GATE.longitude, RED_FORT.latitude, RED_FORT.longitude);
    // Distance between Kashmere Gate and Red Fort is approx 1.7 - 1.9 km
    assert.ok(dist > 1500 && dist < 2100, `Expected distance around 1.8km, got ${dist}`);
    assert.equal(haversineDistance(KASHMERE_GATE.latitude, KASHMERE_GATE.longitude, KASHMERE_GATE.latitude, KASHMERE_GATE.longitude), 0);
  });

  it("calculates total polyline distance correctly", () => {
    const polyline = [KASHMERE_GATE, RED_FORT, DELHI_GATE, ITO];
    const totalDist = calculatePolylineDistance(polyline);
    assert.ok(totalDist > 4000 && totalDist < 5500, `Expected approx 4.5km, got ${totalDist}`);
    assert.equal(calculatePolylineDistance([]), 0);
    assert.equal(calculatePolylineDistance([KASHMERE_GATE]), 0);
  });

  it("computes bearings and validates angular alignment for transit corridors", () => {
    // Road running North to South: Red Fort to Delhi Gate
    const bearingNS = calculateBearing(RED_FORT.latitude, RED_FORT.longitude, DELHI_GATE.latitude, DELHI_GATE.longitude);
    // Road running South to North: Delhi Gate to Red Fort (opposite direction along same road)
    const bearingSN = calculateBearing(DELHI_GATE.latitude, DELHI_GATE.longitude, RED_FORT.latitude, RED_FORT.longitude);

    // Opposite direction should be angularly aligned (bi-directional transit corridor)
    assert.ok(isAngularAligned(bearingNS, bearingSN, 35.0), "Opposite direction along same corridor must align");

    // Perpendicular crossing (e.g. East to West crossing a North-South street)
    const crossBearing = (bearingNS + 90) % 360;
    assert.equal(isAngularAligned(bearingNS, crossBearing, 35.0), false, "Perpendicular crossing must not be corridor-aligned");
  });

  it("projects a point accurately onto a line segment", () => {
    const p1 = { latitude: 28.6500, longitude: 77.2400 };
    const p2 = { latitude: 28.6600, longitude: 77.2400 };
    // Point on the segment
    const onSeg = { latitude: 28.6550, longitude: 77.2400 };
    const proj = projectPointOnSegment(onSeg, p1, p2);
    assert.ok(proj.distance < 1.0, "Point on line should have near 0 distance");
    assert.ok(Math.abs(proj.t - 0.5) < 0.01, "Midpoint t should be ~0.5");
  });

  it("Scenario 1: Detects complete (100%) overlap when two routes follow the exact same corridor", () => {
    const existingRoute = {
      id: "ex-1",
      routeNumber: "101",
      routeName: "Netaji Subhash Marg Corridor",
      stops: [
        { sequenceNumber: 1, latitude: 28.6675, longitude: 77.2285 },
        { sequenceNumber: 2, latitude: 28.6562, longitude: 77.2410 },
        { sequenceNumber: 3, latitude: 28.6415, longitude: 77.2405 }
      ]
    };

    const proposedCoordinates = [
      { latitude: 28.6675, longitude: 77.2285 },
      { latitude: 28.6562, longitude: 77.2410 },
      { latitude: 28.6415, longitude: 77.2405 }
    ];

    const result = executeRouteOverlapAnalysis(proposedCoordinates, [existingRoute], 50.0);
    assert.ok(result.overlapPercentage >= 95.0, `Expected ~100% overlap, got ${result.overlapPercentage}%`);
    assert.equal(result.affectedRoutes.length, 1);
  });

  it("Scenario 2: Detects partial overlap when proposed route shares only a subsegment", () => {
    const existingRoute = {
      id: "ex-2",
      routeNumber: "102",
      routeName: "North Central Arterial",
      stops: [
        { sequenceNumber: 1, latitude: 28.6675, longitude: 77.2285 },
        { sequenceNumber: 2, latitude: 28.6562, longitude: 77.2410 }
      ]
    };

    // Proposed route starts at Kashmere Gate, passes Red Fort, then veers to Connaught Place
    const proposedCoordinates = [
      { latitude: 28.6675, longitude: 77.2285 }, // Kashmere Gate
      { latitude: 28.6562, longitude: 77.2410 }, // Red Fort (shared corridor)
      { latitude: 28.6315, longitude: 77.2167 }  // Connaught Place (diverges)
    ];

    const result = executeRouteOverlapAnalysis(proposedCoordinates, [existingRoute], 50.0);
    assert.ok(result.overlapPercentage > 20.0 && result.overlapPercentage < 75.0,
      `Expected partial overlap around 35-50%, got ${result.overlapPercentage}%`);
    assert.equal(result.affectedRoutes.length, 1);
    assert.ok(result.nonOverlappingPolylines.length > 0, "Should include non-overlapping sections");
  });

  it("Scenario 3: Reports 0% overlap when routes are completely disjoint", () => {
    const existingRoute = {
      id: "ex-3",
      routeNumber: "103",
      routeName: "South Delhi Outer Ring",
      stops: [
        { sequenceNumber: 1, latitude: 28.5672, longitude: 77.2100 }, // AIIMS
        { sequenceNumber: 2, latitude: 28.5494, longitude: 77.2001 }  // Hauz Khas
      ]
    };

    // Proposed route in North Delhi
    const proposedCoordinates = [
      { latitude: 28.6675, longitude: 77.2285 },
      { latitude: 28.6562, longitude: 77.2410 }
    ];

    const result = executeRouteOverlapAnalysis(proposedCoordinates, [existingRoute], 50.0);
    assert.equal(result.overlapPercentage, 0.0);
    assert.equal(result.overlappingDistanceMeters, 0.0);
    assert.equal(result.affectedRoutes.length, 0);
  });

  it("Scenario 4: Rejects single-point crossings so intersections are NOT treated as long overlaps", () => {
    // Existing route runs directly East to West
    const existingRoute = {
      id: "ex-cross",
      routeNumber: "CROSS-1",
      routeName: "East-West Transit Way",
      stops: [
        { sequenceNumber: 1, latitude: 28.6500, longitude: 77.2200 },
        { sequenceNumber: 2, latitude: 28.6500, longitude: 77.2600 }
      ]
    };

    // Proposed route runs directly North to South, crossing at (28.6500, 77.2400) perpendicularly
    const proposedCoordinates = [
      { latitude: 28.6300, longitude: 77.2400 },
      { latitude: 28.6700, longitude: 77.2400 }
    ];

    const result = executeRouteOverlapAnalysis(proposedCoordinates, [existingRoute], 50.0);
    assert.equal(result.overlapPercentage, 0.0, "Perpendicular crossing must yield 0% corridor overlap");
    assert.equal(result.affectedRoutes.length, 0);
  });

  it("Scenario 5 & 6: Handles routes with slight coordinate variations within tolerance", () => {
    const existingRoute = {
      id: "ex-tol",
      routeNumber: "TOL-1",
      routeName: "Arterial Road",
      stops: [
        { sequenceNumber: 1, latitude: 28.6500, longitude: 77.2400 },
        { sequenceNumber: 2, latitude: 28.6600, longitude: 77.2400 }
      ]
    };

    // Proposed route is offset by ~20 meters East (~0.0002 deg lon)
    const proposedCoordinates = [
      { latitude: 28.6500, longitude: 77.2402 },
      { latitude: 28.6600, longitude: 77.2402 }
    ];

    // With 50m tolerance, this should be detected as an overlap
    const resultWith50m = executeRouteOverlapAnalysis(proposedCoordinates, [existingRoute], 50.0);
    assert.ok(resultWith50m.overlapPercentage >= 90.0, "Offset of 20m should be within 50m tolerance");

    // With 10m tolerance, offset of 20m should be rejected
    const resultWith10m = executeRouteOverlapAnalysis(proposedCoordinates, [existingRoute], 10.0);
    assert.equal(resultWith10m.overlapPercentage, 0.0, "Offset of 20m should not match 10m tolerance");
  });

  it("Scenario 7 & 8: Rejects empty or invalid route coordinates with descriptive errors", () => {
    assert.equal(validateRouteCoordinates(null).valid, false);
    assert.equal(validateRouteCoordinates([]).valid, false);
    assert.equal(validateRouteCoordinates([{ latitude: 28.6 }]).valid, false);
    assert.equal(validateRouteCoordinates([{ latitude: 95.0, longitude: 77.0 }, { latitude: 28.0, longitude: 77.0 }]).valid, false);
    assert.equal(validateRouteCoordinates([{ latitude: 28.0, longitude: 190.0 }, { latitude: 28.0, longitude: 77.0 }]).valid, false);

    assert.throws(() => {
      executeRouteOverlapAnalysis([], []);
    }, /at least 2 geographical coordinates/);
  });

  it("Scenario 9 & 10: Prevents duplicate overlap counting when multiple routes overlap the same corridor", () => {
    // Corridor AB
    const corridorA = { latitude: 28.6500, longitude: 77.2400 };
    const corridorB = { latitude: 28.6600, longitude: 77.2400 };

    // Route 1 covers AB
    const existingRoute1 = {
      id: "dup-1",
      routeNumber: "101",
      routeName: "Route 101",
      stops: [
        { sequenceNumber: 1, latitude: corridorA.latitude, longitude: corridorA.longitude },
        { sequenceNumber: 2, latitude: corridorB.latitude, longitude: corridorB.longitude }
      ]
    };

    // Route 2 ALSO covers the exact same corridor AB
    const existingRoute2 = {
      id: "dup-2",
      routeNumber: "102",
      routeName: "Route 102",
      stops: [
        { sequenceNumber: 1, latitude: corridorA.latitude, longitude: corridorA.longitude },
        { sequenceNumber: 2, latitude: corridorB.latitude, longitude: corridorB.longitude }
      ]
    };

    // Proposed route covers AB (length L)
    const proposedCoordinates = [corridorA, corridorB];

    // Both routes overlap 100% of the proposed route, but total unique overlap MUST NOT be 200%!
    const result = executeRouteOverlapAnalysis(proposedCoordinates, [existingRoute1, existingRoute2], 50.0);

    assert.ok(result.overlapPercentage <= 100.0, `Overlap percentage must never exceed 100%, got ${result.overlapPercentage}%`);
    assert.ok(result.overlapPercentage >= 95.0, `Expected ~100%, got ${result.overlapPercentage}%`);
    assert.ok(result.overlappingDistanceMeters <= result.proposedTotalDistanceMeters + 1.0,
      "Overlapping distance must not exceed proposed total distance");
    assert.equal(result.affectedRoutes.length, 2, "Both overlapping routes must be reported in breakdown");
  });

  it("Scenario 11: Validates tolerance bounding and formula clamping", () => {
    assert.equal(resolveToleranceMeters(-10), 50.0);
    assert.equal(resolveToleranceMeters(1000), 500.0);
    assert.equal(resolveToleranceMeters("75"), 75.0);
    assert.equal(calculateOverlapPercentage(50, 100), 50.0);
    assert.equal(calculateOverlapPercentage(0, 100), 0.0);
    assert.equal(calculateOverlapPercentage(120, 100), 100.0);
    assert.equal(calculateOverlapPercentage(50, 0), 0.0);
  });
});
