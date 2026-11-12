import jwt from "jsonwebtoken";
import { prisma } from "../config/prisma.js";

export function requireAdminAuth(req, res, next) {
  const authorization = req.headers.authorization;
  if (!authorization?.startsWith("Bearer ")) {
    return res.status(401).json({ success: false, error: "Authentication required." });
  }

  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error("JWT_SECRET is not configured.");
    req.auth = jwt.verify(authorization.slice(7), secret);
    if (req.auth.role !== "admin") {
      return res.status(403).json({ success: false, error: "Administrator access required." });
    }
    return next();
  } catch (error) {
    if (error.name === "JsonWebTokenError" || error.name === "TokenExpiredError") {
      return res.status(401).json({ success: false, error: "Invalid or expired authentication token." });
    }
    return next(error);
  }
}

export async function requireCurrentAdmin(req, res, next) {
  try {
    const admin = await prisma.admin.findUnique({ where: { id: req.auth.id } });
    if (!admin) return res.status(401).json({ success: false, error: "Administrator account no longer exists." });
    req.admin = admin;
    return next();
  } catch (error) {
    return next(error);
  }
}

export default requireAdminAuth;
