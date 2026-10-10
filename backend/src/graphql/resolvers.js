import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import User from "../models/User.js";
import { generateToken } from "../utils/generateToken.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateEmail(email) {
  if (!emailPattern.test(email)) {
    throw new Error("Please enter a valid email address");
  }
}

function validateName(name) {
  if (typeof name !== "string" || name.trim().length < 2) {
    throw new Error("Name must contain at least 2 characters");
  }
}

function validatePassword(password) {
  if (typeof password !== "string" || password.length < 8) {
    throw new Error("Password must contain at least 8 characters");
  }
}

function publicUser(user) {
  return user;
}

export const resolvers = {
  Query: {
    me: async (_, __, context) => {
      const currentUser = requireAuth(context);
      return publicUser(currentUser);
    },

    getUsers: async (_, __, context) => {
      requireAdmin(context);
      return User.find().sort({ createdAt: -1 });
    },

    getUser: async (_, { id }, context) => {
      const currentUser = requireAuth(context);

      if (currentUser.role !== "ADMIN" && currentUser._id.toString() !== id) {
        throw new Error("Not authorized");
      }

      if (!mongoose.isValidObjectId(id)) {
        throw new Error("Invalid user ID");
      }

      const user = await User.findById(id);

      if (!user) throw new Error("User not found");
      return user;
    },
  },

  Mutation: {
    register: async (_, { input }, context) => {
      const name = input.name?.trim();
      const email = input.email?.trim().toLowerCase();

      validateName(name);
      validateEmail(email);
      validatePassword(input.password);

      const existingUser = await User.findOne({ email });

      if (existingUser) {
        throw new Error("Email is already registered");
      }

      const password = await bcrypt.hash(input.password, 12);

      // Never allow public registration to choose the ADMIN role.
      const user = await User.create({
        name,
        email,
        password,
        role: "USER",
      });

      const token = generateToken(user);
      context.res.cookie("token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.COOKIE_SAME_SITE || (process.env.NODE_ENV === "production" ? "none" : "lax"),
        maxAge: 7 * 24 * 60 * 60 * 1000,
        path: "/",
      });

      return { user };
    },

    login: async (_, { email, password }, context) => {
      const normalizedEmail = email?.trim().toLowerCase();

      const user = await User.findOne({
        email: normalizedEmail,
      }).select("+password");

      if (!user || !(await bcrypt.compare(password, user.password))) {
        throw new Error("Invalid email or password");
      }

      if (!user.isActive) {
        throw new Error("Account is disabled");
      }

      const token = generateToken(user);
      context.res.cookie("token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.COOKIE_SAME_SITE || (process.env.NODE_ENV === "production" ? "none" : "lax"),
        maxAge: 7 * 24 * 60 * 60 * 1000,
        path: "/",
      });

      return { user };
    },

    logout: async (_, __, context) => {
      context.res.clearCookie("token", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.COOKIE_SAME_SITE || (process.env.NODE_ENV === "production" ? "none" : "lax"),
        path: "/",
      });
      return true;
    },

    createUser: async (_, { input }, context) => {
      requireAdmin(context);

      const name = input.name?.trim();
      const email = input.email?.trim().toLowerCase();

      validateName(name);
      validateEmail(email);
      validatePassword(input.password);

      if (await User.exists({ email })) {
        throw new Error("Email is already registered");
      }

      const password = await bcrypt.hash(input.password, 12);

      return User.create({
        name,
        email,
        password,
        role: input.role === "ADMIN" ? "USER" : input.role || "USER",
      });
    },

    updateUser: async (_, { id, input }, context) => {
      requireAdmin(context);

      if (!mongoose.isValidObjectId(id)) {
        throw new Error("Invalid user ID");
      }

      const updates = {};

      if (input.name !== undefined) {
        validateName(input.name);
        updates.name = input.name.trim();
      }

      if (input.email !== undefined) {
        const email = input.email.trim().toLowerCase();
        validateEmail(email);

        const existing = await User.findOne({
          email,
          _id: { $ne: id },
        });

        if (existing) throw new Error("Email is already registered");
        updates.email = email;
      }

      if (input.role !== undefined) {
        if (!["USER", "ADMIN"].includes(input.role)) {
          throw new Error("Invalid role");
        }
        updates.role = input.role;
      }

      if (input.isActive !== undefined) {
        updates.isActive = input.isActive;
      }

      const user = await User.findByIdAndUpdate(id, updates, {
        new: true,
        runValidators: true,
      });

      if (!user) throw new Error("User not found");
      return user;
    },

    deleteUser: async (_, { id }, context) => {
      const admin = requireAdmin(context);

      if (!mongoose.isValidObjectId(id)) {
        throw new Error("Invalid user ID");
      }

      if (admin._id.toString() === id) {
        throw new Error("You cannot delete your own admin account");
      }

      const deleted = await User.findByIdAndDelete(id);

      if (!deleted) throw new Error("User not found");
      return true;
    },

    updateProfile: async (_, { input }, context) => {
      const currentUser = requireAuth(context);
      const updates = {};

      if (input.name !== undefined) {
        validateName(input.name);
        updates.name = input.name.trim();
      }

      if (input.email !== undefined) {
        const email = input.email.trim().toLowerCase();
        validateEmail(email);

        const existing = await User.findOne({
          email,
          _id: { $ne: currentUser._id },
        });

        if (existing) throw new Error("Email is already registered");
        updates.email = email;
      }

      return User.findByIdAndUpdate(currentUser._id, updates, {
        new: true,
        runValidators: true,
      });
    },

    changePassword: async (_, { currentPassword, newPassword }, context) => {
      const currentUser = requireAuth(context);

      validatePassword(newPassword);

      const user = await User.findById(currentUser._id).select("+password");

      if (!(await bcrypt.compare(currentPassword, user.password))) {
        throw new Error("Current password is incorrect");
      }

      user.password = await bcrypt.hash(newPassword, 12);
      await user.save();

      return true;
    },
  },
};
