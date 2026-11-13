/**
 * Route Overlap Controller
 * 
 * Handles HTTP requests for proposed route creation, overlap analysis,
 * and historical evaluation retrieval.
 */

import {
  analyzeAndPersistRouteOverlap,
  createProposedRoute,
  deleteProposedRoute,
  getOverlapAnalysisById,
  getProposedRouteById,
  listOverlapHistory,
  listProposedRoutes
} from "../services/routeOverlapService.js";

/**
 * POST /api/routes/proposed
 * Creates a new proposed route with ordered coordinates.
 */
export async function createProposedRouteHandler(req, res, next) {
  try {
    const { name, description, coordinates, estimatedTravelTime } = req.body || {};
    const adminId = req.admin?.id || null;

    const proposedRoute = await createProposedRoute({
      name,
      description,
      coordinates,
      estimatedTravelTime,
      adminId
    });

    return res.status(201).json({
      success: true,
      message: "Proposed route created successfully.",
      data: proposedRoute
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * GET /api/routes/proposed
 * Lists all proposed routes.
 */
export async function listProposedRoutesHandler(req, res, next) {
  try {
    const { search, status } = req.query;
    const routes = await listProposedRoutes({ search, status });
    return res.status(200).json({
      success: true,
      data: routes
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * GET /api/routes/proposed/:id
 * Retrieves a single proposed route by ID.
 */
export async function getProposedRouteHandler(req, res, next) {
  try {
    const { id } = req.params;
    const route = await getProposedRouteById(id);
    return res.status(200).json({
      success: true,
      data: route
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * DELETE /api/routes/proposed/:id
 * Deletes a proposed route by ID.
 */
export async function deleteProposedRouteHandler(req, res, next) {
  try {
    const { id } = req.params;
    const result = await deleteProposedRoute(id);
    return res.status(200).json({
      success: true,
      message: result.message
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * POST /api/routes/analyze-overlap
 * Performs real geographical overlap detection against existing bus routes.
 */
export async function analyzeOverlapHandler(req, res, next) {
  try {
    const { coordinates, proposedRouteId, proposedRouteName, toleranceMeters, saveRecord } = req.body || {};
    const adminId = req.admin?.id || null;

    let coordsToAnalyze = coordinates;
    let routeName = proposedRouteName || "Proposed Route";

    // If proposedRouteId was provided without explicit coordinates, load them from database
    if ((!coordsToAnalyze || coordsToAnalyze.length === 0) && proposedRouteId) {
      const existingProposed = await getProposedRouteById(proposedRouteId);
      coordsToAnalyze = existingProposed.coordinates;
      routeName = existingProposed.name;
    }

    if (!coordsToAnalyze || !Array.isArray(coordsToAnalyze) || coordsToAnalyze.length < 2) {
      return res.status(400).json({
        success: false,
        error: "At least 2 geographical coordinates are required for route overlap analysis."
      });
    }

    const result = await analyzeAndPersistRouteOverlap({
      coordinates: coordsToAnalyze,
      proposedRouteId,
      proposedRouteName: routeName,
      toleranceMeters: toleranceMeters !== undefined ? Number(toleranceMeters) : 50.0,
      adminId,
      saveRecord: saveRecord !== false
    });

    return res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * GET /api/routes/overlap/:id
 * Retrieves a specific historical overlap analysis record.
 */
export async function getOverlapAnalysisHandler(req, res, next) {
  try {
    const { id } = req.params;
    const analysis = await getOverlapAnalysisById(id);
    return res.status(200).json({
      success: true,
      data: analysis
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * GET /api/routes/overlap-history
 * Lists historical route overlap analysis executions.
 */
export async function getOverlapHistoryHandler(req, res, next) {
  try {
    const { limit, search } = req.query;
    const history = await listOverlapHistory({ limit, search });
    return res.status(200).json({
      success: true,
      data: history
    });
  } catch (error) {
    return next(error);
  }
}
