import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { Op } from "sequelize";
import { createApp } from "../src/app.js";
import { initDatabaseConnection } from "../src/config/database.js";
import { runMigrations } from "../src/scripts/migrate.js";
import { seedDatabase } from "../src/scripts/seed.js";
import { Crew } from "../src/models/index.js";

let server;
let baseUrl;

before(async () => {
  await initDatabaseConnection();
  await runMigrations();
  await seedDatabase();

  // Clean up any previous test artifacts
  await Crew.destroy({
    where: {
      [Op.or]: [
        { crewId: { [Op.like]: "DTC-TEST-%" } },
        { crewId: { [Op.like]: "%DUP%" } },
        { badgeNumber: { [Op.like]: "%TEST%" } }
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

describe("DTC Crew Management System API Test Suite", () => {
  let createdDriverId;
  let createdConductorId;
  const testDriverCrewId = "DTC-TEST-DRV-901";
  const testDriverBadge = "DTC-D-TEST-901";
  const testConductorCrewId = "DTC-TEST-CND-902";
  const testConductorBadge = "DTC-C-TEST-902";

  // 1. Crew listing and pagination
  it("GET /api/crew should return 200 and list of crew members with pagination", async () => {
    const res = await fetch(`${baseUrl}/crew`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.ok(Array.isArray(body.data));
    assert.ok(body.data.length > 0);
    assert.ok(body.pagination);
    assert.ok(body.pagination.total >= 12);
  });

  // 2. Filter by role
  it("GET /api/crew?role=Driver should return only drivers", async () => {
    const res = await fetch(`${baseUrl}/crew?role=Driver`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.ok(body.data.every((c) => c.role === "Driver"));
  });

  it("GET /api/crew?role=Conductor should return only conductors", async () => {
    const res = await fetch(`${baseUrl}/crew?role=Conductor`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.ok(body.data.every((c) => c.role === "Conductor"));
  });

  // 3. Availability stats
  it("GET /api/crew/availability should return real-time crew availability metrics", async () => {
    const res = await fetch(`${baseUrl}/crew/availability`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.ok(body.data.totalCrew > 0);
    assert.ok(typeof body.data.availableDrivers === "number");
    assert.ok(typeof body.data.availableConductors === "number");
    assert.ok(typeof body.data.availabilityRate === "number");
  });

  // 4. Create Crew - Driver
  it("POST /api/crew should create a new Driver with valid license", async () => {
    const payload = {
      crewId: testDriverCrewId,
      name: "Satish Chand",
      role: "Driver",
      badgeNumber: testDriverBadge,
      licenseNumber: "DL04TEST901234",
      qualification: "HTV Master Driver + First Aid",
      experienceYears: 7,
      assignedDepot: "BBM Depot",
      status: "Available",
      phone: "+91 98110 01122"
    };

    const res = await fetch(`${baseUrl}/crew`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    assert.equal(res.status, 201);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.data.crewId, testDriverCrewId);
    assert.equal(body.data.role, "Driver");
    createdDriverId = body.data.id;
  });

  // 5. Create Crew - Conductor
  it("POST /api/crew should create a new Conductor", async () => {
    const payload = {
      crewId: testConductorCrewId,
      name: "Anjali Gupta",
      role: "Conductor",
      badgeNumber: testConductorBadge,
      licenseNumber: "COND-TEST-902",
      qualification: "Commercial Conductor License",
      experienceYears: 4,
      assignedDepot: "Sarojini Nagar Depot",
      status: "Available",
      phone: "+91 98711 00223"
    };

    const res = await fetch(`${baseUrl}/crew`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    assert.equal(res.status, 201);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.data.crewId, testConductorCrewId);
    createdConductorId = body.data.id;
  });

  // 6. Validation - Driver missing license
  it("POST /api/crew should reject Driver creation without commercial driving license", async () => {
    const payload = {
      crewId: "DTC-INVALID-DRV",
      name: "Incomplete Driver",
      role: "Driver",
      badgeNumber: "DTC-BADGE-FAIL",
      licenseNumber: "", // Missing
      assignedDepot: "BBM Depot"
    };

    const res = await fetch(`${baseUrl}/crew`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(body.success, false);
    assert.ok(body.error.includes("license"));
  });

  // 7. Validation - Duplicate Badge Number
  it("POST /api/crew should reject duplicate badge number with 409 Conflict", async () => {
    const payload = {
      crewId: "DTC-DUP-CREW",
      name: "Duplicate Badge Test",
      role: "Driver",
      badgeNumber: testDriverBadge, // Already created
      licenseNumber: "DL04DUP9999",
      assignedDepot: "BBM Depot"
    };

    const res = await fetch(`${baseUrl}/crew`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    assert.equal(res.status, 409);
    const body = await res.json();
    assert.equal(body.success, false);
  });

  // 8. GET /api/crew/:id
  it("GET /api/crew/:id should return crew details by ID", async () => {
    const res = await fetch(`${baseUrl}/crew/${createdDriverId}`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.data.id, createdDriverId);
    assert.equal(body.data.name, "Satish Chand");
  });

  // 9. PUT /api/crew/:id
  it("PUT /api/crew/:id should update status to On Duty", async () => {
    const res = await fetch(`${baseUrl}/crew/${createdDriverId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "On Duty", assignedDepot: "Rohini Depot-I" })
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.data.status, "On Duty");
    assert.equal(body.data.assignedDepot, "Rohini Depot-I");
  });

  // 10. DELETE safety check - block deletion of On Duty crew
  it("DELETE /api/crew/:id should reject deletion of an 'On Duty' crew member", async () => {
    const res = await fetch(`${baseUrl}/crew/${createdDriverId}`, {
      method: "DELETE"
    });

    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(body.success, false);
    assert.ok(body.error.includes("On Duty"));
  });

  // 11. DELETE when status is changed to Available
  it("DELETE /api/crew/:id should successfully delete crew member once relieved", async () => {
    // Relieve to Available
    await fetch(`${baseUrl}/crew/${createdDriverId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "Available" })
    });

    const res = await fetch(`${baseUrl}/crew/${createdDriverId}`, {
      method: "DELETE"
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);

    // Verify deletion
    const verifyRes = await fetch(`${baseUrl}/crew/${createdDriverId}`);
    assert.equal(verifyRes.status, 404);
  });

  // Cleanup conductor
  after(async () => {
    if (createdConductorId) {
      await Crew.destroy({ where: { id: createdConductorId } });
    }
  });
});
