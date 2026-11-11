import { DataTypes, Model } from "sequelize";
import sequelize from "../config/database.js";

export class Route extends Model {}

Route.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    routeNumber: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: true
      }
    },
    routeName: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    startPoint: {
      type: DataTypes.STRING,
      allowNull: false
    },
    endPoint: {
      type: DataTypes.STRING,
      allowNull: false
    },
    totalDistanceKm: {
      type: DataTypes.FLOAT,
      allowNull: true
    }
  },
  {
    sequelize,
    modelName: "Route",
    tableName: "routes",
    timestamps: true
  }
);

export default Route;
