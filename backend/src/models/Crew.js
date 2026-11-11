import { DataTypes, Model } from "sequelize";
import sequelize from "../config/database.js";

export class Crew extends Model {}

Crew.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    crewId: {
      type: DataTypes.STRING(30),
      allowNull: false,
      unique: {
        name: "unique_crew_id",
        msg: "Crew ID must be unique."
      },
      validate: {
        notEmpty: { msg: "Crew ID is required." }
      }
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        notEmpty: { msg: "Crew member name is required." },
        len: { args: [2, 100], msg: "Name must be between 2 and 100 characters." }
      }
    },
    role: {
      type: DataTypes.STRING(30),
      allowNull: false,
      defaultValue: "Driver",
      validate: {
        isIn: {
          args: [["Driver", "Conductor"]],
          msg: "Role must be either 'Driver' or 'Conductor'."
        }
      }
    },
    badgeNumber: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: {
        name: "unique_crew_badge",
        msg: "Badge number must be unique."
      },
      validate: {
        notEmpty: { msg: "Badge number is required." }
      }
    },
    licenseNumber: {
      type: DataTypes.STRING(50),
      allowNull: true,
      defaultValue: null
    },
    qualification: {
      type: DataTypes.STRING(150),
      allowNull: true,
      defaultValue: "Standard Passenger Transport Certified"
    },
    experienceYears: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
      validate: {
        min: { args: [0], msg: "Experience years cannot be negative." },
        max: { args: [50], msg: "Experience years cannot exceed 50." }
      }
    },
    assignedDepot: {
      type: DataTypes.STRING(100),
      allowNull: false,
      defaultValue: "BBM Depot",
      validate: {
        notEmpty: { msg: "Assigned depot is required." }
      }
    },
    status: {
      type: DataTypes.STRING(30),
      allowNull: false,
      defaultValue: "Available",
      validate: {
        isIn: {
          args: [["Available", "On Duty", "On Rest", "On Leave"]],
          msg: "Status must be Available, On Duty, On Rest, or On Leave."
        }
      }
    },
    phone: {
      type: DataTypes.STRING(30),
      allowNull: true,
      validate: {
        isValidPhone(value) {
          if (!value) return;
          const cleaned = String(value).replace(/[\s\-\(\)]/g, "");
          if (!/^(\+91|91|0)?[6-9]\d{9}$/.test(cleaned)) {
            throw new Error("Please provide a valid Indian phone number.");
          }
        }
      }
    }
  },
  {
    sequelize,
    modelName: "Crew",
    tableName: "crews",
    timestamps: true
  }
);

export default Crew;
