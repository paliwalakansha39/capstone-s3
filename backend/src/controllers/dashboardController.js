import { prisma } from "../config/prisma.js";

export async function getDashboardStats(req, res, next) {
  try {
    const [totalUsers, totalAdmins, totalBuses, totalRoutes] = await Promise.all([
      prisma.user.count(),
      prisma.admin.count(),
      prisma.bus.count(),
      prisma.route.count()
    ]);
    return res.status(200).json({
      success: true,
      data: { totalUsers, totalAdmins, totalBuses, totalRoutes }
    });
  } catch (error) {
    return next(error);
  }
}
