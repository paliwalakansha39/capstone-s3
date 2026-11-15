import express from "express";
import cors from "cors";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import apiRouter from "./routes/index.js";
import { errorHandler, notFoundHandler } from "./middleware/errorMiddleware.js";

export function createApp() {
  const app = express();

  // Trust upstream proxy (Render, AWS ALB, Cloudflare, etc.)
  app.set("trust proxy", 1);

  // Security headers via Helmet
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false
    })
  );

  const allowedOrigins = (process.env.CORS_ORIGIN || "http://localhost:5173")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  app.use(
    cors({
      origin(origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
        const error = new Error("Origin is not allowed by CORS.");
        error.status = 403;
        return callback(error);
      }
    })
  );

  // Rate limiting for authentication endpoints to prevent brute-forcing
  const isTest = process.env.NODE_ENV === "test";
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: isTest ? 500 : 20, // 20 attempts per 15m in production
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      error: "Too many authentication attempts. Please try again after 15 minutes."
    }
  });

  app.use("/api/auth/login", authLimiter);
  app.use("/api/auth/register", authLimiter);

  // Request body parsers with strict size limits
  app.use(express.json({ limit: "100kb" }));
  app.use(express.urlencoded({ extended: true, limit: "100kb" }));

  // API Router
  app.use("/api", apiRouter);

  // 404 handler for undefined API routes
  app.use(notFoundHandler);

  // Centralized Error handler
  app.use(errorHandler);

  return app;
}

export default createApp;
