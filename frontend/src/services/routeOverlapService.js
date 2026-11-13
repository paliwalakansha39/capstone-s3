/**
 * Route Overlap Frontend API Service
 * 
 * Interacts with backend endpoints for route overlap analysis,
 * proposed routes, and analysis history.
 */

import api from "./api";

/**
 * Analyzes route overlap for a set of proposed coordinates or an existing proposed route.
 */
export async function analyzeRouteOverlap(payload) {
  const response = await api.post("/routes/analyze-overlap", payload);
  return response.data.data;
}

/**
 * Saves a new proposed route.
 */
export async function saveProposedRoute(payload) {
  const response = await api.post("/routes/proposed", payload);
  return response.data.data;
}

/**
 * Lists all proposed routes.
 */
export async function getProposedRoutes(params = {}) {
  const response = await api.get("/routes/proposed", { params });
  return response.data.data;
}

/**
 * Retrieves a proposed route by ID.
 */
export async function getProposedRouteById(id) {
  const response = await api.get(`/routes/proposed/${id}`);
  return response.data.data;
}

/**
 * Deletes a proposed route by ID.
 */
export async function deleteProposedRoute(id) {
  const response = await api.delete(`/routes/proposed/${id}`);
  return response.data;
}

/**
 * Lists historical route overlap analysis runs.
 */
export async function getOverlapHistory(params = {}) {
  const response = await api.get("/routes/overlap-history", { params });
  return response.data.data;
}

/**
 * Retrieves a specific overlap analysis record by ID.
 */
export async function getOverlapAnalysisById(id) {
  const response = await api.get(`/routes/overlap/${id}`);
  return response.data.data;
}
