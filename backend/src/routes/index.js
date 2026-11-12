import { Router } from "express";
import busRoutes from "./busRoutes.js";
import crewRoutes from "./crewRoutes.js";
import { getAllRoutes, getAllDrivers } from "../controllers/auxController.js";
import authRoutes from "./authRoutes.js";
import userRoutes from "./userRoutes.js";
import dashboardRoutes from "./dashboardRoutes.js";

const apiRouter = Router();

// Health check
apiRouter.get("/health", (req, res) => {
  res.status(200).json({
    status: "healthy",
    service: "dtc-bus-management-api",
    timestamp: new Date().toISOString()
  });
});

// Mount modules
apiRouter.use("/auth", authRoutes);
apiRouter.use("/users", userRoutes);
apiRouter.use("/dashboard", dashboardRoutes);
apiRouter.use("/buses", busRoutes);
apiRouter.use("/crew", crewRoutes);
apiRouter.get("/routes", getAllRoutes);
apiRouter.get("/drivers", getAllDrivers);

export default apiRouter;
