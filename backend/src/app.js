import express from "express";
import cors from "cors";
import apiRouter from "./routes/index.js";
import { errorHandler, notFoundHandler } from "./middleware/errorMiddleware.js";

export function createApp() {
  const app = express();

  const allowedOrigins = (process.env.CORS_ORIGIN || "http://localhost:5173")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
  app.use(cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
      const error = new Error("Origin is not allowed by CORS.");
      error.status = 403;
      return callback(error);
    }
  }));

  // Body parsers
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // API Router
  app.use("/api", apiRouter);

  // 404 handler for undefined API routes
  app.use(notFoundHandler);

  // Centralized Error handler
  app.use(errorHandler);

  return app;
}

export default createApp;
