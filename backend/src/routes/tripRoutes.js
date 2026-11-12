import { Router } from "express";
import {
  getAllTrips,
  getTripStats,
  getTripById,
  createTrip,
  updateTrip,
  deleteTrip
} from "../controllers/tripController.js";
import { requireAdminAuth } from "../middleware/authMiddleware.js";
import {
  validateCreateTrip,
  validateUpdateTrip
} from "../middleware/tripValidationMiddleware.js";

const router = Router();

// Public / operational retrieval endpoints
router.get("/stats", getTripStats);
router.get("/", getAllTrips);
router.get("/:id", getTripById);

// Admin-protected mutation endpoints
router.post("/", requireAdminAuth, validateCreateTrip, createTrip);
router.put("/:id", requireAdminAuth, validateUpdateTrip, updateTrip);
router.delete("/:id", requireAdminAuth, deleteTrip);

export default router;
