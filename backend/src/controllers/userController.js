import bcrypt from "bcrypt";
import { prisma } from "../config/prisma.js";

const publicUser = ({ id, name, email, role, createdAt, updatedAt }) => ({
  id, name, email, role, createdAt, updatedAt
});

function validateUser({ name, email, password, role, requirePassword = false }) {
  if (typeof name !== "string" || name.trim().length < 2 || name.trim().length > 100) {
    return "Name must be between 2 and 100 characters.";
  }
  if (typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) || email.length > 254) {
    return "A valid email address is required.";
  }
  if (typeof role !== "string" || role.trim().length < 2 || role.trim().length > 50) {
    return "Role must be between 2 and 50 characters.";
  }
  if ((requirePassword || password !== undefined) && (typeof password !== "string" || password.length < 12 || password.length > 72)) {
    return "Password must be between 12 and 72 characters.";
  }
  return null;
}

export async function listUsers(req, res, next) {
  try {
    const users = await prisma.user.findMany({ orderBy: { createdAt: "desc" } });
    return res.status(200).json({ success: true, data: users.map(publicUser) });
  } catch (error) {
    return next(error);
  }
}

export async function getUser(req, res, next) {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!user) return res.status(404).json({ success: false, error: "User not found." });
    return res.status(200).json({ success: true, data: publicUser(user) });
  } catch (error) {
    return next(error);
  }
}

export async function createUser(req, res, next) {
  try {
    const validationError = validateUser({ ...(req.body || {}), requirePassword: true });
    if (validationError) return res.status(400).json({ success: false, error: validationError });
    const { name, email, password, role } = req.body || {};
    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password: await bcrypt.hash(password, 12),
        role: role.trim()
      }
    });
    return res.status(201).json({ success: true, data: publicUser(user) });
  } catch (error) {
    return next(error);
  }
}

export async function updateUser(req, res, next) {
  try {
    const validationError = validateUser(req.body || {});
    if (validationError) return res.status(400).json({ success: false, error: validationError });
    const { name, email, password, role } = req.body || {};
    const data = { name: name.trim(), email: email.trim().toLowerCase(), role: role.trim() };
    if (password !== undefined) data.password = await bcrypt.hash(password, 12);
    const user = await prisma.user.update({ where: { id: req.params.id }, data });
    return res.status(200).json({ success: true, data: publicUser(user) });
  } catch (error) {
    return next(error);
  }
}

export async function deleteUser(req, res, next) {
  try {
    await prisma.user.delete({ where: { id: req.params.id } });
    return res.status(200).json({ success: true, message: "User deleted successfully." });
  } catch (error) {
    return next(error);
  }
}
