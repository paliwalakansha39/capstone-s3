import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { Op } from "sequelize";
import jwt from "jsonwebtoken";
import { createApp } from "../src/app.js";
import { initDatabaseConnection } from "../src/config/database.js";
import { runMigrations } from "../src/scripts/migrate.js";
import { seedDatabase } from "../src/scripts/seed.js";
import { Bus, Crew, Duty, DutyAssignment, Trip } from "../src/models/index.js";

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

describe("DTC Linked Duty Scheduling API Test Suite (Chunk 6)", () => {
  let sampleBus;
  let sampleDriver;
  let sampleConductor;
  let testDutyId;
  const testDutyNumber = "DTC-TEST-DUTY-9901";

  before(async () => {
    sampleBus = await Bus.findOne({ where: { status: "Active" } });
    sampleDriver = await Crew.findOne({ where: { role: "Driver" } });
    sampleConductor = await Crew.findOne({ where: { role: "Conductor" } });

    // Clean up test duties if any
    await Duty.destroy({
      where: { dutyNumber: { [Op.like]: "%TEST%" } }
    });
  });

  // 1. GET /api/duties
  it("GET /api/duties should return 200 and list of duties with pagination", async () => {
    const res = await fetch(`${baseUrl}/duties`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.ok(Array.isArray(body.data));
    assert.ok(body.pagination);
    assert.ok(body.pagination.total >= 1);
  });

  // 2. GET /api/duties/stats
  it("GET /api/duties/stats should return duty schedule metrics", async () => {
    const res = await fetch(`${baseUrl}/duties/stats`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.ok(typeof body.data.total === "number");
    assert.ok(typeof body.data.active === "number");
    assert.ok(typeof body.data.assignedBuses === "number");
  });

  // 3. Validation - reject identical start and end time
  it("POST /api/duties should reject identical start and end times with 400", async () => {
    const payload = {
      dutyNumber: "DTC-TEST-ZERO-DURATION",
      shiftDate: "2026-11-20",
      startTime: "08:00",
      endTime: "08:00",
      busId: sampleBus.id,
      driverId: sampleDriver.id,
      conductorId: sampleConductor.id
    };

    const res = await authorizedFetch(`${baseUrl}/duties`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(body.success, false);
    assert.ok(body.error.includes("identical"));
  });

  // 4. Validation - reject exceeding 8-hour maximum shift limit
  it("POST /api/duties should reject shift exceeding 8 hours limit with 400", async () => {
    const payload = {
      dutyNumber: "DTC-TEST-OVERTIME",
      shiftDate: "2026-11-20",
      startTime: "06:00",
      endTime: "16:00", // 10 hours > 8.0 hrs max
      busId: sampleBus.id,
      driverId: sampleDriver.id,
      conductorId: sampleConductor.id
    };

    const res = await authorizedFetch(`${baseUrl}/duties`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(body.success, false);
    assert.ok(body.error.includes("exceeds standard maximum"));
  });

  // 5. Validation - reject non-driver in driver slot
  it("POST /api/duties should reject assigning conductor as driver with 400", async () => {
    const payload = {
      dutyNumber: "DTC-TEST-WRONG-ROLE",
      shiftDate: "2026-11-20",
      startTime: "06:00",
      endTime: "14:00",
      busId: sampleBus.id,
      driverId: sampleConductor.id, // Conductor passed as driver
      conductorId: sampleConductor.id
    };

    const res = await authorizedFetch(`${baseUrl}/duties`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(body.success, false);
  });

  // 6. POST /api/duties - create valid manual linked duty
  it("POST /api/duties should create a valid linked duty schedule", async () => {
    const payload = {
      dutyNumber: testDutyNumber,
      shiftType: "Morning",
      shiftDate: "2026-11-25",
      startTime: "06:00",
      endTime: "14:00",
      depot: "BBM Depot",
      busId: sampleBus.id,
      driverId: sampleDriver.id,
      conductorId: sampleConductor.id,
      notes: "Test linked duty schedule"
    };

    const res = await authorizedFetch(`${baseUrl}/duties`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    assert.equal(res.status, 201);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.data.dutyNumber, testDutyNumber);
    assert.equal(body.data.assignment.busId, sampleBus.id);
    assert.equal(body.data.assignment.driverId, sampleDriver.id);
    assert.equal(body.data.assignment.conductorId, sampleConductor.id);
    assert.equal(body.data.assignment.vehicleHandoverVerified, true);
    testDutyId = body.data.id;
  });

  // 7. Collision - reject overlapping duty for same bus
  it("POST /api/duties should reject bus conflict during overlapping hours with 409", async () => {
    const anotherDriver = await Crew.findOne({
      where: { role: "Driver", id: { [Op.ne]: sampleDriver.id } }
    });
    const anotherConductor = await Crew.findOne({
      where: { role: "Conductor", id: { [Op.ne]: sampleConductor.id } }
    });

    const payload = {
      dutyNumber: "DTC-TEST-BUS-CONFLICT",
      shiftDate: "2026-11-25",
      startTime: "07:00", // Overlaps with 06:00-14:00
      endTime: "13:00",
      depot: "BBM Depot",
      busId: sampleBus.id, // Same bus
      driverId: anotherDriver.id,
      conductorId: anotherConductor.id
    };

    const res = await authorizedFetch(`${baseUrl}/duties`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    assert.equal(res.status, 409);
    const body = await res.json();
    assert.equal(body.success, false);
    assert.ok(body.error.includes("already committed"));
  });

  // 8. GET /api/duties/:id
  it("GET /api/duties/:id should return full duty details with bus and crew", async () => {
    const res = await fetch(`${baseUrl}/duties/${testDutyId}`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.data.id, testDutyId);
    assert.ok(body.data.assignment);
    assert.equal(body.data.assignment.bus.id, sampleBus.id);
  });

  // 9. PUT /api/duties/:id
  it("PUT /api/duties/:id should update duty status", async () => {
    const res = await authorizedFetch(`${baseUrl}/duties/${testDutyId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "Completed", notes: "Shift completed without incident" })
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.data.status, "Completed");
  });

  // 10. Automated Linked Duty Scheduling Engine
  it("POST /api/duties/generate-linked should run automated scheduling algorithm", async () => {
    const today = new Date().toISOString().split("T")[0];

    const res = await authorizedFetch(`${baseUrl}/duties/generate-linked`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shiftDate: today })
    });

    assert.equal(res.status, 201);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.ok(typeof body.dutiesCreated === "number");
  });

  // 11. DELETE safety check - reject deleting Active duty
  it("DELETE /api/duties/:id should reject deleting an 'Active' duty with 400", async () => {
    // Set to Active
    await authorizedFetch(`${baseUrl}/duties/${testDutyId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "Active" })
    });

    const res = await authorizedFetch(`${baseUrl}/duties/${testDutyId}`, {
      method: "DELETE"
    });

    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(body.success, false);
    assert.ok(body.error.includes("Active"));
  });

  // 12. DELETE when duty is completed/scheduled
  it("DELETE /api/duties/:id should delete duty successfully when not active", async () => {
    // Set to Scheduled
    await authorizedFetch(`${baseUrl}/duties/${testDutyId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "Scheduled" })
    });

    const res = await authorizedFetch(`${baseUrl}/duties/${testDutyId}`, {
      method: "DELETE"
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);

    const verify = await fetch(`${baseUrl}/duties/${testDutyId}`);
    assert.equal(verify.status, 404);
  });
});
