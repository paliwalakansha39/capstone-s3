import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { timingSafeEqual } from "node:crypto";
import { prisma } from "../config/prisma.js";

const publicAdmin = ({ id, name, email, role, createdAt, updatedAt }) => ({
  id, name, email, role, createdAt, updatedAt
});

function createToken(admin) {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("JWT_SECRET must be configured with at least 32 characters.");
  }
  return jwt.sign({ id: admin.id, role: admin.role }, secret, {
    expiresIn: process.env.JWT_EXPIRES_IN || "8h"
  });
}

function setupKeyMatches(received) {
  const expected = process.env.ADMIN_SETUP_KEY;
  if (!expected || typeof received !== "string") return false;
  const expectedBuffer = Buffer.from(expected);
  const receivedBuffer = Buffer.from(received);
  return expectedBuffer.length === receivedBuffer.length && timingSafeEqual(expectedBuffer, receivedBuffer);
}

function validCredentials({ name, email, password }) {
  return typeof name === "string" && name.trim().length >= 2 && name.trim().length <= 100
    && typeof email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
    && typeof password === "string" && password.length >= 12 && Buffer.byteLength(password, "utf8") <= 72;
}

export async function registerAdmin(req, res, next) {
  try {
    if (!setupKeyMatches(req.get("x-admin-setup-key"))) {
      return res.status(403).json({ success: false, error: "A valid administrator setup key is required." });
    }
    const { name, email, password } = req.body || {};
    if (!validCredentials({ name, email, password })) {
      return res.status(400).json({ success: false, error: "Name, valid email, and a password of at least 12 characters are required." });
    }
    const admin = await prisma.admin.create({
      data: {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password: await bcrypt.hash(password, 12)
      }
    });
    return res.status(201).json({ success: true, data: { admin: publicAdmin(admin) } });
  } catch (error) {
    return next(error);
  }
}

export async function loginAdmin(req, res, next) {
  try {
    const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
    const password = typeof req.body?.password === "string" ? req.body.password : "";
    if (!email || !password) {
      return res.status(400).json({ success: false, error: "Email and password are required." });
    }
    const admin = await prisma.admin.findUnique({ where: { email } });
    const matches = admin ? await bcrypt.compare(password, admin.password) : false;
    if (!matches) return res.status(401).json({ success: false, error: "Invalid email or password." });
    return res.status(200).json({
      success: true,
      data: { token: createToken(admin), admin: publicAdmin(admin) }
    });
  } catch (error) {
    return next(error);
  }
}

export function getCurrentAdmin(req, res) {
  return res.status(200).json({ success: true, data: { admin: publicAdmin(req.admin) } });
}
