import { Router } from "express";
import {
  getAllDuties,
  getDutyStats,
  getDutyById,
  generateLinkedDutiesHandler,
  createDuty,
  updateDuty,
  deleteDuty
} from "../controllers/dutyController.js";
import { requireAdminAuth } from "../middleware/authMiddleware.js";
import {
  validateCreateDuty,
  validateUpdateDuty,
  validateGenerateLinkedDuties
} from "../middleware/dutyValidationMiddleware.js";

const router = Router();

// Metrics & statistics
router.get("/stats", getDutyStats);

// Automated Linked Duty Scheduling Engine
router.post(
  "/generate-linked",
  requireAdminAuth,
  validateGenerateLinkedDuties,
  generateLinkedDutiesHandler
);

// Standard duty listing & detail
router.get("/", getAllDuties);
router.get("/:id", getDutyById);

// Admin-protected CRUD operations
router.post("/", requireAdminAuth, validateCreateDuty, createDuty);
router.put("/:id", requireAdminAuth, validateUpdateDuty, updateDuty);
router.delete("/:id", requireAdminAuth, deleteDuty);

export default router;
