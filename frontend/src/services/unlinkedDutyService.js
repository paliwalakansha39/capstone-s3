import api from "./api";

export async function getUnlinkedSchedules(params = {}) {
  const response = await api.get("/schedules/unlinked", { params });
  return response.data;
}

export async function createUnlinkedSchedule(schedule) {
  const response = await api.post("/schedules/unlinked", schedule);
  return response.data;
}

export async function getRestConfiguration() {
  const response = await api.get("/schedules/unlinked/rest-config");
  return response.data.data;
}

export async function getAvailableCrew(params = {}) {
  const response = await api.get("/crew/available", { params });
  return response.data;
}

export async function getCrewRestPeriods(crewId) {
  const response = await api.get(`/crew/${encodeURIComponent(crewId)}/rest-periods`);
  return response.data.data;
}

export async function getCrewAvailabilityCalendar(params) {
  const response = await api.get("/crew/availability-calendar", { params });
  return response.data;
}

export async function createHandover(handover) {
  const response = await api.post("/handovers", handover);
  return response.data;
}

export async function getHandovers(params = {}) {
  const response = await api.get("/handovers", { params });
  return response.data;
}
