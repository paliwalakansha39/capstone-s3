import { Router } from "express";
import { getDashboardStats } from "../controllers/dashboardController.js";
import { requireAdminAuth } from "../middleware/authMiddleware.js";

const router = Router();
router.get("/stats", requireAdminAuth, getDashboardStats);

export default router;
