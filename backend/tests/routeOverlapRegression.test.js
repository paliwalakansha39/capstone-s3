import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";
import { createApp } from "../src/app.js";
import { initDatabaseConnection } from "../src/config/database.js";
import { prisma } from "../src/config/prisma.js";
import { runMigrations } from "../src/scripts/migrate.js";
import { seedDatabase } from "../src/scripts/seed.js";
import {
  DEFAULT_OVERLAP_TOLERANCE_METERS,
  executeRouteOverlapAnalysis,
  resolveToleranceMeters
} from "../src/services/routeOverlapEngine.js";

const TEST_SECRET = "route-overlap-regression-secret-key-32-chars";
process.env.JWT_SECRET = TEST_SECRET;
const ADMIN_TOKEN = jwt.sign({ id: "overlap-regression-admin", role: "admin" }, TEST_SECRET);

let server;
let baseUrl;
const cleanupAnalysisIds = [];
const cleanupProposedIds = [];

function request(path, options = {}) {
  return fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      Authorization: `Bearer ${ADMIN_TOKEN}`,
      ...options.headers
    }
  });
}

before(async () => {
  await initDatabaseConnection();
  await runMigrations();
  await seedDatabase();

  const app = createApp();
  await new Promise((resolve) => {
    server = app.listen(0, () => {
      baseUrl = `http://localhost:${server.address().port}/api`;
      resolve();
    });
  });
});

after(async () => {
  if (server) await new Promise((resolve) => server.close(resolve));
  for (const id of cleanupAnalysisIds) {
    await prisma.routeOverlapAnalysis.deleteMany({ where: { id } }).catch(() => null);
  }
  for (const id of cleanupProposedIds) {
    await prisma.proposedRoute.deleteMany({ where: { id } }).catch(() => null);
  }
  await prisma.$disconnect();
});

describe("Route Overlap Regression Test Suite (Tolerance & Complete Analysis Workflow)", () => {
  it("verifies tolerance resolution falls back to 50m and bounds values within [5, 500]", () => {
    assert.equal(resolveToleranceMeters(undefined), DEFAULT_OVERLAP_TOLERANCE_METERS);
    assert.equal(resolveToleranceMeters(null), DEFAULT_OVERLAP_TOLERANCE_METERS);
    assert.equal(resolveToleranceMeters(""), DEFAULT_OVERLAP_TOLERANCE_METERS);
    assert.equal(resolveToleranceMeters(-10), DEFAULT_OVERLAP_TOLERANCE_METERS);
    assert.equal(resolveToleranceMeters(2), 5.0); // Clamped to min 5m
    assert.equal(resolveToleranceMeters(600), 500.0); // Clamped to max 500m
    assert.equal(resolveToleranceMeters(25), 25.0);
    assert.equal(resolveToleranceMeters(50), 50.0);
    assert.equal(resolveToleranceMeters(100), 100.0);
    assert.equal(resolveToleranceMeters(150), 150.0);
  });

  it("evaluates impact of tolerance variations (25m vs 100m) on offset corridors", () => {
    // Existing route: Kashmere Gate to Civil Lines along approx 77.2285
    const existing = [
      {
        id: "ex-route-1",
        routeNumber: "101",
        routeName: "Kashmere Gate to Civil Lines",
        startingPoint: "Kashmere Gate",
        destination: "Civil Lines",
        stops: [
          { latitude: 28.6675, longitude: 77.2285, sequenceNumber: 1 },
          { latitude: 28.6750, longitude: 77.2285, sequenceNumber: 2 },
          { latitude: 28.6825, longitude: 77.2285, sequenceNumber: 3 }
        ]
      }
    ];

    // Proposed route parallel with ~60m lateral offset (0.0006 deg longitude ~ 58m at 28 deg lat)
    const proposed = [
      { latitude: 28.6675, longitude: 77.2291 },
      { latitude: 28.6750, longitude: 77.2291 },
      { latitude: 28.6825, longitude: 77.2291 }
    ];

    // Strict tolerance 25m should NOT detect the 60m-offset route
    const strictResult = executeRouteOverlapAnalysis(proposed, existing, 25.0);
    assert.equal(strictResult.overlapPercentage, 0);

    // Wide tolerance 100m SHOULD detect the 60m-offset route
    const wideResult = executeRouteOverlapAnalysis(proposed, existing, 100.0);
    assert.ok(wideResult.overlapPercentage > 50, `Expected high overlap with 100m tolerance, got ${wideResult.overlapPercentage}%`);
  });

  it("POST /api/routes/analyze-overlap executes end-to-end analysis with user-configured tolerance (100m)", async () => {
    const payload = {
      proposedRouteName: "Kashmere Gate to Red Fort Arterial",
      toleranceMeters: 100,
      saveRecord: true,
      coordinates: [
        { latitude: 28.6675, longitude: 77.2285 },
        { latitude: 28.6562, longitude: 77.2410 },
        { latitude: 28.6415, longitude: 77.2405 }
      ]
    };

    const response = await request("/routes/analyze-overlap", {
      method: "POST",
      body: JSON.stringify(payload)
    });

    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.success, true);
    assert.equal(body.data.toleranceMeters, 100);
    assert.ok(typeof body.data.proposedTotalDistanceKm === "number");
    assert.ok(typeof body.data.overlappingDistanceKm === "number");
    assert.ok(typeof body.data.overlapPercentage === "number");
    assert.ok(Array.isArray(body.data.affectedRoutes));
    assert.ok(Array.isArray(body.data.overlappingPolylines));
    assert.ok(Array.isArray(body.data.nonOverlappingPolylines));
    assert.ok(body.data.analysisId, "Expected analysisId to be returned");

    cleanupAnalysisIds.push(body.data.analysisId);
  });

  it("verifies saved analysis record accurately preserves configured tolerance and segments", async () => {
    const analysisId = cleanupAnalysisIds[cleanupAnalysisIds.length - 1];
    assert.ok(analysisId);

    const response = await request(`/routes/overlap/${analysisId}`);
    assert.equal(response.status, 200);
    const body = await response.json();

    assert.equal(body.success, true);
    assert.equal(body.data.id, analysisId);
    assert.equal(body.data.toleranceMeters, 100);
    assert.equal(body.data.status, "Completed");
    assert.ok(Array.isArray(body.data.overlappingSegments));
  });

  it("verifies GET /api/routes/overlap-history returns historical runs with tolerance information", async () => {
    const response = await request("/routes/overlap-history");
    assert.equal(response.status, 200);
    const body = await response.json();

    assert.equal(body.success, true);
    assert.ok(Array.isArray(body.data));
    const found = body.data.find((item) => cleanupAnalysisIds.includes(item.id));
    assert.ok(found, "Newly created analysis record should appear in history");
    assert.equal(found.toleranceMeters, 100);
    assert.ok(typeof found.overlapPercentage === "number");
  });

  it("verifies 0% overlap scenario for completely unique corridor", async () => {
    // Unique coordinates in rural/fringe Delhi far from DTC seed network
    const uniqueCorridor = [
      { latitude: 28.8500, longitude: 77.0500 },
      { latitude: 28.8600, longitude: 77.0600 },
      { latitude: 28.8700, longitude: 77.0700 }
    ];

    const response = await request("/routes/analyze-overlap", {
      method: "POST",
      body: JSON.stringify({
        proposedRouteName: "Unique Outer Corridor",
        toleranceMeters: 50,
        saveRecord: false,
        coordinates: uniqueCorridor
      })
    });

    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.success, true);
    assert.equal(body.data.overlapPercentage, 0);
    assert.equal(body.data.overlappingDistanceKm, 0);
    assert.equal(body.data.affectedRoutes.length, 0);
    assert.ok(body.data.nonOverlappingPolylines.length > 0, "100% of the corridor should be non-overlapping");
  });
});
