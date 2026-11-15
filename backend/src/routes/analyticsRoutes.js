import { Router } from "express";
import { requireAdminAuth } from "../middleware/authMiddleware.js";
import {
  getOverviewKPIs,
  getFullAnalytics,
  getFleetAnalyticsHandler,
  getCrewAnalyticsHandler,
  getTripAnalyticsHandler,
  getNetworkAnalyticsHandler,
  getSystemValidationHandler,
  exportReportHandler,
  getReportTypesHandler
} from "../controllers/analyticsController.js";

const router = Router();

// Protect all analytics endpoints with administrator authentication
router.use(requireAdminAuth);

// Overview and complete analytics
router.get("/overview", getOverviewKPIs);
router.get("/full", getFullAnalytics);

// Specialized domain utilization metrics
router.get("/fleet", getFleetAnalyticsHandler);
router.get("/crew", getCrewAnalyticsHandler);
router.get("/trips", getTripAnalyticsHandler);
router.get("/network", getNetworkAnalyticsHandler);

// Cross-module system consistency validation
router.get("/validation", getSystemValidationHandler);

// Report generation and metadata
router.get("/export", exportReportHandler);
router.get("/reports/metadata", getReportTypesHandler);

export default router;
