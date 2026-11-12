import api from "./api";

export async function readWorkspace() {
  const response = await api.get("/users");
  return response.data.data;
}

export async function addWorkspaceUser(details) {
  const response = await api.post("/users", details);
  return response.data.data;
}

export async function updateWorkspaceUser(id, details) {
  const response = await api.put(`/users/${encodeURIComponent(id)}`, details);
  return response.data.data;
}

export async function deleteWorkspaceUser(id) {
  await api.delete(`/users/${encodeURIComponent(id)}`);
}
