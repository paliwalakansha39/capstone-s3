import api from "./api";

export async function getRoutes(search = "") {
  const response = await api.get("/routes", { params: search ? { search } : {} });
  return response.data.data;
}

export async function getRoute(id) {
  const response = await api.get(`/routes/${encodeURIComponent(id)}`);
  return response.data.data;
}

export async function createRoute(route) {
  const response = await api.post("/routes", route);
  return response.data.data;
}

export async function updateRoute(id, route) {
  const response = await api.put(`/routes/${encodeURIComponent(id)}`, route);
  return response.data.data;
}

export async function deleteRoute(id) {
  const response = await api.delete(`/routes/${encodeURIComponent(id)}`);
  return response.data;
}

export async function addBusStop(routeId, stop) {
  const response = await api.post(`/routes/${encodeURIComponent(routeId)}/stops`, stop);
  return response.data.data;
}

export async function updateBusStop(id, stop) {
  const response = await api.put(`/stops/${encodeURIComponent(id)}`, stop);
  return response.data.data;
}

export async function deleteBusStop(id) {
  const response = await api.delete(`/stops/${encodeURIComponent(id)}`);
  return response.data;
}
