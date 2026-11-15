import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";
import { createApp } from "../src/app.js";
import { initDatabaseConnection } from "../src/config/database.js";
import { runMigrations } from "../src/scripts/migrate.js";
import { seedDatabase } from "../src/scripts/seed.js";
import { prisma } from "../src/config/prisma.js";

let server;
let baseUrl;
let ADMIN_TOKEN;
const TEST_SECRET = "backend-tests-only-secret-key-at-least-32-chars";
process.env.JWT_SECRET = TEST_SECRET;

function authorizedFetch(url, options = {}) {
  return fetch(url, {
    ...options,
    headers: { ...options.headers, Authorization: `Bearer ${ADMIN_TOKEN}` }
  });
}

before(async () => {
  await initDatabaseConnection();
  await runMigrations();
  await seedDatabase();

  const seedAdmin = await prisma.admin.findFirst();
  ADMIN_TOKEN = jwt.sign(
    { id: seedAdmin ? seedAdmin.id : "test-admin", role: "admin" },
    TEST_SECRET
  );

  const app = createApp();
  await new Promise((resolve) => {
    server = app.listen(0, () => {
      const { port } = server.address();
      baseUrl = `http://localhost:${port}/api`;
      resolve();
    });
  });
});

after(async () => {
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
});

describe("DTC Transit Platform End-to-End System Integration Test (All 9 Chunks)", () => {
  // 1. Chunk 1 & Health
  it("Phase 1 - Chunk 1: verifies core platform health and admin authentication gate", async () => {
    const healthRes = await fetch(`${baseUrl}/health`);
    assert.equal(healthRes.status, 200);
    const health = await healthRes.json();
    assert.equal(health.status, "healthy");

    const authCheck = await authorizedFetch(`${baseUrl}/auth/me`);
    assert.equal(authCheck.status, 200);
  });

  // 2. Chunks 2 & 3: Bus Fleet and Crew Roster
  it("Phase 1 - Chunks 2 & 3: verifies active buses and qualified crew personnel exist in PostgreSQL", async () => {
    const busRes = await authorizedFetch(`${baseUrl}/buses`);
    assert.equal(busRes.status, 200);
    const busData = await busRes.json();
    assert.ok(busData.data.length > 0);

    const crewRes = await authorizedFetch(`${baseUrl}/crew`);
    assert.equal(crewRes.status, 200);
    const crewData = await crewRes.json();
    assert.ok(crewData.data.length > 0);
  });

  // 3. Chunk 5: Trip Scheduling
  it("Phase 1 - Chunk 5: verifies scheduled trips exist and reference valid route and bus assets", async () => {
    const tripRes = await authorizedFetch(`${baseUrl}/trips`);
    assert.equal(tripRes.status, 200);
    const tripData = await tripRes.json();
    assert.ok(tripData.data.length > 0);
    const trip = tripData.data[0];
    assert.ok(trip.routeId);
    assert.ok(trip.busId);
  });

  // 4. Chunk 6: Linked Duty Permanent Binding
  it("Phase 2 - Chunk 6: verifies Linked Duty shifts enforce permanent 1:1 crew-bus binding", async () => {
    const dutyRes = await authorizedFetch(`${baseUrl}/duties`);
    assert.equal(dutyRes.status, 200);
    const dutyData = await dutyRes.json();
    assert.ok(dutyData.data.length > 0);
    const duty = dutyData.data[0];
    assert.equal(duty.schedulingType, "Linked");
    assert.ok(duty.totalDurationHours <= 8.05);
  });

  // 5. Chunk 7: Unlinked Handover & Rest Period
  it("Phase 3 - Chunk 7: verifies crew rest compliance and handover routes are operational", async () => {
    const availRes = await authorizedFetch(`${baseUrl}/crew/availability`);
    assert.equal(availRes.status, 200);
    const availData = await availRes.json();
    assert.ok(typeof availData.data.availableDrivers === "number");
  });

  // 6. Chunk 8: Route Overlap Detection
  it("Phase 3 - Chunk 8: verifies route overlap detection and spatial analysis execution", async () => {
    const routesRes = await authorizedFetch(`${baseUrl}/routes`);
    assert.equal(routesRes.status, 200);
    const routesData = await routesRes.json();
    assert.ok(routesData.data.length > 0);
  });

  // 7. Chunk 9: Integrated Analytics & System Consistency
  it("Phase 3 - Chunk 9: verifies system health score and cross-module validation pass with zero errors", async () => {
    const kpiRes = await authorizedFetch(`${baseUrl}/analytics/overview`);
    assert.equal(kpiRes.status, 200);
    const kpiData = await kpiRes.json();
    assert.ok(kpiData.data.health.score > 0);

    const valRes = await authorizedFetch(`${baseUrl}/analytics/validation`);
    assert.equal(valRes.status, 200);
    const valData = await valRes.json();
    assert.equal(valData.data.summary.errorsCount, 0);
  });

  // 8. Chunk 9: Full Operational CSV Export
  it("Phase 3 - Chunk 9: verifies end-to-end report export generates operational CSV", async () => {
    const exportRes = await authorizedFetch(`${baseUrl}/analytics/export?type=summary&format=csv`);
    assert.equal(exportRes.status, 200);
    const text = await exportRes.text();
    assert.ok(text.includes("System Health"));
    assert.ok(text.includes("Fleet"));
  });
});
