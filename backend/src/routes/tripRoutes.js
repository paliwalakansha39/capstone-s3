import { Router } from "express";
import {
  getAllTrips,
  getTripStats,
  createTrip
} from "../controllers/tripController.js";
import { requireAdminAuth } from "../middleware/authMiddleware.js";
import { validateCreateTrip } from "../middleware/tripValidationMiddleware.js";

const router = Router();

// Public / operational retrieval endpoints
router.get("/stats", getTripStats);
router.get("/", getAllTrips);

// Admin-protected creation endpoint
router.post("/", requireAdminAuth, validateCreateTrip, createTrip);

export default router;
