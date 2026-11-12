import { Router } from "express";
import { deleteStop, updateStop } from "../controllers/routeController.js";
import { requireAdminAuth } from "../middleware/authMiddleware.js";

const router = Router();
router.use(requireAdminAuth);
router.put("/:id", updateStop);
router.delete("/:id", deleteStop);

export default router;
