import { prisma } from "../config/prisma.js";
import { Bus, Route } from "../models/index.js";

export async function getDashboardStats(req, res, next) {
  try {
    const [totalUsers, totalAdmins, totalBuses, totalRoutes] = await Promise.all([
      prisma.user.count(),
      prisma.admin.count(),
      Bus.count(),
      Route.count()
    ]);
    return res.status(200).json({
      success: true,
      data: { totalUsers, totalAdmins, totalBuses, totalRoutes }
    });
  } catch (error) {
    return next(error);
  }
}
