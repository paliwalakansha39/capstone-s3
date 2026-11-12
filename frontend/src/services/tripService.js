import api from "./api";

/**
 * Fetch paginated and filtered list of trips
 */
export async function getTrips(params = {}) {
  const filters = Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== "" && value !== "all")
  );
  const response = await api.get("/trips", { params: filters });
  return response.data;
}

/**
 * Fetch trip statistics
 */
export async function getTripStats() {
  const response = await api.get("/trips/stats");
  return response.data.data;
}

/**
 * Fetch single trip by ID
 */
export async function getTripById(id) {
  const response = await api.get(`/trips/${encodeURIComponent(id)}`);
  return response.data.data;
}

/**
 * Create a new trip schedule
 */
export async function createTrip(tripData) {
  const response = await api.post("/trips", tripData);
  return response.data.data;
}

/**
 * Update an existing trip schedule
 */
export async function updateTrip(id, tripData) {
  const response = await api.put(`/trips/${encodeURIComponent(id)}`, tripData);
  return response.data.data;
}

/**
 * Delete a trip schedule
 */
export async function deleteTrip(id) {
  const response = await api.delete(`/trips/${encodeURIComponent(id)}`);
  return response.data;
}

/**
 * Fetch routes for trip route selection
 */
export async function getRoutes() {
  const response = await api.get("/legacy-routes");
  return response.data.data || [];
}

/**
 * Fetch buses for trip bus selection
 */
export async function getBuses(params = {}) {
  const response = await api.get("/buses", { params: { limit: 100, ...params } });
  return response.data.data || [];
}

/**
 * Fetch buses with their conflict/availability status for a specific time window
 */
export async function getAvailableBuses(params = {}) {
  const response = await api.get("/trips/available-buses", { params });
  return response.data.data || [];
}

/**
 * Check single bus conflict for a given slot
 */
export async function checkBusAvailability(params = {}) {
  const response = await api.get("/trips/bus-availability", { params });
  return response.data.data;
}
