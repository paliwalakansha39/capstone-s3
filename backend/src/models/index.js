import sequelize from "../config/database.js";
import Bus from "./Bus.js";
import Route from "./Route.js";
import Driver from "./Driver.js";
import Crew from "./Crew.js";
import Trip from "./Trip.js";

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

// Trip associations
// A Route can have multiple Trips
Route.hasMany(Trip, {
  foreignKey: "routeId",
  as: "trips"
});

Trip.belongsTo(Route, {
  foreignKey: "routeId",
  as: "route"
});

// A Bus can have multiple Trips
Bus.hasMany(Trip, {
  foreignKey: "busId",
  as: "trips"
});

Trip.belongsTo(Bus, {
  foreignKey: "busId",
  as: "bus"
});

export {
  sequelize,
  Bus,
  Route,
  Driver,
  Crew,
  Trip
};

export default {
  sequelize,
  Bus,
  Route,
  Driver,
  Crew,
  Trip
};
