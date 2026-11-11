import { Router } from "express";
import busRoutes from "./busRoutes.js";
import crewRoutes from "./crewRoutes.js";
import { getAllRoutes, getAllDrivers } from "../controllers/auxController.js";

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
apiRouter.use("/buses", busRoutes);
apiRouter.use("/crew", crewRoutes);
apiRouter.get("/routes", getAllRoutes);
apiRouter.get("/drivers", getAllDrivers);

export default apiRouter;
