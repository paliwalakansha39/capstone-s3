import api from "./api";

/**
 * Fetch paginated and filtered list of duties
 * Supports query params: page, limit, search, shiftType, shiftDate, depot, status, busId, sortBy, sortOrder
 */
export async function getDuties(params = {}) {
  const filters = Object.fromEntries(
    Object.entries(params).filter(
      ([, value]) => value !== undefined && value !== null && value !== "" && value !== "all"
    )
  );
  const response = await api.get("/duties", { params: filters });
  return response.data;
}

/**
 * Fetch duty aggregate statistics (total, scheduled, active, completed, cancelled, assignedBuses, assignedDrivers)
 */
export async function getDutyStats() {
  const response = await api.get("/duties/stats");
  return response.data.data;
}

/**
 * Fetch a single duty schedule by ID with linked bus and crew assignment
 */
export async function getDutyById(id) {
  const response = await api.get(`/duties/${encodeURIComponent(id)}`);
  return response.data.data;
}

/**
 * Trigger automated greedy linked duty generation engine for a target date and depot
 */
export async function generateLinkedDuties({ shiftDate, depot }) {
  const response = await api.post("/duties/generate-linked", { shiftDate, depot });
  return response.data;
}

/**
 * Create a manual linked duty schedule
 */
export async function createDuty(dutyData) {
  const response = await api.post("/duties", dutyData);
  return response.data.data;
}

/**
 * Update an existing duty schedule (status, shiftType, times, notes)
 */
export async function updateDuty(id, dutyData) {
  const response = await api.put(`/duties/${encodeURIComponent(id)}`, dutyData);
  return response.data.data;
}

/**
 * Delete a duty schedule (restricted when duty is Active)
 */
export async function deleteDuty(id) {
  const response = await api.delete(`/duties/${encodeURIComponent(id)}`);
  return response.data;
}
