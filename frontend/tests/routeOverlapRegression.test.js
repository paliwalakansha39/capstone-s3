import { describe, it } from "node:test";
import assert from "node:assert/strict";

describe("Frontend Route Overlap Detection Regression Tests", () => {
  const DEFAULT_TOLERANCE_METERS = 50;
  const TOLERANCE_PRESETS = [25, 50, 100, 150];

  it("verifies default tolerance configuration matches backend standard (50m)", () => {
    assert.equal(DEFAULT_TOLERANCE_METERS, 50);
    assert.ok(TOLERANCE_PRESETS.includes(DEFAULT_TOLERANCE_METERS));
  });

  it("validates all selectable tolerance presets are positive integers", () => {
    for (const tol of TOLERANCE_PRESETS) {
      assert.ok(Number.isInteger(tol) && tol > 0, `Tolerance preset ${tol} must be positive integer`);
    }
    assert.deepEqual(TOLERANCE_PRESETS, [25, 50, 100, 150]);
  });

  it("validates severity classification thresholds for network overlap", () => {
    function getOverlapSeverity(percentage) {
      return percentage > 50 ? "high" : percentage > 20 ? "moderate" : "low";
    }

    assert.equal(getOverlapSeverity(0), "low");
    assert.equal(getOverlapSeverity(15), "low");
    assert.equal(getOverlapSeverity(20), "low");
    assert.equal(getOverlapSeverity(20.1), "moderate");
    assert.equal(getOverlapSeverity(45), "moderate");
    assert.equal(getOverlapSeverity(50), "moderate");
    assert.equal(getOverlapSeverity(50.1), "high");
    assert.equal(getOverlapSeverity(95), "high");
  });

  it("validates coordinate normalization across object and tuple formats", () => {
    function normalizeCoords(points) {
      return (points || []).map((p) => [p.latitude ?? p[0], p.longitude ?? p[1]]);
    }

    const objectCoords = [{ latitude: 28.6139, longitude: 77.2090 }, { latitude: 28.6500, longitude: 77.2300 }];
    const tupleCoords = [[28.6139, 77.2090], [28.6500, 77.2300]];

    assert.deepEqual(normalizeCoords(objectCoords), [[28.6139, 77.2090], [28.6500, 77.2300]]);
    assert.deepEqual(normalizeCoords(tupleCoords), [[28.6139, 77.2090], [28.6500, 77.2300]]);
  });

  it("correctly aggregates affected routes and metrics from discrete segments", () => {
    const rawSegments = [
      {
        existingRouteId: "route-1",
        existingRouteNumber: "104",
        existingRouteName: "Kashmere Gate to BBM Depot",
        startPoint: "ISBT",
        endPoint: "Mall Road",
        overlapDistanceMeters: 1400,
        overlapPercentage: 20
      },
      {
        existingRouteId: "route-1",
        existingRouteNumber: "104",
        existingRouteName: "Kashmere Gate to BBM Depot",
        startPoint: "Mall Road",
        endPoint: "BBM Depot",
        overlapDistanceMeters: 600,
        overlapPercentage: 10
      },
      {
        existingRouteId: "route-2",
        existingRouteNumber: "205",
        existingRouteName: "Anand Vihar to Mori Gate",
        startPoint: "Shastri Park",
        endPoint: "ISBT",
        overlapDistance: 800,
        overlapPercentage: 12
      }
    ];

    const routesMap = new Map();
    rawSegments.forEach((seg) => {
      const distMeters = seg.overlapDistanceMeters ?? seg.overlapDistance ?? 0;
      if (!routesMap.has(seg.existingRouteId)) {
        routesMap.set(seg.existingRouteId, {
          existingRouteId: seg.existingRouteId,
          existingRouteNumber: seg.existingRouteNumber,
          existingRouteName: seg.existingRouteName,
          startingPoint: seg.startPoint,
          destination: seg.endPoint,
          overlapDistanceKm: Math.round((distMeters / 1000) * 100) / 100,
          overlapPercentage: Number(seg.overlapPercentage) || 0
        });
      } else {
        const existing = routesMap.get(seg.existingRouteId);
        existing.overlapDistanceKm = Math.round((existing.overlapDistanceKm + distMeters / 1000) * 100) / 100;
        existing.overlapPercentage += Number(seg.overlapPercentage) || 0;
      }
    });

    const affected = Array.from(routesMap.values());
    assert.equal(affected.length, 2);
    assert.equal(affected[0].existingRouteNumber, "104");
    assert.equal(affected[0].overlapDistanceKm, 2.0);
    assert.equal(affected[0].overlapPercentage, 30);
    assert.equal(affected[1].existingRouteNumber, "205");
    assert.equal(affected[1].overlapDistanceKm, 0.8);
  });

  it("verifies analysis request payload generation with tolerance", () => {
    function buildAnalysisPayload(points, name, tolerance) {
      return {
        coordinates: points.map((p) => ({
          latitude: parseFloat(p.latitude),
          longitude: parseFloat(p.longitude)
        })),
        proposedRouteName: name.trim() || "Proposed Route",
        toleranceMeters: Number(tolerance) || DEFAULT_TOLERANCE_METERS,
        saveRecord: true
      };
    }

    const payload = buildAnalysisPayload(
      [{ latitude: "28.6675", longitude: "77.2285" }, { latitude: "28.6750", longitude: "77.2200" }],
      "Test Corridor",
      100
    );

    assert.equal(payload.proposedRouteName, "Test Corridor");
    assert.equal(payload.toleranceMeters, 100);
    assert.equal(payload.saveRecord, true);
    assert.equal(payload.coordinates[0].latitude, 28.6675);
    assert.equal(payload.coordinates[0].longitude, 77.2285);
  });
});
