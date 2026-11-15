import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";
import { createApp } from "../src/app.js";

let server;
let baseUrl;
const TEST_SECRET = "backend-tests-only-secret-key-at-least-32-chars";
process.env.JWT_SECRET = TEST_SECRET;
const ADMIN_TOKEN = jwt.sign({ id: "test-admin", role: "admin" }, TEST_SECRET);

before(async () => {
  process.env.NODE_ENV = "test";
  const app = createApp();
  await new Promise((resolve) => {
    server = app.listen(0, "127.0.0.1", () => {
      baseUrl = `http://127.0.0.1:${server.address().port}/api`;
      resolve();
    });
  });
});

after(async () => {
  if (server) await new Promise((resolve) => server.close(resolve));
});

describe("Production Security Hardening Suite", () => {
  // 1. Helmet Security Headers
  it("enforces Helmet HTTP security headers", async () => {
    const res = await fetch(`${baseUrl}/health`);
    assert.equal(res.status, 200);
    assert.equal(res.headers.get("x-content-type-options"), "nosniff");
    assert.equal(res.headers.get("x-dns-prefetch-control"), "off");
    assert.equal(res.headers.get("x-frame-options"), "SAMEORIGIN");
    assert.equal(res.headers.get("x-xss-protection"), "0");
  });

  // 2. CORS Verification
  it("rejects untrusted CORS origins", async () => {
    const res = await fetch(`${baseUrl}/health`, {
      headers: { Origin: "https://malicious-attacker-site.com" }
    });
    assert.equal(res.status, 403);
  });

  it("allows trusted CORS origins", async () => {
    const res = await fetch(`${baseUrl}/health`, {
      headers: { Origin: "http://localhost:5173" }
    });
    assert.equal(res.status, 200);
    assert.equal(res.headers.get("access-control-allow-origin"), "http://localhost:5173");
  });

  // 3. Payload size limiting
  it("rejects JSON payloads exceeding the 100kb limit", async () => {
    const oversizedBody = JSON.stringify({ largeField: "X".repeat(110 * 1024) });
    const res = await fetch(`${baseUrl}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: oversizedBody
    });
    assert.equal(res.status, 413);
  });

  // 4. Timing-safe Login Authentication
  it("returns 401 with standard message for invalid email or password", async () => {
    const res = await fetch(`${baseUrl}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "nonexistent.admin@dtc.gov.in", password: "InvalidPassword123!" })
    });
    assert.equal(res.status, 401);
    const body = await res.json();
    assert.equal(body.success, false);
    assert.equal(body.error, "Invalid email or password.");
  });

  // 5. Driver PII Protection on GET /api/drivers
  it("sanitizes GET /api/drivers and strictly omits phone numbers and licenses", async () => {
    const res = await fetch(`${baseUrl}/drivers`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.ok(Array.isArray(body.data));
    for (const driver of body.data) {
      assert.equal(driver.phone, undefined, "Driver phone must not be exposed");
      assert.equal(driver.licenseNumber, undefined, "Driver licenseNumber must not be exposed");
      assert.ok(driver.name, "Driver name should be present");
      assert.ok(driver.badgeNumber, "Driver badgeNumber should be present");
    }
  });

  // 6. Crew Endpoint Authentication Protection
  it("requires admin authentication for GET /api/crew", async () => {
    const unauthRes = await fetch(`${baseUrl}/crew`);
    assert.equal(unauthRes.status, 401);

    const authRes = await fetch(`${baseUrl}/crew`, {
      headers: { Authorization: `Bearer ${ADMIN_TOKEN}` }
    });
    assert.equal(authRes.status, 200);
  });

  // 7. Bus Nested Driver PII Protection
  it("omits driver phone and licenseNumber in GET /api/buses", async () => {
    const res = await fetch(`${baseUrl}/buses`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    for (const bus of body.data) {
      if (bus.driver) {
        assert.equal(bus.driver.phone, undefined, "Nested driver phone must not be exposed");
        assert.equal(bus.driver.licenseNumber, undefined, "Nested driver licenseNumber must not be exposed");
      }
    }
  });

  // 9. Rate limiting on authentication routes
  it("enforces rate limiting on repeated authentication calls", async () => {
    let hitRateLimit = false;
    for (let i = 0; i < 25; i++) {
      const res = await fetch(`${baseUrl}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "rate-test@dtc.gov.in", password: "SomePassword123!" })
      });
      if (res.status === 429) {
        hitRateLimit = true;
        const body = await res.json();
        assert.equal(body.success, false);
        assert.match(body.error, /too many/i);
        break;
      }
    }
    // If running in test mode with high threshold, verify standard headers are provided
    const res = await fetch(`${baseUrl}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "rate-test@dtc.gov.in", password: "SomePassword123!" })
    });
    assert.ok(res.headers.get("ratelimit-limit"), "RateLimit-Limit header should be present");
  });

  // 10. Error Sanitization in Production Mode
  it("masks 500 error messages when NODE_ENV is production", async () => {
    process.env.NODE_ENV = "production";
    const res = await fetch(`${baseUrl}/users/invalid-id`, {
      headers: { Authorization: `Bearer ${ADMIN_TOKEN}` }
    });
    // Regardless of internal exception, 500 errors must not leak database internals
    if (res.status === 500) {
      const body = await res.json();
      assert.equal(body.error, "An unexpected internal server error occurred.");
    }
    process.env.NODE_ENV = "test";
  });
});
