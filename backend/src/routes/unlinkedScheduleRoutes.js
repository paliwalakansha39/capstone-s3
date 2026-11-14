import { Router } from "express";
import {
  createUnlinkedSchedule,
  getUnlinkedRestConfiguration,
  listUnlinkedSchedules
} from "../controllers/scheduleController.js";
import { requireAdminAuth } from "../middleware/authMiddleware.js";

const router = Router();

router.use(requireAdminAuth);
router.get("/rest-config", getUnlinkedRestConfiguration);
router.get("/", listUnlinkedSchedules);
router.post("/", createUnlinkedSchedule);

export default router;
