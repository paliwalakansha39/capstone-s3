import { Router } from "express";
import {
  getAllCrew,
  getCrewAvailabilityStats,
  getCrewById,
  createCrew,
  updateCrew,
  deleteCrew
} from "../controllers/crewController.js";
import { requireAdminAuth } from "../middleware/authMiddleware.js";
import {
  getCrewAvailability,
  getCrewAvailabilityCalendar,
  getCrewRestPeriods,
  listAvailableCrew
} from "../controllers/crewAvailabilityController.js";
import {
  validateCreateCrew,
  validateUpdateCrew
} from "../middleware/crewValidationMiddleware.js";

const router = Router();

// Availability statistics and analytics
router.get("/stats", getCrewAvailabilityStats);
router.get("/availability", getCrewAvailabilityStats);
router.get("/available", requireAdminAuth, listAvailableCrew);
router.get("/availability-calendar", requireAdminAuth, getCrewAvailabilityCalendar);

// Crew listing and retrieval
router.get("/", getAllCrew);
router.get("/:id/availability", requireAdminAuth, getCrewAvailability);
router.get("/:id/rest-periods", requireAdminAuth, getCrewRestPeriods);
router.get("/:id", getCrewById);

// Admin-managed crew CRUD endpoints
router.post("/", requireAdminAuth, validateCreateCrew, createCrew);
router.put("/:id", requireAdminAuth, validateUpdateCrew, updateCrew);
router.delete("/:id", requireAdminAuth, deleteCrew);

export default router;
