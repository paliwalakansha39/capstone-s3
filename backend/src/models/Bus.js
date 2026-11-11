import { DataTypes, Model } from "sequelize";
import sequelize from "../config/database.js";

export class Bus extends Model {}

Bus.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    busNumber: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: {
        name: "unique_bus_number",
        msg: "A bus with this bus number already exists."
      },
      validate: {
        notEmpty: { msg: "Bus number is required." }
      }
    },
    registrationNumber: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: {
        name: "unique_registration_number",
        msg: "A bus with this registration number already exists."
      },
      validate: {
        notEmpty: { msg: "Registration number is required." }
      }
    },
    busType: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: "Electric",
      validate: {
        isIn: {
          args: [["AC", "Non-AC", "Electric", "Low Floor", "Standard"]],
          msg: "Bus type must be one of: AC, Non-AC, Electric, Low Floor, Standard"
        }
      }
    },
    capacity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 40,
      validate: {
        isInt: { msg: "Capacity must be an integer." },
        min: { args: [10], msg: "Capacity must be at least 10 seats." },
        max: { args: [120], msg: "Capacity cannot exceed 120." }
      }
    },
    depot: {
      type: DataTypes.STRING(100),
      allowNull: true,
      defaultValue: "BBM Depot"
    },
    modelYear: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        isInt: { msg: "Model year must be a valid year." }
      }
    },
    manufacturer: {
      type: DataTypes.STRING(100),
      allowNull: true,
      defaultValue: "Tata Motors"
    },
    status: {
      type: DataTypes.STRING(30),
      allowNull: false,
      defaultValue: "Active",
      validate: {
        isIn: {
          args: [["Active", "Inactive", "Maintenance"]],
          msg: "Status must be Active, Inactive, or Maintenance"
        }
      }
    },
    routeId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: "routes",
        key: "id"
      },
      onUpdate: "CASCADE",
      onDelete: "SET NULL"
    },
    driverId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: "drivers",
        key: "id"
      },
      onUpdate: "CASCADE",
      onDelete: "SET NULL"
    }
  },
  {
    sequelize,
    modelName: "Bus",
    tableName: "buses",
    timestamps: true
  }
);

export default Bus;
