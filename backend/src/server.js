import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createApp } from "./app.js";
import { initDatabaseConnection } from "./config/database.js";
import { runMigrations } from "./scripts/migrate.js";
import { prisma } from "./config/prisma.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const PORT = process.env.PORT || 5001;

async function startServer() {
  try {
    console.log("Initializing database connection...");
    await initDatabaseConnection();
    await runMigrations();

    try {
      await prisma.$connect();
      console.log("PostgreSQL connected via Prisma.");
    } catch (prismaError) {
      console.warn("Notice: PostgreSQL is not connected. SQLite modules (Buses, Crews, Trips, Duties) will run normally.");
    }

    const app = createApp();
    const server = app.listen(PORT, () => {
      console.log(`DTC Bus Management API running at http://localhost:${PORT}`);
      console.log(`API health endpoint: http://localhost:${PORT}/api/health`);
      console.log(`Bus endpoints: http://localhost:${PORT}/api/buses`);
    });

    return server;
  } catch (error) {
    console.error("Failed to start DTC backend server:", error);
    process.exit(1);
  }
}

if (process.argv[1] && process.argv[1].endsWith("server.js")) {
  startServer();
}

export { startServer };
