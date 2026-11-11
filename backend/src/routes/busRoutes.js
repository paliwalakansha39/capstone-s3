import { Router } from "express";
import {
  getAllBuses,
  getBusStats,
  getBusById,
  createBus,
  updateBus,
  deleteBus
} from "../controllers/busController.js";
import { requireAdminAuth } from "../middleware/authMiddleware.js";
import {
  validateCreateBus,
  validateUpdateBus
} from "../middleware/validationMiddleware.js";

const router = Router();

// Bus management routes
router.get("/stats", getBusStats);
router.get("/", getAllBuses);
router.get("/:id", getBusById);

// Admin-protected write endpoints
router.post("/", requireAdminAuth, validateCreateBus, createBus);
router.put("/:id", requireAdminAuth, validateUpdateBus, updateBus);
router.delete("/:id", requireAdminAuth, deleteBus);

export default router;
