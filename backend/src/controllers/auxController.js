import { Route, Driver } from "../models/index.js";

// Legacy SQLite routes are still used by the existing bus assignment form.
export async function getLegacyRoutes(req, res, next) {
  try {
    const routes = await Route.findAll({
      order: [["routeNumber", "ASC"]]
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
    const drivers = await Driver.findAll({
      order: [["name", "ASC"]]
    });
    return res.status(200).json({
      success: true,
      data: drivers
    });
  } catch (error) {
    next(error);
  }
}
