import { Router } from "express";
import { getCurrentAdmin, loginAdmin, registerAdmin } from "../controllers/authController.js";
import { requireAdminAuth, requireCurrentAdmin } from "../middleware/authMiddleware.js";

const router = Router();

router.post("/register", registerAdmin);
router.post("/login", loginAdmin);
router.get("/me", requireAdminAuth, requireCurrentAdmin, getCurrentAdmin);

export default router;
