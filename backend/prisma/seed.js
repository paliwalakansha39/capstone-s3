import bcrypt from "bcrypt";
import dotenv from "dotenv";
import { prisma } from "../src/config/prisma.js";

dotenv.config();

async function seedAdmin() {
  const name = process.env.SEED_ADMIN_NAME || "DTC Administrator";
  const password = process.env.SEED_ADMIN_PASSWORD || "SiddhiChalke@123";
  if (!password || password.length < 8 || password.length > 72) {
    throw new Error("Set a valid SEED_ADMIN_PASSWORD (at least 8 characters) in backend/.env.");
  }
  const passwordHash = await bcrypt.hash(password, 12);
  const targetEmails = [
    (process.env.SEED_ADMIN_EMAIL || "").trim().toLowerCase(),
    "admin@dtc.com",
    "admin@dtc.gov.in"
  ].filter(Boolean);

  for (const email of [...new Set(targetEmails)]) {
    const admin = await prisma.admin.upsert({
      where: { email },
      update: {
        name: name.trim(),
        password: passwordHash
      },
      create: { name: name.trim(), email, password: passwordHash }
    });
    console.log(`Seeded administrator account: ${admin.email}`);
  }
}

seedAdmin()
  .catch((error) => {
    console.error("Administrator seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
