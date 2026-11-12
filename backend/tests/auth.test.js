import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import { createApp } from "../src/app.js";

let server;
let baseUrl;

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

describe("Chunk 1 authentication guards", () => {
  it("requires authentication for user management", async () => {
    const response = await fetch(`${baseUrl}/users`);
    assert.equal(response.status, 401);
  });

  it("requires authentication for dashboard statistics", async () => {
    const response = await fetch(`${baseUrl}/dashboard/stats`);
    assert.equal(response.status, 401);
  });

  it("requires authentication to inspect the current admin", async () => {
    const response = await fetch(`${baseUrl}/auth/me`);
    assert.equal(response.status, 401);
  });

  it("rejects administrator registration without the setup key", async () => {
    const response = await fetch(`${baseUrl}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Test Admin", email: "admin@example.com", password: "long-enough-password" })
    });
    assert.equal(response.status, 403);
  });
});
