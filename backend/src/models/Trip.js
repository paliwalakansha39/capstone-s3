import { DataTypes, Model } from "sequelize";
import sequelize from "../config/database.js";

export class Trip extends Model {}

Trip.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    routeId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "routes",
        key: "id"
      },
      onUpdate: "CASCADE",
      onDelete: "RESTRICT",
      validate: {
        notEmpty: { msg: "Route ID is required." }
      }
    },
    busId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "buses",
        key: "id"
      },
      onUpdate: "CASCADE",
      onDelete: "RESTRICT",
      validate: {
        notEmpty: { msg: "Bus ID is required." }
      }
    },
    tripDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      validate: {
        notEmpty: { msg: "Trip date is required." },
        isDate: { msg: "Trip date must be a valid date (YYYY-MM-DD)." }
      }
    },
    departureTime: {
      type: DataTypes.STRING(10),
      allowNull: false,
      validate: {
        notEmpty: { msg: "Departure time is required." },
        is: {
          args: /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/,
          msg: "Departure time must be in HH:mm or HH:mm:ss format."
        }
      }
    },
    arrivalTime: {
      type: DataTypes.STRING(10),
      allowNull: false,
      validate: {
        notEmpty: { msg: "Arrival time is required." },
        is: {
          args: /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/,
          msg: "Arrival time must be in HH:mm or HH:mm:ss format."
        }
      }
    },
    startingStop: {
      type: DataTypes.STRING(120),
      allowNull: false,
      validate: {
        notEmpty: { msg: "Starting stop is required." }
      }
    },
    destinationStop: {
      type: DataTypes.STRING(120),
      allowNull: false,
      validate: {
        notEmpty: { msg: "Destination stop is required." }
      }
    },
    status: {
      type: DataTypes.STRING(30),
      allowNull: false,
      defaultValue: "Scheduled",
      validate: {
        isIn: {
          args: [["Scheduled", "In Progress", "Completed", "Cancelled"]],
          msg: "Status must be Scheduled, In Progress, Completed, or Cancelled."
        }
      }
    }
  },
  {
    sequelize,
    modelName: "Trip",
    tableName: "trips",
    timestamps: true
  }
);

export default Trip;
