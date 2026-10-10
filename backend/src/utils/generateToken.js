import jwt from "jsonwebtoken";

export function generateToken(user) {
  return jwt.sign(
    {
      userId: user._id.toString(),
    },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRES_IN || "15m",
    },
  );
}
