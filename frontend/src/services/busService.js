import api from "./api";

export async function getBuses(params = {}) {
  const response = await api.get("/buses", { params });
  return response.data;
}

export async function getBusStats() {
  const response = await api.get("/buses/stats");
  return response.data.data;
}

export async function getBusById(id) {
  const response = await api.get(`/buses/${encodeURIComponent(id)}`);
  return response.data.data;
}

export async function createBus(busData) {
  const response = await api.post("/buses", busData);
  return response.data.data;
}

export async function updateBus(id, busData) {
  const response = await api.put(`/buses/${encodeURIComponent(id)}`, busData);
  return response.data.data;
}

export async function deleteBus(id) {
  const response = await api.delete(`/buses/${encodeURIComponent(id)}`);
  return response.data;
}

export async function getRoutes() {
  const response = await api.get("/routes");
  return response.data.data || [];
}

export async function getDrivers() {
  const response = await api.get("/drivers");
  return response.data.data || [];
}
