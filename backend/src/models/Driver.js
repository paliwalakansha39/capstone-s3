import { DataTypes, Model } from "sequelize";
import sequelize from "../config/database.js";

export class Driver extends Model {}

Driver.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    badgeNumber: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: true
      }
    },
    licenseNumber: {
      type: DataTypes.STRING,
      allowNull: false
    },
    phone: {
      type: DataTypes.STRING,
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM("Available", "On Duty", "On Leave"),
      defaultValue: "Available"
    }
  },
  {
    sequelize,
    modelName: "Driver",
    tableName: "drivers",
    timestamps: true
  }
);

export default Driver;
