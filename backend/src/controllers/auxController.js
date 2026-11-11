import { Route, Driver } from "../models/index.js";

// GET /api/routes
export async function getAllRoutes(req, res, next) {
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
