import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { Op } from "sequelize";
import jwt from "jsonwebtoken";
import { createApp } from "../src/app.js";
import { initDatabaseConnection } from "../src/config/database.js";
import { runMigrations } from "../src/scripts/migrate.js";
import { seedDatabase } from "../src/scripts/seed.js";
import { Trip, Bus, Route } from "../src/models/index.js";

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

  // Clean up any existing test trips
  await Trip.destroy({
    where: {
      [Op.or]: [
        { startingStop: { [Op.like]: "%TEST_STOP%" } },
        { destinationStop: { [Op.like]: "%TEST_STOP%" } }
      ]
    }
  });

  const app = createApp();
  await new Promise((resolve) => {
    server = app.listen(0, () => {
      const port = server.address().port;
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

describe("DTC Trip Management System API Test Suite", () => {
  let sampleRoute;
  let sampleBus;
  let createdTripId;

  it("should verify existing Route and Bus records in database for assignment", async () => {
    sampleRoute = await Route.findOne();
    assert.ok(sampleRoute, "A Route should exist in the database");
    assert.ok(sampleRoute.id, "Route must have an ID");

    sampleBus = await Bus.findOne({ where: { status: "Active" } });
    assert.ok(sampleBus, "An Active Bus should exist in the database");
    assert.ok(sampleBus.id, "Bus must have an ID");
  });

  // 1. Protection of mutating endpoints
  it("POST /api/trips should reject unauthenticated requests with 401", async () => {
    const res = await fetch(`${baseUrl}/trips`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        routeId: sampleRoute.id,
        busId: sampleBus.id,
        tripDate: "2026-12-01",
        departureTime: "08:00",
        arrivalTime: "09:30",
        startingStop: "Stop A",
        destinationStop: "Stop B"
      })
    });
    assert.equal(res.status, 401);
  });

  // 2. Listing and stats
  it("GET /api/trips should return 200 and list trips with pagination", async () => {
    const res = await fetch(`${baseUrl}/trips`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.ok(Array.isArray(body.data));
    assert.ok(body.pagination);
    assert.ok(typeof body.pagination.total === "number");
  });

  it("GET /api/trips/stats should return aggregate metrics", async () => {
    const res = await fetch(`${baseUrl}/trips/stats`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.ok(typeof body.data.total === "number");
    assert.ok(typeof body.data.scheduled === "number");
    assert.ok(typeof body.data.completed === "number");
    assert.ok(typeof body.data.cancelled === "number");
  });

  // 3. Validation
  it("POST /api/trips should reject missing required fields with 400", async () => {
    const res = await authorizedFetch(`${baseUrl}/trips`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        routeId: sampleRoute.id
        // missing busId, tripDate, etc.
      })
    });
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(body.success, false);
    assert.ok(body.error);
  });

  it("POST /api/trips should reject invalid time formats with 400", async () => {
    const res = await authorizedFetch(`${baseUrl}/trips`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        routeId: sampleRoute.id,
        busId: sampleBus.id,
        tripDate: "2026-12-01",
        departureTime: "25:99", // invalid
        arrivalTime: "09:30",
        startingStop: "Stop A",
        destinationStop: "Stop B"
      })
    });
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(body.success, false);
  });

  it("POST /api/trips should reject same departure and arrival times with 400", async () => {
    const res = await authorizedFetch(`${baseUrl}/trips`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        routeId: sampleRoute.id,
        busId: sampleBus.id,
        tripDate: "2026-12-01",
        departureTime: "10:00",
        arrivalTime: "10:00",
        startingStop: "Stop A",
        destinationStop: "Stop B"
      })
    });
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(body.success, false);
  });

  it("POST /api/trips should reject non-existent route ID with 404 or 400", async () => {
    const res = await authorizedFetch(`${baseUrl}/trips`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        routeId: "00000000-0000-0000-0000-000000000000",
        busId: sampleBus.id,
        tripDate: "2026-12-01",
        departureTime: "10:00",
        arrivalTime: "11:30",
        startingStop: "Stop A",
        destinationStop: "Stop B"
      })
    });
    assert.ok([400, 404].includes(res.status));
    const body = await res.json();
    assert.equal(body.success, false);
  });

  it("POST /api/trips should reject non-existent bus ID with 404 or 400", async () => {
    const res = await authorizedFetch(`${baseUrl}/trips`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        routeId: sampleRoute.id,
        busId: "00000000-0000-0000-0000-000000000000",
        tripDate: "2026-12-01",
        departureTime: "10:00",
        arrivalTime: "11:30",
        startingStop: "Stop A",
        destinationStop: "Stop B"
      })
    });
    assert.ok([400, 404].includes(res.status));
    const body = await res.json();
    assert.equal(body.success, false);
  });

  // 4. Creation and Retrieval
  it("POST /api/trips should create a new trip successfully", async () => {
    const res = await authorizedFetch(`${baseUrl}/trips`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        routeId: sampleRoute.id,
        busId: sampleBus.id,
        tripDate: "2026-12-15",
        departureTime: "07:00",
        arrivalTime: "08:30",
        startingStop: "TEST_STOP_ALPHA",
        destinationStop: "TEST_STOP_BETA",
        status: "Scheduled"
      })
    });
    assert.equal(res.status, 201);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.ok(body.data.id);
    assert.equal(body.data.startingStop, "TEST_STOP_ALPHA");
    assert.equal(body.data.destinationStop, "TEST_STOP_BETA");
    assert.equal(body.data.status, "Scheduled");
    createdTripId = body.data.id;
  });

  it("GET /api/trips/:id should return created trip details with Route and Bus", async () => {
    const res = await fetch(`${baseUrl}/trips/${createdTripId}`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.data.id, createdTripId);
    assert.ok(body.data.route);
    assert.ok(body.data.bus);
  });

  it("GET /api/trips/:id should return 404 for nonexistent trip ID", async () => {
    const res = await fetch(`${baseUrl}/trips/00000000-0000-0000-0000-000000000000`);
    assert.equal(res.status, 404);
  });

  // 5. Bus Conflict Prevention (Overlapping Trips)
  it("POST /api/trips should reject overlapping trip on the same bus with 409 Conflict", async () => {
    // Existing trip is 2026-12-15 from 07:00 to 08:30 on sampleBus.
    // Overlapping trip attempt: 08:00 to 09:30 on same date and same bus
    const res = await authorizedFetch(`${baseUrl}/trips`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        routeId: sampleRoute.id,
        busId: sampleBus.id,
        tripDate: "2026-12-15",
        departureTime: "08:00",
        arrivalTime: "09:30",
        startingStop: "TEST_STOP_GAMMA",
        destinationStop: "TEST_STOP_DELTA",
        status: "Scheduled"
      })
    });
    assert.equal(res.status, 409);
    const body = await res.json();
    assert.equal(body.success, false);
    assert.match(body.error, /conflict|overlap|already assigned/i);
  });

  // 6. Bus Availability Check endpoint
  it("GET /api/trips/bus-availability should report busy for overlapping time and available otherwise", async () => {
    const busyRes = await fetch(
      `${baseUrl}/trips/bus-availability?busId=${sampleBus.id}&tripDate=2026-12-15&departureTime=07:30&arrivalTime=08:15`
    );
    assert.equal(busyRes.status, 200);
    const busyBody = await busyRes.json();
    assert.equal(busyBody.success, true);
    assert.equal(busyBody.data.available, false);

    const freeRes = await fetch(
      `${baseUrl}/trips/bus-availability?busId=${sampleBus.id}&tripDate=2026-12-15&departureTime=11:00&arrivalTime=12:30`
    );
    assert.equal(freeRes.status, 200);
    const freeBody = await freeRes.json();
    assert.equal(freeBody.success, true);
    assert.equal(freeBody.data.available, true);
  });

  // 7. Update Trip
  it("PUT /api/trips/:id should update trip details successfully", async () => {
    const res = await authorizedFetch(`${baseUrl}/trips/${createdTripId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: "Completed",
        departureTime: "07:15",
        arrivalTime: "08:45"
      })
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.data.status, "Completed");
    assert.equal(body.data.departureTime, "07:15");
  });

  // 8. Delete Trip
  it("DELETE /api/trips/:id should delete trip successfully", async () => {
    const res = await authorizedFetch(`${baseUrl}/trips/${createdTripId}`, {
      method: "DELETE"
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
  });

  it("DELETE /api/trips/:id should return 404 for already deleted trip", async () => {
    const res = await authorizedFetch(`${baseUrl}/trips/${createdTripId}`, {
      method: "DELETE"
    });
    assert.equal(res.status, 404);
  });
});
