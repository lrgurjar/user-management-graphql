import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import multer from "multer";
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";

import { ApolloServer } from "@apollo/server";
import { expressMiddleware } from "@as-integrations/express4";

import { connectDB } from "./config/db.js";
import User from "./models/User.js";
import { typeDefs } from "./graphql/typeDefs.js";
import { resolvers } from "./graphql/resolvers.js";
import { getUserFromToken } from "./middleware/auth.js";

dotenv.config();

const uploadsDir = path.resolve(process.cwd(), "uploads", "profile-images");

fs.mkdirSync(uploadsDir, { recursive: true });

const allowedMimeTypes = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

// Support your local Vite frontend and an optional configured origin.
const allowedOrigins = new Set([
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  ...(process.env.CLIENT_URL
    ? process.env.CLIENT_URL.split(",").map((origin) => origin.trim())
    : []),
]);

const corsOptions = {
  origin(origin, callback) {
    // Requests without an Origin header (e.g. curl/server-to-server).
    if (!origin || allowedOrigins.has(origin)) {
      return callback(null, true);
    }

    return callback(new Error(`CORS blocked origin: ${origin}`));
  },
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
  optionsSuccessStatus: 204,
};

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => {
    callback(null, uploadsDir);
  },
  filename: (_req, file, callback) => {
    const extension = allowedMimeTypes[file.mimetype];
    callback(null, `${randomUUID()}${extension}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 2 * 1024 * 1024,
    files: 1,
  },
  fileFilter: (_req, file, callback) => {
    if (!allowedMimeTypes[file.mimetype]) {
      return callback(new Error("Only JPG, PNG, and WEBP images are allowed"));
    }

    callback(null, true);
  },
});

async function authenticateUpload(req, res, next) {
  try {
    const user = await getUserFromToken(req);

    if (!user) {
      return res.status(401).json({
        message: "Authentication required",
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        message: "Account is disabled",
      });
    }

    req.profileUser = user;
    next();
  } catch (error) {
    next(error);
  }
}

async function startServer() {
  await connectDB();

  const app = express();

  // IMPORTANT: CORS must be registered before routes and authentication.
  // This handles OPTIONS preflight requests application-wide.
  app.use(cors(corsOptions));

  app.use(express.json({ limit: "100kb" }));

  // Serve saved profile images.
  app.use("/uploads", express.static(path.resolve(process.cwd(), "uploads")));

  // Upload a profile image for the authenticated user.
  app.post(
    "/api/users/me/profile-image",
    authenticateUpload,
    upload.single("image"),
    async (req, res, next) => {
      try {
        if (!req.file) {
          return res.status(400).json({
            message: "Please select an image",
          });
        }

        const user = await User.findById(req.profileUser._id);

        if (!user) {
          fs.unlinkSync(req.file.path);

          return res.status(404).json({
            message: "User not found",
          });
        }

        const previousImageUrl = user.profileImageUrl;

        user.profileImageUrl = `/uploads/profile-images/${req.file.filename}`;

        await user.save();

        // Remove the previous locally stored image, if any.
        if (previousImageUrl?.startsWith("/uploads/profile-images/")) {
          const previousFilename = path.basename(previousImageUrl);
          const previousPath = path.join(uploadsDir, previousFilename);

          if (fs.existsSync(previousPath)) {
            fs.unlinkSync(previousPath);
          }
        }

        return res.status(200).json({
          message: "Profile image uploaded successfully",
          profileImageUrl: user.profileImageUrl,
        });
      } catch (error) {
        next(error);
      }
    },
  );

  const server = new ApolloServer({
    typeDefs,
    resolvers,
  });

  await server.start();

  app.use(
    "/graphql",
    expressMiddleware(server, {
      context: async ({ req }) => ({
        user: await getUserFromToken(req),
      }),
    }),
  );

  // Handle upload errors and other Express errors.
  app.use((error, req, res, next) => {
    if (res.headersSent) {
      return next(error);
    }

    if (error instanceof multer.MulterError) {
      const message =
        error.code === "LIMIT_FILE_SIZE"
          ? "Image must be 2 MB or smaller"
          : "Unable to upload image";

      return res.status(400).json({ message });
    }

    if (error.message === "Only JPG, PNG, and WEBP images are allowed") {
      return res.status(400).json({
        message: error.message,
      });
    }

    if (error.message.startsWith("CORS blocked origin:")) {
      return res.status(403).json({
        message: error.message,
      });
    }

    console.error("Request failed:", error);

    return res.status(500).json({
      message: "Something went wrong",
    });
  });

  const port = process.env.PORT || 4000;

  app.listen(port, () => {
    console.log(`GraphQL API: http://localhost:${port}/graphql`);
    console.log(
      `Profile image upload: http://localhost:${port}/api/users/me/profile-image`,
    );
    console.log(`Profile images: http://localhost:${port}/uploads`);
    console.log("Allowed frontend origins:", [...allowedOrigins]);
  });
}

startServer().catch((error) => {
  console.error("Server startup failed:", error);
  process.exit(1);
});
