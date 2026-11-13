import { DataTypes, Model } from "sequelize";
import sequelize from "../config/database.js";

export class DutyAssignment extends Model {}

DutyAssignment.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    dutyId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "duties",
        key: "id"
      },
      onUpdate: "CASCADE",
      onDelete: "CASCADE",
      validate: {
        notEmpty: { msg: "Duty reference ID is required." }
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
        notEmpty: { msg: "Assigned bus ID is required." }
      }
    },
    driverId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "crews",
        key: "id"
      },
      onUpdate: "CASCADE",
      onDelete: "RESTRICT",
      validate: {
        notEmpty: { msg: "Assigned driver ID is required." }
      }
    },
    conductorId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "crews",
        key: "id"
      },
      onUpdate: "CASCADE",
      onDelete: "RESTRICT",
      validate: {
        notEmpty: { msg: "Assigned conductor ID is required." }
      }
    },
    vehicleHandoverVerified: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: "In linked duty, true indicates crew stays permanently bound to bus throughout shift."
    },
    totalTripsCovered: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: { args: [0], msg: "Total trips covered cannot be negative." }
      }
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  },
  {
    sequelize,
    modelName: "DutyAssignment",
    tableName: "duty_assignments",
    timestamps: true
  }
);

export default DutyAssignment;
