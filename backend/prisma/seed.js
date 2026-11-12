import bcrypt from "bcrypt";
import dotenv from "dotenv";
import { prisma } from "../src/config/prisma.js";

dotenv.config();

async function seedAdmin() {
  const { SEED_ADMIN_NAME: name, SEED_ADMIN_EMAIL: email, SEED_ADMIN_PASSWORD: password } = process.env;
  if (!name || !email || !password || password.length < 12 || password.length > 72) {
    throw new Error("Set SEED_ADMIN_NAME, SEED_ADMIN_EMAIL, and a 12-72 character SEED_ADMIN_PASSWORD in backend/.env.");
  }
  const normalizedEmail = email.trim().toLowerCase();
  const passwordHash = await bcrypt.hash(password, 12);
  const admin = await prisma.admin.upsert({
    where: { email: normalizedEmail },
    update: {},
    create: { name: name.trim(), email: normalizedEmail, password: passwordHash }
  });
  console.log(`Seeded administrator account: ${admin.email}`);
}

seedAdmin()
  .catch((error) => {
    console.error("Administrator seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
