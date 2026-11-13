import { prisma } from "../config/prisma.js";

export { prisma };
export const Bus = prisma.bus;
export const Crew = prisma.crew;
export const Trip = prisma.trip;
export const Duty = prisma.duty;
export const DutyAssignment = prisma.dutyAssignment;
export const Route = prisma.route;
export const BusStop = prisma.busStop;
export const Driver = prisma.driver;
export const Admin = prisma.admin;
export const User = prisma.user;

export default prisma;
