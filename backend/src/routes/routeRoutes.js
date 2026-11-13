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
import {
  createProposedRouteHandler,
  deleteProposedRouteHandler,
  getProposedRouteHandler,
  listProposedRoutesHandler
} from "../controllers/routeOverlapController.js";
import { requireAdminAuth } from "../middleware/authMiddleware.js";

const router = Router();

router.use(requireAdminAuth);

// Chunk 8: Proposed Route endpoints
router.get("/proposed", listProposedRoutesHandler);
router.post("/proposed", createProposedRouteHandler);
router.get("/proposed/:id", getProposedRouteHandler);
router.delete("/proposed/:id", deleteProposedRouteHandler);

// Production Route endpoints
router.get("/", listRoutes);
router.post("/", createRoute);
router.get("/:id", getRoute);
router.put("/:id", updateRoute);
router.delete("/:id", deleteRoute);
router.post("/:id/stops", addRouteStop);

export default router;
