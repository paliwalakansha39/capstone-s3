import api from "./api";

export async function getCrew(params = {}) {
  const filters = Object.fromEntries(Object.entries(params).filter(([, value]) => value && value !== "all"));
  const response = await api.get("/crew", { params: filters });
  return response.data;
}

export async function getCrewStats() {
  const response = await api.get("/crew/availability");
  return response.data.data;
}

export async function getCrewById(id) {
  const response = await api.get(`/crew/${encodeURIComponent(id)}`);
  return response.data.data;
}

export async function createCrew(crewData) {
  const response = await api.post("/crew", crewData);
  return response.data.data;
}

export async function updateCrew(id, crewData) {
  const response = await api.put(`/crew/${encodeURIComponent(id)}`, crewData);
  return response.data.data;
}

export async function deleteCrew(id) {
  const response = await api.delete(`/crew/${encodeURIComponent(id)}`);
  return response.data;
}
