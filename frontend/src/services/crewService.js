// crewService.js - DTC Crew & Availability API Client

const BASE_URL = "/api";

async function request(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const config = {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "x-admin-role": "admin",
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

// Fetch all crew members with query filtering & pagination
export async function getCrew(params = {}) {
  const query = new URLSearchParams();
  if (params.search) query.append("search", params.search);
  if (params.role && params.role !== "all") query.append("role", params.role);
  if (params.status && params.status !== "all") query.append("status", params.status);
  if (params.depot && params.depot !== "all") query.append("depot", params.depot);
  if (params.page) query.append("page", params.page);
  if (params.limit) query.append("limit", params.limit);
  if (params.sortBy) query.append("sortBy", params.sortBy);
  if (params.sortOrder) query.append("sortOrder", params.sortOrder);

  const qs = query.toString();
  const endpoint = qs ? `/crew?${qs}` : "/crew";
  return await request(endpoint);
}

// Fetch crew availability metrics and statistics
export async function getCrewStats() {
  const res = await request("/crew/availability");
  return res.data;
}

// Fetch a single crew member by ID
export async function getCrewById(id) {
  const res = await request(`/crew/${id}`);
  return res.data;
}

// Create a new crew member
export async function createCrew(crewData) {
  const res = await request("/crew", {
    method: "POST",
    body: JSON.stringify(crewData)
  });
  return res.data;
}

// Update existing crew details or status
export async function updateCrew(id, crewData) {
  const res = await request(`/crew/${id}`, {
    method: "PUT",
    body: JSON.stringify(crewData)
  });
  return res.data;
}

// Delete crew member record
export async function deleteCrew(id) {
  const res = await request(`/crew/${id}`, {
    method: "DELETE"
  });
  return res;
}
