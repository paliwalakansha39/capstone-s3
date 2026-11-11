import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { createApp } from "../src/app.js";
import { initDatabaseConnection } from "../src/config/database.js";
import { runMigrations } from "../src/scripts/migrate.js";
import { seedDatabase } from "../src/scripts/seed.js";
import { Bus, Route, Driver } from "../src/models/index.js";

let server;
let baseUrl;

before(async () => {
  await initDatabaseConnection();
  await runMigrations();
  await seedDatabase();

  const app = createApp();
  await new Promise((resolve) => {
    // Listen on dynamic port 0 for testing
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

describe("DTC Bus Management System API Test Suite", () => {
  let createdBusId;
  const testBusNumber = "DTC-TEST-9901";
  const testRegNumber = "DL 01 ZZ 9901";

  // 1. Health check
  it("GET /api/health should return 200 and healthy status", async () => {
    const res = await fetch(`${baseUrl}/health`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.status, "healthy");
  });

  // 2. Auxiliary routes and drivers
  it("GET /api/routes should return list of available routes", async () => {
    const res = await fetch(`${baseUrl}/routes`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.ok(Array.isArray(body.data));
    assert.ok(body.data.length > 0);
  });

  it("GET /api/drivers should return list of available drivers", async () => {
    const res = await fetch(`${baseUrl}/drivers`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.ok(Array.isArray(body.data));
    assert.ok(body.data.length > 0);
  });

  // 3. GET /api/buses
  it("GET /api/buses should return 200 and list of buses with pagination", async () => {
    const res = await fetch(`${baseUrl}/buses`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.ok(Array.isArray(body.data));
    assert.ok(body.pagination.total >= 6);
  });

  it("GET /api/buses?search=1041 should filter buses matching search term", async () => {
    const res = await fetch(`${baseUrl}/buses?search=1041`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.ok(body.data.length >= 1);
    assert.ok(body.data.some((b) => b.busNumber.includes("1041")));
  });

  it("GET /api/buses?status=Active should return only active buses", async () => {
    const res = await fetch(`${baseUrl}/buses?status=Active`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    for (const bus of body.data) {
      assert.equal(bus.status, "Active");
    }
  });

  it("GET /api/buses/stats should return fleet aggregate counts", async () => {
    const res = await fetch(`${baseUrl}/buses/stats`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.ok(body.data.total >= 6);
    assert.ok(body.data.active >= 1);
    assert.ok(typeof body.data.electric === "number");
  });

  // 4. POST /api/buses (Create)
  it("POST /api/buses should create a new bus record successfully", async () => {
    const payload = {
      busNumber: testBusNumber,
      registrationNumber: testRegNumber,
      busType: "Electric",
      capacity: 45,
      depot: "Rohini Depot-I",
      manufacturer: "Tata Motors",
      modelYear: 2024,
      status: "Active"
    };

    const res = await fetch(`${baseUrl}/buses`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    assert.equal(res.status, 201);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.data.busNumber, testBusNumber);
    assert.equal(body.data.registrationNumber, testRegNumber);
    assert.equal(body.data.capacity, 45);
    createdBusId = body.data.id;
    assert.ok(createdBusId);
  });

  // 5. Validation and duplicate tests
  it("POST /api/buses should reject duplicate busNumber with 409", async () => {
    const payload = {
      busNumber: testBusNumber, // Already used
      registrationNumber: "DL 01 ZZ 9902",
      busType: "Electric"
    };

    const res = await fetch(`${baseUrl}/buses`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    assert.equal(res.status, 409);
    const body = await res.json();
    assert.equal(body.success, false);
    assert.match(body.error, /already exists/i);
  });

  it("POST /api/buses should reject duplicate registrationNumber with 409", async () => {
    const payload = {
      busNumber: "DTC-TEST-9903",
      registrationNumber: testRegNumber, // Already used
      busType: "Electric"
    };

    const res = await fetch(`${baseUrl}/buses`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    assert.equal(res.status, 409);
    const body = await res.json();
    assert.equal(body.success, false);
    assert.match(body.error, /already exists/i);
  });

  it("POST /api/buses should reject missing required fields with 400", async () => {
    const res = await fetch(`${baseUrl}/buses`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ busNumber: "" })
    });

    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(body.success, false);
  });

  it("POST /api/buses should reject invalid capacity with 400", async () => {
    const res = await fetch(`${baseUrl}/buses`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        busNumber: "DTC-TEST-9904",
        registrationNumber: "DL 01 ZZ 9904",
        capacity: 5 // below minimum 10
      })
    });

    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(body.success, false);
  });

  // 6. GET /api/buses/:id
  it("GET /api/buses/:id should return created bus details", async () => {
    const res = await fetch(`${baseUrl}/buses/${createdBusId}`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.data.id, createdBusId);
    assert.equal(body.data.busNumber, testBusNumber);
  });

  it("GET /api/buses/:id should return 404 for nonexistent bus ID", async () => {
    const res = await fetch(`${baseUrl}/buses/00000000-0000-0000-0000-000000000000`);
    assert.equal(res.status, 404);
    const body = await res.json();
    assert.equal(body.success, false);
  });

  // 7. PUT /api/buses/:id (Update)
  it("PUT /api/buses/:id should update bus details successfully", async () => {
    const res = await fetch(`${baseUrl}/buses/${createdBusId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: "Maintenance",
        capacity: 48,
        depot: "Mayapuri Depot"
      })
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.data.status, "Maintenance");
    assert.equal(body.data.capacity, 48);
    assert.equal(body.data.depot, "Mayapuri Depot");
  });

  it("PUT /api/buses/:id should return 404 when updating nonexistent bus", async () => {
    const res = await fetch(`${baseUrl}/buses/00000000-0000-0000-0000-000000000000`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "Active" })
    });

    assert.equal(res.status, 404);
    const body = await res.json();
    assert.equal(body.success, false);
  });

  // 8. DELETE /api/buses/:id (Delete)
  it("DELETE /api/buses/:id should delete bus and return 200", async () => {
    const res = await fetch(`${baseUrl}/buses/${createdBusId}`, {
      method: "DELETE"
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.match(body.message, /deleted/i);

    // Verify it is no longer found
    const getRes = await fetch(`${baseUrl}/buses/${createdBusId}`);
    assert.equal(getRes.status, 404);
  });

  it("DELETE /api/buses/:id should return 404 for already deleted bus", async () => {
    const res = await fetch(`${baseUrl}/buses/${createdBusId}`, {
      method: "DELETE"
    });

    assert.equal(res.status, 404);
    const body = await res.json();
    assert.equal(body.success, false);
  });
});
