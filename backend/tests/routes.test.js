import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";
import { randomUUID } from "node:crypto";
import { createApp } from "../src/app.js";
import { prisma } from "../src/config/prisma.js";

const TEST_SECRET = "route-tests-only-secret-key-at-least-32-characters";
process.env.JWT_SECRET = TEST_SECRET;
const ADMIN_TOKEN = jwt.sign({ id: "route-test-admin", role: "admin" }, TEST_SECRET);
let server;
let baseUrl;
const routeNumber = `TEST-${randomUUID().slice(0, 8)}`;
let createdRouteId;

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
  if (createdRouteId) await prisma.route.deleteMany({ where: { id: createdRouteId } });
  await prisma.$disconnect();
});

describe("Route and bus stop management API validation", () => {
  it("protects the route collection", async () => {
    const response = await fetch(`${baseUrl}/routes`);
    assert.equal(response.status, 401);
  });

  it("protects route detail, create, update, and delete endpoints", async () => {
    for (const [path, method] of [
      ["/routes/route-id", "GET"],
      ["/routes", "POST"],
      ["/routes/route-id", "PUT"],
      ["/routes/route-id", "DELETE"]
    ]) {
      const response = await fetch(`${baseUrl}${path}`, { method });
      assert.equal(response.status, 401, `${method} ${path}`);
    }
  });

  it("protects bus stop create, update, and delete endpoints", async () => {
    for (const [path, method] of [
      ["/routes/route-id/stops", "POST"],
      ["/stops/stop-id", "PUT"],
      ["/stops/stop-id", "DELETE"]
    ]) {
      const response = await fetch(`${baseUrl}${path}`, { method });
      assert.equal(response.status, 401, `${method} ${path}`);
    }
  });

  it("rejects incomplete route input", async () => {
    const response = await request("/routes", {
      method: "POST",
      body: JSON.stringify({ routeNumber: "R1" })
    });
    assert.equal(response.status, 400);
    assert.equal((await response.json()).success, false);
  });

  it("rejects routes with invalid coordinates and repeated stop sequences", async () => {
    const response = await request("/routes", {
      method: "POST",
      body: JSON.stringify({
        routeNumber: "R1",
        routeName: "Example route",
        startingPoint: "Start",
        destination: "End",
        totalDistance: 12,
        estimatedTravelTime: 45,
        stops: [
          { stopName: "Stop A", latitude: 28, longitude: 77, sequenceNumber: 1 },
          { stopName: "Stop B", latitude: 200, longitude: 77, sequenceNumber: 1 }
        ]
      })
    });
    assert.equal(response.status, 400);
    const body = await response.json();
    assert.equal(body.success, false);
    assert.match(body.error, /latitude|sequence/i);
  });

  it("rejects invalid coordinates when adding or editing a stop", async () => {
    const createResponse = await request("/routes/route-id/stops", {
      method: "POST",
      body: JSON.stringify({ stopName: "Stop", latitude: 91, longitude: 77, sequenceNumber: 1 })
    });
    assert.equal(createResponse.status, 400);

    const updateResponse = await request("/stops/stop-id", {
      method: "PUT",
      body: JSON.stringify({ longitude: 181 })
    });
    assert.equal(updateResponse.status, 400);
  });

  it("rejects empty route updates", async () => {
    const response = await request("/routes/route-id", { method: "PUT", body: JSON.stringify({}) });
    assert.equal(response.status, 400);
  });

  it("creates, reads, updates, and deletes routes and their stops", async () => {
    const createResponse = await request("/routes", {
      method: "POST",
      body: JSON.stringify({
        routeNumber,
        routeName: "Integration test route",
        startingPoint: "Test start",
        destination: "Test end",
        totalDistance: 12.5,
        estimatedTravelTime: 45,
        stops: [
          { stopName: "Test stop one", latitude: 28.1, longitude: 77.1, sequenceNumber: 1 },
          { stopName: "Test stop two", latitude: 28.2, longitude: 77.2, sequenceNumber: 2 }
        ]
      })
    });
    assert.equal(createResponse.status, 201);
    const created = (await createResponse.json()).data;
    createdRouteId = created.id;
    assert.equal(created.stops.length, 2);

    const duplicateResponse = await request("/routes", {
      method: "POST",
      body: JSON.stringify({
        routeNumber: routeNumber.toLowerCase(),
        routeName: "Duplicate test route",
        startingPoint: "Test start",
        destination: "Test end",
        totalDistance: 12,
        estimatedTravelTime: 40
      })
    });
    assert.equal(duplicateResponse.status, 409);

    const listResponse = await request(`/routes?search=${encodeURIComponent(routeNumber)}`);
    assert.equal(listResponse.status, 200);
    assert.ok((await listResponse.json()).data.some((route) => route.id === createdRouteId));

    const detailResponse = await request(`/routes/${createdRouteId}`);
    assert.equal(detailResponse.status, 200);
    assert.equal((await detailResponse.json()).data.stops[0].sequenceNumber, 1);

    const [first, second] = created.stops;
    const updateResponse = await request(`/routes/${createdRouteId}`, {
      method: "PUT",
      body: JSON.stringify({
        routeName: "Updated integration route",
        stops: [
          { ...second, sequenceNumber: 1 },
          { ...first, sequenceNumber: 2 },
          { stopName: "Test stop three", latitude: 28.3, longitude: 77.3, sequenceNumber: 3 }
        ]
      })
    });
    assert.equal(updateResponse.status, 200);
    const updated = (await updateResponse.json()).data;
    assert.equal(updated.routeName, "Updated integration route");
    assert.equal(updated.stops.length, 3);
    assert.equal(updated.stops[0].stopName, "Test stop two");

    const addStopResponse = await request(`/routes/${createdRouteId}/stops`, {
      method: "POST",
      body: JSON.stringify({
        stopName: "Test stop four",
        latitude: 28.4,
        longitude: 77.4,
        sequenceNumber: 4
      })
    });
    assert.equal(addStopResponse.status, 201);
    const addedStop = (await addStopResponse.json()).data;

    const editStopResponse = await request(`/stops/${addedStop.id}`, {
      method: "PUT",
      body: JSON.stringify({ stopName: "Updated test stop four" })
    });
    assert.equal(editStopResponse.status, 200);
    assert.equal((await editStopResponse.json()).data.stopName, "Updated test stop four");

    const deleteStopResponse = await request(`/stops/${addedStop.id}`, { method: "DELETE" });
    assert.equal(deleteStopResponse.status, 200);

    const deleteRouteResponse = await request(`/routes/${createdRouteId}`, { method: "DELETE" });
    assert.equal(deleteRouteResponse.status, 200);
    createdRouteId = null;
    assert.equal((await request(`/routes/${created.id}`)).status, 404);
    assert.equal(await prisma.busStop.count({ where: { routeId: created.id } }), 0);
  });
});
