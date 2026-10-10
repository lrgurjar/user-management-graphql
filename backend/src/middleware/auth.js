import jwt from "jsonwebtoken";
import User from "../models/User.js";

export async function getUserFromToken(req) {
  // Prefer the HttpOnly cookie; Bearer support remains for existing API clients.
  const cookieToken = req.cookies?.token;
  const authorization = req.headers.authorization;
  const bearerToken = authorization?.startsWith("Bearer ")
    ? authorization.slice(7)
    : null;
  const token = cookieToken || bearerToken;

  if (!token) {
    return null;
  }

  try {
    const decoded = jwt.verify(decodeURIComponent(token), process.env.JWT_SECRET);

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
