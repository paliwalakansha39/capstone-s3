import { Router } from "express";
import { createHandover, listHandovers } from "../controllers/handoverController.js";
import { requireAdminAuth } from "../middleware/authMiddleware.js";

const router = Router();

router.use(requireAdminAuth);
router.get("/", listHandovers);
router.post("/", createHandover);

export default router;
