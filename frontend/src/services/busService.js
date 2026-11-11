// busService.js - DTC Bus Management API Client

const BASE_URL = "/api";

async function request(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const config = {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...options.headers
    }
  };

  const response = await fetch(url, config);
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      data?.error ||
      data?.message ||
      `Server returned status ${response.status}: ${response.statusText}`;
    const err = new Error(message);
    err.status = response.status;
    err.data = data;
    throw err;
  }

  return data;
}

// Fetch all buses with query filtering
export async function getBuses(params = {}) {
  const query = new URLSearchParams();
  if (params.search) query.append("search", params.search);
  if (params.status && params.status !== "all") query.append("status", params.status);
  if (params.busType && params.busType !== "all") query.append("busType", params.busType);
  if (params.page) query.append("page", params.page);
  if (params.limit) query.append("limit", params.limit);

  const qs = query.toString();
  const endpoint = qs ? `/buses?${qs}` : "/buses";
  const res = await request(endpoint);
  return res;
}

// Fetch bus fleet statistics
export async function getBusStats() {
  const res = await request("/buses/stats");
  return res.data;
}

// Fetch a single bus by ID
export async function getBusById(id) {
  const res = await request(`/buses/${id}`);
  return res.data;
}

// Create a new bus
export async function createBus(busData) {
  const res = await request("/buses", {
    method: "POST",
    body: JSON.stringify(busData)
  });
  return res.data;
}

// Update an existing bus
export async function updateBus(id, busData) {
  const res = await request(`/buses/${id}`, {
    method: "PUT",
    body: JSON.stringify(busData)
  });
  return res.data;
}

// Delete a bus
export async function deleteBus(id) {
  const res = await request(`/buses/${id}`, {
    method: "DELETE"
  });
  return res;
}

// Fetch available routes for assignment
export async function getRoutes() {
  const res = await request("/routes");
  return res.data || [];
}

// Fetch available drivers for assignment
export async function getDrivers() {
  const res = await request("/drivers");
  return res.data || [];
}
