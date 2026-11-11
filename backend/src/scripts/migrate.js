import { sequelize, Bus, Route, Driver } from "../models/index.js";
import { initDatabaseConnection } from "../config/database.js";

export async function runMigrations() {
  try {
    console.log("Connecting to database and applying migrations...");
    await initDatabaseConnection();

    // Sync schema (creates tables if they don't exist without dropping existing tables)
    await sequelize.sync({ alter: false });

    console.log("Database schema synced successfully.");
    console.log("Tables verified: routes, drivers, buses.");
    return true;
  } catch (error) {
    console.error("Migration failed:", error);
    throw error;
  }
}

// Run directly if invoked via node
if (process.argv[1] && process.argv[1].endsWith("migrate.js")) {
  runMigrations()
    .then(() => {
      console.log("Migration complete.");
      process.exit(0);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
