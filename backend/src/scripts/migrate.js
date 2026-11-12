import { sequelize, Bus, Route, Driver, Crew, Trip } from "../models/index.js";
import { initDatabaseConnection } from "../config/database.js";

export async function runMigrations() {
  try {
    console.log("Connecting to database and applying migrations...");
    await initDatabaseConnection();

    // Sync schema (creates tables if they don't exist without dropping existing tables)
    await sequelize.sync({ alter: false });

    // Ensure database constraints and indexes for trips
    await sequelize.query(
      "CREATE INDEX IF NOT EXISTS idx_trips_bus_date ON trips (bus_id, trip_date);"
    );
    await sequelize.query(
      "CREATE INDEX IF NOT EXISTS idx_trips_route_date ON trips (route_id, trip_date);"
    );
    await sequelize.query(
      "CREATE INDEX IF NOT EXISTS idx_trips_status ON trips (status);"
    );

    console.log("Database schema synced successfully.");
    console.log("Tables verified: routes, drivers, buses, crews, trips.");
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
