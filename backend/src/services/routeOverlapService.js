/**
 * Route Overlap Database & Domain Service
 * 
 * Orchestrates overlap detection analysis, proposed route management,
 * and database persistence via Prisma ORM.
 */

import { prisma } from "../config/prisma.js";
import { executeRouteOverlapAnalysis } from "./routeOverlapEngine.js";

/**
 * Creates and persists a new proposed route with ordered coordinates.
 */
export async function createProposedRoute({
  name,
  description = null,
  coordinates = [],
  estimatedTravelTime = null,
  adminId = null
}) {
  if (!name || typeof name !== "string" || !name.trim()) {
    const error = new Error("Proposed route name is required.");
    error.statusCode = 400;
    throw error;
  }
  if (!Array.isArray(coordinates) || coordinates.length < 2) {
    const error = new Error("A proposed route requires at least 2 coordinate waypoints.");
    error.statusCode = 400;
    throw error;
  }

  // Pre-calculate polyline total distance
  const { calculatePolylineDistance } = await import("./geoDistance.js");
  const totalMeters = calculatePolylineDistance(coordinates);
  const totalKm = Math.round((totalMeters / 1000.0) * 100) / 100;

  const proposedRoute = await prisma.$transaction(async (tx) => {
    const created = await tx.proposedRoute.create({
      data: {
        name: name.trim(),
        description: description ? description.trim() : null,
        status: "Draft",
        totalDistance: totalKm,
        estimatedTravelTime: estimatedTravelTime ? parseInt(estimatedTravelTime, 10) : null,
        createdByAdminId: adminId,
        coordinates: {
          create: coordinates.map((coord, index) => ({
            latitude: coord.latitude,
            longitude: coord.longitude,
            sequenceNumber: index + 1,
            name: coord.name ? coord.name.trim() : `Point ${index + 1}`
          }))
        }
      },
      include: {
        coordinates: { orderBy: { sequenceNumber: "asc" } },
        createdByAdmin: { select: { id: true, name: true, email: true } }
      }
    });
    return created;
  });

  return proposedRoute;
}

/**
 * Retrieves all proposed routes with their coordinate waypoints.
 */
export async function listProposedRoutes({ search = "", status = "" } = {}) {
  const where = {};
  if (search && search.trim()) {
    where.name = { contains: search.trim(), mode: "insensitive" };
  }
  if (status && status.trim()) {
    where.status = status.trim();
  }

  return prisma.proposedRoute.findMany({
    where,
    include: {
      coordinates: { orderBy: { sequenceNumber: "asc" } },
      createdByAdmin: { select: { id: true, name: true, email: true } }
    },
    orderBy: { createdAt: "desc" }
  });
}

/**
 * Retrieves a single proposed route by ID.
 */
export async function getProposedRouteById(id) {
  const route = await prisma.proposedRoute.findUnique({
    where: { id },
    include: {
      coordinates: { orderBy: { sequenceNumber: "asc" } },
      createdByAdmin: { select: { id: true, name: true, email: true } },
      analyses: {
        orderBy: { createdAt: "desc" },
        take: 5,
        include: { overlappingSegments: true }
      }
    }
  });
  if (!route) {
    const error = new Error("Proposed route not found.");
    error.statusCode = 404;
    throw error;
  }
  return route;
}

/**
 * Deletes a proposed route by ID.
 */
export async function deleteProposedRoute(id) {
  const existing = await prisma.proposedRoute.findUnique({ where: { id } });
  if (!existing) {
    const error = new Error("Proposed route not found.");
    error.statusCode = 404;
    throw error;
  }

  await prisma.proposedRoute.delete({ where: { id } });
  return { success: true, message: `Proposed route '${existing.name}' was deleted successfully.` };
}

/**
 * Performs overlap detection and saves analysis records in PostgreSQL.
 */
export async function analyzeAndPersistRouteOverlap({
  coordinates = [],
  proposedRouteId = null,
  proposedRouteName = "Proposed Route",
  toleranceMeters = 50.0,
  adminId = null,
  saveRecord = true
}) {
  // Fetch existing transit routes with their ordered stops
  const existingRoutes = await prisma.route.findMany({
    include: {
      stops: { orderBy: { sequenceNumber: "asc" } }
    }
  });

  // Execute overlap detection algorithm
  const analysisResult = executeRouteOverlapAnalysis(coordinates, existingRoutes, toleranceMeters);

  let savedAnalysis = null;
  if (saveRecord) {
    savedAnalysis = await prisma.$transaction(async (tx) => {
      // If linked to an existing proposed route, update its status
      if (proposedRouteId) {
        await tx.proposedRoute.update({
          where: { id: proposedRouteId },
          data: { status: "Analyzed" }
        }).catch(() => null);
      }

      const created = await tx.routeOverlapAnalysis.create({
        data: {
          proposedRouteId: proposedRouteId || null,
          proposedRouteName: proposedRouteName.trim(),
          toleranceMeters: analysisResult.toleranceMeters,
          proposedTotalDistance: analysisResult.proposedTotalDistanceKm,
          overlappingDistance: analysisResult.overlappingDistanceKm,
          overlapPercentage: analysisResult.overlapPercentage,
          status: "Completed",
          summary: `Analysis against ${existingRoutes.length} existing DTC routes identified ${analysisResult.affectedRoutes.length} overlapping routes (${analysisResult.overlapPercentage}% overlap).`,
          analyzedByAdminId: adminId,
          overlappingSegments: {
            create: analysisResult.overlappingSegments.map((seg) => ({
              existingRouteId: seg.existingRouteId,
              existingRouteNumber: seg.existingRouteNumber,
              existingRouteName: seg.existingRouteName,
              overlapDistance: seg.overlapDistanceMeters,
              overlapPercentage: seg.overlapPercentage,
              segmentCoordinates: seg.segmentCoordinates,
              startPoint: seg.startPoint,
              endPoint: seg.endPoint
            }))
          }
        },
        include: {
          overlappingSegments: true,
          analyzedByAdmin: { select: { id: true, name: true, email: true } }
        }
      });
      return created;
    });
  }

  return {
    ...analysisResult,
    analysisId: savedAnalysis?.id || null,
    savedAt: savedAnalysis?.createdAt || new Date().toISOString()
  };
}

/**
 * Retrieves a single overlap analysis record by ID.
 */
export async function getOverlapAnalysisById(id) {
  const analysis = await prisma.routeOverlapAnalysis.findUnique({
    where: { id },
    include: {
      overlappingSegments: true,
      analyzedByAdmin: { select: { id: true, name: true, email: true } },
      proposedRoute: {
        include: {
          coordinates: { orderBy: { sequenceNumber: "asc" } }
        }
      }
    }
  });
  if (!analysis) {
    const error = new Error("Route overlap analysis not found.");
    error.statusCode = 404;
    throw error;
  }
  return analysis;
}

/**
 * Lists overlap analysis history with pagination and search.
 */
export async function listOverlapHistory({ limit = 20, search = "" } = {}) {
  const take = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const where = {};
  if (search && search.trim()) {
    where.proposedRouteName = { contains: search.trim(), mode: "insensitive" };
  }

  return prisma.routeOverlapAnalysis.findMany({
    where,
    include: {
      overlappingSegments: true,
      analyzedByAdmin: { select: { id: true, name: true, email: true } },
      proposedRoute: { select: { id: true, name: true, status: true } }
    },
    orderBy: { createdAt: "desc" },
    take
  });
}
