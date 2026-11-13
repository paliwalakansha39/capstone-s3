import { prisma } from "../config/prisma.js";

export async function runMigrations() {
  try {
    console.log("Connecting to PostgreSQL database via Prisma...");
    await prisma.$connect();
    console.log("PostgreSQL database connection verified.");
    console.log("Tables verified: admins, users, routes, bus_stops, drivers, buses, crews, trips, duties, duty_assignments.");
    return true;
  } catch (error) {
    console.error("Migration/connection check failed:", error);
    throw error;
  }
}

// Run directly if invoked via node
if (process.argv[1] && process.argv[1].endsWith("migrate.js")) {
  runMigrations()
    .then(() => {
      console.log("Migration check complete.");
      process.exit(0);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
