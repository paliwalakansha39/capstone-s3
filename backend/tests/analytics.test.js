import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";
import { createApp } from "../src/app.js";
import { initDatabaseConnection } from "../src/config/database.js";
import { runMigrations } from "../src/scripts/migrate.js";
import { seedDatabase } from "../src/scripts/seed.js";

let server;
let baseUrl;
const TEST_SECRET = "backend-tests-only-secret-key-at-least-32-chars";
process.env.JWT_SECRET = TEST_SECRET;
const ADMIN_TOKEN = jwt.sign({ id: "test-admin", role: "admin" }, TEST_SECRET);

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

  const app = createApp();
  await new Promise((resolve) => {
    server = app.listen(0, () => {
      const { port } = server.address();
      baseUrl = `http://localhost:${port}/api/analytics`;
      resolve();
    });
  });
});

after(async () => {
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
});

describe("DTC Analytics & Reporting API Test Suite (Chunk 9)", () => {
  // 1. Auth Guard
  it("GET /api/analytics/overview should reject unauthenticated requests with 401", async () => {
    const res = await fetch(`${baseUrl}/overview`);
    assert.equal(res.status, 401);
  });

  // 2. Overview KPIs & Health Score
  it("GET /api/analytics/overview should return 200 and executive KPI overview", async () => {
    const res = await authorizedFetch(`${baseUrl}/overview`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.ok(typeof body.data.health.score === "number");
    assert.ok(body.data.health.status);
    assert.ok(body.data.kpiCards.fleetUtilization);
    assert.ok(body.data.kpiCards.crewAvailability);
    assert.ok(body.data.kpiCards.restCompliance);
    assert.ok(body.data.kpiCards.tripDelivery);
    assert.ok(body.data.kpiCards.networkOverlapIndex);
  });

  // 3. Full Analytics Multi-Module Breakdown
  it("GET /api/analytics/full should return deep metrics across all 4 operational facets", async () => {
    const res = await authorizedFetch(`${baseUrl}/full`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.ok(body.data.fleet);
    assert.ok(body.data.crew);
    assert.ok(body.data.trips);
    assert.ok(body.data.network);
  });

  // 4. Fleet Utilization Endpoint
  it("GET /api/analytics/fleet should return fleet metrics and depot distributions", async () => {
    const res = await authorizedFetch(`${baseUrl}/fleet`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.ok(typeof body.data.overview.totalBuses === "number");
    assert.ok(typeof body.data.overview.utilizationRate === "number");
    assert.ok(Array.isArray(body.data.typeDistribution));
    assert.ok(Array.isArray(body.data.depotDistribution));
  });

  // 5. Crew Utilization Endpoint
  it("GET /api/analytics/crew should return crew statistics and rest compliance", async () => {
    const res = await authorizedFetch(`${baseUrl}/crew`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.ok(typeof body.data.overview.totalCrew === "number");
    assert.ok(typeof body.data.restCompliance.restCompliancePercentage === "number");
    assert.ok(Array.isArray(body.data.depotDistribution));
    assert.ok(Array.isArray(body.data.topActiveCrew));
  });

  // 6. Trip Analytics Endpoint
  it("GET /api/analytics/trips should return hourly dispatch and route metrics", async () => {
    const res = await authorizedFetch(`${baseUrl}/trips`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.ok(typeof body.data.overview.totalTrips === "number");
    assert.ok(Array.isArray(body.data.hourlyDistribution));
    assert.ok(body.data.hourlyDistribution.length > 0);
  });

  // 7. Network Analytics Endpoint
  it("GET /api/analytics/network should return route structure and overlap breakdown", async () => {
    const res = await authorizedFetch(`${baseUrl}/network`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.ok(typeof body.data.overview.totalRoutes === "number");
    assert.ok(body.data.overlapAnalytics.severityBreakdown);
  });

  // 8. Cross-Module System Validation
  it("GET /api/analytics/validation should run automated relational integrity checks", async () => {
    const res = await authorizedFetch(`${baseUrl}/validation`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.ok(body.data.status);
    assert.ok(body.data.summary.totalDomainsChecked >= 5);
    assert.ok(Array.isArray(body.data.issues));
  });

  // 9. Report Export - CSV
  it("GET /api/analytics/export should stream downloadable CSV report", async () => {
    const res = await authorizedFetch(`${baseUrl}/export?type=summary&format=csv`);
    assert.equal(res.status, 200);
    const contentType = res.headers.get("content-type");
    assert.ok(contentType.includes("text/csv"));
    const text = await res.text();
    assert.ok(text.includes("Operational Domain"));
    assert.ok(text.includes("System Health"));
  });

  // 10. Report Export - JSON
  it("GET /api/analytics/export should stream structured JSON report", async () => {
    const res = await authorizedFetch(`${baseUrl}/export?type=fleet&format=json`);
    assert.equal(res.status, 200);
    const contentType = res.headers.get("content-type");
    assert.ok(contentType.includes("application/json"));
    const data = await res.json();
    assert.ok(data.overview);
    assert.ok(data.busRoster);
  });

  // 11. Report Types Metadata
  it("GET /api/analytics/reports/metadata should list available export formats and categories", async () => {
    const res = await authorizedFetch(`${baseUrl}/reports/metadata`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.ok(Array.isArray(body.data.formats));
    assert.ok(Array.isArray(body.data.reportTypes));
    assert.ok(body.data.reportTypes.length >= 4);
  });
});
