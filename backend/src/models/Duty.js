import { DataTypes, Model } from "sequelize";
import sequelize from "../config/database.js";

export class Duty extends Model {}

Duty.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    dutyNumber: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: {
        name: "unique_duty_number",
        msg: "A duty record with this duty number already exists."
      },
      validate: {
        notEmpty: { msg: "Duty number is required." }
      }
    },
    shiftType: {
      type: DataTypes.STRING(30),
      allowNull: false,
      defaultValue: "Morning",
      validate: {
        isIn: {
          args: [["Morning", "Evening", "Full-Day", "Night"]],
          msg: "Shift type must be Morning, Evening, Full-Day, or Night."
        }
      }
    },
    shiftDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      validate: {
        notEmpty: { msg: "Shift date is required." },
        isDate: { msg: "Shift date must be a valid date format (YYYY-MM-DD)." }
      }
    },
    startTime: {
      type: DataTypes.STRING(10),
      allowNull: false,
      validate: {
        notEmpty: { msg: "Shift start time is required." },
        is: {
          args: /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/,
          msg: "Start time must be in HH:mm or HH:mm:ss format."
        }
      }
    },
    endTime: {
      type: DataTypes.STRING(10),
      allowNull: false,
      validate: {
        notEmpty: { msg: "Shift end time is required." },
        is: {
          args: /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/,
          msg: "End time must be in HH:mm or HH:mm:ss format."
        }
      }
    },
    depot: {
      type: DataTypes.STRING(100),
      allowNull: false,
      defaultValue: "BBM Depot",
      validate: {
        notEmpty: { msg: "Depot name is required." }
      }
    },
    totalDurationHours: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 8.0,
      validate: {
        min: { args: [0.5], msg: "Shift duration must be at least 30 minutes." },
        max: { args: [12.0], msg: "Shift duration cannot exceed 12 hours." }
      }
    },
    status: {
      type: DataTypes.STRING(30),
      allowNull: false,
      defaultValue: "Scheduled",
      validate: {
        isIn: {
          args: [["Scheduled", "Active", "Completed", "Cancelled"]],
          msg: "Status must be Scheduled, Active, Completed, or Cancelled."
        }
      }
    },
    schedulingType: {
      type: DataTypes.STRING(30),
      allowNull: false,
      defaultValue: "Linked",
      validate: {
        isIn: {
          args: [["Linked", "Unlinked"]],
          msg: "Scheduling type must be Linked or Unlinked."
        }
      }
    }
  },
  {
    sequelize,
    modelName: "Duty",
    tableName: "duties",
    timestamps: true
  }
);

export default Duty;
