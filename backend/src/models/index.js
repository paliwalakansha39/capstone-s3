import sequelize from "../config/database.js";
import Bus from "./Bus.js";
import Route from "./Route.js";
import Driver from "./Driver.js";
import Crew from "./Crew.js";

// Establish relationships
// A Bus optionally belongs to a Route
Bus.belongsTo(Route, {
  foreignKey: "routeId",
  as: "route"
});

Route.hasMany(Bus, {
  foreignKey: "routeId",
  as: "buses"
});

// A Bus optionally belongs to an assigned Driver
Bus.belongsTo(Driver, {
  foreignKey: "driverId",
  as: "driver"
});

Driver.hasMany(Bus, {
  foreignKey: "driverId",
  as: "buses"
});

export {
  sequelize,
  Bus,
  Route,
  Driver,
  Crew
};

export default {
  sequelize,
  Bus,
  Route,
  Driver,
  Crew
};
