import { Router } from "express";
import busRoutes from "./busRoutes.js";
import crewRoutes from "./crewRoutes.js";
import tripRoutes from "./tripRoutes.js";
import dutyRoutes from "./dutyRoutes.js";
import { getLegacyRoutes, getAllDrivers } from "../controllers/auxController.js";
import authRoutes from "./authRoutes.js";
import userRoutes from "./userRoutes.js";
import dashboardRoutes from "./dashboardRoutes.js";
import routeRoutes from "./routeRoutes.js";
import stopRoutes from "./stopRoutes.js";
import unlinkedScheduleRoutes from "./unlinkedScheduleRoutes.js";
import handoverRoutes from "./handoverRoutes.js";

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
apiRouter.use("/trips", tripRoutes);
apiRouter.use("/duties", dutyRoutes);
apiRouter.use("/schedules/unlinked", unlinkedScheduleRoutes);
apiRouter.use("/handovers", handoverRoutes);
apiRouter.use("/routes", routeRoutes);
apiRouter.use("/stops", stopRoutes);
apiRouter.get("/legacy-routes", getLegacyRoutes);
apiRouter.get("/drivers", getAllDrivers);

export default apiRouter;
