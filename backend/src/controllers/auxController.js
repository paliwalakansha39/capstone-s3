import { prisma } from "../config/prisma.js";

export async function getLegacyRoutes(req, res, next) {
  try {
    const routes = await prisma.route.findMany({
      orderBy: { routeNumber: "asc" }
    });
    return res.status(200).json({
      success: true,
      data: routes
    });
  } catch (error) {
    next(error);
  }
}

// GET /api/drivers
export async function getAllDrivers(req, res, next) {
  try {
    // Returns driver roster from unified crew model
    const drivers = await prisma.crew.findMany({
      where: { role: "Driver" },
      orderBy: { name: "asc" }
    });
    return res.status(200).json({
      success: true,
      data: drivers
    });
  } catch (error) {
    next(error);
  }
}
