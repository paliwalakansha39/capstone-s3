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
  validateCreateCrew,
  validateUpdateCrew
} from "../middleware/crewValidationMiddleware.js";

const router = Router();

// Availability statistics and analytics
router.get("/stats", getCrewAvailabilityStats);
router.get("/availability", getCrewAvailabilityStats);

// Crew listing and retrieval
router.get("/", getAllCrew);
router.get("/:id", getCrewById);

// Admin-managed crew CRUD endpoints
router.post("/", requireAdminAuth, validateCreateCrew, createCrew);
router.put("/:id", requireAdminAuth, validateUpdateCrew, updateCrew);
router.delete("/:id", requireAdminAuth, deleteCrew);

export default router;
