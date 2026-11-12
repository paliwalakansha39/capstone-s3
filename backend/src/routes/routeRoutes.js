import { Router } from "express";
import {
  addRouteStop,
  createRoute,
  deleteRoute,
  deleteStop,
  getRoute,
  listRoutes,
  updateRoute,
  updateStop
} from "../controllers/routeController.js";
import { requireAdminAuth } from "../middleware/authMiddleware.js";

const router = Router();

router.use(requireAdminAuth);
router.get("/", listRoutes);
router.post("/", createRoute);
router.get("/:id", getRoute);
router.put("/:id", updateRoute);
router.delete("/:id", deleteRoute);
router.post("/:id/stops", addRouteStop);

export default router;
