import {
  getSystemOverviewKPIs,
  getFullSystemAnalytics
} from "../services/analyticsService.js";
import { getBusFleetUtilization } from "../services/busAnalyticsQuery.js";
import { getCrewUtilizationAnalytics } from "../services/crewAnalyticsQuery.js";
import { getTripOperationsAnalytics } from "../services/tripAnalyticsQuery.js";
import { getRouteNetworkAnalytics } from "../services/routeAnalyticsQuery.js";
import { runSystemValidation } from "../services/systemValidationService.js";

/**
 * Controller for Operational Analytics and Reporting Endpoints.
 * Subject: ASD (Advanced Software Design)
 */

/**
 * GET /api/analytics/overview
 * Returns executive overview, health score, and high-level KPI cards.
 */
export async function getOverviewKPIs(req, res, next) {
  try {
    const data = await getSystemOverviewKPIs(req.query);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/analytics/full
 * Returns deep operational analytics across fleet, crew, trips, and routes.
 */
export async function getFullAnalytics(req, res, next) {
  try {
    const data = await getFullSystemAnalytics(req.query);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/analytics/fleet
 * Returns fleet utilization, status distributions, and depot allocations.
 */
export async function getFleetAnalyticsHandler(req, res, next) {
  try {
    const data = await getBusFleetUtilization(req.query);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/analytics/crew
 * Returns crew workload ratios, rest compliance, and availability.
 */
export async function getCrewAnalyticsHandler(req, res, next) {
  try {
    const data = await getCrewUtilizationAnalytics(req.query);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/analytics/trips
 * Returns trip operations, hourly dispatch density, and completion statistics.
 */
export async function getTripAnalyticsHandler(req, res, next) {
  try {
    const data = await getTripOperationsAnalytics(req.query);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/analytics/network
 * Returns network route metrics, stop densities, and overlap redundancy breakdown.
 */
export async function getNetworkAnalyticsHandler(req, res, next) {
  try {
    const data = await getRouteNetworkAnalytics();
    return res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/analytics/validation
 * Runs automated cross-module consistency and integrity diagnostic check.
 */
export async function getSystemValidationHandler(req, res, next) {
  try {
    const data = await runSystemValidation();
    return res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
}
