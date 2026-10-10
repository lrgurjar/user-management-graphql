import jwt from "jsonwebtoken";
import User from "../models/User.js";

export async function getUserFromToken(req) {
  const authorization = req.headers.authorization;

  if (!authorization?.startsWith("Bearer ")) {
    return null;
  }

  const token = authorization.slice(7);

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    return await User.findById(decoded.userId);
  } catch {
    return null;
  }
}

export function requireAuth(context) {
  if (!context.user) {
    throw new Error("Authentication required");
  }

  return context.user;
}

export function requireAdmin(context) {
  const user = requireAuth(context);

  if (user.role !== "ADMIN") {
    throw new Error("Admin access required");
  }

  return user;
}
