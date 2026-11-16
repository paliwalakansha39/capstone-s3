import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import bcrypt from "bcrypt";
import { createApp } from "./app.js";
import { runMigrations } from "./scripts/migrate.js";
import { prisma } from "./config/prisma.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const HOST = process.env.HOST || "0.0.0.0";
const PORT = process.env.PORT || 5001;

let activeServer = null;

export async function ensureSeedAdmin() {
  try {
    const seedName = process.env.SEED_ADMIN_NAME || "DTC Administrator";
    const seedPassword = process.env.SEED_ADMIN_PASSWORD || "SiddhiChalke@123";
    const passwordHash = await bcrypt.hash(seedPassword, 12);

    const emailsToSeed = [
      (process.env.SEED_ADMIN_EMAIL || "").trim().toLowerCase(),
      "admin@dtc.com",
      "admin@dtc.gov.in"
    ].filter(Boolean);

    for (const email of [...new Set(emailsToSeed)]) {
      await prisma.admin.upsert({
        where: { email },
        update: { name: seedName, password: passwordHash },
        create: { name: seedName, email, password: passwordHash }
      });
      console.log(`Ensured administrator account exists: ${email}`);
    }
  } catch (err) {
    console.error("Warning: Automatic administrator seed check failed:", err.message);
  }
}

async function handleShutdown(signal) {
  console.log(`Received ${signal}. Gracefully terminating DTC server...`);
  if (activeServer) {
    activeServer.close(async () => {
      console.log("HTTP server closed.");
      try {
        await prisma.$disconnect();
        console.log("Prisma client disconnected.");
      } catch (err) {
        console.error("Error during Prisma disconnect:", err);
      }
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
}

process.on("SIGTERM", () => handleShutdown("SIGTERM"));
process.on("SIGINT", () => handleShutdown("SIGINT"));

async function startServer() {
  try {
    console.log("Connecting to PostgreSQL database via Prisma...");
    await prisma.$connect();
    console.log("PostgreSQL connected successfully.");

    await ensureSeedAdmin();

    const app = createApp();
    activeServer = app.listen(PORT, HOST, () => {
      console.log(`DTC Bus Management API running at http://${HOST}:${PORT}`);
      console.log(`API health endpoint: http://${HOST}:${PORT}/api/health`);
      console.log(`Bus endpoints: http://${HOST}:${PORT}/api/buses`);
    });

    return activeServer;
  } catch (error) {
    console.error("Failed to start DTC backend server:", error);
    process.exit(1);
  }
}

if (process.argv[1] && process.argv[1].endsWith("server.js")) {
  startServer();
}

export { startServer };
