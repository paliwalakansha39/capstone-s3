import sequelize from "../config/database.js";
import Bus from "./Bus.js";
import Route from "./Route.js";
import Driver from "./Driver.js";
import Crew from "./Crew.js";
import Trip from "./Trip.js";
import Duty from "./Duty.js";
import DutyAssignment from "./DutyAssignment.js";

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

// Duty and DutyAssignment associations (Linked Duty Scheduling)
Duty.hasOne(DutyAssignment, {
  foreignKey: "dutyId",
  as: "assignment",
  onDelete: "CASCADE"
});

DutyAssignment.belongsTo(Duty, {
  foreignKey: "dutyId",
  as: "duty"
});

DutyAssignment.belongsTo(Bus, {
  foreignKey: "busId",
  as: "bus"
});

Bus.hasMany(DutyAssignment, {
  foreignKey: "busId",
  as: "dutyAssignments"
});

DutyAssignment.belongsTo(Crew, {
  foreignKey: "driverId",
  as: "driver"
});

Crew.hasMany(DutyAssignment, {
  foreignKey: "driverId",
  as: "driverDuties"
});

DutyAssignment.belongsTo(Crew, {
  foreignKey: "conductorId",
  as: "conductor"
});

Crew.hasMany(DutyAssignment, {
  foreignKey: "conductorId",
  as: "conductorDuties"
});

export {
  sequelize,
  Bus,
  Route,
  Driver,
  Crew,
  Trip,
  Duty,
  DutyAssignment
};

export default {
  sequelize,
  Bus,
  Route,
  Driver,
  Crew,
  Trip,
  Duty,
  DutyAssignment
};
