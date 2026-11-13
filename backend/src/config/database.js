import { prisma } from "./prisma.js";

export async function initDatabaseConnection() {
  await prisma.$connect();
  return prisma;
}

export default prisma;
