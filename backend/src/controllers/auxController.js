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

// GET /api/drivers - Safe public driver roster with PII protection
export async function getAllDrivers(req, res, next) {
  try {
    // Return sanitized operational driver roster without PII (phone, commercial license)
    const drivers = await prisma.crew.findMany({
      where: { role: "Driver" },
      select: {
        id: true,
        crewId: true,
        name: true,
        role: true,
        badgeNumber: true,
        assignedDepot: true,
        status: true,
        experienceYears: true
      },
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
