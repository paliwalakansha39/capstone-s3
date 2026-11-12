import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";
import { createApp } from "../src/app.js";

const TEST_SECRET = "route-tests-only-secret-key-at-least-32-characters";
process.env.JWT_SECRET = TEST_SECRET;
const ADMIN_TOKEN = jwt.sign({ id: "route-test-admin", role: "admin" }, TEST_SECRET);
let server;
let baseUrl;

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
});
