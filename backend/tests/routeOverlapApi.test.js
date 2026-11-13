import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";
import { createApp } from "../src/app.js";
import { initDatabaseConnection } from "../src/config/database.js";
import { prisma } from "../src/config/prisma.js";
import { runMigrations } from "../src/scripts/migrate.js";
import { seedDatabase } from "../src/scripts/seed.js";

const TEST_SECRET = "route-overlap-api-tests-secret-key-32-chars";
process.env.JWT_SECRET = TEST_SECRET;
const ADMIN_TOKEN = jwt.sign({ id: "overlap-test-admin", role: "admin" }, TEST_SECRET);

let server;
let baseUrl;
let createdProposedRouteId;
let createdAnalysisId;

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
  if (createdAnalysisId) {
    await prisma.routeOverlapAnalysis.deleteMany({ where: { id: createdAnalysisId } }).catch(() => null);
  }
  if (createdProposedRouteId) {
    await prisma.proposedRoute.deleteMany({ where: { id: createdProposedRouteId } }).catch(() => null);
  }
  await prisma.$disconnect();
});

describe("Route Overlap REST API and Database Integration Tests (Chunk 8)", () => {
  it("Scenario 14: Rejects unauthenticated requests with 401 Unauthorized", async () => {
    const unauthAnalyze = await fetch(`${baseUrl}/routes/analyze-overlap`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ coordinates: [] })
    });
    assert.equal(unauthAnalyze.status, 401);

    const unauthProposed = await fetch(`${baseUrl}/routes/proposed`);
    assert.equal(unauthProposed.status, 401);

    const unauthHistory = await fetch(`${baseUrl}/routes/overlap-history`);
    assert.equal(unauthHistory.status, 401);
  });

  it("Scenario 13: Rejects invalid or missing coordinates with 400 Bad Request", async () => {
    // Missing route name
    const res1 = await request("/routes/proposed", {
      method: "POST",
      body: JSON.stringify({ coordinates: [{ latitude: 28.6, longitude: 77.2 }] })
    });
    assert.equal(res1.status, 400);

    // Less than 2 coordinates
    const res2 = await request("/routes/proposed", {
      method: "POST",
      body: JSON.stringify({
        name: "Test Route",
        coordinates: [{ latitude: 28.6, longitude: 77.2 }]
      })
    });
    assert.equal(res2.status, 400);

    // Invalid latitude range
    const res3 = await request("/routes/analyze-overlap", {
      method: "POST",
      body: JSON.stringify({
        coordinates: [
          { latitude: 120.0, longitude: 77.2 },
          { latitude: 28.6, longitude: 77.2 }
        ]
      })
    });
    assert.equal(res3.status, 400);
  });

  it("creates a proposed route in PostgreSQL with ordered coordinates", async () => {
    const payload = {
      name: "Proposed Express Corridor",
      description: "Express route along Ring Road",
      estimatedTravelTime: 45,
      coordinates: [
        { latitude: 28.6675, longitude: 77.2285, name: "Kashmere Gate" },
        { latitude: 28.6562, longitude: 77.2410, name: "Red Fort" },
        { latitude: 28.6415, longitude: 77.2405, name: "Delhi Gate" }
      ]
    };

    const response = await request("/routes/proposed", {
      method: "POST",
      body: JSON.stringify(payload)
    });

    assert.equal(response.status, 201);
    const body = await response.json();
    assert.equal(body.success, true);
    assert.equal(body.data.name, payload.name);
    assert.equal(body.data.coordinates.length, 3);
    assert.equal(body.data.coordinates[0].sequenceNumber, 1);
    assert.equal(body.data.coordinates[1].sequenceNumber, 2);
    assert.equal(body.data.coordinates[2].sequenceNumber, 3);
    assert.ok(body.data.totalDistance > 0);

    createdProposedRouteId = body.data.id;
  });

  it("retrieves the created proposed route by ID and verifies persistence", async () => {
    const response = await request(`/routes/proposed/${createdProposedRouteId}`);
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.success, true);
    assert.equal(body.data.id, createdProposedRouteId);
    assert.equal(body.data.coordinates.length, 3);
  });

  it("lists all proposed routes", async () => {
    const response = await request("/routes/proposed");
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.success, true);
    assert.ok(Array.isArray(body.data));
    assert.ok(body.data.some((r) => r.id === createdProposedRouteId));
  });

  it("executes route overlap analysis and persists result in PostgreSQL", async () => {
    const payload = {
      proposedRouteId: createdProposedRouteId,
      proposedRouteName: "Kashmere Gate Express Evaluation",
      toleranceMeters: 50,
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
    assert.ok(typeof body.data.overlapPercentage === "number");
    assert.ok(body.data.proposedTotalDistanceKm > 0);
    assert.ok(body.data.analysisId, "Expected analysis record ID");

    createdAnalysisId = body.data.analysisId;

    // Verify record in PostgreSQL database via Prisma
    const dbRecord = await prisma.routeOverlapAnalysis.findUnique({
      where: { id: createdAnalysisId },
      include: { overlappingSegments: true }
    });
    assert.ok(dbRecord);
    assert.equal(dbRecord.proposedRouteName, payload.proposedRouteName);
  });

  it("retrieves a specific overlap analysis record by ID", async () => {
    const response = await request(`/routes/overlap/${createdAnalysisId}`);
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.success, true);
    assert.equal(body.data.id, createdAnalysisId);
  });

  it("lists overlap analysis history", async () => {
    const response = await request("/routes/overlap-history");
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.success, true);
    assert.ok(Array.isArray(body.data));
    assert.ok(body.data.some((item) => item.id === createdAnalysisId));
  });

  it("deletes a proposed route and cascades coordinate deletion", async () => {
    const response = await request(`/routes/proposed/${createdProposedRouteId}`, {
      method: "DELETE"
    });
    assert.equal(response.status, 200);

    // Verify deletion in database
    const checkRoute = await prisma.proposedRoute.findUnique({ where: { id: createdProposedRouteId } });
    assert.equal(checkRoute, null);

    const checkCoords = await prisma.proposedRouteCoordinate.findMany({ where: { proposedRouteId: createdProposedRouteId } });
    assert.equal(checkCoords.length, 0);

    createdProposedRouteId = null;
  });

  it("returns 404 when querying or deleting a nonexistent proposed route", async () => {
    const getRes = await request("/routes/proposed/00000000-0000-0000-0000-000000000000");
    assert.equal(getRes.status, 404);

    const delRes = await request("/routes/proposed/00000000-0000-0000-0000-000000000000", {
      method: "DELETE"
    });
    assert.equal(delRes.status, 404);
  });
});
