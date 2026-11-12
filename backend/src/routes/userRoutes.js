import { Router } from "express";
import { createUser, deleteUser, getUser, listUsers, updateUser } from "../controllers/userController.js";
import { requireAdminAuth } from "../middleware/authMiddleware.js";

const router = Router();
router.use(requireAdminAuth);
router.get("/", listUsers);
router.get("/:id", getUser);
router.post("/", createUser);
router.put("/:id", updateUser);
router.delete("/:id", deleteUser);

export default router;
