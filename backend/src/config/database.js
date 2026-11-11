import { Sequelize } from "sequelize";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const storagePath = process.env.DB_STORAGE
  ? path.resolve(__dirname, "../../", process.env.DB_STORAGE)
  : path.resolve(__dirname, "../../data/dtc_bus.sqlite");

// Ensure data directory exists
const dataDir = path.dirname(storagePath);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

export const sequelize = new Sequelize({
  dialect: "sqlite",
  storage: storagePath,
  logging: process.env.NODE_ENV === "test" ? false : false, // Clean terminal output
  define: {
    timestamps: true,
    underscored: true
  }
});

// Enable SQLite Foreign Key enforcement
export async function initDatabaseConnection() {
  await sequelize.authenticate();
  await sequelize.query("PRAGMA foreign_keys = ON;");
  return sequelize;
}

export default sequelize;
